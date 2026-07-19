#!/usr/bin/env python3
"""
Product Lab — Backend Setup Script
Run on the server as the backend owner:
  python /opt/product_lab/frontend/setup_backend.py

This creates the complete FastAPI REST API structure under /opt/product_lab/backend/
"""
import os, textwrap

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/backend"

FILES = {}

# ══════════════════════════════════════════════════════════════════════════════
# app/core/config.py
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/core/__init__.py"] = ""

FILES["app/core/config.py"] = '''
import os
from functools import lru_cache
from typing import List

class Settings:
    APP_ENV: str          = os.getenv("APP_ENV", "development")
    DEBUG: bool           = os.getenv("DEBUG", "true").lower() == "true"
    SECRET_KEY: str       = os.getenv("SECRET_KEY", "product-lab-secret-key")
    API_V1_PREFIX: str    = "/api/v1"
    PROJECT_NAME: str     = "Product Lab API"
    VERSION: str          = "1.0.0"
    DATABASE_URL: str     = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/product_lab")
    DATABASE_URL_SYNC: str= os.getenv("DATABASE_URL_SYNC", "postgresql://postgres:postgres@localhost:5432/product_lab")
    DB_POOL_SIZE: int     = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int  = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS","http://localhost:5173,http://localhost:3000").split(",")

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# app/core/database.py
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/core/database.py"] = '''
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# app/models/__init__.py + all models
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/models/__init__.py"] = '''
from .user import User
from .product import Product
from .decision import Decision
from .knowledge import KnowledgeItem
from .prioritization import PrioritizationItem
from .risk import Risk
from .roadmap import RoadmapItem
from .stakeholder import Stakeholder
from .vpc import VPCItem

__all__ = ["User","Product","Decision","KnowledgeItem","PrioritizationItem","Risk","RoadmapItem","Stakeholder","VPCItem"]
'''.strip()

FILES["app/models/user.py"] = '''
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from app.core.database import Base

class User(Base):
    """Espelha a tabela users existente no banco product_lab."""
    __tablename__ = "users"
    user_id        = Column(Integer, primary_key=True, autoincrement=True)
    user_full_name = Column(String(150), nullable=False)
    user_email     = Column(String(255), nullable=False, unique=True, index=True)
    user_password  = Column(String(255), nullable=False)
    user_is_active = Column(Boolean, nullable=False, default=True)
    created_at     = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at     = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
'''.strip()

FILES["app/models/product.py"] = '''
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductStatus(str, Enum):
    active   = "active"
    draft    = "draft"
    archived = "archived"

class Product(Base):
    __tablename__ = "products"
    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name        = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    status      = Column(SAE(ProductStatus), default=ProductStatus.active, nullable=False)
    owner       = Column(String(255))
    tags        = Column(ARRAY(String), default=list)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    decisions        = relationship("Decision", back_populates="product", cascade="all, delete-orphan")
    knowledge_items  = relationship("KnowledgeItem", back_populates="product", cascade="all, delete-orphan")
    prio_items       = relationship("PrioritizationItem", back_populates="product", cascade="all, delete-orphan")
    risks            = relationship("Risk", back_populates="product", cascade="all, delete-orphan")
    roadmap_items    = relationship("RoadmapItem", back_populates="product", cascade="all, delete-orphan")
    stakeholders     = relationship("Stakeholder", back_populates="product", cascade="all, delete-orphan")
    vpc_items        = relationship("VPCItem", back_populates="product", cascade="all, delete-orphan")
'''.strip()

FILES["app/models/decision.py"] = '''
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base

class DecisionStatus(str, Enum):
    proposed   = "proposed"
    accepted   = "accepted"
    deprecated = "deprecated"
    superseded = "superseded"

class Decision(Base):
    __tablename__ = "decisions"
    id           = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id   = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title        = Column(String(500), nullable=False)
    context      = Column(Text)
    decision     = Column(Text)
    consequences = Column(Text)
    status       = Column(SAE(DecisionStatus), default=DecisionStatus.proposed)
    tags         = Column(ARRAY(String), default=list)
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    product      = relationship("Product", back_populates="decisions")
'''.strip()

FILES["app/models/knowledge.py"] = '''
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base

class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"
    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title      = Column(String(500), nullable=False)
    content    = Column(Text)
    category   = Column(String(255))
    tags       = Column(ARRAY(String), default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    product    = relationship("Product", back_populates="knowledge_items")
'''.strip()

FILES["app/models/prioritization.py"] = '''
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.orm import relationship
from app.core.database import Base

class PriorityMethod(str, Enum):
    RICE   = "RICE"
    ICE    = "ICE"
    MOSCOW = "MOSCOW"

class MoscowValue(str, Enum):
    must   = "must"
    should = "should"
    could  = "could"
    wont   = "wont"

class PrioritizationItem(Base):
    __tablename__ = "prioritization_items"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id      = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title           = Column(String(500), nullable=False)
    description     = Column(Text)
    priority_method = Column(SAE(PriorityMethod), default=PriorityMethod.RICE)
    reach           = Column(Float, default=0.0)
    impact          = Column(Float, default=0.0)
    confidence      = Column(Float, default=0.0)
    effort          = Column(Float, default=1.0)
    rice_score      = Column(Float, default=0.0)
    moscow_value    = Column(SAE(MoscowValue), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    product         = relationship("Product", back_populates="prio_items")
'''.strip()

FILES["app/models/risk.py"] = '''
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.orm import relationship
from app.core.database import Base

class RiskStatus(str, Enum):
    identified = "identified"
    mitigated  = "mitigated"
    accepted   = "accepted"
    closed     = "closed"

class Risk(Base):
    __tablename__ = "risks"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id      = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title           = Column(String(500), nullable=False)
    description     = Column(Text)
    probability     = Column(Integer, default=1)
    impact          = Column(Integer, default=1)
    risk_score      = Column(Integer, default=1)
    status          = Column(SAE(RiskStatus), default=RiskStatus.identified)
    mitigation_plan = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    product         = relationship("Product", back_populates="risks")
'''.strip()

FILES["app/models/roadmap.py"] = '''
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.orm import relationship
from app.core.database import Base

class RoadmapItemType(str, Enum):
    epic="epic"; feature="feature"; milestone="milestone"

class RoadmapItemStatus(str, Enum):
    planned="planned"; in_progress="in_progress"; done="done"; cancelled="cancelled"

class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    product_id=Column(String(36),ForeignKey("products.id",ondelete="CASCADE"),nullable=False,index=True)
    title=Column(String(500),nullable=False); description=Column(Text)
    type=Column(SAE(RoadmapItemType),default=RoadmapItemType.feature)
    status=Column(SAE(RoadmapItemStatus),default=RoadmapItemStatus.planned)
    start_date=Column(DateTime,nullable=True); end_date=Column(DateTime,nullable=True); quarter=Column(String(20))
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)
    product=relationship("Product",back_populates="roadmap_items")
'''.strip()

FILES["app/models/stakeholder.py"] = '''
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Stakeholder(Base):
    __tablename__ = "stakeholders"
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    product_id=Column(String(36),ForeignKey("products.id",ondelete="CASCADE"),nullable=False,index=True)
    name=Column(String(255),nullable=False); role=Column(String(255))
    influence=Column(Integer,default=3); interest=Column(Integer,default=3)
    email=Column(String(255)); notes=Column(Text)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)
    product=relationship("Product",back_populates="stakeholders")
'''.strip()

FILES["app/models/vpc.py"] = '''
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.orm import relationship
from app.core.database import Base

class VPCType(str, Enum):
    job="job"; pain="pain"; gain="gain"; product="product"; pain_reliever="pain_reliever"; gain_creator="gain_creator"

class VPCItem(Base):
    __tablename__ = "vpc_items"
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    product_id=Column(String(36),ForeignKey("products.id",ondelete="CASCADE"),nullable=False,index=True)
    type=Column(SAE(VPCType),nullable=False); content=Column(Text,nullable=False); priority=Column(Integer,default=3)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
    updated_at=Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)
    product=relationship("Product",back_populates="vpc_items")
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# app/schemas/ — Pydantic v2 schemas
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/schemas/__init__.py"] = ""

FILES["app/schemas/product.py"] = '''
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.product import ProductStatus

class ProductCreate(BaseModel):
    name: str; description: Optional[str]=None; status: ProductStatus=ProductStatus.active
    owner: Optional[str]=None; tags: List[str]=[]

class ProductUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    status: Optional[ProductStatus]=None; owner: Optional[str]=None; tags: Optional[List[str]]=None

class ProductOut(BaseModel):
    id:str; name:str; description:Optional[str]=None; status:ProductStatus
    owner:Optional[str]=None; tags:List[str]=[]; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True
'''.strip()

FILES["app/schemas/decision.py"] = '''
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.decision import DecisionStatus

class DecisionCreate(BaseModel):
    product_id:str; title:str; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:DecisionStatus=DecisionStatus.proposed; tags:List[str]=[]

class DecisionUpdate(BaseModel):
    title:Optional[str]=None; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:Optional[DecisionStatus]=None; tags:Optional[List[str]]=None

class DecisionOut(BaseModel):
    id:str; product_id:str; title:str; context:Optional[str]=None; decision:Optional[str]=None
    consequences:Optional[str]=None; status:DecisionStatus; tags:List[str]=[]; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True
'''.strip()

FILES["app/schemas/common.py"] = '''
from typing import Any, Generic, List, TypeVar
from pydantic import BaseModel
T = TypeVar("T")

class Paginated(BaseModel):
    total: int; page: int; size: int; items: List[Any]
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# app/repositories/base.py
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/repositories/__init__.py"] = ""
FILES["app/repositories/base.py"] = '''
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
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# app/api/v1/ — Routes for all domains
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/api/__init__.py"] = ""
FILES["app/api/v1/__init__.py"] = ""

FILES["app/core/security.py"] = '''
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User

SECRET_KEY  = os.getenv("SECRET_KEY", "product-lab-secret-key-2026")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise cred_exc
    except JWTError:
        raise cred_exc
    user = db.query(User).filter(User.user_email == email).first()
    if not user or not user.user_is_active:
        raise cred_exc
    return user
'''.strip()

FILES["app/api/v1/endpoints/auth.py"] = '''
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import (hash_password, verify_password, create_access_token,
                                get_current_user, SECRET_KEY, ALGORITHM)
from app.models.user import User

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    user_full_name: str
    user_email: str
    password: str

class UserOut(BaseModel):
    user_id: int
    user_full_name: str
    user_email: str
    user_is_active: bool
    created_at: datetime
    class Config: from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# ── Endpoints ─────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="Cadastrar novo usuário")
def register(body: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.user_email == body.user_email).first():
        raise HTTPException(400, "E-mail já cadastrado")
    user = User(
        user_full_name=body.user_full_name,
        user_email=body.user_email,
        user_password=hash_password(body.password),
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut, summary="Login — retorna JWT Bearer token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_email == form.username).first()
    if not user or not verify_password(form.password, user.user_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="E-mail ou senha incorretos",
                            headers={"WWW-Authenticate": "Bearer"})
    if not user.user_is_active:
        raise HTTPException(400, "Conta inativa")
    token = create_access_token({"sub": user.user_email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut, summary="Retorna o usuário autenticado")
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me/password", summary="Alterar senha do usuário autenticado")
def change_password(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    old_pw = body.get("old_password", "")
    new_pw = body.get("new_password", "")
    if not verify_password(old_pw, current_user.user_password):
        raise HTTPException(400, "Senha atual incorreta")
    if len(new_pw) < 8:
        raise HTTPException(400, "Nova senha deve ter ao menos 8 caracteres")
    current_user.user_password = hash_password(new_pw)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Senha alterada com sucesso"}

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

@router.post("/forgot-password", summary="Solicitar token de reset de senha")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_email == body.email).first()
    # Always return success to avoid user enumeration
    if not user or not user.user_is_active:
        return {"message": "Se o e-mail estiver cadastrado, o token será retornado abaixo.",
                "reset_token": None}
    # Generate a short-lived JWT as reset token (30 minutes)
    token = create_access_token({"sub": user.user_email, "type": "reset"}, timedelta(minutes=30))
    return {
        "message": "Token gerado. Entregue ao usuário pelo canal seguro.",
        "reset_token": token,
        "expires_in": "30 minutos",
        "user_email": user.user_email,
    }

@router.post("/reset-password", summary="Redefinir senha com token")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    from jose import JWTError, jwt as _jwt
    cred_exc = HTTPException(400, "Token inválido ou expirado")
    try:
        payload = _jwt.decode(body.reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            raise cred_exc
        email: str = payload.get("sub", "")
    except JWTError:
        raise cred_exc
    user = db.query(User).filter(User.user_email == email).first()
    if not user or not user.user_is_active:
        raise HTTPException(404, "Usuário não encontrado")
    if len(body.new_password) < 8:
        raise HTTPException(400, "Nova senha deve ter ao menos 8 caracteres")
    user.user_password = hash_password(body.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Senha redefinida com sucesso para {email}"}
'''.strip()

FILES["app/api/v1/router.py"] = '''
from fastapi import APIRouter
from .endpoints import auth, products, decisions, knowledge, prioritization, risks, roadmap, stakeholders, vpc

router = APIRouter()
router.include_router(auth.router,            prefix="/auth",            tags=["Auth"])
router.include_router(products.router,        prefix="/products",        tags=["Products"])
router.include_router(decisions.router,       prefix="/decisions",       tags=["Decisions"])
router.include_router(knowledge.router,       prefix="/knowledge",       tags=["Knowledge"])
router.include_router(prioritization.router,  prefix="/prioritization",  tags=["Prioritization"])
router.include_router(risks.router,           prefix="/risks",           tags=["Risks"])
router.include_router(roadmap.router,         prefix="/roadmap",         tags=["Roadmap"])
router.include_router(stakeholders.router,    prefix="/stakeholders",    tags=["Stakeholders"])
router.include_router(vpc.router,             prefix="/vpc",             tags=["VPC"])
'''.strip()

FILES["app/api/v1/endpoints/__init__.py"] = ""

FILES["app/api/v1/endpoints/products.py"] = '''
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
def list_products(page:int=1, size:int=20, status:Optional[ProductStatus]=None, db:Session=Depends(get_db)):
    repo = BaseRepository(Product, db)
    total, items = repo.list(skip=(page-1)*size, limit=size, status=status)
    return {"total":total,"page":page,"size":size,"items":[ProductOut.model_validate(i) for i in items]}

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body:ProductCreate, db:Session=Depends(get_db)):
    return BaseRepository(Product, db).create(body.model_dump())

@router.get("/{id}", response_model=ProductOut)
def get_product(id:str, db:Session=Depends(get_db)):
    return BaseRepository(Product, db).get_or_404(id)

@router.patch("/{id}", response_model=ProductOut)
def update_product(id:str, body:ProductUpdate, db:Session=Depends(get_db)):
    repo = BaseRepository(Product, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(id:str, db:Session=Depends(get_db)):
    repo = BaseRepository(Product, db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/decisions.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.decision import Decision, DecisionStatus
from app.repositories.base import BaseRepository
from app.schemas.decision import DecisionCreate, DecisionOut, DecisionUpdate
from app.schemas.common import Paginated

router = APIRouter()

@router.get("", response_model=Paginated)
def list_decisions(page:int=1, size:int=20, product_id:Optional[str]=None, status:Optional[DecisionStatus]=None, db:Session=Depends(get_db)):
    repo = BaseRepository(Decision, db)
    total, items = repo.list(skip=(page-1)*size, limit=size, product_id=product_id, status=status)
    return {"total":total,"page":page,"size":size,"items":[DecisionOut.model_validate(i) for i in items]}

@router.post("", response_model=DecisionOut, status_code=status.HTTP_201_CREATED)
def create_decision(body:DecisionCreate, db:Session=Depends(get_db)):
    return BaseRepository(Decision, db).create(body.model_dump())

@router.get("/{id}", response_model=DecisionOut)
def get_decision(id:str, db:Session=Depends(get_db)):
    return BaseRepository(Decision, db).get_or_404(id)

@router.patch("/{id}", response_model=DecisionOut)
def update_decision(id:str, body:DecisionUpdate, db:Session=Depends(get_db)):
    repo = BaseRepository(Decision, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(id:str, db:Session=Depends(get_db)):
    repo = BaseRepository(Decision, db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/knowledge.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.knowledge import KnowledgeItem
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import datetime
from typing import List

class KnowledgeCreate(BaseModel):
    product_id:str; title:str; content:Optional[str]=None; category:Optional[str]=None; tags:List[str]=[]
class KnowledgeUpdate(BaseModel):
    title:Optional[str]=None; content:Optional[str]=None; category:Optional[str]=None; tags:Optional[List[str]]=None
class KnowledgeOut(BaseModel):
    id:str; product_id:str; title:str; content:Optional[str]=None; category:Optional[str]=None
    tags:List[str]=[]; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("", response_model=Paginated)
def list_items(page:int=1, size:int=20, product_id:Optional[str]=None, db:Session=Depends(get_db)):
    repo = BaseRepository(KnowledgeItem, db)
    total, items = repo.list(skip=(page-1)*size, limit=size, product_id=product_id)
    return {"total":total,"page":page,"size":size,"items":[KnowledgeOut.model_validate(i) for i in items]}
@router.post("",response_model=KnowledgeOut,status_code=status.HTTP_201_CREATED)
def create_item(body:KnowledgeCreate,db:Session=Depends(get_db)):
    return KnowledgeOut.model_validate(BaseRepository(KnowledgeItem,db).create(body.model_dump()))
@router.get("/{id}",response_model=KnowledgeOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(KnowledgeItem,db).get_or_404(id)
@router.patch("/{id}",response_model=KnowledgeOut)
def update_item(id:str,body:KnowledgeUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(KnowledgeItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(KnowledgeItem,db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/prioritization.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.prioritization import PrioritizationItem, PriorityMethod, MoscowValue
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class PrioritizationCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    priority_method:PriorityMethod=PriorityMethod.RICE
    reach:float=0.0; impact:float=0.0; confidence:float=0.0; effort:float=1.0
    moscow_value:Optional[MoscowValue]=None
class PrioritizationUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None; priority_method:Optional[PriorityMethod]=None
    reach:Optional[float]=None; impact:Optional[float]=None; confidence:Optional[float]=None
    effort:Optional[float]=None; moscow_value:Optional[MoscowValue]=None
class PrioritizationOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    priority_method:PriorityMethod; reach:float; impact:float; confidence:float; effort:float
    rice_score:float; moscow_value:Optional[MoscowValue]=None; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(PrioritizationItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id)
    return {"total":total,"page":page,"size":size,"items":[PrioritizationOut.model_validate(i) for i in items]}
@router.post("",response_model=PrioritizationOut,status_code=status.HTTP_201_CREATED)
def create_item(body:PrioritizationCreate,db:Session=Depends(get_db)):
    data=body.model_dump()
    if data["priority_method"]=="RICE" and data["effort"]>0:
        data["rice_score"]=data["reach"]*data["impact"]*data["confidence"]/data["effort"]
    return BaseRepository(PrioritizationItem,db).create(data)
@router.get("/{id}",response_model=PrioritizationOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(PrioritizationItem,db).get_or_404(id)
@router.patch("/{id}",response_model=PrioritizationOut)
def update_item(id:str,body:PrioritizationUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(PrioritizationItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(PrioritizationItem,db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/risks.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.risk import Risk, RiskStatus
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

class RiskCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    probability:int=Field(default=1,ge=1,le=5); impact:int=Field(default=1,ge=1,le=5)
    status:RiskStatus=RiskStatus.identified; mitigation_plan:Optional[str]=None
class RiskUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None
    probability:Optional[int]=None; impact:Optional[int]=None
    status:Optional[RiskStatus]=None; mitigation_plan:Optional[str]=None
class RiskOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    probability:int; impact:int; risk_score:int; status:RiskStatus
    mitigation_plan:Optional[str]=None; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_risks(page:int=1,size:int=20,product_id:Optional[str]=None,status:Optional[RiskStatus]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(Risk,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,status=status)
    return {"total":total,"page":page,"size":size,"items":[RiskOut.model_validate(i) for i in items]}
@router.post("",response_model=RiskOut,status_code=status.HTTP_201_CREATED)
def create_risk(body:RiskCreate,db:Session=Depends(get_db)):
    data=body.model_dump(); data["risk_score"]=data["probability"]*data["impact"]
    return BaseRepository(Risk,db).create(data)
@router.get("/{id}",response_model=RiskOut)
def get_risk(id:str,db:Session=Depends(get_db)): return BaseRepository(Risk,db).get_or_404(id)
@router.patch("/{id}",response_model=RiskOut)
def update_risk(id:str,body:RiskUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(Risk,db); obj=repo.get_or_404(id); data=body.model_dump(exclude_unset=True)
    if "probability" in data or "impact" in data:
        p=data.get("probability",obj.probability); i=data.get("impact",obj.impact); data["risk_score"]=p*i
    return repo.update(obj,data)
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_risk(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(Risk,db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/roadmap.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.roadmap import RoadmapItem, RoadmapItemType, RoadmapItemStatus
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import datetime
from typing import List

class RoadmapCreate(BaseModel):
    product_id:str; title:str; description:Optional[str]=None
    type:RoadmapItemType=RoadmapItemType.feature; status:RoadmapItemStatus=RoadmapItemStatus.planned
    start_date:Optional[datetime]=None; end_date:Optional[datetime]=None; quarter:Optional[str]=None
class RoadmapUpdate(BaseModel):
    title:Optional[str]=None; description:Optional[str]=None; type:Optional[RoadmapItemType]=None
    status:Optional[RoadmapItemStatus]=None; start_date:Optional[datetime]=None
    end_date:Optional[datetime]=None; quarter:Optional[str]=None
class RoadmapOut(BaseModel):
    id:str; product_id:str; title:str; description:Optional[str]=None
    type:RoadmapItemType; status:RoadmapItemStatus; start_date:Optional[datetime]=None
    end_date:Optional[datetime]=None; quarter:Optional[str]=None; created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,status:Optional[RoadmapItemStatus]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,status=status)
    return {"total":total,"page":page,"size":size,"items":[RoadmapOut.model_validate(i) for i in items]}
@router.post("",response_model=RoadmapOut,status_code=status.HTTP_201_CREATED)
def create_item(body:RoadmapCreate,db:Session=Depends(get_db)):
    return BaseRepository(RoadmapItem,db).create(body.model_dump())
@router.get("/{id}",response_model=RoadmapOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(RoadmapItem,db).get_or_404(id)
@router.patch("/{id}",response_model=RoadmapOut)
def update_item(id:str,body:RoadmapUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(RoadmapItem,db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/stakeholders.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.stakeholder import Stakeholder
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime

class StakeholderCreate(BaseModel):
    product_id:str; name:str; role:Optional[str]=None
    influence:int=Field(default=3,ge=1,le=5); interest:int=Field(default=3,ge=1,le=5)
    email:Optional[str]=None; notes:Optional[str]=None
class StakeholderUpdate(BaseModel):
    name:Optional[str]=None; role:Optional[str]=None; influence:Optional[int]=None
    interest:Optional[int]=None; email:Optional[str]=None; notes:Optional[str]=None
class StakeholderOut(BaseModel):
    id:str; product_id:str; name:str; role:Optional[str]=None
    influence:int; interest:int; email:Optional[str]=None; notes:Optional[str]=None
    created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_stakeholders(page:int=1,size:int=20,product_id:Optional[str]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(Stakeholder,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id)
    return {"total":total,"page":page,"size":size,"items":[StakeholderOut.model_validate(i) for i in items]}
@router.post("",response_model=StakeholderOut,status_code=status.HTTP_201_CREATED)
def create_stakeholder(body:StakeholderCreate,db:Session=Depends(get_db)):
    return BaseRepository(Stakeholder,db).create(body.model_dump())
@router.get("/{id}",response_model=StakeholderOut)
def get_stakeholder(id:str,db:Session=Depends(get_db)): return BaseRepository(Stakeholder,db).get_or_404(id)
@router.patch("/{id}",response_model=StakeholderOut)
def update_stakeholder(id:str,body:StakeholderUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(Stakeholder,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_stakeholder(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(Stakeholder,db); repo.delete(repo.get_or_404(id))
'''.strip()

FILES["app/api/v1/endpoints/vpc.py"] = '''
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.vpc import VPCItem, VPCType
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime

class VPCCreate(BaseModel):
    product_id:str; type:VPCType; content:str; priority:int=Field(default=3,ge=1,le=5)
class VPCUpdate(BaseModel):
    type:Optional[VPCType]=None; content:Optional[str]=None; priority:Optional[int]=None
class VPCOut(BaseModel):
    id:str; product_id:str; type:VPCType; content:str; priority:int
    created_at:datetime; updated_at:datetime
    class Config: from_attributes=True

router = APIRouter()

@router.get("",response_model=Paginated)
def list_items(page:int=1,size:int=20,product_id:Optional[str]=None,type:Optional[VPCType]=None,db:Session=Depends(get_db)):
    repo=BaseRepository(VPCItem,db)
    total,items=repo.list(skip=(page-1)*size,limit=size,product_id=product_id,type=type)
    return {"total":total,"page":page,"size":size,"items":[VPCOut.model_validate(i) for i in items]}
@router.post("",response_model=VPCOut,status_code=status.HTTP_201_CREATED)
def create_item(body:VPCCreate,db:Session=Depends(get_db)):
    return BaseRepository(VPCItem,db).create(body.model_dump())
@router.get("/{id}",response_model=VPCOut)
def get_item(id:str,db:Session=Depends(get_db)): return BaseRepository(VPCItem,db).get_or_404(id)
@router.patch("/{id}",response_model=VPCOut)
def update_item(id:str,body:VPCUpdate,db:Session=Depends(get_db)):
    repo=BaseRepository(VPCItem,db); return repo.update(repo.get_or_404(id),body.model_dump(exclude_unset=True))
@router.delete("/{id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id:str,db:Session=Depends(get_db)):
    repo=BaseRepository(VPCItem,db); repo.delete(repo.get_or_404(id))
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# app/main.py — Updated FastAPI entry point
# ══════════════════════════════════════════════════════════════════════════════
FILES["app/main.py"] = '''
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.v1.router import router as api_router
import app.models  # ensure all models are registered

def create_tables():
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Product Lab REST API — Knowledge · Decisions · Impact",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_tables()

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/api/v1/health", tags=["System"])
def health():
    from sqlalchemy.orm import Session
    db = next(get_db())
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {
        "application": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "env": settings.APP_ENV,
        "database": db_status,
    }
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# alembic.ini + alembic/env.py
# ══════════════════════════════════════════════════════════════════════════════
FILES["alembic.ini"] = '''
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql://postgres:postgres@localhost:5432/product_lab

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
'''.strip()

FILES["alembic/env.py"] = '''
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.database import Base
import app.models  # register all models

config = context.config
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/product_lab"))
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle":"named"})
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'''.strip()

FILES["alembic/script.py.mako"] = '''"""${message}
Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}

def upgrade() -> None:
    ${upgrades if upgrades else "pass"}

def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
'''.strip()

# ══════════════════════════════════════════════════════════════════════════════
# env.example + env_config.txt (credenciais do banco)
# ══════════════════════════════════════════════════════════════════════════════
ENV_CONTENT = """# ─────────────────────────────────────────────────────────────────────────────
# Product Lab — Variáveis de Ambiente
# Copie este arquivo para .env e preencha com suas credenciais reais
# ─────────────────────────────────────────────────────────────────────────────

# ── Banco de Dados PostgreSQL ─────────────────────────────────────────────────
# Formato: postgresql://usuario:senha@host:porta/nome_banco
DATABASE_URL=postgresql://postgres:SENHA_AQUI@localhost:5432/product_lab

# ── Aplicação ─────────────────────────────────────────────────────────────────
APP_ENV=production
DEBUG=false
SECRET_KEY=troque-por-uma-chave-secreta-aleatoria-de-64-chars

# ── CORS — origens permitidas (separadas por vírgula) ─────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://seu-dominio.com

# ── Pool de Conexões ──────────────────────────────────────────────────────────
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
""".strip()

# ══════════════════════════════════════════════════════════════════════════════
# EXECUTE: Write all files
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    created = 0
    errors = 0

    # Write all Python/config files
    for rel_path, content in FILES.items():
        abs_path = os.path.join(BASE, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        try:
            with open(abs_path, "w", encoding="utf-8") as f:
                f.write(content + "\n")
            print(f"  [OK] {rel_path}")
            created += 1
        except Exception as e:
            print(f"  [ERR] {rel_path}: {e}", file=sys.stderr)
            errors += 1

    # Write env.example (template de credenciais)
    env_example_path = os.path.join(BASE, "env.example")
    try:
        with open(env_example_path, "w", encoding="utf-8") as f:
            f.write(ENV_CONTENT + "\n")
        print(f"  [OK] env.example")
        created += 1
    except Exception as e:
        print(f"  [ERR] env.example: {e}", file=sys.stderr)
        errors += 1

    # Write .env only if it doesn't already exist (never overwrite real credentials)
    env_path = os.path.join(BASE, ".env")
    if not os.path.exists(env_path):
        try:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(ENV_CONTENT + "\n")
            print(f"  [OK] .env (criado com valores padrão — EDITE ANTES DE USAR!)")
            created += 1
        except Exception as e:
            print(f"  [ERR] .env: {e}", file=sys.stderr)
            errors += 1
    else:
        print(f"  [SKIP] .env já existe — não sobrescrito para preservar credenciais")

    print(f"\n{'='*60}")
    print(f"Concluído: {created} arquivos criados, {errors} erros.")
    print(f"{'='*60}")
    print("\n⚠️  IMPORTANTE: Edite /opt/product_lab/backend/.env com as")
    print("   credenciais reais do banco PostgreSQL antes de iniciar a API.\n")
    print("Próximos passos:")
    print("  1. cd /opt/product_lab/backend")
    print("  2. nano .env                          # preencher DATABASE_URL e SECRET_KEY")
    print("  3. pip install -r requirements.txt")
    print("  4. alembic revision --autogenerate -m 'initial schema'")
    print("  5. alembic upgrade head")
    print("  6. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("\nDocumentação da API: http://localhost:8000/api/docs")
