from typing import Optional, List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.roadmap import RoadmapItem, RoadmapItemType, RoadmapItemStatus, RoadmapExecutiveStatus, RoadmapBacklogLink
from app.models.backlog import BacklogItem, BacklogItemType, BacklogItemLink, Sprint
from app.models.team_member import TeamMember
from app.models.requirement import Requirement
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import datetime

class RoadmapBacklogRef(BaseModel):
    item_id: int
    title: str
    description: Optional[str] = None
    current_status: str
    item_type_id: Optional[int] = None
    item_type_name: Optional[str] = None
    ado_id: Optional[str] = None
    assigned_to_member_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    start_sprint_id: Optional[int] = None
    start_sprint_name: Optional[str] = None
    start_sprint_date: Optional[datetime] = None
    end_sprint_id: Optional[int] = None
    end_sprint_name: Optional[str] = None
    end_sprint_date: Optional[datetime] = None
    dependency_summary: List[str] = []
    executive_summary: Optional[str] = None
    executive_next_step: Optional[str] = None
    attention_flag: bool = False
    attention_reason: Optional[str] = None
    executive_updated_at: Optional[datetime] = None
    executive_updated_by: Optional[str] = None
    display_order: Optional[int] = None
    class Config: from_attributes = True

class RoadmapBacklogExecutiveUpdate(BaseModel):
    backlog_item_id: int
    executive_summary: Optional[str] = None
    executive_next_step: Optional[str] = None
    attention_flag: Optional[bool] = None
    attention_reason: Optional[str] = None
    executive_updated_at: Optional[datetime] = None
    executive_updated_by: Optional[str] = None
    display_order: Optional[int] = None

class RoadmapCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    item_type_id:Optional[int]=None
    backlog_item_ids: List[int] = []
    type:RoadmapItemType=RoadmapItemType.strategic_initiative; status:RoadmapItemStatus=RoadmapItemStatus.planned
    start_date:Optional[datetime]=None; end_date:Optional[datetime]=None; quarter:Optional[str]=None
    executive_status:RoadmapExecutiveStatus=RoadmapExecutiveStatus.not_started
    executive_summary:Optional[str]=None
    executive_risk_dependency:Optional[str]=None
    executive_next_step:Optional[str]=None
    executive_owner_name:Optional[str]=None
    owner_member_id:Optional[int]=None
    sponsor_stakeholder_id:Optional[int]=None
    primary_company_area_id:Optional[int]=None
    attention_flag:bool=False
    attention_reason:Optional[str]=None
    executive_updated_at:Optional[datetime]=None
    executive_updated_by:Optional[str]=None

class RoadmapUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None
    item_type_id:Optional[int]=None; type:Optional[RoadmapItemType]=None
    backlog_item_ids: Optional[List[int]] = None
    status:Optional[RoadmapItemStatus]=None; start_date:Optional[datetime]=None
    end_date:Optional[datetime]=None; quarter:Optional[str]=None
    executive_status:Optional[RoadmapExecutiveStatus]=None
    executive_summary:Optional[str]=None
    executive_risk_dependency:Optional[str]=None
    executive_next_step:Optional[str]=None
    executive_owner_name:Optional[str]=None
    owner_member_id:Optional[int]=None
    sponsor_stakeholder_id:Optional[int]=None
    primary_company_area_id:Optional[int]=None
    attention_flag:Optional[bool]=None
    attention_reason:Optional[str]=None
    executive_updated_at:Optional[datetime]=None
    executive_updated_by:Optional[str]=None

class RoadmapOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    item_type_id:Optional[int]=None
    type:Optional[RoadmapItemType]=None; status:RoadmapItemStatus; start_date:Optional[datetime]=None
    end_date:Optional[datetime]=None; quarter:Optional[str]=None
    executive_status:RoadmapExecutiveStatus=RoadmapExecutiveStatus.not_started
    executive_summary:Optional[str]=None
    executive_risk_dependency:Optional[str]=None
    executive_next_step:Optional[str]=None
    executive_owner_name:Optional[str]=None
    owner_member_id:Optional[int]=None
    sponsor_stakeholder_id:Optional[int]=None
    primary_company_area_id:Optional[int]=None
    attention_flag:bool=False
    attention_reason:Optional[str]=None
    executive_updated_at:Optional[datetime]=None
    executive_updated_by:Optional[str]=None
    created_at:datetime; updated_at:datetime
    backlog_items: List[RoadmapBacklogRef] = []
    class Config: from_attributes=True

class RoadmapLinkUpdate(BaseModel):
    backlog_item_ids: List[int]

class RoadmapBacklogExecutiveBulkUpdate(BaseModel):
    items: List[RoadmapBacklogExecutiveUpdate]

class RoadmapRequirementRef(BaseModel):
    id: int
    requirement_code: str
    requirement_title: str
    requirement_description: str
    requirement_type: str
    requirement_source: Optional[str] = None
    priority: str
    lifecycle_status: str
    fulfillment_status: str
    requirement_owner: Optional[str] = None

    class Config: from_attributes = True

class RoadmapRequirementCreate(BaseModel):
    requirement_code: str
    requirement_title: str
    requirement_description: str
    requirement_type: str = "FUNCTIONAL"
    priority: str = "MEDIUM"
    lifecycle_status: str = "DRAFT"
    fulfillment_status: str = "NOT_STARTED"
    acceptance_definition: Optional[str] = None
    requirement_owner: Optional[str] = None

router = APIRouter()
VALID_EXECUTIVE_STATUSES = {status.value for status in RoadmapExecutiveStatus}

def _dependency_summary(item_id: int, db: Session) -> List[str]:
    result: List[str] = []

    outgoing = db.query(BacklogItemLink).filter(BacklogItemLink.source_id == item_id).all()
    for link in outgoing:
        target = db.get(BacklogItem, link.target_id)
        target_label = f"#{link.target_id}"
        if target:
            target_label = f"#{target.item_id} - {target.title}"
        result.append(f"{link.link_type}: {target_label}")

    incoming = db.query(BacklogItemLink).filter(BacklogItemLink.target_id == item_id).all()
    inverse_types = {
        "parent_of": "child_of",
        "child_of": "parent_of",
        "predecessor_of": "successor_of",
        "successor_of": "predecessor_of",
        "blocks": "blocked_by",
        "blocked_by": "blocks",
        "relates_to": "relates_to",
        "duplicates": "duplicates",
        "cloned_from": "cloned_from",
    }
    for link in incoming:
        source = db.get(BacklogItem, link.source_id)
        source_label = f"#{link.source_id}"
        if source:
            source_label = f"#{source.item_id} - {source.title}"
        result.append(f"{inverse_types.get(link.link_type, link.link_type)}: {source_label}")

    return result

def _to_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.combine(value, datetime.min.time())

def _load_backlog_refs(roadmap_item_id: str, db: Session) -> List[RoadmapBacklogRef]:
    links = db.query(RoadmapBacklogLink).filter(
        RoadmapBacklogLink.roadmap_item_id == roadmap_item_id
    ).order_by(RoadmapBacklogLink.display_order.asc().nullslast(), RoadmapBacklogLink.id.asc()).all()
    backlog_ids = [link.backlog_item_id for link in links]
    if not backlog_ids:
        return []
    items = db.query(BacklogItem).filter(BacklogItem.item_id.in_(backlog_ids)).all()
    item_map = {item.item_id: item for item in items}
    type_ids = {item.item_type_id for item in items if item.item_type_id}
    type_map = {}
    if type_ids:
        type_rows = db.query(BacklogItemType).filter(BacklogItemType.item_type_id.in_(type_ids)).all()
        type_map = {row.item_type_id: row.name for row in type_rows}

    assigned_member_ids = {item.assigned_to_member_id for item in items if item.assigned_to_member_id}
    assigned_map = {}
    if assigned_member_ids:
        member_rows = db.query(TeamMember).filter(TeamMember.member_id.in_(assigned_member_ids)).all()
        assigned_map = {row.member_id: row.full_name for row in member_rows}

    sprint_ids = {
        sprint_id
        for item in items
        for sprint_id in [item.start_sprint_id, item.end_sprint_id]
        if sprint_id
    }
    sprint_map = {}
    if sprint_ids:
        sprint_rows = db.query(Sprint).filter(Sprint.sprint_id.in_(sprint_ids)).all()
        sprint_map = {row.sprint_id: row for row in sprint_rows}

    result: List[RoadmapBacklogRef] = []
    for link in links:
        item = item_map.get(link.backlog_item_id)
        if not item:
            continue
        start_sprint = sprint_map.get(item.start_sprint_id) if item.start_sprint_id else None
        end_sprint = sprint_map.get(item.end_sprint_id) if item.end_sprint_id else None
        result.append(RoadmapBacklogRef(
            item_id=item.item_id,
            title=item.title,
            description=item.description,
            current_status=item.current_status,
            item_type_id=item.item_type_id,
            item_type_name=type_map.get(item.item_type_id) if item.item_type_id else None,
            ado_id=item.ado_id,
            assigned_to_member_id=item.assigned_to_member_id,
            assigned_to_name=assigned_map.get(item.assigned_to_member_id) if item.assigned_to_member_id else None,
            start_sprint_id=item.start_sprint_id,
            start_sprint_name=start_sprint.name if start_sprint else None,
            start_sprint_date=_to_datetime(start_sprint.start_date) if start_sprint else None,
            end_sprint_id=item.end_sprint_id,
            end_sprint_name=end_sprint.name if end_sprint else None,
            end_sprint_date=_to_datetime(end_sprint.end_date) if end_sprint else None,
            dependency_summary=_dependency_summary(item.item_id, db),
            executive_summary=link.executive_summary,
            executive_next_step=link.executive_next_step,
            attention_flag=bool(link.attention_flag),
            attention_reason=link.attention_reason,
            executive_updated_at=link.executive_updated_at,
            executive_updated_by=link.executive_updated_by,
            display_order=link.display_order,
        ))
    return result

def _serialize_item(item: RoadmapItem, db: Session) -> RoadmapOut:
    out = RoadmapOut.model_validate(item)
    out.backlog_items = _load_backlog_refs(item.id, db)
    return out

def _roadmap_requirement_source(roadmap_item: RoadmapItem) -> str:
    return f"ROADMAP|{roadmap_item.id}|{roadmap_item.title}"

def _load_roadmap_requirements(roadmap_item: RoadmapItem, db: Session) -> List[RoadmapRequirementRef]:
    source = _roadmap_requirement_source(roadmap_item)
    rows = (
        db.query(Requirement)
        .filter(
            Requirement.is_deleted == False,
            Requirement.requirement_source == source,
        )
        .order_by(Requirement.created_at.desc())
        .all()
    )
    return [RoadmapRequirementRef.model_validate(row) for row in rows]

def _replace_links(roadmap_item_id: str, backlog_item_ids: List[int], db: Session) -> None:
    unique_ids = list(dict.fromkeys(backlog_item_ids))
    if unique_ids:
        existing = db.query(BacklogItem).filter(BacklogItem.item_id.in_(unique_ids)).all()
        existing_ids = {item.item_id for item in existing}
        missing = [item_id for item_id in unique_ids if item_id not in existing_ids]
        if missing:
            raise ValueError(f"Itens de backlog não encontrados: {', '.join(str(i) for i in missing)}")
    existing_links = {
        link.backlog_item_id: link
        for link in db.query(RoadmapBacklogLink).filter(RoadmapBacklogLink.roadmap_item_id == roadmap_item_id).all()
    }
    db.query(RoadmapBacklogLink).filter(RoadmapBacklogLink.roadmap_item_id == roadmap_item_id).delete()
    for index, backlog_item_id in enumerate(unique_ids):
        previous = existing_links.get(backlog_item_id)
        db.add(RoadmapBacklogLink(
            roadmap_item_id=roadmap_item_id,
            backlog_item_id=backlog_item_id,
            executive_status=previous.executive_status if previous else None,
            executive_summary=previous.executive_summary if previous else None,
            executive_risk_dependency=previous.executive_risk_dependency if previous else None,
            executive_next_step=previous.executive_next_step if previous else None,
            executive_owner_name=previous.executive_owner_name if previous else None,
            committed_deadline=previous.committed_deadline if previous else None,
            attention_flag=bool(previous.attention_flag) if previous else False,
            attention_reason=previous.attention_reason if previous else None,
            executive_updated_at=previous.executive_updated_at if previous else None,
            executive_updated_by=previous.executive_updated_by if previous else None,
            display_order=previous.display_order if previous and previous.display_order is not None else index,
        ))
    db.commit()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,status:Optional[RoadmapItemStatus]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,status=status)
    return {"total":total,"page":page,"size":size,"items":[_serialize_item(i, db) for i in items]}

@router.post("",response_model=RoadmapOut,status_code=status.HTTP_201_CREATED)
def create_item(body:RoadmapCreate,db:Session=Depends(get_db)):
    data = body.model_dump(exclude={"backlog_item_ids"})
    item = BaseRepository(RoadmapItem,db).create(data)
    if body.backlog_item_ids:
        _replace_links(item.id, body.backlog_item_ids, db)
        item = BaseRepository(RoadmapItem,db).get_or_404(item.id)
    return _serialize_item(item, db)

@router.get("/backlog-options", response_model=List[RoadmapBacklogRef])
def list_backlog_options(product_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(BacklogItem)
    if product_id is not None and str(product_id).strip() != "":
        q = q.filter(BacklogItem.product_id == product_id)

    rows = q.order_by(BacklogItem.item_id.desc()).all()
    type_ids = {row.item_type_id for row in rows if row.item_type_id}
    type_map = {}
    if type_ids:
        type_rows = db.query(BacklogItemType).filter(BacklogItemType.item_type_id.in_(type_ids)).all()
        type_map = {row.item_type_id: row.name for row in type_rows}

    assigned_member_ids = {row.assigned_to_member_id for row in rows if row.assigned_to_member_id}
    assigned_map = {}
    if assigned_member_ids:
        member_rows = db.query(TeamMember).filter(TeamMember.member_id.in_(assigned_member_ids)).all()
        assigned_map = {row.member_id: row.full_name for row in member_rows}

    return [
        RoadmapBacklogRef(
            item_id=row.item_id,
            title=row.title,
            description=row.description,
            current_status=row.current_status,
            item_type_id=row.item_type_id,
            item_type_name=type_map.get(row.item_type_id) if row.item_type_id else None,
            ado_id=row.ado_id,
            assigned_to_member_id=row.assigned_to_member_id,
            assigned_to_name=assigned_map.get(row.assigned_to_member_id) if row.assigned_to_member_id else None,
            start_sprint_id=row.start_sprint_id,
            end_sprint_id=row.end_sprint_id,
            dependency_summary=_dependency_summary(row.item_id, db),
        )
        for row in rows
    ]

@router.get("/{id}",response_model=RoadmapOut)
def get_item(id:str,db:Session=Depends(get_db)):
    item = BaseRepository(RoadmapItem,db).get_or_404(id)
    return _serialize_item(item, db)

@router.patch("/{id}",response_model=RoadmapOut)
def update_item(id:str,body:RoadmapUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db)
    obj = repo.get_or_404(id)
    data = body.model_dump(exclude_unset=True, exclude={"backlog_item_ids"})
    obj = repo.update(obj,data) if data else obj
    if body.backlog_item_ids is not None:
        _replace_links(id, body.backlog_item_ids, db)
        obj = repo.get_or_404(id)
    return _serialize_item(obj, db)

@router.put("/{id}/backlog-links", response_model=RoadmapOut)
def replace_backlog_links(id: str, body: RoadmapLinkUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(RoadmapItem, db)
    obj = repo.get_or_404(id)
    _replace_links(id, body.backlog_item_ids, db)
    obj = repo.get_or_404(id)
    return _serialize_item(obj, db)

@router.put("/{id}/backlog-executive", response_model=RoadmapOut)
def update_backlog_executive_inputs(id: str, body: RoadmapBacklogExecutiveBulkUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(RoadmapItem, db)
    obj = repo.get_or_404(id)

    links = db.query(RoadmapBacklogLink).filter(RoadmapBacklogLink.roadmap_item_id == id).all()
    link_map = {link.backlog_item_id: link for link in links}

    for payload in body.items:
        link = link_map.get(payload.backlog_item_id)
        if not link:
            raise ValueError(f"Item de backlog {payload.backlog_item_id} não está mapeado a esta iniciativa")
        updates = payload.model_dump(exclude_unset=True, exclude={"backlog_item_id"})
        for field, value in updates.items():
            setattr(link, field, value)

    db.commit()
    obj = repo.get_or_404(id)
    return _serialize_item(obj, db)

@router.get("/{id}/requirements", response_model=List[RoadmapRequirementRef])
def list_roadmap_requirements(id: str, db: Session = Depends(get_db)):
    roadmap_item = BaseRepository(RoadmapItem, db).get_or_404(id)
    return _load_roadmap_requirements(roadmap_item, db)

@router.post("/{id}/requirements", response_model=RoadmapRequirementRef, status_code=status.HTTP_201_CREATED)
def create_roadmap_requirement(id: str, body: RoadmapRequirementCreate, db: Session = Depends(get_db)):
    roadmap_item = BaseRepository(RoadmapItem, db).get_or_404(id)

    existing = db.query(Requirement).filter(
        Requirement.is_deleted == False,
        Requirement.product_id == int(roadmap_item.product_id) if str(roadmap_item.product_id).isdigit() else None,
        Requirement.requirement_code == body.requirement_code,
    ).first()
    if existing:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requirement code already exists")

    req = Requirement(
        product_id=int(roadmap_item.product_id) if str(roadmap_item.product_id).isdigit() else None,
        requirement_code=body.requirement_code,
        requirement_title=body.requirement_title,
        requirement_description=body.requirement_description,
        requirement_type=body.requirement_type,
        requirement_source=_roadmap_requirement_source(roadmap_item),
        priority=body.priority,
        lifecycle_status=body.lifecycle_status,
        fulfillment_status=body.fulfillment_status,
        acceptance_definition=body.acceptance_definition,
        requirement_owner=body.requirement_owner,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return RoadmapRequirementRef.model_validate(req)

@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db)
    db.query(RoadmapBacklogLink).filter(RoadmapBacklogLink.roadmap_item_id == id).delete()
    db.commit()
    repo.delete(repo.get_or_404(id))
