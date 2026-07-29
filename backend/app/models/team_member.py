from datetime import datetime, date as date_type
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text, UniqueConstraint
from app.core.database import Base


class TeamMember(Base):
    """Cadastro mestre do membro da equipe (global, sem duplicidade por produto)."""
    __tablename__ = "team_members"

    member_id     = Column(Integer, primary_key=True, autoincrement=True)
    full_name     = Column(String(150), nullable=False)
    email         = Column(String(255), nullable=True)
    resource_type = Column(String(30), default="internal")   # internal | outsourced | consultant
    department    = Column(String(100), nullable=True)
    company       = Column(String(150), nullable=True)        # se outsourced/consultant
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class TeamMemberProduct(Base):
    """Associação N:N entre membro e produto, com contexto por produto."""
    __tablename__ = "team_member_products"
    __table_args__ = (
        UniqueConstraint("member_id", "product_id", name="uq_team_member_product"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    member_id  = Column(Integer, nullable=False, index=True)   # FK → team_members.member_id
    product_id = Column(Integer, nullable=False, index=True)   # FK → products.product_id
    role       = Column(String(100), nullable=True)             # Developer, QA, Tech Lead, etc.
    start_date = Column(Date, nullable=True)
    end_date   = Column(Date, nullable=True)                    # NULL = ainda no projeto
    is_active  = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
