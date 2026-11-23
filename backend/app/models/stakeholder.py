from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from app.core.database import Base


class Stakeholder(Base):
    """Cadastro mestre do stakeholder (dados pessoais/profissionais)."""
    __tablename__ = "stakeholders"
    stakeholder_id           = Column(Integer, primary_key=True, autoincrement=True)
    full_name                = Column(String(150), nullable=False)
    position_title           = Column(String(150))
    email                    = Column(String(150))
    manager_name             = Column(String(100))
    stakeholder_type         = Column(String(50))
    relationship_status      = Column(String(50))
    notes                    = Column(Text)
    is_active                = Column(Boolean, default=True)
    company_id               = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    # Legacy single-product fields kept for backward compat
    product_id               = Column(Integer, nullable=True)
    role                     = Column(String(255))
    influence                = Column(Integer, default=3)
    interest                 = Column(Integer, default=3)
    created_at               = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class StakeholderProduct(Base):
    """Associação N:N entre stakeholder e produto — inclui avaliação contextual por produto."""
    __tablename__ = "stakeholder_products"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    stakeholder_id = Column(Integer, ForeignKey("stakeholders.stakeholder_id", ondelete="CASCADE"), nullable=False, index=True)
    product_id     = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False, index=True)
    role           = Column(String(255))
    # Influência / Interesse (quadrante stakeholder map)
    influence      = Column(Integer, default=3)
    interest       = Column(Integer, default=3)
    # Avaliação contextual (antes em stakeholder_assessments)
    power_level     = Column(Integer, nullable=True)    # 1-5
    alignment_level = Column(Integer, nullable=True)    # 1-5
    risk_level      = Column(Integer, nullable=True)    # 1-5
    sentiment       = Column(String(50), nullable=True) # Supportive | Neutral | Resistant | Unknown
    expectation     = Column(String, nullable=True)
    concern         = Column(String, nullable=True)
    strategy        = Column(String, nullable=True)     # recommended_strategy
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
