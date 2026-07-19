from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.vpc import VPCItem, VPCType
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime

class VPCCreate(BaseModel):
    product_id:str; type:VPCType; content:str; priority:int=Field(default=3,ge=1,le=5)
class VPCUpdate(BaseModel):
    type:Optional[VPCType]=None; content:Optional[str]=None; priority:Optional[int]=None
class VPCOut(BaseModel):
    id:str; product_id:str; type:VPCType; content:str; priority:int
    created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,type:Optional[VPCType]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(VPCItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,type=type)
    return {"total":total,"page":page,"size":size,"items":[VPCOut.model_validate(i) for i in items]}
@router.post("",response_model=VPCOut,status_code=status.HTTP_201_CREATED)
def create_item(body:VPCCreate,db:Session=Depends(get_db)):
    return BaseRepository(VPCItem,db).create(body.model_dump())
@router.get("/{id}",response_model=VPCOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(VPCItem,db).get_or_404(id)
@router.patch("/{id}",response_model=VPCOut)
def update_item(id:str,body:VPCUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(VPCItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(VPCItem,db); repo.delete(repo.get_or_404(id))
