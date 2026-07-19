import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy import Enum as SAE
from app.core.database import Base

class PriorityMethod(str, Enum):
    RICE   = "RICE"
    ICE    = "ICE"
    MOSCOW = "MOSCOW"

class MoscowValue(str, Enum):
    must   = "must"
    should = "should"
    could  = "could"
    wont   = "wont"

class PrioritizationItem(Base):
    __tablename__ = "prioritization_items"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id      = Column(String(36), nullable=False, index=True)
    title           = Column(String(500), nullable=False)
    description     = Column(Text)
    priority_method = Column(SAE(PriorityMethod), default=PriorityMethod.RICE)
    reach           = Column(Float, default=0.0)
    impact          = Column(Float, default=0.0)
    confidence      = Column(Float, default=0.0)
    effort          = Column(Float, default=1.0)
    rice_score      = Column(Float, default=0.0)
    moscow_value    = Column(SAE(MoscowValue), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
