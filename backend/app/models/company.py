from datetime import datetime, date
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from app.core.database import Base


class CompanyAreaMember(Base):
    """Membro de uma área de negócio em uma empresa.
    Unifica membros comuns (role_in_area) e líderes formais (leadership_level IS NOT NULL).
    """
    __tablename__ = "company_area_members"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    company_id           = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    business_area_id     = Column(Integer, ForeignKey("business_areas.id", ondelete="CASCADE"), nullable=False, index=True)
    stakeholder_id       = Column(Integer, ForeignKey("stakeholders.stakeholder_id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_area         = Column(String(100), nullable=True)   # Patrocinador, Membro, Aprovador etc.
    # ── Liderança formal (NULL = membro comum) ──────────────────────────────
    leadership_level     = Column(String(50), nullable=True)    # DIRECTOR|MANAGER|COORDINATOR|SUPERVISOR|LEAD
    is_current           = Column(Boolean, nullable=False, default=True)
    started_at           = Column(Date, nullable=True, default=date.today)
    ended_at             = Column(Date, nullable=True)
    reports_to_member_id = Column(Integer, ForeignKey("company_area_members.id", ondelete="SET NULL"), nullable=True, index=True)
    # ────────────────────────────────────────────────────────────────────────
    is_active            = Column(Boolean, nullable=False, default=True)
    notes                = Column(Text, nullable=True)
    created_at           = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at           = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompanyBusinessArea(Base):
    """Associação N:M entre empresa e área de negócio."""
    __tablename__ = "company_business_areas"
    __table_args__ = (
        UniqueConstraint("company_id", "business_area_id", name="uq_company_area"),
    )

    id               = Column(Integer, primary_key=True, autoincrement=True)
    company_id       = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    business_area_id = Column(Integer, ForeignKey("business_areas.id", ondelete="CASCADE"), nullable=False, index=True)
    notes            = Column(Text, nullable=True)
    is_active        = Column(Boolean, nullable=False, default=True)
    display_order    = Column(Integer, nullable=False, default=0)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Company(Base):
    """Empresa / cliente gerenciada pelo PM."""
    __tablename__ = "companies"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    company_name  = Column(String(200), nullable=False)
    company_type  = Column(String(50), default="CLIENT")   # CLIENT | INTERNAL | PARTNER
    cnpj          = Column(String(20), nullable=True)
    website       = Column(String(200), nullable=True)
    country       = Column(String(100), nullable=True)
    is_active     = Column(Boolean, nullable=False, default=True)
    notes         = Column(Text, nullable=True)
    fiscal_year_start_month = Column(Integer, nullable=True, default=1)
    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at    = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserCompany(Base):
    """Associação N:M entre usuário (PM) e empresa."""
    __tablename__ = "user_companies"
    __table_args__ = (
        UniqueConstraint("user_id", "company_id", name="uq_user_company"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    role       = Column(String(50), nullable=False, default="PM")   # PM | VIEWER | ADMIN
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
