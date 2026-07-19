from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from app.core.database import Base


class ProductCapability(Base):
    """Capacidades do produto (epics de alto nível)."""
    __tablename__ = "product_capabilities"
    capability_id = Column(Integer, primary_key=True, autoincrement=True)
    product_id    = Column(Integer, nullable=False, index=True)
    name          = Column(String(150), nullable=False)
    description   = Column(Text)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ProductFeature(Base):
    """Features do produto vinculadas a capacidades."""
    __tablename__ = "product_features"
    feature_id     = Column(Integer, primary_key=True, autoincrement=True)
    capability_id  = Column(Integer, nullable=True, index=True)   # FK → product_capabilities
    title          = Column(String(200), nullable=False)
    description    = Column(Text)
    business_area  = Column(String(100))
    current_status = Column(String(30), default="Backlog")
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ProductImpact(Base):
    """Impactos mensuráveis de features/backlog no produto."""
    __tablename__ = "product_impacts"
    impact_id        = Column(Integer, primary_key=True, autoincrement=True)
    product_id       = Column(Integer, nullable=True, index=True)
    feature_id       = Column(Integer, nullable=True)
    backlog_item_id  = Column(Integer, nullable=True)
    vpc_id           = Column(Integer, nullable=True)
    title            = Column(String(200), nullable=False)
    impacted_area    = Column(String(120))
    impacted_team    = Column(String(120))
    before_scenario  = Column(Text)
    after_scenario   = Column(Text)
    impact_summary   = Column(Text, nullable=False)
    metric_name      = Column(String(120))
    metric_before    = Column(String(100))
    metric_after     = Column(String(100))
    metric_unit      = Column(String(50))
    value_statement  = Column(Text)
    evidence_notes   = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ValuePropositionCanvas(Base):
    """Canvas de proposta de valor (entidade principal do VPC no banco)."""
    __tablename__ = "value_proposition_canvas"
    vpc_id           = Column(Integer, primary_key=True, autoincrement=True)
    target_segment   = Column(String(150), nullable=False)
    jobs_to_be_done  = Column(Text)
    pains            = Column(Text)
    gains            = Column(Text)
    products_services= Column(Text)
    pain_relievers   = Column(Text)
    gain_creators    = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
