import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAE
from sqlalchemy.orm import relationship

from app.core.database import Base


class RiskStatus(str, Enum):
    identified = "identified"
    mitigated = "mitigated"
    accepted = "accepted"
    closed = "closed"


class RiskLinkType(str, Enum):
    roadmap = "roadmap"
    backlog = "backlog"
    decision = "decision"


class Risk(Base):
    __tablename__ = "risks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), nullable=False, index=True)
    discovery_opportunity_id = Column(
        String(36),
        ForeignKey("discovery_opportunities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    domain_id = Column(Integer, nullable=True, index=True)
    subdomain_id = Column(Integer, nullable=True, index=True)
    requirement_id = Column(Integer, nullable=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=True)
    responsible = Column(String(150), nullable=True)
    probability = Column(Integer, default=1)
    impact = Column(Integer, default=1)
    risk_score = Column(Integer, default=1)
    status = Column(SAE(RiskStatus), default=RiskStatus.identified)
    mitigation_plan = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    links = relationship("RiskLink", back_populates="risk", cascade="all, delete-orphan", passive_deletes=True)


class RiskLink(Base):
    __tablename__ = "risk_links"
    __table_args__ = (
        UniqueConstraint("risk_id", "entity_type", "entity_id", name="risk_links_unique"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    risk_id = Column(String(36), ForeignKey("risks.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    risk = relationship("Risk", back_populates="links")
