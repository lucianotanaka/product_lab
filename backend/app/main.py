from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.v1.router import router as api_router
import app.models  # ensure all models are registered

def create_tables():
    Base.metadata.create_all(bind=engine)

def run_migrations():
    """Aplica migrações incrementais via SQL puro (ADD COLUMN IF NOT EXISTS)."""
    with engine.begin() as conn:
        # users
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_reset_token VARCHAR(20)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_reset_token_expires_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_theme VARCHAR(10) NOT NULL DEFAULT 'dark'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_language VARCHAR(10) NOT NULL DEFAULT 'en'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS module_order JSONB DEFAULT NULL"))

        # products
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[]"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL"))

        # stakeholders
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS role VARCHAR(255)"))
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS influence INTEGER DEFAULT 3"))
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS interest INTEGER DEFAULT 3"))
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS notes TEXT"))
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))

        # stakeholder_products
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))

        # decisions
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))

        # knowledge_items — deprecated, removida em favor de knowledge_articles
        conn.execute(text("DROP TABLE IF EXISTS knowledge_items CASCADE"))

        # knowledge_articles (modelo principal da Knowledge Base)
        conn.execute(text("ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS product_id INTEGER"))

        # risks
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS mitigation_plan TEXT"))

        # roadmap_items
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS end_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS quarter VARCHAR(20)"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS item_type_id INTEGER"))

        # prioritization_items
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS tags TEXT[]"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS moscow_value VARCHAR(50)"))

        # vpc_items
        conn.execute(text("ALTER TABLE vpc_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))

        # backlog_items — sprint_id & wsjf_score type fix
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS sprint_id INTEGER"))
        conn.execute(text("""
            DO $$
            BEGIN
              IF (SELECT data_type FROM information_schema.columns
                  WHERE table_name='backlog_items' AND column_name='wsjf_score') = 'integer' THEN
                ALTER TABLE backlog_items
                  ALTER COLUMN wsjf_score TYPE NUMERIC(6,2)
                  USING ROUND(wsjf_score / 10.0, 1);
              END IF;
            END $$;
        """))

        # sprints — tabela de sprints por produto
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sprints (
                sprint_id  SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                name       VARCHAR(100) NOT NULL,
                goal       TEXT,
                start_date DATE,
                end_date   DATE,
                status     VARCHAR(20) NOT NULL DEFAULT 'planned',
                capacity   INTEGER,
                velocity   INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("ALTER TABLE sprints ADD COLUMN IF NOT EXISTS capacity INTEGER"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sprints_product ON sprints(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sprints_status  ON sprints(status)"))

        # Communication Domain — tabelas criadas via DDL v1.0 (já existem no banco)
        # audience_members — vincula stakeholders a audiências
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audience_members (
                audience_member_id SERIAL PRIMARY KEY,
                audience_id        INTEGER NOT NULL REFERENCES audiences(audience_id) ON DELETE CASCADE,
                stakeholder_id     INTEGER NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
                notes              TEXT,
                created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_audience_members UNIQUE (audience_id, stakeholder_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audience_members_audience ON audience_members(audience_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_audience_members_stakeholder ON audience_members(stakeholder_id)"))

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
    run_migrations()

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
