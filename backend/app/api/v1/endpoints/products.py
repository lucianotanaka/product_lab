from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
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


@router.get("/{id}/dashboard")
def get_product_dashboard(id: int, db: Session = Depends(get_db)):
    """Cockpit data for a specific product — metrics + attention items."""
    product = BaseRepository(Product, db).get_or_404(id)
    pid_int = id
    pid_str = str(id)

    def scalar(sql: str, **params) -> int:
        try:
            return db.execute(text(sql), params).scalar() or 0
        except Exception:
            return 0

    def rows(sql: str, **params) -> list:
        try:
            result = db.execute(text(sql), params)
            return [dict(r._mapping) for r in result]
        except Exception:
            return []

    # ── metrics ──────────────────────────────────────────────────────────────
    open_risks   = scalar("SELECT COUNT(*) FROM risks WHERE product_id = :p AND status NOT IN ('closed','mitigated','accepted')", p=pid_str)
    high_risks   = scalar("SELECT COUNT(*) FROM risks WHERE product_id = :p AND risk_score >= 15 AND status NOT IN ('closed','mitigated','accepted')", p=pid_str)
    backlog_open = scalar("SELECT COUNT(*) FROM backlog_items WHERE product_id = :p AND current_status NOT IN ('done','closed','cancelled')", p=pid_int)
    backlog_total= scalar("SELECT COUNT(*) FROM backlog_items WHERE product_id = :p", p=pid_int)
    decisions_recent = scalar(
        "SELECT COUNT(*) FROM decisions WHERE product_id = :p AND created_at >= :since",
        p=pid_str, since=(datetime.utcnow() - timedelta(days=30))
    )
    stakeholders_total = scalar("SELECT COUNT(*) FROM stakeholders WHERE product_id = :p", p=pid_int)
    roadmap_upcoming   = scalar(
        "SELECT COUNT(*) FROM roadmap_items WHERE product_id = :p AND end_date >= NOW() AND end_date <= NOW() + INTERVAL '30 days'",
        p=pid_str
    )
    publications_review = scalar(
        """SELECT COUNT(*) FROM publications pub
           JOIN communications c ON c.communication_id = pub.communication_id
           WHERE c.product_id = :p AND pub.status = 'IN_REVIEW'""",
        p=pid_int
    )

    # ── attention items ───────────────────────────────────────────────────────
    attention = []

    for r in rows(
        "SELECT title, risk_score, status FROM risks WHERE product_id = :p AND risk_score >= 15 AND status NOT IN ('closed','mitigated','accepted') ORDER BY risk_score DESC LIMIT 3",
        p=pid_str
    ):
        attention.append({"type": "RISK", "severity": "HIGH", "title": r["title"], "detail": f"Score {r['risk_score']}", "link": "/modules/risks"})

    for r in rows(
        "SELECT title, priority, current_status FROM backlog_items WHERE product_id = :p AND priority = 1 AND current_status NOT IN ('done','closed','cancelled') ORDER BY created_at DESC LIMIT 3",
        p=pid_int
    ):
        attention.append({"type": "BACKLOG", "severity": "HIGH", "title": r["title"], "detail": "Prioridade máxima", "link": "/modules/backlog"})

    for r in rows(
        """SELECT pub.title, pub.reference_label FROM publications pub
           JOIN communications c ON c.communication_id = pub.communication_id
           WHERE c.product_id = :p AND pub.status = 'IN_REVIEW'
           ORDER BY pub.created_at DESC LIMIT 2""",
        p=pid_int
    ):
        label = r.get("reference_label") or r["title"]
        attention.append({"type": "PUBLICATION", "severity": "MEDIUM", "title": r["title"], "detail": f"Aguardando aprovação · {label}", "link": "/modules/communication"})

    for r in rows(
        "SELECT title, status FROM decisions WHERE product_id = :p AND status = 'proposed' ORDER BY created_at DESC LIMIT 2",
        p=pid_str
    ):
        attention.append({"type": "DECISION", "severity": "MEDIUM", "title": r["title"], "detail": "Decisão pendente de revisão", "link": "/modules/decisions"})

    return {
        "product": ProductOut.model_validate(product),
        "metrics": {
            "open_risks":          open_risks,
            "high_risks":          high_risks,
            "backlog_open":        backlog_open,
            "backlog_total":       backlog_total,
            "decisions_recent":    decisions_recent,
            "stakeholders":        stakeholders_total,
            "roadmap_upcoming":    roadmap_upcoming,
            "publications_review": publications_review,
        },
        "attention": attention[:8],  # max 8 items
    }
