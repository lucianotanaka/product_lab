import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.dialects.postgresql import ARRAY
from app.core.database import Base

class DecisionStatus(str, Enum):
    proposed   = "proposed"
    accepted   = "accepted"
    deprecated = "deprecated"
    superseded = "superseded"

class Decision(Base):
    __tablename__ = "decisions"
    id           = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id   = Column(String(36), nullable=False, index=True)
    title        = Column(String(500), nullable=False)
    context      = Column(Text)
    decision     = Column(Text)
    consequences = Column(Text)
    status       = Column(SAE(DecisionStatus), default=DecisionStatus.proposed)
    tags         = Column(ARRAY(String), default=list)
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
