from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.stakeholder import Stakeholder, StakeholderProduct
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime

# ── Schemas ───────────────────────────────────────────────────────────────────

class StakeholderCreate(BaseModel):
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

class StakeholderProductOut(BaseModel):
    id:            int
    product_id:    int
    role:          Optional[str]  = None
    influence:     int            = 3
    interest:      int            = 3
    created_at:    datetime
    class Config: from_attributes = True

class StakeholderOut(BaseModel):
    stakeholder_id:       int
    full_name:            str
    area:                 Optional[str]   = None
    department:           Optional[str]   = None
    position_title:       Optional[str]   = None
    company:              Optional[str]   = None
    email:                Optional[str]   = None
    manager_name:         Optional[str]   = None
    stakeholder_type:     Optional[str]   = None
    relationship_status:  Optional[str]   = None
    notes:                Optional[str]   = None
    is_active:            bool            = True
    created_at:           datetime
    updated_at:           datetime
    products:             List[StakeholderProductOut] = []
    class Config: from_attributes = True

class StakeholderProductCreate(BaseModel):
    product_id: int
    role:       Optional[str]  = None
    influence:  int            = Field(default=3, ge=1, le=5)
    interest:   int            = Field(default=3, ge=1, le=5)

class StakeholderProductUpdate(BaseModel):
    role:      Optional[str]  = None
    influence: Optional[int]  = None
    interest:  Optional[int]  = None

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich(s: Stakeholder, db: Session) -> StakeholderOut:
    """Adiciona lista de produtos ao StakeholderOut."""
    out = StakeholderOut.model_validate(s)
    out.products = [
        StakeholderProductOut.model_validate(sp)
        for sp in db.query(StakeholderProduct)
                     .filter(StakeholderProduct.stakeholder_id == s.stakeholder_id)
                     .order_by(StakeholderProduct.created_at)
                     .all()
    ]
    return out

# ── Stakeholders CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_stakeholders(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Stakeholder)
    if product_id is not None:
        q = q.join(StakeholderProduct,
                   (StakeholderProduct.stakeholder_id == Stakeholder.stakeholder_id) &
                   (StakeholderProduct.product_id == product_id))
    total = q.count()
    items = q.order_by(Stakeholder.created_at.desc())\
              .offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [_enrich(s, db) for s in items]}


@router.post("", response_model=StakeholderOut, status_code=status.HTTP_201_CREATED)
def create_stakeholder(body: StakeholderCreate, db: Session = Depends(get_db)):
    s = BaseRepository(Stakeholder, db).create(body.model_dump())
    return _enrich(s, db)


@router.get("/{id}", response_model=StakeholderOut)
def get_stakeholder(id: int, db: Session = Depends(get_db)):
    s = BaseRepository(Stakeholder, db).get_or_404(id)
    return _enrich(s, db)


@router.patch("/{id}", response_model=StakeholderOut)
def update_stakeholder(id: int, body: StakeholderUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(Stakeholder, db)
    s = repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))
    return _enrich(s, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stakeholder(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(Stakeholder, db)
    repo.delete(repo.get_or_404(id))


# ── Product Associations ──────────────────────────────────────────────────────

@router.get("/{id}/products", response_model=List[StakeholderProductOut])
def list_stakeholder_products(id: int, db: Session = Depends(get_db)):
    BaseRepository(Stakeholder, db).get_or_404(id)
    rows = db.query(StakeholderProduct)\
             .filter(StakeholderProduct.stakeholder_id == id)\
             .order_by(StakeholderProduct.created_at).all()
    return [StakeholderProductOut.model_validate(r) for r in rows]


@router.post("/{id}/products", response_model=StakeholderProductOut,
             status_code=status.HTTP_201_CREATED)
def add_stakeholder_product(id: int, body: StakeholderProductCreate,
                            db: Session = Depends(get_db)):
    BaseRepository(Stakeholder, db).get_or_404(id)
    # Upsert: se já existe, atualiza
    existing = db.query(StakeholderProduct).filter(
        StakeholderProduct.stakeholder_id == id,
        StakeholderProduct.product_id == body.product_id
    ).first()
    if existing:
        for k, v in body.model_dump(exclude_unset=True).items():
            if k != "product_id" and v is not None:
                setattr(existing, k, v)
        db.commit(); db.refresh(existing)
        return StakeholderProductOut.model_validate(existing)
    sp = StakeholderProduct(stakeholder_id=id, **body.model_dump())
    db.add(sp); db.commit(); db.refresh(sp)
    return StakeholderProductOut.model_validate(sp)


@router.patch("/{id}/products/{product_id}", response_model=StakeholderProductOut)
def update_stakeholder_product(id: int, product_id: int,
                                body: StakeholderProductUpdate,
                                db: Session = Depends(get_db)):
    sp = db.query(StakeholderProduct).filter(
        StakeholderProduct.stakeholder_id == id,
        StakeholderProduct.product_id == product_id
    ).first()
    if not sp:
        from fastapi import HTTPException
        raise HTTPException(404, "Associação não encontrada")
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None: setattr(sp, k, v)
    db.commit(); db.refresh(sp)
    return StakeholderProductOut.model_validate(sp)


@router.delete("/{id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_stakeholder_product(id: int, product_id: int, db: Session = Depends(get_db)):
    sp = db.query(StakeholderProduct).filter(
        StakeholderProduct.stakeholder_id == id,
        StakeholderProduct.product_id == product_id
    ).first()
    if sp:
        db.delete(sp); db.commit()
