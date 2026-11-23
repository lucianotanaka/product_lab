"""
Integrations API — CRUD + ADO sync
Endpoints:
  GET    /integrations/providers
  GET    /integrations/connections
  POST   /integrations/connections
  GET    /integrations/connections/{id}
  PATCH  /integrations/connections/{id}
  DELETE /integrations/connections/{id}
  POST   /integrations/connections/{id}/test
  POST   /integrations/connections/{id}/sync/preview   — diff ADO vs Product Lab (no write)
  POST   /integrations/connections/{id}/sync/apply     — apply selected changes
  POST   /integrations/connections/{id}/sync           — legacy full-sync (background)
  GET    /integrations/connections/{id}/logs
"""
import socket
import uuid
import base64
import logging
import re
from html import unescape
from datetime import datetime, date
from uuid import uuid4
from decimal import Decimal
from collections import Counter
from dataclasses import asdict
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.integration import (
    IntegrationConnection, IntegrationFieldSchema, IntegrationSyncLog,
)
from app.models.backlog import BacklogItemType
from app.models.team_member import TeamMember, TeamMemberProduct
from app.services.axet_flows_discovery import AxetFlowsDiscoveryService

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class FieldSchemaOut(BaseModel):
    field_key: str; field_label: str; field_type: str
    is_secret: bool; is_required: bool
    options: Optional[Any]; hint: Optional[str]; placeholder: Optional[str]
    sort_order: int
    class Config: from_attributes = True

class ConnectionCreate(BaseModel):
    name: str; description: Optional[str] = None
    provider: str; scope: str
    company_id: Optional[int] = None; product_id: Optional[int] = None
    params: Dict[str, Any] = {}; secrets: Dict[str, Any] = {}; is_active: bool = True

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None; description: Optional[str] = None
    params: Optional[Dict[str, Any]] = None; secrets: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class SyncLogOut(BaseModel):
    id: str; connection_id: str; operation_type: str; status: str
    started_at: datetime; finished_at: Optional[datetime]
    items_created: int; items_updated: int; items_skipped: int
    error_message: Optional[str]; details: Optional[Any]
    class Config: from_attributes = True

class SyncApplyBody(BaseModel):
    item_ado_ids: List[str] = []
    sprint_ado_paths: List[str] = []

class AxetFlowsDiscoveryOut(BaseModel):
    runtime_available: bool
    running: bool
    healthy: Optional[bool] = None
    container_id: Optional[str] = None
    image: Optional[str] = None
    internal_port: int
    host_port: Optional[int] = None
    resolved_url: Optional[str] = None
    status: str
    error: Optional[str] = None
    last_checked: Optional[str] = None

class CleanupAdoItemsBody(BaseModel):
    product_id: int
    item_types: List[str] = ["Task", "Bug"]
    delete_items: bool = True
    delete_links: bool = True
    clear_ado_id_only: bool = False

# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, conn_id: str) -> IntegrationConnection:
    c = db.query(IntegrationConnection).filter(IntegrationConnection.id == conn_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Connection not found")
    return c

def _conn_to_out(c: IntegrationConnection) -> dict:
    return {
        "id": c.id, "name": c.name, "description": c.description,
        "provider": c.provider.value if hasattr(c.provider, "value") else c.provider,
        "scope": c.scope.value if hasattr(c.scope, "value") else c.scope,
        "company_id": c.company_id, "product_id": c.product_id,
        "params": c.params or {}, "has_secrets": bool(c.secrets),
        "is_active": c.is_active, "last_sync_at": c.last_sync_at,
        "last_error": c.last_error, "created_at": c.created_at, "updated_at": c.updated_at,
    }

_SSL_VERIFY = False
_SOCKET_TIMEOUT = 60
_AXET_STRUCTURED_KEYS = (
    "opportunities", "requirements", "risks", "backlog",
    "decisions", "followups", "stakeholders", "insights",
)

def _ado_headers(c: IntegrationConnection) -> dict:
    pat = (c.secrets or {}).get("pat", "")
    token = base64.b64encode(f":{pat}".encode()).decode()
    return {"Authorization": f"Basic {token}", "Content-Type": "application/json"}

def _ado_get(url: str, headers: dict) -> httpx.Response:
    return httpx.get(url, headers=headers, timeout=_SOCKET_TIMEOUT, verify=_SSL_VERIFY)

def _ado_post(url: str, headers: dict, json: dict) -> httpx.Response:
    return httpx.post(url, headers=headers, json=json, timeout=_SOCKET_TIMEOUT, verify=_SSL_VERIFY)

def _bool_param(value: Any, default: bool = False) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}

def _axet_flows_endpoint_mode(c: IntegrationConnection) -> str:
    params = c.params or {}
    mode = str(params.get("endpoint_mode", "auto_discovery") or "").strip().lower()
    if mode == "fixed_port":
        return "fixed_port"
    return "auto_discovery"

def _build_axet_flows_manual_url(params: Dict[str, Any]) -> str:
    scheme = str(params.get("scheme", "http")).strip() or "http"
    host = str(params.get("host", "localhost")).strip() or "localhost"
    port = str(params.get("port", "")).strip()
    ask_path = str(params.get("ask_path", "/pergunta")).strip() or "/pergunta"
    if not ask_path.startswith("/"):
        ask_path = f"/{ask_path}"
    return f"{scheme}://{host}:{port}{ask_path}" if port else f"{scheme}://{host}{ask_path}"

def _discover_axet_flows_runtime(c: IntegrationConnection) -> Dict[str, Any]:
    params = dict(c.params or {})
    endpoint_mode = _axet_flows_endpoint_mode(c)

    if endpoint_mode == "fixed_port":
        resolved_url = _build_axet_flows_manual_url(params)
        last_checked = datetime.utcnow().isoformat()
        params["resolved_url"] = resolved_url
        params["last_connection_status"] = "fixed_port"
        params["last_checked"] = last_checked
        c.params = params
        c.last_sync_at = datetime.utcnow()
        c.last_error = None
        c.updated_at = datetime.utcnow()
        return {
            "runtime_available": True,
            "running": True,
            "healthy": None,
            "container_id": None,
            "image": None,
            "internal_port": 1880,
            "host_port": int(str(params.get("port", "")).strip()) if str(params.get("port", "")).strip().isdigit() else None,
            "resolved_url": resolved_url,
            "status": "fixed_port",
            "error": None,
            "last_checked": last_checked,
        }

    service = AxetFlowsDiscoveryService()
    result = service.discover()
    payload = asdict(result)

    changed = False

    if result.host_port is not None:
        resolved_port = str(result.host_port)
        resolved_url = result.resolved_url or ""
        if str(params.get("port", "") or "") != resolved_port:
            params["port"] = resolved_port
            changed = True
        if str(params.get("resolved_url", "") or "") != resolved_url:
            params["resolved_url"] = resolved_url
            changed = True
    else:
        if params.get("resolved_url", "") != "":
            params["resolved_url"] = ""
            changed = True
        if result.status in {"axet_not_running", "flows_not_running", "port_not_resolved", "unavailable", "ambiguous", "docker_sdk_unavailable"}:
            if params.get("port", "") != "":
                params["port"] = ""
                changed = True

    runtime_status = str(result.status or "")
    runtime_error = result.error or None

    if str(params.get("last_connection_status", "") or "") != runtime_status:
        params["last_connection_status"] = runtime_status
        changed = True

    last_checked = datetime.utcnow().isoformat()
    params["last_checked"] = last_checked
    payload["last_checked"] = last_checked

    if changed or (c.params or {}) != params:
        c.params = params

    c.last_sync_at = datetime.utcnow()
    c.last_error = runtime_error
    c.updated_at = datetime.utcnow()

    return payload

def _axet_flows_url(c: IntegrationConnection, discovery: Optional[Dict[str, Any]] = None) -> str:
    params = c.params or {}

    if _axet_flows_endpoint_mode(c) == "fixed_port":
        return _build_axet_flows_manual_url(params)

    if discovery and discovery.get("resolved_url"):
        return str(discovery["resolved_url"])

    if (
        (c.provider.value if hasattr(c.provider, "value") else c.provider) == "axet_flows"
        and c.is_active
    ):
        discovered = _discover_axet_flows_runtime(c)
        if discovered.get("resolved_url"):
            return str(discovered["resolved_url"])

    return _build_axet_flows_manual_url(params)

def _axet_flows_timeout(c: IntegrationConnection, default_timeout: Optional[int] = None) -> int:
    params = c.params or {}
    fallback = default_timeout if default_timeout is not None else _SOCKET_TIMEOUT
    raw = params.get("timeout_seconds", fallback)
    try:
        return max(1, int(raw))
    except Exception:
        return fallback

def _axet_flows_http_timeout(c: IntegrationConnection, default_timeout: Optional[int] = None) -> httpx.Timeout:
    total = _axet_flows_timeout(c, default_timeout=default_timeout)
    return httpx.Timeout(
        connect=min(30, total),
        read=total,
        write=max(30, min(total, 60)),
        pool=30,
    )

_STATUS_MAP = {
    "New": "open",
    "To Do": "open",
    "Approved": "open",
    "Committed": "open",
    "Active": "in_progress",
    "In Progress": "in_progress",
    "Resolved": "done",
    "Closed": "done",
    "Done": "done",
    "Removed": "cancelled",
    "Cancelled": "cancelled",
    "Blocked": "blocked",
}

_ENABLER_TYPE_CANDIDATES = [
    "Custom.EnablerType",
    "Microsoft.VSTS.Common.ValueArea",
    "Custom.ValueArea",
]

_WSJF_FIELD_CANDIDATES = {
    "business_value": [
        "Custom.WSJFBusinessValue",
        "Custom.BusinessValue",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_KanoBusinessValue",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_BusinessValue",
        "Microsoft.VSTS.Common.BusinessValue",
    ],
    "time_criticality": [
        "Microsoft.VSTS.Common.TimeCriticality",
        "Custom.WSJFTimeCriticality",
        "Custom.TimeCriticality",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_TimeCriticality",
    ],
    "risk_reduction": [
        "Custom.RROE",
        "Custom.WSJFRiskReduction",
        "Custom.RiskReduction",
        "Custom.RiskReductionOpportunityEnablement",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_RiskReduction",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_RiskReductionOpportunityEnablement",
    ],
    "job_size": [
        "Microsoft.VSTS.Scheduling.Effort",
        "Custom.WSJFJobSize",
        "Custom.JobSize",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_JobSize",
        "Microsoft.VSTS.Scheduling.StoryPoints",
    ],
    "score": [
        "Custom.WSJF",
        "Custom.WeightedShortestJobFirst",
        "WEF_3EF069F80D99422991FD0B37D0A3D2C6_WSJF",
    ],
}

def _extract_enabler_type(fields: Dict[str, Any]) -> Optional[str]:
    for field_name in _ENABLER_TYPE_CANDIDATES:
        value = fields.get(field_name)
        if value not in (None, ""):
            return str(value)
    return None

_ITER_STATUS_MAP = {
    "inProgress": "active", "notStarted": "planned", "finished": "completed",
}

def _strip_html(value: Any) -> str:
    text = str(value or "")
    if not text:
        return ""
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p\s*>", "\n\n", text)
    text = re.sub(r"(?i)</div\s*>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def _safe_int(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, dict):
        for candidate_key in ("value", "newValue", "displayValue", "name", "text"):
            if candidate_key in value:
                parsed = _safe_int(value.get(candidate_key))
                if parsed is not None:
                    return parsed
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        match = re.search(r"-?\d+(?:[.,]\d+)?", stripped)
        if match:
            normalized = match.group(0).replace(",", ".")
            try:
                return int(float(normalized))
            except Exception:
                return None
    try:
        return int(float(value))
    except Exception:
        return None

def _safe_decimal(value: Any) -> Optional[Decimal]:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return Decimal(int(value))
    if isinstance(value, dict):
        for candidate_key in ("value", "newValue", "displayValue", "name", "text"):
            if candidate_key in value:
                parsed = _safe_decimal(value.get(candidate_key))
                if parsed is not None:
                    return parsed
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        match = re.search(r"-?\d+(?:[.,]\d+)?", stripped)
        if match:
            normalized = match.group(0).replace(",", ".")
            try:
                return Decimal(normalized)
            except Exception:
                return None
    try:
        return Decimal(str(value))
    except Exception:
        return None

def _first_present_value(fields: Dict[str, Any], candidates: List[str]) -> Any:
    for field_name in candidates:
        if field_name in fields and fields.get(field_name) not in (None, ""):
            return fields.get(field_name)
    return None

def _safe_field_name(name: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(name or "").strip().lower())

def _infer_wsjf_from_field_names(fields: Dict[str, Any]) -> Dict[str, Any]:
    inferred: Dict[str, Any] = {}
    score_candidate: Optional[Tuple[int, Any]] = None

    for key, value in fields.items():
        if value in (None, ""):
            continue

        normalized = _safe_field_name(key)

        if "wsjf" in normalized and "businessvalue" in normalized:
            inferred.setdefault("business_value", value)
        elif "wsjf" in normalized and ("timecriticality" in normalized or "timesensitivity" in normalized):
            inferred.setdefault("time_criticality", value)
        elif "wsjf" in normalized and ("riskreduction" in normalized or "opportunityenablement" in normalized or "rroe" in normalized):
            inferred.setdefault("risk_reduction", value)
        elif "wsjf" in normalized and ("jobsize" in normalized or "effort" in normalized):
            inferred.setdefault("job_size", value)
        elif "wsjf" in normalized and normalized != "wsjf":
            rank = 0
            if "score" in normalized:
                rank = 3
            elif "weightedshortestjobfirst" in normalized:
                rank = 2
            elif normalized.endswith("wsjf"):
                rank = 1
            if score_candidate is None or rank > score_candidate[0]:
                score_candidate = (rank, value)

    if score_candidate is not None:
        inferred["score"] = score_candidate[1]

    return inferred

def _extract_ado_identity(value: Any) -> Dict[str, Optional[str]]:
    if not value:
        return {"display_name": None, "email": None}

    if isinstance(value, dict):
        display_name = (
            value.get("displayName")
            or value.get("name")
            or value.get("uniqueName")
            or value.get("descriptor")
        )
        email = (
            value.get("uniqueName")
            or value.get("mail")
            or value.get("email")
        )
        return {
            "display_name": str(display_name).strip() if display_name else None,
            "email": str(email).strip().lower() if email and "@" in str(email) else None,
        }

    text_value = str(value).strip()
    if not text_value:
        return {"display_name": None, "email": None}

    email_match = re.search(r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})", text_value, re.I)
    email = email_match.group(1).lower() if email_match else None
    display_name = text_value
    if "<" in text_value and ">" in text_value:
        display_name = text_value.split("<", 1)[0].strip().rstrip(";,")

    return {
        "display_name": display_name or None,
        "email": email,
    }

def _resolve_assigned_member_id(db: Session, product_id: Optional[int], assigned_to: Any) -> Optional[int]:
    identity = _extract_ado_identity(assigned_to)
    display_name = identity["display_name"]
    email = identity["email"]

    if not display_name and not email:
        return None

    member: Optional[TeamMember] = None
    if email:
        member = db.query(TeamMember).filter(TeamMember.email == email).first()
    if not member and display_name:
        member = db.query(TeamMember).filter(TeamMember.full_name == display_name).first()

    if not member:
        member = TeamMember(
            full_name=display_name or email or "ADO User",
            email=email,
            resource_type="internal",
            is_active=True,
        )
        db.add(member)
        db.flush()

    if product_id:
        assoc = (
            db.query(TeamMemberProduct)
            .filter(
                TeamMemberProduct.member_id == member.member_id,
                TeamMemberProduct.product_id == product_id,
            )
            .first()
        )
        if not assoc:
            db.add(TeamMemberProduct(
                member_id=member.member_id,
                product_id=product_id,
                is_active=True,
            ))
            db.flush()

    return member.member_id

def _calc_wsjf(bv: Optional[int], tc: Optional[int], rr: Optional[int], js: Optional[int]) -> Decimal:
    if bv is None or tc is None or rr is None or js in (None, 0):
        raise ValueError("WSJF requires all dimensions and non-zero job size")
    return Decimal(str(round((bv + tc + rr) / js, 1)))

def _extract_wsjf_fields(fields: Dict[str, Any], story_points: Optional[int]) -> Tuple[Optional[int], Optional[int], Optional[int], Optional[int], Optional[Decimal]]:
    inferred = _infer_wsjf_from_field_names(fields)

    wsjf_bv = _safe_int(
        _first_present_value(fields, _WSJF_FIELD_CANDIDATES["business_value"])
        or inferred.get("business_value")
    )
    wsjf_tc = _safe_int(
        _first_present_value(fields, _WSJF_FIELD_CANDIDATES["time_criticality"])
        or inferred.get("time_criticality")
    )
    wsjf_rr = _safe_int(
        _first_present_value(fields, _WSJF_FIELD_CANDIDATES["risk_reduction"])
        or inferred.get("risk_reduction")
    )
    wsjf_js = _safe_int(
        _first_present_value(fields, _WSJF_FIELD_CANDIDATES["job_size"])
        or inferred.get("job_size")
    )
    explicit_score = _safe_decimal(
        _first_present_value(fields, _WSJF_FIELD_CANDIDATES["score"])
        or inferred.get("score")
    )

    if wsjf_js in (None, 0) and story_points not in (None, 0):
        wsjf_js = story_points

    business_value_general = _safe_int(fields.get("Microsoft.VSTS.Common.BusinessValue"))

    if wsjf_bv is None and explicit_score is not None and business_value_general is not None:
        wsjf_bv = business_value_general
    if wsjf_tc is None and explicit_score is not None and business_value_general is not None:
        wsjf_tc = business_value_general
    if wsjf_rr is None and explicit_score is not None and business_value_general is not None:
        wsjf_rr = business_value_general

    has_all_dimensions = all(v is not None for v in (wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js))

    if explicit_score is not None:
        final_score = explicit_score
    elif has_all_dimensions:
        final_score = _calc_wsjf(wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js)
    else:
        final_score = None

    return wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, final_score

def _extract_missing_ado_field(error_text: str, candidates: List[str]) -> Optional[str]:
    lowered = (error_text or "").lower()
    for field_name in candidates:
        if field_name.lower() in lowered:
            return field_name
    markers = [
        "cannot find field ",
        "field reference name '",
        'field reference name "',
    ]
    extracted: Optional[str] = None
    for marker in markers:
        idx = lowered.find(marker)
        if idx >= 0:
            start = idx + len(marker)
            tail = error_text[start:]
            separators = ["'", '"', ".", "\r", "\n", ",", ":"]
            end = len(tail)
            for sep in separators:
                pos = tail.find(sep)
                if pos >= 0:
                    end = min(end, pos)
            candidate = tail[:end].strip()
            if candidate:
                extracted = candidate
                break
    if extracted and extracted in candidates:
        return extracted
    if extracted:
        for field_name in candidates:
            if field_name.lower() == extracted.lower():
                return field_name
    return None

def _normalize_sync_types(raw_value: Any) -> List[str]:
    if isinstance(raw_value, list):
        parsed = [str(t).strip() for t in raw_value if str(t).strip()]
    else:
        parsed = [t.strip() for t in str(raw_value or "").split(",") if t.strip()]
    return parsed or ["User Story"]

def _normalize_work_item_type_name(raw_value: Any) -> str:
    cleaned = str(raw_value or "").strip()
    normalized = cleaned.lower()
    canonical_map = {
        "epic": "Epic",
        "feature": "Feature",
        "user story": "User Story",
        "userstory": "User Story",
        "story": "User Story",
        "product backlog item": "Product Backlog Item",
        "productbacklogitem": "Product Backlog Item",
        "pbi": "Product Backlog Item",
        "enabler": "Enabler",
        "bug": "Bug",
        "task": "Task",
        "issue": "Issue",
        "impediment": "Impediment",
        "test case": "Test Case",
        "testcase": "Test Case",
        "test suite": "Test Suite",
        "testsuite": "Test Suite",
    }
    if normalized in canonical_map:
        return canonical_map[normalized]
    return cleaned

def _resolve_backlog_item_type_name(ado_work_item_type: str, enabler_type: Optional[str]) -> str:
    normalized_ado_type = _normalize_work_item_type_name(ado_work_item_type)
    normalized_enabler_type = _normalize_work_item_type_name(enabler_type) if enabler_type else ""

    if normalized_enabler_type == "Enabler":
        return "Enabler"

    if normalized_ado_type in {"Epic", "Feature", "User Story", "Product Backlog Item", "Enabler", "Bug", "Task", "Issue", "Impediment", "Test Case", "Test Suite"}:
        return normalized_ado_type

    return normalized_ado_type or normalized_enabler_type or "User Story"

def _canonical_backlog_item_type_name(raw_name: Any) -> str:
    normalized = _normalize_work_item_type_name(raw_name)
    if not normalized:
        return ""

    canonical_map = {
        "Epic": "Epic",
        "Feature": "Feature",
        "User Story": "User Story",
        "Product Backlog Item": "User Story",
        "Task": "Task",
        "Bug": "Bug",
        "Spike": "Spike",
        "Improvement": "Improvement",
        "Research": "Research",
        "Enabler": "Enabler",
    }
    return canonical_map.get(normalized, normalized)

def _build_backlog_item_type_id_map(db: Session) -> Dict[str, int]:
    rows = db.query(BacklogItemType).all()
    mapping: Dict[str, int] = {}
    for row in rows:
        canonical_name = _canonical_backlog_item_type_name(row.name)
        if canonical_name:
            mapping[canonical_name] = row.item_type_id
    return mapping

def _resolve_backlog_item_type_id(
    db: Session,
    type_id_map: Dict[str, int],
    ado_work_item_type: Optional[str],
    enabler_type: Optional[str],
) -> Optional[int]:
    if not ado_work_item_type:
        return None

    resolved_name = _resolve_backlog_item_type_name(ado_work_item_type, enabler_type)
    canonical_name = _canonical_backlog_item_type_name(resolved_name)
    if not canonical_name:
        return None

    item_type_id = type_id_map.get(canonical_name)
    if item_type_id is not None:
        return item_type_id

    bt = db.query(BacklogItemType).filter(BacklogItemType.name == canonical_name).first()
    if not bt:
        bt = BacklogItemType(name=canonical_name, display_order=0, is_active=True)
        db.add(bt)
        db.flush()
    type_id_map[canonical_name] = bt.item_type_id
    return bt.item_type_id

def _merge_sync_type_aliases(sync_types: List[str]) -> List[str]:
    normalized_map: Dict[str, str] = {}
    for wi_type in sync_types:
        canonical = _normalize_work_item_type_name(wi_type)
        if not canonical:
            continue
        normalized_map[canonical.lower()] = canonical

    if "epic" in normalized_map and "feature" not in normalized_map:
        normalized_map["feature"] = "Feature"
    if "feature" in normalized_map and "epic" not in normalized_map:
        normalized_map["epic"] = "Epic"

    return list(normalized_map.values())

def _sync_all_work_item_types(raw_value: Any) -> bool:
    if raw_value is None or raw_value == "":
        return False
    if isinstance(raw_value, bool):
        return raw_value
    return str(raw_value or "").strip().lower() in {"1", "true", "yes", "all", "*"}

def _build_ado_wiql(c: IntegrationConnection) -> Tuple[str, List[str], bool]:
    params = c.params or {}
    project = params.get("project", "")
    area_path = params.get("area_path", "")
    sync_types = _merge_sync_type_aliases(_normalize_sync_types(params.get("sync_types", "User Story")))
    sync_all_types = _sync_all_work_item_types(params.get("sync_all_types", False))
    requested_types = list(sync_types)
    ado_filter_types = [t for t in sync_types if t != "Enabler"]
    type_clauses: List[str] = []
    if not sync_all_types and ado_filter_types:
        type_clauses.extend(f"[System.WorkItemType] = '{t}'" for t in ado_filter_types)
    if not sync_all_types and "Enabler" in requested_types:
        type_clauses.append("[System.WorkItemType] = 'Feature'")
    type_filter = "" if sync_all_types or not type_clauses else " AND (" + " OR ".join(type_clauses) + ")"
    area_clause = f" AND [System.AreaPath] UNDER '{area_path}'" if area_path else ""
    wiql_query = (
        f"SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '{project}'"
        f"{type_filter}{area_clause} ORDER BY [System.ChangedDate] DESC"
    )
    return wiql_query, requested_types, sync_all_types

def _fetch_ado_work_items(
    c: IntegrationConnection,
    specific_ids: Optional[List[str]] = None,
) -> Tuple[List[dict], List[str], Dict[str, Any]]:
    params = c.params or {}
    org_url = params.get("org_url", "").rstrip("/")
    project = params.get("project", "")
    sync_types = _merge_sync_type_aliases(_normalize_sync_types(params.get("sync_types", "User Story")))
    wiql_query, requested_types, sync_all_types = _build_ado_wiql(c)
    headers = _ado_headers(c)

    if specific_ids:
        normalized_ids: List[int] = []
        for raw_id in specific_ids:
            try:
                normalized_ids.append(int(str(raw_id).strip()))
            except Exception:
                continue
        ids = normalized_ids
    else:
        r = _ado_post(
            f"{org_url}/{project}/_apis/wit/wiql?api-version=6.0&$top=500",
            headers=headers,
            json={"query": wiql_query},
        )
        if r.status_code != 200:
            raise Exception(f"ADO WIQL error {r.status_code}: {r.text[:300]}")
        ids = [wi["id"] for wi in r.json().get("workItems", [])]

    diagnostics: Dict[str, Any] = {
        "wiql_query": wiql_query,
        "requested_types": requested_types,
        "sync_all_types": sync_all_types,
        "requested_ids_count": len(ids),
        "requested_ids_sample": [str(x) for x in ids[:25]],
        "specific_ids_requested": [str(x) for x in (specific_ids or [])],
        "detail_returned_ids_sample": [],
        "detail_missing_ids_sample": [],
        "detail_missing_ids_count": 0,
        "filtered_out_ids_sample": [],
        "filtered_out_ids_count": 0,
    }

    if not ids:
        return [], [], diagnostics

    base_fields = [
        "System.Id",
        "System.Title",
        "System.WorkItemType",
        "System.State",
        "System.Description",
        "System.IterationPath",
        "Microsoft.VSTS.Scheduling.StoryPoints",
        "Microsoft.VSTS.Common.AcceptanceCriteria",
        "Microsoft.VSTS.Common.BusinessValue",
        "System.AssignedTo",
    ]
    optional_fields = [
        *_WSJF_FIELD_CANDIDATES["business_value"],
        *_WSJF_FIELD_CANDIDATES["time_criticality"],
        *_WSJF_FIELD_CANDIDATES["risk_reduction"],
        *_WSJF_FIELD_CANDIDATES["job_size"],
        *_WSJF_FIELD_CANDIDATES["score"],
        *_ENABLER_TYPE_CANDIDATES,
    ]
    field_list = list(dict.fromkeys([*base_fields, *optional_fields]))
    missing_optional_fields: List[str] = []
    result: List[dict] = []
    detail_returned_ids: List[str] = []

    for i in range(0, len(ids), 200):
        batch = ids[i:i + 200]
        while True:
            fields = ",".join(field_list)
            dr = _ado_get(
                f"{org_url}/{project}/_apis/wit/workitems?ids={','.join(str(x) for x in batch)}"
                f"&fields={fields}&api-version=6.0",
                headers=headers,
            )
            if dr.status_code == 200:
                batch_items = dr.json().get("value", [])
                result.extend(batch_items)
                detail_returned_ids.extend(str(item.get("id", "")) for item in batch_items if item.get("id") is not None)
                break

            error_text = dr.text[:1500]
            missing_optional = _extract_missing_ado_field(
                error_text,
                [f for f in optional_fields if f in field_list],
            )
            if missing_optional:
                logger.warning("ADO field not found, skipping optional field: %s", missing_optional)
                field_list.remove(missing_optional)
                if missing_optional not in missing_optional_fields:
                    missing_optional_fields.append(missing_optional)
                continue

            raise Exception(f"ADO detail error {dr.status_code}: {error_text}")

    requested_id_set = {str(x) for x in ids}
    returned_id_set = set(detail_returned_ids)
    missing_detail_ids = sorted(requested_id_set - returned_id_set, key=lambda value: int(value))
    diagnostics["detail_returned_ids_sample"] = detail_returned_ids[:25]
    diagnostics["detail_missing_ids_sample"] = missing_detail_ids[:25]
    diagnostics["detail_missing_ids_count"] = len(missing_detail_ids)

    if not sync_all_types:
        filtered_result: List[dict] = []
        filtered_out_ids: List[str] = []
        requested_set = {_normalize_work_item_type_name(t) for t in requested_types}
        for wi in result:
            fields = wi.get("fields", {})
            ado_type = _normalize_work_item_type_name(fields.get("System.WorkItemType", ""))
            enabler_type = _normalize_work_item_type_name(_extract_enabler_type(fields) or "")
            backlog_type = _resolve_backlog_item_type_name(ado_type, enabler_type)
            if backlog_type in requested_set or ado_type in requested_set or enabler_type in requested_set:
                filtered_result.append(wi)
            else:
                filtered_out_ids.append(str(wi.get("id", "")))
        result = filtered_result
        diagnostics["filtered_out_ids_sample"] = filtered_out_ids[:25]
        diagnostics["filtered_out_ids_count"] = len(filtered_out_ids)

    return result, missing_optional_fields, diagnostics

def _fetch_ado_iterations(c: IntegrationConnection) -> List[dict]:
    params = c.params or {}
    org_url = params.get("org_url", "").rstrip("/")
    project = params.get("project", "")
    headers = _ado_headers(c)
    r = _ado_get(f"{org_url}/{project}/_apis/work/teamsettings/iterations?api-version=6.0",
                 headers=headers)
    if r.status_code == 200:
        return r.json().get("value", [])
    return []

def _fetch_ado_relations_map(
    c: IntegrationConnection,
    ids: List[int],
) -> Dict[str, List[dict]]:
    if not ids:
        return {}

    params = c.params or {}
    org_url = params.get("org_url", "").rstrip("/")
    project = params.get("project", "")
    headers = _ado_headers(c)
    relations_map: Dict[str, List[dict]] = {}

    for i in range(0, len(ids), 200):
        batch = ids[i:i + 200]
        dr = _ado_get(
            f"{org_url}/{project}/_apis/wit/workitems?ids={','.join(str(x) for x in batch)}"
            f"&$expand=relations&api-version=6.0",
            headers=headers,
        )
        if dr.status_code != 200:
            raise Exception(f"ADO relations error {dr.status_code}: {dr.text[:1500]}")
        for wi in dr.json().get("value", []):
            relations_map[str(wi.get('id', ''))] = wi.get("relations", []) or []

    return relations_map

def _extract_ado_relations(
    c: IntegrationConnection,
    ado_items: List[dict],
    ado_to_pl_item_id: Dict[str, int],
) -> List[Tuple[int, int, str]]:
    relation_type_map = {
        "System.LinkTypes.Hierarchy-Forward": "parent_of",
        "System.LinkTypes.Hierarchy-Reverse": "child_of",
        "System.LinkTypes.Dependency-Forward": "predecessor_of",
        "System.LinkTypes.Dependency-Reverse": "successor_of",
        "System.LinkTypes.Related": "relates_to",
    }
    seen: Set[Tuple[int, int, str]] = set()
    links: List[Tuple[int, int, str]] = []
    ids = [int(wi["id"]) for wi in ado_items if wi.get("id") is not None]
    relations_map = _fetch_ado_relations_map(c, ids)

    for wi in ado_items:
        source_ado_id = str(wi.get("id", ""))
        source_pl_id = ado_to_pl_item_id.get(source_ado_id)
        if not source_pl_id:
            continue
        for rel in relations_map.get(source_ado_id, []):
            rel_name = rel.get("rel")
            link_type = relation_type_map.get(rel_name)
            if not link_type:
                continue
            url = rel.get("url", "")
            target_ado_id = url.rstrip("/").split("/")[-1] if url else ""
            target_pl_id = ado_to_pl_item_id.get(target_ado_id)
            if not target_pl_id or target_pl_id == source_pl_id:
                continue
            key = (source_pl_id, target_pl_id, link_type)
            if key in seen:
                continue
            seen.add(key)
            links.append(key)

    return links

def _get_ado_relation_diff(
    c: IntegrationConnection,
    db: Session,
    ado_items: List[dict],
    product_id: Optional[int],
) -> Dict[str, Any]:
    from app.models.backlog import BacklogItemLink

    if not product_id:
        return {
            "desired_keys": set(),
            "existing_keys": set(),
            "existing_key_to_link": {},
            "item_id_to_ado_id": {},
            "item_id_to_title": {},
        }

    existing_items = db.execute(
        text("""
            SELECT item_id, ado_id, title
            FROM backlog_items
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().all()
    ado_to_pl_item_id = {
        str(item["ado_id"]): item["item_id"]
        for item in existing_items
        if item["ado_id"]
    }
    item_id_to_ado_id = {
        item["item_id"]: str(item["ado_id"])
        for item in existing_items
        if item["ado_id"]
    }
    item_id_to_title = {item["item_id"]: item["title"] for item in existing_items}

    desired_links = _extract_ado_relations(c, ado_items, ado_to_pl_item_id)
    desired_keys = set(desired_links)

    product_item_ids = {item["item_id"] for item in existing_items}
    if not product_item_ids:
        return {
            "desired_keys": desired_keys,
            "existing_keys": set(),
            "existing_key_to_link": {},
            "item_id_to_ado_id": item_id_to_ado_id,
            "item_id_to_title": item_id_to_title,
        }

    existing_links = (
        db.query(BacklogItemLink)
        .filter(
            BacklogItemLink.source_id.in_(product_item_ids),
            BacklogItemLink.target_id.in_(product_item_ids),
        )
        .all()
    )
    existing_key_to_link = {
        (link.source_id, link.target_id, link.link_type): link
        for link in existing_links
    }

    return {
        "desired_keys": desired_keys,
        "existing_keys": set(existing_key_to_link.keys()),
        "existing_key_to_link": existing_key_to_link,
        "item_id_to_ado_id": item_id_to_ado_id,
        "item_id_to_title": item_id_to_title,
    }


def _sync_ado_relations(
    c: IntegrationConnection,
    db: Session,
    ado_items: List[dict],
    product_id: Optional[int],
) -> Dict[str, int]:
    relation_diff = _get_ado_relation_diff(c, db, ado_items, product_id)
    desired_keys = relation_diff["desired_keys"]
    existing_key_to_link = relation_diff["existing_key_to_link"]

    created = 0
    for source_id, target_id, link_type in desired_keys:
        if (source_id, target_id, link_type) in existing_key_to_link:
            continue
        from app.models.backlog import BacklogItemLink
        db.add(BacklogItemLink(source_id=source_id, target_id=target_id, link_type=link_type))
        created += 1

    deleted = 0
    for key, link in existing_key_to_link.items():
        if key in desired_keys:
            continue
        db.delete(link)
        deleted += 1

    return {"created": created, "deleted": deleted, "total": len(desired_keys)}

def _apply_ado_sprint_state(existing, sprint) -> None:
    current_sprint_id = sprint.sprint_id if sprint else None
    existing.sprint_id = current_sprint_id
    existing.end_sprint_id = current_sprint_id
    if existing.start_sprint_id is None and current_sprint_id is not None:
        existing.start_sprint_id = current_sprint_id

# ── CRUD routes ───────────────────────────────────────────────────────────────

@router.get("/providers", response_model=Dict[str, List[FieldSchemaOut]])
def list_providers(db: Session = Depends(get_db)):
    rows = db.query(IntegrationFieldSchema).order_by(
        IntegrationFieldSchema.provider, IntegrationFieldSchema.sort_order).all()
    result: Dict[str, List] = {}
    for r in rows:
        key = r.provider.value if hasattr(r.provider, "value") else r.provider
        result.setdefault(key, []).append(r)
    return result

@router.get("/connections")
def list_connections(scope: Optional[str] = Query(None), provider: Optional[str] = Query(None),
                     product_id: Optional[int] = Query(None), company_id: Optional[int] = Query(None),
                     db: Session = Depends(get_db)):
    q = db.query(IntegrationConnection)
    if scope:      q = q.filter(IntegrationConnection.scope == scope)
    if provider:   q = q.filter(IntegrationConnection.provider == provider)
    if product_id: q = q.filter(IntegrationConnection.product_id == product_id)
    if company_id: q = q.filter(IntegrationConnection.company_id == company_id)

    rows = q.order_by(IntegrationConnection.created_at.desc()).all()
    changed = False
    result = []
    for c in rows:
        provider_name = c.provider.value if hasattr(c.provider, "value") else c.provider
        if provider_name == "axet_flows" and c.is_active:
            before_port = str((c.params or {}).get("port", "") or "")
            before_url = str((c.params or {}).get("resolved_url", "") or "")
            discovered = _discover_axet_flows_runtime(c)
            after_port = str((c.params or {}).get("port", "") or "")
            after_url = str((c.params or {}).get("resolved_url", "") or "")
            if before_port != after_port or before_url != after_url:
                changed = True
        result.append(_conn_to_out(c))

    if changed:
        db.commit()

    return result

@router.post("/connections", status_code=201)
def create_connection(body: ConnectionCreate, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    scope = body.scope
    company_id = body.company_id
    product_id = body.product_id

    if scope == "global":
        company_id = None
        product_id = None
    elif scope == "company":
        product_id = None
        if company_id is None:
            raise HTTPException(status_code=400, detail="company_id is required when scope=company")
    elif scope == "product":
        if product_id is None:
            raise HTTPException(status_code=400, detail="product_id is required when scope=product")
    else:
        raise HTTPException(status_code=400, detail="Invalid scope. Use global, company, or product.")

    c = IntegrationConnection(
        id=str(uuid.uuid4()), name=body.name, description=body.description,
        provider=body.provider, scope=body.scope,
        company_id=company_id, product_id=product_id,
        params=body.params, secrets=body.secrets, is_active=body.is_active,
        created_by=current_user.user_id,
    )
    try:
        db.add(c)
        db.commit()
        db.refresh(c)
        return _conn_to_out(c)
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Failed to create integration connection")
        raise HTTPException(status_code=400, detail=f"DB error while creating connection: {e}")

@router.get("/connections/{conn_id}")
def get_connection(conn_id: str, db: Session = Depends(get_db)):
    c = _get_or_404(db, conn_id)
    provider_name = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider_name == "axet_flows" and c.is_active:
        before_port = str((c.params or {}).get("port", "") or "")
        before_url = str((c.params or {}).get("resolved_url", "") or "")
        _discover_axet_flows_runtime(c)
        after_port = str((c.params or {}).get("port", "") or "")
        after_url = str((c.params or {}).get("resolved_url", "") or "")
        if before_port != after_port or before_url != after_url:
            db.commit()
    return _conn_to_out(c)

@router.patch("/connections/{conn_id}")
def update_connection(conn_id: str, body: ConnectionUpdate, db: Session = Depends(get_db)):
    c = _get_or_404(db, conn_id)
    if body.name        is not None: c.name        = body.name
    if body.description is not None: c.description = body.description
    if body.is_active   is not None: c.is_active   = body.is_active
    if body.params      is not None: c.params      = body.params;  c.last_error = None
    if body.secrets     is not None: c.secrets     = {**c.secrets, **body.secrets}; c.last_error = None

    scope = c.scope.value if hasattr(c.scope, "value") else c.scope
    if scope == "global":
        c.company_id = None
        c.product_id = None
    elif scope == "company":
        c.product_id = None
        if c.company_id is None:
            raise HTTPException(status_code=400, detail="company_id is required when scope=company")
    elif scope == "product":
        if c.product_id is None:
            raise HTTPException(status_code=400, detail="product_id is required when scope=product")

    c.updated_at = datetime.utcnow()
    try:
        db.commit()
        db.refresh(c)
        return _conn_to_out(c)
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Failed to update integration connection %s", conn_id)
        raise HTTPException(status_code=400, detail=f"DB error while updating connection: {e}")

@router.delete("/connections/{conn_id}", status_code=204)
def delete_connection(conn_id: str, db: Session = Depends(get_db)):
    c = _get_or_404(db, conn_id)
    db.delete(c); db.commit()

@router.get("/axet-flows/discovery", response_model=AxetFlowsDiscoveryOut)
def axet_flows_discovery(
    connection_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user
    active_connection: Optional[IntegrationConnection] = None

    if connection_id:
        candidate = _get_or_404(db, connection_id)
        provider_name = candidate.provider.value if hasattr(candidate.provider, "value") else candidate.provider
        if provider_name != "axet_flows":
            raise HTTPException(status_code=400, detail="Connection is not an aXet Flows provider")
        active_connection = candidate
    else:
        active_connection = (
            db.query(IntegrationConnection)
            .filter(
                IntegrationConnection.provider == "axet_flows",
                IntegrationConnection.is_active == True,
            )
            .order_by(IntegrationConnection.updated_at.desc(), IntegrationConnection.created_at.desc())
            .first()
        )

    discovery = AxetFlowsDiscoveryService().discover()
    if active_connection:
        before_params = dict(active_connection.params or {})
        current_port = str(before_params.get("port", "") or "")
        current_url = str(before_params.get("resolved_url", "") or "")

        payload = _discover_axet_flows_runtime(active_connection)

        after_params = dict(active_connection.params or {})
        next_port = str(after_params.get("port", "") or "")
        next_url = str(after_params.get("resolved_url", "") or "")

        if current_port != next_port or current_url != next_url:
            db.commit()

        return payload

    return asdict(discovery)

@router.post("/connections/{conn_id}/refresh")
def refresh_connection_runtime(conn_id: str, db: Session = Depends(get_db)):
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider

    if provider != "axet_flows":
        raise HTTPException(status_code=400, detail="Refresh only supported for axet_flows")

    discovery = _discover_axet_flows_runtime(c)

    log = IntegrationSyncLog(
        id=str(uuid.uuid4()),
        connection_id=c.id,
        operation_type="refresh",
        status="completed" if discovery.get("status") == "available" else "partial",
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
        items_created=0,
        items_updated=1 if discovery.get("host_port") is not None else 0,
        items_skipped=0,
        error_message=discovery.get("error"),
        details={
            "provider": "axet_flows",
            "runtime_available": discovery.get("runtime_available"),
            "running": discovery.get("running"),
            "healthy": discovery.get("healthy"),
            "host_port": discovery.get("host_port"),
            "resolved_url": discovery.get("resolved_url"),
            "status": discovery.get("status"),
        },
    )
    db.add(log)
    db.commit()
    db.refresh(c)

    return {
        "ok": True,
        "message": "aXet Flows runtime refreshed",
        "connection": _conn_to_out(c),
        "discovery": discovery,
    }

# ── Test ──────────────────────────────────────────────────────────────────────

@router.post("/connections/{conn_id}/test")
def test_connection(conn_id: str, db: Session = Depends(get_db)):
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    try:
        if provider == "azure_devops":
            params = c.params or {}
            org_url = params.get("org_url", "").rstrip("/")
            project = params.get("project", "")
            r = _ado_get(f"{org_url}/{project}/_apis/wit/workitemtypes?api-version=7.1",
                         headers=_ado_headers(c))
            if r.status_code not in (200, 203):
                raise Exception(f"ADO responded {r.status_code}: {r.text[:200]}")
        elif provider == "openai":
            api_key = (c.secrets or {}).get("api_key", "")
            r = httpx.get("https://api.openai.com/v1/models",
                          headers={"Authorization": f"Bearer {api_key}"}, timeout=10, verify=_SSL_VERIFY)
            if r.status_code != 200:
                raise Exception(f"OpenAI responded {r.status_code}: {r.text[:200]}")
        elif provider == "azure_openai":
            params = c.params or {}; secrets = c.secrets or {}
            endpoint = params.get("endpoint", "").rstrip("/")
            version = params.get("api_version", "2024-02-01")
            api_key = secrets.get("api_key", "")
            r = httpx.get(f"{endpoint}/openai/deployments?api-version={version}",
                          headers={"api-key": api_key}, timeout=10, verify=_SSL_VERIFY)
            if r.status_code not in (200, 404):
                raise Exception(f"Azure OpenAI responded {r.status_code}: {r.text[:200]}")
        elif provider == "axet_flows":
            params = c.params or {}
            discovery = _discover_axet_flows_runtime(c)
            question_field = str(params.get("request_question_field", "pergunta")).strip() or "pergunta"
            context_field = str(params.get("request_context_field", "contexto")).strip()
            response_answer_field = str(params.get("response_answer_field", "resposta")).strip() or "resposta"
            mode = str(params.get("mode", "text")).strip().lower() or "text"
            payload = {question_field: "Responda apenas OK"}
            if context_field:
                payload[context_field] = {"type": "connection_test"}
            r = httpx.post(
                _axet_flows_url(c, discovery=discovery),
                json=payload,
                timeout=_axet_flows_timeout(c, default_timeout=60),
                verify=_bool_param(params.get("verify_tls"), default=False),
            )
            if r.status_code != 200:
                raise Exception(f"aXet Flows responded {r.status_code}: {r.text[:200]}")
            data = r.json()
            if mode == "structured":
                missing = [key for key in _AXET_STRUCTURED_KEYS if key not in data]
                if missing:
                    raise Exception(f"aXet Flows structured response missing: {', '.join(missing)}")
            elif response_answer_field not in data:
                raise Exception(f"aXet Flows response missing field '{response_answer_field}'")
        else:
            return {"ok": True, "message": f"Provider '{provider}' test not implemented."}
        return {"ok": True, "message": "Connection successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── AI Analyze ────────────────────────────────────────────────────────────────

_PL_SYSTEM_PROMPT = """Você é o Agente do Product Lab — uma ferramenta inteligente de gestão de produtos digitais.

Seu papel é analisar textos (transcrições, e-mails, reuniões, entrevistas, feedback, documentos) e extrair informações estruturadas para alimentar os módulos do Product Lab.

## Módulos do Product Lab e o que extrair:

**opportunities** — Oportunidades de negócio / mercado identificadas.
Campos: title, description, source, business_impact (Alto/Médio/Baixo), confidence (Alta/Média/Baixa).

**requirements** — Requisitos funcionais e não-funcionais do produto.
Campos: title, description, type (Functional/Non-Functional/Business), priority (Critical/High/Medium/Low), acceptance_criteria.

**risks** — Riscos técnicos, de negócio, de prazo, regulatórios.
Campos: title, description, category (Technical/Business/Schedule/Regulatory/External), probability (High/Medium/Low), impact (High/Medium/Low), mitigation_suggestion.

**backlog** — Itens de backlog: user stories, tarefas, bugs, melhorias.
Campos: title, description, type (User Story/Task/Bug/Improvement), priority (1-5, sendo 1 mais alto), acceptance_criteria, story_points_estimate.

**decisions** — Decisões tomadas ou que precisam ser tomadas.
Campos: title, description, decision_type (Architectural/Business/Process/Product), status (Proposed/Approved/Rejected/Pending), rationale, impact.

**followups** — Ações de acompanhamento, pontos em aberto, pendências.
Campos: title, description, responsible_hint (nome/cargo mencionado), due_date_hint (data/prazo mencionado), priority (High/Medium/Low).

**stakeholders** — Pessoas ou grupos mencionados com interesse no produto.
Campos: name, role, organization, influence (High/Medium/Low), interest (High/Medium/Low), notes.

**insights** — Observações estratégicas, padrões identificados, recomendações gerais não encaixadas acima.
Campos: title, description, category (Strategic/Technical/User/Process).

## Instruções:
1. Analise o texto com atenção e extraia APENAS o que está explícito ou fortemente implícito.
2. Retorne APENAS um objeto JSON válido, sem markdown, sem blocos de código, sem texto fora do JSON.
3. Para cada módulo, retorne uma lista (pode ser vazia []).
4. Seja preciso: prefira qualidade à quantidade.
5. Texto em português: responda em português. Texto em inglês: responda em inglês.

## Formato de saída (JSON puro):
{
  "opportunities": [],
  "requirements": [],
  "risks": [],
  "backlog": [],
  "decisions": [],
  "followups": [],
  "stakeholders": [],
  "insights": []
}"""

class AnalyzeBody(BaseModel):
    text: str
    context: Optional[str] = None  # e.g. "reunião de discovery", "transcrição", "e-mail"

class AIConnectionOptionOut(BaseModel):
    id: str
    name: str
    provider: str
    scope: str
    product_id: Optional[int] = None
    company_id: Optional[int] = None
    is_active: bool

class AIChatBody(BaseModel):
    message: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    company_id: Optional[int] = None
    module: Optional[str] = None
    submodule: Optional[str] = None
    connection_id: Optional[str] = None
    context: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    opportunity_id: Optional[int] = None
    research_id: Optional[int] = None
    canvas_id: Optional[int] = None
    process_id: Optional[int] = None
    sprint_id: Optional[int] = None
    stakeholder_id: Optional[int] = None
    meeting_id: Optional[int] = None
    transcript_id: Optional[int] = None
    request_id: Optional[str] = None

def _is_ai_provider(provider: str) -> bool:
    return provider in ("openai", "azure_openai", "axet_flows")

def _normalize_connection_scope(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)

def _resolve_scope_rank(connection: IntegrationConnection, product_id: Optional[int], company_id: Optional[int]) -> int:
    scope = _normalize_connection_scope(connection.scope)
    if scope == "product" and product_id is not None and connection.product_id == product_id:
        return 3
    if scope == "company" and company_id is not None and connection.company_id == company_id:
        return 2
    if scope == "global":
        return 1
    return 0

def _get_active_ai_connections(
    db: Session,
    product_id: Optional[int] = None,
    company_id: Optional[int] = None,
) -> List[IntegrationConnection]:
    all_active = (
        db.query(IntegrationConnection)
        .filter(IntegrationConnection.is_active == True)
        .all()
    )
    eligible: List[Tuple[int, IntegrationConnection]] = []
    for conn in all_active:
        provider = conn.provider.value if hasattr(conn.provider, "value") else conn.provider
        if not _is_ai_provider(provider):
            continue
        rank = _resolve_scope_rank(conn, product_id, company_id)
        if rank > 0:
            eligible.append((rank, conn))
    eligible.sort(
        key=lambda item: (
            -item[0],
            0 if ((item[1].provider.value if hasattr(item[1].provider, "value") else item[1].provider) == "axet_flows") else 1,
            item[1].created_at or datetime.min,
        )
    )
    return [conn for _, conn in eligible]

def _build_product_lab_context(
    db: Session,
    product_id: Optional[int] = None,
    module: Optional[str] = None,
) -> str:
    context_parts: List[str] = []
    if product_id:
        try:
            product_row = db.execute(
                text("""
                    SELECT product_id, name, status, description
                    FROM products
                    WHERE product_id = :product_id
                """),
                {"product_id": product_id},
            ).mappings().first()
            if product_row:
                context_parts.append(
                    "PRODUCT\\n"
                    f"- id: {product_row['product_id']}\\n"
                    f"- name: {product_row['name']}\\n"
                    f"- status: {product_row['status']}\\n"
                    f"- description: {product_row.get('description') or ''}"
                )
        except Exception:
            logger.exception("Failed to load product context for AI chat")

    if module:
        context_parts.append(f"CURRENT_MODULE\\n- {module}")

    if not context_parts:
        return "No Product Lab context available."
    return "\\n\\n".join(context_parts)

def _compact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    compacted: Dict[str, Any] = {}
    for key, value in data.items():
        if value in ("", [], {}):
            continue
        compacted[key] = value
    return compacted

def _build_axet_structured_context(body: AIChatBody) -> Dict[str, Any]:
    scope = "product" if body.product_id else ("company" if body.company_id else "global")
    return _compact_dict({
        "scope": scope,
        "product_id": body.product_id,
        "product_name": body.product_name,
        "company_id": body.company_id,
        "module": body.module,
        "submodule": body.submodule,
        "entity_type": body.entity_type,
        "entity_id": body.entity_id,
        "resource_type": body.resource_type,
        "resource_id": body.resource_id,
        "opportunity_id": body.opportunity_id,
        "research_id": body.research_id,
        "canvas_id": body.canvas_id,
        "process_id": body.process_id,
        "sprint_id": body.sprint_id,
        "stakeholder_id": body.stakeholder_id,
        "meeting_id": body.meeting_id,
        "transcript_id": body.transcript_id,
        "extra_context": body.context,
        "request_id": body.request_id,
    })

def _axet_flows_status_url(c: IntegrationConnection, request_id: str) -> str:
    params = c.params or {}
    resolved_base = str(params.get("resolved_url", "") or "").strip()
    if resolved_base:
        base = resolved_base.rsplit("/", 1)[0]
    else:
        ask_url = _axet_flows_url(c)
        base = ask_url.rsplit("/", 1)[0]

    status_path = str(params.get("status_path", "/agent/status")).strip() or "/agent/status"
    if not status_path.startswith("/"):
        status_path = f"/{status_path}"

    return f"{base}{status_path}/{request_id}"

def _generate_request_id() -> str:
    return str(uuid4())

def _proxy_axet_flows_status(
    c: IntegrationConnection,
    request_id: str,
) -> Dict[str, Any]:
    params = c.params or {}
    _discover_axet_flows_runtime(c)
    response = httpx.get(
        _axet_flows_status_url(c, request_id),
        timeout=_axet_flows_http_timeout(c, default_timeout=60),
        verify=_bool_param(params.get("verify_tls"), default=False),
    )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"aXet Flows status error {response.status_code}: {response.text[:400]}")
    data = response.json()
    if isinstance(data, dict) and not data.get("request_id"):
        data["request_id"] = request_id
    return data

def _invoke_ai_chat_connection(
    c: IntegrationConnection,
    message: str,
    context: str,
    structured_context: Optional[Dict[str, Any]] = None,
    product_id: Optional[int] = None,
    module: Optional[str] = None,
    entity_id: Optional[str] = None,
) -> Dict[str, Any]:
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    params = c.params or {}
    secrets = c.secrets or {}

    if provider == "axet_flows":
        discovery = _discover_axet_flows_runtime(c)
        question_field = str(params.get("request_question_field", "pergunta")).strip() or "pergunta"
        context_field = str(params.get("request_context_field", "contexto")).strip() or "contexto"
        response_answer_field = str(params.get("response_answer_field", "resposta")).strip() or "resposta"
        request_id = (structured_context or {}).get("request_id") or _generate_request_id()
        payload = {
            "request_id": request_id,
            question_field: message,
            context_field: structured_context or {},
        }
        r = httpx.post(
            _axet_flows_url(c, discovery=discovery),
            json=payload,
            timeout=_axet_flows_http_timeout(c, default_timeout=300),
            verify=_bool_param(params.get("verify_tls"), default=False),
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"aXet Flows error {r.status_code}: {r.text[:400]}")
        data = r.json()
        answer = data.get(response_answer_field) or data.get("answer") or data.get("message") or ""
        return {
            "provider": provider,
            "raw": data,
            "answer": str(answer or ""),
            "request_id": request_id,
        }

    model = params.get("model", "gpt-4o-mini") or "gpt-4o-mini"
    system_prompt = (
        "Você é o AI Agent do Product Lab. "
        "Responda perguntas sobre todos os módulos do Product Lab com base no contexto fornecido. "
        "Seja objetivo, útil e estruturado. Se faltar contexto, explicite a limitação."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"CONTEXTO PRODUCT LAB:\\n{context}\\n\\nPERGUNTA DO USUÁRIO:\\n{message}"},
    ]
    payload = {"model": model, "messages": messages, "temperature": 0.2}

    if provider == "openai":
        api_key = secrets.get("api_key", "")
        org_id = params.get("org_id", "")
        headers: Dict[str, str] = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        if org_id:
            headers["OpenAI-Organization"] = org_id
        r = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=120,
            verify=_SSL_VERIFY,
        )
    else:
        endpoint = params.get("endpoint", "").rstrip("/")
        deployment = params.get("deployment_name", model)
        api_version = params.get("api_version", "2024-08-01-preview")
        api_key = secrets.get("api_key", "")
        url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
        az_payload = {k: v for k, v in payload.items() if k != "model"}
        r = httpx.post(
            url,
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json=az_payload,
            timeout=120,
            verify=_SSL_VERIFY,
        )

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"LLM API error {r.status_code}: {r.text[:400]}")
    data = r.json()
    answer = data["choices"][0]["message"]["content"]
    return {
        "provider": provider,
        "raw": data,
        "answer": str(answer or "").strip(),
    }

@router.get("/ai/connections", response_model=List[AIConnectionOptionOut])
def list_active_ai_connections(
    product_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user
    connections = _get_active_ai_connections(db, product_id=product_id, company_id=company_id)
    return [
        AIConnectionOptionOut(
            id=c.id,
            name=c.name,
            provider=c.provider.value if hasattr(c.provider, "value") else c.provider,
            scope=c.scope.value if hasattr(c.scope, "value") else c.scope,
            product_id=c.product_id,
            company_id=c.company_id,
            is_active=c.is_active,
        )
        for c in connections
    ]

@router.get("/ai/status/{request_id}")
def ai_chat_status(
    request_id: str,
    connection_id: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user
    active_connections = _get_active_ai_connections(
        db,
        product_id=product_id,
        company_id=company_id,
    )

    if not active_connections:
        raise HTTPException(status_code=400, detail="No active AI connection found.")

    selected_connection: Optional[IntegrationConnection] = None
    if connection_id:
        selected_connection = next((c for c in active_connections if c.id == connection_id), None)
        if not selected_connection:
            raise HTTPException(status_code=400, detail="Selected AI connection is not active in this scope.")
    elif len(active_connections) == 1:
        selected_connection = active_connections[0]
    else:
        axet_connections = [
            c for c in active_connections
            if (c.provider.value if hasattr(c.provider, "value") else c.provider) == "axet_flows"
        ]
        if len(axet_connections) == 1:
            selected_connection = axet_connections[0]
        else:
            raise HTTPException(status_code=400, detail="Multiple active AI connections found. Connection selection required for status polling.")

    provider_name = selected_connection.provider.value if hasattr(selected_connection.provider, "value") else selected_connection.provider
    if provider_name != "axet_flows":
        raise HTTPException(status_code=400, detail="Status polling is only supported for axet_flows connections.")

    return _proxy_axet_flows_status(selected_connection, request_id)

@router.post("/ai/chat")
def ai_chat(
    body: AIChatBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user
    active_connections = _get_active_ai_connections(
        db,
        product_id=body.product_id,
        company_id=body.company_id,
    )

    if not active_connections:
        raise HTTPException(status_code=400, detail="No active AI connection found.")

    selected_connection: Optional[IntegrationConnection] = None
    if body.connection_id:
        selected_connection = next((c for c in active_connections if c.id == body.connection_id), None)
        if not selected_connection:
            raise HTTPException(status_code=400, detail="Selected AI connection is not active in this scope.")
    elif len(active_connections) == 1:
        selected_connection = active_connections[0]
    else:
        return {
            "requires_selection": True,
            "message": "Multiple active AI connections found. User must choose one.",
            "connections": [
                {
                    "id": c.id,
                    "name": c.name,
                    "provider": c.provider.value if hasattr(c.provider, "value") else c.provider,
                    "scope": c.scope.value if hasattr(c.scope, "value") else c.scope,
                    "product_id": c.product_id,
                    "company_id": c.company_id,
                }
                for c in active_connections
            ],
        }

    combined_context = _build_product_lab_context(
        db,
        product_id=body.product_id,
        module=body.module,
    )
    provider_name = selected_connection.provider.value if hasattr(selected_connection.provider, "value") else selected_connection.provider
    if body.context and provider_name != "axet_flows":
        combined_context = f"{combined_context}\\n\\nUSER_CONTEXT\\n{body.context}"

    request_id = body.request_id or _generate_request_id()
    body_with_request_id = body.model_copy(update={"request_id": request_id})

    result = _invoke_ai_chat_connection(
        selected_connection,
        body.message,
        combined_context,
        structured_context=_build_axet_structured_context(body_with_request_id),
        product_id=body.product_id,
        module=body.module,
        entity_id=body.entity_id,
    )

    return {
        "requires_selection": False,
        "connection": {
            "id": selected_connection.id,
            "name": selected_connection.name,
            "provider": selected_connection.provider.value if hasattr(selected_connection.provider, "value") else selected_connection.provider,
            "scope": selected_connection.scope.value if hasattr(selected_connection.scope, "value") else selected_connection.scope,
        },
        "module": body.module,
        "product_id": body.product_id,
        "request_id": request_id,
        "answer": result["answer"],
        "raw": result["raw"],
    }

@router.post("/connections/{conn_id}/analyze")
def analyze_text(conn_id: str, body: AnalyzeBody, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    """
    Sends text to OpenAI (or Azure OpenAI) and returns structured Product Lab data.
    """
    import json as _json
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider not in ("openai", "azure_openai", "axet_flows"):
        raise HTTPException(status_code=400, detail="Analyze only supported for openai / azure_openai / axet_flows")

    params  = c.params  or {}
    secrets = c.secrets or {}

    model       = params.get("model", "gpt-4o") or "gpt-4o"
    temperature = float(params.get("temperature", "0.2") or "0.2")
    sys_prompt  = params.get("system_prompt", "").strip() or _PL_SYSTEM_PROMPT

    user_msg = body.text
    if body.context:
        user_msg = f"[Contexto: {body.context}]\n\n{body.text}"

    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user",   "content": user_msg},
    ]
    payload = {"model": model, "messages": messages, "temperature": temperature,
               "response_format": {"type": "json_object"}}

    try:
        if provider == "axet_flows":
            discovery = _discover_axet_flows_runtime(c)
            question_field = str(params.get("request_question_field", "pergunta")).strip() or "pergunta"
            context_field = str(params.get("request_context_field", "contexto")).strip()
            response_answer_field = str(params.get("response_answer_field", "resposta")).strip() or "resposta"
            mode = str(params.get("mode", "structured")).strip().lower() or "structured"

            axet_payload = {question_field: user_msg}
            if body.context and context_field:
                axet_payload[context_field] = body.context

            r = httpx.post(
                _axet_flows_url(c, discovery=discovery),
                json=axet_payload,
                timeout=_axet_flows_http_timeout(c, default_timeout=300),
                verify=_bool_param(params.get("verify_tls"), default=False),
            )
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail=f"aXet Flows error {r.status_code}: {r.text[:400]}")
            result = r.json()
            if mode == "structured":
                for key in _AXET_STRUCTURED_KEYS:
                    result.setdefault(key, [])
                return result

            answer = str(result.get(response_answer_field, "") or "")
            return {
                "opportunities": [],
                "requirements": [],
                "risks": [],
                "backlog": [],
                "decisions": [],
                "followups": [],
                "stakeholders": [],
                "insights": ([{
                    "title": "Resposta do aXet Flows",
                    "description": answer,
                    "category": "Technical",
                }] if answer else []),
            }

        if provider == "openai":
            api_key = secrets.get("api_key", "")
            org_id  = params.get("org_id", "")
            headers: dict = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            if org_id:
                headers["OpenAI-Organization"] = org_id
            r = httpx.post("https://api.openai.com/v1/chat/completions",
                           headers=headers, json=payload, timeout=120, verify=_SSL_VERIFY)
        else:  # azure_openai
            endpoint    = params.get("endpoint", "").rstrip("/")
            deployment  = params.get("deployment_name", model)
            api_version = params.get("api_version", "2024-08-01-preview")
            api_key     = secrets.get("api_key", "")
            url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
            # Azure OpenAI doesn't support response_format json_object on all versions — remove if needed
            az_payload = {k: v for k, v in payload.items() if k != "model"}
            r = httpx.post(url, headers={"api-key": api_key, "Content-Type": "application/json"},
                           json=az_payload, timeout=120, verify=_SSL_VERIFY)

        if r.status_code != 200:
            raise HTTPException(status_code=502,
                detail=f"LLM API error {r.status_code}: {r.text[:400]}")

        content = r.json()["choices"][0]["message"]["content"]
        # Strip markdown code fences if model ignores instructions
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```", 2)[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.rsplit("```", 1)[0].strip()

        result = _json.loads(content)
        # Ensure all expected keys exist
        for key in _AXET_STRUCTURED_KEYS:
            result.setdefault(key, [])
        return result

    except HTTPException:
        raise
    except _json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# ── Sync Preview ──────────────────────────────────────────────────────────────

def _build_sync_diagnostics_payload(
    c: IntegrationConnection,
    db: Session,
    ado_id: Optional[str] = None,
    title_contains: Optional[str] = None,
) -> dict:
    """
    Diagnostic endpoint for ADO sync troubleshooting.
    Returns connection sync params, WIQL, ADO type distributions, preview counts and sprint counts.
    """

    params = c.params or {}
    wiql_query, requested_types, sync_all_types = _build_ado_wiql(c)
    specific_ids = [ado_id] if ado_id else None
    ado_items, missing_optional_fields, fetch_diagnostics = _fetch_ado_work_items(c, specific_ids=specific_ids)
    if ado_id and not any(str(wi.get("id", "")) == str(ado_id) for wi in ado_items):
        fallback_items, fallback_missing_optional_fields, fallback_fetch_diagnostics = _fetch_ado_work_items(c)
        merged_by_id: Dict[str, dict] = {str(wi.get("id", "")): wi for wi in fallback_items}
        for wi in ado_items:
            merged_by_id[str(wi.get("id", ""))] = wi
        ado_items = list(merged_by_id.values())
        missing_optional_fields = list(dict.fromkeys(missing_optional_fields + fallback_missing_optional_fields))
        fetch_diagnostics["fallback_used"] = True
        fetch_diagnostics["fallback"] = fallback_fetch_diagnostics
    else:
        fetch_diagnostics["fallback_used"] = False

    ado_iterations = _fetch_ado_iterations(c)
    preview = _build_preview(c, db)

    raw_type_counter: Counter[str] = Counter()
    resolved_type_counter: Counter[str] = Counter()
    enabler_type_counter: Counter[str] = Counter()

    sample_items: List[dict] = []
    matched_items: List[dict] = []
    normalized_title_filter = (title_contains or "").strip().lower()

    for wi in ado_items:
        fields = wi.get("fields", {})
        item_ado_id = str(wi.get("id", ""))
        item_title = fields.get("System.Title", "")
        raw_type = _normalize_work_item_type_name(fields.get("System.WorkItemType", ""))
        enabler_type = _normalize_work_item_type_name(_extract_enabler_type(fields) or "")
        resolved_type = _resolve_backlog_item_type_name(raw_type, enabler_type)
        raw_type_counter[raw_type or "(empty)"] += 1
        resolved_type_counter[resolved_type or "(empty)"] += 1
        if enabler_type:
            enabler_type_counter[enabler_type] += 1

        story_points = _safe_int(fields.get("Microsoft.VSTS.Scheduling.StoryPoints"))
        wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, wsjf_score = _extract_wsjf_fields(fields, story_points)
        item_payload = {
            "ado_id": item_ado_id,
            "title": item_title,
            "raw_work_item_type": raw_type,
            "resolved_work_item_type": resolved_type,
            "enabler_type": enabler_type or None,
            "state": fields.get("System.State", ""),
            "iteration_path": fields.get("System.IterationPath", ""),
            "story_points": story_points,
            "raw_wsjf": _first_present_value(fields, _WSJF_FIELD_CANDIDATES["score"]),
            "raw_wsjf_business_value": _first_present_value(fields, _WSJF_FIELD_CANDIDATES["business_value"]),
            "raw_wsjf_time_criticality": _first_present_value(fields, _WSJF_FIELD_CANDIDATES["time_criticality"]),
            "raw_wsjf_risk_reduction": _first_present_value(fields, _WSJF_FIELD_CANDIDATES["risk_reduction"]),
            "raw_wsjf_job_size": _first_present_value(fields, _WSJF_FIELD_CANDIDATES["job_size"]),
            "raw_business_value_general": fields.get("Microsoft.VSTS.Common.BusinessValue"),
            "parsed_wsjf_business_value": wsjf_bv,
            "parsed_wsjf_time_criticality": wsjf_tc,
            "parsed_wsjf_risk_reduction": wsjf_rr,
            "parsed_wsjf_job_size": wsjf_js,
            "parsed_wsjf_score": float(wsjf_score) if wsjf_score is not None else None,
        }

        if len(sample_items) < 25:
            sample_items.append(item_payload)

        matches_ado_id = bool(ado_id) and item_ado_id == str(ado_id)
        matches_title = bool(normalized_title_filter) and normalized_title_filter in item_title.lower()
        if matches_ado_id or matches_title:
            matched_items.append(item_payload)

    return {
        "connection": {
            "id": c.id,
            "name": c.name,
            "product_id": c.product_id,
            "params": {
                "org_url": params.get("org_url"),
                "project": params.get("project"),
                "area_path": params.get("area_path"),
                "sync_types": _normalize_sync_types(params.get("sync_types", "User Story")),
                "sync_all_types": sync_all_types,
            },
        },
        "query": {
            "wiql": wiql_query,
            "requested_types": requested_types,
        },
        "ado": {
            "total_work_items_returned": len(ado_items),
            "fetch_diagnostics": fetch_diagnostics,
            "raw_work_item_types": dict(sorted(raw_type_counter.items())),
            "resolved_work_item_types": dict(sorted(resolved_type_counter.items())),
            "enabler_types": dict(sorted(enabler_type_counter.items())),
            "total_iterations_returned": len(ado_iterations),
            "iteration_names_sample": [it.get("name", "") for it in ado_iterations[:25]],
            "missing_optional_fields": missing_optional_fields,
            "sample_items": sample_items,
            "matched_items": matched_items,
        },
        "preview": {
            "summary": preview.get("summary", {}),
            "item_types_visible_in_preview": dict(sorted(
                Counter(
                    item.get("item_type", "")
                    for bucket in preview.get("items", {}).values()
                    for item in bucket
                    if item.get("item_type")
                ).items()
            )),
            "sprint_names_new": [s.get("name", "") for s in preview.get("sprints", {}).get("new", [])[:25]],
            "sprint_names_modified": [s.get("name", "") for s in preview.get("sprints", {}).get("modified", [])[:25]],
        },
    }

@router.get("/connections/{conn_id}/sync/diagnostics")
def sync_diagnostics(
    conn_id: str,
    ado_id: Optional[str] = Query(None),
    title_contains: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Diagnostic endpoint for ADO sync troubleshooting.
    Returns connection sync params, WIQL, ADO type distributions, preview counts and sprint counts.
    """
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider != "azure_devops":
        raise HTTPException(status_code=400, detail="Diagnostics only supported for azure_devops")

    try:
        return _build_sync_diagnostics_payload(c, db, ado_id=ado_id, title_contains=title_contains)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.get("/debug/ado-diagnostics")
def sync_diagnostics_debug(
    conn_id: str = Query(...),
    ado_id: Optional[str] = Query(None),
    title_contains: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    TEMP DEBUG ONLY:
    Unauthenticated diagnostics route restricted to the current Azure DevOps troubleshooting flow.
    Remove after finishing investigation.
    """
    allowed_conn_id = "c4b77b2f-4d15-4a7a-868b-46cd8d3e776d"
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if conn_id != allowed_conn_id or provider != "azure_devops":
        raise HTTPException(status_code=403, detail="Debug route not allowed for this connection")
    try:
        payload = _build_sync_diagnostics_payload(c, db, ado_id=ado_id, title_contains=title_contains)
        payload["debug_route"] = True
        payload["warning"] = "TEMP DEBUG ROUTE - REMOVE AFTER TROUBLESHOOTING"
        return payload
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/connections/{conn_id}/sync/preview")
def sync_preview(conn_id: str, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    """
    Compares ADO work items + iterations against Product Lab.
    Returns a full diff WITHOUT writing anything.
    """
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider != "azure_devops":
        raise HTTPException(status_code=400, detail="Preview only supported for azure_devops")
    try:
        return _build_preview(c, db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# ── Sync Apply ────────────────────────────────────────────────────────────────

@router.post("/connections/{conn_id}/sync/apply")
def sync_apply(conn_id: str, body: SyncApplyBody,
               background_tasks: BackgroundTasks,
               db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    """
    Applies only the items/sprints selected by the user after reviewing the preview.
    """
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider != "azure_devops":
        raise HTTPException(status_code=400, detail="Apply only supported for azure_devops")
    log_id = str(uuid.uuid4())
    log = IntegrationSyncLog(
        id=log_id, connection_id=c.id, operation_type="apply", status="running",
        started_at=datetime.utcnow(), triggered_by=current_user.user_id,
    )
    db.add(log); db.commit()
    background_tasks.add_task(_background_apply, log_id, conn_id,
                               body.item_ado_ids, body.sprint_ado_paths)
    return {"ok": True, "status": "running", "log_id": log_id,
            "message": "Apply started — check LOGS for progress"}

# ── Legacy full-sync ──────────────────────────────────────────────────────────

@router.post("/connections/{conn_id}/sync")
def sync_ado(conn_id: str, background_tasks: BackgroundTasks,
             db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Legacy full-sync — kept for backwards compatibility."""
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider != "azure_devops":
        raise HTTPException(status_code=400, detail="Sync only supported for azure_devops")
    log_id = str(uuid.uuid4())
    log = IntegrationSyncLog(
        id=log_id, connection_id=c.id, operation_type="full_sync", status="running",
        started_at=datetime.utcnow(), triggered_by=current_user.user_id,
    )
    db.add(log); db.commit()
    background_tasks.add_task(_background_sync, log_id, conn_id)
    return {"ok": True, "status": "running", "log_id": log_id,
            "message": "Sync started — check LOGS for progress"}

# ── Sync Logs ─────────────────────────────────────────────────────────────────

@router.get("/connections/{conn_id}/logs", response_model=List[SyncLogOut])
def list_sync_logs(conn_id: str, limit: int = Query(20, le=100),
                   db: Session = Depends(get_db)):
    _get_or_404(db, conn_id)
    return (db.query(IntegrationSyncLog)
            .filter(IntegrationSyncLog.connection_id == conn_id)
            .order_by(IntegrationSyncLog.started_at.desc())
            .limit(limit).all())

@router.post("/connections/{conn_id}/cleanup-ado-items")
def cleanup_ado_items(conn_id: str, body: CleanupAdoItemsBody,
                      db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    c = _get_or_404(db, conn_id)
    provider = c.provider.value if hasattr(c.provider, "value") else c.provider
    if provider != "azure_devops":
        raise HTTPException(status_code=400, detail="Cleanup only supported for azure_devops")

    from app.models.backlog import BacklogItem, BacklogItemLink, BacklogItemNote, BacklogItemType

    normalized_types = {t.strip().lower() for t in body.item_types if t and t.strip()}
    if not normalized_types:
        raise HTTPException(status_code=400, detail="item_types cannot be empty")

    matched_types = db.query(BacklogItemType).all()
    type_ids = [t.item_type_id for t in matched_types if t.name and t.name.strip().lower() in normalized_types]
    if not type_ids:
        return {"ok": True, "deleted_items": 0, "deleted_links": 0, "deleted_notes": 0, "cleared_ado_ids": 0}

    items = (
        db.query(BacklogItem)
        .filter(
            BacklogItem.product_id == body.product_id,
            BacklogItem.ado_id.isnot(None),
            BacklogItem.item_type_id.in_(type_ids),
        )
        .all()
    )

    if not items:
        return {"ok": True, "deleted_items": 0, "deleted_links": 0, "deleted_notes": 0, "cleared_ado_ids": 0}

    item_ids = [item.item_id for item in items]
    deleted_links = deleted_notes = cleared_ado_ids = deleted_items = 0

    if body.clear_ado_id_only:
        for item in items:
            item.ado_id = None
            cleared_ado_ids += 1
        db.commit()
        return {
            "ok": True,
            "deleted_items": 0,
            "deleted_links": 0,
            "deleted_notes": 0,
            "cleared_ado_ids": cleared_ado_ids,
        }

    if body.delete_links:
        deleted_links = (
            db.query(BacklogItemLink)
            .filter(
                (BacklogItemLink.source_id.in_(item_ids)) |
                (BacklogItemLink.target_id.in_(item_ids))
            )
            .delete(synchronize_session=False)
        )
        deleted_notes = (
            db.query(BacklogItemNote)
            .filter(BacklogItemNote.item_id.in_(item_ids))
            .delete(synchronize_session=False)
        )

    if body.delete_items:
        deleted_items = (
            db.query(BacklogItem)
            .filter(BacklogItem.item_id.in_(item_ids))
            .delete(synchronize_session=False)
        )
    else:
        for item in items:
            item.ado_id = None
            cleared_ado_ids += 1

    db.commit()
    return {
        "ok": True,
        "deleted_items": deleted_items,
        "deleted_links": deleted_links,
        "deleted_notes": deleted_notes,
        "cleared_ado_ids": cleared_ado_ids,
    }

# ── Preview logic ─────────────────────────────────────────────────────────────

def _build_preview(c: IntegrationConnection, db) -> dict:
    from app.models.backlog import BacklogItem, Sprint

    relation_label_map = {
        "parent_of": "parent/child",
        "child_of": "parent/child",
        "predecessor_of": "predecessor",
        "successor_of": "predecessor",
        "relates_to": "relates",
    }

    product_id = c.product_id
    ado_items, missing_optional_fields, fetch_diagnostics = _fetch_ado_work_items(c)
    ado_iterations = _fetch_ado_iterations(c)

    # ── Compare items ─────────────────────────────────────────────────────────
    existing_rows = (
        db.query(BacklogItem)
        .filter(BacklogItem.product_id == product_id)
        .all()
    )
    existing = [
        {
            "item_id": i.item_id,
            "ado_id": i.ado_id,
            "title": i.title,
            "current_status": i.current_status,
            "sprint_id": i.sprint_id,
            "story_points": i.story_points,
            "ado_work_item_type": getattr(i, "ado_work_item_type", None),
            "enabler_type": getattr(i, "enabler_type", None),
            "wsjf_business_value": getattr(i, "wsjf_business_value", None),
            "wsjf_time_criticality": getattr(i, "wsjf_time_criticality", None),
            "wsjf_risk_reduction": getattr(i, "wsjf_risk_reduction", None),
            "wsjf_job_size": getattr(i, "wsjf_job_size", None),
            "wsjf_score": getattr(i, "wsjf_score", None),
        }
        for i in existing_rows
    ]
    pl_map = {str(i["ado_id"]): i for i in existing if i["ado_id"]}
    ado_ids_set = {str(wi.get("id", "")) for wi in ado_items}

    items_new: List[dict] = []
    items_modified: List[dict] = []
    items_equal: List[dict] = []

    pl_sprints = db.query(Sprint).filter(Sprint.product_id == product_id).all() if product_id else []
    pl_sprint_map = {s.name.strip().lower(): s for s in pl_sprints}

    relation_diff = _get_ado_relation_diff(c, db, ado_items, product_id)
    desired_keys = relation_diff["desired_keys"]
    existing_keys = relation_diff["existing_keys"]
    item_id_to_ado_id = relation_diff["item_id_to_ado_id"]
    item_id_to_title = relation_diff["item_id_to_title"]

    relation_changes_by_ado_id: Dict[str, List[str]] = {}
    for source_id, target_id, link_type in sorted(desired_keys - existing_keys):
        source_ado_id = item_id_to_ado_id.get(source_id)
        target_title = item_id_to_title.get(target_id, str(target_id))
        if not source_ado_id:
            continue
        relation_changes_by_ado_id.setdefault(source_ado_id, []).append(
            f"+ {relation_label_map.get(link_type, link_type)} → {target_title}"
        )

    for source_id, target_id, link_type in sorted(existing_keys - desired_keys):
        source_ado_id = item_id_to_ado_id.get(source_id)
        target_title = item_id_to_title.get(target_id, str(target_id))
        if not source_ado_id:
            continue
        relation_changes_by_ado_id.setdefault(source_ado_id, []).append(
            f"- {relation_label_map.get(link_type, link_type)} → {target_title}"
        )

    for wi in ado_items:
        f = wi.get("fields", {})
        ado_id = str(wi.get("id", ""))
        title = f.get("System.Title", "")
        wi_type = _normalize_work_item_type_name(f.get("System.WorkItemType", "User Story"))
        ado_state = f.get("System.State", "New")
        iteration_path = f.get("System.IterationPath", "")
        sprint_name = iteration_path.split("\\")[-1].strip() if iteration_path else None
        sprint = pl_sprint_map.get(sprint_name.strip().lower()) if sprint_name else None
        sp_raw = f.get("Microsoft.VSTS.Scheduling.StoryPoints")
        story_pts = _safe_int(sp_raw)
        wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, wsjf_score = _extract_wsjf_fields(f, story_pts)
        mapped_status = _STATUS_MAP.get(ado_state, ado_state)
        enabler_type = _extract_enabler_type(f)
        base = {
            "ado_id": ado_id, "title": title, "item_type": wi_type,
            "ado_work_item_type": wi_type, "enabler_type": enabler_type,
            "ado_state": ado_state, "mapped_status": mapped_status, "story_points": story_pts,
            "iteration_path": iteration_path, "sprint_name": sprint_name,
            "sprint_id": sprint.sprint_id if sprint else None,
            "wsjf_business_value": wsjf_bv, "wsjf_time_criticality": wsjf_tc,
            "wsjf_risk_reduction": wsjf_rr, "wsjf_job_size": wsjf_js,
            "wsjf_score": float(wsjf_score) if wsjf_score is not None else None,
        }
        pl = pl_map.get(ado_id)
        if pl is None:
            items_new.append({**base, "action": "create"})
        else:
            diffs: Dict[str, Any] = {}
            if pl["title"] != title:
                diffs["title"] = {"pl": pl["title"], "ado": title}
            if pl["current_status"] != mapped_status:
                diffs["current_status"] = {"pl": pl["current_status"], "ado": mapped_status}
            if pl["sprint_id"] != (sprint.sprint_id if sprint else None):
                diffs["sprint_id"] = {"pl": pl["sprint_id"], "ado": sprint.sprint_id if sprint else None}
            if pl["story_points"] != story_pts:
                diffs["story_points"] = {"pl": pl["story_points"], "ado": story_pts}
            if (pl["ado_work_item_type"] or wi_type) != wi_type:
                diffs["ado_work_item_type"] = {"pl": pl["ado_work_item_type"], "ado": wi_type}
            if (pl["enabler_type"] or None) != (enabler_type or None):
                diffs["enabler_type"] = {"pl": pl["enabler_type"], "ado": enabler_type}
            if wsjf_bv is not None and pl["wsjf_business_value"] != wsjf_bv:
                diffs["wsjf_business_value"] = {"pl": pl["wsjf_business_value"], "ado": wsjf_bv}
            if wsjf_tc is not None and pl["wsjf_time_criticality"] != wsjf_tc:
                diffs["wsjf_time_criticality"] = {"pl": pl["wsjf_time_criticality"], "ado": wsjf_tc}
            if wsjf_rr is not None and pl["wsjf_risk_reduction"] != wsjf_rr:
                diffs["wsjf_risk_reduction"] = {"pl": pl["wsjf_risk_reduction"], "ado": wsjf_rr}
            if wsjf_js is not None and pl["wsjf_job_size"] != wsjf_js:
                diffs["wsjf_job_size"] = {"pl": pl["wsjf_job_size"], "ado": wsjf_js}
            if base["wsjf_score"] is not None and float(pl["wsjf_score"] or 0) != base["wsjf_score"]:
                diffs["wsjf_score"] = {"pl": float(pl["wsjf_score"] or 0), "ado": base["wsjf_score"]}
            relation_changes = relation_changes_by_ado_id.get(ado_id, [])
            if relation_changes:
                diffs["relations"] = {"pl": "outdated", "ado": " | ".join(relation_changes)}
            if diffs:
                items_modified.append({**base, "action": "update", "item_id": pl["item_id"], "diffs": diffs})
            else:
                items_equal.append({**base, "action": "none", "item_id": pl["item_id"]})

    items_orphan = [
        {"ado_id": i["ado_id"], "item_id": i["item_id"], "title": i["title"],
         "current_status": i["current_status"], "action": "orphan"}
        for i in existing if i["ado_id"] and str(i["ado_id"]) not in ado_ids_set
    ]

    # ── Compare sprints ───────────────────────────────────────────────────────

    sprints_new: List[dict] = []
    sprints_modified: List[dict] = []
    sprints_equal: List[dict] = []

    for it in ado_iterations:
        path = it.get("path", "")
        name = it.get("name", "")
        attributes = it.get("attributes") or {}
        start_date = attributes.get("startDate", "")[:10] if attributes.get("startDate") else None
        end_date = attributes.get("finishDate", "")[:10] if attributes.get("finishDate") else None
        mapped_status = _ITER_STATUS_MAP.get(attributes.get("timeFrame", "notStarted"), "planned")
        base = {"ado_path": path, "name": name, "start_date": start_date,
                "end_date": end_date, "mapped_status": mapped_status}
        pl = pl_sprint_map.get(name.strip().lower())
        if pl is None:
            sprints_new.append({**base, "action": "create"})
        else:
            diffs = {}
            pl_start = pl.start_date.isoformat() if pl.start_date else None
            pl_end = pl.end_date.isoformat() if pl.end_date else None
            if pl_start != start_date:
                diffs["start_date"] = {"pl": pl_start, "ado": start_date}
            if pl_end != end_date:
                diffs["end_date"] = {"pl": pl_end, "ado": end_date}
            if pl.status != mapped_status:
                diffs["status"] = {"pl": pl.status, "ado": mapped_status}
            if diffs:
                sprints_modified.append({**base, "action": "update", "sprint_id": pl.sprint_id, "diffs": diffs})
            else:
                sprints_equal.append({**base, "action": "none", "sprint_id": pl.sprint_id})

    return {
        "summary": {
            "items_new": len(items_new), "items_modified": len(items_modified),
            "items_equal": len(items_equal), "items_orphan": len(items_orphan),
            "sprints_new": len(sprints_new), "sprints_modified": len(sprints_modified),
            "sprints_equal": len(sprints_equal),
        },
        "items": {"new": items_new, "modified": items_modified,
                  "equal": items_equal, "orphan": items_orphan},
        "sprints": {"new": sprints_new, "modified": sprints_modified, "equal": sprints_equal},
        "meta": {
            "missing_optional_fields": missing_optional_fields,
            "fetch_diagnostics": fetch_diagnostics,
        },
    }

# ── Background apply ──────────────────────────────────────────────────────────

def _background_apply(log_id: str, conn_id: str,
                      item_ado_ids: List[str], sprint_ado_paths: List[str]) -> None:
    socket.setdefaulttimeout(_SOCKET_TIMEOUT)
    from app.core.database import SessionLocal
    from app.models.backlog import BacklogItem, BacklogItemType, Sprint
    db = SessionLocal()
    try:
        log = db.query(IntegrationSyncLog).filter(IntegrationSyncLog.id == log_id).first()
        c   = db.query(IntegrationConnection).filter(IntegrationConnection.id == conn_id).first()
        if not log or not c:
            return

        params = c.params or {}
        org_url = params.get("org_url", "").rstrip("/")
        project = params.get("project", "")
        product_id = c.product_id
        sync_types = _merge_sync_type_aliases(_normalize_sync_types(params.get("sync_types", "User Story")))
        headers = _ado_headers(c)

        created = updated = sprints_created = sprints_updated = 0
        synced_ado_items: List[dict] = []
        missing_optional_fields: List[str] = []

        # ── Apply selected sprints ────────────────────────────────────────────
        if sprint_ado_paths and product_id:
            all_iters = _fetch_ado_iterations(c)
            iter_map = {it.get("path", ""): it for it in all_iters}
            pl_sprint_map = {s.name.strip().lower(): s
                             for s in db.query(Sprint).filter(Sprint.product_id == product_id).all()}
            for path in sprint_ado_paths:
                it = iter_map.get(path)
                if not it:
                    continue
                name = it.get("name", "")
                attributes = it.get("attributes") or {}
                start_str = attributes.get("startDate", "")[:10] if attributes.get("startDate") else None
                end_str = attributes.get("finishDate", "")[:10] if attributes.get("finishDate") else None
                start_d = date.fromisoformat(start_str) if start_str else None
                end_d = date.fromisoformat(end_str) if end_str else None
                mapped_status = _ITER_STATUS_MAP.get(attributes.get("timeFrame", "notStarted"), "planned")
                pl = pl_sprint_map.get(name.strip().lower())
                if pl:
                    pl.start_date = start_d; pl.end_date = end_d; pl.status = mapped_status
                    sprints_updated += 1
                else:
                    db.add(Sprint(
                        product_id=product_id, name=name,
                        start_date=start_d, end_date=end_d, status=mapped_status,
                    ))
                    sprints_created += 1
            db.flush()

        # ── Apply selected work items ─────────────────────────────────────────
        if item_ado_ids:
            base_fields = [
                "System.Id",
                "System.Title",
                "System.WorkItemType",
                "System.State",
                "System.Description",
                "System.IterationPath",
                "Microsoft.VSTS.Scheduling.StoryPoints",
                "Microsoft.VSTS.Common.AcceptanceCriteria",
                "Microsoft.VSTS.Common.BusinessValue",
                "System.AssignedTo",
            ]
            optional_fields = [
                *_WSJF_FIELD_CANDIDATES["business_value"],
                *_WSJF_FIELD_CANDIDATES["time_criticality"],
                *_WSJF_FIELD_CANDIDATES["risk_reduction"],
                *_WSJF_FIELD_CANDIDATES["job_size"],
                *_WSJF_FIELD_CANDIDATES["score"],
                *_ENABLER_TYPE_CANDIDATES,
            ]
            field_list = list(dict.fromkeys([*base_fields, *optional_fields]))
            type_map: Dict[str, int] = _build_backlog_item_type_id_map(db)
            for wi_type in sync_types:
                canonical_type = _canonical_backlog_item_type_name(wi_type)
                if not canonical_type:
                    continue
                if canonical_type not in type_map:
                    bt = db.query(BacklogItemType).filter(BacklogItemType.name == canonical_type).first()
                    if not bt:
                        bt = BacklogItemType(name=canonical_type, display_order=0, is_active=True)
                        db.add(bt); db.flush()
                    type_map[canonical_type] = bt.item_type_id

            pl_sprint_map = {
                s.name.strip().lower(): s
                for s in db.query(Sprint).filter(Sprint.product_id == product_id).all()
            } if product_id else {}

            for i in range(0, len(item_ado_ids), 200):
                batch = item_ado_ids[i:i + 200]
                while True:
                    fields = ",".join(field_list)
                    dr = _ado_get(
                        f"{org_url}/{project}/_apis/wit/workitems?ids={','.join(batch)}"
                        f"&fields={fields}&api-version=6.0",
                        headers=headers,
                    )
                    if dr.status_code == 200:
                        break

                    error_text = dr.text[:1500]
                    missing_optional = _extract_missing_ado_field(
                        error_text,
                        [f for f in optional_fields if f in field_list],
                    )
                    if missing_optional:
                        logger.warning("ADO field not found during apply, skipping optional field: %s", missing_optional)
                        field_list.remove(missing_optional)
                        if missing_optional not in missing_optional_fields:
                            missing_optional_fields.append(missing_optional)
                        continue

                    raise Exception(f"ADO detail error {dr.status_code}: {error_text}")

                batch_items = dr.json().get("value", [])
                batch_returned_ids = {str(item.get("id", "")) for item in batch_items if item.get("id") is not None}
                missing_batch_ids = [ado_work_item_id for ado_work_item_id in batch if ado_work_item_id not in batch_returned_ids]
                if missing_batch_ids:
                    logger.warning("ADO apply detail request returned fewer items than requested. missing_ids=%s", missing_batch_ids)
                synced_ado_items.extend(batch_items)
                for wi in batch_items:
                    f_wi = wi.get("fields", {})
                    ado_id = str(wi.get("id", ""))
                    title = f_wi.get("System.Title", "")
                    wi_type = _normalize_work_item_type_name(f_wi.get("System.WorkItemType", "User Story"))
                    ado_state = f_wi.get("System.State", "New")
                    iteration_path = f_wi.get("System.IterationPath", "")
                    sprint_name = iteration_path.split("\\")[-1].strip() if iteration_path else None
                    sprint = pl_sprint_map.get(sprint_name.strip().lower()) if sprint_name else None
                    sp_raw = f_wi.get("Microsoft.VSTS.Scheduling.StoryPoints")
                    story_pts = _safe_int(sp_raw)
                    description = _strip_html(f_wi.get("System.Description"))
                    acceptance = _strip_html(f_wi.get("Microsoft.VSTS.Common.AcceptanceCriteria"))
                    biz_value = f_wi.get("Microsoft.VSTS.Common.BusinessValue") or ""
                    wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, wsjf_score = _extract_wsjf_fields(f_wi, story_pts)
                    mapped_status = _STATUS_MAP.get(ado_state, "open")
                    enabler_type = _extract_enabler_type(f_wi)
                    assigned_to_member_id = _resolve_assigned_member_id(db, product_id, f_wi.get("System.AssignedTo"))
                    item_type_id = _resolve_backlog_item_type_id(db, type_map, wi_type, enabler_type)
                    existing = (db.query(BacklogItem)
                                .filter(BacklogItem.ado_id == ado_id,
                                        BacklogItem.product_id == product_id).first())
                    if existing:
                        existing.title = title
                        existing.current_status = mapped_status
                        _apply_ado_sprint_state(existing, sprint)
                        existing.assigned_to_member_id = assigned_to_member_id
                        existing.story_points = story_pts
                        existing.ado_work_item_type = wi_type
                        existing.enabler_type = enabler_type
                        existing.description = description
                        existing.acceptance_criteria = acceptance
                        existing.business_value = str(biz_value) if biz_value not in (None, "") else None
                        existing.item_type_id = item_type_id
                        existing.wsjf_business_value = wsjf_bv if wsjf_bv is not None else 0
                        existing.wsjf_time_criticality = wsjf_tc if wsjf_tc is not None else 0
                        existing.wsjf_risk_reduction = wsjf_rr if wsjf_rr is not None else 0
                        existing.wsjf_job_size = wsjf_js if wsjf_js is not None else 0
                        existing.wsjf_score = wsjf_score if wsjf_score is not None else Decimal("0.0")
                        updated += 1
                    else:
                        db.add(BacklogItem(
                            product_id=product_id, ado_id=ado_id, title=title,
                            ado_work_item_type=wi_type, enabler_type=enabler_type,
                            description=description, current_status=mapped_status,
                            sprint_id=sprint.sprint_id if sprint else None,
                            start_sprint_id=sprint.sprint_id if sprint else None,
                            end_sprint_id=sprint.sprint_id if sprint else None,
                            assigned_to_member_id=assigned_to_member_id,
                            story_points=story_pts, acceptance_criteria=acceptance,
                            business_value=str(biz_value) if biz_value not in (None, "") else None,
                            item_type_id=item_type_id, priority=3,
                            wsjf_business_value=wsjf_bv if wsjf_bv is not None else 0,
                            wsjf_time_criticality=wsjf_tc if wsjf_tc is not None else 0,
                            wsjf_risk_reduction=wsjf_rr if wsjf_rr is not None else 0,
                            wsjf_job_size=wsjf_js if wsjf_js is not None else 0,
                            wsjf_score=wsjf_score if wsjf_score is not None else Decimal("0.0"),
                        ))
                        created += 1
            db.flush()

        links_sync = _sync_ado_relations(c, db, synced_ado_items, product_id) if item_ado_ids else {
            "created": 0,
            "deleted": 0,
            "total": 0,
        }

        log.status        = "completed"
        log.finished_at   = datetime.utcnow()
        log.items_created = created
        log.items_updated = updated + sprints_updated
        log.items_skipped = 0
        log.details       = {
            "sprints_created": sprints_created,
            "sprints_updated": sprints_updated,
            "links_created": links_sync["created"],
            "links_deleted": links_sync["deleted"],
            "links_total": links_sync["total"],
            "missing_optional_fields": missing_optional_fields if item_ado_ids else [],
        }
        c.last_sync_at    = datetime.utcnow()
        c.last_error      = None
        db.commit()
    except Exception as e:
        try:
            log = db.query(IntegrationSyncLog).filter(IntegrationSyncLog.id == log_id).first()
            c   = db.query(IntegrationConnection).filter(IntegrationConnection.id == conn_id).first()
            if log:
                log.status = "failed"; log.finished_at = datetime.utcnow(); log.error_message = str(e)
            if c:
                c.last_error = str(e)
            db.commit()
        except Exception:
            pass
        logger.exception(f"Background apply failed for connection {conn_id}: {e}")
    finally:
        db.close()

# ── Background legacy full-sync ───────────────────────────────────────────────

def _background_sync(log_id: str, conn_id: str) -> None:
    """Background task: runs the full ADO sync with its own DB session."""
    socket.setdefaulttimeout(_SOCKET_TIMEOUT)
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        log = db.query(IntegrationSyncLog).filter(IntegrationSyncLog.id == log_id).first()
        c   = db.query(IntegrationConnection).filter(IntegrationConnection.id == conn_id).first()
        if not log or not c:
            return
        result = _run_ado_sync(c, db)
        log.status        = "completed"
        log.finished_at   = datetime.utcnow()
        log.items_created = result["created"]
        log.items_updated = result["updated"]
        log.items_skipped = result["skipped"]
        log.details       = result.get("details")
        c.last_sync_at    = datetime.utcnow()
        c.last_error      = None
        db.commit()
    except Exception as e:
        try:
            log = db.query(IntegrationSyncLog).filter(IntegrationSyncLog.id == log_id).first()
            c   = db.query(IntegrationConnection).filter(IntegrationConnection.id == conn_id).first()
            if log:
                log.status = "failed"; log.finished_at = datetime.utcnow(); log.error_message = str(e)
            if c:
                c.last_error = str(e)
            db.commit()
        except Exception:
            pass
        logger.exception(f"Background ADO sync failed for connection {conn_id}: {e}")
    finally:
        db.close()

def _run_ado_sync(c: IntegrationConnection, db: Session) -> dict:
    from app.models.backlog import BacklogItem, BacklogItemType, Sprint
    ado_items, missing_optional_fields, fetch_diagnostics = _fetch_ado_work_items(c)
    ado_iterations = _fetch_ado_iterations(c)
    product_id = c.product_id
    sync_types = _merge_sync_type_aliases(_normalize_sync_types((c.params or {}).get("sync_types", "User Story")))

    type_map: Dict[str, int] = _build_backlog_item_type_id_map(db)

    def ensure_item_type(name: str) -> Optional[int]:
        canonical_name = _canonical_backlog_item_type_name(name)
        if not canonical_name:
            return None
        if canonical_name in type_map:
            return type_map[canonical_name]
        bt = db.query(BacklogItemType).filter(BacklogItemType.name == canonical_name).first()
        if not bt:
            bt = BacklogItemType(name=canonical_name, display_order=0, is_active=True)
            db.add(bt)
            db.flush()
        type_map[canonical_name] = bt.item_type_id
        return bt.item_type_id

    for wi_type in sync_types:
        ensure_item_type(wi_type)

    sprints_created = sprints_updated = 0
    pl_sprint_map = {
        s.name.strip().lower(): s
        for s in db.query(Sprint).filter(Sprint.product_id == product_id).all()
    } if product_id else {}

    for it in ado_iterations:
        name = it.get("name", "")
        attributes = it.get("attributes") or {}
        start_str = attributes.get("startDate", "")[:10] if attributes.get("startDate") else None
        end_str = attributes.get("finishDate", "")[:10] if attributes.get("finishDate") else None
        start_d = date.fromisoformat(start_str) if start_str else None
        end_d = date.fromisoformat(end_str) if end_str else None
        mapped_status = _ITER_STATUS_MAP.get(attributes.get("timeFrame", "notStarted"), "planned")
        pl = pl_sprint_map.get(name.strip().lower())
        if pl:
            pl.start_date = start_d
            pl.end_date = end_d
            pl.status = mapped_status
            sprints_updated += 1
        else:
            db.add(Sprint(
                product_id=product_id,
                name=name,
                start_date=start_d,
                end_date=end_d,
                status=mapped_status,
            ))
            sprints_created += 1
    db.flush()

    pl_sprint_map = {
        s.name.strip().lower(): s
        for s in db.query(Sprint).filter(Sprint.product_id == product_id).all()
    } if product_id else {}

    created = updated = skipped = 0
    for wi in ado_items:
        f = wi.get("fields", {})
        ado_id = str(wi.get("id", ""))
        title = f.get("System.Title", "")
        wi_type = _normalize_work_item_type_name(f.get("System.WorkItemType", "User Story"))
        ado_state = f.get("System.State", "New")
        iteration_path = f.get("System.IterationPath", "")
        sprint_name = iteration_path.split("\\")[-1].strip() if iteration_path else None
        sprint = pl_sprint_map.get(sprint_name.strip().lower()) if sprint_name else None
        story_pts = _safe_int(f.get("Microsoft.VSTS.Scheduling.StoryPoints"))
        description = _strip_html(f.get("System.Description"))
        acceptance = _strip_html(f.get("Microsoft.VSTS.Common.AcceptanceCriteria"))
        biz_value = f.get("Microsoft.VSTS.Common.BusinessValue")
        wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, wsjf_score = _extract_wsjf_fields(f, story_pts)
        mapped_status = _STATUS_MAP.get(ado_state, "open")
        enabler_type = _extract_enabler_type(f)
        assigned_to_member_id = _resolve_assigned_member_id(db, product_id, f.get("System.AssignedTo"))
        item_type_id = _resolve_backlog_item_type_id(db, type_map, wi_type, enabler_type)
        existing = (
            db.query(BacklogItem)
            .filter(BacklogItem.ado_id == ado_id, BacklogItem.product_id == product_id)
            .first()
        )
        if existing:
            existing.title = title
            existing.current_status = mapped_status
            _apply_ado_sprint_state(existing, sprint)
            existing.assigned_to_member_id = assigned_to_member_id
            existing.story_points = story_pts
            existing.ado_work_item_type = wi_type
            existing.enabler_type = enabler_type
            existing.description = description
            existing.acceptance_criteria = acceptance
            existing.business_value = str(biz_value) if biz_value not in (None, "") else None
            existing.item_type_id = item_type_id
            existing.wsjf_business_value = wsjf_bv if wsjf_bv is not None else 0
            existing.wsjf_time_criticality = wsjf_tc if wsjf_tc is not None else 0
            existing.wsjf_risk_reduction = wsjf_rr if wsjf_rr is not None else 0
            existing.wsjf_job_size = wsjf_js if wsjf_js is not None else 0
            existing.wsjf_score = wsjf_score if wsjf_score is not None else Decimal("0.0")
            updated += 1
        else:
            db.add(BacklogItem(
                product_id=product_id,
                ado_id=ado_id,
                ado_work_item_type=wi_type,
                enabler_type=enabler_type,
                title=title,
                description=description,
                current_status=mapped_status,
                sprint_id=sprint.sprint_id if sprint else None,
                start_sprint_id=sprint.sprint_id if sprint else None,
                end_sprint_id=sprint.sprint_id if sprint else None,
                assigned_to_member_id=assigned_to_member_id,
                story_points=story_pts,
                acceptance_criteria=acceptance,
                business_value=str(biz_value) if biz_value not in (None, "") else None,
                item_type_id=item_type_id,
                priority=3,
                wsjf_business_value=wsjf_bv if wsjf_bv is not None else 0,
                wsjf_time_criticality=wsjf_tc if wsjf_tc is not None else 0,
                wsjf_risk_reduction=wsjf_rr if wsjf_rr is not None else 0,
                wsjf_job_size=wsjf_js if wsjf_js is not None else 0,
                wsjf_score=wsjf_score if wsjf_score is not None else Decimal("0.0"),
            ))
            created += 1
    links_sync = _sync_ado_relations(c, db, ado_items, product_id)
    db.commit()
    return {
        "created": created,
        "updated": updated + sprints_updated,
        "skipped": skipped,
        "details": {
            "total_in_ado": len(ado_items),
            "sprints_created": sprints_created,
            "sprints_updated": sprints_updated,
            "links_created": links_sync["created"],
            "links_deleted": links_sync["deleted"],
            "links_total": links_sync["total"],
            "missing_optional_fields": missing_optional_fields,
            "fetch_diagnostics": fetch_diagnostics,
        },
    }
