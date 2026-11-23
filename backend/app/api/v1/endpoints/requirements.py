from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.requirement import (
    Requirement, RequirementFeature, RequirementUserStory,
    RequirementRelation, RequirementVerification,
    RequirementHistory, RequirementChangeRequest,
)
from app.models.backlog import BacklogItem, BacklogItemType
from app.schemas.common import Paginated

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

REQ_TYPES       = ["BUSINESS","FUNCTIONAL","NON_FUNCTIONAL","DATA","INTEGRATION","SECURITY","COMPLIANCE","UX"]
REQ_PRIORITIES  = ["LOW","MEDIUM","HIGH","CRITICAL"]
REQ_LIFECYCLE   = ["DRAFT","PROPOSED","VALIDATED","APPROVED","REJECTED","OBSOLETE"]
REQ_FULFILLMENT = ["NOT_STARTED","PARTIALLY_MET","MET","NOT_MET","NOT_APPLICABLE"]
VER_TYPES       = ["TEST","USER_ACCEPTANCE","DOCUMENT_REVIEW","METRIC","MANUAL_VALIDATION"]
VER_RESULTS     = ["PASS","PARTIAL","FAIL","NOT_VERIFIED"]
COV_TYPES       = ["PRIMARY","SUPPORTING","PARTIAL"]
US_COV_STATUSES = ["NOT_STARTED","PARTIAL","COVERED","GAP"]
REL_ENTITY_TYPES= ["RESEARCH","INSIGHT","PROCESS_NODE","VPC_PAIN","RISK","DECISION","RELEASE","METRIC"]
CR_PRIORITIES   = ["LOW","MEDIUM","HIGH","CRITICAL"]
CR_STATUSES     = ["PENDING","APPROVED","REJECTED","IMPLEMENTED"]

# Fields that require a change request when a requirement is APPROVED
LOCKED_WHEN_APPROVED = {
    "requirement_title", "requirement_description", "requirement_type",
    "priority", "acceptance_definition", "fulfillment_status",
}
# Status transitions that always require change_reason
STATUS_CHANGE_REASON_REQUIRED_FROM = {"APPROVED", "VALIDATED"}

# ── Schemas ────────────────────────────────────────────────────────────────────

class RequirementCreate(BaseModel):
    product_id: Optional[int] = None
    business_area_id: Optional[int] = None
    requirement_code: str
    requirement_title: str
    requirement_description: str
    requirement_type: str = "FUNCTIONAL"
    requirement_classification: Optional[str] = None
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
    requirement_classification: Optional[str] = None
    requirement_source: Optional[str] = None
    priority: Optional[str] = None
    lifecycle_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    acceptance_definition: Optional[str] = None
    requirement_owner: Optional[str] = None
    business_area_id: Optional[int] = None
    # Phase 2: justification for status changes
    change_reason: Optional[str] = None
    changed_by: Optional[str] = None


class RequirementOut(BaseModel):
    id: int
    product_id: Optional[int]
    business_area_id: Optional[int]
    requirement_code: str
    requirement_title: str
    requirement_description: str
    requirement_type: str
    requirement_classification: Optional[str]
    requirement_source: Optional[str]
    priority: str
    lifecycle_status: str
    fulfillment_status: str
    acceptance_definition: Optional[str]
    requirement_owner: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


# ── History Schemas ───────────────────────────────────────────────────────────

class HistoryOut(BaseModel):
    id: int
    requirement_id: int
    changed_by: Optional[str]
    changed_at: datetime
    change_type: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    change_reason: Optional[str]
    class Config: from_attributes = True


# ── Change Request Schemas ────────────────────────────────────────────────────

class ChangeRequestCreate(BaseModel):
    requested_by: str
    change_description: str
    impact_analysis: Optional[str] = None
    priority: str = "MEDIUM"

class ChangeRequestUpdate(BaseModel):
    status: str
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None

class ChangeRequestOut(BaseModel):
    id: int
    requirement_id: int
    requested_by: str
    requested_at: datetime
    change_description: str
    impact_analysis: Optional[str]
    priority: str
    status: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]
    updated_at: datetime
    class Config: from_attributes = True


# ── Link/Verification Schemas ─────────────────────────────────────────────────

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

class DeliveryBacklogLinkCreate(BaseModel):
    backlog_item_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    item_type_id: Optional[int] = None
    current_status: str = "open"
    priority: int = 3
    acceptance_criteria: Optional[str] = None
    definition_of_done: Optional[str] = None

class DeliveryBacklogLinkOut(BaseModel):
    requirement_id: int
    backlog_item_id: int
    title: str
    current_status: str
    item_type_id: Optional[int] = None
    item_type_name: Optional[str] = None
    coverage_type: str
    notes: Optional[str] = None

    class Config: from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_req(id: int, db: Session) -> Requirement:
    obj = db.get(Requirement, id)
    if not obj or obj.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")
    return obj


def _log_history(
    db: Session,
    requirement_id: int,
    change_type: str,
    changed_by: Optional[str],
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    change_reason: Optional[str] = None,
):
    """Create a single history entry."""
    entry = RequirementHistory(
        requirement_id=requirement_id,
        changed_by=changed_by,
        change_type=change_type,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        change_reason=change_reason,
    )
    db.add(entry)


def _notify_raci_accountable(db: Session, requirement_id: int, product_id: Optional[int], change_description: str):
    """Phase 4: Create a Follow-Up for the Accountable (A) person in RACI if exists."""
    try:
        from app.models.raci import RaciAssignment
        from app.models.stakeholder import Stakeholder
        from app.models.followup import Followup
        accountable = db.query(RaciAssignment).filter(
            RaciAssignment.object_type == "REQUIREMENT",
            RaciAssignment.object_id == requirement_id,
            RaciAssignment.role == "A",
        ).first()
        if accountable:
            stk = db.get(Stakeholder, accountable.stakeholder_id)
            if stk:
                followup = Followup(
                    object_type="REQUIREMENT",
                    object_id=str(requirement_id),
                    product_id=product_id,
                    action_type="review_answer",
                    description=f"[Change Management] {change_description}",
                    assigned_to=stk.full_name,
                    status="pending",
                )
                db.add(followup)
    except Exception:
        pass  # non-blocking

def _delivery_backlog_links(requirement_id: int, db: Session) -> List[DeliveryBacklogLinkOut]:
    links = db.query(RequirementFeature).filter(RequirementFeature.requirement_id == requirement_id).all()
    if not links:
        return []

    backlog_ids = [link.feature_id for link in links]
    backlog_items = db.query(BacklogItem).filter(BacklogItem.item_id.in_(backlog_ids)).all()
    backlog_map = {item.item_id: item for item in backlog_items}

    type_ids = {item.item_type_id for item in backlog_items if item.item_type_id}
    type_map = {}
    if type_ids:
        type_rows = db.query(BacklogItemType).filter(BacklogItemType.item_type_id.in_(type_ids)).all()
        type_map = {row.item_type_id: row.name for row in type_rows}

    result: List[DeliveryBacklogLinkOut] = []
    for link in links:
        backlog_item = backlog_map.get(link.feature_id)
        if not backlog_item:
            continue
        result.append(DeliveryBacklogLinkOut(
            requirement_id=requirement_id,
            backlog_item_id=backlog_item.item_id,
            title=backlog_item.title,
            current_status=backlog_item.current_status,
            item_type_id=backlog_item.item_type_id,
            item_type_name=type_map.get(backlog_item.item_type_id) if backlog_item.item_type_id else None,
            coverage_type=link.coverage_type,
            notes=link.notes,
        ))
    return result


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
def create_requirement(body: RequirementCreate, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    obj = Requirement(**body.model_dump())
    db.add(obj)
    db.flush()  # get the id before commit
    _log_history(db, obj.id, "CREATED",
                 changed_by=getattr(current_user, "user_full_name", None) or getattr(current_user, "email", None))
    db.commit(); db.refresh(obj)
    return obj


@router.get("/{id}", response_model=RequirementOut)
def get_requirement(id: int, db: Session = Depends(get_db)):
    return _get_req(id, db)


@router.patch("/{id}", response_model=RequirementOut)
def update_requirement(id: int, body: RequirementUpdate, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    obj = _get_req(id, db)
    user_name = getattr(current_user, "user_full_name", None) or getattr(current_user, "email", None) or body.changed_by

    # Phase 3: REJECTED and OBSOLETE are read-only
    if obj.lifecycle_status in ("REJECTED", "OBSOLETE"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Requirement is {obj.lifecycle_status} and cannot be edited."
        )

    data = body.model_dump(exclude_unset=True)
    change_reason = data.pop("change_reason", None)
    data.pop("changed_by", None)

    # Phase 2: status change from APPROVED/VALIDATED requires reason
    new_status = data.get("lifecycle_status")
    if new_status and new_status != obj.lifecycle_status:
        if obj.lifecycle_status in STATUS_CHANGE_REASON_REQUIRED_FROM and not change_reason:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"change_reason is required when changing lifecycle_status from {obj.lifecycle_status}."
            )

    # Phase 3: editing locked fields on APPROVED requires change_reason
    locked_fields_changed = LOCKED_WHEN_APPROVED & set(data.keys())
    if obj.lifecycle_status == "APPROVED" and locked_fields_changed and not change_reason:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"change_reason is required when modifying an APPROVED requirement. "
            f"Fields requiring justification: {sorted(locked_fields_changed)}"
        )

    # Apply changes and log history
    for field, new_val in data.items():
        old_val = getattr(obj, field, None)
        if str(old_val) == str(new_val):
            continue
        setattr(obj, field, new_val)
        # Determine change_type
        if field == "lifecycle_status":
            ctype = "STATUS_CHANGE"
        else:
            ctype = "UPDATED"
        _log_history(db, obj.id, ctype, user_name,
                     field_name=field,
                     old_value=str(old_val) if old_val is not None else None,
                     new_value=str(new_val) if new_val is not None else None,
                     change_reason=change_reason)

    # Phase 3: auto-create Change Request when editing an APPROVED requirement
    if obj.lifecycle_status == "APPROVED" and locked_fields_changed and change_reason:
        cr = RequirementChangeRequest(
            requirement_id=obj.id,
            requested_by=user_name or "System",
            change_description=change_reason,
            priority="MEDIUM",
            status="IMPLEMENTED",  # Already applied; CR is for audit trail
            approved_by=user_name,
            approved_at=datetime.utcnow(),
        )
        db.add(cr)
        # Phase 4: notify RACI accountable
        _notify_raci_accountable(db, obj.id, obj.product_id, change_reason)

    obj.updated_at = datetime.utcnow()
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(id: int, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    obj = _get_req(id, db)
    user_name = getattr(current_user, "user_full_name", None) or getattr(current_user, "email", None)
    _log_history(db, obj.id, "DELETED", user_name)
    obj.is_deleted = True
    db.commit()


# ── History ───────────────────────────────────────────────────────────────────

@router.get("/{id}/history", response_model=List[HistoryOut])
def get_history(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return db.query(RequirementHistory).filter(
        RequirementHistory.requirement_id == id
    ).order_by(RequirementHistory.changed_at.desc()).all()


# ── Change Requests ───────────────────────────────────────────────────────────

@router.get("/{id}/change-requests", response_model=List[ChangeRequestOut])
def list_change_requests(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return db.query(RequirementChangeRequest).filter(
        RequirementChangeRequest.requirement_id == id
    ).order_by(RequirementChangeRequest.requested_at.desc()).all()


@router.post("/{id}/change-requests", response_model=ChangeRequestOut, status_code=status.HTTP_201_CREATED)
def create_change_request(id: int, body: ChangeRequestCreate, db: Session = Depends(get_db)):
    _get_req(id, db)
    cr = RequirementChangeRequest(requirement_id=id, **body.model_dump())
    db.add(cr); db.commit(); db.refresh(cr)
    return cr


@router.patch("/{id}/change-requests/{crid}", response_model=ChangeRequestOut)
def update_change_request(id: int, crid: int, body: ChangeRequestUpdate,
                          db: Session = Depends(get_db)):
    _get_req(id, db)
    cr = db.get(RequirementChangeRequest, crid)
    if not cr or cr.requirement_id != id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Change request not found")
    if body.status not in CR_STATUSES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"status must be one of {CR_STATUSES}")
    cr.status = body.status
    if body.approved_by:
        cr.approved_by = body.approved_by
        cr.approved_at = datetime.utcnow()
    if body.rejection_reason:
        cr.rejection_reason = body.rejection_reason
    cr.updated_at = datetime.utcnow()
    db.commit(); db.refresh(cr)
    return cr


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

@router.get("/{id}/delivery-backlog", response_model=List[DeliveryBacklogLinkOut])
def list_delivery_backlog(id: int, db: Session = Depends(get_db)):
    _get_req(id, db)
    return _delivery_backlog_links(id, db)

@router.post("/{id}/delivery-backlog", response_model=DeliveryBacklogLinkOut, status_code=status.HTTP_201_CREATED)
def create_or_link_delivery_backlog(id: int, body: DeliveryBacklogLinkCreate, db: Session = Depends(get_db)):
    req = _get_req(id, db)

    if req.lifecycle_status not in ("VALIDATED", "APPROVED"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Requirement must be VALIDATED or APPROVED before moving to delivery."
        )
    if not (req.acceptance_definition or body.acceptance_criteria):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Requirement needs acceptance_definition before moving to delivery."
        )
    if not req.requirement_owner:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Requirement needs requirement_owner before moving to delivery."
        )

    backlog_item = None
    if body.backlog_item_id is not None:
        backlog_item = db.get(BacklogItem, body.backlog_item_id)
        if not backlog_item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Backlog item not found")
    else:
        if not body.title:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "title is required when creating a backlog item")

        backlog_item = BacklogItem(
            product_id=req.product_id,
            title=body.title,
            description=body.description or req.requirement_description,
            item_type_id=body.item_type_id,
            current_status=body.current_status,
            acceptance_criteria=body.acceptance_criteria or req.acceptance_definition,
            definition_of_done=body.definition_of_done,
            priority=body.priority,
            business_rules=f"Origin Requirement: {req.requirement_code}",
        )
        db.add(backlog_item)
        db.flush()

    existing = db.query(RequirementFeature).filter(
        RequirementFeature.requirement_id == id,
        RequirementFeature.feature_id == backlog_item.item_id,
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Backlog item already linked to requirement")

    link = RequirementFeature(
        requirement_id=id,
        feature_id=backlog_item.item_id,
        coverage_type="PRIMARY",
        notes="Linked from DEFINE to DELIVER",
    )
    db.add(link)
    db.commit()

    return _delivery_backlog_links(id, db)[0 if body.backlog_item_id is None else next(i for i, x in enumerate(_delivery_backlog_links(id, db)) if x.backlog_item_id == backlog_item.item_id)]

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
