from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from app.core.database import Base


class BusinessDomain(Base):
    """Transversal business domain — independent of any single product."""
    __tablename__ = "business_domains"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    domain_code   = Column(String(50),  nullable=False, unique=True)   # e.g. 'CISCO-LCI'
    domain_name   = Column(String(200), nullable=False)
    description   = Column(Text,        nullable=True)
    owner         = Column(String(200), nullable=True)
    business_objective = Column(Text,   nullable=True)
    scope_in      = Column(Text,        nullable=True)
    scope_out     = Column(Text,        nullable=True)
    business_value = Column(Text,       nullable=True)
    document_status = Column(String(30), nullable=False, default="DRAFT")
    version       = Column(String(30),  nullable=False, default="1.0")
    is_active     = Column(Boolean,     nullable=False, default=True)
    display_order = Column(Integer,     nullable=False, default=0)
    created_at    = Column(DateTime,    nullable=False, default=datetime.utcnow)
    updated_at    = Column(DateTime,    nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class BusinessSubdomain(Base):
    """Subdivision of a Business Domain — e.g. 'Calculation Rules' inside 'Cisco LCI'."""
    __tablename__ = "business_subdomains"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    domain_id       = Column(Integer, ForeignKey("business_domains.id", ondelete="CASCADE"), nullable=False, index=True)
    subdomain_code  = Column(String(50),  nullable=False)
    subdomain_name  = Column(String(200), nullable=False)
    description     = Column(Text,        nullable=True)
    subdomain_type  = Column(String(30),  nullable=True)
    owner           = Column(String(200), nullable=True)
    business_rules  = Column(Text,        nullable=True)
    display_order   = Column(Integer,     nullable=False, default=0)
    is_active       = Column(Boolean,     nullable=False, default=True)
    created_at      = Column(DateTime,    nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime,    nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("domain_id", "subdomain_code", name="uq_subdomain_code"),
    )


class RequirementDomainLink(Base):
    """Links a requirement to a business domain (optionally to a specific subdomain)."""
    __tablename__ = "requirement_domain_links"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id  = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    domain_id       = Column(Integer, ForeignKey("business_domains.id", ondelete="CASCADE"), nullable=False, index=True)
    subdomain_id    = Column(Integer, ForeignKey("business_subdomains.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("requirement_id", "domain_id", name="uq_req_domain"),
    )
