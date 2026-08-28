from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.requirement import (
    Requirement, RequirementFeature, RequirementUserStory,
    RequirementRelation, RequirementVerification,
)
from app.schemas.common import Paginated

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────────

REQ_TYPES       = ["BUSINESS","FUNCTIONAL","NON_FUNCTIONAL","DATA","INTEGRATION","SECURITY","COMPLIANCE","UX"]
REQ_PRIORITIES  = ["LOW","MEDIUM","HIGH","CRITICAL"]
REQ_LIFECYCLE   = ["DRAFT","PROPOSED","VALIDATED","APPROVED","REJECTED","OBSOLETE"]
REQ_FULFILLMENT = ["NOT_STARTED","PARTIALLY_MET","MET","NOT_MET","NOT_APPLICABLE"]
VER_TYPES       = ["TEST","USER_ACCEPTANCE","DOCUMENT_REVIEW","METRIC","MANUAL_VALIDATION"]
VER_RESULTS     = ["PASS","PARTIAL","FAIL","NOT_VERIFIED"]
COV_TYPES       = ["PRIMARY","SUPPORTING","PARTIAL"]
US_COV_STATUSES = ["NOT_STARTED","PARTIAL","COVERED","GAP"]
REL_ENTITY_TYPES= ["RESEARCH","INSIGHT","PROCESS_NODE","VPC_PAIN","RISK","DECISION","RELEASE","METRIC"]


class RequirementCreate(BaseModel):
    product_id: Optional[int] = None
    business_area_id: Optional[int] = None
    requirement_code: str
    requirement_title: str
    requirement_description: str
    requirement_type: str = "FUNCTIONAL"
    requirement_source: Optional[str] = None
    priority: str = "MEDIUM"
    lifecycle_status: str = "DRAFT"
    fulfillment_status: str = "NOT_STARTED"
    acceptance_definition: Optional[str] = None
    requirement_owner: Optional[str] = None


class RequirementUpdate(BaseModel):
    requirement_title: Optional[str] = None
    requirement_description: Optional[str] = None
    requirement_type: Optional[str] = None
    requirement_source: Optional[str] = None
    priority: Optional[str] = None
    lifecycle_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    acceptance_definition: Optional[str] = None
    requirement_owner: Optional[str] = None
    business_area_id: Optional[int] = None


class RequirementOut(BaseModel):
    id: int
    product_id: Optional[int]
    business_area_id: Optional[int]
    requirement_code: str
    requirement_title: str
    requirement_description: str
    requirement_type: str
    requirement_source: Optional[str]
    priority: str
    lifecycle_status: str
    fulfillment_status: str
    acceptance_definition: Optional[str]
    requirement_owner: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class FeatureLink(BaseModel):
    feature_id: int
    coverage_type: str = "PRIMARY"
    notes: Optional[str] = None

class FeatureLinkOut(BaseModel):
    id: int; requirement_id: int; feature_id: int
    coverage_type: str; notes: Optional[str]; created_at: datetime
    class Config: from_attributes = True


class UserStoryLink(BaseModel):
    user_story_id: int
    coverage_percentage: Optional[float] = Field(None, ge=0, le=100)
    coverage_status: str = "NOT_STARTED"
    notes: Optional[str] = None

class UserStoryLinkOut(BaseModel):
    id: int; requirement_id: int; user_story_id: int
    coverage_percentage: Optional[float]; coverage_status: str
    notes: Optional[str]; created_at: datetime
    class Config: from_attributes = True


class RelationCreate(BaseModel):
    entity_type: str
    entity_id: int
    relation_type: Optional[str] = None
    notes: Optional[str] = None

class RelationOut(BaseModel):
    id: int; requirement_id: int; entity_type: str; entity_id: int
    relation_type: Optional[str]; notes: Optional[str]; created_at: datetime
    class Config: from_attributes = True


class VerificationCreate(BaseModel):
    verification_type: str
    verification_result: str = "NOT_VERIFIED"
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    evidence: Optional[str] = None
    notes: Optional[str] = None

class VerificationUpdate(BaseModel):
    verification_result: Optional[str] = None
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    evidence: Optional[str] = None
    notes: Optional[str] = None

class VerificationOut(BaseModel):
    id: int; requirement_id: int; verification_type: str
    verification_result: str; verified_by: Optional[int]
    verified_at: Optional[datetime]; evidence: Optional[str]
    notes: Optional[str]; created_at: datetime; updated_at: datetime
    class Config: from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_req(id: int, db: Session) -> Requirement:
    obj = db.get(Requirement, id)
    if not obj or obj.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")
    return obj


# ── Requirements CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_requirements(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    requirement_type: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    fulfillment_status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Requirement).filter(Requirement.is_deleted == False)
    if product_id:        q = q.filter(Requirement.product_id == product_id)
    if requirement_type:  q = q.filter(Requirement.requirement_type == requirement_type)
    if lifecycle_status:  q = q.filter(Requirement.lifecycle_status == lifecycle_status)
    if fulfillment_status:q = q.filter(Requirement.fulfillment_status == fulfillment_status)
    if priority:          q = q.filter(Requirement.priority == priority)
    total = q.count()
    items = q.order_by(Requirement.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [RequirementOut.model_validate(i) for i in items]}


@router.post("", response_model=RequirementOut, status_code=status.HTTP_201_CREATED)
def create_requirement(body: RequirementCreate, db: Session = Depends(get_db)):
    obj = Requirement(**body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/{id}", response_model=RequirementOut)
def get_requirement(id: int, db: Session = Depends(get_db)):
    return _get_req(id, db)


@router.patch("/{id}", response_model=RequirementOut)
def update_requirement(id: int, body: RequirementUpdate, db: Session = Depends(get_db)):
    obj = _get_req(id, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(id: int, db: Session = Depends(get_db)):
    obj = _get_req(id, db)
    obj.is_deleted = True
    db.commit()


# ── Features ──────────────────────────────────────────────────────────────────

@router.get("/{id}/features", response_model=List[FeatureLinkOut])
def list_features(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return db.query(RequirementFeature).filter(RequirementFeature.requirement_id == id).all()


@router.post("/{id}/features", response_model=FeatureLinkOut, status_code=status.HTTP_201_CREATED)
def add_feature(id: int, body: FeatureLink, db: Session = Depends(get_db)):
    _get_req(id, db)
    exists = db.query(RequirementFeature).filter(
        RequirementFeature.requirement_id == id,
        RequirementFeature.feature_id == body.feature_id,
    ).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Feature already linked")
    obj = RequirementFeature(requirement_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/features/{fid}", status_code=status.HTTP_204_NO_CONTENT)
def remove_feature(id: int, fid: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    obj = db.query(RequirementFeature).filter(
        RequirementFeature.requirement_id == id,
        RequirementFeature.feature_id == fid,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    db.delete(obj); db.commit()


# ── User Stories ──────────────────────────────────────────────────────────────

@router.get("/{id}/user-stories", response_model=List[UserStoryLinkOut])
def list_user_stories(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return db.query(RequirementUserStory).filter(RequirementUserStory.requirement_id == id).all()


@router.post("/{id}/user-stories", response_model=UserStoryLinkOut, status_code=status.HTTP_201_CREATED)
def add_user_story(id: int, body: UserStoryLink, db: Session = Depends(get_db)):
    _get_req(id, db)
    exists = db.query(RequirementUserStory).filter(
        RequirementUserStory.requirement_id == id,
        RequirementUserStory.user_story_id == body.user_story_id,
    ).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "User story already linked")
    obj = RequirementUserStory(requirement_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/user-stories/{usid}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_story(id: int, usid: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    obj = db.query(RequirementUserStory).filter(
        RequirementUserStory.requirement_id == id,
        RequirementUserStory.user_story_id == usid,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    db.delete(obj); db.commit()


# ── Relations ─────────────────────────────────────────────────────────────────

@router.get("/{id}/relations", response_model=List[RelationOut])
def list_relations(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return db.query(RequirementRelation).filter(RequirementRelation.requirement_id == id).all()


@router.post("/{id}/relations", response_model=RelationOut, status_code=status.HTTP_201_CREATED)
def add_relation(id: int, body: RelationCreate, db: Session = Depends(get_db)):
    _get_req(id, db)
    if body.entity_type not in REL_ENTITY_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"entity_type must be one of {REL_ENTITY_TYPES}")
    obj = RequirementRelation(requirement_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/relations/{rid}", status_code=status.HTTP_204_NO_CONTENT)
def remove_relation(id: int, rid: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    obj = db.get(RequirementRelation, rid)
    if not obj or obj.requirement_id != id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Relation not found")
    db.delete(obj); db.commit()


# ── Verifications ─────────────────────────────────────────────────────────────

@router.get("/{id}/verifications", response_model=List[VerificationOut])
def list_verifications(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return db.query(RequirementVerification).filter(RequirementVerification.requirement_id == id).all()


@router.post("/{id}/verifications", response_model=VerificationOut, status_code=status.HTTP_201_CREATED)
def add_verification(id: int, body: VerificationCreate, db: Session = Depends(get_db)):
    _get_req(id, db)
    if body.verification_type not in VER_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"verification_type must be one of {VER_TYPES}")
    obj = RequirementVerification(requirement_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/verifications/{vid}", response_model=VerificationOut)
def update_verification(id: int, vid: int, body: VerificationUpdate, db: Session = Depends(get_db)):
    _get_req(id, db)
    obj = db.get(RequirementVerification, vid)
    if not obj or obj.requirement_id != id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Verification not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/verifications/{vid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_verification(id: int, vid: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    obj = db.get(RequirementVerification, vid)
    if not obj or obj.requirement_id != id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Verification not found")
    db.delete(obj); db.commit()
