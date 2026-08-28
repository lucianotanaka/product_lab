from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey
from app.core.database import Base


class Process(Base):
    __tablename__ = "processes"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    product_id          = Column(Integer, nullable=True, index=True)
    business_area_id    = Column(Integer, nullable=True, index=True)
    process_name        = Column(String(200), nullable=False)
    process_description = Column(Text, nullable=True)
    process_version     = Column(String(30), nullable=False, default="1.0")
    process_type        = Column(String(20), nullable=False, default="AS_IS")    # AS_IS | TO_BE
    process_status      = Column(String(20), nullable=False, default="DRAFT")    # DRAFT | VALIDATED | APPROVED | ARCHIVED
    process_owner       = Column(String(150), nullable=True)
    process_trigger     = Column(Text, nullable=True)
    process_outcome     = Column(Text, nullable=True)
    created_by          = Column(Integer, nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_by          = Column(Integer, nullable=True)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted          = Column(Boolean, nullable=False, default=False)


class ProcessNode(Base):
    __tablename__ = "process_nodes"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    process_id       = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    node_type        = Column(String(30), nullable=False)     # START|ACTIVITY|DECISION|END|SUBPROCESS|SYSTEM|WAIT|HANDOFF
    node_title       = Column(String(200), nullable=False)
    node_description = Column(Text, nullable=True)
    role_name        = Column(String(150), nullable=True)
    business_area_id = Column(Integer, nullable=True)
    system_name      = Column(String(150), nullable=True)
    duration_minutes = Column(Numeric(12, 2), nullable=True)
    is_manual        = Column(Boolean, nullable=False, default=False)
    is_bottleneck    = Column(Boolean, nullable=False, default=False)
    x_position       = Column(Numeric(12, 2), nullable=False, default=0)
    y_position       = Column(Numeric(12, 2), nullable=False, default=0)
    width            = Column(Numeric(12, 2), nullable=True)
    height           = Column(Numeric(12, 2), nullable=True)
    display_order    = Column(Integer, nullable=True)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProcessEdge(Base):
    __tablename__ = "process_edges"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    process_id           = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    source_node_id       = Column(Integer, ForeignKey("process_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_node_id       = Column(Integer, ForeignKey("process_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    edge_label           = Column(String(150), nullable=True)
    edge_type            = Column(String(20), nullable=False, default="SEQUENCE")  # SEQUENCE|CONDITIONAL|DEFAULT|EXCEPTION
    condition_expression = Column(Text, nullable=True)
    sequence_order       = Column(Integer, nullable=True)
    created_at           = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at           = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProcessNodeRelation(Base):
    __tablename__ = "process_node_relations"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    node_id       = Column(Integer, ForeignKey("process_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type   = Column(String(30), nullable=False)  # REQUIREMENT|FEATURE|USER_STORY|RISK|INSIGHT|VPC_PAIN|VPC_GAIN|RESEARCH
    entity_id     = Column(Integer, nullable=False)
    relation_type = Column(String(50), nullable=True)
    notes         = Column(Text, nullable=True)
    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)
