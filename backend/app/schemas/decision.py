from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.decision import DecisionStatus

class DecisionCreate(BaseModel):
    product_id:str; title:str; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:DecisionStatus=DecisionStatus.proposed; tags:List[str]=[]

class DecisionUpdate(BaseModel):
    title:Optional[str]=None; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:Optional[DecisionStatus]=None; tags:Optional[List[str]]=None

class DecisionOut(BaseModel):
    id:str; product_id:str; title:str; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:DecisionStatus; tags:List[str]=[]; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True
