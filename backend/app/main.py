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

        # backlog_items — sprint_id, requester, DoD, assigned_to & wsjf_score type fix
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS sprint_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS requester_stakeholder_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS definition_of_done TEXT"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS assigned_to_member_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS business_rules TEXT"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS start_sprint_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS end_sprint_id INTEGER"))
        # Backfill: itens já cadastrados com sprint_id → copiar para start_sprint_id e end_sprint_id
        conn.execute(text("""
            UPDATE backlog_items
            SET start_sprint_id = sprint_id,
                end_sprint_id   = sprint_id
            WHERE sprint_id IS NOT NULL
              AND start_sprint_id IS NULL
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS backlog_item_notes (
                note_id    SERIAL PRIMARY KEY,
                item_id    INTEGER NOT NULL REFERENCES backlog_items(item_id) ON DELETE CASCADE,
                author     VARCHAR(150) NOT NULL,
                content    TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notes_item ON backlog_item_notes(item_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS backlog_item_links (
                link_id    SERIAL PRIMARY KEY,
                source_id  INTEGER NOT NULL REFERENCES backlog_items(item_id) ON DELETE CASCADE,
                target_id  INTEGER NOT NULL REFERENCES backlog_items(item_id) ON DELETE CASCADE,
                link_type  VARCHAR(30) NOT NULL DEFAULT 'relates_to',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_item_link UNIQUE (source_id, target_id, link_type)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_links_source ON backlog_item_links(source_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_links_target ON backlog_item_links(target_id)"))
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
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_backlog_assigned ON backlog_items(assigned_to_member_id)"))

        # team_members — cadastro mestre de membros da equipe
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS team_members (
                member_id     SERIAL PRIMARY KEY,
                full_name     VARCHAR(150) NOT NULL,
                email         VARCHAR(255),
                resource_type VARCHAR(30) NOT NULL DEFAULT 'internal',
                department    VARCHAR(100),
                company       VARCHAR(150),
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        # add columns if table existed before these fields were added
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS resource_type VARCHAR(30) NOT NULL DEFAULT 'internal'"))
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS department VARCHAR(100)"))
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS company VARCHAR(150)"))
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS team_member_products (
                id         SERIAL PRIMARY KEY,
                member_id  INTEGER NOT NULL REFERENCES team_members(member_id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL,
                role       VARCHAR(100),
                start_date DATE,
                end_date   DATE,
                is_active  BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_team_member_product UNIQUE (member_id, product_id)
            )
        """))
        conn.execute(text("ALTER TABLE team_member_products ADD COLUMN IF NOT EXISTS role VARCHAR(100)"))
        conn.execute(text("ALTER TABLE team_member_products ADD COLUMN IF NOT EXISTS start_date DATE"))
        conn.execute(text("ALTER TABLE team_member_products ADD COLUMN IF NOT EXISTS end_date DATE"))
        conn.execute(text("ALTER TABLE team_member_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE team_member_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        conn.execute(text("ALTER TABLE team_member_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tmp_product ON team_member_products(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tmp_member  ON team_member_products(member_id)"))

        # ── Discovery module ──────────────────────────────────────────────────
        # Idempotent: tables already created via DDL, but kept here for parity
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS discovery_opportunity_id VARCHAR(36)"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS category VARCHAR(100)"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS responsible VARCHAR(150)"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS discovery_opportunity_id VARCHAR(36)"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS evidence_refs TEXT"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS approved_scope TEXT"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS responsible VARCHAR(300)"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS decision_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE vpc_canvas ADD COLUMN IF NOT EXISTS discovery_opportunity_id VARCHAR(36)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_risks_disco_opp ON risks(discovery_opportunity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_decisions_disco_opp ON decisions(discovery_opportunity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_vpc_canvas_disco_opp ON vpc_canvas(discovery_opportunity_id)"))

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

        # ── Requirements Management ───────────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirements (
                id                      SERIAL PRIMARY KEY,
                product_id              INTEGER,
                business_area_id        INTEGER,
                requirement_code        VARCHAR(50) NOT NULL,
                requirement_title       VARCHAR(250) NOT NULL,
                requirement_description TEXT NOT NULL,
                requirement_type        VARCHAR(30) NOT NULL DEFAULT 'FUNCTIONAL',
                requirement_source      VARCHAR(100),
                priority                VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
                lifecycle_status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                fulfillment_status      VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
                acceptance_definition   TEXT,
                requirement_owner       VARCHAR(150),
                created_by              INTEGER,
                created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_by              INTEGER,
                updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
                CONSTRAINT uq_requirement_code UNIQUE (product_id, requirement_code)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_product ON requirements(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_lifecycle ON requirements(lifecycle_status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_type ON requirements(requirement_type)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_features (
                id              SERIAL PRIMARY KEY,
                requirement_id  INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                feature_id      INTEGER NOT NULL,
                coverage_type   VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
                notes           TEXT,
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_req_feature UNIQUE (requirement_id, feature_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_feat_req ON requirement_features(requirement_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_user_stories (
                id                  SERIAL PRIMARY KEY,
                requirement_id      INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                user_story_id       INTEGER NOT NULL,
                coverage_percentage NUMERIC(5,2),
                coverage_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
                notes               TEXT,
                created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_req_userstory UNIQUE (requirement_id, user_story_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_us_req ON requirement_user_stories(requirement_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_relations (
                id              SERIAL PRIMARY KEY,
                requirement_id  INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                entity_type     VARCHAR(30) NOT NULL,
                entity_id       INTEGER NOT NULL,
                relation_type   VARCHAR(50),
                notes           TEXT,
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_rel_req ON requirement_relations(requirement_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_verifications (
                id                  SERIAL PRIMARY KEY,
                requirement_id      INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                verification_type   VARCHAR(30) NOT NULL,
                verification_result VARCHAR(20) NOT NULL DEFAULT 'NOT_VERIFIED',
                verified_by         INTEGER,
                verified_at         TIMESTAMP,
                evidence            TEXT,
                notes               TEXT,
                created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_ver_req ON requirement_verifications(requirement_id)"))

        # ── Process Mapping ───────────────────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS processes (
                id                  SERIAL PRIMARY KEY,
                product_id          INTEGER,
                business_area_id    INTEGER,
                process_name        VARCHAR(200) NOT NULL,
                process_description TEXT,
                process_version     VARCHAR(30) NOT NULL DEFAULT '1.0',
                process_type        VARCHAR(20) NOT NULL DEFAULT 'AS_IS',
                process_status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                process_owner       VARCHAR(150),
                process_trigger     TEXT,
                process_outcome     TEXT,
                created_by          INTEGER,
                created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_by          INTEGER,
                updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_deleted          BOOLEAN NOT NULL DEFAULT FALSE
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proc_product ON processes(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proc_status ON processes(process_status)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS process_nodes (
                id               SERIAL PRIMARY KEY,
                process_id       INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
                node_type        VARCHAR(30) NOT NULL,
                node_title       VARCHAR(200) NOT NULL,
                node_description TEXT,
                role_name        VARCHAR(150),
                business_area_id INTEGER,
                system_name      VARCHAR(150),
                duration_minutes NUMERIC(12,2),
                is_manual        BOOLEAN NOT NULL DEFAULT FALSE,
                is_bottleneck    BOOLEAN NOT NULL DEFAULT FALSE,
                x_position       NUMERIC(12,2) NOT NULL DEFAULT 0,
                y_position       NUMERIC(12,2) NOT NULL DEFAULT 0,
                width            NUMERIC(12,2),
                height           NUMERIC(12,2),
                display_order    INTEGER,
                created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pnode_process ON process_nodes(process_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS process_edges (
                id                   SERIAL PRIMARY KEY,
                process_id           INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
                source_node_id       INTEGER NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
                target_node_id       INTEGER NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
                edge_label           VARCHAR(150),
                edge_type            VARCHAR(20) NOT NULL DEFAULT 'SEQUENCE',
                condition_expression TEXT,
                sequence_order       INTEGER,
                created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_edge_nodes CHECK (source_node_id <> target_node_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pedge_process ON process_edges(process_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pedge_source  ON process_edges(source_node_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pedge_target  ON process_edges(target_node_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS process_node_relations (
                id            SERIAL PRIMARY KEY,
                node_id       INTEGER NOT NULL REFERENCES process_nodes(id) ON DELETE CASCADE,
                entity_type   VARCHAR(30) NOT NULL,
                entity_id     INTEGER NOT NULL,
                relation_type VARCHAR(50),
                notes         TEXT,
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pnrel_node ON process_node_relations(node_id)"))

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
