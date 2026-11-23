from typing import Optional
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.meeting import (
    Meeting,
    MeetingActionItem,
    MeetingEntityType,
    MeetingLink,
    MeetingParticipant,
    MeetingRelation,
    MeetingRelationType,
    MeetingSession,
    MeetingStatus,
    MeetingSummary,
    MeetingTranscript,
    MeetingType,
    ActionItemStatus,
    SummaryType,
    TranscriptSourceType,
)
from app.repositories.base import BaseRepository

router = APIRouter()


def _get_or_404(model, id: str, db: Session):
    obj = BaseRepository(model, db).get(id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


class MeetingRelationCreate(BaseModel):
    entity_type: MeetingEntityType
    entity_id: str
    relation_type: MeetingRelationType = MeetingRelationType.related
    label: Optional[str] = None
    notes: Optional[str] = None


class MeetingRelationUpdate(BaseModel):
    entity_type: Optional[MeetingEntityType] = None
    entity_id: Optional[str] = None
    relation_type: Optional[MeetingRelationType] = None
    label: Optional[str] = None
    notes: Optional[str] = None


class MeetingRelationOut(BaseModel):
    id: str
    meeting_id: str
    entity_type: MeetingEntityType
    entity_id: str
    relation_type: MeetingRelationType
    label: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingCreate(BaseModel):
    product_id: Optional[int] = None
    title: str
    meeting_type: MeetingType = MeetingType.other
    meeting_date: Optional[date] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: MeetingStatus = MeetingStatus.scheduled
    objective: Optional[str] = None
    agenda: Optional[str] = None
    decisions: Optional[str] = None
    notes: Optional[str] = None
    opportunity_id: Optional[str] = None
    backlog_item_id: Optional[str] = None
    roadmap_item_id: Optional[str] = None
    primary_entity_type: Optional[MeetingEntityType] = None
    primary_entity_id: Optional[str] = None
    primary_relation_note: Optional[str] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[MeetingType] = None
    meeting_date: Optional[date] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: Optional[MeetingStatus] = None
    objective: Optional[str] = None
    agenda: Optional[str] = None
    decisions: Optional[str] = None
    notes: Optional[str] = None
    opportunity_id: Optional[str] = None
    backlog_item_id: Optional[str] = None
    roadmap_item_id: Optional[str] = None
    primary_entity_type: Optional[MeetingEntityType] = None
    primary_entity_id: Optional[str] = None
    primary_relation_note: Optional[str] = None


class ParticipantOut(BaseModel):
    id: str
    meeting_id: str
    stakeholder_id: Optional[int] = None
    name: str
    role: Optional[str] = None
    attended: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ActionItemOut(BaseModel):
    id: str
    meeting_id: str
    description: str
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: ActionItemStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LinkOut(BaseModel):
    id: str
    meeting_id: str
    label: str
    url: str
    link_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingSessionCreate(BaseModel):
    title: Optional[str] = None
    session_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: MeetingStatus = MeetingStatus.scheduled
    notes: Optional[str] = None


class MeetingSessionUpdate(BaseModel):
    title: Optional[str] = None
    session_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: Optional[MeetingStatus] = None
    notes: Optional[str] = None


class MeetingSessionOut(BaseModel):
    id: str
    meeting_id: str
    title: Optional[str] = None
    session_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: MeetingStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeetingTranscriptCreate(BaseModel):
    session_id: Optional[str] = None
    title: str
    content_text: str
    language: Optional[str] = None
    source_type: TranscriptSourceType = TranscriptSourceType.paste
    source_attachment_id: Optional[str] = None
    created_by: Optional[str] = None


class MeetingTranscriptUpdate(BaseModel):
    session_id: Optional[str] = None
    title: Optional[str] = None
    content_text: Optional[str] = None
    language: Optional[str] = None
    source_type: Optional[TranscriptSourceType] = None
    source_attachment_id: Optional[str] = None
    created_by: Optional[str] = None


class MeetingTranscriptOut(BaseModel):
    id: str
    meeting_id: str
    session_id: Optional[str] = None
    title: str
    content_text: str
    language: Optional[str] = None
    source_type: TranscriptSourceType
    source_attachment_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeetingSummaryCreate(BaseModel):
    session_id: Optional[str] = None
    transcript_id: Optional[str] = None
    title: str
    summary_type: SummaryType = SummaryType.minutes
    content: str
    created_by: Optional[str] = None


class MeetingSummaryUpdate(BaseModel):
    session_id: Optional[str] = None
    transcript_id: Optional[str] = None
    title: Optional[str] = None
    summary_type: Optional[SummaryType] = None
    content: Optional[str] = None
    created_by: Optional[str] = None


class MeetingSummaryOut(BaseModel):
    id: str
    meeting_id: str
    session_id: Optional[str] = None
    transcript_id: Optional[str] = None
    title: str
    summary_type: SummaryType
    content: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeetingOut(BaseModel):
    id: str
    product_id: Optional[int] = None
    title: str
    meeting_type: MeetingType
    meeting_date: Optional[date] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    status: MeetingStatus
    objective: Optional[str] = None
    agenda: Optional[str] = None
    decisions: Optional[str] = None
    notes: Optional[str] = None
    opportunity_id: Optional[str] = None
    backlog_item_id: Optional[str] = None
    roadmap_item_id: Optional[str] = None
    primary_entity_type: Optional[MeetingEntityType] = None
    primary_entity_id: Optional[str] = None
    primary_relation_note: Optional[str] = None
    participants: list[ParticipantOut] = []
    action_items: list[ActionItemOut] = []
    links: list[LinkOut] = []
    relations: list[MeetingRelationOut] = []
    sessions: list[MeetingSessionOut] = []
    transcripts: list[MeetingTranscriptOut] = []
    summaries: list[MeetingSummaryOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _validate_session_belongs_to_meeting(session_id: Optional[str], meeting_id: str, db: Session):
    if not session_id:
        return
    session = db.get(MeetingSession, session_id)
    if not session or session.meeting_id != meeting_id:
        raise HTTPException(status_code=400, detail="Session does not belong to meeting")


def _validate_transcript_belongs_to_meeting(transcript_id: Optional[str], meeting_id: str, db: Session):
    if not transcript_id:
        return
    transcript = db.get(MeetingTranscript, transcript_id)
    if not transcript or transcript.meeting_id != meeting_id:
        raise HTTPException(status_code=400, detail="Transcript does not belong to meeting")


def _sync_legacy_links(m: Meeting):
    if m.opportunity_id and not m.primary_entity_id:
        m.primary_entity_type = MeetingEntityType.discovery_opportunity
        m.primary_entity_id = m.opportunity_id
    elif m.backlog_item_id and not m.primary_entity_id:
        m.primary_entity_type = MeetingEntityType.backlog_item
        m.primary_entity_id = m.backlog_item_id
    elif m.roadmap_item_id and not m.primary_entity_id:
        m.primary_entity_type = MeetingEntityType.roadmap_item
        m.primary_entity_id = m.roadmap_item_id


def _ensure_primary_relation(m: Meeting, db: Session):
    if not m.primary_entity_type or not m.primary_entity_id:
        return

    existing = db.query(MeetingRelation).filter(
        MeetingRelation.meeting_id == m.id,
        MeetingRelation.entity_type == m.primary_entity_type,
        MeetingRelation.entity_id == m.primary_entity_id,
        MeetingRelation.relation_type == MeetingRelationType.primary,
    ).first()
    if existing:
        if m.primary_relation_note and existing.notes != m.primary_relation_note:
            existing.notes = m.primary_relation_note
            db.commit()
        return

    import uuid as _uuid

    rel = MeetingRelation(
        id=str(_uuid.uuid4()),
        meeting_id=m.id,
        entity_type=m.primary_entity_type,
        entity_id=m.primary_entity_id,
        relation_type=MeetingRelationType.primary,
        label=m.title,
        notes=m.primary_relation_note,
    )
    db.add(rel)
    db.commit()


def _ensure_default_session(m: Meeting, db: Session):
    existing = db.query(MeetingSession).filter(MeetingSession.meeting_id == m.id).first()
    if existing:
        return existing

    import uuid as _uuid

    session = MeetingSession(
        id=str(_uuid.uuid4()),
        meeting_id=m.id,
        title="Main session",
        session_date=m.meeting_date,
        start_time=m.start_time,
        duration_minutes=m.duration_minutes,
        location=m.location,
        status=m.status,
        notes=m.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _migrate_legacy_transcript_and_summary(m: Meeting, db: Session):
    legacy_transcript = getattr(m, "transcript", None)
    if not legacy_transcript and not m.decisions and not m.notes:
        return

    has_transcripts = db.query(MeetingTranscript).filter(MeetingTranscript.meeting_id == m.id).first()
    has_summaries = db.query(MeetingSummary).filter(MeetingSummary.meeting_id == m.id).first()
    if has_transcripts or has_summaries:
        return

    session = _ensure_default_session(m, db)
    import uuid as _uuid

    if legacy_transcript:
        transcript = MeetingTranscript(
            id=str(_uuid.uuid4()),
            meeting_id=m.id,
            session_id=session.id,
            title="Legacy transcript",
            content_text=legacy_transcript,
            source_type=TranscriptSourceType.manual,
        )
        db.add(transcript)

    summary_parts: list[str] = []
    if m.decisions:
        summary_parts.append(f"Decisions\n{m.decisions}")
    if m.notes:
        summary_parts.append(f"Notes\n{m.notes}")

    if summary_parts:
        summary = MeetingSummary(
            id=str(_uuid.uuid4()),
            meeting_id=m.id,
            session_id=session.id,
            title="Legacy minutes",
            summary_type=SummaryType.minutes,
            content="\n\n".join(summary_parts),
        )
        db.add(summary)

    db.commit()


def _enrich_meeting(m: Meeting, db: Session) -> MeetingOut:
    _sync_legacy_links(m)
    _ensure_primary_relation(m, db)
    _migrate_legacy_transcript_and_summary(m, db)

    participants = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == m.id
    ).order_by(MeetingParticipant.created_at).all()

    action_items = db.query(MeetingActionItem).filter(
        MeetingActionItem.meeting_id == m.id
    ).order_by(MeetingActionItem.created_at).all()

    links = db.query(MeetingLink).filter(
        MeetingLink.meeting_id == m.id
    ).order_by(MeetingLink.created_at).all()

    relations = db.query(MeetingRelation).filter(
        MeetingRelation.meeting_id == m.id
    ).order_by(MeetingRelation.created_at.asc()).all()

    sessions = db.query(MeetingSession).filter(
        MeetingSession.meeting_id == m.id
    ).order_by(MeetingSession.session_date.desc().nullslast(), MeetingSession.created_at.desc()).all()

    transcripts = db.query(MeetingTranscript).filter(
        MeetingTranscript.meeting_id == m.id
    ).order_by(MeetingTranscript.created_at.desc()).all()

    summaries = db.query(MeetingSummary).filter(
        MeetingSummary.meeting_id == m.id
    ).order_by(MeetingSummary.created_at.desc()).all()

    return MeetingOut(
        id=m.id,
        product_id=m.product_id,
        title=m.title,
        meeting_type=m.meeting_type,
        meeting_date=m.meeting_date,
        start_time=m.start_time,
        duration_minutes=m.duration_minutes,
        location=m.location,
        status=m.status,
        objective=m.objective,
        agenda=m.agenda,
        decisions=m.decisions,
        notes=m.notes,
        opportunity_id=m.opportunity_id,
        backlog_item_id=m.backlog_item_id,
        roadmap_item_id=m.roadmap_item_id,
        primary_entity_type=m.primary_entity_type,
        primary_entity_id=m.primary_entity_id,
        primary_relation_note=m.primary_relation_note,
        participants=[
            ParticipantOut(
                id=p.id,
                meeting_id=p.meeting_id,
                stakeholder_id=p.stakeholder_id,
                name=p.name,
                role=p.role,
                attended=p.attended in (True, "true", "True"),
                created_at=p.created_at,
            )
            for p in participants
        ],
        action_items=[
            ActionItemOut(
                id=a.id,
                meeting_id=a.meeting_id,
                description=a.description,
                assigned_to=a.assigned_to,
                due_date=a.due_date,
                status=a.status,
                notes=a.notes,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in action_items
        ],
        links=[LinkOut.model_validate(l) for l in links],
        relations=[MeetingRelationOut.model_validate(r) for r in relations],
        sessions=[MeetingSessionOut.model_validate(s) for s in sessions],
        transcripts=[MeetingTranscriptOut.model_validate(t) for t in transcripts],
        summaries=[MeetingSummaryOut.model_validate(s) for s in summaries],
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


@router.get("", response_model=list[MeetingOut])
def list_meetings(
    product_id: Optional[int] = None,
    meeting_type: Optional[MeetingType] = None,
    status: Optional[MeetingStatus] = None,
    opportunity_id: Optional[str] = None,
    primary_entity_type: Optional[MeetingEntityType] = None,
    primary_entity_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Meeting)
    if product_id:
        q = q.filter(Meeting.product_id == product_id)
    if meeting_type:
        q = q.filter(Meeting.meeting_type == meeting_type)
    if status:
        q = q.filter(Meeting.status == status)
    if opportunity_id:
        q = q.filter(Meeting.opportunity_id == opportunity_id)
    if primary_entity_type:
        q = q.filter(Meeting.primary_entity_type == primary_entity_type)
    if primary_entity_id:
        q = q.filter(Meeting.primary_entity_id == primary_entity_id)
    meetings = q.order_by(Meeting.meeting_date.desc().nullslast(), Meeting.created_at.desc()).all()
    return [_enrich_meeting(m, db) for m in meetings]


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_meeting(body: MeetingCreate, db: Session = Depends(get_db)):
    import uuid as _uuid

    m = Meeting(id=str(_uuid.uuid4()), **body.model_dump())
    _sync_legacy_links(m)
    db.add(m)
    db.commit()
    db.refresh(m)
    _ensure_default_session(m, db)
    _ensure_primary_relation(m, db)
    return _enrich_meeting(m, db)


@router.get("/{id}", response_model=MeetingOut)
def get_meeting(id: str, db: Session = Depends(get_db)):
    return _enrich_meeting(_get_or_404(Meeting, id, db), db)


@router.patch("/{id}", response_model=MeetingOut)
def update_meeting(id: str, body: MeetingUpdate, db: Session = Depends(get_db)):
    m = _get_or_404(Meeting, id, db)
    payload = body.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(m, k, v)
    _sync_legacy_links(m)
    db.commit()
    db.refresh(m)
    _ensure_primary_relation(m, db)
    return _enrich_meeting(m, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(id: str, db: Session = Depends(get_db)):
    BaseRepository(Meeting, db).delete(_get_or_404(Meeting, id, db))


@router.post("/{meeting_id}/relations", response_model=MeetingRelationOut, status_code=status.HTTP_201_CREATED)
def add_relation(meeting_id: str, body: MeetingRelationCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    import uuid as _uuid

    rel = MeetingRelation(
        id=str(_uuid.uuid4()),
        meeting_id=meeting_id,
        **body.model_dump(),
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return MeetingRelationOut.model_validate(rel)


@router.patch("/relations/{relation_id}", response_model=MeetingRelationOut)
def update_relation(relation_id: str, body: MeetingRelationUpdate, db: Session = Depends(get_db)):
    rel = db.get(MeetingRelation, relation_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(rel, k, v)
    db.commit()
    db.refresh(rel)
    return MeetingRelationOut.model_validate(rel)


@router.delete("/relations/{relation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relation(relation_id: str, db: Session = Depends(get_db)):
    rel = db.get(MeetingRelation, relation_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")
    db.delete(rel)
    db.commit()


@router.post("/{meeting_id}/sessions", response_model=MeetingSessionOut, status_code=status.HTTP_201_CREATED)
def add_session(meeting_id: str, body: MeetingSessionCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    import uuid as _uuid

    session = MeetingSession(
        id=str(_uuid.uuid4()),
        meeting_id=meeting_id,
        **body.model_dump(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return MeetingSessionOut.model_validate(session)


@router.patch("/{meeting_id}/sessions/{session_id}", response_model=MeetingSessionOut)
def update_session(meeting_id: str, session_id: str, body: MeetingSessionUpdate, db: Session = Depends(get_db)):
    session = db.get(MeetingSession, session_id)
    if not session or session.meeting_id != meeting_id:
        raise HTTPException(status_code=404, detail="Session not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(session, k, v)
    db.commit()
    db.refresh(session)
    return MeetingSessionOut.model_validate(session)


@router.delete("/{meeting_id}/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(meeting_id: str, session_id: str, db: Session = Depends(get_db)):
    session = db.get(MeetingSession, session_id)
    if not session or session.meeting_id != meeting_id:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()


@router.post("/{meeting_id}/transcripts", response_model=MeetingTranscriptOut, status_code=status.HTTP_201_CREATED)
def add_transcript(meeting_id: str, body: MeetingTranscriptCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    _validate_session_belongs_to_meeting(body.session_id, meeting_id, db)
    import uuid as _uuid

    transcript = MeetingTranscript(
        id=str(_uuid.uuid4()),
        meeting_id=meeting_id,
        **body.model_dump(),
    )
    db.add(transcript)
    db.commit()
    db.refresh(transcript)
    return MeetingTranscriptOut.model_validate(transcript)


@router.patch("/transcripts/{transcript_id}", response_model=MeetingTranscriptOut)
def update_transcript(transcript_id: str, body: MeetingTranscriptUpdate, db: Session = Depends(get_db)):
    transcript = db.get(MeetingTranscript, transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    session_id = body.model_dump(exclude_unset=True).get("session_id")
    if session_id is not None:
        _validate_session_belongs_to_meeting(session_id, transcript.meeting_id, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(transcript, k, v)
    db.commit()
    db.refresh(transcript)
    return MeetingTranscriptOut.model_validate(transcript)


@router.delete("/transcripts/{transcript_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transcript(transcript_id: str, db: Session = Depends(get_db)):
    transcript = db.get(MeetingTranscript, transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    db.delete(transcript)
    db.commit()


@router.post("/{meeting_id}/summaries", response_model=MeetingSummaryOut, status_code=status.HTTP_201_CREATED)
def add_summary(meeting_id: str, body: MeetingSummaryCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    _validate_session_belongs_to_meeting(body.session_id, meeting_id, db)
    _validate_transcript_belongs_to_meeting(body.transcript_id, meeting_id, db)
    import uuid as _uuid

    summary = MeetingSummary(
        id=str(_uuid.uuid4()),
        meeting_id=meeting_id,
        **body.model_dump(),
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return MeetingSummaryOut.model_validate(summary)


@router.patch("/summaries/{summary_id}", response_model=MeetingSummaryOut)
def update_summary(summary_id: str, body: MeetingSummaryUpdate, db: Session = Depends(get_db)):
    summary = db.get(MeetingSummary, summary_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    payload = body.model_dump(exclude_unset=True)
    if "session_id" in payload:
        _validate_session_belongs_to_meeting(payload["session_id"], summary.meeting_id, db)
    if "transcript_id" in payload:
        _validate_transcript_belongs_to_meeting(payload["transcript_id"], summary.meeting_id, db)
    for k, v in payload.items():
        setattr(summary, k, v)
    db.commit()
    db.refresh(summary)
    return MeetingSummaryOut.model_validate(summary)


@router.delete("/summaries/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_summary(summary_id: str, db: Session = Depends(get_db)):
    summary = db.get(MeetingSummary, summary_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    db.delete(summary)
    db.commit()


class ParticipantCreate(BaseModel):
    stakeholder_id: Optional[int] = None
    name: str
    role: Optional[str] = None
    attended: bool = True


class ParticipantUpdate(BaseModel):
    role: Optional[str] = None
    attended: Optional[bool] = None


@router.post("/{meeting_id}/participants", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
def add_participant(meeting_id: str, body: ParticipantCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    import uuid as _uuid

    p = MeetingParticipant(
        id=str(_uuid.uuid4()),
        meeting_id=meeting_id,
        stakeholder_id=body.stakeholder_id,
        name=body.name,
        role=body.role,
        attended=str(body.attended).lower(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return ParticipantOut(
        id=p.id,
        meeting_id=p.meeting_id,
        stakeholder_id=p.stakeholder_id,
        name=p.name,
        role=p.role,
        attended=p.attended in (True, "true", "True"),
        created_at=p.created_at,
    )


@router.patch("/{meeting_id}/participants/{pid}", response_model=ParticipantOut)
def update_participant(meeting_id: str, pid: str, body: ParticipantUpdate, db: Session = Depends(get_db)):
    p = db.get(MeetingParticipant, pid)
    if not p or p.meeting_id != meeting_id:
        raise HTTPException(status_code=404, detail="Participant not found")
    if body.role is not None:
        p.role = body.role
    if body.attended is not None:
        p.attended = str(body.attended).lower()
    db.commit()
    db.refresh(p)
    return ParticipantOut(
        id=p.id,
        meeting_id=p.meeting_id,
        stakeholder_id=p.stakeholder_id,
        name=p.name,
        role=p.role,
        attended=p.attended in (True, "true", "True"),
        created_at=p.created_at,
    )


@router.delete("/{meeting_id}/participants/{pid}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(meeting_id: str, pid: str, db: Session = Depends(get_db)):
    p = db.get(MeetingParticipant, pid)
    if not p or p.meeting_id != meeting_id:
        raise HTTPException(status_code=404, detail="Participant not found")
    db.delete(p)
    db.commit()


class ActionItemCreate(BaseModel):
    description: str
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: ActionItemStatus = ActionItemStatus.pending
    notes: Optional[str] = None


class ActionItemUpdate(BaseModel):
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[ActionItemStatus] = None
    notes: Optional[str] = None


@router.post("/{meeting_id}/action-items", response_model=ActionItemOut, status_code=status.HTTP_201_CREATED)
def add_action_item(meeting_id: str, body: ActionItemCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    import uuid as _uuid

    a = MeetingActionItem(id=str(_uuid.uuid4()), meeting_id=meeting_id, **body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return ActionItemOut(
        id=a.id,
        meeting_id=a.meeting_id,
        description=a.description,
        assigned_to=a.assigned_to,
        due_date=a.due_date,
        status=a.status,
        notes=a.notes,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


@router.patch("/action-items/{aid}", response_model=ActionItemOut)
def update_action_item(aid: str, body: ActionItemUpdate, db: Session = Depends(get_db)):
    a = db.get(MeetingActionItem, aid)
    if not a:
        raise HTTPException(status_code=404, detail="Action item not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return ActionItemOut(
        id=a.id,
        meeting_id=a.meeting_id,
        description=a.description,
        assigned_to=a.assigned_to,
        due_date=a.due_date,
        status=a.status,
        notes=a.notes,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


@router.delete("/action-items/{aid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(aid: str, db: Session = Depends(get_db)):
    a = db.get(MeetingActionItem, aid)
    if not a:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(a)
    db.commit()


class LinkCreate(BaseModel):
    label: str
    url: str
    link_type: str = "document"


class LinkUpdate(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None
    link_type: Optional[str] = None


@router.post("/{meeting_id}/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def add_link(meeting_id: str, body: LinkCreate, db: Session = Depends(get_db)):
    _get_or_404(Meeting, meeting_id, db)
    import uuid as _uuid

    lnk = MeetingLink(id=str(_uuid.uuid4()), meeting_id=meeting_id, **body.model_dump())
    db.add(lnk)
    db.commit()
    db.refresh(lnk)
    return LinkOut.model_validate(lnk)


@router.patch("/links/{lid}", response_model=LinkOut)
def update_link(lid: str, body: LinkUpdate, db: Session = Depends(get_db)):
    lnk = db.get(MeetingLink, lid)
    if not lnk:
        raise HTTPException(status_code=404, detail="Link not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(lnk, k, v)
    db.commit()
    db.refresh(lnk)
    return LinkOut.model_validate(lnk)


@router.delete("/links/{lid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(lid: str, db: Session = Depends(get_db)):
    lnk = db.get(MeetingLink, lid)
    if not lnk:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(lnk)
    db.commit()
