import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.backlog import BacklogItem
from app.models.risk import Risk, RiskLink, RiskLinkType, RiskStatus
from app.models.roadmap import RoadmapItem
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated


class RiskLinkPayload(BaseModel):
    entity_type: RiskLinkType
    entity_id: str


class RiskLinkOut(BaseModel):
    entity_type: RiskLinkType
    entity_id: str
    label: Optional[str] = None


class RiskCreate(BaseModel):
    product_id: str
    discovery_opportunity_id: Optional[str] = None
    domain_id: Optional[int] = None
    subdomain_id: Optional[int] = None
    requirement_id: Optional[int] = None
    category: Optional[str] = None
    responsible: Optional[str] = None
    links: List[RiskLinkPayload] = []
    title: str
    description: Optional[str] = None
    probability: int = Field(default=1, ge=1, le=5)
    impact: int = Field(default=1, ge=1, le=5)
    status: RiskStatus = RiskStatus.identified
    mitigation_plan: Optional[str] = None


class RiskUpdate(BaseModel):
    product_id: Optional[str] = None
    discovery_opportunity_id: Optional[str] = None
    domain_id: Optional[int] = None
    subdomain_id: Optional[int] = None
    requirement_id: Optional[int] = None
    category: Optional[str] = None
    responsible: Optional[str] = None
    links: Optional[List[RiskLinkPayload]] = None
    title: Optional[str] = None
    description: Optional[str] = None
    probability: Optional[int] = Field(default=None, ge=1, le=5)
    impact: Optional[int] = Field(default=None, ge=1, le=5)
    status: Optional[RiskStatus] = None
    mitigation_plan: Optional[str] = None


class RiskOut(BaseModel):
    id: str
    product_id: str
    discovery_opportunity_id: Optional[str] = None
    domain_id: Optional[int] = None
    subdomain_id: Optional[int] = None
    requirement_id: Optional[int] = None
    category: Optional[str] = None
    responsible: Optional[str] = None
    title: str
    description: Optional[str] = None
    probability: int
    impact: int
    risk_score: int
    status: RiskStatus
    mitigation_plan: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    links: List[RiskLinkOut] = []

    class Config:
        from_attributes = True


router = APIRouter()
logger = logging.getLogger(__name__)


def _scope_present(data: dict) -> bool:
    return any(
        data.get(k) is not None
        for k in ("product_id", "domain_id", "subdomain_id", "requirement_id", "discovery_opportunity_id")
    ) or bool(data.get("links"))


def _normalize_product_id(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _validate_link(payload: RiskLinkPayload, db: Session) -> Optional[str]:
    entity_id = str(payload.entity_id).strip()
    if not entity_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "entity_id is required")

    if payload.entity_type == RiskLinkType.roadmap:
        item = db.get(RoadmapItem, entity_id)
        if not item:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Roadmap item not found: {entity_id}")
        return item.title

    if payload.entity_type == RiskLinkType.backlog:
        try:
            backlog_id = int(entity_id)
        except ValueError:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid backlog item id: {entity_id}")
        item = db.get(BacklogItem, backlog_id)
        if not item:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Backlog item not found: {entity_id}")
        return item.title

    if payload.entity_type == RiskLinkType.decision:
        return None

    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unsupported link type: {payload.entity_type}")


def _normalize_links(links: List[RiskLinkPayload]) -> List[RiskLinkPayload]:
    unique: List[RiskLinkPayload] = []
    seen = set()
    for link in links:
        entity_id = str(link.entity_id).strip()
        key = (link.entity_type.value, entity_id)
        if not entity_id or key in seen:
            continue
        seen.add(key)
        unique.append(RiskLinkPayload(entity_type=link.entity_type, entity_id=entity_id))
    return unique


def _replace_links(risk_id: str, links: List[RiskLinkPayload], db: Session) -> None:
    normalized = _normalize_links(links)
    for link in normalized:
        _validate_link(link, db)
    db.query(RiskLink).filter(RiskLink.risk_id == risk_id).delete()
    for link in normalized:
        db.add(RiskLink(risk_id=risk_id, entity_type=link.entity_type.value, entity_id=str(link.entity_id).strip()))
    db.commit()


def _serialize_links(risk_id: str, db: Session) -> List[RiskLinkOut]:
    rows = db.query(RiskLink).filter(RiskLink.risk_id == risk_id).order_by(RiskLink.entity_type.asc(), RiskLink.id.asc()).all()
    result: List[RiskLinkOut] = []
    for row in rows:
        try:
            entity_type = RiskLinkType(row.entity_type)
        except ValueError:
            logger.warning("Ignoring unsupported risk link type '%s' for risk_id=%s", row.entity_type, risk_id)
            continue

        label = None
        if entity_type == RiskLinkType.roadmap:
            item = db.get(RoadmapItem, row.entity_id)
            label = item.title if item else None
        elif entity_type == RiskLinkType.backlog:
            try:
                item = db.get(BacklogItem, int(row.entity_id))
                label = item.title if item else None
            except ValueError:
                label = None

        result.append(RiskLinkOut(entity_type=entity_type, entity_id=row.entity_id, label=label))
    return result


def _serialize_risk(item: Risk, db: Session) -> RiskOut:
    try:
        status_value = RiskStatus(item.status) if item.status is not None else RiskStatus.identified
    except ValueError:
        logger.warning("Invalid risk status '%s' for risk_id=%s; defaulting to identified", item.status, item.id)
        status_value = RiskStatus.identified

    return RiskOut(
        id=str(item.id),
        product_id=str(item.product_id),
        discovery_opportunity_id=str(item.discovery_opportunity_id) if item.discovery_opportunity_id is not None else None,
        domain_id=item.domain_id,
        subdomain_id=item.subdomain_id,
        requirement_id=item.requirement_id,
        category=item.category,
        responsible=item.responsible,
        title=item.title or "",
        description=item.description,
        probability=item.probability or 1,
        impact=item.impact or 1,
        risk_score=item.risk_score or ((item.probability or 1) * (item.impact or 1)),
        status=status_value,
        mitigation_plan=item.mitigation_plan,
        created_at=item.created_at or item.updated_at or datetime.utcnow(),
        updated_at=item.updated_at or item.created_at or datetime.utcnow(),
        links=_serialize_links(item.id, db),
    )


@router.get("")
def list_risks(
    page: int = 1,
    size: int = 20,
    product_id: Optional[str] = None,
    domain_id: Optional[int] = None,
    subdomain_id: Optional[int] = None,
    requirement_id: Optional[int] = None,
    discovery_opportunity_id: Optional[str] = None,
    roadmap_item_id: Optional[str] = None,
    backlog_item_id: Optional[int] = None,
    risk_status: Optional[RiskStatus] = None,  # renamed to avoid shadowing `fastapi.status`
    db: Session = Depends(get_db),
):
    repo = BaseRepository(Risk, db)
    filters = {
        "product_id": _normalize_product_id(product_id),
        "domain_id": domain_id,
        "subdomain_id": subdomain_id,
        "requirement_id": requirement_id,
        "discovery_opportunity_id": discovery_opportunity_id,
        "status": risk_status,
    }
    filters = {k: v for k, v in filters.items() if v is not None}

    try:
        total, items = repo.list(skip=(page - 1) * size, limit=size, **filters)
    except Exception:
        logger.exception("Failed to list risks with filters=%s", filters)
        if "product_id" in filters:
            logger.warning("Retrying /risks without product_id filter due to possible legacy schema mismatch")
            retry_filters = {k: v for k, v in filters.items() if k != "product_id"}
            total, items = repo.list(skip=(page - 1) * size, limit=size, **retry_filters)
            normalized_product_id = filters["product_id"]
            items = [item for item in items if str(item.product_id) == normalized_product_id]
            total = len(items)
        else:
            raise

    if roadmap_item_id or backlog_item_id is not None:
        filtered_items = []
        for item in items:
            links = _serialize_links(item.id, db)
            if roadmap_item_id and any(link.entity_type == RiskLinkType.roadmap and link.entity_id == roadmap_item_id for link in links):
                filtered_items.append(item)
                continue
            if backlog_item_id is not None and any(link.entity_type == RiskLinkType.backlog and link.entity_id == str(backlog_item_id) for link in links):
                filtered_items.append(item)
        items = filtered_items
        total = len(filtered_items)

    try:
        serialized_items = [_serialize_risk(i, db) for i in items]
        from fastapi.responses import JSONResponse as _JSONResponse
        from fastapi.encoders import jsonable_encoder as _enc
        return _JSONResponse(content=_enc({
            "total": total,
            "page": page,
            "size": size,
            "items": serialized_items,
        }))
    except Exception as exc:
        logger.exception("Risk list serialization failed: %s", exc)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Risk serialization failed: {type(exc).__name__}: {exc}",
        )


@router.post("", response_model=RiskOut, status_code=status.HTTP_201_CREATED)
def create_risk(body: RiskCreate, db: Session = Depends(get_db)):
    payload = body.model_dump(exclude={"links"})
    payload["product_id"] = _normalize_product_id(payload.get("product_id"))
    if not _scope_present({**body.model_dump(), "product_id": payload.get("product_id")}):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "At least one scope field or link must be provided.")
    payload["risk_score"] = payload["probability"] * payload["impact"]
    item = BaseRepository(Risk, db).create(payload)
    if body.links:
        _replace_links(item.id, body.links, db)
        item = BaseRepository(Risk, db).get_or_404(item.id)
    return _serialize_risk(item, db)


@router.get("/{id}", response_model=RiskOut)
def get_risk(id: str, db: Session = Depends(get_db)):
    item = BaseRepository(Risk, db).get_or_404(id)
    return _serialize_risk(item, db)


@router.patch("/{id}", response_model=RiskOut)
def update_risk(id: str, body: RiskUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(Risk, db)
    obj = repo.get_or_404(id)
    data = body.model_dump(exclude_unset=True, exclude={"links"})

    if "product_id" in data:
        data["product_id"] = _normalize_product_id(data.get("product_id"))

    if "probability" in data or "impact" in data:
        p = data.get("probability", obj.probability)
        i = data.get("impact", obj.impact)
        data["risk_score"] = p * i

    obj = repo.update(obj, data) if data else obj

    if body.links is not None:
        if not _scope_present({**obj.__dict__, "links": body.links}):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "At least one scope field or link must be provided.")
        _replace_links(id, body.links, db)
        obj = repo.get_or_404(id)

    return _serialize_risk(obj, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_risk(id: str, db: Session = Depends(get_db)):
    repo = BaseRepository(Risk, db)
    repo.delete(repo.get_or_404(id))
