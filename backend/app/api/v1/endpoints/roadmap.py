from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.roadmap import RoadmapItem, RoadmapItemType, RoadmapItemStatus
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import datetime
from typing import List

class RoadmapCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    item_type_id:Optional[int]=None
    type:RoadmapItemType=RoadmapItemType.feature; status:RoadmapItemStatus=RoadmapItemStatus.planned
    start_date:Optional[datetime]=None; end_date:Optional[datetime]=None; quarter:Optional[str]=None
class RoadmapUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None
    item_type_id:Optional[int]=None; type:Optional[RoadmapItemType]=None
    status:Optional[RoadmapItemStatus]=None; start_date:Optional[datetime]=None
    end_date:Optional[datetime]=None; quarter:Optional[str]=None
class RoadmapOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    item_type_id:Optional[int]=None
    type:Optional[RoadmapItemType]=None; status:RoadmapItemStatus; start_date:Optional[datetime]=None
    end_date:Optional[datetime]=None; quarter:Optional[str]=None; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,status:Optional[RoadmapItemStatus]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,status=status)
    return {"total":total,"page":page,"size":size,"items":[RoadmapOut.model_validate(i) for i in items]}
@router.post("",response_model=RoadmapOut,status_code=status.HTTP_201_CREATED)
def create_item(body:RoadmapCreate,db:Session=Depends(get_db)):
    return BaseRepository(RoadmapItem,db).create(body.model_dump())
@router.get("/{id}",response_model=RoadmapOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(RoadmapItem,db).get_or_404(id)
@router.patch("/{id}",response_model=RoadmapOut)
def update_item(id:str,body:RoadmapUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db); repo.delete(repo.get_or_404(id))
