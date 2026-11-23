import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Date, String, Text, Index
from app.core.database import Base


class Followup(Base):
    """
    Universal Follow-Up — polymorphic entity_type + entity_id pattern.

    entity_type: 'discovery_research' | 'discovery_opportunity' | 'meeting'
                 'backlog_item' | 'decision' | 'risk' | 'roadmap_item'
                 'requirement'  | 'process'  | (any future module)
    entity_id:   UUID/string of the parent record (VARCHAR to handle both
                 integer-PK modules serialised as string and UUID-PK modules).

    action_type (non-exhaustive):
        schedule_meeting | request_info | send_material | review_answer |
        validate | escalate | send_email | update_stakeholder | other

    status: pending | done | cancelled
    """
    __tablename__ = "followups"

    id          = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50),  nullable=False, index=True)
    entity_id   = Column(String(36),  nullable=False, index=True)
    action_type = Column(String(30),  nullable=False, default="other")
    description = Column(Text,        nullable=False)
    assigned_to = Column(String(200), nullable=True)
    due_date    = Column(Date,        nullable=True)
    status      = Column(String(20),  nullable=False, default="pending")
    notes       = Column(Text,        nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime,    nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Composite index for the most common query: list all follow-ups for an entity
    __table_args__ = (
        Index("ix_followups_entity", "entity_type", "entity_id"),
    )
