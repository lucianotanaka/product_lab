import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy import Enum as SAE
from app.core.database import Base

class RiskStatus(str, Enum):
    identified = "identified"
    mitigated  = "mitigated"
    accepted   = "accepted"
    closed     = "closed"

class Risk(Base):
    __tablename__ = "risks"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id      = Column(String(36), nullable=False, index=True)
    title           = Column(String(500), nullable=False)
    description     = Column(Text)
    probability     = Column(Integer, default=1)
    impact          = Column(Integer, default=1)
    risk_score      = Column(Integer, default=1)
    status          = Column(SAE(RiskStatus), default=RiskStatus.identified)
    mitigation_plan = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
