from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/flows",
    tags=["Flows Data API"],
    dependencies=[Depends(get_current_user)],
)


class FlowsHealthResponse(BaseModel):
    status: str
    api: str


class ProductSummaryResponse(BaseModel):
    product_id: int
    product_name: str
    total_requirements: int
    total_open_risks: int
    total_backlog_items: int
    total_roadmap_items: int


class RequirementOut(BaseModel):
    id: int
    code: str
    title: str
    type: Optional[str] = None
    priority: Optional[str] = None
    lifecycle_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    owner: Optional[str] = None


class RequirementsListResponse(BaseModel):
    product_id: int
    count: int
    items: List[RequirementOut]


class RiskOut(BaseModel):
    id: str
    title: str
    category: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    mitigation_plan: Optional[str] = None


class RisksListResponse(BaseModel):
    product_id: int
    count: int
    items: List[RiskOut]


class RiskSummaryResponse(BaseModel):
    product_id: int
    total_risks: int
    high_impact: int
    medium_impact: int
    low_impact: int
    open_risks: int


class BacklogItemOut(BaseModel):
    item_id: int
    title: str
    item_type: Optional[str] = None
    current_status: Optional[str] = None
    priority: Optional[int] = None
    story_points: Optional[int] = None
    wsjf_score: Optional[float] = None


class BacklogTopPriorityResponse(BaseModel):
    product_id: int
    limit: int
    count: int
    items: List[BacklogItemOut]


class BacklogAcceptanceCriterionOut(BaseModel):
    id: int
    description: str


class BacklogRelationshipOut(BaseModel):
    id: int
    related_item_id: Optional[int] = None
    related_ado_id: Optional[str] = None
    related_title: Optional[str] = None
    link_type: Optional[str] = None
    direction: str


class BacklogItemDetailResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    ado_id: Optional[int] = None
    type: Optional[str] = None
    title: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str | List[BacklogAcceptanceCriterionOut]] = None
    status: Optional[str] = None
    story_points: Optional[int] = None
    sprint: Optional[str] = None
    ado_work_item_type: Optional[str] = None
    enabler_type: Optional[str] = None
    business_value: Optional[str] = None
    definition_of_done: Optional[str] = None
    business_rules: Optional[str] = None
    wsjf_score: Optional[float] = None
    priority: Optional[int] = None
    relationships: List[BacklogRelationshipOut] = []


class MeetingListItem(BaseModel):
    id: str
    product_id: Optional[int] = None
    title: str
    meeting_type: Optional[str] = None
    meeting_date: Optional[str] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    objective: Optional[str] = None
    primary_entity_type: Optional[str] = None
    primary_entity_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MeetingsListResponse(BaseModel):
    product_id: int
    count: int
    items: List[MeetingListItem]


class MeetingSessionOut(BaseModel):
    id: str
    meeting_id: str
    title: Optional[str] = None
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MeetingTranscriptOut(BaseModel):
    id: str
    meeting_id: str
    session_id: Optional[str] = None
    title: str
    content_text: str
    language: Optional[str] = None
    source_type: Optional[str] = None
    source_attachment_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MeetingSummaryOut(BaseModel):
    id: str
    meeting_id: str
    session_id: Optional[str] = None
    transcript_id: Optional[str] = None
    title: str
    summary_type: Optional[str] = None
    content: str
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MeetingDetailResponse(BaseModel):
    meeting: MeetingListItem
    sessions: List[MeetingSessionOut]
    transcripts: List[MeetingTranscriptOut]
    summaries: List[MeetingSummaryOut]


class MeetingSessionsResponse(BaseModel):
    meeting_id: str
    count: int
    items: List[MeetingSessionOut]


class MeetingTranscriptsResponse(BaseModel):
    meeting_id: str
    count: int
    items: List[MeetingTranscriptOut]


class MeetingSummariesResponse(BaseModel):
    meeting_id: str
    count: int
    items: List[MeetingSummaryOut]


class MetricPair(BaseModel):
    key: str
    value: int


class ModuleSummaryResponse(BaseModel):
    product_id: int
    module: str
    metrics: List[MetricPair]


class ModulesCatalogResponse(BaseModel):
    product_id: int
    product_name: str
    modules: Dict[str, List[MetricPair]]


def _ensure_product_exists(db: Session, product_id: int) -> str:
    row = db.execute(
        text("""
            SELECT
                name AS product_name
            FROM products
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return str(row["product_name"])


def _to_int(value) -> int:
    return int(value or 0)


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _metric(key: str, value) -> MetricPair:
    return MetricPair(key=key, value=_to_int(value))

def _iso(value) -> Optional[str]:
    return value.isoformat() if value is not None else None

def _meeting_row_to_item(row) -> MeetingListItem:
    return MeetingListItem(
        id=str(row["id"]),
        product_id=row["product_id"],
        title=row["title"],
        meeting_type=row["meeting_type"],
        meeting_date=_iso(row["meeting_date"]),
        start_time=row["start_time"],
        duration_minutes=row["duration_minutes"],
        location=row["location"],
        status=row["status"],
        objective=row["objective"],
        primary_entity_type=row["primary_entity_type"],
        primary_entity_id=row["primary_entity_id"],
        created_at=_iso(row["created_at"]),
        updated_at=_iso(row["updated_at"]),
    )

def _session_row_to_item(row) -> MeetingSessionOut:
    return MeetingSessionOut(
        id=str(row["id"]),
        meeting_id=str(row["meeting_id"]),
        title=row["title"],
        session_date=_iso(row["session_date"]),
        start_time=row["start_time"],
        end_time=row["end_time"],
        duration_minutes=row["duration_minutes"],
        location=row["location"],
        status=row["status"],
        notes=row["notes"],
        created_at=_iso(row["created_at"]),
        updated_at=_iso(row["updated_at"]),
    )

def _transcript_row_to_item(row) -> MeetingTranscriptOut:
    return MeetingTranscriptOut(
        id=str(row["id"]),
        meeting_id=str(row["meeting_id"]),
        session_id=str(row["session_id"]) if row["session_id"] else None,
        title=row["title"],
        content_text=row["content_text"],
        language=row["language"],
        source_type=row["source_type"],
        source_attachment_id=row["source_attachment_id"],
        created_by=row["created_by"],
        created_at=_iso(row["created_at"]),
        updated_at=_iso(row["updated_at"]),
    )

def _summary_row_to_item(row) -> MeetingSummaryOut:
    return MeetingSummaryOut(
        id=str(row["id"]),
        meeting_id=str(row["meeting_id"]),
        session_id=str(row["session_id"]) if row["session_id"] else None,
        transcript_id=str(row["transcript_id"]) if row["transcript_id"] else None,
        title=row["title"],
        summary_type=row["summary_type"],
        content=row["content"],
        created_by=row["created_by"],
        created_at=_iso(row["created_at"]),
        updated_at=_iso(row["updated_at"]),
    )


@router.get(
    "/health",
    summary="Health check para o aXet Flows",
    description="Valida se a Data API do Product Lab, destinada ao aXet Flows, está operacional.",
    response_model=FlowsHealthResponse,
)
def flows_health():
    return {"status": "ok", "api": "flows-data"}


@router.get(
    "/products/{product_id}/summary",
    summary="Resumo consolidado do produto",
    description="Retorna métricas consolidadas do produto para uso pelo aXet Flows.",
    response_model=ProductSummaryResponse,
)
def product_summary(product_id: int, db: Session = Depends(get_db)):
    product_name = _ensure_product_exists(db, product_id)

    row = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM requirements r WHERE r.product_id = :product_id AND COALESCE(r.is_deleted, FALSE) = FALSE) AS total_requirements,
                (SELECT COUNT(*) FROM risks rk WHERE rk.product_id = :product_id) AS total_open_risks,
                (SELECT COUNT(*) FROM backlog_items bi WHERE bi.product_id = :product_id) AS total_backlog_items,
                (SELECT COUNT(*) FROM roadmap_items ri WHERE ri.product_id = :product_id) AS total_roadmap_items
        """),
        {"product_id": product_id},
    ).mappings().first()

    return {
        "product_id": product_id,
        "product_name": product_name,
        "total_requirements": _to_int(row["total_requirements"]),
        "total_open_risks": _to_int(row["total_open_risks"]),
        "total_backlog_items": _to_int(row["total_backlog_items"]),
        "total_roadmap_items": _to_int(row["total_roadmap_items"]),
    }


@router.get(
    "/products/{product_id}/requirements",
    summary="Lista de requisitos do produto",
    description="Retorna requisitos estruturados do produto para consumo controlado pelo aXet Flows.",
    response_model=RequirementsListResponse,
)
def product_requirements(
    product_id: int,
    limit: int = Query(50, ge=1, le=200, description="Quantidade máxima de requisitos retornados."),
    db: Session = Depends(get_db),
):
    _ensure_product_exists(db, product_id)

    rows = db.execute(
        text("""
            SELECT
                id,
                requirement_code,
                requirement_title,
                requirement_type,
                priority,
                lifecycle_status,
                fulfillment_status,
                requirement_owner
            FROM requirements
            WHERE product_id = :product_id
              AND COALESCE(is_deleted, FALSE) = FALSE
            ORDER BY id DESC
            LIMIT :limit
        """),
        {"product_id": product_id, "limit": limit},
    ).mappings().all()

    items = [
        {
            "id": row["id"],
            "code": row["requirement_code"],
            "title": row["requirement_title"],
            "type": row["requirement_type"],
            "priority": row["priority"],
            "lifecycle_status": row["lifecycle_status"],
            "fulfillment_status": row["fulfillment_status"],
            "owner": row["requirement_owner"],
        }
        for row in rows
    ]

    return {"product_id": product_id, "count": len(items), "items": items}


@router.get(
    "/products/{product_id}/risks",
    summary="Lista de riscos do produto",
    description="Retorna riscos estruturados do produto para uso pelo aXet Flows.",
    response_model=RisksListResponse,
)
def product_risks(
    product_id: int,
    limit: int = Query(50, ge=1, le=200, description="Quantidade máxima de riscos retornados."),
    db: Session = Depends(get_db),
):
    _ensure_product_exists(db, product_id)

    rows = db.execute(
        text("""
            SELECT
                id,
                title,
                category,
                probability,
                impact,
                status,
                owner,
                mitigation_plan
            FROM risks
            WHERE product_id = :product_id
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT :limit
        """),
        {"product_id": product_id, "limit": limit},
    ).mappings().all()

    items = [
        {
            "id": str(row["id"]),
            "title": row["title"],
            "category": row["category"],
            "probability": row["probability"],
            "impact": row["impact"],
            "status": row["status"],
            "owner": row["owner"],
            "mitigation_plan": row["mitigation_plan"],
        }
        for row in rows
    ]

    return {"product_id": product_id, "count": len(items), "items": items}


@router.get(
    "/products/{product_id}/risks-summary",
    summary="Resumo de riscos do produto",
    description="Retorna indicadores agregados de riscos do produto para o aXet Flows.",
    response_model=RiskSummaryResponse,
)
def product_risks_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)

    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_risks,
                COUNT(*) FILTER (WHERE UPPER(COALESCE(impact, '')) = 'HIGH') AS high_impact,
                COUNT(*) FILTER (WHERE UPPER(COALESCE(impact, '')) = 'MEDIUM') AS medium_impact,
                COUNT(*) FILTER (WHERE UPPER(COALESCE(impact, '')) = 'LOW') AS low_impact,
                COUNT(*) FILTER (
                    WHERE LOWER(COALESCE(status, 'open')) NOT IN ('closed', 'resolved', 'done', 'cancelled')
                ) AS open_risks
            FROM risks
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()

    return {
        "product_id": product_id,
        "total_risks": _to_int(row["total_risks"]),
        "high_impact": _to_int(row["high_impact"]),
        "medium_impact": _to_int(row["medium_impact"]),
        "low_impact": _to_int(row["low_impact"]),
        "open_risks": _to_int(row["open_risks"]),
    }


@router.get(
    "/products/{product_id}/backlog/top-priority",
    summary="Itens prioritários do backlog",
    description="Retorna os itens mais prioritários do backlog para uso em perguntas controladas no aXet Flows.",
    response_model=BacklogTopPriorityResponse,
)
def backlog_top_priority(
    product_id: int,
    limit: int = Query(10, ge=1, le=100, description="Quantidade máxima de itens retornados."),
    db: Session = Depends(get_db),
):
    _ensure_product_exists(db, product_id)

    rows = db.execute(
        text("""
            SELECT
                bi.item_id,
                bi.title,
                bit.name AS item_type,
                bi.current_status,
                bi.priority,
                bi.story_points,
                bi.wsjf_score
            FROM backlog_items bi
            LEFT JOIN backlog_item_types bit
              ON bit.item_type_id = bi.item_type_id
            WHERE bi.product_id = :product_id
            ORDER BY
              bi.priority ASC NULLS LAST,
              bi.wsjf_score DESC NULLS LAST,
              bi.item_id DESC
            LIMIT :limit
        """),
        {"product_id": product_id, "limit": limit},
    ).mappings().all()

    items = [
        {
            "item_id": row["item_id"],
            "title": row["title"],
            "item_type": row["item_type"],
            "current_status": row["current_status"],
            "priority": row["priority"],
            "story_points": row["story_points"],
            "wsjf_score": _to_float(row["wsjf_score"]),
        }
        for row in rows
    ]

    return {"product_id": product_id, "limit": limit, "count": len(items), "items": items}


@router.get(
    "/backlog/{backlog_item_id}",
    summary="Detalhe de um backlog item por ADO ID",
    description="Retorna os dados completos de um backlog item específico, identificado pelo ADO ID usado no Product Lab.",
    response_model=BacklogItemDetailResponse,
)
def backlog_item_detail(backlog_item_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT
                bi.item_id,
                bi.product_id,
                bi.ado_id,
                bit.name AS item_type,
                bi.title,
                bi.description,
                bi.acceptance_criteria,
                bi.current_status,
                bi.story_points,
                s.name AS sprint_name,
                bi.ado_work_item_type,
                bi.enabler_type,
                bi.business_value,
                bi.definition_of_done,
                bi.business_rules,
                bi.wsjf_score,
                bi.priority
            FROM backlog_items bi
            LEFT JOIN backlog_item_types bit
              ON bit.item_type_id = bi.item_type_id
            LEFT JOIN sprints s
              ON s.sprint_id = bi.sprint_id
            WHERE bi.ado_id = :backlog_item_id
            ORDER BY bi.item_id DESC
            LIMIT 1
        """),
        {"backlog_item_id": str(backlog_item_id)},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Backlog item not found")

    relationships_rows = db.execute(
        text("""
            SELECT
                l.link_id,
                l.link_type,
                l.source_id,
                l.target_id,
                src.ado_id AS source_ado_id,
                src.title AS source_title,
                tgt.item_id AS target_item_id,
                tgt.ado_id AS target_ado_id,
                tgt.title AS target_title
            FROM backlog_item_links l
            INNER JOIN backlog_items src
              ON src.item_id = l.source_id
            INNER JOIN backlog_items tgt
              ON tgt.item_id = l.target_id
            WHERE l.source_id = :item_id
               OR l.target_id = :item_id
            ORDER BY l.link_id ASC
        """),
        {"item_id": row["item_id"]},
    ).mappings().all()

    relationships = []
    for rel in relationships_rows:
        is_outbound = rel["source_id"] == row["item_id"]
        relationships.append({
            "id": rel["link_id"],
            "related_item_id": rel["target_item_id"] if is_outbound else rel["source_id"],
            "related_ado_id": rel["target_ado_id"] if is_outbound else rel["source_ado_id"],
            "related_title": rel["target_title"] if is_outbound else rel["source_title"],
            "link_type": rel["link_type"],
            "direction": "outbound" if is_outbound else "inbound",
        })

    return {
        "id": row["item_id"],
        "product_id": row["product_id"],
        "ado_id": int(row["ado_id"]) if row["ado_id"] is not None and str(row["ado_id"]).isdigit() else None,
        "type": row["item_type"],
        "title": row["title"],
        "description": row["description"],
        "acceptance_criteria": row["acceptance_criteria"],
        "status": row["current_status"],
        "story_points": row["story_points"],
        "sprint": row["sprint_name"],
        "ado_work_item_type": row["ado_work_item_type"],
        "enabler_type": row["enabler_type"],
        "business_value": row["business_value"],
        "definition_of_done": row["definition_of_done"],
        "business_rules": row["business_rules"],
        "wsjf_score": _to_float(row["wsjf_score"]),
        "priority": row["priority"],
        "relationships": relationships,
    }


@router.get(
    "/products/{product_id}/meetings",
    summary="Lista completa de meetings do produto",
    description="Retorna as meetings do produto com os metadados principais para uso pelo aXet Flows.",
    response_model=MeetingsListResponse,
)
def meetings_list(
    product_id: int,
    limit: int = Query(50, ge=1, le=200, description="Quantidade máxima de meetings retornadas."),
    db: Session = Depends(get_db),
):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT
                id, product_id, title, meeting_type, meeting_date, start_time,
                duration_minutes, location, status, objective,
                primary_entity_type, primary_entity_id, created_at, updated_at
            FROM meetings
            WHERE product_id = :product_id
            ORDER BY meeting_date DESC NULLS LAST, created_at DESC
            LIMIT :limit
        """),
        {"product_id": product_id, "limit": limit},
    ).mappings().all()
    items = [_meeting_row_to_item(row) for row in rows]
    return {"product_id": product_id, "count": len(items), "items": items}


@router.get(
    "/meetings/{meeting_id}",
    summary="Detalhe completo de uma meeting",
    description="Retorna meeting, sessões, transcrições e summaries associados.",
    response_model=MeetingDetailResponse,
)
def meeting_detail(meeting_id: str, db: Session = Depends(get_db)):
    meeting_row = db.execute(
        text("""
            SELECT
                id, product_id, title, meeting_type, meeting_date, start_time,
                duration_minutes, location, status, objective,
                primary_entity_type, primary_entity_id, created_at, updated_at
            FROM meetings
            WHERE id = :meeting_id
        """),
        {"meeting_id": meeting_id},
    ).mappings().first()
    if not meeting_row:
        raise HTTPException(status_code=404, detail="Meeting not found")

    session_rows = db.execute(
        text("""
            SELECT
                id, meeting_id, title, session_date, start_time, end_time,
                duration_minutes, location, status, notes, created_at, updated_at
            FROM meeting_sessions
            WHERE meeting_id = :meeting_id
            ORDER BY session_date DESC NULLS LAST, created_at DESC
        """),
        {"meeting_id": meeting_id},
    ).mappings().all()

    transcript_rows = db.execute(
        text("""
            SELECT
                id, meeting_id, session_id, title, content_text, language,
                source_type, source_attachment_id, created_by, created_at, updated_at
            FROM meeting_transcripts
            WHERE meeting_id = :meeting_id
            ORDER BY created_at DESC
        """),
        {"meeting_id": meeting_id},
    ).mappings().all()

    summary_rows = db.execute(
        text("""
            SELECT
                id, meeting_id, session_id, transcript_id, title, summary_type,
                content, created_by, created_at, updated_at
            FROM meeting_summaries
            WHERE meeting_id = :meeting_id
            ORDER BY created_at DESC
        """),
        {"meeting_id": meeting_id},
    ).mappings().all()

    return {
        "meeting": _meeting_row_to_item(meeting_row),
        "sessions": [_session_row_to_item(row) for row in session_rows],
        "transcripts": [_transcript_row_to_item(row) for row in transcript_rows],
        "summaries": [_summary_row_to_item(row) for row in summary_rows],
    }


@router.get(
    "/meetings/{meeting_id}/sessions",
    summary="Sessões de uma meeting",
    description="Retorna as sessões registradas para uma meeting.",
    response_model=MeetingSessionsResponse,
)
def meeting_sessions(meeting_id: str, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM meetings WHERE id = :meeting_id"), {"meeting_id": meeting_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Meeting not found")
    rows = db.execute(
        text("""
            SELECT
                id, meeting_id, title, session_date, start_time, end_time,
                duration_minutes, location, status, notes, created_at, updated_at
            FROM meeting_sessions
            WHERE meeting_id = :meeting_id
            ORDER BY session_date DESC NULLS LAST, created_at DESC
        """),
        {"meeting_id": meeting_id},
    ).mappings().all()
    items = [_session_row_to_item(row) for row in rows]
    return {"meeting_id": meeting_id, "count": len(items), "items": items}


@router.get(
    "/meetings/{meeting_id}/transcripts",
    summary="Transcrições de uma meeting",
    description="Retorna as transcrições vinculadas à meeting.",
    response_model=MeetingTranscriptsResponse,
)
def meeting_transcripts(meeting_id: str, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM meetings WHERE id = :meeting_id"), {"meeting_id": meeting_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Meeting not found")
    rows = db.execute(
        text("""
            SELECT
                id, meeting_id, session_id, title, content_text, language,
                source_type, source_attachment_id, created_by, created_at, updated_at
            FROM meeting_transcripts
            WHERE meeting_id = :meeting_id
            ORDER BY created_at DESC
        """),
        {"meeting_id": meeting_id},
    ).mappings().all()
    items = [_transcript_row_to_item(row) for row in rows]
    return {"meeting_id": meeting_id, "count": len(items), "items": items}


@router.get(
    "/transcripts/{transcript_id}",
    summary="Detalhe de uma transcrição",
    description="Retorna o conteúdo completo de uma transcrição de meeting.",
    response_model=MeetingTranscriptOut,
)
def transcript_detail(transcript_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT
                id, meeting_id, session_id, title, content_text, language,
                source_type, source_attachment_id, created_by, created_at, updated_at
            FROM meeting_transcripts
            WHERE id = :transcript_id
        """),
        {"transcript_id": transcript_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return _transcript_row_to_item(row)


@router.get(
    "/meetings/{meeting_id}/summaries",
    summary="Summaries de uma meeting",
    description="Retorna os summaries/minutes vinculados à meeting.",
    response_model=MeetingSummariesResponse,
)
def meeting_summaries(meeting_id: str, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM meetings WHERE id = :meeting_id"), {"meeting_id": meeting_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Meeting not found")
    rows = db.execute(
        text("""
            SELECT
                id, meeting_id, session_id, transcript_id, title, summary_type,
                content, created_by, created_at, updated_at
            FROM meeting_summaries
            WHERE meeting_id = :meeting_id
            ORDER BY created_at DESC
        """),
        {"meeting_id": meeting_id},
    ).mappings().all()
    items = [_summary_row_to_item(row) for row in rows]
    return {"meeting_id": meeting_id, "count": len(items), "items": items}


@router.get(
    "/products/{product_id}/discovery/opportunities",
    summary="Lista completa de oportunidades de discovery",
    description="Retorna as oportunidades de discovery do produto.",
)
def discovery_opportunities(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_opportunities
            WHERE product_id = :product_id
            ORDER BY created_at DESC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}",
    summary="Detalhe da oportunidade de discovery",
    description="Retorna os dados principais de uma oportunidade de discovery.",
)
def discovery_opportunity_detail(opportunity_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM discovery_opportunities WHERE id = :id"),
        {"id": opportunity_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Discovery opportunity not found")
    return dict(row)


@router.get(
    "/discovery/opportunities/{opportunity_id}/problem-statement",
    summary="Problem statement da oportunidade",
    description="Retorna o problem statement vinculado à oportunidade.",
)
def discovery_problem_statement(opportunity_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM discovery_problem_statements WHERE opportunity_id = :id"),
        {"id": opportunity_id},
    ).mappings().first()
    if not row:
        return None
    areas = db.execute(
        text("SELECT * FROM discovery_problem_affected_areas WHERE problem_statement_id = :id ORDER BY created_at ASC"),
        {"id": row["id"]},
    ).mappings().all()
    return {**dict(row), "affected_areas": [dict(a) for a in areas]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/jtbd",
    summary="JTBD da oportunidade",
    description="Retorna os jobs-to-be-done vinculados à oportunidade.",
)
def discovery_jtbd(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_jtbd
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/research",
    summary="Research da oportunidade",
    description="Retorna os registros de research vinculados à oportunidade.",
)
def discovery_research(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_research
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/research/{research_id}",
    summary="Detalhe do research",
    description="Retorna o detalhe de um registro de research.",
)
def discovery_research_detail(research_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM discovery_research WHERE id = :id"),
        {"id": research_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Discovery research not found")
    return dict(row)


@router.get(
    "/discovery/research/{research_id}/answers",
    summary="Answers do research",
    description="Retorna perguntas e respostas vinculadas ao research.",
)
def discovery_research_answers(research_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT
                ra.*,
                rtq.question AS template_question,
                rtq.hint AS template_hint,
                rtq.question_type AS template_question_type
            FROM research_answers ra
            LEFT JOIN research_template_questions rtq
              ON rtq.id = ra.question_id
            WHERE ra.research_id = :id
            ORDER BY ra.section ASC, ra.sort_order ASC, ra.created_at ASC
        """),
        {"id": research_id},
    ).mappings().all()
    return {"research_id": research_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/insights",
    summary="Insights da oportunidade",
    description="Retorna os insights vinculados à oportunidade.",
)
def discovery_insights(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_insights
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/assumptions",
    summary="Assumptions da oportunidade",
    description="Retorna as assumptions vinculadas à oportunidade.",
)
def discovery_assumptions(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_assumptions
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/solution-ideas",
    summary="Solution ideas da oportunidade",
    description="Retorna as solution ideas vinculadas à oportunidade.",
)
def discovery_solution_ideas(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_solution_ideas
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/experiments",
    summary="Experiments da oportunidade",
    description="Retorna os experiments vinculados à oportunidade.",
)
def discovery_experiments(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_experiments
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/success-metrics",
    summary="Success metrics da oportunidade",
    description="Retorna as success metrics vinculadas à oportunidade.",
)
def discovery_success_metrics(opportunity_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM discovery_success_metrics
            WHERE opportunity_id = :id
            ORDER BY created_at DESC
        """),
        {"id": opportunity_id},
    ).mappings().all()
    return {"opportunity_id": opportunity_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/discovery/opportunities/{opportunity_id}/catalog",
    summary="Catálogo consolidado da oportunidade de discovery",
    description="Retorna um snapshot completo e consolidado da oportunidade de discovery para o aXet Flows.",
)
def discovery_catalog(opportunity_id: str, db: Session = Depends(get_db)):
    opp = db.execute(
        text("SELECT * FROM discovery_opportunities WHERE id = :id"),
        {"id": opportunity_id},
    ).mappings().first()
    if not opp:
        raise HTTPException(status_code=404, detail="Discovery opportunity not found")

    problem = db.execute(
        text("SELECT * FROM discovery_problem_statements WHERE opportunity_id = :id"),
        {"id": opportunity_id},
    ).mappings().first()

    jtbd_count = db.execute(text("SELECT COUNT(*) FROM discovery_jtbd WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()
    research_count = db.execute(text("SELECT COUNT(*) FROM discovery_research WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()
    insights_count = db.execute(text("SELECT COUNT(*) FROM discovery_insights WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()
    assumptions_count = db.execute(text("SELECT COUNT(*) FROM discovery_assumptions WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()
    ideas_count = db.execute(text("SELECT COUNT(*) FROM discovery_solution_ideas WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()
    experiments_count = db.execute(text("SELECT COUNT(*) FROM discovery_experiments WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()
    success_metrics_count = db.execute(text("SELECT COUNT(*) FROM discovery_success_metrics WHERE opportunity_id = :id"), {"id": opportunity_id}).scalar()

    return {
        "opportunity": dict(opp),
        "problem_statement": dict(problem) if problem else None,
        "summary": {
            "jtbd_count": _to_int(jtbd_count),
            "research_count": _to_int(research_count),
            "insights_count": _to_int(insights_count),
            "assumptions_count": _to_int(assumptions_count),
            "solution_ideas_count": _to_int(ideas_count),
            "experiments_count": _to_int(experiments_count),
            "success_metrics_count": _to_int(success_metrics_count),
        },
    }


@router.get(
    "/products/{product_id}/value-canvas/canvases",
    summary="Lista de canvases de valor do produto",
    description="Retorna os canvases VPC do produto para uso pelo aXet Flows.",
)
def vpc_canvases(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT *
            FROM vpc_canvas
            WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR)
            ORDER BY created_at DESC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/value-canvas/canvases/{canvas_id}",
    summary="Detalhe do canvas de valor",
    description="Retorna o canvas, seus itens e links.",
)
def vpc_canvas_detail(canvas_id: str, db: Session = Depends(get_db)):
    canvas = db.execute(
        text("SELECT * FROM vpc_canvas WHERE id = :id"),
        {"id": canvas_id},
    ).mappings().first()
    if not canvas:
        raise HTTPException(status_code=404, detail="VPC canvas not found")
    items = db.execute(
        text("SELECT * FROM vpc_items WHERE canvas_id = :id ORDER BY priority ASC, created_at DESC"),
        {"id": canvas_id},
    ).mappings().all()
    links = db.execute(
        text("SELECT * FROM vpc_item_links WHERE canvas_id = :id ORDER BY created_at DESC"),
        {"id": canvas_id},
    ).mappings().all()
    return {
        "canvas": dict(canvas),
        "items": [dict(i) for i in items],
        "links": [dict(l) for l in links],
    }


@router.get(
    "/value-canvas/canvases/{canvas_id}/items",
    summary="Itens do Value Canvas",
    description="Retorna os itens de um canvas VPC.",
)
def vpc_canvas_items(canvas_id: str, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM vpc_canvas WHERE id = :id"), {"id": canvas_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="VPC canvas not found")
    rows = db.execute(
        text("""
            SELECT *
            FROM vpc_items
            WHERE canvas_id = :id
            ORDER BY priority ASC, created_at DESC
        """),
        {"id": canvas_id},
    ).mappings().all()
    return {"canvas_id": canvas_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/value-canvas/canvases/{canvas_id}/links",
    summary="Links do Value Canvas",
    description="Retorna os links N:M entre itens do canvas.",
)
def vpc_canvas_links(canvas_id: str, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM vpc_canvas WHERE id = :id"), {"id": canvas_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="VPC canvas not found")
    rows = db.execute(
        text("""
            SELECT *
            FROM vpc_item_links
            WHERE canvas_id = :id
            ORDER BY created_at DESC
        """),
        {"id": canvas_id},
    ).mappings().all()
    return {"canvas_id": canvas_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/products/{product_id}/value-canvas-summary",
    summary="Resumo do Value Canvas",
    description="Retorna métricas consolidadas do módulo Value Canvas.",
    response_model=ModuleSummaryResponse,
)
def vpc_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM vpc_canvas WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR)) AS canvases,
                (SELECT COUNT(*) FROM vpc_items WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR)) AS items,
                (SELECT COUNT(*) FROM vpc_items WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR) AND type = 'job') AS jobs,
                (SELECT COUNT(*) FROM vpc_items WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR) AND type = 'pain') AS pains,
                (SELECT COUNT(*) FROM vpc_items WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR) AND type = 'gain') AS gains
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "value_canvas",
        "metrics": [
            _metric("canvases", row["canvases"]),
            _metric("items", row["items"]),
            _metric("jobs", row["jobs"]),
            _metric("pains", row["pains"]),
            _metric("gains", row["gains"]),
        ],
    }


@router.get(
    "/products/{product_id}/process-mapping/processes",
    summary="Lista de processos do produto",
    description="Retorna os processos do módulo Process Mapping para uso pelo aXet Flows.",
)
def process_mapping_processes(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT *
            FROM processes
            WHERE product_id = :product_id
              AND COALESCE(is_deleted, FALSE) = FALSE
            ORDER BY created_at DESC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/process-mapping/processes/{process_id}",
    summary="Detalhe completo do processo",
    description="Retorna o processo, grupos, nós, edges, relations e tools.",
)
def process_mapping_process_detail(process_id: int, db: Session = Depends(get_db)):
    process = db.execute(
        text("SELECT * FROM processes WHERE id = :id"),
        {"id": process_id},
    ).mappings().first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    groups = db.execute(text("SELECT * FROM process_groups WHERE process_id = :id ORDER BY display_order ASC, id ASC"), {"id": process_id}).mappings().all()
    nodes = db.execute(text("SELECT * FROM process_nodes WHERE process_id = :id ORDER BY display_order ASC NULLS LAST, id ASC"), {"id": process_id}).mappings().all()
    edges = db.execute(text("SELECT * FROM process_edges WHERE process_id = :id ORDER BY sequence_order ASC NULLS LAST, id ASC"), {"id": process_id}).mappings().all()
    tools = db.execute(text("SELECT * FROM process_tools WHERE process_id = :id ORDER BY display_order ASC, id ASC"), {"id": process_id}).mappings().all()
    relations = db.execute(
        text("""
            SELECT pnr.*
            FROM process_node_relations pnr
            INNER JOIN process_nodes pn
              ON pn.id = pnr.node_id
            WHERE pn.process_id = :id
            ORDER BY pnr.created_at DESC
        """),
        {"id": process_id},
    ).mappings().all()

    return {
        "process": dict(process),
        "groups": [dict(g) for g in groups],
        "nodes": [dict(n) for n in nodes],
        "edges": [dict(e) for e in edges],
        "tools": [dict(t) for t in tools],
        "relations": [dict(r) for r in relations],
    }


@router.get(
    "/process-mapping/processes/{process_id}/nodes",
    summary="Nós do processo",
    description="Retorna os nodes de um processo.",
)
def process_mapping_nodes(process_id: int, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM processes WHERE id = :id"), {"id": process_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Process not found")
    rows = db.execute(
        text("""
            SELECT *
            FROM process_nodes
            WHERE process_id = :id
            ORDER BY display_order ASC NULLS LAST, id ASC
        """),
        {"id": process_id},
    ).mappings().all()
    return {"process_id": process_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/process-mapping/processes/{process_id}/edges",
    summary="Conexões do processo",
    description="Retorna os edges de um processo.",
)
def process_mapping_edges(process_id: int, db: Session = Depends(get_db)):
    exists = db.execute(text("SELECT 1 FROM processes WHERE id = :id"), {"id": process_id}).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Process not found")
    rows = db.execute(
        text("""
            SELECT *
            FROM process_edges
            WHERE process_id = :id
            ORDER BY sequence_order ASC NULLS LAST, id ASC
        """),
        {"id": process_id},
    ).mappings().all()
    return {"process_id": process_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/products/{product_id}/process-mapping-summary",
    summary="Resumo do Process Mapping",
    description="Retorna métricas consolidadas do módulo Process Mapping.",
    response_model=ModuleSummaryResponse,
)
def process_mapping_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM processes WHERE product_id = :product_id AND COALESCE(is_deleted, FALSE) = FALSE) AS processes,
                (SELECT COUNT(*) FROM process_nodes pn INNER JOIN processes p ON p.id = pn.process_id WHERE p.product_id = :product_id AND COALESCE(p.is_deleted, FALSE) = FALSE) AS nodes,
                (SELECT COUNT(*) FROM process_edges pe INNER JOIN processes p ON p.id = pe.process_id WHERE p.product_id = :product_id AND COALESCE(p.is_deleted, FALSE) = FALSE) AS edges,
                (SELECT COUNT(*) FROM process_tools pt INNER JOIN processes p ON p.id = pt.process_id WHERE p.product_id = :product_id AND COALESCE(p.is_deleted, FALSE) = FALSE) AS tools
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "process_mapping",
        "metrics": [
            _metric("processes", row["processes"]),
            _metric("nodes", row["nodes"]),
            _metric("edges", row["edges"]),
            _metric("tools", row["tools"]),
        ],
    }


@router.get(
    "/products/{product_id}/business-domains",
    summary="Lista de business domains",
    description="Retorna os business domains para consumo pelo aXet Flows.",
)
def business_domains_list(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT DISTINCT bd.*
            FROM business_domains bd
            LEFT JOIN requirement_domain_links rdl
              ON rdl.domain_id = bd.id
            LEFT JOIN requirements r
              ON r.id = rdl.requirement_id
            WHERE r.product_id = :product_id
               OR bd.is_active = TRUE
            ORDER BY bd.display_order ASC, bd.id ASC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/business-domains/{domain_id}",
    summary="Detalhe do business domain",
    description="Retorna domain, subdomains e requirement links agregados.",
)
def business_domain_detail(domain_id: int, db: Session = Depends(get_db)):
    domain = db.execute(text("SELECT * FROM business_domains WHERE id = :id"), {"id": domain_id}).mappings().first()
    if not domain:
        raise HTTPException(status_code=404, detail="Business domain not found")
    subdomains = db.execute(
        text("SELECT * FROM business_subdomains WHERE domain_id = :id ORDER BY display_order ASC, id ASC"),
        {"id": domain_id},
    ).mappings().all()
    links = db.execute(
        text("SELECT * FROM requirement_domain_links WHERE domain_id = :id ORDER BY created_at DESC"),
        {"id": domain_id},
    ).mappings().all()
    return {"domain": dict(domain), "subdomains": [dict(s) for s in subdomains], "requirement_links": [dict(l) for l in links]}


@router.get(
    "/products/{product_id}/business-domains-summary",
    summary="Resumo de business domains",
    description="Retorna métricas consolidadas de business domains.",
    response_model=ModuleSummaryResponse,
)
def business_domains_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(DISTINCT bd.id) AS domains,
                COUNT(DISTINCT bsd.id) AS subdomains,
                COUNT(DISTINCT rdl.id) AS requirement_links
            FROM business_domains bd
            LEFT JOIN business_subdomains bsd
              ON bsd.domain_id = bd.id
            LEFT JOIN requirement_domain_links rdl
              ON rdl.domain_id = bd.id
            LEFT JOIN requirements r
              ON r.id = rdl.requirement_id
            WHERE r.product_id = :product_id
               OR bd.is_active = TRUE
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "business_domains",
        "metrics": [
            _metric("domains", row["domains"]),
            _metric("subdomains", row["subdomains"]),
            _metric("requirement_links", row["requirement_links"]),
        ],
    }


@router.get(
    "/products/{product_id}/prioritization/items",
    summary="Lista de itens de prioritization",
    description="Retorna os itens priorizados do produto.",
)
def prioritization_items(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT *
            FROM prioritization_items
            WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR)
            ORDER BY rice_score DESC NULLS LAST, created_at DESC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/products/{product_id}/prioritization-summary",
    summary="Resumo de prioritization",
    description="Retorna métricas consolidadas do módulo de priorização.",
    response_model=ModuleSummaryResponse,
)
def prioritization_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS items,
                COUNT(*) FILTER (WHERE priority_method = 'RICE') AS rice_items,
                COUNT(*) FILTER (WHERE priority_method = 'ICE') AS ice_items,
                COUNT(*) FILTER (WHERE priority_method = 'MOSCOW') AS moscow_items
            FROM prioritization_items
            WHERE CAST(product_id AS VARCHAR) = CAST(:product_id AS VARCHAR)
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "prioritization",
        "metrics": [
            _metric("items", row["items"]),
            _metric("rice_items", row["rice_items"]),
            _metric("ice_items", row["ice_items"]),
            _metric("moscow_items", row["moscow_items"]),
        ],
    }


@router.get(
    "/products/{product_id}/sprints",
    summary="Lista de sprints do produto",
    description="Retorna os sprints do produto para o aXet Flows.",
)
def sprints_list(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT *
            FROM sprints
            WHERE product_id = :product_id
            ORDER BY start_date DESC NULLS LAST, sprint_id DESC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/sprints/{sprint_id}",
    summary="Detalhe do sprint",
    description="Retorna o sprint e os backlog items associados.",
)
def sprint_detail(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.execute(text("SELECT * FROM sprints WHERE sprint_id = :id"), {"id": sprint_id}).mappings().first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    items = db.execute(
        text("""
            SELECT item_id, product_id, title, current_status, priority, story_points, sprint_id, start_sprint_id, end_sprint_id
            FROM backlog_items
            WHERE sprint_id = :id OR start_sprint_id = :id OR end_sprint_id = :id
            ORDER BY priority ASC NULLS LAST, item_id DESC
        """),
        {"id": sprint_id},
    ).mappings().all()
    return {"sprint": dict(sprint), "backlog_items": [dict(i) for i in items]}


@router.get(
    "/products/{product_id}/sprints-summary",
    summary="Resumo de sprints",
    description="Retorna métricas consolidadas do módulo Sprint.",
    response_model=ModuleSummaryResponse,
)
def sprints_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS sprints,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'planned') AS planned,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('active', 'in_progress')) AS active,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('completed', 'done')) AS completed
            FROM sprints
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "sprint",
        "metrics": [
            _metric("sprints", row["sprints"]),
            _metric("planned", row["planned"]),
            _metric("active", row["active"]),
            _metric("completed", row["completed"]),
        ],
    }


@router.get(
    "/companies",
    summary="Lista de companies",
    description="Retorna empresas/clientes para consumo pelo aXet Flows.",
)
def companies_list(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM companies
            ORDER BY company_name ASC
        """)
    ).mappings().all()
    return {"count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/companies/{company_id}",
    summary="Detalhe da company",
    description="Retorna a company com áreas vinculadas e produtos associados.",
)
def company_detail(company_id: int, db: Session = Depends(get_db)):
    company = db.execute(text("SELECT * FROM companies WHERE id = :id"), {"id": company_id}).mappings().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    areas = db.execute(
        text("""
            SELECT cba.*, ba.area_name, ba.area_type
            FROM company_business_areas cba
            INNER JOIN business_areas ba ON ba.id = cba.business_area_id
            WHERE cba.company_id = :id
            ORDER BY cba.display_order ASC, cba.id ASC
        """),
        {"id": company_id},
    ).mappings().all()
    products = db.execute(
        text("""
            SELECT *
            FROM products
            WHERE company_id = :id
            ORDER BY name ASC
        """),
        {"id": company_id},
    ).mappings().all()
    return {"company": dict(company), "business_areas": [dict(a) for a in areas], "products": [dict(p) for p in products]}


@router.get(
    "/products/{product_id}/companies-summary",
    summary="Resumo de company do produto",
    description="Retorna métricas de company/cliente vinculada ao produto.",
    response_model=ModuleSummaryResponse,
)
def companies_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(DISTINCT c.id) AS companies,
                COUNT(DISTINCT p.product_id) AS products
            FROM products p
            LEFT JOIN companies c ON c.id = p.company_id
            WHERE p.product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "companies",
        "metrics": [
            _metric("companies", row["companies"]),
            _metric("products", row["products"]),
        ],
    }


@router.get(
    "/products/{product_id}/business-areas",
    summary="Lista de business areas do produto",
    description="Retorna as business areas do produto.",
)
def business_areas_list(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT *
            FROM business_areas
            WHERE product_id = :product_id
            ORDER BY display_order ASC, id ASC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/business-areas/{area_id}",
    summary="Detalhe da business area",
    description="Retorna área, empresas associadas e membros associados.",
)
def business_area_detail(area_id: int, db: Session = Depends(get_db)):
    area = db.execute(text("SELECT * FROM business_areas WHERE id = :id"), {"id": area_id}).mappings().first()
    if not area:
        raise HTTPException(status_code=404, detail="Business area not found")
    companies = db.execute(
        text("""
            SELECT cba.*, c.company_name
            FROM company_business_areas cba
            INNER JOIN companies c ON c.id = cba.company_id
            WHERE cba.business_area_id = :id
            ORDER BY cba.display_order ASC, cba.id ASC
        """),
        {"id": area_id},
    ).mappings().all()
    members = db.execute(
        text("""
            SELECT cam.*, s.full_name AS stakeholder_name
            FROM company_area_members cam
            INNER JOIN stakeholders s ON s.stakeholder_id = cam.stakeholder_id
            WHERE cam.business_area_id = :id
            ORDER BY cam.id ASC
        """),
        {"id": area_id},
    ).mappings().all()
    return {"business_area": dict(area), "companies": [dict(c) for c in companies], "members": [dict(m) for m in members]}


@router.get(
    "/products/{product_id}/business-areas-summary",
    summary="Resumo de business areas",
    description="Retorna métricas do módulo business areas.",
    response_model=ModuleSummaryResponse,
)
def business_areas_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS areas,
                COUNT(*) FILTER (WHERE COALESCE(is_active, TRUE) = TRUE) AS active_areas
            FROM business_areas
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "business_areas",
        "metrics": [
            _metric("areas", row["areas"]),
            _metric("active_areas", row["active_areas"]),
        ],
    }


@router.get(
    "/products",
    summary="Lista de produtos",
    description="Retorna os produtos para consumo pelo aXet Flows.",
)
def products_list(company_id: Optional[int] = None, db: Session = Depends(get_db)):
    if company_id:
        rows = db.execute(
            text("SELECT * FROM products WHERE company_id = :company_id ORDER BY name ASC"),
            {"company_id": company_id},
        ).mappings().all()
    else:
        rows = db.execute(text("SELECT * FROM products ORDER BY name ASC")).mappings().all()
    return {"count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/products/{product_id}/detail",
    summary="Detalhe do produto",
    description="Retorna os dados do produto com a company associada.",
)
def product_detail(product_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT p.*, c.company_name
            FROM products p
            LEFT JOIN companies c ON c.id = p.company_id
            WHERE p.product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return dict(row)


@router.get(
    "/products/{product_id}/stakeholders",
    summary="Lista de stakeholders do produto",
    description="Retorna os stakeholders vinculados ao produto.",
)
def stakeholders_list(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    rows = db.execute(
        text("""
            SELECT s.*, sp.is_active AS product_link_active
            FROM stakeholder_products sp
            INNER JOIN stakeholders s ON s.stakeholder_id = sp.stakeholder_id
            WHERE sp.product_id = :product_id
            ORDER BY s.full_name ASC
        """),
        {"product_id": product_id},
    ).mappings().all()
    return {"product_id": product_id, "count": len(rows), "items": [dict(r) for r in rows]}


@router.get(
    "/stakeholders/{stakeholder_id}",
    summary="Detalhe do stakeholder",
    description="Retorna o stakeholder, produtos associados e memberships em áreas.",
)
def stakeholder_detail(stakeholder_id: int, db: Session = Depends(get_db)):
    stakeholder = db.execute(
        text("SELECT * FROM stakeholders WHERE stakeholder_id = :id"),
        {"id": stakeholder_id},
    ).mappings().first()
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    products = db.execute(
        text("""
            SELECT sp.*, p.name AS product_name
            FROM stakeholder_products sp
            INNER JOIN products p ON p.product_id = sp.product_id
            WHERE sp.stakeholder_id = :id
            ORDER BY p.name ASC
        """),
        {"id": stakeholder_id},
    ).mappings().all()
    memberships = db.execute(
        text("""
            SELECT cam.*, ba.area_name, c.company_name
            FROM company_area_members cam
            LEFT JOIN business_areas ba ON ba.id = cam.business_area_id
            LEFT JOIN companies c ON c.id = cam.company_id
            WHERE cam.stakeholder_id = :id
            ORDER BY cam.id ASC
        """),
        {"id": stakeholder_id},
    ).mappings().all()
    return {"stakeholder": dict(stakeholder), "products": [dict(p) for p in products], "memberships": [dict(m) for m in memberships]}


@router.get(
    "/products/{product_id}/roadmap-summary",
    summary="Resumo do roadmap",
    description="Retorna métricas consolidadas de roadmap para o aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def roadmap_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_items,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'planned') AS planned_items,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('in_progress', 'active')) AS in_progress_items,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('done', 'completed')) AS completed_items
            FROM roadmap_items
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "roadmap",
        "metrics": [
            _metric("total_items", row["total_items"]),
            _metric("planned_items", row["planned_items"]),
            _metric("in_progress_items", row["in_progress_items"]),
            _metric("completed_items", row["completed_items"]),
        ],
    }


@router.get(
    "/products/{product_id}/decisions-summary",
    summary="Resumo de decisões",
    description="Retorna métricas consolidadas de decisões do produto para o aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def decisions_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_decisions,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'approved') AS approved,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending') AS pending,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'rejected') AS rejected
            FROM decisions
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "decisions",
        "metrics": [
            _metric("total_decisions", row["total_decisions"]),
            _metric("approved", row["approved"]),
            _metric("pending", row["pending"]),
            _metric("rejected", row["rejected"]),
        ],
    }


@router.get(
    "/products/{product_id}/followups-summary",
    summary="Resumo de follow-ups",
    description="Retorna indicadores de follow-ups vinculados a entidades do produto.",
    response_model=ModuleSummaryResponse,
)
def followups_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_followups,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, 'pending')) = 'pending') AS pending,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('done', 'completed', 'closed')) AS completed,
                COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND LOWER(COALESCE(status, 'pending')) NOT IN ('done', 'completed', 'closed')) AS overdue
            FROM followups
            WHERE entity_type = 'product'
              AND entity_id = CAST(:product_id AS VARCHAR)
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "followups",
        "metrics": [
            _metric("total_followups", row["total_followups"]),
            _metric("pending", row["pending"]),
            _metric("completed", row["completed"]),
            _metric("overdue", row["overdue"]),
        ],
    }


@router.get(
    "/products/{product_id}/stakeholders-summary",
    summary="Resumo de stakeholders",
    description="Retorna métricas consolidadas de stakeholders vinculados ao produto.",
    response_model=ModuleSummaryResponse,
)
def stakeholders_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_stakeholders,
                COUNT(*) FILTER (WHERE COALESCE(sp.influence, 0) >= 4) AS high_influence,
                COUNT(*) FILTER (WHERE COALESCE(sp.interest, 0) >= 4) AS high_interest
            FROM stakeholder_products sp
            INNER JOIN stakeholders s
              ON s.stakeholder_id = sp.stakeholder_id
            WHERE sp.product_id = :product_id
              AND COALESCE(sp.is_active, TRUE) = TRUE
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "stakeholders",
        "metrics": [
            _metric("total_stakeholders", row["total_stakeholders"]),
            _metric("high_influence", row["high_influence"]),
            _metric("high_interest", row["high_interest"]),
        ],
    }


@router.get(
    "/products/{product_id}/discovery-summary",
    summary="Resumo de discovery",
    description="Retorna métricas do módulo de discovery para uso pelo aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def discovery_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM discovery_opportunities WHERE product_id = :product_id) AS opportunities,
                (SELECT COUNT(*) FROM discovery_research WHERE product_id = :product_id) AS research_items,
                (SELECT COUNT(*) FROM discovery_business_cases WHERE product_id = :product_id) AS business_cases
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "discovery",
        "metrics": [
            _metric("opportunities", row["opportunities"]),
            _metric("research_items", row["research_items"]),
            _metric("business_cases", row["business_cases"]),
        ],
    }


@router.get(
    "/products/{product_id}/communication-summary",
    summary="Resumo de communication",
    description="Retorna métricas do módulo de communication para o aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def communication_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS communications,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'published') AS published
            FROM communications
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "communication",
        "metrics": [
            _metric("communications", row["communications"]),
            _metric("published", row["published"]),
        ],
    }


@router.get(
    "/products/{product_id}/meetings-summary",
    summary="Resumo de meetings",
    description="Retorna métricas de reuniões do produto para o aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def meetings_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS meetings,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'scheduled') AS scheduled,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('completed', 'done')) AS completed
            FROM meetings
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "meetings",
        "metrics": [
            _metric("meetings", row["meetings"]),
            _metric("scheduled", row["scheduled"]),
            _metric("completed", row["completed"]),
        ],
    }


@router.get(
    "/products/{product_id}/knowledge-summary",
    summary="Resumo de knowledge",
    description="Retorna métricas da base de conhecimento do produto para o aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def knowledge_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS articles
            FROM knowledge_articles
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "knowledge",
        "metrics": [
            _metric("articles", row["articles"]),
        ],
    }


@router.get(
    "/products/{product_id}/raci-summary",
    summary="Resumo de RACI",
    description="Retorna métricas de assignments RACI do produto para o aXet Flows.",
    response_model=ModuleSummaryResponse,
)
def raci_summary(product_id: int, db: Session = Depends(get_db)):
    _ensure_product_exists(db, product_id)
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS assignments,
                COUNT(*) FILTER (WHERE role = 'R') AS responsible,
                COUNT(*) FILTER (WHERE role = 'A') AS accountable,
                COUNT(*) FILTER (WHERE role = 'C') AS consulted,
                COUNT(*) FILTER (WHERE role = 'I') AS informed
            FROM raci_assignments
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return {
        "product_id": product_id,
        "module": "raci",
        "metrics": [
            _metric("assignments", row["assignments"]),
            _metric("responsible", row["responsible"]),
            _metric("accountable", row["accountable"]),
            _metric("consulted", row["consulted"]),
            _metric("informed", row["informed"]),
        ],
    }


@router.get(
    "/products/{product_id}/modules-catalog",
    summary="Catálogo consolidado de módulos",
    description="Retorna um snapshot resumido de múltiplos módulos do Product Lab para uso pelo planner/executor do aXet Flows.",
    response_model=ModulesCatalogResponse,
)
def modules_catalog(product_id: int, db: Session = Depends(get_db)):
    product_name = _ensure_product_exists(db, product_id)

    return {
        "product_id": product_id,
        "product_name": product_name,
        "modules": {
            "product": product_summary(product_id, db)["__dict__"] if False else [
                _metric("summary_ready", 1),
            ],
            "requirements": product_requirements_summary_internal(product_id, db),
            "risks": product_risks_summary_internal(product_id, db),
            "backlog": backlog_summary_internal(product_id, db),
            "roadmap": roadmap_summary(product_id, db).metrics,
            "decisions": decisions_summary(product_id, db).metrics,
            "followups": followups_summary(product_id, db).metrics,
            "stakeholders": stakeholders_summary(product_id, db).metrics,
            "discovery": discovery_summary(product_id, db).metrics,
            "communication": communication_summary(product_id, db).metrics,
            "meetings": meetings_summary(product_id, db).metrics,
            "knowledge": knowledge_summary(product_id, db).metrics,
            "raci": raci_summary(product_id, db).metrics,
        },
    }


def product_requirements_summary_internal(product_id: int, db: Session) -> List[MetricPair]:
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(priority, '')) IN ('critical', 'high')) AS high_priority
            FROM requirements
            WHERE product_id = :product_id
              AND COALESCE(is_deleted, FALSE) = FALSE
        """),
        {"product_id": product_id},
    ).mappings().first()
    return [
        _metric("total", row["total"]),
        _metric("high_priority", row["high_priority"]),
    ]


def product_risks_summary_internal(product_id: int, db: Session) -> List[MetricPair]:
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE LOWER(COALESCE(status, 'open')) NOT IN ('closed', 'resolved', 'done', 'cancelled')
                ) AS open
            FROM risks
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return [
        _metric("total", row["total"]),
        _metric("open", row["open"]),
    ]


def backlog_summary_internal(product_id: int, db: Session) -> List[MetricPair]:
    row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(current_status, '')) IN ('open', 'new', 'to_do', 'todo', 'planned')) AS open_items,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(current_status, '')) IN ('done', 'completed', 'closed')) AS completed_items
            FROM backlog_items
            WHERE product_id = :product_id
        """),
        {"product_id": product_id},
    ).mappings().first()
    return [
        _metric("total", row["total"]),
        _metric("open_items", row["open_items"]),
        _metric("completed_items", row["completed_items"]),
    ]
