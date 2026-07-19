import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy import Enum as SAE
from app.core.database import Base

class RoadmapItemType(str, Enum):
    epic="epic"; feature="feature"; milestone="milestone"

class RoadmapItemStatus(str, Enum):
    planned="planned"; in_progress="in_progress"; done="done"; cancelled="cancelled"

class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    product_id=Column(String(36),nullable=False,index=True)
    title=Column(String(500),nullable=False); description=Column(Text)
    type=Column(SAE(RoadmapItemType),default=RoadmapItemType.feature)
    status=Column(SAE(RoadmapItemStatus),default=RoadmapItemStatus.planned)
    start_date=Column(DateTime,nullable=True); end_date=Column(DateTime,nullable=True); quarter=Column(String(20))
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)
