from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.prioritization import PrioritizationItem, PriorityMethod, MoscowValue
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class PrioritizationCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    priority_method:PriorityMethod=PriorityMethod.RICE
    reach:float=0.0; impact:float=0.0; confidence:float=0.0; effort:float=1.0
    moscow_value:Optional[MoscowValue]=None
class PrioritizationUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None; priority_method:Optional[PriorityMethod]=None
    reach:Optional[float]=None; impact:Optional[float]=None; confidence:Optional[float]=None
    effort:Optional[float]=None; moscow_value:Optional[MoscowValue]=None
class PrioritizationOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    priority_method:PriorityMethod; reach:float; impact:float; confidence:float; effort:float
    rice_score:float; moscow_value:Optional[MoscowValue]=None; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(PrioritizationItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id)
    return {"total":total,"page":page,"size":size,"items":[PrioritizationOut.model_validate(i) for i in items]}
@router.post("",response_model=PrioritizationOut,status_code=status.HTTP_201_CREATED)
def create_item(body:PrioritizationCreate,db:Session=Depends(get_db)):
    data=body.model_dump()
    if data["priority_method"]=="RICE" and data["effort"]>0:
        data["rice_score"]=data["reach"]*data["impact"]*data["confidence"]/data["effort"]
    return BaseRepository(PrioritizationItem,db).create(data)
@router.get("/{id}",response_model=PrioritizationOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(PrioritizationItem,db).get_or_404(id)
@router.patch("/{id}",response_model=PrioritizationOut)
def update_item(id:str,body:PrioritizationUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(PrioritizationItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(PrioritizationItem,db); repo.delete(repo.get_or_404(id))
