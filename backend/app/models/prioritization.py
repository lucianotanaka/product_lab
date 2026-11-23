import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy import Enum as SAE

from app.core.database import Base


class PriorityMethod(str, Enum):
    RICE = "RICE"
    ICE = "ICE"
    MOSCOW = "MOSCOW"
    EISENHOWER = "EISENHOWER"
    WSJF = "WSJF"


class MoscowValue(str, Enum):
    must = "must"
    should = "should"
    could = "could"
    wont = "wont"


class PrioritizationBaseMixin:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), nullable=False, index=True)
    backlog_item_id = Column(Integer, nullable=True, index=True)
    source_type = Column(String(30), nullable=False, default="manual")
    source_id = Column(String(50), nullable=True)
    item_type = Column(String(50), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class RicePrioritizationItem(PrioritizationBaseMixin, Base):
    __tablename__ = "prioritization_rice_items"

    reach = Column(Float, default=0.0)
    impact = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    effort = Column(Float, default=1.0)
    rice_score = Column(Float, default=0.0)


class IcePrioritizationItem(PrioritizationBaseMixin, Base):
    __tablename__ = "prioritization_ice_items"

    impact = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    ease = Column(Float, default=1.0)
    ice_score = Column(Float, default=0.0)


class MoscowPrioritizationItem(PrioritizationBaseMixin, Base):
    __tablename__ = "prioritization_moscow_items"

    moscow_value = Column(SAE(MoscowValue), nullable=True)


class EisenhowerPrioritizationItem(PrioritizationBaseMixin, Base):
    __tablename__ = "prioritization_eisenhower_items"

    urgency = Column(Float, default=0.0)
    importance = Column(Float, default=0.0)
    eisenhower_score = Column(Float, default=0.0)
    quadrant = Column(String(30), nullable=True)


class WsjfPrioritizationItem(PrioritizationBaseMixin, Base):
    __tablename__ = "prioritization_wsjf_items"

    business_value = Column(Float, default=0.0)
    time_criticality = Column(Float, default=0.0)
    risk_reduction = Column(Float, default=0.0)
    job_size = Column(Float, default=1.0)
    wsjf_score = Column(Float, default=0.0)


class QuarterPrioritizationItem(Base):
    __tablename__ = "quarter_prioritization_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(Integer, nullable=False, index=True)
    product_id = Column(String(36), nullable=False, index=True)
    roadmap_item_id = Column(String(36), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    quarter = Column(String(2), nullable=False, index=True)
    priority_rank = Column(Integer, nullable=True)
    planning_status = Column(String(20), nullable=False, default="candidate")
    business_value = Column(Float, default=0.0)
    strategic_alignment = Column(Float, default=0.0)
    urgency = Column(Float, default=0.0)
    dependency_readiness = Column(Float, default=0.0)
    delivery_risk = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    estimated_effort = Column(Float, default=0.0)
    planned_capacity_share = Column(Float, nullable=True)
    quarter_score = Column(Float, default=0.0)
    decision_rationale = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


METHOD_MODEL_MAP = {
    PriorityMethod.RICE: RicePrioritizationItem,
    PriorityMethod.ICE: IcePrioritizationItem,
    PriorityMethod.MOSCOW: MoscowPrioritizationItem,
    PriorityMethod.EISENHOWER: EisenhowerPrioritizationItem,
    PriorityMethod.WSJF: WsjfPrioritizationItem,
}
