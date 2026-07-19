import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy import Enum as SAE
from app.core.database import Base

class VPCType(str, Enum):
    job="job"; pain="pain"; gain="gain"; product="product"; pain_reliever="pain_reliever"; gain_creator="gain_creator"

class VPCItem(Base):
    __tablename__ = "vpc_items"
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    product_id=Column(String(36),nullable=False,index=True)
    type=Column(SAE(VPCType),nullable=False); content=Column(Text,nullable=False); priority=Column(Integer,default=3)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)
