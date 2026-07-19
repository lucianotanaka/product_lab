from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


@router.get("", tags=["Stats"])
def get_stats(db: Session = Depends(get_db)):
    """Retorna contagens reais de cada entidade do sistema."""
    def count(table: str) -> int:
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            return result.scalar() or 0
        except Exception:
            return 0

    return {
        "products":               count("products"),
        "decisions":              count("decisions"),
        "knowledge_items":        count("knowledge_articles"),
        "risks":                  count("risks"),
        "roadmap_items":          count("roadmap_items"),
        "prioritization_items":   count("prioritization_items"),
        "stakeholders":           count("stakeholders"),
        "vpc_items":              count("value_proposition_canvas"),
        "backlog_items":          count("backlog_items"),
        "product_impacts":        count("product_impacts"),
        "product_features":       count("product_features"),
        "users":                  count("users"),
    }
