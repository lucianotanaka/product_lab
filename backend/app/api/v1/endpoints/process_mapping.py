from typing import Optional, List, Any, Dict, Tuple
from datetime import datetime
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.process_mapping import (
    Process, ProcessNode, ProcessEdge, ProcessNodeRelation,
    BusinessArea, ProcessGroup, ProcessTool,
)
from app.models.integration import IntegrationConnection
from app.schemas.common import Paginated

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

PROCESS_SCOPES    = ["PRODUCT", "GLOBAL"]
PROCESS_TYPES     = ["AS_IS", "TO_BE"]
PROCESS_STATUSES  = ["DRAFT", "VALIDATED", "APPROVED", "ARCHIVED"]
NODE_TYPES        = ["START", "ACTIVITY", "DECISION", "END", "SUBPROCESS", "SYSTEM", "WAIT", "HANDOFF"]
EDGE_TYPES        = ["SEQUENCE", "CONDITIONAL", "DEFAULT", "EXCEPTION"]
HANDLE_TYPES      = ["top", "right", "bottom", "left"]
NODE_ENTITY_TYPES = ["REQUIREMENT", "FEATURE", "USER_STORY", "RISK", "INSIGHT", "VPC_PAIN", "VPC_GAIN", "RESEARCH"]
GROUP_TYPES       = ["PHASE", "SUB_FLOW", "CONTAINER"]
AI_PROCESS_NODE_TYPES = ["START", "ACTIVITY", "DECISION", "END", "SUBPROCESS", "SYSTEM", "WAIT", "HANDOFF"]


# ── Schema — Business Area (usado no endpoint /graph) ─────────────────────────

class BusinessAreaOut(BaseModel):
    id: int
    product_id: Optional[int]
    area_name: str
    area_description: Optional[str]
    area_color: Optional[str]
    area_type: str = "OPERATIONAL"
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Schemas — Process ──────────────────────────────────────────────────────────

class ProcessCreate(BaseModel):
    process_scope: str = "PRODUCT"
    product_id: Optional[int] = None
    business_area_id: Optional[int] = None
    process_name: str
    process_description: Optional[str] = None
    process_version: str = "1.0"
    process_type: str = "AS_IS"
    process_status: str = "DRAFT"
    process_owner: Optional[str] = None
    process_trigger: Optional[str] = None
    process_outcome: Optional[str] = None
    is_macro: bool = False


class ProcessUpdate(BaseModel):
    process_scope: Optional[str] = None
    product_id: Optional[int] = None
    process_name: Optional[str] = None
    process_description: Optional[str] = None
    process_version: Optional[str] = None
    process_type: Optional[str] = None
    process_status: Optional[str] = None
    process_owner: Optional[str] = None
    process_trigger: Optional[str] = None
    process_outcome: Optional[str] = None
    business_area_id: Optional[int] = None
    is_macro: Optional[bool] = None


class ProcessOut(BaseModel):
    id: int
    process_scope: str
    product_id: Optional[int]
    business_area_id: Optional[int]
    process_name: str
    process_description: Optional[str]
    process_version: str
    process_type: str
    process_status: str
    process_owner: Optional[str]
    process_trigger: Optional[str]
    process_outcome: Optional[str]
    is_macro: bool
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Schemas — Process Group ────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    group_name: str
    group_type: str = "PHASE"
    parent_group_id: Optional[int] = None
    display_order: int = 0


class GroupUpdate(BaseModel):
    group_name: Optional[str] = None
    group_type: Optional[str] = None
    parent_group_id: Optional[int] = None
    display_order: Optional[int] = None


class GroupOut(BaseModel):
    id: int
    process_id: int
    group_name: str
    group_type: str
    parent_group_id: Optional[int]
    display_order: int
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Schemas — Node ─────────────────────────────────────────────────────────────

class NodeCreate(BaseModel):
    node_type: str
    node_title: str
    node_description: Optional[str] = None
    node_subtitle: Optional[str] = None
    node_icon: Optional[str] = None
    role_name: Optional[str] = None
    business_area_id: Optional[int] = None
    group_id: Optional[int] = None
    child_process_id: Optional[int] = None
    system_name: Optional[str] = None
    duration_minutes: Optional[float] = None
    is_manual: bool = False
    is_bottleneck: bool = False
    x_position: float = 0
    y_position: float = 0
    width: Optional[float] = None
    height: Optional[float] = None
    display_order: Optional[int] = None


class NodeUpdate(BaseModel):
    node_title: Optional[str] = None
    node_description: Optional[str] = None
    node_subtitle: Optional[str] = None
    node_icon: Optional[str] = None
    node_type: Optional[str] = None
    role_name: Optional[str] = None
    business_area_id: Optional[int] = None
    group_id: Optional[int] = None
    child_process_id: Optional[int] = None
    system_name: Optional[str] = None
    duration_minutes: Optional[float] = None
    is_manual: Optional[bool] = None
    is_bottleneck: Optional[bool] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    display_order: Optional[int] = None


class NodeOut(BaseModel):
    id: int
    process_id: int
    node_type: str
    node_title: str
    node_description: Optional[str]
    node_subtitle: Optional[str]
    node_icon: Optional[str]
    role_name: Optional[str]
    business_area_id: Optional[int]
    group_id: Optional[int]
    child_process_id: Optional[int]
    system_name: Optional[str]
    duration_minutes: Optional[float]
    is_manual: bool
    is_bottleneck: bool
    x_position: float
    y_position: float
    width: Optional[float]
    height: Optional[float]
    display_order: Optional[int]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Schemas — Edge ─────────────────────────────────────────────────────────────

class EdgeCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    edge_label: Optional[str] = None
    edge_type: str = "SEQUENCE"
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    condition_expression: Optional[str] = None
    sequence_order: Optional[int] = None


class EdgeUpdate(BaseModel):
    edge_label: Optional[str] = None
    edge_type: Optional[str] = None
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    condition_expression: Optional[str] = None
    sequence_order: Optional[int] = None


class EdgeOut(BaseModel):
    id: int
    process_id: int
    source_node_id: int
    target_node_id: int
    edge_label: Optional[str]
    edge_type: str
    source_handle: Optional[str]
    target_handle: Optional[str]
    condition_expression: Optional[str]
    sequence_order: Optional[int]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Schemas — Tool ─────────────────────────────────────────────────────────────

class ToolCreate(BaseModel):
    tool_name: str
    tool_description: Optional[str] = None
    tool_icon: Optional[str] = None
    display_order: int = 0


class ToolUpdate(BaseModel):
    tool_name: Optional[str] = None
    tool_description: Optional[str] = None
    tool_icon: Optional[str] = None
    display_order: Optional[int] = None


class ToolOut(BaseModel):
    id: int
    process_id: int
    tool_name: str
    tool_description: Optional[str]
    tool_icon: Optional[str]
    display_order: int
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Schemas — Node Relation ────────────────────────────────────────────────────

class NodeRelationCreate(BaseModel):
    entity_type: str
    entity_id: int
    relation_type: Optional[str] = None
    notes: Optional[str] = None


class NodeRelationOut(BaseModel):
    id: int; node_id: int; entity_type: str; entity_id: int
    relation_type: Optional[str]; notes: Optional[str]; created_at: datetime
    class Config: from_attributes = True


class AIProcessGenerateBody(BaseModel):
    message: str
    product_id: Optional[int] = None
    company_id: Optional[int] = None
    product_name: Optional[str] = None
    connection_id: Optional[str] = None
    process_scope: str = "PRODUCT"
    process_name: Optional[str] = None
    process_type: str = "TO_BE"
    process_status: str = "DRAFT"
    create_in_db: bool = True


class AIProcessGenerateOut(BaseModel):
    created: bool
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    sql_preview: str
    summary: str
    draft: Dict[str, Any]
    warnings: List[str] = []
    connection: Optional[Dict[str, Any]] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_process(id: int, db: Session) -> Process:
    obj = db.get(Process, id)
    if not obj or obj.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Process not found")
    return obj


def _get_node(process_id: int, node_id: int, db: Session) -> ProcessNode:
    obj = db.get(ProcessNode, node_id)
    if not obj or obj.process_id != process_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Node not found")
    return obj


def _get_edge(process_id: int, edge_id: int, db: Session) -> ProcessEdge:
    obj = db.get(ProcessEdge, edge_id)
    if not obj or obj.process_id != process_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Edge not found")
    return obj


def _validate_handle(handle: Optional[str]) -> Optional[str]:
    if handle is None or handle == "":
        return None
    if handle not in HANDLE_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"handle must be one of {HANDLE_TYPES}")
    return handle


def _get_group(process_id: int, group_id: int, db: Session) -> ProcessGroup:
    obj = db.get(ProcessGroup, group_id)
    if not obj or obj.process_id != process_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    return obj


def _get_tool(process_id: int, tool_id: int, db: Session) -> ProcessTool:
    obj = db.get(ProcessTool, tool_id)
    if not obj or obj.process_id != process_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tool not found")
    return obj


def _validate_process_scope(process_scope: str, product_id: Optional[int]) -> tuple[str, Optional[int]]:
    scope = (process_scope or "PRODUCT").upper()
    if scope not in PROCESS_SCOPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"process_scope must be one of {PROCESS_SCOPES}")
    if scope == "GLOBAL":
        return scope, None
    if product_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "product_id is required when process_scope is PRODUCT")
    return scope, product_id


def _normalize_connection_scope(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _is_ai_provider(provider: str) -> bool:
    return provider in ("openai", "azure_openai", "axet_flows")


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
    all_active = db.query(IntegrationConnection).filter(IntegrationConnection.is_active == True).all()
    eligible: List[Tuple[int, IntegrationConnection]] = []
    for conn in all_active:
        provider = conn.provider.value if hasattr(conn.provider, "value") else conn.provider
        if not _is_ai_provider(provider):
            continue
        rank = _resolve_scope_rank(conn, product_id, company_id)
        if rank > 0:
            eligible.append((rank, conn))
    eligible.sort(key=lambda item: (-item[0], item[1].created_at or datetime.min))
    return [conn for _, conn in eligible]


def _build_process_ai_prompt(body: AIProcessGenerateBody) -> str:
    requested_name = body.process_name or "Processo gerado por IA"
    return f"""Você é um especialista em modelagem de processos do Product Lab.

Transforme a solicitação do usuário em um fluxograma estruturado para o módulo Process Mapping.

Regras:
1. Responda APENAS JSON válido.
2. Idioma: português.
3. Crie um processo claro, prático e orientado a fluxo.
4. Use apenas node_type válidos: {AI_PROCESS_NODE_TYPES}
5. Use edge_type válidos: {EDGE_TYPES}
6. Sempre inclua pelo menos um START e um END.
7. Em decisões, use labels como SIM/NÃO quando fizer sentido.
8. Se o usuário não fornecer swimlanes, infira áreas de negócio simples.
9. Gere layout legível, preferencialmente da esquerda para a direita.
10. Retorne também um summary e warnings.

Formato obrigatório:
{{
  "process": {{
    "process_name": "{requested_name}",
    "process_description": "string",
    "process_scope": "{body.process_scope}",
    "process_type": "{body.process_type}",
    "process_status": "{body.process_status}",
    "process_owner": "string|null",
    "process_trigger": "string|null",
    "process_outcome": "string|null",
    "is_macro": false
  }},
  "business_areas": [
    {{ "area_name": "string", "area_description": "string|null", "area_color": "#hex|null", "display_order": 0 }}
  ],
  "nodes": [
    {{
      "temp_id": "N1",
      "node_type": "START",
      "node_title": "string",
      "node_description": "string|null",
      "node_subtitle": "string|null",
      "node_icon": "string|null",
      "role_name": "string|null",
      "system_name": "string|null",
      "duration_minutes": null,
      "is_manual": false,
      "is_bottleneck": false,
      "business_area_name": "string|null",
      "x_position": 0,
      "y_position": 120,
      "width": 170,
      "height": 86
    }}
  ],
  "edges": [
    {{
      "source_temp_id": "N1",
      "target_temp_id": "N2",
      "edge_label": "string|null",
      "edge_type": "SEQUENCE"
    }}
  ],
  "tools": [
    {{ "tool_name": "string", "tool_description": "string|null", "tool_icon": "string|null", "display_order": 0 }}
  ],
  "summary": "string",
  "warnings": ["string"]
}}

Solicitação do usuário:
{body.message}
"""


def _invoke_process_ai(connection: IntegrationConnection, prompt: str) -> Dict[str, Any]:
    provider = connection.provider.value if hasattr(connection.provider, "value") else connection.provider
    params = connection.params or {}
    secrets = connection.secrets or {}

    if provider == "axet_flows":
        question_field = str(params.get("request_question_field", "pergunta")).strip() or "pergunta"
        context_field = str(params.get("request_context_field", "contexto")).strip() or "contexto"
        response_answer_field = str(params.get("response_answer_field", "resposta")).strip() or "resposta"
        payload = {question_field: prompt, context_field: {"module": "process_mapping", "mode": "structured_json"}}
        r = httpx.post(str(params.get("resolved_url") or ""), json=payload, timeout=300, verify=False)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"aXet Flows error {r.status_code}: {r.text[:400]}")
        content = str(r.json().get(response_answer_field) or "").strip()
    else:
        model = params.get("model", "gpt-4o-mini") or "gpt-4o-mini"
        messages = [
            {"role": "system", "content": "Responda apenas JSON válido, sem markdown."},
            {"role": "user", "content": prompt},
        ]
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        if provider == "openai":
            headers = {"Authorization": f"Bearer {secrets.get('api_key', '')}", "Content-Type": "application/json"}
            org_id = params.get("org_id", "")
            if org_id:
                headers["OpenAI-Organization"] = org_id
            r = httpx.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=180, verify=False)
        else:
            endpoint = params.get("endpoint", "").rstrip("/")
            deployment = params.get("deployment_name", model)
            api_version = params.get("api_version", "2024-08-01-preview")
            r = httpx.post(
                f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}",
                headers={"api-key": secrets.get("api_key", ""), "Content-Type": "application/json"},
                json={k: v for k, v in payload.items() if k != "model"},
                timeout=180,
                verify=False,
            )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"LLM API error {r.status_code}: {r.text[:400]}")
        content = str(r.json()["choices"][0]["message"]["content"] or "").strip()

    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.rsplit("```", 1)[0].strip()

    try:
        return json.loads(content)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {exc}")


def _sql_quote(value: Any) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def _build_sql_preview(draft: Dict[str, Any], product_id: Optional[int]) -> str:
    process = draft.get("process", {})
    lines = [
        "-- Process Mapping SQL preview generated by AI",
        "INSERT INTO processes (process_scope, product_id, process_name, process_description, process_version, process_type, process_status, process_owner, process_trigger, process_outcome, is_macro)",
        "VALUES ("
        f"{_sql_quote(process.get('process_scope', 'PRODUCT'))}, "
        f"{product_id if product_id is not None else 'NULL'}, "
        f"{_sql_quote(process.get('process_name'))}, "
        f"{_sql_quote(process.get('process_description'))}, "
        f"{_sql_quote('1.0')}, "
        f"{_sql_quote(process.get('process_type', 'TO_BE'))}, "
        f"{_sql_quote(process.get('process_status', 'DRAFT'))}, "
        f"{_sql_quote(process.get('process_owner'))}, "
        f"{_sql_quote(process.get('process_trigger'))}, "
        f"{_sql_quote(process.get('process_outcome'))}, "
        f"{'TRUE' if process.get('is_macro') else 'FALSE'}"
        ");",
        "-- Nós e conexões serão persistidos pela API após validação do JSON estruturado.",
    ]
    return "\n".join(lines)


def _persist_ai_process(db: Session, draft: Dict[str, Any], product_id: Optional[int]) -> Process:
    process_payload = draft.get("process", {})
    scope, normalized_product_id = _validate_process_scope(process_payload.get("process_scope", "PRODUCT"), product_id)
    proc = Process(
        process_scope=scope,
        product_id=normalized_product_id,
        business_area_id=None,
        process_name=process_payload.get("process_name") or "Novo Processo",
        process_description=process_payload.get("process_description"),
        process_version="1.0",
        process_type=process_payload.get("process_type") or "TO_BE",
        process_status=process_payload.get("process_status") or "DRAFT",
        process_owner=process_payload.get("process_owner"),
        process_trigger=process_payload.get("process_trigger"),
        process_outcome=process_payload.get("process_outcome"),
        is_macro=bool(process_payload.get("is_macro", False)),
    )
    db.add(proc)
    db.flush()

    area_map: Dict[str, int] = {}
    for idx, area in enumerate(draft.get("business_areas", []) or []):
        area_name = str(area.get("area_name") or "").strip()
        if not area_name:
            continue
        obj = BusinessArea(
            product_id=normalized_product_id,
            area_name=area_name,
            area_description=area.get("area_description"),
            area_color=area.get("area_color"),
            display_order=int(area.get("display_order", idx)),
            is_active=True,
        )
        db.add(obj)
        db.flush()
        area_map[area_name.lower()] = obj.id

    node_map: Dict[str, int] = {}
    for idx, node in enumerate(draft.get("nodes", []) or []):
        temp_id = str(node.get("temp_id") or f"N{idx+1}")
        area_id = area_map.get(str(node.get("business_area_name") or "").strip().lower()) if node.get("business_area_name") else None
        obj = ProcessNode(
            process_id=proc.id,
            node_type=node.get("node_type") if node.get("node_type") in NODE_TYPES else "ACTIVITY",
            node_title=node.get("node_title") or temp_id,
            node_description=node.get("node_description"),
            node_subtitle=node.get("node_subtitle"),
            node_icon=node.get("node_icon"),
            role_name=node.get("role_name"),
            business_area_id=area_id,
            group_id=None,
            child_process_id=None,
            system_name=node.get("system_name"),
            duration_minutes=node.get("duration_minutes"),
            is_manual=bool(node.get("is_manual", False)),
            is_bottleneck=bool(node.get("is_bottleneck", False)),
            x_position=float(node.get("x_position", idx * 220)),
            y_position=float(node.get("y_position", 120)),
            width=node.get("width"),
            height=node.get("height"),
            display_order=idx,
        )
        db.add(obj)
        db.flush()
        node_map[temp_id] = obj.id

    for idx, edge in enumerate(draft.get("edges", []) or []):
        source_id = node_map.get(str(edge.get("source_temp_id")))
        target_id = node_map.get(str(edge.get("target_temp_id")))
        if not source_id or not target_id or source_id == target_id:
            continue
        db.add(ProcessEdge(
            process_id=proc.id,
            source_node_id=source_id,
            target_node_id=target_id,
            edge_label=edge.get("edge_label"),
            edge_type=edge.get("edge_type") if edge.get("edge_type") in EDGE_TYPES else "SEQUENCE",
            source_handle=_validate_handle(edge.get("source_handle")),
            target_handle=_validate_handle(edge.get("target_handle")),
            condition_expression=None,
            sequence_order=idx,
        ))

    for idx, tool in enumerate(draft.get("tools", []) or []):
        tool_name = str(tool.get("tool_name") or "").strip()
        if not tool_name:
            continue
        db.add(ProcessTool(
            process_id=proc.id,
            tool_name=tool_name,
            tool_description=tool.get("tool_description"),
            tool_icon=tool.get("tool_icon"),
            display_order=int(tool.get("display_order", idx)),
        ))

    db.commit()
    db.refresh(proc)
    return proc


# ══════════════════════════════════════════════════════════════════════════════
# PROCESS CRUD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("", response_model=Paginated)
def list_processes(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    process_scope: Optional[str] = None,
    process_type: Optional[str] = None,
    process_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Process).filter(Process.is_deleted == False)
    normalized_scope = process_scope.upper() if process_scope else None

    if normalized_scope:
        q = q.filter(Process.process_scope == normalized_scope)

    if normalized_scope == "GLOBAL":
        q = q.filter(Process.product_id.is_(None))
    elif product_id is not None:
        q = q.filter(Process.product_id == product_id)

    if process_type:   q = q.filter(Process.process_type == process_type)
    if process_status: q = q.filter(Process.process_status == process_status)
    total = q.count()
    items = q.order_by(Process.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [ProcessOut.model_validate(i) for i in items]}


@router.post("", response_model=ProcessOut, status_code=status.HTTP_201_CREATED)
def create_process(body: ProcessCreate, db: Session = Depends(get_db)):
    payload = body.model_dump()
    payload["process_scope"], payload["product_id"] = _validate_process_scope(
        payload.get("process_scope", "PRODUCT"),
        payload.get("product_id"),
    )
    obj = Process(**payload)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/{id}", response_model=ProcessOut)
def get_process(id: int, db: Session = Depends(get_db)):
    return _get_process(id, db)


@router.patch("/{id}", response_model=ProcessOut)
def update_process(id: int, body: ProcessUpdate, db: Session = Depends(get_db)):
    obj = _get_process(id, db)
    payload = body.model_dump(exclude_unset=True)
    scope = payload.get("process_scope", obj.process_scope)
    product_id = payload.get("product_id", obj.product_id) if "product_id" in payload else obj.product_id
    if "process_scope" in payload or "product_id" in payload:
        scope, product_id = _validate_process_scope(scope, product_id)
        payload["process_scope"] = scope
        payload["product_id"] = product_id
    for k, v in payload.items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_process(id: int, db: Session = Depends(get_db)):
    obj = _get_process(id, db)
    obj.is_deleted = True
    db.commit()


@router.post("/ai/generate", response_model=AIProcessGenerateOut)
def generate_process_with_ai(
    body: AIProcessGenerateBody,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    del current_user
    scope, normalized_product_id = _validate_process_scope(body.process_scope, body.product_id)
    connections = _get_active_ai_connections(db, product_id=normalized_product_id, company_id=body.company_id)
    if not connections:
        raise HTTPException(status_code=400, detail="No active AI connection found for this scope.")

    selected_connection = None
    if body.connection_id:
        selected_connection = next((c for c in connections if c.id == body.connection_id), None)
        if not selected_connection:
            raise HTTPException(status_code=400, detail="Selected AI connection is not active in this scope.")
    else:
        selected_connection = connections[0]

    draft = _invoke_process_ai(selected_connection, _build_process_ai_prompt(body))
    sql_preview = _build_sql_preview(draft, normalized_product_id)
    created_process = _persist_ai_process(db, draft, normalized_product_id) if body.create_in_db else None

    return AIProcessGenerateOut(
        created=created_process is not None,
        process_id=created_process.id if created_process else None,
        process_name=(created_process.process_name if created_process else draft.get("process", {}).get("process_name")),
        sql_preview=sql_preview,
        summary=str(draft.get("summary") or "Processo gerado por IA."),
        draft=draft,
        warnings=[str(item) for item in (draft.get("warnings") or [])],
        connection={
            "id": selected_connection.id,
            "name": selected_connection.name,
            "provider": selected_connection.provider.value if hasattr(selected_connection.provider, "value") else selected_connection.provider,
            "scope": selected_connection.scope.value if hasattr(selected_connection.scope, "value") else selected_connection.scope,
        },
    )


# ── Graph (nodes + edges + groups + tools + business areas in one call) ───────

@router.get("/{id}/graph")
def get_graph(id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _get_process(id, db)
    nodes  = db.query(ProcessNode).filter(ProcessNode.process_id == id).all()
    edges  = db.query(ProcessEdge).filter(ProcessEdge.process_id == id).all()
    groups = db.query(ProcessGroup).filter(ProcessGroup.process_id == id).order_by(ProcessGroup.display_order).all()
    tools  = db.query(ProcessTool).filter(ProcessTool.process_id == id).order_by(ProcessTool.display_order).all()

    # collect unique business_area_ids from nodes
    area_ids = list({n.business_area_id for n in nodes if n.business_area_id})
    areas: List[BusinessArea] = []
    if area_ids:
        areas = db.query(BusinessArea).filter(BusinessArea.id.in_(area_ids)).order_by(BusinessArea.display_order).all()

    return {
        "nodes":          [NodeOut.model_validate(n) for n in nodes],
        "edges":          [EdgeOut.model_validate(e) for e in edges],
        "groups":         [GroupOut.model_validate(g) for g in groups],
        "tools":          [ToolOut.model_validate(t) for t in tools],
        "business_areas": [BusinessAreaOut.model_validate(a) for a in areas],
    }


# ── Nodes ─────────────────────────────────────────────────────────────────────

@router.get("/{id}/nodes", response_model=List[NodeOut])
def list_nodes(id: int, db: Session = Depends(get_db)):
    _get_process(id, db)
    return db.query(ProcessNode).filter(ProcessNode.process_id == id).all()


@router.post("/{id}/nodes", response_model=NodeOut, status_code=status.HTTP_201_CREATED)
def create_node(id: int, body: NodeCreate, db: Session = Depends(get_db)):
    _get_process(id, db)
    if body.node_type not in NODE_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"node_type must be one of {NODE_TYPES}")
    obj = ProcessNode(process_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/nodes/{nid}", response_model=NodeOut)
def update_node(id: int, nid: int, body: NodeUpdate, db: Session = Depends(get_db)):
    obj = _get_node(id, nid, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/nodes/{nid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(id: int, nid: int, db: Session = Depends(get_db)):
    obj = _get_node(id, nid, db)
    db.delete(obj); db.commit()


# ── Edges ─────────────────────────────────────────────────────────────────────

@router.get("/{id}/edges", response_model=List[EdgeOut])
def list_edges(id: int, db: Session = Depends(get_db)):
    _get_process(id, db)
    return db.query(ProcessEdge).filter(ProcessEdge.process_id == id).all()


@router.post("/{id}/edges", response_model=EdgeOut, status_code=status.HTTP_201_CREATED)
def create_edge(id: int, body: EdgeCreate, db: Session = Depends(get_db)):
    _get_process(id, db)
    if body.source_node_id == body.target_node_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "source_node_id and target_node_id must differ")
    _get_node(id, body.source_node_id, db)
    _get_node(id, body.target_node_id, db)
    payload = body.model_dump()
    payload["source_handle"] = _validate_handle(payload.get("source_handle"))
    payload["target_handle"] = _validate_handle(payload.get("target_handle"))
    obj = ProcessEdge(process_id=id, **payload)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/edges/{eid}", response_model=EdgeOut)
def update_edge(id: int, eid: int, body: EdgeUpdate, db: Session = Depends(get_db)):
    obj = _get_edge(id, eid, db)
    payload = body.model_dump(exclude_unset=True)
    if "source_handle" in payload:
        payload["source_handle"] = _validate_handle(payload.get("source_handle"))
    if "target_handle" in payload:
        payload["target_handle"] = _validate_handle(payload.get("target_handle"))
    for k, v in payload.items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/edges/{eid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(id: int, eid: int, db: Session = Depends(get_db)):
    obj = _get_edge(id, eid, db)
    db.delete(obj); db.commit()


# ── Groups ────────────────────────────────────────────────────────────────────

@router.get("/{id}/groups", response_model=List[GroupOut])
def list_groups(id: int, db: Session = Depends(get_db)):
    _get_process(id, db)
    return db.query(ProcessGroup).filter(ProcessGroup.process_id == id).order_by(ProcessGroup.display_order).all()


@router.post("/{id}/groups", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(id: int, body: GroupCreate, db: Session = Depends(get_db)):
    _get_process(id, db)
    if body.group_type not in GROUP_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"group_type must be one of {GROUP_TYPES}")
    obj = ProcessGroup(process_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/groups/{gid}", response_model=GroupOut)
def update_group(id: int, gid: int, body: GroupUpdate, db: Session = Depends(get_db)):
    obj = _get_group(id, gid, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/groups/{gid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(id: int, gid: int, db: Session = Depends(get_db)):
    obj = _get_group(id, gid, db)
    db.delete(obj); db.commit()


# ── Tools ─────────────────────────────────────────────────────────────────────

@router.get("/{id}/tools", response_model=List[ToolOut])
def list_tools(id: int, db: Session = Depends(get_db)):
    _get_process(id, db)
    return db.query(ProcessTool).filter(ProcessTool.process_id == id).order_by(ProcessTool.display_order).all()


@router.post("/{id}/tools", response_model=ToolOut, status_code=status.HTTP_201_CREATED)
def create_tool(id: int, body: ToolCreate, db: Session = Depends(get_db)):
    _get_process(id, db)
    obj = ProcessTool(process_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/tools/{tid}", response_model=ToolOut)
def update_tool(id: int, tid: int, body: ToolUpdate, db: Session = Depends(get_db)):
    obj = _get_tool(id, tid, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/tools/{tid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tool(id: int, tid: int, db: Session = Depends(get_db)):
    obj = _get_tool(id, tid, db)
    db.delete(obj); db.commit()


# ── Node Relations ────────────────────────────────────────────────────────────

@router.get("/{id}/nodes/{nid}/relations", response_model=List[NodeRelationOut])
def list_node_relations(id: int, nid: int, db: Session = Depends(get_db)):
    _get_node(id, nid, db)
    return db.query(ProcessNodeRelation).filter(ProcessNodeRelation.node_id == nid).all()


@router.post("/{id}/nodes/{nid}/relations", response_model=NodeRelationOut,
             status_code=status.HTTP_201_CREATED)
def add_node_relation(id: int, nid: int, body: NodeRelationCreate, db: Session = Depends(get_db)):
    _get_node(id, nid, db)
    if body.entity_type not in NODE_ENTITY_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"entity_type must be one of {NODE_ENTITY_TYPES}")
    obj = ProcessNodeRelation(node_id=nid, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/nodes/{nid}/relations/{rid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node_relation(id: int, nid: int, rid: int, db: Session = Depends(get_db)):
    _get_node(id, nid, db)
    obj = db.get(ProcessNodeRelation, rid)
    if not obj or obj.node_id != nid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Relation not found")
    db.delete(obj); db.commit()
