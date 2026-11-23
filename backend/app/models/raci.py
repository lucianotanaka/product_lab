from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, UniqueConstraint, Index
from app.core.database import Base


class RaciAssignment(Base):
    __tablename__ = "raci_assignments"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    product_id      = Column(Integer, nullable=True, index=True)
    object_type     = Column(String(30), nullable=False)   # REQUIREMENT|BACKLOG|DECISION|RISK|ROADMAP|PROCESS|DISCOVERY|MEETING
    object_id       = Column(Integer, nullable=False)
    stakeholder_id  = Column(Integer, ForeignKey("stakeholders.stakeholder_id", ondelete="CASCADE"), nullable=False, index=True)
    role            = Column(String(1), nullable=False)    # R|A|C|I
    notes               = Column(Text, nullable=True)
    # ── Approval evidence (role A only) ──────────────────────────────────────
    approved_at         = Column(DateTime, nullable=True)
    approval_method     = Column(String(50), nullable=True)
    approval_evidence   = Column(Text, nullable=True)
    approved_by         = Column(String(150), nullable=True)
    # ── Soft delete ───────────────────────────────────────────────────────────
    is_active           = Column(Boolean, nullable=False, default=True)
    removed_at          = Column(DateTime, nullable=True)
    removed_by          = Column(String(150), nullable=True)
    remove_reason       = Column(Text, nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("object_type", "object_id", "stakeholder_id", "role", name="uq_raci_assignment"),
        Index("idx_raci_object", "object_type", "object_id"),
        Index("idx_raci_active", "object_type", "object_id", "is_active"),
    )


class RaciAssignmentHistory(Base):
    """Immutable audit log — one row per action on a RACI assignment."""
    __tablename__ = "raci_assignment_history"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id    = Column(Integer, nullable=False, index=True)
    product_id       = Column(Integer, nullable=True)
    object_type      = Column(String(30), nullable=False)
    object_id        = Column(Integer, nullable=False)
    stakeholder_id   = Column(Integer, nullable=False)
    stakeholder_name = Column(String(150), nullable=True)   # desnormalizado
    role             = Column(String(1), nullable=False)
    action           = Column(String(20), nullable=False)   # ADD|REMOVE|APPROVE|REVOKE_APPROVAL|UPDATE_NOTES
    action_by        = Column(String(150), nullable=True)
    action_at        = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes            = Column(Text, nullable=True)
    # approval snapshot
    approved_at      = Column(DateTime, nullable=True)
    approval_method  = Column(String(50), nullable=True)
    approval_evidence = Column(Text, nullable=True)
    approved_by      = Column(String(150), nullable=True)
