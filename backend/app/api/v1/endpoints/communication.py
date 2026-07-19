"""
Communication Domain — API Endpoints
Cobre os principais casos de uso do MVP:
  - Communication Types (configuração)
  - Communications (estratégias por produto)
  - Audiences (públicos)
  - Publications (edições)
  - Sections (seções de conteúdo)
  - Publication Reviews (revisão / aprovação)
"""
from typing import Optional, List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.models.communication import (
    CommunicationType, CommunicationTemplate, TemplateSection,
    Communication, Audience,
    Publication, PublicationAudience, Section,
    PublicationReview,
)

router = APIRouter()


# ─── helpers ─────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, model, pk_field: str, pk_value):
    obj = db.get(model, pk_value)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} {pk_value} not found")
    return obj


def _paginate(db: Session, query, page: int, size: int):
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    return {"total": total or 0, "page": page, "size": size, "items": items}


# ══════════════════════════════════════════════════════════════════════════════
# COMMUNICATION TYPES
# ══════════════════════════════════════════════════════════════════════════════

class CommTypeCreate(BaseModel):
    name:           str
    description:    Optional[str] = None
    default_format: Optional[str] = None

class CommTypeUpdate(BaseModel):
    name:           Optional[str] = None
    description:    Optional[str] = None
    default_format: Optional[str] = None
    is_active:      Optional[bool] = None

class CommTypeOut(BaseModel):
    communication_type_id: int
    name:           str
    description:    Optional[str]
    default_format: Optional[str]
    is_active:      bool
    created_at:     datetime
    class Config: from_attributes = True


@router.get("/types", response_model=List[CommTypeOut], tags=["Communication Types"])
def list_communication_types(only_active: bool = True, db: Session = Depends(get_db)):
    q = select(CommunicationType)
    if only_active:
        q = q.where(CommunicationType.is_active == True)
    return db.scalars(q.order_by(CommunicationType.name)).all()


@router.post("/types", response_model=CommTypeOut, status_code=status.HTTP_201_CREATED, tags=["Communication Types"])
def create_communication_type(body: CommTypeCreate, db: Session = Depends(get_db)):
    obj = CommunicationType(**body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/types/{id}", response_model=CommTypeOut, tags=["Communication Types"])
def update_communication_type(id: int, body: CommTypeUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, CommunicationType, "communication_type_id", id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit(); db.refresh(obj)
    return obj


# ══════════════════════════════════════════════════════════════════════════════
# COMMUNICATIONS
# ══════════════════════════════════════════════════════════════════════════════

class CommunicationCreate(BaseModel):
    product_id:                int
    communication_type_id:     int
    communication_template_id: Optional[int] = None
    name:                      str
    description:               Optional[str] = None
    objective:                 str
    trigger_type:              str = "MANUAL"    # SCHEDULED | EVENT | MANUAL
    default_language:          Optional[str] = "pt-BR"
    default_tone:              Optional[str] = None
    default_detail_level:      Optional[str] = None

class CommunicationUpdate(BaseModel):
    communication_template_id: Optional[int] = None
    name:                      Optional[str] = None
    description:               Optional[str] = None
    objective:                 Optional[str] = None
    trigger_type:              Optional[str] = None
    default_language:          Optional[str] = None
    default_tone:              Optional[str] = None
    default_detail_level:      Optional[str] = None
    status:                    Optional[str] = None
    is_active:                 Optional[bool] = None

class CommunicationOut(BaseModel):
    communication_id:          int
    product_id:                int
    communication_type_id:     int
    communication_template_id: Optional[int]
    name:                      str
    description:               Optional[str]
    objective:                 str
    trigger_type:              str
    default_language:          Optional[str]
    default_tone:              Optional[str]
    default_detail_level:      Optional[str]
    status:                    str
    is_active:                 bool
    created_at:                datetime
    updated_at:                datetime
    class Config: from_attributes = True


# ══════════════════════════════════════════════════════════════════════════════
# AUDIENCES — schemas & routes (must be before /{id} to avoid routing conflict)
# ══════════════════════════════════════════════════════════════════════════════

class AudienceCreate(BaseModel):
    product_id:             Optional[int] = None
    name:                   str
    description:            Optional[str] = None
    audience_type:          str = "GROUP"
    preferred_language:     Optional[str] = None
    preferred_tone:         Optional[str] = None
    preferred_detail_level: Optional[str] = None

class AudienceUpdate(BaseModel):
    name:                   Optional[str] = None
    description:            Optional[str] = None
    audience_type:          Optional[str] = None
    preferred_language:     Optional[str] = None
    preferred_tone:         Optional[str] = None
    preferred_detail_level: Optional[str] = None
    is_active:              Optional[bool] = None

class AudienceOut(BaseModel):
    audience_id:            int
    product_id:             Optional[int]
    name:                   str
    description:            Optional[str]
    audience_type:          str
    preferred_language:     Optional[str]
    preferred_tone:         Optional[str]
    preferred_detail_level: Optional[str]
    is_active:              bool
    created_at:             datetime
    class Config: from_attributes = True


@router.get("/audiences", response_model=dict, tags=["Audiences"])
def list_audiences(
    page: int = 1, size: int = 50,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = select(Audience).where(Audience.is_active == True)
    if product_id is not None:
        q = q.where((Audience.product_id == product_id) | (Audience.product_id.is_(None)))
    q = q.order_by(Audience.name)
    result = _paginate(db, q, page, size)
    result["items"] = [AudienceOut.model_validate(i) for i in result["items"]]
    return result


@router.post("/audiences", response_model=AudienceOut, status_code=status.HTTP_201_CREATED, tags=["Audiences"])
def create_audience(body: AudienceCreate, db: Session = Depends(get_db)):
    obj = Audience(**body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/audiences/{id}", response_model=AudienceOut, tags=["Audiences"])
def update_audience(id: int, body: AudienceUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Audience, "audience_id", id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/audiences/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Audiences"])
def delete_audience(id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Audience, "audience_id", id)
    db.delete(obj); db.commit()


@router.get("", response_model=dict, tags=["Communications"])
def list_communications(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = select(Communication)
    if product_id: q = q.where(Communication.product_id == product_id)
    if status:     q = q.where(Communication.status == status)
    q = q.order_by(Communication.name)
    result = _paginate(db, q, page, size)
    result["items"] = [CommunicationOut.model_validate(i) for i in result["items"]]
    return result


@router.post("", response_model=CommunicationOut, status_code=status.HTTP_201_CREATED, tags=["Communications"])
def create_communication(body: CommunicationCreate, db: Session = Depends(get_db)):
    obj = Communication(**body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/{id}", response_model=CommunicationOut, tags=["Communications"])
def get_communication(id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, Communication, "communication_id", id)


@router.patch("/{id}", response_model=CommunicationOut, tags=["Communications"])
def update_communication(id: int, body: CommunicationUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Communication, "communication_id", id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Communications"])
def delete_communication(id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Communication, "communication_id", id)
    db.delete(obj); db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# PUBLICATIONS
# ══════════════════════════════════════════════════════════════════════════════

class PublicationCreate(BaseModel):
    communication_id:         int
    title:                    str
    subtitle:                 Optional[str] = None
    reference_label:          Optional[str] = None
    editorial_summary:        Optional[str] = None
    reference_start_date:     Optional[date] = None
    reference_end_date:       Optional[date] = None
    planned_publication_date: Optional[date] = None

class PublicationUpdate(BaseModel):
    title:                    Optional[str] = None
    subtitle:                 Optional[str] = None
    reference_label:          Optional[str] = None
    editorial_summary:        Optional[str] = None
    reference_start_date:     Optional[date] = None
    reference_end_date:       Optional[date] = None
    planned_publication_date: Optional[date] = None
    status:                   Optional[str] = None

class PublicationOut(BaseModel):
    publication_id:           int
    communication_id:         int
    reference_label:          Optional[str]
    title:                    str
    subtitle:                 Optional[str]
    reference_start_date:     Optional[date]
    reference_end_date:       Optional[date]
    planned_publication_date: Optional[date]
    published_at:             Optional[datetime]
    status:                   str
    editorial_summary:        Optional[str]
    version_number:           int
    created_at:               datetime
    updated_at:               datetime
    class Config: from_attributes = True


@router.get("/{comm_id}/publications", response_model=dict, tags=["Publications"])
def list_publications(
    comm_id: int, page: int = 1, size: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _get_or_404(db, Communication, "communication_id", comm_id)
    q = select(Publication).where(Publication.communication_id == comm_id)
    if status: q = q.where(Publication.status == status)
    q = q.order_by(Publication.created_at.desc())
    result = _paginate(db, q, page, size)
    result["items"] = [PublicationOut.model_validate(i) for i in result["items"]]
    return result


@router.post("/{comm_id}/publications", response_model=PublicationOut, status_code=status.HTTP_201_CREATED, tags=["Publications"])
def create_publication(comm_id: int, body: PublicationCreate, db: Session = Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    data = body.model_dump()
    data["communication_id"] = comm_id
    obj = Publication(**data)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/publications/{pub_id}", response_model=PublicationOut, tags=["Publications"])
def get_publication(pub_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, Publication, "publication_id", pub_id)


@router.patch("/publications/{pub_id}", response_model=PublicationOut, tags=["Publications"])
def update_publication(pub_id: int, body: PublicationUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Publication, "publication_id", pub_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/publications/{pub_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Publications"])
def delete_publication(pub_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Publication, "publication_id", pub_id)
    db.delete(obj); db.commit()


# ── Publication Audiences (N:N) ───────────────────────────────────────────────

class PubAudienceAdd(BaseModel):
    audience_id: int
    is_primary:  bool = False
    custom_language:     Optional[str] = None
    custom_tone:         Optional[str] = None
    custom_detail_level: Optional[str] = None

class PubAudienceOut(BaseModel):
    publication_audience_id: int
    publication_id:          int
    audience_id:             int
    is_primary:              bool
    custom_language:         Optional[str]
    custom_tone:             Optional[str]
    custom_detail_level:     Optional[str]
    class Config: from_attributes = True


@router.get("/publications/{pub_id}/audiences", response_model=List[PubAudienceOut], tags=["Publication Audiences"])
def list_publication_audiences(pub_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    q = select(PublicationAudience).where(PublicationAudience.publication_id == pub_id)
    return db.scalars(q).all()


@router.post("/publications/{pub_id}/audiences", response_model=PubAudienceOut, status_code=status.HTTP_201_CREATED, tags=["Publication Audiences"])
def add_publication_audience(pub_id: int, body: PubAudienceAdd, db: Session = Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    _get_or_404(db, Audience, "audience_id", body.audience_id)
    obj = PublicationAudience(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.delete("/publications/{pub_id}/audiences/{audience_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Publication Audiences"])
def remove_publication_audience(pub_id: int, audience_id: int, db: Session = Depends(get_db)):
    q = select(PublicationAudience).where(
        PublicationAudience.publication_id == pub_id,
        PublicationAudience.audience_id == audience_id,
    )
    obj = db.scalars(q).first()
    if not obj:
        raise HTTPException(status_code=404, detail="PublicationAudience not found")
    db.delete(obj); db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# SECTIONS
# ══════════════════════════════════════════════════════════════════════════════

class SectionCreate(BaseModel):
    section_key:     str
    title:           str
    subtitle:        Optional[str] = None
    current_content: Optional[str] = None
    display_order:   int = 0

class SectionUpdate(BaseModel):
    title:           Optional[str] = None
    subtitle:        Optional[str] = None
    current_content: Optional[str] = None
    display_order:   Optional[int] = None
    status:          Optional[str] = None

class SectionOut(BaseModel):
    section_id:          int
    publication_id:      int
    template_section_id: Optional[int]
    section_key:         str
    title:               str
    subtitle:            Optional[str]
    current_content:     Optional[str]
    display_order:       int
    status:              str
    is_ai_generated:     bool
    created_at:          datetime
    updated_at:          datetime
    class Config: from_attributes = True


@router.get("/publications/{pub_id}/sections", response_model=List[SectionOut], tags=["Sections"])
def list_sections(pub_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    q = select(Section).where(Section.publication_id == pub_id).order_by(Section.display_order)
    return db.scalars(q).all()


@router.post("/publications/{pub_id}/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED, tags=["Sections"])
def create_section(pub_id: int, body: SectionCreate, db: Session = Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    obj = Section(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/sections/{section_id}", response_model=SectionOut, tags=["Sections"])
def update_section(section_id: int, body: SectionUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Section, "section_id", section_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Sections"])
def delete_section(section_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Section, "section_id", section_id)
    db.delete(obj); db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# PUBLICATION REVIEWS (Revisão / Aprovação)
# ══════════════════════════════════════════════════════════════════════════════

class ReviewCreate(BaseModel):
    action:      str   # SUBMITTED_FOR_REVIEW | REVIEWED | CHANGES_REQUESTED | APPROVED | REJECTED | PUBLISHED | REPUBLISHED | ARCHIVED
    comments:    Optional[str] = None
    performed_by: Optional[int] = None

class ReviewOut(BaseModel):
    publication_review_id: int
    publication_id:        int
    action:                str
    comments:              Optional[str]
    performed_by:          Optional[int]
    performed_at:          datetime
    class Config: from_attributes = True


@router.get("/publications/{pub_id}/reviews", response_model=List[ReviewOut], tags=["Reviews"])
def list_reviews(pub_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    q = select(PublicationReview).where(
        PublicationReview.publication_id == pub_id
    ).order_by(PublicationReview.performed_at.desc())
    return db.scalars(q).all()


@router.post("/publications/{pub_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED, tags=["Reviews"])
def create_review(pub_id: int, body: ReviewCreate, db: Session = Depends(get_db)):
    pub = _get_or_404(db, Publication, "publication_id", pub_id)

    # map review action to publication status
    status_map = {
        "SUBMITTED_FOR_REVIEW": "IN_REVIEW",
        "APPROVED":             "APPROVED",
        "REJECTED":             "DRAFT",
        "PUBLISHED":            "PUBLISHED",
        "ARCHIVED":             "ARCHIVED",
    }
    if body.action in status_map:
        pub.status = status_map[body.action]
        if body.action == "PUBLISHED":
            pub.published_at = datetime.utcnow()
        pub.updated_at = datetime.utcnow()

    review = PublicationReview(
        publication_id=pub_id,
        action=body.action,
        comments=body.comments,
        performed_by=body.performed_by,
    )
    db.add(review); db.commit(); db.refresh(review)
    return review
