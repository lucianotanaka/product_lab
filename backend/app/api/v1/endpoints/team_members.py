from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.team_member import TeamMember, TeamMemberProduct
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import date, datetime

# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamMemberCreate(BaseModel):
    full_name:     str
    email:         Optional[str] = None
    resource_type: str           = "internal"
    department:    Optional[str] = None
    company:       Optional[str] = None
    is_active:     bool          = True

class TeamMemberUpdate(BaseModel):
    full_name:     Optional[str]  = None
    email:         Optional[str]  = None
    resource_type: Optional[str]  = None
    department:    Optional[str]  = None
    company:       Optional[str]  = None
    is_active:     Optional[bool] = None

class TeamMemberProductOut(BaseModel):
    id:         int
    member_id:  int
    product_id: int
    role:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    is_active:  bool           = True
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

class TeamMemberOut(BaseModel):
    member_id:     int
    full_name:     str
    email:         Optional[str]  = None
    resource_type: str            = "internal"
    department:    Optional[str]  = None
    company:       Optional[str]  = None
    is_active:     bool           = True
    created_at:    datetime
    updated_at:    datetime
    products:      List[TeamMemberProductOut] = []
    class Config: from_attributes = True

class TeamMemberProductCreate(BaseModel):
    product_id: int
    role:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None

class TeamMemberProductUpdate(BaseModel):
    role:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    is_active:  Optional[bool] = None

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# ── Helper ────────────────────────────────────────────────────────────────────

def _enrich(m: TeamMember, db: Session) -> TeamMemberOut:
    out = TeamMemberOut.model_validate(m)
    out.products = [
        TeamMemberProductOut.model_validate(p)
        for p in db.query(TeamMemberProduct)
                    .filter(TeamMemberProduct.member_id == m.member_id)
                    .order_by(TeamMemberProduct.created_at)
                    .all()
    ]
    return out

# NOTE: specific routes MUST come before /{id} to avoid FastAPI matching them
# as integer path parameters.

# ── List by product (shortcut — before /{id}) ────────────────────────────────

@router.get("/by-product/{product_id}", response_model=List[TeamMemberOut])
def list_by_product(product_id: int, active_only: bool = True, db: Session = Depends(get_db)):
    q = db.query(TeamMember).join(
        TeamMemberProduct,
        (TeamMemberProduct.member_id == TeamMember.member_id) &
        (TeamMemberProduct.product_id == product_id)
    )
    if active_only:
        q = q.filter(TeamMemberProduct.is_active == True)
    return [_enrich(m, db) for m in q.order_by(TeamMember.full_name).all()]

# ── Team Members CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_members(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    q = db.query(TeamMember)
    if product_id is not None:
        q = q.join(TeamMemberProduct,
                   (TeamMemberProduct.member_id == TeamMember.member_id) &
                   (TeamMemberProduct.product_id == product_id))
    if is_active is not None:
        q = q.filter(TeamMember.is_active == is_active)
    total = q.count()
    items = q.order_by(TeamMember.full_name).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [_enrich(m, db) for m in items]}


@router.post("", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
def create_member(body: TeamMemberCreate, db: Session = Depends(get_db)):
    m = BaseRepository(TeamMember, db).create(body.model_dump())
    return _enrich(m, db)


@router.get("/{id}", response_model=TeamMemberOut)
def get_member(id: int, db: Session = Depends(get_db)):
    m = BaseRepository(TeamMember, db).get_or_404(id)
    return _enrich(m, db)


@router.patch("/{id}", response_model=TeamMemberOut)
def update_member(id: int, body: TeamMemberUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(TeamMember, db)
    m = repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))
    return _enrich(m, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(TeamMember, db)
    repo.delete(repo.get_or_404(id))

# ── Product Associations ──────────────────────────────────────────────────────

@router.get("/{id}/products", response_model=List[TeamMemberProductOut])
def list_member_products(id: int, db: Session = Depends(get_db)):
    BaseRepository(TeamMember, db).get_or_404(id)
    rows = db.query(TeamMemberProduct)\
             .filter(TeamMemberProduct.member_id == id)\
             .order_by(TeamMemberProduct.created_at).all()
    return [TeamMemberProductOut.model_validate(r) for r in rows]


@router.post("/{id}/products", response_model=TeamMemberProductOut,
             status_code=status.HTTP_201_CREATED)
def add_member_to_product(id: int, body: TeamMemberProductCreate,
                           db: Session = Depends(get_db)):
    BaseRepository(TeamMember, db).get_or_404(id)
    existing = db.query(TeamMemberProduct).filter(
        TeamMemberProduct.member_id == id,
        TeamMemberProduct.product_id == body.product_id
    ).first()
    if existing:
        for k, v in body.model_dump(exclude_unset=True).items():
            if k != "product_id" and v is not None:
                setattr(existing, k, v)
        existing.is_active = True
        db.commit(); db.refresh(existing)
        return TeamMemberProductOut.model_validate(existing)
    p = TeamMemberProduct(member_id=id, **body.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return TeamMemberProductOut.model_validate(p)


@router.patch("/{id}/products/{product_id}", response_model=TeamMemberProductOut)
def update_member_product(id: int, product_id: int, body: TeamMemberProductUpdate,
                           db: Session = Depends(get_db)):
    p = db.query(TeamMemberProduct).filter(
        TeamMemberProduct.member_id == id,
        TeamMemberProduct.product_id == product_id
    ).first()
    if not p:
        from fastapi import HTTPException
        raise HTTPException(404, "Associação não encontrada")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return TeamMemberProductOut.model_validate(p)


@router.delete("/{id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_from_product(id: int, product_id: int, db: Session = Depends(get_db)):
    p = db.query(TeamMemberProduct).filter(
        TeamMemberProduct.member_id == id,
        TeamMemberProduct.product_id == product_id
    ).first()
    if p:
        db.delete(p); db.commit()
