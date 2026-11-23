import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, LargeBinary
from app.core.database import Base


class Attachment(Base):
    """
    Polymorphic attachment — stores file binary directly in PostgreSQL (BYTEA).
    entity_type: 'meeting' | 'backlog_item' | 'discovery_research' | 'decision' | etc.
    entity_id:   UUID/string of the parent record.
    """
    __tablename__ = "attachments"

    id          = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50),  nullable=False, index=True)
    entity_id   = Column(String(36),  nullable=False, index=True)
    file_name   = Column(String(300), nullable=False)
    mime_type   = Column(String(120), nullable=False, default="application/octet-stream")
    file_size   = Column(Integer,     nullable=False, default=0)
    file_data   = Column(LargeBinary, nullable=False)
    uploaded_by = Column(String(200))
    created_at  = Column(DateTime,    default=datetime.utcnow, nullable=False)
