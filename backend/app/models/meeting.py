import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Date, Integer, String, Text, ForeignKey
from sqlalchemy import Enum as SAE

from app.core.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class MeetingType(str, Enum):
    discovery = "discovery"
    review = "review"
    planning = "planning"
    retrospective = "retrospective"
    stakeholder = "stakeholder"
    requirements = "requirements"
    follow_up = "follow_up"
    other = "other"


class MeetingStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class ActionItemStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"
    cancelled = "cancelled"


class TranscriptSourceType(str, Enum):
    paste = "paste"
    upload = "upload"
    integration = "integration"
    manual = "manual"


class SummaryType(str, Enum):
    human = "human"
    ai = "ai"
    executive = "executive"
    bullets = "bullets"
    minutes = "minutes"


class MeetingEntityType(str, Enum):
    discovery_opportunity = "discovery_opportunity"
    discovery_research = "discovery_research"
    roadmap_item = "roadmap_item"
    backlog_item = "backlog_item"
    risk = "risk"
    requirement = "requirement"
    decision = "decision"
    process = "process"
    business_domain = "business_domain"
    followup = "followup"
    other = "other"


class MeetingRelationType(str, Enum):
    primary = "primary"
    discussed = "discussed"
    decided = "decided"
    impacted = "impacted"
    created_from = "created_from"
    related = "related"


# ─── Table: meetings ──────────────────────────────────────────────────────────

class Meeting(Base):
    """Cross-module meeting record with agenda, recurring sessions and meeting assets."""
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(Integer, nullable=True, index=True)    # optional product scope
    title = Column(String(300), nullable=False)
    meeting_type = Column(SAE(MeetingType), default=MeetingType.other, nullable=False)
    meeting_date = Column(Date, nullable=True)
    start_time = Column(String(5), nullable=True)   # HH:MM
    duration_minutes = Column(Integer, nullable=True)
    location = Column(String(200))                  # room, Teams link, etc.
    status = Column(SAE(MeetingStatus), default=MeetingStatus.scheduled, nullable=False)

    # Content
    objective = Column(Text)
    agenda = Column(Text)        # free-text agenda / tópicos
    decisions = Column(Text)     # decisões tomadas (free-text or markdown list)
    notes = Column(Text)         # observações adicionais

    # Legacy direct links
    opportunity_id = Column(String(36), nullable=True, index=True)   # → discovery_opportunities
    backlog_item_id = Column(String(36), nullable=True, index=True)  # → backlog_items
    roadmap_item_id = Column(String(36), nullable=True, index=True)  # → roadmap_items

    # New primary cross-module association
    primary_entity_type = Column(SAE(MeetingEntityType), nullable=True)
    primary_entity_id = Column(String(36), nullable=True, index=True)
    primary_relation_note = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table: meeting_sessions ──────────────────────────────────────────────────

class MeetingSession(Base):
    """Single occurrence of a meeting, allowing recurring or multi-day meetings."""
    __tablename__ = "meeting_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=True)
    session_date = Column(Date, nullable=True, index=True)
    start_time = Column(String(5), nullable=True)
    end_time = Column(String(5), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    location = Column(String(200), nullable=True)
    status = Column(SAE(MeetingStatus), default=MeetingStatus.scheduled, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table: meeting_transcripts ───────────────────────────────────────────────

class MeetingTranscript(Base):
    """Transcript as searchable text for copy/paste or imported content."""
    __tablename__ = "meeting_transcripts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("meeting_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(300), nullable=False)
    content_text = Column(Text, nullable=False)
    language = Column(String(20), nullable=True)
    source_type = Column(SAE(TranscriptSourceType), default=TranscriptSourceType.paste, nullable=False)
    source_attachment_id = Column(String(36), nullable=True)
    created_by = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table: meeting_summaries ─────────────────────────────────────────────────

class MeetingSummary(Base):
    """Summary/minutes derived from a meeting or transcript."""
    __tablename__ = "meeting_summaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("meeting_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    transcript_id = Column(String(36), ForeignKey("meeting_transcripts.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(300), nullable=False)
    summary_type = Column(SAE(SummaryType), default=SummaryType.minutes, nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table: meeting_participants ──────────────────────────────────────────────

class MeetingParticipant(Base):
    """Participants of a meeting — references stakeholders or free-text names."""
    __tablename__ = "meeting_participants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    stakeholder_id = Column(Integer, nullable=True)    # FK → stakeholders (optional)
    name = Column(String(200), nullable=False)         # display name (denormalized)
    role = Column(String(100))                         # e.g. "facilitator", "note-taker"
    attended = Column(String(5), default="true", nullable=False)  # true/false
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ─── Table: meeting_action_items ──────────────────────────────────────────────

class MeetingActionItem(Base):
    """Action items / next-steps generated from a meeting."""
    __tablename__ = "meeting_action_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    assigned_to = Column(String(200))      # free-text name
    due_date = Column(Date, nullable=True)
    status = Column(SAE(ActionItemStatus), default=ActionItemStatus.pending, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table: meeting_links ─────────────────────────────────────────────────────

class MeetingLink(Base):
    """External links attached to a meeting (docs, slides, recordings, etc.)."""
    __tablename__ = "meeting_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(200), nullable=False)   # e.g. "Apresentação", "Gravação", "Ata no Confluence"
    url = Column(Text, nullable=False)
    link_type = Column(String(30), default="document")  # document | recording | image | other
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ─── Table: meeting_relations ─────────────────────────────────────────────────

class MeetingRelation(Base):
    """Polymorphic links between a meeting and records from other modules."""
    __tablename__ = "meeting_relations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(SAE(MeetingEntityType), nullable=False)
    entity_id = Column(String(36), nullable=False, index=True)
    relation_type = Column(SAE(MeetingRelationType), default=MeetingRelationType.related, nullable=False)
    label = Column(String(200), nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
