from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.raci import RaciAssignment, RaciAssignmentHistory
from app.models.stakeholder import Stakeholder

# ── Schemas ───────────────────────────────────────────────────────────────────

VALID_OBJECT_TYPES = {
    "REQUIREMENT", "BACKLOG", "DECISION", "RISK",
    "ROADMAP", "PROCESS", "DISCOVERY", "MEETING",
}
VALID_ROLES = {"R", "A", "C", "I"}
VALID_APPROVAL_METHODS = {"email", "verbal", "document", "meeting", "other"}


class RaciCreate(BaseModel):
    product_id:     Optional[int] = None
    object_type:    str
    object_id:      int
    stakeholder_id: int
    role:           str
    notes:          Optional[str] = None
    action_by:      Optional[str] = None   # who is registering this


class RaciUpdate(BaseModel):
    notes:     Optional[str] = None
    action_by: Optional[str] = None


class ApprovalRegister(BaseModel):
    approved_at:       Optional[datetime] = None
    approval_method:   str
    approval_evidence: Optional[str] = None
    approved_by:       Optional[str] = None
    action_by:         Optional[str] = None   # PM who recorded this


class SoftDeleteBody(BaseModel):
    removed_by:    Optional[str] = None
    remove_reason: Optional[str] = None


class StakeholderOut(BaseModel):
    id:        int
    full_name: str
    position:  Optional[str] = None
    class Config: from_attributes = True


class RaciOut(BaseModel):
    id:                 int
    product_id:         Optional[int]
    object_type:        str
    object_id:          int
    stakeholder_id:     int
    stakeholder:        Optional[StakeholderOut] = None
    role:               str
    notes:              Optional[str]
    approved_at:        Optional[datetime] = None
    approval_method:    Optional[str] = None
    approval_evidence:  Optional[str] = None
    approved_by:        Optional[str] = None
    is_active:          bool = True
    removed_at:         Optional[datetime] = None
    removed_by:         Optional[str] = None
    remove_reason:      Optional[str] = None
    created_at:         datetime
    updated_at:         datetime
    class Config: from_attributes = True


class HistoryOut(BaseModel):
    id:               int
    assignment_id:    int
    object_type:      str
    object_id:        int
    stakeholder_id:   int
    stakeholder_name: Optional[str]
    role:             str
    action:           str
    action_by:        Optional[str]
    action_at:        datetime
    notes:            Optional[str]
    approved_at:      Optional[datetime] = None
    approval_method:  Optional[str] = None
    approval_evidence: Optional[str] = None
    approved_by:      Optional[str] = None
    class Config: from_attributes = True


class RaciMatrixRow(BaseModel):
    object_type:  str
    object_id:    int
    object_label: Optional[str] = None
    assignments:  List[RaciOut] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich(assignment: RaciAssignment, db: Session) -> RaciOut:
    out = RaciOut.model_validate(assignment)
    stk = db.get(Stakeholder, assignment.stakeholder_id)
    if stk:
        out.stakeholder = StakeholderOut.model_validate(stk)
    return out


def _log(db: Session, assignment: RaciAssignment, action: str,
         action_by: Optional[str] = None, notes: Optional[str] = None,
         stakeholder_name: Optional[str] = None) -> None:
    """Append one immutable row to raci_assignment_history."""
    entry = RaciAssignmentHistory(
        assignment_id    = assignment.id,
        product_id       = assignment.product_id,
        object_type      = assignment.object_type,
        object_id        = assignment.object_id,
        stakeholder_id   = assignment.stakeholder_id,
        stakeholder_name = stakeholder_name,
        role             = assignment.role,
        action           = action,
        action_by        = action_by,
        action_at        = datetime.utcnow(),
        notes            = notes,
        approved_at      = assignment.approved_at,
        approval_method  = assignment.approval_method,
        approval_evidence = assignment.approval_evidence,
        approved_by      = assignment.approved_by,
    )
    db.add(entry)


def _get_object_label(object_type: str, object_id: int, db: Session) -> Optional[str]:
    try:
        if object_type == "REQUIREMENT":
            from app.models.requirement import Requirement
            obj = db.get(Requirement, object_id)
            return f"{obj.requirement_code} — {obj.requirement_title}" if obj else None
        if object_type == "BACKLOG":
            from app.models.backlog import BacklogItem
            obj = db.get(BacklogItem, object_id)
            return obj.title if obj else None
        if object_type == "DECISION":
            from app.models.decision import Decision
            obj = db.get(Decision, object_id)
            return obj.title if obj else None
        if object_type == "RISK":
            from app.models.risk import Risk
            obj = db.get(Risk, object_id)
            return obj.title if obj else None
        if object_type == "ROADMAP":
            from app.models.roadmap import RoadmapItem
            obj = db.get(RoadmapItem, object_id)
            return obj.title if obj else None
        if object_type == "PROCESS":
            from app.models.process_mapping import Process
            obj = db.get(Process, object_id)
            return obj.name if obj else None
        if object_type == "DISCOVERY":
            from app.models.discovery import DiscoveryOpportunity
            obj = db.get(DiscoveryOpportunity, object_id)
            return obj.title if obj else None
        if object_type == "MEETING":
            from app.models.meeting import Meeting
            obj = db.get(Meeting, object_id)
            return obj.title if obj else None
    except Exception:
        pass
    return None


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()


# ── Matrix view ───────────────────────────────────────────────────────────────

@router.get("/matrix", response_model=List[RaciMatrixRow])
def get_matrix(
    product_id:       Optional[int] = None,
    object_type:      Optional[str] = None,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(RaciAssignment)
    if not include_inactive:
        q = q.filter(RaciAssignment.is_active == True)
    if product_id  is not None: q = q.filter(RaciAssignment.product_id  == product_id)
    if object_type is not None: q = q.filter(RaciAssignment.object_type == object_type)
    rows = q.order_by(RaciAssignment.object_type, RaciAssignment.object_id, RaciAssignment.role).all()

    grouped: dict = {}
    for row in rows:
        key = (row.object_type, row.object_id)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(_enrich(row, db))

    result = []
    for (ot, oid), assignments in grouped.items():
        result.append(RaciMatrixRow(
            object_type=ot, object_id=oid,
            object_label=_get_object_label(ot, oid, db),
            assignments=assignments,
        ))
    return result


# ── Stakeholder dashboard ─────────────────────────────────────────────────────

@router.get("/stakeholder/{stakeholder_id}", response_model=List[RaciOut])
def get_by_stakeholder(
    stakeholder_id:   int,
    product_id:       Optional[int] = None,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(RaciAssignment).filter(RaciAssignment.stakeholder_id == stakeholder_id)
    if not include_inactive:
        q = q.filter(RaciAssignment.is_active == True)
    if product_id is not None:
        q = q.filter(RaciAssignment.product_id == product_id)
    rows = q.order_by(RaciAssignment.object_type, RaciAssignment.object_id).all()
    return [_enrich(r, db) for r in rows]


# ── History for an object ─────────────────────────────────────────────────────

@router.get("/{object_type}/{object_id}/history", response_model=List[HistoryOut])
def get_history(
    object_type: str,
    object_id:   int,
    db: Session = Depends(get_db),
):
    """Full immutable audit log for all RACI assignments of an object."""
    if object_type.upper() not in VALID_OBJECT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid object_type: {object_type}")
    rows = db.query(RaciAssignmentHistory).filter(
        RaciAssignmentHistory.object_type == object_type.upper(),
        RaciAssignmentHistory.object_id   == object_id,
    ).order_by(RaciAssignmentHistory.action_at.desc()).all()
    return rows


# ── Per-object RACI ───────────────────────────────────────────────────────────

@router.get("/{object_type}/{object_id}", response_model=List[RaciOut])
def list_for_object(
    object_type:      str,
    object_id:        int,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    if object_type.upper() not in VALID_OBJECT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid object_type: {object_type}")
    q = db.query(RaciAssignment).filter(
        RaciAssignment.object_type == object_type.upper(),
        RaciAssignment.object_id   == object_id,
    )
    if not include_inactive:
        q = q.filter(RaciAssignment.is_active == True)
    rows = q.order_by(RaciAssignment.role, RaciAssignment.stakeholder_id).all()
    return [_enrich(r, db) for r in rows]


@router.post("/{object_type}/{object_id}", response_model=RaciOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    object_type: str,
    object_id:   int,
    body:        RaciCreate,
    db:          Session = Depends(get_db),
):
    ot = object_type.upper()
    if ot not in VALID_OBJECT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid object_type: {ot}")
    if body.role.upper() not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}.")

    if body.role.upper() == "A":
        existing_a = db.query(RaciAssignment).filter(
            RaciAssignment.object_type == ot,
            RaciAssignment.object_id   == object_id,
            RaciAssignment.role        == "A",
            RaciAssignment.is_active   == True,
        ).first()
        if existing_a:
            raise HTTPException(status_code=409, detail="An Accountable (A) already exists for this object. Remove it first.")

    # Check duplicate among active
    existing = db.query(RaciAssignment).filter(
        RaciAssignment.object_type    == ot,
        RaciAssignment.object_id      == object_id,
        RaciAssignment.stakeholder_id == body.stakeholder_id,
        RaciAssignment.role           == body.role.upper(),
        RaciAssignment.is_active      == True,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This assignment already exists.")

    stk = db.get(Stakeholder, body.stakeholder_id)
    if not stk:
        raise HTTPException(status_code=404, detail="Stakeholder not found.")

    assignment = RaciAssignment(
        product_id     = body.product_id,
        object_type    = ot,
        object_id      = object_id,
        stakeholder_id = body.stakeholder_id,
        role           = body.role.upper(),
        notes          = body.notes,
        is_active      = True,
    )
    db.add(assignment)
    db.flush()   # get assignment.id before logging
    _log(db, assignment, action="ADD", action_by=body.action_by, stakeholder_name=stk.full_name)
    db.commit()
    db.refresh(assignment)
    return _enrich(assignment, db)


@router.patch("/{object_type}/{object_id}/{assignment_id}", response_model=RaciOut)
def update_assignment(
    object_type:   str,
    object_id:     int,
    assignment_id: int,
    body:          RaciUpdate,
    db:            Session = Depends(get_db),
):
    row = db.query(RaciAssignment).filter(
        RaciAssignment.id          == assignment_id,
        RaciAssignment.object_type == object_type.upper(),
        RaciAssignment.object_id   == object_id,
        RaciAssignment.is_active   == True,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    if body.notes is not None:
        row.notes = body.notes
    row.updated_at = datetime.utcnow()
    stk = db.get(Stakeholder, row.stakeholder_id)
    _log(db, row, action="UPDATE_NOTES", action_by=body.action_by,
         stakeholder_name=stk.full_name if stk else None,
         notes=body.notes)
    db.commit()
    db.refresh(row)
    return _enrich(row, db)


# ── Soft delete ───────────────────────────────────────────────────────────────

@router.delete("/{object_type}/{object_id}/{assignment_id}", status_code=status.HTTP_200_OK, response_model=RaciOut)
def delete_assignment(
    object_type:   str,
    object_id:     int,
    assignment_id: int,
    removed_by:    Optional[str] = Query(None),
    remove_reason: Optional[str] = Query(None),
    db:            Session = Depends(get_db),
):
    """Soft-delete: marks is_active=False and logs REMOVE to history."""
    row = db.query(RaciAssignment).filter(
        RaciAssignment.id          == assignment_id,
        RaciAssignment.object_type == object_type.upper(),
        RaciAssignment.object_id   == object_id,
        RaciAssignment.is_active   == True,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    row.is_active     = False
    row.removed_at    = datetime.utcnow()
    row.removed_by    = removed_by
    row.remove_reason = remove_reason
    row.updated_at    = datetime.utcnow()

    stk = db.get(Stakeholder, row.stakeholder_id)
    _log(db, row, action="REMOVE", action_by=removed_by,
         stakeholder_name=stk.full_name if stk else None,
         notes=remove_reason)
    db.commit()
    db.refresh(row)
    return _enrich(row, db)


# ── Register / revoke approval evidence (role A) ──────────────────────────────

@router.post("/{object_type}/{object_id}/{assignment_id}/approve", response_model=RaciOut)
def register_approval(
    object_type:   str,
    object_id:     int,
    assignment_id: int,
    body:          ApprovalRegister,
    db:            Session = Depends(get_db),
):
    row = db.query(RaciAssignment).filter(
        RaciAssignment.id          == assignment_id,
        RaciAssignment.object_type == object_type.upper(),
        RaciAssignment.object_id   == object_id,
        RaciAssignment.is_active   == True,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    if row.role != "A":
        raise HTTPException(status_code=400, detail="Approval evidence can only be set on Accountable (A) assignments.")
    method = (body.approval_method or "").lower()
    if method not in VALID_APPROVAL_METHODS:
        raise HTTPException(status_code=400, detail=f"Invalid approval_method '{method}'.")

    row.approved_at       = body.approved_at or datetime.utcnow()
    row.approval_method   = method
    row.approval_evidence = body.approval_evidence
    row.approved_by       = body.approved_by
    row.updated_at        = datetime.utcnow()

    stk = db.get(Stakeholder, row.stakeholder_id)
    _log(db, row, action="APPROVE", action_by=body.action_by,
         stakeholder_name=stk.full_name if stk else None)
    db.commit()
    db.refresh(row)
    return _enrich(row, db)


@router.delete("/{object_type}/{object_id}/{assignment_id}/approve", response_model=RaciOut)
def clear_approval(
    object_type:   str,
    object_id:     int,
    assignment_id: int,
    action_by:     Optional[str] = Query(None),
    db:            Session = Depends(get_db),
):
    row = db.query(RaciAssignment).filter(
        RaciAssignment.id          == assignment_id,
        RaciAssignment.object_type == object_type.upper(),
        RaciAssignment.object_id   == object_id,
        RaciAssignment.is_active   == True,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    row.approved_at       = None
    row.approval_method   = None
    row.approval_evidence = None
    row.approved_by       = None
    row.updated_at        = datetime.utcnow()

    stk = db.get(Stakeholder, row.stakeholder_id)
    _log(db, row, action="REVOKE_APPROVAL", action_by=action_by,
         stakeholder_name=stk.full_name if stk else None)
    db.commit()
    db.refresh(row)
    return _enrich(row, db)
