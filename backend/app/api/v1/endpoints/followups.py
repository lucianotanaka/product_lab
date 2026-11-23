"""
Universal Follow-Ups endpoint.
GET    /followups?entity_type=...&entity_id=...  → list
POST   /followups                                → create
PATCH  /followups/{id}                           → update (partial)
DELETE /followups/{id}                           → delete
GET    /followups/{id}/ics                       → iCalendar export
"""
import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.followup import Followup

router = APIRouter()

# ─── Schemas ──────────────────────────────────────────────────────────────────

VALID_ACTION_TYPES = {
    "schedule_meeting", "request_info", "send_material", "review_answer",
    "validate", "escalate", "send_email", "update_stakeholder", "other",
}

VALID_STATUSES = {"pending", "done", "cancelled"}


class FollowupOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action_type: str
    description: str
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FollowupCreate(BaseModel):
    entity_type: str
    entity_id: str
    action_type: str = "other"
    description: str
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: str = "pending"
    notes: Optional[str] = None


class FollowupUpdate(BaseModel):
    action_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _row_to_out(r: Followup) -> FollowupOut:
    return FollowupOut(
        id=r.id, entity_type=r.entity_type, entity_id=r.entity_id,
        action_type=r.action_type, description=r.description,
        assigned_to=r.assigned_to, due_date=r.due_date,
        status=r.status, notes=r.notes,
        created_at=r.created_at, updated_at=r.updated_at,
    )


def _get_or_404(followup_id: str, db: Session) -> Followup:
    row = db.get(Followup, followup_id)
    if not row:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return row


# ─── Endpoints ────────────────────────────────────────────────────────────────

# ─── Summary (must be before /{followup_id} to avoid route conflict) ──────────

class FollowupSummary(BaseModel):
    pending: int
    overdue: int
    due_today: int
    due_this_week: int
    overdue_items: list[FollowupOut]
    due_soon_items: list[FollowupOut]   # today + next 7 days


@router.get("/all", response_model=list[FollowupOut])
def list_all_followups(
    status: Optional[str] = None,
    entity_type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List ALL follow-ups across all entities.
    Supports optional filtering by status, entity_type, and assigned_to (partial match).
    Used by the Follow-Ups module page.
    """
    q = db.query(Followup)
    if status:
        q = q.filter(Followup.status == status)
    if entity_type:
        q = q.filter(Followup.entity_type == entity_type)
    if assigned_to:
        q = q.filter(Followup.assigned_to.ilike(f"%{assigned_to}%"))
    rows = q.order_by(
        Followup.due_date.asc().nulls_last(),
        Followup.created_at.desc()
    ).all()
    return [_row_to_out(r) for r in rows]


@router.get("/summary", response_model=FollowupSummary)
def get_followup_summary(db: Session = Depends(get_db)):
    """
    Global follow-up summary — counts + actionable items for the Cockpit.
    Not scoped to a product because follow-ups span all modules.
    """
    from datetime import timedelta
    today = date.today()
    week_end = today + timedelta(days=7)

    # All pending
    pending_rows = db.query(Followup).filter(Followup.status == "pending").all()

    overdue_rows   = [r for r in pending_rows if r.due_date and r.due_date < today]
    due_today_rows = [r for r in pending_rows if r.due_date and r.due_date == today]
    due_soon_rows  = [r for r in pending_rows if r.due_date and today <= r.due_date <= week_end]

    # Sort by due_date asc, nulls last
    overdue_rows.sort(key=lambda r: r.due_date)
    due_soon_rows.sort(key=lambda r: r.due_date)

    return FollowupSummary(
        pending=len(pending_rows),
        overdue=len(overdue_rows),
        due_today=len(due_today_rows),
        due_this_week=len([r for r in pending_rows if r.due_date and today < r.due_date <= week_end]),
        overdue_items=[_row_to_out(r) for r in overdue_rows[:10]],
        due_soon_items=[_row_to_out(r) for r in due_soon_rows[:10]],
    )


@router.get("", response_model=list[FollowupOut])
def list_followups(
    entity_type: str,
    entity_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all follow-ups for a given entity. Optionally filter by status."""
    q = db.query(Followup).filter(
        Followup.entity_type == entity_type,
        Followup.entity_id == entity_id,
    )
    if status:
        q = q.filter(Followup.status == status)
    rows = q.order_by(Followup.due_date.asc().nulls_last(), Followup.created_at.asc()).all()
    return [_row_to_out(r) for r in rows]


@router.post("", response_model=FollowupOut, status_code=status.HTTP_201_CREATED)
def create_followup(
    payload: FollowupCreate,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    if payload.action_type not in VALID_ACTION_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid action_type: {payload.action_type}")
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status: {payload.status}")
    if not payload.description.strip():
        raise HTTPException(status_code=422, detail="description is required")

    row = Followup(
        id=str(uuid.uuid4()),
        entity_type=payload.entity_type.strip(),
        entity_id=payload.entity_id.strip(),
        action_type=payload.action_type,
        description=payload.description.strip(),
        assigned_to=payload.assigned_to.strip() if payload.assigned_to else None,
        due_date=payload.due_date,
        status=payload.status,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.patch("/{followup_id}", response_model=FollowupOut)
def update_followup(
    followup_id: str,
    payload: FollowupUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    row = _get_or_404(followup_id, db)

    if payload.action_type is not None:
        if payload.action_type not in VALID_ACTION_TYPES:
            raise HTTPException(status_code=422, detail=f"Invalid action_type: {payload.action_type}")
        row.action_type = payload.action_type

    if payload.description is not None:
        if not payload.description.strip():
            raise HTTPException(status_code=422, detail="description cannot be empty")
        row.description = payload.description.strip()

    if payload.assigned_to is not None:
        row.assigned_to = payload.assigned_to.strip() or None

    if payload.due_date is not None:
        row.due_date = payload.due_date

    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail=f"Invalid status: {payload.status}")
        row.status = payload.status

    if payload.notes is not None:
        row.notes = payload.notes.strip() or None

    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.delete("/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup(
    followup_id: str,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    row = _get_or_404(followup_id, db)
    db.delete(row)
    db.commit()


@router.get("/{followup_id}/ics")
def export_followup_ics(
    followup_id: str,
    db: Session = Depends(get_db),
):
    """
    Return an iCalendar (.ics) file for a follow-up that has a due_date.
    The event is an all-day VEVENT so it renders as a reminder in any calendar app.
    """
    row = _get_or_404(followup_id, db)

    if not row.due_date:
        raise HTTPException(status_code=400, detail="Follow-up has no due_date — cannot generate .ics")

    due = row.due_date
    dt_stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dt_start = due.strftime("%Y%m%d")
    dt_end   = date(due.year, due.month, due.day + 1).strftime("%Y%m%d") if due.day < 28 else \
               date(due.year, due.month + 1 if due.month < 12 else 1,
                    1 if due.month < 12 else 1).strftime("%Y%m%d")

    summary   = (row.description[:72] + "...") if len(row.description) > 75 else row.description
    location  = row.assigned_to or ""
    desc_line = f"Assigned to: {row.assigned_to}\\nNotes: {row.notes or '-'}"
    uid       = f"{row.id}@productlab"

    ics = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//Product Lab//Follow-Up//EN\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "METHOD:PUBLISH\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{dt_stamp}\r\n"
        f"DTSTART;VALUE=DATE:{dt_start}\r\n"
        f"DTEND;VALUE=DATE:{dt_end}\r\n"
        f"SUMMARY:[FOLLOW-UP] {summary}\r\n"
        f"DESCRIPTION:{desc_line}\r\n"
        f"LOCATION:{location}\r\n"
        "STATUS:CONFIRMED\r\n"
        "TRANSP:TRANSPARENT\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )

    safe_name = "followup-" + row.id[:8] + ".ics"
    return Response(
        content=ics,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )
