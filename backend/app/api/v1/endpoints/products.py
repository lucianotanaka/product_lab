from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.product import Product, ProductStatus
from app.repositories.base import BaseRepository
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.schemas.common import Paginated

router = APIRouter()


@router.get("", response_model=Paginated)
def list_products(page: int = 1, size: int = 20, status: Optional[ProductStatus] = None, db: Session = Depends(get_db)):
    repo = BaseRepository(Product, db)
    total, items = repo.list(skip=(page - 1) * size, limit=size, status=status)
    return {"total": total, "page": page, "size": size, "items": [ProductOut.model_validate(i) for i in items]}


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    return BaseRepository(Product, db).create(body.model_dump())


@router.get("/{id}", response_model=ProductOut)
def get_product(id: int, db: Session = Depends(get_db)):
    return BaseRepository(Product, db).get_or_404(id)


@router.patch("/{id}", response_model=ProductOut)
def update_product(id: int, body: ProductUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(Product, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(Product, db)
    repo.delete(repo.get_or_404(id))
