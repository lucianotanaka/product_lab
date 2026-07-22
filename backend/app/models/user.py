from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from app.core.database import Base

class User(Base):
    """Espelha a tabela users existente no banco product_lab."""
    __tablename__ = "users"
    user_id                    = Column(Integer, primary_key=True, autoincrement=True)
    user_full_name             = Column(String(150), nullable=False)
    user_email                 = Column(String(255), nullable=False, unique=True, index=True)
    user_password              = Column(String(255), nullable=False)
    user_is_active             = Column(Boolean, nullable=False, default=True)
    user_reset_token           = Column(String(20), nullable=True, default=None)
    user_reset_token_expires_at = Column(DateTime, nullable=True, default=None)
    created_at                 = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at                 = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_role                  = Column(String(20), nullable=False, default="user")
    user_theme                 = Column(String(10), nullable=False, default="dark")
    user_language              = Column(String(10), nullable=False, default="en")
