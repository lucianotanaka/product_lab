from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.decision import DecisionStatus

class DecisionCreate(BaseModel):
    product_id:str; title:str; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:DecisionStatus=DecisionStatus.proposed; tags:List[str]=[]
    discovery_opportunity_id: Optional[str] = None
    business_case_id: Optional[str] = None
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None

class DecisionUpdate(BaseModel):
    title:Optional[str]=None; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:Optional[DecisionStatus]=None; tags:Optional[List[str]]=None
    discovery_opportunity_id: Optional[str] = None
    business_case_id: Optional[str] = None
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None

class DecisionOut(BaseModel):
    id:str; product_id:str; title:str; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:DecisionStatus; tags:List[str]=[]
    discovery_opportunity_id: Optional[str] = None
    business_case_id: Optional[str] = None
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None
    created_at:datetime; updated_at:datetime
    class Config: from_attributes=True
