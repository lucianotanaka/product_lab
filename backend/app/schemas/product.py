from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.product import ProductStatus


class ProductCreate(BaseModel):
    name:          str
    description:   Optional[str]          = None
    is_active:     bool                    = True
    status:        ProductStatus           = ProductStatus.active
    owner_user_id: Optional[int]           = None
    tags:          List[str]               = []


class ProductUpdate(BaseModel):
    name:          Optional[str]           = None
    description:   Optional[str]           = None
    is_active:     Optional[bool]          = None
    status:        Optional[ProductStatus] = None
    owner_user_id: Optional[int]           = None
    tags:          Optional[List[str]]     = None


class ProductOut(BaseModel):
    product_id:    int
    name:          str
    description:   Optional[str]          = None
    is_active:     bool                    = True
    status:        ProductStatus
    owner_user_id: Optional[int]           = None
    tags:          List[str]               = []
    created_at:    datetime
    updated_at:    datetime
    class Config: from_attributes = True
