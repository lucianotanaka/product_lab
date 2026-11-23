"""
Business Areas — catálogo global de áreas de negócio.
Endpoints:
  GET    /business-areas               lista (com filtros)
  POST   /business-areas               cria
  GET    /business-areas/{id}          detalhe
  PATCH  /business-areas/{id}          atualiza
  DELETE /business-areas/{id}          remove
  GET    /business-areas/for-company/{company_id}  áreas NÃO associadas a uma empresa
"""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.process_mapping import BusinessArea
from app.models.company import CompanyBusinessArea, CompanyAreaMember, Company
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.common import Paginated

router = APIRouter()

AREA_TYPES = ["STRATEGIC", "OPERATIONAL", "SUPPORT", "TECHNOLOGY", "COMMERCIAL"]


# ── Schemas ────────────────────────────────────────────────────────────────────

class BusinessAreaCreate(BaseModel):
    area_name: str
    area_description: Optional[str] = None
    area_color: Optional[str] = None
    area_type: str = "OPERATIONAL"
    parent_area_id: Optional[int] = None
    level: int = 0
    display_order: int = 0
    is_active: bool = True
    product_id: Optional[int] = None


class BusinessAreaUpdate(BaseModel):
    area_name: Optional[str] = None
    area_description: Optional[str] = None
    area_color: Optional[str] = None
    area_type: Optional[str] = None
    parent_area_id: Optional[int] = None
    level: Optional[int] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    product_id: Optional[int] = None


class BusinessAreaOut(BaseModel):
    id: int
    area_name: str
    area_description: Optional[str]
    area_color: Optional[str]
    area_type: str
    parent_area_id: Optional[int]
    level: int
    display_order: int
    is_active: bool
    product_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_area(id: int, db: Session) -> BusinessArea:
    obj = db.get(BusinessArea, id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business area not found")
    return obj


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_business_areas(
    page: int = 1,
    size: int = 100,
    area_type: Optional[str] = None,
    active_only: bool = False,
    product_id: Optional[int] = None,
    parent_area_id: Optional[int] = None,
    roots_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(BusinessArea)
    if area_type:
        q = q.filter(BusinessArea.area_type == area_type)
    if active_only:
        q = q.filter(BusinessArea.is_active == True)
    if product_id is not None:
        q = q.filter(BusinessArea.product_id == product_id)
    if parent_area_id is not None:
        q = q.filter(BusinessArea.parent_area_id == parent_area_id)
    if roots_only:
        q = q.filter(BusinessArea.parent_area_id == None)
    total = q.count()
    items = q.order_by(BusinessArea.level, BusinessArea.display_order, BusinessArea.area_name).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [BusinessAreaOut.model_validate(a) for a in items]}


@router.get("/tree", response_model=List[dict])
def get_business_areas_tree(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todas as áreas em estrutura hierárquica (árvore)."""
    q = db.query(BusinessArea)
    if active_only:
        q = q.filter(BusinessArea.is_active == True)
    all_areas = q.order_by(BusinessArea.level, BusinessArea.display_order, BusinessArea.area_name).all()

    def build_tree(areas: list, parent_id: Optional[int] = None) -> list:
        nodes = []
        for a in areas:
            if a.parent_area_id == parent_id:
                node = {
                    "id": a.id, "area_name": a.area_name, "area_type": a.area_type,
                    "area_color": a.area_color, "area_description": a.area_description,
                    "level": a.level, "is_active": a.is_active, "display_order": a.display_order,
                    "children": build_tree(areas, a.id),
                }
                nodes.append(node)
        return nodes

    return build_tree(all_areas)


@router.get("/for-company/{company_id}", response_model=List[BusinessAreaOut])
def list_areas_available_for_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna áreas do catálogo que NÃO estão ainda associadas à empresa."""
    already = db.query(CompanyBusinessArea.business_area_id).filter(
        CompanyBusinessArea.company_id == company_id
    ).subquery()
    return db.query(BusinessArea).filter(
        BusinessArea.is_active == True,
        ~BusinessArea.id.in_(already),
    ).order_by(BusinessArea.display_order, BusinessArea.area_name).all()


@router.get("/{id}", response_model=BusinessAreaOut)
def get_business_area(id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    return _get_area(id, db)


@router.post("", response_model=BusinessAreaOut, status_code=status.HTTP_201_CREATED)
def create_business_area(
    body: BusinessAreaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.area_type not in AREA_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"area_type must be one of {AREA_TYPES}")
    obj = BusinessArea(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{id}", response_model=BusinessAreaOut)
def update_business_area(
    id: int, body: BusinessAreaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = _get_area(id, db)
    data = body.model_dump(exclude_unset=True)
    if "area_type" in data and data["area_type"] not in AREA_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"area_type must be one of {AREA_TYPES}")
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business_area(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = _get_area(id, db)
    db.delete(obj)
    db.commit()


# ── Leaders per area (cross-company view) ─────────────────────────────────────

LEADERSHIP_LEVELS = ["DIRECTOR", "MANAGER", "COORDINATOR", "SUPERVISOR", "LEAD"]


class AreaLeaderCreate(BaseModel):
    company_id: int
    stakeholder_id: int
    leadership_level: str = "COORDINATOR"
    reports_to_leader_id: Optional[int] = None
    started_at: Optional[str] = None
    notes: Optional[str] = None


class AreaLeaderUpdate(BaseModel):
    leadership_level: Optional[str] = None
    reports_to_leader_id: Optional[int] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    is_current: Optional[bool] = None
    notes: Optional[str] = None


class AreaLeaderOut(BaseModel):
    id: int
    company_id: int
    company_name: str
    business_area_id: int
    stakeholder_id: int
    stakeholder_name: str
    stakeholder_email: Optional[str]
    stakeholder_role: Optional[str]
    leadership_level: str
    reports_to_leader_id: Optional[int]
    reports_to_name: Optional[str]
    is_current: bool
    started_at: Optional[str]
    ended_at: Optional[str]
    notes: Optional[str]


def _enrich_area_member(m: CompanyAreaMember, db) -> dict:
    stk = db.get(Stakeholder, m.stakeholder_id)
    company = db.get(Company, m.company_id)
    reports_to = db.get(CompanyAreaMember, m.reports_to_member_id) if m.reports_to_member_id else None
    reports_to_stk = db.get(Stakeholder, reports_to.stakeholder_id) if reports_to else None
    return {
        "id": m.id, "company_id": m.company_id,
        "company_name": company.company_name if company else "—",
        "business_area_id": m.business_area_id,
        "stakeholder_id": m.stakeholder_id,
        "stakeholder_name": stk.full_name if stk else "—",
        "stakeholder_email": stk.email if stk else None,
        "stakeholder_role": stk.position_title if stk else None,
        "leadership_level": m.leadership_level,
        "reports_to_leader_id": m.reports_to_member_id,
        "reports_to_name": reports_to_stk.full_name if reports_to_stk else None,
        "is_current": m.is_current,
        "started_at": str(m.started_at) if m.started_at else None,
        "ended_at": str(m.ended_at) if m.ended_at else None,
        "notes": m.notes,
    }


@router.get("/{id}/leaders", response_model=List[AreaLeaderOut])
def list_area_leaders(
    id: int,
    current_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os líderes de uma área (todas as empresas)."""
    _get_area(id, db)
    q = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.business_area_id == id,
        CompanyAreaMember.leadership_level != None,
    )
    if current_only:
        q = q.filter(CompanyAreaMember.is_current == True)
    q = q.order_by(CompanyAreaMember.company_id, CompanyAreaMember.leadership_level)
    return [_enrich_area_member(m, db) for m in q.all()]


@router.post("/{id}/leaders", response_model=AreaLeaderOut, status_code=status.HTTP_201_CREATED)
def add_area_leader(
    id: int, body: AreaLeaderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adiciona um líder a uma área para uma empresa."""
    _get_area(id, db)
    if body.leadership_level not in LEADERSHIP_LEVELS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"leadership_level must be one of {LEADERSHIP_LEVELS}")
    from datetime import date as date_type
    started = date_type.fromisoformat(body.started_at) if body.started_at else date_type.today()
    obj = CompanyAreaMember(
        company_id=body.company_id, business_area_id=id,
        stakeholder_id=body.stakeholder_id, leadership_level=body.leadership_level,
        role_in_area=body.leadership_level,
        reports_to_member_id=body.reports_to_leader_id,
        started_at=started, is_current=True, is_active=True, notes=body.notes,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return _enrich_area_member(obj, db)


@router.patch("/{id}/leaders/{leader_id}", response_model=AreaLeaderOut)
def update_area_leader(
    id: int, leader_id: int, body: AreaLeaderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.id == leader_id,
        CompanyAreaMember.business_area_id == id,
        CompanyAreaMember.leadership_level != None,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leader not found")
    from datetime import date as date_type
    data = body.model_dump(exclude_unset=True)
    if "started_at" in data and data["started_at"]:
        data["started_at"] = date_type.fromisoformat(data["started_at"])
    if "ended_at" in data and data["ended_at"]:
        data["ended_at"] = date_type.fromisoformat(data["ended_at"])
        data["is_current"] = False
    # Map old field name
    if "reports_to_leader_id" in data:
        data["reports_to_member_id"] = data.pop("reports_to_leader_id")
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return _enrich_area_member(obj, db)


@router.delete("/{id}/leaders/{leader_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_area_leader(
    id: int, leader_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.id == leader_id,
        CompanyAreaMember.business_area_id == id,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leader not found")
    db.delete(obj); db.commit()
