from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.knowledge import KnowledgeArticle, KnowledgeReference
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import datetime

# ── Schemas ──────────────────────────────────────────────────────────────────

class ArticleCreate(BaseModel):
    product_id:  Optional[int]  = None
    title:       str
    category:    Optional[str]  = None
    content:     Optional[str]  = None
    status:      str             = "active"
    created_by:  Optional[str]  = None

class ArticleUpdate(BaseModel):
    title:       Optional[str]  = None
    category:    Optional[str]  = None
    content:     Optional[str]  = None
    status:      Optional[str]  = None
    created_by:  Optional[str]  = None

class ArticleOut(BaseModel):
    article_id:  int
    product_id:  Optional[int]  = None
    title:       str
    category:    Optional[str]  = None
    content:     Optional[str]  = None
    status:      str             = "active"
    created_by:  Optional[str]  = None
    created_at:  datetime
    updated_at:  datetime
    class Config: from_attributes = True

class ReferenceCreate(BaseModel):
    reference_type:   str   # DECISION | RISK | VPC | STAKEHOLDER | PRODUCT | FEATURE | ...
    reference_id_ext: int

class ReferenceOut(BaseModel):
    reference_id:     int
    article_id:       int
    reference_type:   str
    reference_id_ext: int
    created_at:       datetime
    class Config: from_attributes = True

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# ── Articles ──────────────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_articles(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    global_only: bool = False,        # ?global_only=true → product_id IS NULL
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(KnowledgeArticle)

    if global_only:
        q = q.filter(KnowledgeArticle.product_id == None)
    elif product_id is not None:
        q = q.filter(KnowledgeArticle.product_id == product_id)

    if status is not None:
        q = q.filter(KnowledgeArticle.status == status)

    total = q.count()
    items = q.order_by(KnowledgeArticle.created_at.desc())\
             .offset((page - 1) * size).limit(size).all()

    return {"total": total, "page": page, "size": size,
            "items": [ArticleOut.model_validate(i) for i in items]}


@router.post("", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
def create_article(body: ArticleCreate, db: Session = Depends(get_db)):
    return BaseRepository(KnowledgeArticle, db).create(body.model_dump())


@router.get("/{id}", response_model=ArticleOut)
def get_article(id: int, db: Session = Depends(get_db)):
    return BaseRepository(KnowledgeArticle, db).get_or_404(id)


@router.patch("/{id}", response_model=ArticleOut)
def update_article(id: int, body: ArticleUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(KnowledgeArticle, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(KnowledgeArticle, db)
    # cascade: remove references
    db.execute(text("DELETE FROM knowledge_references WHERE article_id = :aid"), {"aid": id})
    db.commit()
    repo.delete(repo.get_or_404(id))


# ── References ────────────────────────────────────────────────────────────────

@router.get("/{id}/references", response_model=List[ReferenceOut])
def list_references(id: int, db: Session = Depends(get_db)):
    rows = db.query(KnowledgeReference).filter(KnowledgeReference.article_id == id).all()
    return [ReferenceOut.model_validate(r) for r in rows]


@router.post("/{id}/references", response_model=ReferenceOut, status_code=status.HTTP_201_CREATED)
def add_reference(id: int, body: ReferenceCreate, db: Session = Depends(get_db)):
    # Ensure article exists
    BaseRepository(KnowledgeArticle, db).get_or_404(id)
    ref = KnowledgeReference(
        article_id=id,
        reference_type=body.reference_type.upper(),
        reference_id_ext=body.reference_id_ext,
    )
    db.add(ref); db.commit(); db.refresh(ref)
    return ReferenceOut.model_validate(ref)


@router.delete("/{id}/references/{ref_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_reference(id: int, ref_id: int, db: Session = Depends(get_db)):
    ref = db.query(KnowledgeReference).filter(
        KnowledgeReference.reference_id == ref_id,
        KnowledgeReference.article_id == id
    ).first()
    if ref:
        db.delete(ref); db.commit()
