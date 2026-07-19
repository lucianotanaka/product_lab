from datetime import datetime
from enum import Enum
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.dialects.postgresql import ARRAY
from app.core.database import Base


class ProductStatus(str, Enum):
    active   = "active"
    draft    = "draft"
    archived = "archived"


class Product(Base):
    __tablename__ = "products"
    product_id  = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(150), nullable=False, index=True)
    description = Column(Text)
    is_active      = Column(Boolean, default=True)
    status         = Column(SAE(ProductStatus), default=ProductStatus.active, nullable=False)
    owner_user_id  = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    tags           = Column(ARRAY(String))
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
