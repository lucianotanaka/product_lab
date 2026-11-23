from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import httpx

logger = logging.getLogger(__name__)

AXET_DOCKER_NPIPE = "npipe:////./pipe/axet_flows_docker"
AXET_IMAGE_REPOSITORY = "axet-flows/flows"
AXET_IMAGE_TAG_PREFERRED = "latest-prod"
AXET_IMAGE_PREFERRED = f"{AXET_IMAGE_REPOSITORY}:{AXET_IMAGE_TAG_PREFERRED}"
AXET_INTERNAL_PORT = "1880/tcp"
AXET_ENDPOINT_PATH = "/pergunta"
DEFAULT_HTTP_TIMEOUT = 5.0


@dataclass
class AxetFlowsDiscoveryResult:
    runtime_available: bool
    running: bool
    healthy: Optional[bool]
    container_id: Optional[str]
    image: Optional[str]
    internal_port: int
    host_port: Optional[int]
    resolved_url: Optional[str]
    status: str
    error: Optional[str]
    last_checked: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AxetFlowsDiscoveryService:
    def __init__(
        self,
        docker_client_factory: Optional[Any] = None,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self._docker_client_factory = docker_client_factory
        self._http_client = http_client

    def discover(self) -> AxetFlowsDiscoveryResult:
        docker_module = self._load_docker_module()
        if docker_module is None:
            return self._result(
                runtime_available=False,
                running=False,
                healthy=None,
                container_id=None,
                image=None,
                host_port=None,
                resolved_url=None,
                status="docker_sdk_unavailable",
                error="Docker SDK for Python is not installed.",
            )

        try:
            client = self._create_client(docker_module)
            client.ping()
        except Exception as exc:
            logger.info("aXet Flows runtime unavailable.")
            return self._result(
                runtime_available=False,
                running=False,
                healthy=None,
                container_id=None,
                image=None,
                host_port=None,
                resolved_url=None,
                status="axet_not_running",
                error=None,
            )

        try:
            candidates = self._find_candidate_containers(client)
        except Exception as exc:
            logger.warning("Failed to inspect aXet Flows containers: %s", exc)
            return self._result(
                runtime_available=True,
                running=False,
                healthy=None,
                container_id=None,
                image=None,
                host_port=None,
                resolved_url=None,
                status="unavailable",
                error=str(exc),
            )

        if not candidates:
            return self._result(
                runtime_available=True,
                running=False,
                healthy=None,
                container_id=None,
                image=None,
                host_port=None,
                resolved_url=None,
                status="flows_not_running",
                error=None,
            )

        selected = self._select_candidate(candidates)
        if selected is None:
            logger.warning(
                "Ambiguous aXet Flows containers detected: %s",
                [getattr(container, "id", None) for container in candidates],
            )
            return self._result(
                runtime_available=True,
                running=True,
                healthy=None,
                container_id=None,
                image=None,
                host_port=None,
                resolved_url=None,
                status="ambiguous",
                error="Multiple candidate aXet Flows containers found.",
            )

        return self._build_result_from_container(selected)

    def _load_docker_module(self):
        try:
            import docker  # type: ignore

            return docker
        except Exception:
            return None

    def _create_client(self, docker_module):
        if self._docker_client_factory is not None:
            return self._docker_client_factory()
        return docker_module.DockerClient(base_url=AXET_DOCKER_NPIPE)

    def _find_candidate_containers(self, client) -> List[Any]:
        exact = client.containers.list(
            filters={"ancestor": AXET_IMAGE_PREFERRED, "status": "running"}
        )
        if exact:
            return exact

        running = client.containers.list(filters={"status": "running"})
        return [
            container
            for container in running
            if self._matches_repository(self._image_name(container), AXET_IMAGE_REPOSITORY)
        ]

    def _matches_repository(self, image_name: Optional[str], repository: str) -> bool:
        if not image_name:
            return False
        raw = str(image_name).strip().lower()
        if raw == repository.lower():
            return True
        if raw.startswith(f"{repository.lower()}:"):
            return True
        return False

    def _image_name(self, container: Any) -> Optional[str]:
        tags = getattr(getattr(container, "image", None), "tags", None) or []
        if tags:
            return str(tags[0])
        attrs = getattr(container, "attrs", {}) or {}
        return attrs.get("Config", {}).get("Image")

    def _health_state(self, container: Any) -> Optional[str]:
        attrs = getattr(container, "attrs", {}) or {}
        state = attrs.get("State", {}) or {}
        health = state.get("Health", {}) or {}
        status = health.get("Status")
        if status is None:
            return None
        return str(status).strip().lower()

    def _select_candidate(self, candidates: List[Any]) -> Optional[Any]:
        scored: List[tuple[int, Any]] = []
        for container in candidates:
            score = 0
            image_name = self._image_name(container) or ""
            if image_name.lower() == AXET_IMAGE_PREFERRED.lower():
                score += 4
            elif self._matches_repository(image_name, AXET_IMAGE_REPOSITORY):
                score += 2

            health_state = self._health_state(container)
            if health_state == "healthy":
                score += 4
            elif health_state is None:
                score += 1

            if self._extract_host_port(container) is not None:
                score += 3

            scored.append((score, container))

        if not scored:
            return None

        scored.sort(key=lambda item: item[0], reverse=True)
        best_score = scored[0][0]
        best = [container for score, container in scored if score == best_score]
        if len(best) != 1:
            return None
        return best[0]

    def _extract_host_port(self, container: Any) -> Optional[int]:
        attrs = getattr(container, "attrs", {}) or {}
        ports = attrs.get("NetworkSettings", {}).get("Ports", {}) or {}
        bindings = ports.get(AXET_INTERNAL_PORT)
        if not bindings or not isinstance(bindings, list):
            return None

        for binding in bindings:
            host_port_raw = (binding or {}).get("HostPort")
            if host_port_raw is None:
                continue
            try:
                host_port = int(str(host_port_raw).strip())
            except Exception:
                continue
            if 1 <= host_port <= 65535:
                return host_port
        return None

    def _build_result_from_container(self, container: Any) -> AxetFlowsDiscoveryResult:
        image_name = self._image_name(container)
        health_state = self._health_state(container)
        host_port = self._extract_host_port(container)

        if host_port is None:
            return self._result(
                runtime_available=True,
                running=True,
                healthy=self._healthy_bool(health_state),
                container_id=getattr(container, "id", None),
                image=image_name,
                host_port=None,
                resolved_url=None,
                status="port_not_resolved",
                error=None,
            )

        resolved_url = f"http://localhost:{host_port}{AXET_ENDPOINT_PATH}"

        if health_state and health_state != "healthy":
            return self._result(
                runtime_available=True,
                running=True,
                healthy=self._healthy_bool(health_state),
                container_id=getattr(container, "id", None),
                image=image_name,
                host_port=host_port,
                resolved_url=resolved_url,
                status="starting",
                error=None,
            )

        endpoint_ready = self._validate_endpoint(resolved_url)
        status = "available" if endpoint_ready else "running"

        if endpoint_ready:
            logger.info(
                "aXet Flows runtime detected. Container running. Port %s resolved and endpoint validated.",
                host_port,
            )
        else:
            logger.info(
                "aXet Flows runtime detected. Container running. Port %s resolved but endpoint not yet ready.",
                host_port,
            )

        return self._result(
            runtime_available=True,
            running=True,
            healthy=self._healthy_bool(health_state),
            container_id=getattr(container, "id", None),
            image=image_name,
            host_port=host_port,
            resolved_url=resolved_url,
            status=status,
            error=None,
        )

    def _validate_endpoint(self, resolved_url: str) -> bool:
        root_url = resolved_url.rsplit("/", 1)[0] + "/"
        candidates = [root_url, urljoin(root_url, "health")]
        for url in candidates:
            try:
                if self._http_client is not None:
                    response = self._http_client.get(url)
                else:
                    with httpx.Client(timeout=DEFAULT_HTTP_TIMEOUT) as client:
                        response = client.get(url)
                if response.status_code < 500:
                    return True
            except Exception:
                continue
        return False

    def _healthy_bool(self, health_state: Optional[str]) -> Optional[bool]:
        if health_state is None:
            return None
        return health_state == "healthy"

    def _result(
        self,
        *,
        runtime_available: bool,
        running: bool,
        healthy: Optional[bool],
        container_id: Optional[str],
        image: Optional[str],
        host_port: Optional[int],
        resolved_url: Optional[str],
        status: str,
        error: Optional[str],
    ) -> AxetFlowsDiscoveryResult:
        return AxetFlowsDiscoveryResult(
            runtime_available=runtime_available,
            running=running,
            healthy=healthy,
            container_id=container_id,
            image=image,
            internal_port=1880,
            host_port=host_port,
            resolved_url=resolved_url,
            status=status,
            error=error,
        )
