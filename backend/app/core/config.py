import os
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Localiza o .env subindo os diretórios (compatível com execução local e Docker)
_env_file = os.environ.get(
    "ENV_FILE",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env"),
)


class Settings(BaseSettings):
    # ── Ambiente ──────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Segurança — SECRET_KEY obrigatória (sem fallback) ────────────────────
    SECRET_KEY: str  # sem default: ValueError na startup se não definida

    # ── API ───────────────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Product Lab API"
    VERSION: str = "1.0.0"

    # ── Banco de dados — obrigatório ──────────────────────────────────────────
    DATABASE_URL: str  # sem default: ValueError na startup se não definida
    DATABASE_URL_SYNC: str = ""

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ── CORS — armazenado como str CSV para evitar json.loads do pydantic-settings
    # Use a property allowed_origins_list para obter List[str]
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Retorna ALLOWED_ORIGINS como lista, aceitando CSV ou JSON array."""
        v = self.ALLOWED_ORIGINS.strip()
        if v.startswith("["):
            import json
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    # ── OpenAI ────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
