from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey
from app.core.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    product_id              = Column(Integer, nullable=True, index=True)
    business_area_id        = Column(Integer, nullable=True, index=True)
    requirement_code        = Column(String(50), nullable=False)
    requirement_title       = Column(String(250), nullable=False)
    requirement_description = Column(Text, nullable=False)
    requirement_type        = Column(String(30), nullable=False, default="FUNCTIONAL")
    requirement_source      = Column(String(100), nullable=True)
    priority                = Column(String(20), nullable=False, default="MEDIUM")
    lifecycle_status        = Column(String(20), nullable=False, default="DRAFT")
    fulfillment_status      = Column(String(30), nullable=False, default="NOT_STARTED")
    acceptance_definition   = Column(Text, nullable=True)
    requirement_owner       = Column(String(150), nullable=True)
    created_by              = Column(Integer, nullable=True)
    created_at              = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by              = Column(Integer, nullable=True)
    updated_at              = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted              = Column(Boolean, nullable=False, default=False)


class RequirementFeature(Base):
    __tablename__ = "requirement_features"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id  = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_id      = Column(Integer, nullable=False)   # free reference – no FK constraint
    coverage_type   = Column(String(20), nullable=False, default="PRIMARY")
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)


class RequirementUserStory(Base):
    __tablename__ = "requirement_user_stories"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id      = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    user_story_id       = Column(Integer, nullable=False)   # free reference – no FK constraint
    coverage_percentage = Column(Numeric(5, 2), nullable=True)
    coverage_status     = Column(String(20), nullable=False, default="NOT_STARTED")
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)


class RequirementRelation(Base):
    __tablename__ = "requirement_relations"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id  = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type     = Column(String(30), nullable=False)   # RESEARCH|INSIGHT|PROCESS_NODE|VPC_PAIN|RISK|DECISION|RELEASE|METRIC
    entity_id       = Column(Integer, nullable=False)
    relation_type   = Column(String(50), nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)


class RequirementVerification(Base):
    __tablename__ = "requirement_verifications"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id      = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    verification_type   = Column(String(30), nullable=False)   # TEST|USER_ACCEPTANCE|DOCUMENT_REVIEW|METRIC|MANUAL_VALIDATION
    verification_result = Column(String(20), nullable=False, default="NOT_VERIFIED")
    verified_by         = Column(Integer, nullable=True)
    verified_at         = Column(DateTime, nullable=True)
    evidence            = Column(Text, nullable=True)
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
