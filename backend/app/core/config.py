import os
from functools import lru_cache
from typing import List
from dotenv import load_dotenv, find_dotenv

# Busca o .env subindo os diretórios a partir de config.py (mais robusto que path relativo)
_env_file = find_dotenv(usecwd=True) or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env"
)
load_dotenv(_env_file, override=False)

class Settings:
    APP_ENV: str          = os.getenv("APP_ENV", "development")
    DEBUG: bool           = os.getenv("DEBUG", "true").lower() == "true"
    SECRET_KEY: str       = os.getenv("SECRET_KEY", "product-lab-secret-key")
    API_V1_PREFIX: str    = "/api/v1"
    PROJECT_NAME: str     = "Product Lab API"
    VERSION: str          = "1.0.0"
    
    # Configurações de Banco de Dados purificadas (sem fallbacks contendo credenciais expostas)
    DATABASE_URL: str      = os.getenv("DATABASE_URL")
    DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC")
    
    DB_POOL_SIZE: int      = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int  = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
