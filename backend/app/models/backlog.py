from datetime import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String, Text
from app.core.database import Base


class BacklogItem(Base):
    __tablename__ = "backlog_items"
    item_id             = Column(Integer, primary_key=True, autoincrement=True)
    product_id          = Column(Integer, nullable=True, index=True)
    feature_id          = Column(Integer, nullable=True)
    sprint_id           = Column(Integer, nullable=True)
    ado_id              = Column(String(50))
    item_type_id        = Column(Integer, nullable=True)     # FK → backlog_item_types.item_type_id
    title               = Column(String(250), nullable=False)
    description         = Column(Text)
    current_status      = Column(String(30), default="open")
    business_value      = Column(Text)
    acceptance_criteria = Column(Text)
    story_points        = Column(Integer)
    priority            = Column(Integer, default=3)
    # WSJF components (Weighted Shortest Job First)
    wsjf_business_value   = Column(Integer, default=1)
    wsjf_time_criticality = Column(Integer, default=1)
    wsjf_risk_reduction   = Column(Integer, default=1)
    wsjf_job_size         = Column(Integer, default=1)
    wsjf_score            = Column(Numeric(6, 2), default=0.0)  # (bv + tc + rr) / job_size, 1 decimal
    created_at            = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at        = Column(DateTime, nullable=True)


class BacklogItemType(Base):
    __tablename__ = "backlog_item_types"
    item_type_id  = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(50), nullable=False)
    description   = Column(Text)
    display_order = Column(Integer, default=0)
    is_active     = Column(Boolean, default=True)


class Sprint(Base):
    __tablename__ = "sprints"
    sprint_id   = Column(Integer, primary_key=True, autoincrement=True)
    product_id  = Column(Integer, nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    goal        = Column(Text)
    start_date  = Column(Date, nullable=True)
    end_date    = Column(Date, nullable=True)
    status      = Column(String(20), default="planned")   # planned | active | completed | cancelled
    capacity    = Column(Integer, nullable=True)           # story points planejados (disponibilidade do time)
    velocity    = Column(Integer, nullable=True)           # story points efetivamente entregues
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BacklogItemSuggestion(Base):
    __tablename__ = "backlog_item_suggestions"
    suggestion_id       = Column(Integer, primary_key=True, autoincrement=True)
    vpc_id              = Column(Integer, nullable=True)
    feature_id          = Column(Integer, nullable=True)
    suggested_type      = Column(String(50))
    title               = Column(String(250), nullable=False)
    description         = Column(Text)
    rationale           = Column(Text)
    acceptance_criteria = Column(Text)
    status              = Column(String(30), default="pending")
    reviewed_by         = Column(String(150))
    reviewed_at         = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
