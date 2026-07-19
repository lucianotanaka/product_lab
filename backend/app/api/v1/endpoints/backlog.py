from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.backlog import BacklogItem, BacklogItemType, BacklogItemSuggestion
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import datetime

# ── Schemas ───────────────────────────────────────────────────────────────────

class BacklogItemCreate(BaseModel):
    product_id:          Optional[int]  = None
    feature_id:          Optional[int]  = None
    sprint_id:           Optional[int]  = None
    ado_id:              Optional[str]  = None
    item_type_id:        Optional[int]  = None
    title:               str
    description:         Optional[str]  = None
    current_status:      str            = "open"
    business_value:      Optional[str]  = None
    acceptance_criteria: Optional[str]  = None
    story_points:        Optional[int]  = None
    priority:            int            = 3

class BacklogItemUpdate(BaseModel):
    feature_id:          Optional[int]  = None
    sprint_id:           Optional[int]  = None
    ado_id:              Optional[str]  = None
    item_type_id:        Optional[int]  = None
    title:               Optional[str]  = None
    description:         Optional[str]  = None
    current_status:      Optional[str]  = None
    business_value:      Optional[str]  = None
    acceptance_criteria: Optional[str]  = None
    story_points:        Optional[int]  = None
    priority:            Optional[int]  = None
    completed_at:        Optional[datetime] = None

class BacklogItemOut(BaseModel):
    item_id:             int
    product_id:          Optional[int]  = None
    feature_id:          Optional[int]  = None
    sprint_id:           Optional[int]  = None
    ado_id:              Optional[str]  = None
    item_type_id:        Optional[int]  = None
    title:               str
    description:         Optional[str]  = None
    current_status:      str
    business_value:      Optional[str]  = None
    acceptance_criteria: Optional[str]  = None
    story_points:        Optional[int]  = None
    priority:            int            = 3
    created_at:          datetime
    updated_at:          datetime
    completed_at:        Optional[datetime] = None
    class Config: from_attributes = True

class ItemTypeOut(BaseModel):
    item_type_id:  int
    name:          str
    description:   Optional[str] = None
    display_order: int           = 0
    is_active:     bool          = True
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

# ── Backlog Items ─────────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_items(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    current_status: Optional[str] = None,
    item_type_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    repo = BaseRepository(BacklogItem, db)
    filters: dict = {}
    if product_id is not None:    filters["product_id"]     = product_id
    if current_status is not None:  filters["current_status"] = current_status
    if item_type_id is not None:    filters["item_type_id"]   = item_type_id
    total, items = repo.list(skip=(page - 1) * size, limit=size, **filters)
    return {"total": total, "page": page, "size": size,
            "items": [BacklogItemOut.model_validate(i) for i in items]}


@router.post("", response_model=BacklogItemOut, status_code=status.HTTP_201_CREATED)
def create_item(body: BacklogItemCreate, db: Session = Depends(get_db)):
    return BaseRepository(BacklogItem, db).create(body.model_dump())


@router.get("/{id}", response_model=BacklogItemOut)
def get_item(id: int, db: Session = Depends(get_db)):
    return BaseRepository(BacklogItem, db).get_or_404(id)


@router.patch("/{id}", response_model=BacklogItemOut)
def update_item(id: int, body: BacklogItemUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItem, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItem, db)
    repo.delete(repo.get_or_404(id))


# ── Item Types ────────────────────────────────────────────────────────────────

@router.get("/types/list", response_model=List[ItemTypeOut])
def list_types(db: Session = Depends(get_db)):
    types = db.query(BacklogItemType).filter(BacklogItemType.is_active == True)\
               .order_by(BacklogItemType.display_order).all()
    return [ItemTypeOut.model_validate(t) for t in types]


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
