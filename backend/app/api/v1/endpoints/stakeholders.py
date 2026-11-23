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
    full_name:           str
    position_title:      Optional[str]   = None
    company_id:          Optional[int]   = None
    email:               Optional[str]   = None
    manager_name:        Optional[str]   = None
    stakeholder_type:    Optional[str]   = None
    relationship_status: Optional[str]   = None
    notes:               Optional[str]   = None
    is_active:           bool            = True

class StakeholderUpdate(BaseModel):
    full_name:           Optional[str]   = None
    position_title:      Optional[str]   = None
    company_id:          Optional[int]   = None
    email:               Optional[str]   = None
    manager_name:        Optional[str]   = None
    stakeholder_type:    Optional[str]   = None
    relationship_status: Optional[str]   = None
    notes:               Optional[str]   = None
    is_active:           Optional[bool]  = None

class StakeholderProductOut(BaseModel):
    id:             int
    product_id:     int
    role:           Optional[str]  = None
    influence:      int            = 3
    interest:       int            = 3
    power_level:     Optional[int]  = None
    alignment_level: Optional[int]  = None
    risk_level:      Optional[int]  = None
    sentiment:       Optional[str]  = None
    expectation:     Optional[str]  = None
    concern:         Optional[str]  = None
    strategy:        Optional[str]  = None
    is_active:      bool           = True
    created_at:     datetime
    updated_at:     Optional[datetime] = None
    class Config: from_attributes = True

class AreaMembershipSummaryOut(BaseModel):
    id:               int
    company_id:       int
    company_name:     str
    business_area_id: int
    area_name:        str
    area_type:        str
    area_color:       Optional[str] = None
    role_in_area:     Optional[str] = None
    leadership_level: Optional[str] = None
    is_active:        bool
    is_current:       bool
    started_at:       Optional[str] = None

class StakeholderOut(BaseModel):
    stakeholder_id:      int
    full_name:           str
    position_title:      Optional[str]   = None
    company_id:          Optional[int]   = None
    email:               Optional[str]   = None
    manager_name:        Optional[str]   = None
    stakeholder_type:    Optional[str]   = None
    relationship_status: Optional[str]   = None
    notes:               Optional[str]   = None
    is_active:           bool            = True
    created_at:          datetime
    updated_at:          datetime
    products:            List[StakeholderProductOut] = []
    areas:               List[AreaMembershipSummaryOut] = []
    class Config: from_attributes = True

class StakeholderProductCreate(BaseModel):
    product_id: int
    role:       Optional[str]  = None
    influence:  int            = Field(default=3, ge=1, le=5)
    interest:   int            = Field(default=3, ge=1, le=5)

class StakeholderProductUpdate(BaseModel):
    role:            Optional[str]  = None
    influence:       Optional[int]  = None
    interest:        Optional[int]  = None
    power_level:     Optional[int]  = None
    alignment_level: Optional[int]  = None
    risk_level:      Optional[int]  = None
    sentiment:       Optional[str]  = None
    expectation:     Optional[str]  = None
    concern:         Optional[str]  = None
    strategy:        Optional[str]  = None
    is_active:       Optional[bool] = None

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich(s: Stakeholder, db: Session) -> StakeholderOut:
    """Adiciona lista de produtos e áreas ao StakeholderOut."""
    from app.models.company import CompanyAreaMember

    out = StakeholderOut.model_validate(s)
    out.products = [
        StakeholderProductOut.model_validate(sp)
        for sp in db.query(StakeholderProduct)
                     .filter(StakeholderProduct.stakeholder_id == s.stakeholder_id)
                     .order_by(StakeholderProduct.created_at)
                     .all()
    ]
    out.areas = [
        AreaMembershipSummaryOut.model_validate(_enrich_area_membership(m, db))
        for m in db.query(CompanyAreaMember)
                   .filter(CompanyAreaMember.stakeholder_id == s.stakeholder_id)
                   .order_by(CompanyAreaMember.company_id, CompanyAreaMember.business_area_id)
                   .all()
    ]
    return out

# ── Stakeholders CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_stakeholders(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Stakeholder)
    if product_id is not None:
        q = q.join(StakeholderProduct,
                   (StakeholderProduct.stakeholder_id == Stakeholder.stakeholder_id) &
                   (StakeholderProduct.product_id == product_id))
    if company_id is not None:
        q = q.filter(Stakeholder.company_id == company_id)
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
        existing.is_active = True  # reactivate if previously deactivated
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
        setattr(sp, k, v)
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


# ── Area Memberships ──────────────────────────────────────────────────────────

class AreaMembershipCreate(BaseModel):
    company_id:          int
    business_area_id:    int
    role_in_area:        Optional[str] = None   # MEMBER | DIRECTOR | MANAGER | ...
    leadership_level:    Optional[str] = None   # NULL = membro; NOT NULL = líder
    started_at:          Optional[str] = None
    ended_at:            Optional[str] = None
    reports_to_member_id: Optional[int] = None
    notes:               Optional[str] = None

class AreaMembershipUpdate(BaseModel):
    role_in_area:        Optional[str]  = None
    leadership_level:    Optional[str]  = None
    started_at:          Optional[str]  = None
    ended_at:            Optional[str]  = None
    is_current:          Optional[bool] = None
    is_active:           Optional[bool] = None
    reports_to_member_id: Optional[int] = None
    notes:               Optional[str]  = None

class AreaMembershipOut(AreaMembershipSummaryOut):
    pass


def _enrich_area_membership(m, db: Session) -> dict:
    from app.models.company import CompanyAreaMember
    from app.models.process_mapping import BusinessArea
    from app.models.company import Company
    area    = db.get(BusinessArea, m.business_area_id)
    company = db.get(Company, m.company_id)
    return {
        "id": m.id,
        "company_id": m.company_id,
        "company_name": company.company_name if company else "—",
        "business_area_id": m.business_area_id,
        "area_name": area.area_name if area else "—",
        "area_type": area.area_type if area else "OPERATIONAL",
        "area_color": area.area_color if area else None,
        "role_in_area": m.role_in_area,
        "leadership_level": m.leadership_level,
        "is_active": m.is_active,
        "is_current": m.is_current,
        "started_at": str(m.started_at) if m.started_at else None,
        # leadership_level set = líder; reports_to available via business_area_id + company_id query
    }


@router.get("/{id}/areas", response_model=List[AreaMembershipOut])
def list_stakeholder_areas(id: int, db: Session = Depends(get_db)):
    """Lista todas as áreas às quais o stakeholder pertence (company_area_members)."""
    from app.models.company import CompanyAreaMember
    BaseRepository(Stakeholder, db).get_or_404(id)
    rows = db.query(CompanyAreaMember)\
             .filter(CompanyAreaMember.stakeholder_id == id)\
             .order_by(CompanyAreaMember.company_id, CompanyAreaMember.business_area_id).all()
    return [_enrich_area_membership(m, db) for m in rows]


@router.post("/{id}/areas", response_model=AreaMembershipOut, status_code=status.HTTP_201_CREATED)
def add_stakeholder_area(id: int, body: AreaMembershipCreate, db: Session = Depends(get_db)):
    """Vincula o stakeholder a uma área (company_area_members). Faz upsert se já existir."""
    from app.models.company import CompanyAreaMember
    from datetime import date as date_type
    BaseRepository(Stakeholder, db).get_or_404(id)
    started = date_type.fromisoformat(body.started_at) if body.started_at else date_type.today()
    existing = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.stakeholder_id == id,
        CompanyAreaMember.company_id == body.company_id,
        CompanyAreaMember.business_area_id == body.business_area_id,
    ).first()
    ended = date_type.fromisoformat(body.ended_at) if body.ended_at else None
    is_current = (ended is None)
    if existing:
        existing.is_active = True
        existing.is_current = is_current
        if body.role_in_area is not None: existing.role_in_area = body.role_in_area
        if body.leadership_level is not None: existing.leadership_level = body.leadership_level
        existing.started_at = started
        existing.ended_at = ended
        if body.reports_to_member_id is not None: existing.reports_to_member_id = body.reports_to_member_id
        if body.notes is not None: existing.notes = body.notes
        db.commit(); db.refresh(existing)
        return _enrich_area_membership(existing, db)
    obj = CompanyAreaMember(
        stakeholder_id=id, company_id=body.company_id,
        business_area_id=body.business_area_id,
        role_in_area=body.role_in_area,
        leadership_level=body.leadership_level,
        started_at=started, ended_at=ended, is_current=is_current,
        is_active=True,
        reports_to_member_id=body.reports_to_member_id,
        notes=body.notes,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return _enrich_area_membership(obj, db)


@router.patch("/{id}/areas/{member_id}", response_model=AreaMembershipOut)
def update_stakeholder_area(id: int, member_id: int, body: AreaMembershipUpdate,
                             db: Session = Depends(get_db)):
    from app.models.company import CompanyAreaMember
    m = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.id == member_id,
        CompanyAreaMember.stakeholder_id == id,
    ).first()
    if not m:
        from fastapi import HTTPException
        raise HTTPException(404, "Vínculo não encontrado")
    data = body.model_dump(exclude_unset=True)
    # Rule: ended_at preenchido → is_current = False; ended_at nulo → is_current = True
    if "ended_at" in data:
        data["is_current"] = (data["ended_at"] is None)
    for k, v in data.items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    return _enrich_area_membership(m, db)


@router.delete("/{id}/areas/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stakeholder_area(id: int, member_id: int, db: Session = Depends(get_db)):
    """Soft delete: sets is_active = False (preserves history)."""
    from app.models.company import CompanyAreaMember
    m = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.id == member_id,
        CompanyAreaMember.stakeholder_id == id,
    ).first()
    if m:
        m.is_active = False
        db.commit()
