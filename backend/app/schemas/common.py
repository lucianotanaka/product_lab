from typing import Any, Generic, List, TypeVar
from pydantic import BaseModel
T = TypeVar("T")

class Paginated(BaseModel):
    total: int; page: int; size: int; items: List[Any]
