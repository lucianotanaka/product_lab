from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from sqlalchemy.orm import Session
from app.core.database import Base

M = TypeVar("M", bound=Base)

class BaseRepository(Generic[M]):
    def __init__(self, model: Type[M], db: Session):
        self.model = model; self.db = db

    def get(self, id: str) -> Optional[M]:
        return self.db.get(self.model, id)

    def get_or_404(self, id: str) -> M:
        from fastapi import HTTPException
        obj = self.get(id)
        if not obj: raise HTTPException(404, f"{self.model.__name__} not found")
        return obj

    def list(self, skip: int=0, limit: int=20, **filters) -> tuple[int, List[M]]:
        q = self.db.query(self.model)
        for k, v in filters.items():
            if v is not None: q = q.filter(getattr(self.model, k) == v)
        total = q.count()
        return total, q.order_by(self.model.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, data: Dict[str, Any]) -> M:
        obj = self.model(**data); self.db.add(obj); self.db.commit(); self.db.refresh(obj); return obj

    def update(self, obj: M, data: Dict[str, Any]) -> M:
        for k, v in data.items():
            if v is not None: setattr(obj, k, v)
        self.db.commit(); self.db.refresh(obj); return obj

    def delete(self, obj: M) -> None:
        self.db.delete(obj); self.db.commit()
