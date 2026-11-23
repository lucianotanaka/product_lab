import bcrypt as _bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User

# SECRET_KEY lida exclusivamente de settings (sem fallback hardcoded)
ALGORITHM            = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 2  # 2 horas (logout por inatividade cobre o resto)
COOKIE_NAME          = "pl_token"

def hash_password(password: str) -> str:
    """Gera hash bcrypt diretamente (compatível com bcrypt >= 4.0)."""
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Verifica senha usando bcrypt direto (evita bug passlib + bcrypt >= 4.0)."""
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    db: Session = Depends(get_db),
    pl_token: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    """Lê o JWT do cookie httpOnly 'pl_token' — inacessível a JavaScript."""
    if not pl_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado — faça login",
        )
    try:
        payload = jwt.decode(pl_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    user = db.query(User).filter(User.user_email == email).first()
    if not user or not user.user_is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou não encontrado")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency que garante que o usuário autenticado tem role 'admin'."""
    if current_user.user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return current_user
