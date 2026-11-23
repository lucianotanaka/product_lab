from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session
from app.core.database import Base

M = TypeVar("M", bound=Base)

# Tipo de chave primária: int para a maioria dos modelos, str para UUIDs (discovery)
PK = Union[int, str]


class BaseRepository(Generic[M]):
    def __init__(self, model: Type[M], db: Session):
        self.model = model
        self.db = db

    def get(self, id: PK) -> Optional[M]:
        return self.db.get(self.model, id)

    def get_or_404(self, id: PK) -> M:
        from fastapi import HTTPException

        obj = self.get(id)
        if not obj:
            raise HTTPException(404, f"{self.model.__name__} not found")
        return obj

    def list(self, skip: int = 0, limit: int = 20, **filters) -> tuple[int, List[M]]:
        q = self.db.query(self.model)
        for k, v in filters.items():
            if v is not None:
                q = q.filter(getattr(self.model, k) == v)
        total = q.count()
        # Ordena por created_at quando disponível; caso contrário sem ordenação adicional
        order_col = getattr(self.model, "created_at", None)
        if order_col is not None:
            q = q.order_by(order_col.desc())
        return total, q.offset(skip).limit(limit).all()

    def create(self, data: Dict[str, Any]) -> M:
        obj = self.model(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: M, data: Dict[str, Any]) -> M:
        """Aplica os campos de `data` no objeto.

        Campos explicitamente enviados como None SÃO aplicados (permite limpar
        valores opcionais como sprint_id, assigned_to, etc.).
        A chamada deve usar `model_dump(exclude_unset=True)` para garantir que
        apenas os campos enviados pelo cliente cheguem aqui.
        """
        for k, v in data.items():
            setattr(obj, k, v)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: M) -> None:
        self.db.delete(obj)
        self.db.commit()
