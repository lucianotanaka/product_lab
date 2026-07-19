from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.stakeholder import Stakeholder
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime

class StakeholderCreate(BaseModel):
    product_id:         Optional[int]   = None
    full_name:          str
    area:               Optional[str]   = None
    department:         Optional[str]   = None
    position_title:     Optional[str]   = None
    company:            Optional[str]   = None
    email:              Optional[str]   = None
    manager_name:       Optional[str]   = None
    stakeholder_type:   Optional[str]   = None
    relationship_status:Optional[str]   = None
    notes:              Optional[str]   = None
    is_active:          bool            = True
    role:               Optional[str]   = None
    influence:          int             = Field(default=3, ge=1, le=5)
    interest:           int             = Field(default=3, ge=1, le=5)

class StakeholderUpdate(BaseModel):
    full_name:          Optional[str]   = None
    area:               Optional[str]   = None
    department:         Optional[str]   = None
    position_title:     Optional[str]   = None
    company:            Optional[str]   = None
    email:              Optional[str]   = None
    manager_name:       Optional[str]   = None
    stakeholder_type:   Optional[str]   = None
    relationship_status:Optional[str]   = None
    notes:              Optional[str]   = None
    is_active:          Optional[bool]  = None
    role:               Optional[str]   = None
    influence:          Optional[int]   = None
    interest:           Optional[int]   = None

class StakeholderOut(BaseModel):
    stakeholder_id:     int
    product_id:         Optional[int]   = None
    full_name:          str
    area:               Optional[str]   = None
    department:         Optional[str]   = None
    position_title:     Optional[str]   = None
    company:            Optional[str]   = None
    email:              Optional[str]   = None
    manager_name:       Optional[str]   = None
    stakeholder_type:   Optional[str]   = None
    relationship_status:Optional[str]   = None
    notes:              Optional[str]   = None
    is_active:          bool            = True
    role:               Optional[str]   = None
    influence:          int             = 3
    interest:           int             = 3
    created_at:         datetime
    updated_at:         datetime
    class Config: from_attributes = True

router = APIRouter()

@router.get("", response_model=Paginated)
def list_stakeholders(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    repo = BaseRepository(Stakeholder, db)
    total, items = repo.list(skip=(page - 1) * size, limit=size, product_id=product_id)
    return {"total": total, "page": page, "size": size,
            "items": [StakeholderOut.model_validate(i) for i in items]}

@router.post("", response_model=StakeholderOut, status_code=status.HTTP_201_CREATED)
def create_stakeholder(body: StakeholderCreate, db: Session = Depends(get_db)):
    return BaseRepository(Stakeholder, db).create(body.model_dump())

@router.get("/{id}", response_model=StakeholderOut)
def get_stakeholder(id: int, db: Session = Depends(get_db)):
    return BaseRepository(Stakeholder, db).get_or_404(id)

@router.patch("/{id}", response_model=StakeholderOut)
def update_stakeholder(id: int, body: StakeholderUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(Stakeholder, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stakeholder(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(Stakeholder, db)
    repo.delete(repo.get_or_404(id))
