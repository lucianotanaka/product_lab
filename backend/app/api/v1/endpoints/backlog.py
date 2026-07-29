from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.backlog import BacklogItem, BacklogItemType, BacklogItemSuggestion, BacklogItemNote, BacklogItemLink, Sprint
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import date, datetime

# ── Schemas ───────────────────────────────────────────────────────────────────

def calc_wsjf(bv: int, tc: int, rr: int, js: int) -> float:
    """WSJF = CoD / Job Size  (1 decimal place). CoD = BV + TC + RR."""
    cost_of_delay = bv + tc + rr
    if js <= 0:
        return 0.0
    return round(cost_of_delay / js, 1)

class BacklogItemCreate(BaseModel):
    product_id:                  Optional[int]  = None
    feature_id:                  Optional[int]  = None
    sprint_id:                   Optional[int]  = None
    start_sprint_id:             Optional[int]  = None
    end_sprint_id:               Optional[int]  = None
    requester_stakeholder_id:    Optional[int]  = None
    assigned_to_member_id:       Optional[int]  = None
    ado_id:                      Optional[str]  = None
    item_type_id:                Optional[int]  = None
    title:                       str
    description:                 Optional[str]  = None
    current_status:              str            = "open"
    business_value:              Optional[str]  = None
    acceptance_criteria:         Optional[str]  = None
    definition_of_done:          Optional[str]  = None
    business_rules:              Optional[str]  = None
    story_points:                Optional[int]  = None
    priority:                    int            = 3
    wsjf_business_value:         int            = 1
    wsjf_time_criticality:       int            = 1
    wsjf_risk_reduction:         int            = 1
    wsjf_job_size:               int            = 1

class BacklogItemUpdate(BaseModel):
    feature_id:                  Optional[int]  = None
    sprint_id:                   Optional[int]  = None
    start_sprint_id:             Optional[int]  = None
    end_sprint_id:               Optional[int]  = None
    requester_stakeholder_id:    Optional[int]  = None
    assigned_to_member_id:       Optional[int]  = None
    ado_id:                      Optional[str]  = None
    item_type_id:                Optional[int]  = None
    title:                       Optional[str]  = None
    description:                 Optional[str]  = None
    current_status:              Optional[str]  = None
    business_value:              Optional[str]  = None
    acceptance_criteria:         Optional[str]  = None
    definition_of_done:          Optional[str]  = None
    business_rules:              Optional[str]  = None
    story_points:                Optional[int]  = None
    priority:                    Optional[int]  = None
    completed_at:                Optional[datetime] = None
    wsjf_business_value:         Optional[int]  = None
    wsjf_time_criticality:       Optional[int]  = None
    wsjf_risk_reduction:         Optional[int]  = None
    wsjf_job_size:               Optional[int]  = None

class BacklogItemOut(BaseModel):
    item_id:                         int
    product_id:                      Optional[int]  = None
    feature_id:                      Optional[int]  = None
    sprint_id:                       Optional[int]  = None
    start_sprint_id:                 Optional[int]  = None
    end_sprint_id:                   Optional[int]  = None
    requester_stakeholder_id:        Optional[int]  = None
    assigned_to_member_id:           Optional[int]  = None
    ado_id:                          Optional[str]  = None
    item_type_id:                    Optional[int]  = None
    title:                           str
    description:                     Optional[str]  = None
    current_status:                  str
    business_value:                  Optional[str]  = None
    acceptance_criteria:             Optional[str]  = None
    definition_of_done:              Optional[str]  = None
    business_rules:                  Optional[str]  = None
    story_points:                    Optional[int]  = None
    priority:                        int            = 3
    wsjf_business_value:             int            = 1
    wsjf_time_criticality:           int            = 1
    wsjf_risk_reduction:             int            = 1
    wsjf_job_size:                   int            = 1
    wsjf_score:                      float          = 0.0
    created_at:                      datetime
    updated_at:                      datetime
    completed_at:                    Optional[datetime] = None
    class Config: from_attributes = True

class ItemTypeOut(BaseModel):
    item_type_id:  int
    name:          str
    description:   Optional[str] = None
    display_order: int           = 0
    is_active:     bool          = True
    class Config: from_attributes = True

class SprintCreate(BaseModel):
    product_id: int
    name:       str
    goal:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    status:     str            = "planned"
    capacity:   Optional[int]  = None
    velocity:   Optional[int]  = None

class SprintUpdate(BaseModel):
    name:       Optional[str]  = None
    goal:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    status:     Optional[str]  = None
    capacity:   Optional[int]  = None
    velocity:   Optional[int]  = None

class SprintOut(BaseModel):
    sprint_id:  int
    product_id: int
    name:       str
    goal:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    status:     str            = "planned"
    capacity:   Optional[int]  = None
    velocity:   Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

class SuggestionCreate(BaseModel):
    vpc_id:              Optional[int]  = None
    feature_id:          Optional[int]  = None
    suggested_type:      Optional[str]  = None
    title:               str
    description:         Optional[str]  = None
    rationale:           Optional[str]  = None
    acceptance_criteria: Optional[str]  = None

class SuggestionUpdate(BaseModel):
    status:      Optional[str]  = None
    reviewed_by: Optional[str]  = None
    reviewed_at: Optional[datetime] = None

class SuggestionOut(BaseModel):
    suggestion_id:       int
    vpc_id:              Optional[int]  = None
    feature_id:          Optional[int]  = None
    suggested_type:      Optional[str]  = None
    title:               str
    description:         Optional[str]  = None
    rationale:           Optional[str]  = None
    acceptance_criteria: Optional[str]  = None
    status:              str            = "pending"
    reviewed_by:         Optional[str]  = None
    reviewed_at:         Optional[datetime] = None
    created_at:          datetime
    class Config: from_attributes = True

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# NOTE: specific routes MUST be declared BEFORE the generic /{id} route.

# ── Item Types ────────────────────────────────────────────────────────────────

@router.get("/types/list", response_model=List[ItemTypeOut])
def list_types(db: Session = Depends(get_db)):
    types = db.query(BacklogItemType).filter(BacklogItemType.is_active == True)\
               .order_by(BacklogItemType.display_order).all()
    return [ItemTypeOut.model_validate(t) for t in types]


# ── Sprints ───────────────────────────────────────────────────────────────────

@router.get("/sprints", response_model=List[SprintOut])
def list_sprints(product_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Sprint)
    if product_id is not None:
        q = q.filter(Sprint.product_id == product_id)
    return [SprintOut.model_validate(s) for s in q.order_by(Sprint.sprint_id).all()]


@router.post("/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
def create_sprint(body: SprintCreate, db: Session = Depends(get_db)):
    return BaseRepository(Sprint, db).create(body.model_dump())


@router.patch("/sprints/{id}", response_model=SprintOut)
def update_sprint(id: int, body: SprintUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(Sprint, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


@router.delete("/sprints/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(Sprint, db)
    repo.delete(repo.get_or_404(id))


# ── Suggestions ───────────────────────────────────────────────────────────────

@router.get("/suggestions/list", response_model=Paginated)
def list_suggestions(page: int = 1, size: int = 20,
                     status: Optional[str] = None, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItemSuggestion, db)
    filters: dict = {}
    if status: filters["status"] = status
    total, items = repo.list(skip=(page - 1) * size, limit=size, **filters)
    return {"total": total, "page": page, "size": size,
            "items": [SuggestionOut.model_validate(i) for i in items]}


@router.post("/suggestions", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
def create_suggestion(body: SuggestionCreate, db: Session = Depends(get_db)):
    return BaseRepository(BacklogItemSuggestion, db).create(body.model_dump())


@router.patch("/suggestions/{id}", response_model=SuggestionOut)
def update_suggestion(id: int, body: SuggestionUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItemSuggestion, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


# ── Item Links ────────────────────────────────────────────────────────────────

LINK_LABELS = {
    "parent_of": "é pai de", "child_of": "é filho de",
    "predecessor_of": "predecessora de", "successor_of": "sucessora de",
    "blocks": "bloqueia", "blocked_by": "bloqueado por",
    "relates_to": "relacionado a", "duplicates": "duplicata de", "cloned_from": "clonado de",
}
INVERSE_TYPES = {
    "parent_of": "child_of", "child_of": "parent_of",
    "predecessor_of": "successor_of", "successor_of": "predecessor_of",
    "blocks": "blocked_by", "blocked_by": "blocks",
    "relates_to": "relates_to", "duplicates": "duplicates", "cloned_from": "cloned_from",
}

class LinkCreate(BaseModel):
    target_id: int
    link_type: str = "relates_to"

class LinkOut(BaseModel):
    link_id:      int
    source_id:    int
    target_id:    int
    link_type:    str
    target_title: Optional[str] = None
    created_at:   datetime
    class Config: from_attributes = True

@router.get("/link-types", response_model=dict)
def get_link_types():
    return LINK_LABELS

@router.get("/links/by-product", response_model=List[dict])
def get_links_by_product(product_id: int, db: Session = Depends(get_db)):
    """Returns all links where source or target belongs to items of a product."""
    item_ids = [r[0] for r in db.query(BacklogItem.item_id).filter(BacklogItem.product_id == product_id).all()]
    if not item_ids: return []
    links = db.query(BacklogItemLink).filter(
        (BacklogItemLink.source_id.in_(item_ids)) | (BacklogItemLink.target_id.in_(item_ids))
    ).all()
    return [{"link_id": l.link_id, "source_id": l.source_id, "target_id": l.target_id, "link_type": l.link_type} for l in links]

@router.get("/{item_id}/links", response_model=List[LinkOut])
def list_links(item_id: int, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    result = []
    # Outgoing links (this item is the source)
    outgoing = db.query(BacklogItemLink).filter(BacklogItemLink.source_id == item_id).order_by(BacklogItemLink.created_at).all()
    for lnk in outgoing:
        out = LinkOut.model_validate(lnk)
        target = db.get(BacklogItem, lnk.target_id)
        out.target_title = target.title if target else f"Item #{lnk.target_id}"
        result.append(out)
    # Incoming links (this item is the target) — show with inverse type
    incoming = db.query(BacklogItemLink).filter(BacklogItemLink.target_id == item_id).order_by(BacklogItemLink.created_at).all()
    for lnk in incoming:
        out = LinkOut(
            link_id=lnk.link_id,
            source_id=lnk.target_id,   # from this item's perspective, source IS the other item
            target_id=lnk.source_id,
            link_type=INVERSE_TYPES.get(lnk.link_type, lnk.link_type),
            created_at=lnk.created_at
        )
        source = db.get(BacklogItem, lnk.source_id)
        out.target_title = source.title if source else f"Item #{lnk.source_id}"
        result.append(out)
    return result

@router.post("/{item_id}/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(item_id: int, body: LinkCreate, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    BaseRepository(BacklogItem, db).get_or_404(body.target_id)
    lnk = BacklogItemLink(source_id=item_id, target_id=body.target_id, link_type=body.link_type)
    db.add(lnk); db.commit(); db.refresh(lnk)
    out = LinkOut.model_validate(lnk)
    target = db.get(BacklogItem, body.target_id)
    out.target_title = target.title if target else f"Item #{body.target_id}"
    return out

@router.delete("/{item_id}/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(item_id: int, link_id: int, db: Session = Depends(get_db)):
    # Find link where item is source OR target (supports bidirectional display)
    from sqlalchemy import or_
    lnk = db.query(BacklogItemLink).filter(
        BacklogItemLink.link_id == link_id,
        or_(BacklogItemLink.source_id == item_id, BacklogItemLink.target_id == item_id)
    ).first()
    if lnk: db.delete(lnk); db.commit()

# ── Notes (before /{id} to avoid routing conflicts) ──────────────────────────

class NoteCreate(BaseModel):
    author:  str
    content: str

class NoteOut(BaseModel):
    note_id:    int
    item_id:    int
    author:     str
    content:    str
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

@router.get("/{item_id}/notes", response_model=List[NoteOut])
def list_notes(item_id: int, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    notes = db.query(BacklogItemNote)\
               .filter(BacklogItemNote.item_id == item_id)\
               .order_by(BacklogItemNote.created_at.desc()).all()
    return [NoteOut.model_validate(n) for n in notes]

@router.post("/{item_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(item_id: int, body: NoteCreate, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    n = BacklogItemNote(item_id=item_id, **body.model_dump())
    db.add(n); db.commit(); db.refresh(n)
    return NoteOut.model_validate(n)

@router.delete("/{item_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(item_id: int, note_id: int, db: Session = Depends(get_db)):
    n = db.query(BacklogItemNote).filter(
        BacklogItemNote.note_id == note_id,
        BacklogItemNote.item_id == item_id
    ).first()
    if n:
        db.delete(n); db.commit()

# ── Backlog Items (generic /{id} routes LAST) ─────────────────────────────────

@router.get("", response_model=Paginated)
def list_items(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    current_status: Optional[str] = None,
    item_type_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    no_sprint: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    q = db.query(BacklogItem)
    if product_id is not None:     q = q.filter(BacklogItem.product_id     == product_id)
    if current_status is not None: q = q.filter(BacklogItem.current_status == current_status)
    if item_type_id is not None:   q = q.filter(BacklogItem.item_type_id   == item_type_id)
    if no_sprint is True:          q = q.filter(BacklogItem.sprint_id.is_(None))
    elif sprint_id is not None:    q = q.filter(BacklogItem.sprint_id      == sprint_id)
    total = q.count()
    items = q.order_by(BacklogItem.item_id.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [BacklogItemOut.model_validate(i) for i in items]}


@router.post("", response_model=BacklogItemOut, status_code=status.HTTP_201_CREATED)
def create_item(body: BacklogItemCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    data["wsjf_score"] = calc_wsjf(
        data["wsjf_business_value"], data["wsjf_time_criticality"],
        data["wsjf_risk_reduction"], data["wsjf_job_size"]
    )
    return BaseRepository(BacklogItem, db).create(data)


@router.get("/{id}", response_model=BacklogItemOut)
def get_item(id: int, db: Session = Depends(get_db)):
    return BaseRepository(BacklogItem, db).get_or_404(id)


@router.patch("/{id}", response_model=BacklogItemOut)
def update_item(id: int, body: BacklogItemUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItem, db)
    obj  = repo.get_or_404(id)
    data = body.model_dump(exclude_unset=True)
    wsjf_fields = {"wsjf_business_value", "wsjf_time_criticality", "wsjf_risk_reduction", "wsjf_job_size"}
    if wsjf_fields & set(data.keys()):
        bv = data.get("wsjf_business_value",   obj.wsjf_business_value   or 1)
        tc = data.get("wsjf_time_criticality", obj.wsjf_time_criticality or 1)
        rr = data.get("wsjf_risk_reduction",   obj.wsjf_risk_reduction   or 1)
        js = data.get("wsjf_job_size",         obj.wsjf_job_size         or 1)
        data["wsjf_score"] = calc_wsjf(bv, tc, rr, js)
    return repo.update(obj, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItem, db)
    repo.delete(repo.get_or_404(id))
