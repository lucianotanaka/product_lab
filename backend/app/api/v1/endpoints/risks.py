from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.risk import Risk, RiskStatus
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class RiskCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    probability:int=Field(default=1,ge=1,le=5); impact:int=Field(default=1,ge=1,le=5)
    status:RiskStatus=RiskStatus.identified; mitigation_plan:Optional[str]=None
class RiskUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None
    probability:Optional[int]=None; impact:Optional[int]=None
    status:Optional[RiskStatus]=None; mitigation_plan:Optional[str]=None
class RiskOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    probability:int; impact:int; risk_score:int; status:RiskStatus
    mitigation_plan:Optional[str]=None; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_risks(page:int=1,size:int=20,product_id:Optional[str]=None,status:Optional[RiskStatus]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(Risk,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,status=status)
    return {"total":total,"page":page,"size":size,"items":[RiskOut.model_validate(i) for i in items]}
@router.post("",response_model=RiskOut,status_code=status.HTTP_201_CREATED)
def create_risk(body:RiskCreate,db:Session=Depends(get_db)):
    data=body.model_dump(); data["risk_score"]=data["probability"]*data["impact"]
    return BaseRepository(Risk,db).create(data)
@router.get("/{id}",response_model=RiskOut)
def get_risk(id:str,db:Session=Depends(get_db)): return BaseRepository(Risk,db).get_or_404(id)
@router.patch("/{id}",response_model=RiskOut)
def update_risk(id:str,body:RiskUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(Risk,db); obj=repo.get_or_404(id); data=body.model_dump(exclude_unset=True)
    if "probability" in data or "impact" in data:
        p=data.get("probability",obj.probability); i=data.get("impact",obj.impact); data["risk_score"]=p*i
    return repo.update(obj,data)
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_risk(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(Risk,db); repo.delete(repo.get_or_404(id))
