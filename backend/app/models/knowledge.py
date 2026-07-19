from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text
from app.core.database import Base


class KnowledgeArticle(Base):
    """Artigo da base de conhecimento (substitui knowledge_items)."""
    __tablename__ = "knowledge_articles"
    article_id  = Column(Integer, primary_key=True, autoincrement=True)
    product_id  = Column(Integer, nullable=True, index=True)
    title       = Column(String(200), nullable=False)
    category    = Column(String(50))
    content     = Column(Text)
    status      = Column(String(30), default="active")
    created_by  = Column(String(150))
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class KnowledgeReference(Base):
    """Referência cruzada de um artigo para qualquer entidade do sistema."""
    __tablename__ = "knowledge_references"
    reference_id     = Column(Integer, primary_key=True, autoincrement=True)
    article_id       = Column(Integer, nullable=False, index=True)
    reference_type   = Column(String(50), nullable=False)   # DECISION | RISK | VPC | STAKEHOLDER | FEATURE | PRODUCT | ...
    reference_id_ext = Column(Integer, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
