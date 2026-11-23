import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy import Enum as SAE
from app.core.database import Base

class RoadmapItemType(str, Enum):
    strategic_initiative = "strategic_initiative"
    business_initiative = "business_initiative"
    technical_initiative = "technical_initiative"
    enabling_initiative = "enabling_initiative"
    improvement_initiative = "improvement_initiative"
    compliance_initiative = "compliance_initiative"
    research_initiative = "research_initiative"
    operational_initiative = "operational_initiative"
    # legacy values stored in database
    feature = "feature"
    epic = "epic"
    user_story = "user_story"
    task = "task"

class RoadmapItemStatus(str, Enum):
    planned="planned"; in_progress="in_progress"; done="done"; cancelled="cancelled"

class RoadmapExecutiveStatus(str, Enum):
    not_started="not_started"; on_track="on_track"; attention="attention"; blocked="blocked"; waiting_owner="waiting_owner"; completed="completed"

class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    product_id=Column(String(36),nullable=False,index=True)
    title=Column(String(500),nullable=False); description=Column(Text)
    type=Column(SAE(RoadmapItemType),default=RoadmapItemType.strategic_initiative)
    item_type_id=Column(Integer,nullable=True)     # FK → backlog_item_types.item_type_id
    status=Column(SAE(RoadmapItemStatus),default=RoadmapItemStatus.planned)
    start_date=Column(DateTime,nullable=True); end_date=Column(DateTime,nullable=True); quarter=Column(String(20))
    executive_status=Column(SAE(RoadmapExecutiveStatus),default=RoadmapExecutiveStatus.not_started)
    executive_summary=Column(Text)
    executive_risk_dependency=Column(Text)
    executive_next_step=Column(Text)
    executive_owner_name=Column(String(150))
    committed_deadline=Column(DateTime,nullable=True)
    attention_flag=Column(Boolean,default=False,nullable=False)
    attention_reason=Column(Text)
    executive_updated_at=Column(DateTime,nullable=True)
    executive_updated_by=Column(String(150))
    owner_member_id=Column(Integer,nullable=True)
    sponsor_stakeholder_id=Column(Integer,nullable=True)
    primary_company_area_id=Column(Integer,nullable=True)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)

class RoadmapBacklogLink(Base):
    __tablename__ = "roadmap_backlog_links"
    id=Column(Integer,primary_key=True,autoincrement=True)
    roadmap_item_id=Column(String(36),nullable=False,index=True)
    backlog_item_id=Column(Integer,nullable=False,index=True)
    executive_status=Column(String(30),nullable=True)
    executive_summary=Column(Text)
    executive_risk_dependency=Column(Text)
    executive_next_step=Column(Text)
    executive_owner_name=Column(String(150))
    committed_deadline=Column(DateTime,nullable=True)
    attention_flag=Column(Boolean,default=False,nullable=False)
    attention_reason=Column(Text)
    executive_updated_at=Column(DateTime,nullable=True)
    executive_updated_by=Column(String(150))
    display_order=Column(Integer,nullable=True)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
