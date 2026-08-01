import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAE
from app.core.database import Base


class VPCType(str, Enum):
    job           = "job"
    pain          = "pain"
    gain          = "gain"
    product       = "product"
    pain_reliever = "pain_reliever"
    gain_creator  = "gain_creator"


class VPCCanvas(Base):
    __tablename__ = "vpc_canvas"
    id                       = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id               = Column(String(36), nullable=False, index=True)
    name                     = Column(String(150), nullable=False, default="Canvas Principal")
    description              = Column(Text, nullable=True)
    discovery_opportunity_id = Column(String(36), nullable=True, index=True)  # FK → discovery_opportunities
    created_at               = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class VPCItem(Base):
    __tablename__ = "vpc_items"
    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), nullable=False, index=True)
    canvas_id  = Column(String(36), nullable=True, index=True)
    parent_id  = Column(String(36), nullable=True, index=True)   # pain/gain → job (1:1); deprecated for reliever/creator/product
    type       = Column(SAE(VPCType), nullable=False)
    name       = Column(String(150), nullable=True)              # short title / reference
    content    = Column(Text, nullable=False)                    # detailed description
    priority   = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class VPCItemLink(Base):
    """N:M links between VP items (pain_reliever→pain, gain_creator→gain, product→job)."""
    __tablename__ = "vpc_item_links"
    __table_args__ = (UniqueConstraint("source_id", "target_id", name="uq_vpc_item_links"),)

    id        = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canvas_id = Column(String(36), nullable=False, index=True)
    source_id = Column(String(36), nullable=False, index=True)  # pain_reliever | gain_creator | product
    target_id = Column(String(36), nullable=False, index=True)  # pain           | gain          | job
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
