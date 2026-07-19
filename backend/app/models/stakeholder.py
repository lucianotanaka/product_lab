from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from app.core.database import Base


class Stakeholder(Base):
    """Cadastro mestre do stakeholder (dados pessoais/profissionais)."""
    __tablename__ = "stakeholders"
    stakeholder_id      = Column(Integer, primary_key=True, autoincrement=True)
    full_name           = Column(String(150), nullable=False)
    area                = Column(String(100))
    department          = Column(String(100))
    position_title      = Column(String(150))
    company             = Column(String(100))
    email               = Column(String(150))
    manager_name        = Column(String(100))
    stakeholder_type    = Column(String(50))
    relationship_status = Column(String(50))
    notes               = Column(Text)
    is_active           = Column(Boolean, default=True)
    # Legacy single-product fields kept for backward compat
    product_id          = Column(Integer, nullable=True)
    role                = Column(String(255))
    influence           = Column(Integer, default=3)
    interest            = Column(Integer, default=3)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class StakeholderProduct(Base):
    """Associação N:N entre stakeholder e produto, com atributos contextuais."""
    __tablename__ = "stakeholder_products"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    stakeholder_id = Column(Integer, ForeignKey("stakeholders.stakeholder_id", ondelete="CASCADE"), nullable=False, index=True)
    product_id     = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False, index=True)
    role           = Column(String(255))
    influence      = Column(Integer, default=3)
    interest       = Column(Integer, default=3)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
