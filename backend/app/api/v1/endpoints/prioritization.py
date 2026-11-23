from datetime import datetime
from typing import Dict, Optional, Type

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.backlog import BacklogItem, BacklogItemType
from app.models.company import Company
from app.models.prioritization import (
    EisenhowerPrioritizationItem,
    IcePrioritizationItem,
    MoscowPrioritizationItem,
    MoscowValue,
    PriorityMethod,
    QuarterPrioritizationItem,
    RicePrioritizationItem,
    WsjfPrioritizationItem,
)
from app.models.roadmap import RoadmapItem
from app.schemas.common import Paginated


router = APIRouter()


METHOD_MODEL_MAP: Dict[PriorityMethod, Type] = {
    PriorityMethod.RICE: RicePrioritizationItem,
    PriorityMethod.ICE: IcePrioritizationItem,
    PriorityMethod.MOSCOW: MoscowPrioritizationItem,
    PriorityMethod.EISENHOWER: EisenhowerPrioritizationItem,
    PriorityMethod.WSJF: WsjfPrioritizationItem,
}


class PrioritizationCreate(BaseModel):
    product_id: str
    backlog_item_id: Optional[int] = None
    source_type: str = "manual"
    source_id: Optional[str] = None
    item_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority_method: PriorityMethod = PriorityMethod.RICE
    reach: float = 0.0
    impact: float = 0.0
    confidence: float = 0.0
    effort: float = 1.0
    rice_score: float = 0.0
    moscow_value: Optional[MoscowValue] = None
    ease: float = 1.0
    ice_score: float = 0.0
    urgency: float = 0.0
    importance: float = 0.0
    eisenhower_score: float = 0.0
    quadrant: Optional[str] = None
    business_value: float = 0.0
    time_criticality: float = 0.0
    risk_reduction: float = 0.0
    job_size: float = 1.0
    wsjf_score: float = 0.0


class PrioritizationUpdate(BaseModel):
    backlog_item_id: Optional[int] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    item_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    reach: Optional[float] = None
    impact: Optional[float] = None
    confidence: Optional[float] = None
    effort: Optional[float] = None
    rice_score: Optional[float] = None
    moscow_value: Optional[MoscowValue] = None
    ease: Optional[float] = None
    ice_score: Optional[float] = None
    urgency: Optional[float] = None
    importance: Optional[float] = None
    eisenhower_score: Optional[float] = None
    quadrant: Optional[str] = None
    business_value: Optional[float] = None
    time_criticality: Optional[float] = None
    risk_reduction: Optional[float] = None
    job_size: Optional[float] = None
    wsjf_score: Optional[float] = None


class PrioritizationOut(BaseModel):
    id: str
    product_id: str
    backlog_item_id: Optional[int] = None
    source_type: str
    source_id: Optional[str] = None
    item_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority_method: PriorityMethod
    reach: Optional[float] = None
    impact: Optional[float] = None
    confidence: Optional[float] = None
    effort: Optional[float] = None
    rice_score: Optional[float] = None
    moscow_value: Optional[MoscowValue] = None
    ease: Optional[float] = None
    ice_score: Optional[float] = None
    urgency: Optional[float] = None
    importance: Optional[float] = None
    eisenhower_score: Optional[float] = None
    quadrant: Optional[str] = None
    business_value: Optional[float] = None
    time_criticality: Optional[float] = None
    risk_reduction: Optional[float] = None
    job_size: Optional[float] = None
    wsjf_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class QuarterPrioritizationCreate(BaseModel):
    company_id: int
    product_id: str
    roadmap_item_id: str
    fiscal_year: int
    quarter: str
    priority_rank: Optional[int] = None
    planning_status: str = "candidate"
    business_value: float = 0.0
    strategic_alignment: float = 0.0
    urgency: float = 0.0
    dependency_readiness: float = 0.0
    delivery_risk: float = 0.0
    confidence: float = 0.0
    estimated_effort: float = 0.0
    planned_capacity_share: Optional[float] = None
    quarter_score: float = 0.0
    decision_rationale: Optional[str] = None
    notes: Optional[str] = None


class QuarterPrioritizationUpdate(BaseModel):
    fiscal_year: Optional[int] = None
    quarter: Optional[str] = None
    priority_rank: Optional[int] = None
    planning_status: Optional[str] = None
    business_value: Optional[float] = None
    strategic_alignment: Optional[float] = None
    urgency: Optional[float] = None
    dependency_readiness: Optional[float] = None
    delivery_risk: Optional[float] = None
    confidence: Optional[float] = None
    estimated_effort: Optional[float] = None
    planned_capacity_share: Optional[float] = None
    quarter_score: Optional[float] = None
    decision_rationale: Optional[str] = None
    notes: Optional[str] = None


class QuarterPrioritizationOut(BaseModel):
    id: str
    company_id: int
    product_id: str
    roadmap_item_id: str
    roadmap_title: Optional[str] = None
    fiscal_year: int
    quarter: str
    priority_rank: Optional[int] = None
    planning_status: str
    business_value: float
    strategic_alignment: float
    urgency: float
    dependency_readiness: float
    delivery_risk: float
    confidence: float
    estimated_effort: float
    planned_capacity_share: Optional[float] = None
    quarter_score: float
    decision_rationale: Optional[str] = None
    notes: Optional[str] = None
    fiscal_year_start_month: int = 1
    created_at: datetime
    updated_at: datetime


def _normalize_item_type(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return str(value).strip().lower().replace(" ", "_").replace("-", "_")


def _infer_item_type_from_backlog(item: BacklogItem, item_type_name: Optional[str]) -> Optional[str]:
    enabler_type = (item.enabler_type or "").strip().lower()
    backlog_type_name = (item_type_name or "").strip().lower()
    ado_type = (item.ado_work_item_type or "").strip().lower()
    raw_type = enabler_type or backlog_type_name or ado_type

    if not raw_type:
        return None

    if enabler_type and "enabler" in enabler_type:
        return "enabler"
    if "user story" in backlog_type_name or backlog_type_name == "user_story":
        return "user_story"
    if "user story" in ado_type or ado_type == "user_story":
        return "user_story"
    if "enabler" in backlog_type_name:
        return "enabler"
    if "enabler" in ado_type:
        return "enabler"
    if enabler_type and "business" in enabler_type and ("user story" in backlog_type_name or "user story" in ado_type):
        return "user_story"
    if enabler_type and any(key in enabler_type for key in ["architectural", "compliance", "infrastructure", "security", "foundation"]):
        return "enabler"
    if "task" in raw_type:
        return "task"
    if "bug" in raw_type:
        return "urgent_issue"
    if "feature" in raw_type:
        return "feature"
    if "epic" in raw_type:
        return "epic"
    return raw_type.replace(" ", "_").replace("-", "_")


def _serialize_item(item, method: PriorityMethod) -> PrioritizationOut:
    return PrioritizationOut(
        id=item.id,
        product_id=item.product_id,
        backlog_item_id=getattr(item, "backlog_item_id", None),
        source_type=item.source_type,
        source_id=getattr(item, "source_id", None),
        item_type=getattr(item, "item_type", None),
        title=item.title,
        description=getattr(item, "description", None),
        priority_method=method,
        reach=getattr(item, "reach", None),
        impact=getattr(item, "impact", None),
        confidence=getattr(item, "confidence", None),
        effort=getattr(item, "effort", None),
        rice_score=getattr(item, "rice_score", None),
        moscow_value=getattr(item, "moscow_value", None),
        ease=getattr(item, "ease", None),
        ice_score=getattr(item, "ice_score", None),
        urgency=getattr(item, "urgency", None),
        importance=getattr(item, "importance", None),
        eisenhower_score=getattr(item, "eisenhower_score", None),
        quadrant=getattr(item, "quadrant", None),
        business_value=getattr(item, "business_value", None),
        time_criticality=getattr(item, "time_criticality", None),
        risk_reduction=getattr(item, "risk_reduction", None),
        job_size=getattr(item, "job_size", None),
        wsjf_score=getattr(item, "wsjf_score", None),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _serialize_quarter_item(
    item: QuarterPrioritizationItem,
    roadmap_title: Optional[str],
    fiscal_year_start_month: int,
) -> QuarterPrioritizationOut:
    return QuarterPrioritizationOut(
        id=str(item.id),
        company_id=int(item.company_id),
        product_id=str(item.product_id),
        roadmap_item_id=str(item.roadmap_item_id),
        roadmap_title=roadmap_title,
        fiscal_year=item.fiscal_year,
        quarter=item.quarter,
        priority_rank=item.priority_rank,
        planning_status=item.planning_status,
        business_value=item.business_value,
        strategic_alignment=item.strategic_alignment,
        urgency=item.urgency,
        dependency_readiness=item.dependency_readiness,
        delivery_risk=item.delivery_risk,
        confidence=item.confidence,
        estimated_effort=item.estimated_effort,
        planned_capacity_share=item.planned_capacity_share,
        quarter_score=item.quarter_score,
        decision_rationale=item.decision_rationale,
        notes=item.notes,
        fiscal_year_start_month=fiscal_year_start_month,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _get_model(method: PriorityMethod):
    model = METHOD_MODEL_MAP.get(method)
    if not model:
        raise HTTPException(status_code=400, detail=f"Unsupported prioritization method: {method}")
    return model


def _ensure_method_items(db: Session, product_id: Optional[str], method: PriorityMethod) -> None:
    if not product_id:
        return

    try:
        normalized_product_id = int(str(product_id))
    except Exception:
        return

    model = _get_model(method)
    type_rows = db.query(BacklogItemType).all()
    type_name_map = {row.item_type_id: row.name for row in type_rows}

    backlog_items = db.query(BacklogItem).filter(BacklogItem.product_id == normalized_product_id).all()
    roadmap_items = db.query(RoadmapItem).filter(RoadmapItem.product_id == str(product_id)).all()
    existing_items = db.query(model).filter(model.product_id == str(product_id)).all()

    existing_backlog_map = {
        item.backlog_item_id: item
        for item in existing_items
        if getattr(item, "backlog_item_id", None) is not None
    }
    existing_source_map = {
        (item.source_type, item.source_id): item
        for item in existing_items
        if item.source_type and getattr(item, "source_id", None)
    }

    changed = False

    for backlog_item in backlog_items:
        item_type_name = type_name_map.get(backlog_item.item_type_id)
        normalized_item_type = _infer_item_type_from_backlog(backlog_item, item_type_name)
        if not normalized_item_type:
            continue

        source_id = backlog_item.ado_id or str(backlog_item.item_id)

        is_compatible = {
            PriorityMethod.RICE: normalized_item_type in {"initiative", "epic", "feature", "opportunity"},
            PriorityMethod.ICE: normalized_item_type in {"hypothesis", "experiment", "quick_win"},
            PriorityMethod.MOSCOW: normalized_item_type in {"user_story", "enabler", "sprint_item"},
            PriorityMethod.EISENHOWER: normalized_item_type in {"task", "urgent_issue", "action"},
            PriorityMethod.WSJF: normalized_item_type in {"user_story", "enabler"},
        }[method]

        if not is_compatible:
            continue

        existing = existing_backlog_map.get(backlog_item.item_id)
        if existing:
            existing.title = backlog_item.title
            existing.description = backlog_item.description
            existing.item_type = normalized_item_type
            existing.source_type = "backlog"
            existing.source_id = source_id
            if method == PriorityMethod.WSJF:
                existing.business_value = float(backlog_item.wsjf_business_value or 0)
                existing.time_criticality = float(backlog_item.wsjf_time_criticality or 0)
                existing.risk_reduction = float(backlog_item.wsjf_risk_reduction or 0)
                existing.job_size = float(backlog_item.wsjf_job_size or 0)
                existing.wsjf_score = float(backlog_item.wsjf_score or 0)
            changed = True
            continue

        payload = dict(
            product_id=str(product_id),
            backlog_item_id=backlog_item.item_id,
            source_type="backlog",
            source_id=source_id,
            item_type=normalized_item_type,
            title=backlog_item.title,
            description=backlog_item.description,
        )

        if method == PriorityMethod.RICE:
            payload.update(reach=0.0, impact=0.0, confidence=0.0, effort=1.0, rice_score=0.0)
        elif method == PriorityMethod.ICE:
            payload.update(impact=0.0, confidence=0.0, ease=1.0, ice_score=0.0)
        elif method == PriorityMethod.MOSCOW:
            payload.update(moscow_value=None)
        elif method == PriorityMethod.EISENHOWER:
            payload.update(urgency=0.0, importance=0.0, eisenhower_score=0.0, quadrant=None)
        elif method == PriorityMethod.WSJF:
            payload.update(
                business_value=float(backlog_item.wsjf_business_value or 0),
                time_criticality=float(backlog_item.wsjf_time_criticality or 0),
                risk_reduction=float(backlog_item.wsjf_risk_reduction or 0),
                job_size=float(backlog_item.wsjf_job_size or 0),
                wsjf_score=float(backlog_item.wsjf_score or 0),
            )

        db.add(model(**payload))
        changed = True

    if method == PriorityMethod.RICE:
        for roadmap_item in roadmap_items:
            source_id = roadmap_item.id
            existing = existing_source_map.get(("roadmap", source_id))
            if existing:
                existing.title = roadmap_item.title
                existing.description = roadmap_item.description
                existing.item_type = "initiative"
                existing.source_type = "roadmap"
                existing.source_id = source_id
                changed = True
                continue

            db.add(
                model(
                    product_id=str(product_id),
                    backlog_item_id=None,
                    source_type="roadmap",
                    source_id=source_id,
                    item_type="initiative",
                    title=roadmap_item.title,
                    description=roadmap_item.description,
                    reach=0.0,
                    impact=0.0,
                    confidence=0.0,
                    effort=1.0,
                    rice_score=0.0,
                )
            )
            changed = True

    if changed:
        db.commit()


@router.post("/quarter/items", response_model=QuarterPrioritizationOut, status_code=status.HTTP_201_CREATED)
def create_quarter_item(body: QuarterPrioritizationCreate, db: Session = Depends(get_db)):
    payload = body.model_dump()
    payload["quarter"] = payload["quarter"].upper()

    existing = db.query(QuarterPrioritizationItem).filter(
        QuarterPrioritizationItem.company_id == payload["company_id"],
        QuarterPrioritizationItem.product_id == str(payload["product_id"]),
        QuarterPrioritizationItem.roadmap_item_id == payload["roadmap_item_id"],
        QuarterPrioritizationItem.fiscal_year == payload["fiscal_year"],
        QuarterPrioritizationItem.quarter == payload["quarter"],
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Quarter prioritization item already exists")

    obj = QuarterPrioritizationItem(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    roadmap = db.query(RoadmapItem).filter(RoadmapItem.id == str(obj.roadmap_item_id)).first()
    company = db.query(Company).filter(Company.id == obj.company_id).first()
    return _serialize_quarter_item(
        obj,
        getattr(roadmap, "title", None),
        getattr(company, "fiscal_year_start_month", 1) or 1,
    )


@router.patch("/quarter/items/{id}", response_model=QuarterPrioritizationOut)
def update_quarter_item(id: str, body: QuarterPrioritizationUpdate, db: Session = Depends(get_db)):
    current = db.query(QuarterPrioritizationItem).filter(QuarterPrioritizationItem.id == id).first()
    if not current:
        raise HTTPException(status_code=404, detail="Quarter prioritization item not found")

    data = body.model_dump(exclude_unset=True)
    if "quarter" in data and data["quarter"]:
        data["quarter"] = str(data["quarter"]).upper()

    for key, value in data.items():
        setattr(current, key, value)

    db.commit()
    db.refresh(current)

    roadmap = db.query(RoadmapItem).filter(RoadmapItem.id == str(current.roadmap_item_id)).first()
    company = db.query(Company).filter(Company.id == current.company_id).first()
    return _serialize_quarter_item(
        current,
        getattr(roadmap, "title", None),
        getattr(company, "fiscal_year_start_month", 1) or 1,
    )


@router.delete("/quarter/items/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quarter_item(id: str, db: Session = Depends(get_db)):
    current = db.query(QuarterPrioritizationItem).filter(QuarterPrioritizationItem.id == id).first()
    if not current:
        raise HTTPException(status_code=404, detail="Quarter prioritization item not found")
    db.delete(current)
    db.commit()


@router.get("/quarter/items", response_model=Paginated)
def list_quarter_items(
    page: int = 1,
    size: int = 20,
    product_id: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    quarter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(QuarterPrioritizationItem)
    if product_id:
        query = query.filter(QuarterPrioritizationItem.product_id == str(product_id))
    if fiscal_year is not None:
        query = query.filter(QuarterPrioritizationItem.fiscal_year == fiscal_year)
    if quarter:
        query = query.filter(QuarterPrioritizationItem.quarter == quarter.upper())

    total = query.count()
    rows = (
        query.order_by(
            QuarterPrioritizationItem.fiscal_year.desc(),
            QuarterPrioritizationItem.quarter.asc(),
            QuarterPrioritizationItem.priority_rank.asc().nullslast(),
            QuarterPrioritizationItem.updated_at.desc(),
        )
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    roadmap_ids = [str(row.roadmap_item_id) for row in rows]
    roadmap_map = (
        {
            str(item.id): item.title
            for item in db.query(RoadmapItem).filter(RoadmapItem.id.in_(roadmap_ids)).all()
        }
        if roadmap_ids
        else {}
    )

    company_ids = list({row.company_id for row in rows})
    company_map = (
        {
            company.id: getattr(company, "fiscal_year_start_month", 1) or 1
            for company in db.query(Company).filter(Company.id.in_(company_ids)).all()
        }
        if company_ids
        else {}
    )

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [
            _serialize_quarter_item(
                row,
                roadmap_map.get(str(row.roadmap_item_id)),
                company_map.get(row.company_id, 1),
            ).model_dump()
            for row in rows
        ],
    }


@router.get("/{method}", response_model=Paginated)
def list_items(
    method: PriorityMethod,
    page: int = 1,
    size: int = 20,
    product_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    model = _get_model(method)
    _ensure_method_items(db, product_id, method)

    query = db.query(model)
    if product_id:
        query = query.filter(model.product_id == str(product_id))

    total = query.count()
    items = query.order_by(model.updated_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [_serialize_item(item, method).model_dump() for item in items],
    }


@router.post("/{method}", response_model=PrioritizationOut, status_code=status.HTTP_201_CREATED)
def create_item(method: PriorityMethod, body: PrioritizationCreate, db: Session = Depends(get_db)):
    model = _get_model(method)
    data = body.model_dump()
    data["item_type"] = _normalize_item_type(data.get("item_type"))
    data.pop("priority_method", None)

    if method == PriorityMethod.RICE:
        obj = model(
            product_id=data["product_id"],
            backlog_item_id=data.get("backlog_item_id"),
            source_type=data.get("source_type", "manual"),
            source_id=data.get("source_id"),
            item_type=data.get("item_type"),
            title=data["title"],
            description=data.get("description"),
            reach=data.get("reach", 0.0),
            impact=data.get("impact", 0.0),
            confidence=data.get("confidence", 0.0),
            effort=data.get("effort", 1.0),
            rice_score=data.get("rice_score", 0.0),
        )
    elif method == PriorityMethod.ICE:
        obj = model(
            product_id=data["product_id"],
            backlog_item_id=data.get("backlog_item_id"),
            source_type=data.get("source_type", "manual"),
            source_id=data.get("source_id"),
            item_type=data.get("item_type"),
            title=data["title"],
            description=data.get("description"),
            impact=data.get("impact", 0.0),
            confidence=data.get("confidence", 0.0),
            ease=data.get("ease", 1.0),
            ice_score=data.get("ice_score", 0.0),
        )
    elif method == PriorityMethod.MOSCOW:
        obj = model(
            product_id=data["product_id"],
            backlog_item_id=data.get("backlog_item_id"),
            source_type=data.get("source_type", "manual"),
            source_id=data.get("source_id"),
            item_type=data.get("item_type"),
            title=data["title"],
            description=data.get("description"),
            moscow_value=data.get("moscow_value"),
        )
    elif method == PriorityMethod.EISENHOWER:
        obj = model(
            product_id=data["product_id"],
            backlog_item_id=data.get("backlog_item_id"),
            source_type=data.get("source_type", "manual"),
            source_id=data.get("source_id"),
            item_type=data.get("item_type"),
            title=data["title"],
            description=data.get("description"),
            urgency=data.get("urgency", 0.0),
            importance=data.get("importance", 0.0),
            eisenhower_score=data.get("eisenhower_score", 0.0),
            quadrant=data.get("quadrant"),
        )
    else:
        obj = model(
            product_id=data["product_id"],
            backlog_item_id=data.get("backlog_item_id"),
            source_type=data.get("source_type", "manual"),
            source_id=data.get("source_id"),
            item_type=data.get("item_type"),
            title=data["title"],
            description=data.get("description"),
            business_value=data.get("business_value", 0.0),
            time_criticality=data.get("time_criticality", 0.0),
            risk_reduction=data.get("risk_reduction", 0.0),
            job_size=data.get("job_size", 1.0),
            wsjf_score=data.get("wsjf_score", 0.0),
        )

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _serialize_item(obj, method)


@router.patch("/{method}/{id}", response_model=PrioritizationOut)
def update_item(method: PriorityMethod, id: str, body: PrioritizationUpdate, db: Session = Depends(get_db)):
    model = _get_model(method)
    current = db.query(model).filter(model.id == id).first()
    if not current:
        raise HTTPException(status_code=404, detail="Prioritization item not found")

    data = body.model_dump(exclude_unset=True)
    if "item_type" in data:
        data["item_type"] = _normalize_item_type(data.get("item_type"))

    for key, value in data.items():
        setattr(current, key, value)

    db.commit()
    db.refresh(current)
    return _serialize_item(current, method)


@router.delete("/{method}/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(method: PriorityMethod, id: str, db: Session = Depends(get_db)):
    model = _get_model(method)
    current = db.query(model).filter(model.id == id).first()
    if not current:
        raise HTTPException(status_code=404, detail="Prioritization item not found")
    db.delete(current)
    db.commit()
