"""
Communication Domain — API Endpoints — v2.0
UC-001 Types | UC-003 Templates | UC-005 OpenAI | UC-006/7/8 Review/Approve/Publish
UC-009 History | UC-010 Regenerate | Schedules | Versions | Delivery
"""
import time, json
from typing import Optional, List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import settings
from app.models.communication import (
    CommunicationType, CommunicationTemplate, TemplateSection,
    Communication, CommunicationSchedule, Audience, AudienceMember,
    Publication, PublicationAudience, Section,
    AgentExecution, ExecutionEvidence,
    PublicationReview, PublicationVersion,
    DeliveryChannel, PublicationDelivery, DeliveryRecipient,
)
from app.models.stakeholder import Stakeholder

router = APIRouter()

# ── helpers ───────────────────────────────────────────────────────────────────
def _get_or_404(db, model, pk_field, pk_value):
    obj = db.get(model, pk_value)
    if not obj:
        raise HTTPException(404, f"{model.__name__} {pk_value} not found")
    return obj

def _paginate(db, query, page, size):
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page-1)*size).limit(size)).all()
    return {"total": total or 0, "page": page, "size": size, "items": items}

# ══════════════════════════════════════════════════════════════════════════════
# UC-001 — COMMUNICATION TYPES
# ══════════════════════════════════════════════════════════════════════════════
class CommTypeCreate(BaseModel):
    name: str; description: Optional[str]=None; default_format: Optional[str]=None

class CommTypeUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    default_format: Optional[str]=None; is_active: Optional[bool]=None

class CommTypeOut(BaseModel):
    communication_type_id: int; name: str; description: Optional[str]
    default_format: Optional[str]; is_active: bool; created_at: datetime
    class Config: from_attributes=True

@router.get("/types", response_model=List[CommTypeOut], tags=["Communication Types"])
def list_communication_types(only_active: bool=True, db: Session=Depends(get_db)):
    q = select(CommunicationType)
    if only_active: q = q.where(CommunicationType.is_active==True)
    return db.scalars(q.order_by(CommunicationType.name)).all()

@router.post("/types", response_model=CommTypeOut, status_code=201, tags=["Communication Types"])
def create_communication_type(body: CommTypeCreate, db: Session=Depends(get_db)):
    obj = CommunicationType(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.get("/types/{id}", response_model=CommTypeOut, tags=["Communication Types"])
def get_communication_type(id: int, db: Session=Depends(get_db)):
    return _get_or_404(db, CommunicationType, "communication_type_id", id)

@router.patch("/types/{id}", response_model=CommTypeOut, tags=["Communication Types"])
def update_communication_type(id: int, body: CommTypeUpdate, db: Session=Depends(get_db)):
    obj = _get_or_404(db, CommunicationType, "communication_type_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/types/{id}", status_code=204, tags=["Communication Types"])
def delete_communication_type(id: int, db: Session=Depends(get_db)):
    obj = _get_or_404(db, CommunicationType, "communication_type_id", id)
    obj.is_active=False; obj.updated_at=datetime.utcnow(); db.commit()

# ══════════════════════════════════════════════════════════════════════════════
# UC-003 — TEMPLATES
# ══════════════════════════════════════════════════════════════════════════════
class TemplateCreate(BaseModel):
    communication_type_id: int; name: str; description: Optional[str]=None
    general_prompt: Optional[str]=None; default_language: str="pt-BR"
    default_tone: Optional[str]=None; default_detail_level: Optional[str]=None
    default_output_format: Optional[str]=None

class TemplateUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    general_prompt: Optional[str]=None; default_language: Optional[str]=None
    default_tone: Optional[str]=None; default_detail_level: Optional[str]=None
    default_output_format: Optional[str]=None; is_active: Optional[bool]=None

class TemplateOut(BaseModel):
    communication_template_id: int; communication_type_id: int; name: str
    description: Optional[str]; general_prompt: Optional[str]; default_language: str
    default_tone: Optional[str]; default_detail_level: Optional[str]
    default_output_format: Optional[str]; is_active: bool
    created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

@router.get("/templates", response_model=dict, tags=["Templates"])
def list_templates(page:int=1, size:int=50, comm_type_id:Optional[int]=None, only_active:bool=True, db:Session=Depends(get_db)):
    q = select(CommunicationTemplate)
    if only_active: q=q.where(CommunicationTemplate.is_active==True)
    if comm_type_id: q=q.where(CommunicationTemplate.communication_type_id==comm_type_id)
    result=_paginate(db, q.order_by(CommunicationTemplate.name), page, size)
    result["items"]=[TemplateOut.model_validate(i) for i in result["items"]]; return result

@router.post("/templates", response_model=TemplateOut, status_code=201, tags=["Templates"])
def create_template(body: TemplateCreate, db:Session=Depends(get_db)):
    obj=CommunicationTemplate(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.get("/templates/{id}", response_model=TemplateOut, tags=["Templates"])
def get_template(id:int, db:Session=Depends(get_db)):
    return _get_or_404(db, CommunicationTemplate, "communication_template_id", id)

@router.patch("/templates/{id}", response_model=TemplateOut, tags=["Templates"])
def update_template(id:int, body:TemplateUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, CommunicationTemplate, "communication_template_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/templates/{id}", status_code=204, tags=["Templates"])
def delete_template(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, CommunicationTemplate, "communication_template_id", id)
    obj.is_active=False; obj.updated_at=datetime.utcnow(); db.commit()

# ── Template Sections ─────────────────────────────────────────────────────────
class TplSectionCreate(BaseModel):
    section_key: str; title: str; description: Optional[str]=None
    generation_prompt: Optional[str]=None; display_order: int=0; is_required: bool=True
    minimum_items: Optional[int]=None; maximum_items: Optional[int]=None; target_length: Optional[int]=None

class TplSectionUpdate(BaseModel):
    section_key: Optional[str]=None; title: Optional[str]=None; description: Optional[str]=None
    generation_prompt: Optional[str]=None; display_order: Optional[int]=None
    is_required: Optional[bool]=None; minimum_items: Optional[int]=None
    maximum_items: Optional[int]=None; target_length: Optional[int]=None; is_active: Optional[bool]=None

class TplSectionOut(BaseModel):
    template_section_id: int; communication_template_id: int; section_key: str; title: str
    description: Optional[str]; generation_prompt: Optional[str]; display_order: int
    is_required: bool; minimum_items: Optional[int]; maximum_items: Optional[int]
    target_length: Optional[int]; is_active: bool
    class Config: from_attributes=True

@router.get("/templates/{tpl_id}/sections", response_model=List[TplSectionOut], tags=["Templates"])
def list_template_sections(tpl_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, CommunicationTemplate, "communication_template_id", tpl_id)
    q=(select(TemplateSection).where(TemplateSection.communication_template_id==tpl_id)
       .where(TemplateSection.is_active==True).order_by(TemplateSection.display_order))
    return db.scalars(q).all()

@router.post("/templates/{tpl_id}/sections", response_model=TplSectionOut, status_code=201, tags=["Templates"])
def create_template_section(tpl_id:int, body:TplSectionCreate, db:Session=Depends(get_db)):
    _get_or_404(db, CommunicationTemplate, "communication_template_id", tpl_id)
    obj=TemplateSection(**body.model_dump(), communication_template_id=tpl_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/template-sections/{id}", response_model=TplSectionOut, tags=["Templates"])
def update_template_section(id:int, body:TplSectionUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, TemplateSection, "template_section_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/template-sections/{id}", status_code=204, tags=["Templates"])
def delete_template_section(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, TemplateSection, "template_section_id", id)
    obj.is_active=False; obj.updated_at=datetime.utcnow(); db.commit()

# ══════════════════════════════════════════════════════════════════════════════
# AUDIENCES
# ══════════════════════════════════════════════════════════════════════════════
class AudienceCreate(BaseModel):
    product_id: Optional[int]=None; name: str; description: Optional[str]=None
    audience_type: str="GROUP"; preferred_language: Optional[str]=None
    preferred_tone: Optional[str]=None; preferred_detail_level: Optional[str]=None

class AudienceUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None; audience_type: Optional[str]=None
    preferred_language: Optional[str]=None; preferred_tone: Optional[str]=None
    preferred_detail_level: Optional[str]=None; is_active: Optional[bool]=None

class AudienceOut(BaseModel):
    audience_id: int; product_id: Optional[int]; name: str; description: Optional[str]
    audience_type: str; preferred_language: Optional[str]; preferred_tone: Optional[str]
    preferred_detail_level: Optional[str]; is_active: bool; created_at: datetime
    class Config: from_attributes=True

@router.get("/audiences", response_model=dict, tags=["Audiences"])
def list_audiences(page:int=1, size:int=50, product_id:Optional[int]=None, db:Session=Depends(get_db)):
    q=select(Audience).where(Audience.is_active==True)
    if product_id is not None: q=q.where((Audience.product_id==product_id)|(Audience.product_id.is_(None)))
    result=_paginate(db, q.order_by(Audience.name), page, size)
    result["items"]=[AudienceOut.model_validate(i) for i in result["items"]]; return result

@router.post("/audiences", response_model=AudienceOut, status_code=201, tags=["Audiences"])
def create_audience(body:AudienceCreate, db:Session=Depends(get_db)):
    obj=Audience(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/audiences/{id}", response_model=AudienceOut, tags=["Audiences"])
def update_audience(id:int, body:AudienceUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Audience, "audience_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/audiences/{id}", status_code=204, tags=["Audiences"])
def delete_audience(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Audience, "audience_id", id); db.delete(obj); db.commit()

# ── Audience Members (Stakeholders) ──────────────────────────────────────────
class AudienceMemberOut(BaseModel):
    audience_member_id: int
    audience_id:        int
    stakeholder_id:     int
    notes:              Optional[str]
    created_at:         datetime
    # Stakeholder info (joined)
    full_name:          Optional[str] = None
    position_title:     Optional[str] = None
    area:               Optional[str] = None
    company:            Optional[str] = None
    email:              Optional[str] = None
    class Config: from_attributes=True

class AudienceMemberAdd(BaseModel):
    stakeholder_id: int
    notes: Optional[str] = None

@router.get("/audiences/{aud_id}/members", response_model=List[AudienceMemberOut], tags=["Audiences"])
def list_audience_members(aud_id:int, db:Session=Depends(get_db)):
    """Lista os stakeholders membros de uma audiência."""
    _get_or_404(db, Audience, "audience_id", aud_id)
    members = db.scalars(
        select(AudienceMember).where(AudienceMember.audience_id==aud_id)
        .order_by(AudienceMember.created_at)
    ).all()
    result = []
    for m in members:
        stk = db.get(Stakeholder, m.stakeholder_id)
        result.append(AudienceMemberOut(
            audience_member_id=m.audience_member_id,
            audience_id=m.audience_id,
            stakeholder_id=m.stakeholder_id,
            notes=m.notes,
            created_at=m.created_at,
            full_name=stk.full_name if stk else None,
            position_title=stk.position_title if stk else None,
            area=stk.area if stk else None,
            company=stk.company if stk else None,
            email=stk.email if stk else None,
        ))
    return result

@router.post("/audiences/{aud_id}/members", response_model=AudienceMemberOut, status_code=201, tags=["Audiences"])
def add_audience_member(aud_id:int, body:AudienceMemberAdd, db:Session=Depends(get_db)):
    """Adiciona um stakeholder à audiência."""
    _get_or_404(db, Audience, "audience_id", aud_id)
    _get_or_404(db, Stakeholder, "stakeholder_id", body.stakeholder_id)
    # Check duplicate
    existing = db.scalars(select(AudienceMember).where(
        AudienceMember.audience_id==aud_id,
        AudienceMember.stakeholder_id==body.stakeholder_id
    )).first()
    if existing:
        raise HTTPException(400, "Stakeholder already member of this audience")
    obj = AudienceMember(audience_id=aud_id, stakeholder_id=body.stakeholder_id, notes=body.notes)
    db.add(obj); db.commit(); db.refresh(obj)
    stk = db.get(Stakeholder, obj.stakeholder_id)
    return AudienceMemberOut(
        audience_member_id=obj.audience_member_id,
        audience_id=obj.audience_id,
        stakeholder_id=obj.stakeholder_id,
        notes=obj.notes,
        created_at=obj.created_at,
        full_name=stk.full_name if stk else None,
        position_title=stk.position_title if stk else None,
        area=stk.area if stk else None,
        company=stk.company if stk else None,
        email=stk.email if stk else None,
    )

@router.delete("/audiences/{aud_id}/members/{stakeholder_id}", status_code=204, tags=["Audiences"])
def remove_audience_member(aud_id:int, stakeholder_id:int, db:Session=Depends(get_db)):
    """Remove um stakeholder da audiência."""
    obj = db.scalars(select(AudienceMember).where(
        AudienceMember.audience_id==aud_id,
        AudienceMember.stakeholder_id==stakeholder_id
    )).first()
    if not obj: raise HTTPException(404, "Member not found")
    db.delete(obj); db.commit()

# ══════════════════════════════════════════════════════════════════════════════
# COMMUNICATIONS
# ══════════════════════════════════════════════════════════════════════════════
class CommunicationCreate(BaseModel):
    product_id: int; communication_type_id: int; communication_template_id: Optional[int]=None
    name: str; description: Optional[str]=None; objective: str; trigger_type: str="MANUAL"
    default_language: Optional[str]="pt-BR"; default_tone: Optional[str]=None
    default_detail_level: Optional[str]=None

class CommunicationUpdate(BaseModel):
    communication_template_id: Optional[int]=None; name: Optional[str]=None
    description: Optional[str]=None; objective: Optional[str]=None
    trigger_type: Optional[str]=None; default_language: Optional[str]=None
    default_tone: Optional[str]=None; default_detail_level: Optional[str]=None
    status: Optional[str]=None; is_active: Optional[bool]=None

class CommunicationOut(BaseModel):
    communication_id: int; product_id: int; communication_type_id: int
    communication_template_id: Optional[int]; name: str; description: Optional[str]
    objective: str; trigger_type: str; default_language: Optional[str]
    default_tone: Optional[str]; default_detail_level: Optional[str]
    status: str; is_active: bool; created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

@router.get("", response_model=dict, tags=["Communications"])
def list_communications(page:int=1, size:int=20, product_id:Optional[int]=None, status:Optional[str]=None, db:Session=Depends(get_db)):
    q=select(Communication)
    if product_id: q=q.where(Communication.product_id==product_id)
    if status: q=q.where(Communication.status==status)
    result=_paginate(db, q.order_by(Communication.name), page, size)
    result["items"]=[CommunicationOut.model_validate(i) for i in result["items"]]; return result

@router.post("", response_model=CommunicationOut, status_code=201, tags=["Communications"])
def create_communication(body:CommunicationCreate, db:Session=Depends(get_db)):
    obj=Communication(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.get("/{id}", response_model=CommunicationOut, tags=["Communications"])
def get_communication(id:int, db:Session=Depends(get_db)):
    return _get_or_404(db, Communication, "communication_id", id)

@router.patch("/{id}", response_model=CommunicationOut, tags=["Communications"])
def update_communication(id:int, body:CommunicationUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Communication, "communication_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/{id}", status_code=204, tags=["Communications"])
def delete_communication(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Communication, "communication_id", id); db.delete(obj); db.commit()

# ── Communication Schedules ───────────────────────────────────────────────────
class ScheduleCreate(BaseModel):
    recurrence_type: str; recurrence_interval: int=1; reference_event: Optional[str]=None
    publication_offset_days: int=0; day_of_week: Optional[int]=None; day_of_month: Optional[int]=None
    execution_time: Optional[str]=None; timezone: str="America/Sao_Paulo"
    cron_expression: Optional[str]=None; starts_at: Optional[date]=None; ends_at: Optional[date]=None

class ScheduleUpdate(BaseModel):
    recurrence_type: Optional[str]=None; recurrence_interval: Optional[int]=None
    reference_event: Optional[str]=None; publication_offset_days: Optional[int]=None
    day_of_week: Optional[int]=None; day_of_month: Optional[int]=None
    execution_time: Optional[str]=None; timezone: Optional[str]=None
    cron_expression: Optional[str]=None; starts_at: Optional[date]=None
    ends_at: Optional[date]=None; is_active: Optional[bool]=None

class ScheduleOut(BaseModel):
    communication_schedule_id: int; communication_id: int; recurrence_type: str
    recurrence_interval: int; reference_event: Optional[str]; publication_offset_days: int
    day_of_week: Optional[int]; day_of_month: Optional[int]; timezone: str
    cron_expression: Optional[str]; starts_at: Optional[date]; ends_at: Optional[date]; is_active: bool
    class Config: from_attributes=True

@router.get("/{comm_id}/schedule", response_model=Optional[ScheduleOut], tags=["Schedules"])
def get_schedule(comm_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    q=select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)
    return db.scalars(q).first()

@router.post("/{comm_id}/schedule", response_model=ScheduleOut, status_code=201, tags=["Schedules"])
def create_schedule(comm_id:int, body:ScheduleCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    existing=db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()
    if existing: raise HTTPException(400, "Schedule already exists, use PATCH to update")
    obj=CommunicationSchedule(**body.model_dump(), communication_id=comm_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/{comm_id}/schedule", response_model=ScheduleOut, tags=["Schedules"])
def update_schedule(comm_id:int, body:ScheduleUpdate, db:Session=Depends(get_db)):
    obj=db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()
    if not obj: raise HTTPException(404, "Schedule not found")
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/{comm_id}/schedule", status_code=204, tags=["Schedules"])
def delete_schedule(comm_id:int, db:Session=Depends(get_db)):
    obj=db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()
    if not obj: raise HTTPException(404, "Schedule not found")
    db.delete(obj); db.commit()

# ══════════════════════════════════════════════════════════════════════════════
# PUBLICATIONS
# ══════════════════════════════════════════════════════════════════════════════
class PublicationCreate(BaseModel):
    communication_id: int; title: str; subtitle: Optional[str]=None
    reference_label: Optional[str]=None; editorial_summary: Optional[str]=None
    reference_start_date: Optional[date]=None; reference_end_date: Optional[date]=None
    planned_publication_date: Optional[date]=None

class PublicationUpdate(BaseModel):
    title: Optional[str]=None; subtitle: Optional[str]=None
    reference_label: Optional[str]=None; editorial_summary: Optional[str]=None
    reference_start_date: Optional[date]=None; reference_end_date: Optional[date]=None
    planned_publication_date: Optional[date]=None; status: Optional[str]=None

class PublicationOut(BaseModel):
    publication_id: int; communication_id: int; reference_label: Optional[str]
    title: str; subtitle: Optional[str]; reference_start_date: Optional[date]
    reference_end_date: Optional[date]; planned_publication_date: Optional[date]
    published_at: Optional[datetime]; status: str; editorial_summary: Optional[str]
    version_number: int; created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

@router.get("/{comm_id}/publications", response_model=dict, tags=["Publications"])
def list_publications(comm_id:int, page:int=1, size:int=20, status:Optional[str]=None, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    q=select(Publication).where(Publication.communication_id==comm_id)
    if status: q=q.where(Publication.status==status)
    result=_paginate(db, q.order_by(Publication.created_at.desc()), page, size)
    result["items"]=[PublicationOut.model_validate(i) for i in result["items"]]; return result

@router.post("/{comm_id}/publications", response_model=PublicationOut, status_code=201, tags=["Publications"])
def create_publication(comm_id:int, body:PublicationCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    data=body.model_dump(); data["communication_id"]=comm_id
    obj=Publication(**data); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.get("/publications/{pub_id}", response_model=PublicationOut, tags=["Publications"])
def get_publication(pub_id:int, db:Session=Depends(get_db)):
    return _get_or_404(db, Publication, "publication_id", pub_id)

@router.patch("/publications/{pub_id}", response_model=PublicationOut, tags=["Publications"])
def update_publication(pub_id:int, body:PublicationUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Publication, "publication_id", pub_id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/publications/{pub_id}", status_code=204, tags=["Publications"])
def delete_publication(pub_id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Publication, "publication_id", pub_id); db.delete(obj); db.commit()

# ── Publication Audiences ─────────────────────────────────────────────────────
class PubAudienceAdd(BaseModel):
    audience_id: int; is_primary: bool=False
    custom_language: Optional[str]=None; custom_tone: Optional[str]=None; custom_detail_level: Optional[str]=None

class PubAudienceOut(BaseModel):
    publication_audience_id: int; publication_id: int; audience_id: int
    is_primary: bool; custom_language: Optional[str]; custom_tone: Optional[str]; custom_detail_level: Optional[str]
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/audiences", response_model=List[PubAudienceOut], tags=["Publication Audiences"])
def list_publication_audiences(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(PublicationAudience).where(PublicationAudience.publication_id==pub_id)).all()

@router.post("/publications/{pub_id}/audiences", response_model=PubAudienceOut, status_code=201, tags=["Publication Audiences"])
def add_publication_audience(pub_id:int, body:PubAudienceAdd, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    _get_or_404(db, Audience, "audience_id", body.audience_id)
    obj=PublicationAudience(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.delete("/publications/{pub_id}/audiences/{audience_id}", status_code=204, tags=["Publication Audiences"])
def remove_publication_audience(pub_id:int, audience_id:int, db:Session=Depends(get_db)):
    obj=db.scalars(select(PublicationAudience).where(
        PublicationAudience.publication_id==pub_id, PublicationAudience.audience_id==audience_id)).first()
    if not obj: raise HTTPException(404, "PublicationAudience not found")
    db.delete(obj); db.commit()

# ══════════════════════════════════════════════════════════════════════════════
# SECTIONS
# ══════════════════════════════════════════════════════════════════════════════
class SectionCreate(BaseModel):
    section_key: str; title: str; subtitle: Optional[str]=None
    current_content: Optional[str]=None; display_order: int=0; template_section_id: Optional[int]=None

class SectionUpdate(BaseModel):
    title: Optional[str]=None; subtitle: Optional[str]=None
    current_content: Optional[str]=None; display_order: Optional[int]=None; status: Optional[str]=None

class SectionOut(BaseModel):
    section_id: int; publication_id: int; template_section_id: Optional[int]
    section_key: str; title: str; subtitle: Optional[str]; current_content: Optional[str]
    display_order: int; status: str; is_ai_generated: bool; created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/sections", response_model=List[SectionOut], tags=["Sections"])
def list_sections(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(Section).where(Section.publication_id==pub_id).order_by(Section.display_order)).all()

@router.post("/publications/{pub_id}/sections", response_model=SectionOut, status_code=201, tags=["Sections"])
def create_section(pub_id:int, body:SectionCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    obj=Section(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/sections/{section_id}", response_model=SectionOut, tags=["Sections"])
def update_section(section_id:int, body:SectionUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Section, "section_id", section_id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/sections/{section_id}", status_code=204, tags=["Sections"])
def delete_section(section_id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Section, "section_id", section_id); db.delete(obj); db.commit()

# ── UC-005 / UC-010 — Generate section with OpenAI ───────────────────────────
class GenerateRequest(BaseModel):
    extra_context: Optional[str]=None
    requested_by: Optional[int]=None

class AgentExecOut(BaseModel):
    agent_execution_id: int; section_id: int; provider: Optional[str]; model_name: Optional[str]
    status: str; generated_content: Optional[str]; input_tokens: Optional[int]
    output_tokens: Optional[int]; total_tokens: Optional[int]; estimated_cost: Optional[float]
    execution_time_ms: Optional[int]; error_message: Optional[str]
    created_at: datetime; started_at: Optional[datetime]; completed_at: Optional[datetime]
    class Config: from_attributes=True; protected_namespaces=()

def _build_context(db:Session, section:Section) -> tuple[str,str,str]:
    """Assembles (general_prompt, section_prompt, assembled_context) for a section."""
    pub = db.get(Publication, section.publication_id)
    comm = db.get(Communication, pub.communication_id)
    comm_type = db.get(CommunicationType, comm.communication_type_id)
    template = db.get(CommunicationTemplate, comm.communication_template_id) if comm.communication_template_id else None
    tpl_section = db.get(TemplateSection, section.template_section_id) if section.template_section_id else None

    audiences = db.scalars(
        select(PublicationAudience).where(PublicationAudience.publication_id==pub.publication_id)
    ).all()
    audience_names = []
    for pa in audiences:
        aud = db.get(Audience, pa.audience_id)
        if aud:
            lang = pa.custom_language or aud.preferred_language or comm.default_language or "pt-BR"
            tone = pa.custom_tone or aud.preferred_tone or comm.default_tone or "Neutral"
            audience_names.append(f"  - {aud.name} ({aud.audience_type}) | idioma: {lang} | tom: {tone}")

    general_prompt = (template.general_prompt if template else None) or \
        "Você é um assistente de comunicação para Product Managers. Escreva de forma clara, objetiva e baseada exclusivamente nas informações fornecidas."

    section_prompt = (tpl_section.generation_prompt if tpl_section else None) or \
        f"Gere o conteúdo para a seção '{section.title}'. Seja conciso e objetivo."

    period = ""
    if pub.reference_start_date and pub.reference_end_date:
        period = f"Período de referência: {pub.reference_start_date} a {pub.reference_end_date}"
    elif pub.reference_label:
        period = f"Referência: {pub.reference_label}"

    ctx_parts = [
        f"TIPO DE COMUNICAÇÃO: {comm_type.name if comm_type else 'N/A'}",
        f"COMUNICAÇÃO: {comm.name}",
        f"OBJETIVO: {comm.objective}",
        f"PUBLICAÇÃO: {pub.title}",
    ]
    if period: ctx_parts.append(period)
    if pub.editorial_summary: ctx_parts.append(f"SUMÁRIO EDITORIAL: {pub.editorial_summary}")
    if audience_names:
        ctx_parts.append("AUDIÊNCIAS:\n" + "\n".join(audience_names))
    ctx_parts.append(f"\nSEÇÃO A GERAR: {section.title} (key: {section.section_key})")
    if tpl_section and tpl_section.description:
        ctx_parts.append(f"DESCRIÇÃO DA SEÇÃO: {tpl_section.description}")
    if tpl_section and tpl_section.target_length:
        ctx_parts.append(f"TAMANHO ESPERADO: aproximadamente {tpl_section.target_length} palavras")

    assembled = "\n".join(ctx_parts)
    return general_prompt, section_prompt, assembled

@router.post("/sections/{section_id}/generate", response_model=AgentExecOut, tags=["AI Generation"])
def generate_section(section_id:int, body:GenerateRequest, db:Session=Depends(get_db)):
    """UC-005 / UC-010 — Gera ou regenera o conteúdo de uma seção usando OpenAI."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(400, "OPENAI_API_KEY not configured")

    section = _get_or_404(db, Section, "section_id", section_id)
    general_prompt, section_prompt, assembled_context = _build_context(db, section)
    if body.extra_context:
        assembled_context += f"\n\nCONTEXTO ADICIONAL FORNECIDO:\n{body.extra_context}"

    execution = AgentExecution(
        section_id=section_id, provider="openai", model_name=settings.OPENAI_MODEL,
        general_prompt=general_prompt, section_prompt=section_prompt,
        assembled_context=assembled_context, status="RUNNING",
        requested_by=body.requested_by, started_at=datetime.utcnow(),
    )
    db.add(execution); db.commit(); db.refresh(execution)

    # update section status
    section.status = "GENERATING"; section.updated_at = datetime.utcnow(); db.commit()

    t0 = time.time()
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        messages = [
            {"role":"system","content": general_prompt},
            {"role":"user","content": f"{assembled_context}\n\nINSTRUÇÕES DA SEÇÃO:\n{section_prompt}"},
        ]
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
        )
        elapsed_ms = int((time.time()-t0)*1000)
        content = response.choices[0].message.content or ""
        usage = response.usage
        cost = None
        if usage:
            cost = round((usage.prompt_tokens*0.00000015)+(usage.completion_tokens*0.0000006), 8)
        execution.status="COMPLETED"; execution.generated_content=content
        execution.input_tokens=usage.prompt_tokens if usage else None
        execution.output_tokens=usage.completion_tokens if usage else None
        execution.total_tokens=usage.total_tokens if usage else None
        execution.estimated_cost=cost; execution.currency="USD"
        execution.execution_time_ms=elapsed_ms; execution.completed_at=datetime.utcnow()
        db.commit()
        section.current_content=content; section.status="GENERATED"
        section.is_ai_generated=True; section.updated_at=datetime.utcnow()
        db.commit(); db.refresh(execution); return execution
    except Exception as e:
        execution.status="FAILED"; execution.error_message=str(e)
        execution.completed_at=datetime.utcnow()
        db.commit()
        section.status="DRAFT"; section.updated_at=datetime.utcnow(); db.commit()
        raise HTTPException(500, f"OpenAI error: {e}")

@router.get("/sections/{section_id}/executions", response_model=List[AgentExecOut], tags=["AI Generation"])
def list_section_executions(section_id:int, db:Session=Depends(get_db)):
    """UC-009 — Histórico de execuções de IA de uma seção."""
    _get_or_404(db, Section, "section_id", section_id)
    q=select(AgentExecution).where(AgentExecution.section_id==section_id).order_by(AgentExecution.created_at.desc())
    return db.scalars(q).all()

# ══════════════════════════════════════════════════════════════════════════════
# UC-006/007/008 — PUBLICATION REVIEWS
# ══════════════════════════════════════════════════════════════════════════════
class ReviewCreate(BaseModel):
    action: str; comments: Optional[str]=None; performed_by: Optional[int]=None

class ReviewOut(BaseModel):
    publication_review_id: int; publication_id: int; action: str
    comments: Optional[str]; performed_by: Optional[int]; performed_at: datetime
    class Config: from_attributes=True

STATUS_MAP = {
    "SUBMITTED_FOR_REVIEW":"IN_REVIEW","APPROVED":"APPROVED",
    "REJECTED":"DRAFT","PUBLISHED":"PUBLISHED","ARCHIVED":"ARCHIVED",
}

@router.get("/publications/{pub_id}/reviews", response_model=List[ReviewOut], tags=["Reviews"])
def list_reviews(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    q=select(PublicationReview).where(PublicationReview.publication_id==pub_id).order_by(PublicationReview.performed_at.desc())
    return db.scalars(q).all()

@router.post("/publications/{pub_id}/reviews", response_model=ReviewOut, status_code=201, tags=["Reviews"])
def create_review(pub_id:int, body:ReviewCreate, db:Session=Depends(get_db)):
    pub=_get_or_404(db, Publication, "publication_id", pub_id)
    if body.action in STATUS_MAP:
        pub.status=STATUS_MAP[body.action]
        if body.action=="PUBLISHED": pub.published_at=datetime.utcnow()
        pub.updated_at=datetime.utcnow()
    review=PublicationReview(publication_id=pub_id, action=body.action, comments=body.comments, performed_by=body.performed_by)
    db.add(review); db.commit(); db.refresh(review); return review

# ══════════════════════════════════════════════════════════════════════════════
# UC-009 — PUBLICATION VERSIONS (snapshots)
# ══════════════════════════════════════════════════════════════════════════════
class VersionOut(BaseModel):
    publication_version_id: int; publication_id: int; version_number: int
    version_label: Optional[str]; change_reason: Optional[str]
    publication_snapshot: dict; created_by: Optional[int]; created_at: datetime
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/versions", response_model=List[VersionOut], tags=["Versions"])
def list_versions(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    q=select(PublicationVersion).where(PublicationVersion.publication_id==pub_id).order_by(PublicationVersion.version_number.desc())
    return db.scalars(q).all()

@router.post("/publications/{pub_id}/versions", response_model=VersionOut, status_code=201, tags=["Versions"])
def create_version(pub_id:int, change_reason:Optional[str]=None, created_by:Optional[int]=None, db:Session=Depends(get_db)):
    """Cria um snapshot da publicação atual (UC-009)."""
    pub=_get_or_404(db, Publication, "publication_id", pub_id)
    sections=db.scalars(select(Section).where(Section.publication_id==pub_id)).all()
    snapshot={"title":pub.title,"subtitle":pub.subtitle,"status":pub.status,"reference_label":pub.reference_label,
              "editorial_summary":pub.editorial_summary,"sections":[{"section_key":s.section_key,"title":s.title,"content":s.current_content,"status":s.status} for s in sections]}
    last=db.scalar(select(func.max(PublicationVersion.version_number)).where(PublicationVersion.publication_id==pub_id)) or 0
    version=PublicationVersion(publication_id=pub_id, version_number=last+1,
        version_label=f"v{last+1}", change_reason=change_reason,
        publication_snapshot=snapshot, created_by=created_by)
    db.add(version); db.commit(); db.refresh(version); return version

# ══════════════════════════════════════════════════════════════════════════════
# UC-008 — DELIVERY CHANNELS + PUBLICATION DELIVERIES
# ══════════════════════════════════════════════════════════════════════════════
class ChannelCreate(BaseModel):
    name: str; description: Optional[str]=None; channel_type: str="FILE"

class ChannelUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    channel_type: Optional[str]=None; is_active: Optional[bool]=None

class ChannelOut(BaseModel):
    delivery_channel_id: int; name: str; description: Optional[str]
    channel_type: str; is_active: bool; created_at: datetime
    class Config: from_attributes=True

@router.get("/delivery-channels", response_model=List[ChannelOut], tags=["Delivery"])
def list_channels(only_active:bool=True, db:Session=Depends(get_db)):
    q=select(DeliveryChannel)
    if only_active: q=q.where(DeliveryChannel.is_active==True)
    return db.scalars(q.order_by(DeliveryChannel.name)).all()

@router.post("/delivery-channels", response_model=ChannelOut, status_code=201, tags=["Delivery"])
def create_channel(body:ChannelCreate, db:Session=Depends(get_db)):
    obj=DeliveryChannel(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/delivery-channels/{id}", response_model=ChannelOut, tags=["Delivery"])
def update_channel(id:int, body:ChannelUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, DeliveryChannel, "delivery_channel_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

class DeliveryCreate(BaseModel):
    delivery_channel_id: int; destination: Optional[str]=None; scheduled_at: Optional[datetime]=None

class DeliveryOut(BaseModel):
    publication_delivery_id: int; publication_id: int; delivery_channel_id: int
    status: str; destination: Optional[str]; artifact_uri: Optional[str]
    scheduled_at: Optional[datetime]; delivered_at: Optional[datetime]
    error_message: Optional[str]; created_at: datetime
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/deliveries", response_model=List[DeliveryOut], tags=["Delivery"])
def list_deliveries(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(PublicationDelivery).where(PublicationDelivery.publication_id==pub_id)).all()

@router.post("/publications/{pub_id}/deliveries", response_model=DeliveryOut, status_code=201, tags=["Delivery"])
def create_delivery(pub_id:int, body:DeliveryCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    _get_or_404(db, DeliveryChannel, "delivery_channel_id", body.delivery_channel_id)
    obj=PublicationDelivery(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/deliveries/{id}", response_model=DeliveryOut, tags=["Delivery"])
def update_delivery(id:int, status:str, db:Session=Depends(get_db)):
    obj=_get_or_404(db, PublicationDelivery, "publication_delivery_id", id)
    obj.status=status
    if status=="DELIVERED": obj.delivered_at=datetime.utcnow()
    db.commit(); db.refresh(obj); return obj
