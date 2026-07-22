"""
Gestão de Usuários — exclusivo para administradores.
Permite criar, listar, editar, ativar/desativar e gerar reset de senha.
"""
from datetime import datetime, timedelta
import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, require_admin
from app.models.user import User

router = APIRouter()

_TOKEN_ALPHABET = (
    string.ascii_uppercase.replace("I", "").replace("O", "")
    + string.digits.replace("0", "").replace("1", "")
)
TOKEN_EXPIRY_MINUTES = 30


def _generate_reset_token(length: int = 8) -> str:
    return "".join(secrets.choice(_TOKEN_ALPHABET) for _ in range(length))


# ── Schemas ────────────────────────────────────────────────────────────────

class UserAdminOut(BaseModel):
    user_id: int
    user_full_name: str
    user_email: str
    user_is_active: bool
    user_role: str
    user_reset_token: Optional[str]
    user_reset_token_expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserCreateBody(BaseModel):
    user_full_name: str
    user_email: str
    password: str
    user_role: str = "user"


class UserUpdateBody(BaseModel):
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    user_is_active: Optional[bool] = None
    new_password: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[UserAdminOut],
    summary="Listar todos os usuários (admin)",
)
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post(
    "/",
    response_model=UserAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo usuário (admin)",
)
def create_user(
    body: UserCreateBody,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if db.query(User).filter(User.user_email == body.user_email).first():
        raise HTTPException(400, "E-mail já cadastrado")
    if body.user_role not in ("admin", "user"):
        raise HTTPException(400, "Role inválido. Use 'admin' ou 'user'")
    if len(body.password) < 8:
        raise HTTPException(400, "Senha deve ter ao menos 8 caracteres")

    user = User(
        user_full_name=body.user_full_name,
        user_email=body.user_email,
        user_password=hash_password(body.password),
        user_role=body.user_role,
        user_is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/{user_id}",
    response_model=UserAdminOut,
    summary="Buscar usuário por ID (admin)",
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    return user


@router.patch(
    "/{user_id}",
    response_model=UserAdminOut,
    summary="Editar usuário (admin)",
)
def update_user(
    user_id: int,
    body: UserUpdateBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")

    if body.user_full_name is not None:
        user.user_full_name = body.user_full_name

    if body.user_email is not None:
        conflict = db.query(User).filter(
            User.user_email == body.user_email,
            User.user_id != user_id,
        ).first()
        if conflict:
            raise HTTPException(400, "E-mail já está em uso por outro usuário")
        user.user_email = body.user_email

    if body.user_role is not None:
        if body.user_role not in ("admin", "user"):
            raise HTTPException(400, "Role inválido. Use 'admin' ou 'user'")
        # Impede que o admin remova seu próprio role de admin
        if user.user_id == admin.user_id and body.user_role != "admin":
            raise HTTPException(400, "Você não pode remover seu próprio role de administrador")
        user.user_role = body.user_role

    if body.user_is_active is not None:
        # Impede que o admin desative a si mesmo
        if user.user_id == admin.user_id and not body.user_is_active:
            raise HTTPException(400, "Você não pode desativar sua própria conta")
        user.user_is_active = body.user_is_active

    if body.new_password is not None:
        if len(body.new_password) < 8:
            raise HTTPException(400, "Nova senha deve ter ao menos 8 caracteres")
        user.user_password = hash_password(body.new_password)

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/{user_id}/reset-token",
    summary="Gerar token de reset de senha para um usuário (admin)",
)
def generate_reset_token(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")

    token = _generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

    user.user_reset_token = token
    user.user_reset_token_expires_at = expires_at
    user.updated_at = datetime.utcnow()
    db.commit()

    return {
        "user_id": user.user_id,
        "user_email": user.user_email,
        "reset_token": token,
        "expires_at": expires_at.isoformat(),
        "expires_in": f"{TOKEN_EXPIRY_MINUTES} minutos",
    }


@router.delete(
    "/{user_id}/reset-token",
    summary="Revogar token de reset de senha (admin)",
)
def revoke_reset_token(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")

    user.user_reset_token = None
    user.user_reset_token_expires_at = None
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Token revogado com sucesso"}
