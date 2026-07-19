from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from app.core.database import Base


class Stakeholder(Base):
    __tablename__ = "stakeholders"
    stakeholder_id      = Column(Integer, primary_key=True, autoincrement=True)
    product_id          = Column(Integer, nullable=True, index=True)
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
    role                = Column(String(255))
    influence           = Column(Integer, default=3)
    interest            = Column(Integer, default=3)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
