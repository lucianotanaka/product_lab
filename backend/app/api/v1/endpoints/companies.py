from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.company import Company, UserCompany, CompanyBusinessArea, CompanyAreaMember
from app.models.process_mapping import BusinessArea
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.common import Paginated

router = APIRouter()

COMPANY_TYPES = ["CLIENT", "INTERNAL", "PARTNER"]
USER_COMPANY_ROLES = ["PM", "VIEWER", "ADMIN"]


# ── Schemas ────────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    company_name: str
    company_type: str = "CLIENT"
    cnpj: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None
    fiscal_year_start_month: Optional[int] = None


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    cnpj: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    fiscal_year_start_month: Optional[int] = None


class CompanyOut(BaseModel):
    id: int
    company_name: str
    company_type: str
    cnpj: Optional[str]
    website: Optional[str]
    country: Optional[str]
    is_active: bool
    notes: Optional[str]
    fiscal_year_start_month: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class UserCompanyCreate(BaseModel):
    user_id: int
    company_id: int
    role: str = "PM"


class UserCompanyOut(BaseModel):
    id: int
    user_id: int
    company_id: int
    role: str
    created_at: datetime
    class Config: from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_company(id: int, db: Session) -> Company:
    obj = db.get(Company, id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Company not found")
    return obj


# ── Company CRUD ───────────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_companies(
    page: int = 1,
    size: int = 50,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Company)
    # Non-admins only see companies they are associated with
    if current_user.user_role != "admin":
        assoc = db.query(UserCompany.company_id).filter(UserCompany.user_id == current_user.user_id)
        q = q.filter(Company.id.in_(assoc))
    if active_only:
        q = q.filter(Company.is_active == True)
    total = q.count()
    items = q.order_by(Company.company_name).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [CompanyOut.model_validate(c) for c in items]}


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    body: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.company_type not in COMPANY_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"company_type must be one of {COMPANY_TYPES}")
    obj = Company(**body.model_dump())
    db.add(obj)
    db.flush()
    # Auto-associate the creator
    assoc = UserCompany(user_id=current_user.user_id, company_id=obj.id, role="PM")
    db.add(assoc)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/mine", response_model=List[CompanyOut])
def list_my_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns only the companies the current user is associated with."""
    assoc_ids = db.query(UserCompany.company_id).filter(
        UserCompany.user_id == current_user.user_id
    ).subquery()
    return db.query(Company).filter(
        Company.id.in_(assoc_ids),
        Company.is_active == True
    ).order_by(Company.company_name).all()


@router.get("/{id}", response_model=CompanyOut)
def get_company(id: int, db: Session = Depends(get_db)):
    return _get_company(id, db)


@router.patch("/{id}", response_model=CompanyOut)
def update_company(id: int, body: CompanyUpdate, db: Session = Depends(get_db)):
    obj = _get_company(id, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(id: int, db: Session = Depends(get_db)):
    obj = _get_company(id, db)
    db.delete(obj)
    db.commit()


# ── User ↔ Company associations ────────────────────────────────────────────────

@router.get("/{id}/members", response_model=List[UserCompanyOut])
def list_company_members(id: int, db: Session = Depends(get_db)):
    _get_company(id, db)
    return db.query(UserCompany).filter(UserCompany.company_id == id).all()


@router.post("/{id}/members", response_model=UserCompanyOut, status_code=status.HTTP_201_CREATED)
def add_company_member(id: int, body: UserCompanyCreate, db: Session = Depends(get_db)):
    _get_company(id, db)
    if body.role not in USER_COMPANY_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"role must be one of {USER_COMPANY_ROLES}")
    existing = db.query(UserCompany).filter(
        UserCompany.user_id == body.user_id,
        UserCompany.company_id == id
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "User already associated with this company")
    obj = UserCompany(user_id=body.user_id, company_id=id, role=body.role)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{id}/members/{uid}", response_model=UserCompanyOut)
def update_member_role(id: int, uid: int, role: str, db: Session = Depends(get_db)):
    obj = db.query(UserCompany).filter(
        UserCompany.company_id == id,
        UserCompany.user_id == uid
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Association not found")
    if role not in USER_COMPANY_ROLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"role must be one of {USER_COMPANY_ROLES}")
    obj.role = role
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}/members/{uid}", status_code=status.HTTP_204_NO_CONTENT)
def remove_company_member(id: int, uid: int, db: Session = Depends(get_db)):
    obj = db.query(UserCompany).filter(
        UserCompany.company_id == id,
        UserCompany.user_id == uid
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Association not found")
    db.delete(obj)
    db.commit()


# ── Company ↔ Business Area associations ──────────────────────────────────────

class CompanyAreaCreate(BaseModel):
    business_area_id: int
    notes: Optional[str] = None
    display_order: int = 0


class CompanyAreaUpdate(BaseModel):
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class CompanyAreaOut(BaseModel):
    id: int
    company_id: int
    business_area_id: int
    area_name: str
    area_type: str
    area_color: Optional[str]
    level: int
    notes: Optional[str]
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


def _enrich_area(assoc: CompanyBusinessArea, db: Session) -> dict:
    area = db.get(BusinessArea, assoc.business_area_id)
    return {
        "id": assoc.id,
        "company_id": assoc.company_id,
        "business_area_id": assoc.business_area_id,
        "area_name": area.area_name if area else "—",
        "area_type": area.area_type if area else "OPERATIONAL",
        "area_color": area.area_color if area else None,
        "level": area.level if area else 0,
        "notes": assoc.notes,
        "is_active": assoc.is_active,
        "display_order": assoc.display_order,
        "created_at": assoc.created_at,
        "updated_at": assoc.updated_at,
    }


@router.get("/{id}/areas", response_model=List[CompanyAreaOut])
def list_company_areas(id: int, db: Session = Depends(get_db),
                        current_user=Depends(get_current_user)):
    _get_company(id, db)
    assocs = db.query(CompanyBusinessArea).filter(
        CompanyBusinessArea.company_id == id
    ).order_by(CompanyBusinessArea.display_order, CompanyBusinessArea.id).all()
    return [_enrich_area(a, db) for a in assocs]


@router.post("/{id}/areas", response_model=CompanyAreaOut, status_code=status.HTTP_201_CREATED)
def add_company_area(id: int, body: CompanyAreaCreate, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    _get_company(id, db)
    area = db.get(BusinessArea, body.business_area_id)
    if not area:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business area not found")
    existing = db.query(CompanyBusinessArea).filter(
        CompanyBusinessArea.company_id == id,
        CompanyBusinessArea.business_area_id == body.business_area_id,
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Business area already associated with this company")
    obj = CompanyBusinessArea(company_id=id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _enrich_area(obj, db)


@router.patch("/{id}/areas/{area_id}", response_model=CompanyAreaOut)
def update_company_area(id: int, area_id: int, body: CompanyAreaUpdate,
                         db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = db.query(CompanyBusinessArea).filter(
        CompanyBusinessArea.company_id == id,
        CompanyBusinessArea.business_area_id == area_id,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Association not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _enrich_area(obj, db)


@router.delete("/{id}/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_company_area(id: int, area_id: int, db: Session = Depends(get_db),
                         current_user=Depends(get_current_user)):
    obj = db.query(CompanyBusinessArea).filter(
        CompanyBusinessArea.company_id == id,
        CompanyBusinessArea.business_area_id == area_id,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Association not found")
    db.delete(obj)
    db.commit()


# ── Area Members (unified: members + leaders) ─────────────────────────────────

LEADERSHIP_LEVELS = ["DIRECTOR", "MANAGER", "COORDINATOR", "SUPERVISOR", "LEAD"]


class MemberCreate(BaseModel):
    business_area_id:     int
    stakeholder_id:       int
    role_in_area:         Optional[str] = None
    leadership_level:     Optional[str] = None   # None = member; set = leader
    reports_to_member_id: Optional[int] = None
    started_at:           Optional[str] = None
    notes:                Optional[str] = None


class MemberUpdate(BaseModel):
    role_in_area:         Optional[str]  = None
    leadership_level:     Optional[str]  = None
    reports_to_member_id: Optional[int]  = None
    started_at:           Optional[str]  = None
    ended_at:             Optional[str]  = None
    is_current:           Optional[bool] = None
    is_active:            Optional[bool] = None
    notes:                Optional[str]  = None


class MemberOut(BaseModel):
    id: int
    company_id: int
    business_area_id: int
    area_name: str
    area_type: str
    area_color: Optional[str]
    stakeholder_id: int
    stakeholder_name: str
    stakeholder_email: Optional[str]
    stakeholder_role: Optional[str]
    role_in_area: Optional[str]
    leadership_level: Optional[str]
    reports_to_member_id: Optional[int]
    reports_to_name: Optional[str]
    is_current: bool
    is_active: bool
    started_at: Optional[str]
    ended_at: Optional[str]
    notes: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


def _enrich_member(m: CompanyAreaMember, db: Session) -> dict:
    area = db.get(BusinessArea, m.business_area_id)
    stk = db.get(Stakeholder, m.stakeholder_id)
    reports_to = db.get(CompanyAreaMember, m.reports_to_member_id) if m.reports_to_member_id else None
    reports_to_stk = db.get(Stakeholder, reports_to.stakeholder_id) if reports_to else None
    return {
        "id": m.id, "company_id": m.company_id,
        "business_area_id": m.business_area_id,
        "area_name": area.area_name if area else "—",
        "area_type": area.area_type if area else "OPERATIONAL",
        "area_color": area.area_color if area else None,
        "stakeholder_id": m.stakeholder_id,
        "stakeholder_name": stk.full_name if stk else "—",
        "stakeholder_email": stk.email if stk else None,
        "stakeholder_role": stk.position_title if stk else None,
        "role_in_area": m.role_in_area,
        "leadership_level": m.leadership_level,
        "reports_to_member_id": m.reports_to_member_id,
        "reports_to_name": reports_to_stk.full_name if reports_to_stk else None,
        "is_current": m.is_current,
        "is_active": m.is_active,
        "started_at": str(m.started_at) if m.started_at else None,
        "ended_at": str(m.ended_at) if m.ended_at else None,
        "notes": m.notes,
        "created_at": m.created_at,
    }


@router.get("/{id}/area-members", response_model=List[MemberOut])
def list_area_members(id: int, area_id: Optional[int] = None,
                      leaders_only: bool = False, current_only: bool = False,
                      db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Lista membros de área da empresa (inclui líderes e membros comuns)."""
    _get_company(id, db)
    q = db.query(CompanyAreaMember).filter(CompanyAreaMember.company_id == id)
    if area_id:
        q = q.filter(CompanyAreaMember.business_area_id == area_id)
    if leaders_only:
        q = q.filter(CompanyAreaMember.leadership_level != None)
    if current_only:
        q = q.filter(CompanyAreaMember.is_current == True)
    q = q.order_by(CompanyAreaMember.business_area_id, CompanyAreaMember.leadership_level.nullslast(), CompanyAreaMember.started_at.desc())
    return [_enrich_member(m, db) for m in q.all()]


# Keep legacy route alias for backward compatibility
@router.get("/{id}/leaders", response_model=List[MemberOut])
def list_leaders_compat(id: int, area_id: Optional[int] = None, current_only: bool = False,
                         db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return list_area_members(id, area_id=area_id, leaders_only=True, current_only=current_only, db=db, current_user=current_user)


@router.post("/{id}/area-members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_area_member(id: int, body: MemberCreate, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    _get_company(id, db)
    if body.leadership_level and body.leadership_level not in LEADERSHIP_LEVELS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"leadership_level must be one of {LEADERSHIP_LEVELS}")
    if body.reports_to_member_id:
        rpt = db.get(CompanyAreaMember, body.reports_to_member_id)
        if not rpt or rpt.company_id != id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                                "reports_to_member_id must belong to the same company")
    from datetime import date as date_type
    started = date_type.fromisoformat(body.started_at) if body.started_at else date_type.today()
    obj = CompanyAreaMember(
        company_id=id, business_area_id=body.business_area_id,
        stakeholder_id=body.stakeholder_id, role_in_area=body.role_in_area,
        leadership_level=body.leadership_level, reports_to_member_id=body.reports_to_member_id,
        started_at=started, is_current=True, is_active=True, notes=body.notes,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return _enrich_member(obj, db)


@router.post("/{id}/leaders", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def add_leader_compat(id: int, body: MemberCreate, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    """Legacy alias: POST /leaders maps to add_area_member with leadership_level."""
    if not body.leadership_level:
        body = body.model_copy(update={"leadership_level": "COORDINATOR"})
    return add_area_member(id, body=body, db=db, current_user=current_user)


@router.patch("/{id}/area-members/{member_id}", response_model=MemberOut)
def update_area_member(id: int, member_id: int, body: MemberUpdate,
                        db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.id == member_id, CompanyAreaMember.company_id == id
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    from datetime import date as date_type
    data = body.model_dump(exclude_unset=True)
    if "started_at" in data and data["started_at"]:
        data["started_at"] = date_type.fromisoformat(data["started_at"])
    if "ended_at" in data and data["ended_at"]:
        data["ended_at"] = date_type.fromisoformat(data["ended_at"])
        data["is_current"] = False
    if "reports_to_member_id" in data and data["reports_to_member_id"]:
        if data["reports_to_member_id"] == member_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cannot report to self")
        rpt = db.get(CompanyAreaMember, data["reports_to_member_id"])
        if not rpt or rpt.company_id != id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "reports_to_member_id must belong to same company")
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return _enrich_member(obj, db)


# Keep legacy patch/delete aliases
@router.patch("/{id}/leaders/{member_id}", response_model=MemberOut)
def update_leader_compat(id: int, member_id: int, body: MemberUpdate,
                          db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return update_area_member(id, member_id, body, db=db, current_user=current_user)


@router.delete("/{id}/area-members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_area_member(id: int, member_id: int, db: Session = Depends(get_db),
                        current_user=Depends(get_current_user)):
    obj = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.id == member_id, CompanyAreaMember.company_id == id
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    db.delete(obj); db.commit()


@router.delete("/{id}/leaders/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leader_compat(id: int, member_id: int, db: Session = Depends(get_db),
                          current_user=Depends(get_current_user)):
    return delete_area_member(id, member_id, db=db, current_user=current_user)


# ── Org-chart ──────────────────────────────────────────────────────────────────

@router.get("/{id}/org-chart")
def get_org_chart(id: int, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    """Organograma: hierarquia de áreas + cadeia de reporte (company_area_members)."""
    _get_company(id, db)

    assoc_ids = [r.business_area_id for r in
                 db.query(CompanyBusinessArea.business_area_id)
                 .filter(CompanyBusinessArea.company_id == id, CompanyBusinessArea.is_active == True).all()]
    if not assoc_ids:
        return []

    areas = db.query(BusinessArea).filter(BusinessArea.id.in_(assoc_ids)).all()

    # Leaders only (leadership_level IS NOT NULL, is_current=True)
    all_leaders = db.query(CompanyAreaMember).filter(
        CompanyAreaMember.company_id == id,
        CompanyAreaMember.is_current == True,
        CompanyAreaMember.leadership_level != None,
    ).all()

    member_map: dict = {}
    for m in all_leaders:
        stk = db.get(Stakeholder, m.stakeholder_id)
        member_map[m.id] = {
            "id": m.id, "stakeholder_id": m.stakeholder_id,
        "stakeholder_name": stk.full_name if stk else "—",
            "stakeholder_email": stk.email if stk else None,
            "stakeholder_role": stk.position_title if stk else None,
            "leadership_level": m.leadership_level,
            "reports_to_member_id": m.reports_to_member_id,
            "business_area_id": m.business_area_id,
            "started_at": str(m.started_at) if m.started_at else None,
        }

    def build_member_tree(mid: int, visited: set) -> dict:
        if mid in visited:
            return member_map.get(mid, {})
        visited.add(mid)
        node = dict(member_map[mid])
        node["subordinates"] = [
            build_member_tree(sid, visited)
            for sid, s in member_map.items()
            if s["reports_to_member_id"] == mid
        ]
        node["subordinates"].sort(
            key=lambda x: LEADERSHIP_LEVELS.index(x["leadership_level"])
                          if x["leadership_level"] in LEADERSHIP_LEVELS else 99
        )
        return node

    def get_area_leader_trees(area_id: int) -> list:
        area_ids = {mid for mid, m in member_map.items() if m["business_area_id"] == area_id}
        roots = [mid for mid in area_ids
                 if member_map[mid]["reports_to_member_id"] is None
                 or member_map[mid]["reports_to_member_id"] not in area_ids]
        roots_sorted = sorted(roots, key=lambda mid: LEADERSHIP_LEVELS.index(member_map[mid]["leadership_level"]) if member_map[mid]["leadership_level"] in LEADERSHIP_LEVELS else 99)
        return [build_member_tree(r, set()) for r in roots_sorted]

    def build_area_node(area: BusinessArea) -> dict:
        return {
            "id": area.id, "area_name": area.area_name, "area_type": area.area_type,
            "area_color": area.area_color, "level": area.level,
            "leaders": get_area_leader_trees(area.id),
            "children": [build_area_node(child) for child in areas if child.parent_area_id == area.id],
        }

    area_id_set = {a.id for a in areas}
    roots = [a for a in areas if a.parent_area_id is None or a.parent_area_id not in area_id_set]
    return [build_area_node(r) for r in sorted(roots, key=lambda a: (a.level, a.display_order, a.area_name))]
