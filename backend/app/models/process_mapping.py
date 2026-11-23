from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey
from app.core.database import Base


class BusinessArea(Base):
    """Área de negócio — catálogo global com suporte a escopo por produto e hierarquia."""
    __tablename__ = "business_areas"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    product_id       = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=True, index=True)
    parent_area_id   = Column(Integer, ForeignKey("business_areas.id", ondelete="SET NULL"), nullable=True, index=True)
    level            = Column(Integer, nullable=False, default=0)  # 0=raiz, 1=sub-área, 2=time
    area_name        = Column(String(150), nullable=False)
    area_description = Column(String(400), nullable=True)
    area_color       = Column(String(30), nullable=True)    # ex: "#a8d8ea"
    area_type        = Column(String(50), nullable=False, default="OPERATIONAL")
    # STRATEGIC | OPERATIONAL | SUPPORT | TECHNOLOGY | COMMERCIAL
    display_order    = Column(Integer, nullable=False, default=0)
    is_active        = Column(Boolean, nullable=False, default=True)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Process(Base):
    __tablename__ = "processes"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    process_scope       = Column(String(20), nullable=False, default="PRODUCT")  # PRODUCT | GLOBAL
    product_id          = Column(Integer, nullable=True, index=True)
    business_area_id    = Column(Integer, ForeignKey("business_areas.id", ondelete="SET NULL"), nullable=True, index=True)
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
    is_macro            = Column(Boolean, nullable=False, default=False)
    is_deleted          = Column(Boolean, nullable=False, default=False)


class ProcessGroup(Base):
    __tablename__ = "process_groups"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    process_id      = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    group_name      = Column(String(200), nullable=False)     # ex: "MACRO-PHASE", "FLUXO DE HARDWARE (HW)"
    group_type      = Column(String(30), nullable=False, default="PHASE")  # PHASE | SUB_FLOW | CONTAINER
    parent_group_id = Column(Integer, ForeignKey("process_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    display_order   = Column(Integer, nullable=False, default=0)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProcessNode(Base):
    __tablename__ = "process_nodes"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    process_id       = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    node_type        = Column(String(30), nullable=False)     # START|ACTIVITY|DECISION|END|SUBPROCESS|SYSTEM|WAIT|HANDOFF
    node_title       = Column(String(200), nullable=False)
    node_description = Column(Text, nullable=True)
    node_subtitle    = Column(String(200), nullable=True)     # texto secundário abaixo do título
    node_icon        = Column(String(100), nullable=True)     # identificador do ícone visual
    role_name        = Column(String(150), nullable=True)
    business_area_id = Column(Integer, ForeignKey("business_areas.id", ondelete="SET NULL"), nullable=True, index=True)
    group_id         = Column(Integer, ForeignKey("process_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    child_process_id = Column(Integer, ForeignKey("processes.id", ondelete="SET NULL"), nullable=True, index=True)
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
    source_handle        = Column(String(20), nullable=True)
    target_handle        = Column(String(20), nullable=True)
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


class ProcessTool(Base):
    __tablename__ = "process_tools"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    process_id       = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name        = Column(String(150), nullable=False)
    tool_description = Column(String(300), nullable=True)
    tool_icon        = Column(String(100), nullable=True)
    display_order    = Column(Integer, nullable=False, default=0)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
