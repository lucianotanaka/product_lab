import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user, require_admin
from app.models.user import User

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────
_TOKEN_ALPHABET = (
    string.ascii_uppercase.replace("I", "").replace("O", "")
    + string.digits.replace("0", "").replace("1", "")
)  # remove caracteres ambíguos

def _generate_reset_token(length: int = 8) -> str:
    """Gera token curto e legível, sem caracteres ambíguos (ex: A3K7BZ2M)."""
    return "".join(secrets.choice(_TOKEN_ALPHABET) for _ in range(length))

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
    user_role: str
    user_theme: str = "dark"
    user_language: str = "en"
    module_order: Optional[List[str]] = None
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
    token = create_access_token({"sub": user.user_email, "role": user.user_role})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut, summary="Retorna o usuário autenticado")
def me(current_user: User = Depends(get_current_user)):
    return current_user

class ModuleOrderUpdate(BaseModel):
    module_order: List[str]

@router.patch("/me/module_order", response_model=UserOut, summary="Salvar ordem dos módulos do usuário autenticado")
def update_module_order(
    body: ModuleOrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.module_order = body.module_order
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user

class LanguageUpdate(BaseModel):
    user_language: str

@router.patch("/me/language", response_model=UserOut, summary="Atualizar preferência de idioma do usuário autenticado")
def update_language(
    body: LanguageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if body.user_language not in ("pt", "en", "es"):
        raise HTTPException(400, "Idioma inválido. Use 'pt', 'en' ou 'es'")
    current_user.user_language = body.user_language
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user

class ThemeUpdate(BaseModel):
    user_theme: str

@router.patch("/me/theme", response_model=UserOut, summary="Atualizar preferência de tema do usuário autenticado")
def update_theme(
    body: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if body.user_theme not in ("dark", "light"):
        raise HTTPException(400, "Tema inválido. Use 'dark' ou 'light'")
    current_user.user_theme = body.user_theme
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
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

# ── Reset de senha ─────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

TOKEN_EXPIRY_MINUTES = 30

@router.post("/forgot-password", summary="Solicitar token de reset de senha")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_email == body.email).first()
    if not user or not user.user_is_active:
        # Resposta genérica para evitar enumeração de usuários
        return {
            "message": "Se o e-mail estiver cadastrado, o token será gerado.",
            "reset_token": None,
        }

    token = _generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

    user.user_reset_token = token
    user.user_reset_token_expires_at = expires_at
    db.commit()

    return {
        "message": "Token gerado. Entregue ao usuário pelo canal seguro.",
        "reset_token": token,
        "expires_at": expires_at.isoformat(),
        "expires_in": f"{TOKEN_EXPIRY_MINUTES} minutos",
        "user_email": user.user_email,
    }

@router.post("/reset-password", summary="Redefinir senha com token")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not body.reset_token or len(body.reset_token.strip()) == 0:
        raise HTTPException(400, "Token não informado")

    user = db.query(User).filter(
        User.user_reset_token == body.reset_token.strip().upper()
    ).first()

    if not user or not user.user_is_active:
        raise HTTPException(400, "Token inválido ou expirado")

    if user.user_reset_token_expires_at is None or \
       datetime.utcnow() > user.user_reset_token_expires_at:
        # Token expirado — limpa do banco
        user.user_reset_token = None
        user.user_reset_token_expires_at = None
        db.commit()
        raise HTTPException(400, "Token expirado. Solicite um novo.")

    if len(body.new_password) < 8:
        raise HTTPException(400, "Nova senha deve ter ao menos 8 caracteres")

    user.user_password = hash_password(body.new_password)
    user.user_reset_token = None
    user.user_reset_token_expires_at = None
    user.updated_at = datetime.utcnow()
    db.commit()

    return {"message": f"Senha redefinida com sucesso para {user.user_email}"}
