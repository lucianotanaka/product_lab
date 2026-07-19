from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.decision import Decision, DecisionStatus
from app.repositories.base import BaseRepository
from app.schemas.decision import DecisionCreate, DecisionOut, DecisionUpdate
from app.schemas.common import Paginated

router = APIRouter()

@router.get("", response_model=Paginated)
def list_decisions(page:int=1, size:int=20, product_id:Optional[str]=None, status:Optional[DecisionStatus]=None, db:Session=Depends(get_db)):
    repo = BaseRepository(Decision, db)
    total, items = repo.list(skip=(page-1)*size, limit=size, product_id=product_id, status=status)
    return {"total":total,"page":page,"size":size,"items":[DecisionOut.model_validate(i) for i in items]}

@router.post("", response_model=DecisionOut, status_code=status.HTTP_201_CREATED)
def create_decision(body:DecisionCreate, db:Session=Depends(get_db)):
    return BaseRepository(Decision, db).create(body.model_dump())

@router.get("/{id}", response_model=DecisionOut)
def get_decision(id:str, db:Session=Depends(get_db)):
    return BaseRepository(Decision, db).get_or_404(id)

@router.patch("/{id}", response_model=DecisionOut)
def update_decision(id:str, body:DecisionUpdate, db:Session=Depends(get_db)):
    repo = BaseRepository(Decision, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(id:str, db:Session=Depends(get_db)):
    repo = BaseRepository(Decision, db); repo.delete(repo.get_or_404(id))
