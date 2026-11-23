import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.v1.router import router as api_router
import app.models  # ensure all models are registered

logger = logging.getLogger(__name__)

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
        # stakeholder_products — avaliação contextual (migrado de stakeholder_assessments)
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS power_level     SMALLINT"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS alignment_level SMALLINT"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS risk_level      SMALLINT"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS sentiment       VARCHAR(50)"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS expectation     TEXT"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS concern         TEXT"))
        conn.execute(text("ALTER TABLE stakeholder_products ADD COLUMN IF NOT EXISTS strategy        TEXT"))
        # stakeholder_assessments — removida (dados migrados para stakeholder_products)
        conn.execute(text("DROP TABLE IF EXISTS stakeholder_assessments CASCADE"))

        # decisions
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS discovery_opportunity_id VARCHAR(36)"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS business_case_id VARCHAR(36)"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS decided_by VARCHAR(200)"))
        conn.execute(text("ALTER TABLE decisions ADD COLUMN IF NOT EXISTS decision_date TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_decisions_opportunity ON decisions(discovery_opportunity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_decisions_business_case ON decisions(business_case_id)"))

        # knowledge_items — deprecated, removida em favor de knowledge_articles
        conn.execute(text("DROP TABLE IF EXISTS knowledge_items CASCADE"))

        # knowledge_articles (modelo principal da Knowledge Base)
        conn.execute(text("ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS product_id INTEGER"))

        # risks — ensure productlab has access (table was created by postgres via DDL scripts)
        conn.execute(text("GRANT ALL PRIVILEGES ON TABLE risks TO productlab"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS mitigation_plan TEXT"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS domain_id INTEGER"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS subdomain_id INTEGER"))
        conn.execute(text("ALTER TABLE risks ADD COLUMN IF NOT EXISTS requirement_id INTEGER"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_risks_domain ON risks(domain_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_risks_subdomain ON risks(subdomain_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_risks_requirement ON risks(requirement_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS risk_links (
                id SERIAL PRIMARY KEY,
                risk_id VARCHAR(36) NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT risk_links_unique UNIQUE (risk_id, entity_type, entity_id)
            )
        """))
        conn.execute(text("GRANT ALL PRIVILEGES ON TABLE risk_links TO productlab"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_risk_links_risk ON risk_links(risk_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_risk_links_entity ON risk_links(entity_type, entity_id)"))

        # roadmap_items
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS start_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS end_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS quarter VARCHAR(20)"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS item_type_id INTEGER"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_status VARCHAR(30) NOT NULL DEFAULT 'not_started'"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_summary TEXT"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_risk_dependency TEXT"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_next_step TEXT"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_owner_name VARCHAR(150)"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_owner_role VARCHAR(150)"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS committed_deadline TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS attention_flag BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS attention_reason TEXT"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS executive_updated_by VARCHAR(150)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS roadmap_backlog_links (
                id SERIAL PRIMARY KEY,
                roadmap_item_id VARCHAR(36) NOT NULL,
                backlog_item_id INTEGER NOT NULL,
                executive_status VARCHAR(30),
                executive_summary TEXT,
                executive_risk_dependency TEXT,
                executive_next_step TEXT,
                executive_owner_name VARCHAR(150),
                executive_owner_role VARCHAR(150),
                committed_deadline TIMESTAMP,
                attention_flag BOOLEAN NOT NULL DEFAULT FALSE,
                attention_reason TEXT,
                executive_updated_at TIMESTAMP,
                executive_updated_by VARCHAR(150),
                display_order INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_status VARCHAR(30)"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_summary TEXT"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_risk_dependency TEXT"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_next_step TEXT"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_owner_name VARCHAR(150)"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_owner_role VARCHAR(150)"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS committed_deadline TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS attention_flag BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS attention_reason TEXT"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS executive_updated_by VARCHAR(150)"))
        conn.execute(text("ALTER TABLE roadmap_backlog_links ADD COLUMN IF NOT EXISTS display_order INTEGER"))
        conn.execute(text("""
            UPDATE roadmap_backlog_links
            SET display_order = src.seq - 1
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY roadmap_item_id ORDER BY id) AS seq
                FROM roadmap_backlog_links
            ) AS src
            WHERE roadmap_backlog_links.id = src.id
              AND roadmap_backlog_links.display_order IS NULL
        """))

        # prioritization_items
        conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_enum e ON e.enumtypid = t.oid
                    WHERE t.typname = 'prioritymethod'
                      AND e.enumlabel = 'EISENHOWER'
                ) = FALSE THEN
                    ALTER TYPE prioritymethod ADD VALUE 'EISENHOWER';
                END IF;
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
        """))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS tags TEXT[]"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS moscow_value VARCHAR(50)"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS backlog_item_id INTEGER"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'manual'"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS source_id VARCHAR(50)"))
        conn.execute(text("ALTER TABLE prioritization_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_backlog_item ON prioritization_items(backlog_item_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prioritization_rice_items (
                id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                backlog_item_id INTEGER,
                source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
                source_id VARCHAR(50),
                item_type VARCHAR(50),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                reach DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                impact DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                effort DOUBLE PRECISION NOT NULL DEFAULT 1.0,
                rice_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_rice_product ON prioritization_rice_items(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_rice_backlog_item ON prioritization_rice_items(backlog_item_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prioritization_ice_items (
                id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                backlog_item_id INTEGER,
                source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
                source_id VARCHAR(50),
                item_type VARCHAR(50),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                impact DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                ease DOUBLE PRECISION NOT NULL DEFAULT 1.0,
                ice_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_ice_product ON prioritization_ice_items(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_ice_backlog_item ON prioritization_ice_items(backlog_item_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prioritization_moscow_items (
                id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                backlog_item_id INTEGER,
                source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
                source_id VARCHAR(50),
                item_type VARCHAR(50),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                moscow_value VARCHAR(50),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_moscow_product ON prioritization_moscow_items(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_moscow_backlog_item ON prioritization_moscow_items(backlog_item_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prioritization_eisenhower_items (
                id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                backlog_item_id INTEGER,
                source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
                source_id VARCHAR(50),
                item_type VARCHAR(50),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                urgency DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                importance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                eisenhower_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                quadrant VARCHAR(30),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_eisenhower_product ON prioritization_eisenhower_items(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_eisenhower_backlog_item ON prioritization_eisenhower_items(backlog_item_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prioritization_wsjf_items (
                id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                backlog_item_id INTEGER,
                source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
                source_id VARCHAR(50),
                item_type VARCHAR(50),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                business_value DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                time_criticality DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                risk_reduction DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                job_size DOUBLE PRECISION NOT NULL DEFAULT 1.0,
                wsjf_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_wsjf_product ON prioritization_wsjf_items(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prioritization_wsjf_backlog_item ON prioritization_wsjf_items(backlog_item_id)"))

        # quarter_prioritization_items
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS quarter_prioritization_items (
                id VARCHAR(36) PRIMARY KEY,
                company_id INTEGER NOT NULL,
                product_id VARCHAR(36) NOT NULL,
                roadmap_item_id VARCHAR(36) NOT NULL,
                fiscal_year INTEGER NOT NULL,
                quarter VARCHAR(2) NOT NULL,
                priority_rank INTEGER,
                planning_status VARCHAR(20) NOT NULL DEFAULT 'candidate',
                business_value DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                strategic_alignment DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                urgency DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                dependency_readiness DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                delivery_risk DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                estimated_effort DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                planned_capacity_share DOUBLE PRECISION,
                quarter_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                decision_rationale TEXT,
                notes TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quarter_prioritization_product ON quarter_prioritization_items(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quarter_prioritization_company ON quarter_prioritization_items(company_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quarter_prioritization_roadmap ON quarter_prioritization_items(roadmap_item_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_quarter_prioritization_fy_q ON quarter_prioritization_items(fiscal_year, quarter)"))

        # vpc_items
        conn.execute(text("ALTER TABLE vpc_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))

        # backlog_items — sprint_id, requester, DoD, assigned_to & wsjf_score type fix
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS sprint_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS requester_stakeholder_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS definition_of_done TEXT"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS assigned_to_member_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS management_owner_member_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS business_rules TEXT"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS start_sprint_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS end_sprint_id INTEGER"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS ado_work_item_type VARCHAR(100)"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS enabler_type VARCHAR(100)"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS wsjf_business_value INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS wsjf_time_criticality INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS wsjf_risk_reduction INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS wsjf_job_size INTEGER NOT NULL DEFAULT 0"))
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
                note_id     SERIAL PRIMARY KEY,
                item_id     INTEGER NOT NULL REFERENCES backlog_items(item_id) ON DELETE CASCADE,
                author      VARCHAR(150) NOT NULL,
                content     TEXT NOT NULL,
                note_type   VARCHAR(50) NOT NULL DEFAULT 'information',
                status      VARCHAR(30) NOT NULL DEFAULT 'open',
                followup_id VARCHAR(36),
                created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("ALTER TABLE backlog_item_notes ADD COLUMN IF NOT EXISTS note_type VARCHAR(50) NOT NULL DEFAULT 'information'"))
        conn.execute(text("ALTER TABLE backlog_item_notes ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'open'"))
        conn.execute(text("ALTER TABLE backlog_item_notes ADD COLUMN IF NOT EXISTS followup_id VARCHAR(36)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notes_item ON backlog_item_notes(item_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notes_followup ON backlog_item_notes(followup_id)"))
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
        conn.execute(text("ALTER TABLE discovery_opportunities ADD COLUMN IF NOT EXISTS journey_stage VARCHAR(30) NOT NULL DEFAULT 'capture'"))
        conn.execute(text("ALTER TABLE discovery_opportunities ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'active'"))
        conn.execute(text("""
            UPDATE discovery_opportunities
            SET journey_stage = CASE status
                WHEN 'identified' THEN 'capture'
                WHEN 'under_investigation' THEN 'discover'
                WHEN 'validated' THEN 'define'
                WHEN 'paused' THEN 'assess'
                WHEN 'discarded' THEN 'decide'
                WHEN 'forwarded_to_roadmap' THEN 'decide'
                ELSE COALESCE(journey_stage, 'capture')
            END
            WHERE journey_stage IS NULL OR journey_stage = ''
        """))
        conn.execute(text("""
            UPDATE discovery_opportunities
            SET lifecycle_status = CASE status
                WHEN 'paused' THEN 'on_hold'
                WHEN 'discarded' THEN 'closed'
                WHEN 'forwarded_to_roadmap' THEN 'closed'
                ELSE COALESCE(lifecycle_status, 'active')
            END
            WHERE lifecycle_status IS NULL OR lifecycle_status = ''
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS opportunity_sources (
                id                  VARCHAR(36) PRIMARY KEY,
                opportunity_id      VARCHAR(36) NOT NULL REFERENCES discovery_opportunities(id) ON DELETE CASCADE,
                source_type         VARCHAR(60) NOT NULL,
                source_system       VARCHAR(200),
                external_reference  VARCHAR(200),
                external_url        VARCHAR(500),
                requester_reference VARCHAR(200),
                requester_name      VARCHAR(200),
                sponsor_reference   VARCHAR(200),
                sponsor_name        VARCHAR(200),
                received_at         TIMESTAMP,
                original_context    TEXT,
                is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
                created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_oppsrc_opp ON opportunity_sources(opportunity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_oppsrc_primary ON opportunity_sources(opportunity_id, is_primary)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS opportunity_assessments (
                id                       VARCHAR(36) PRIMARY KEY,
                opportunity_id           VARCHAR(36) NOT NULL REFERENCES discovery_opportunities(id) ON DELETE CASCADE,
                assessment_type          VARCHAR(50) NOT NULL DEFAULT 'initial',
                problem_clarity          VARCHAR(20) NOT NULL DEFAULT 'unknown',
                evidence_strength        VARCHAR(20) NOT NULL DEFAULT 'unknown',
                business_impact          VARCHAR(20) NOT NULL DEFAULT 'unknown',
                expected_outcome_clarity VARCHAR(20) NOT NULL DEFAULT 'unknown',
                potential_business_value VARCHAR(20) NOT NULL DEFAULT 'unknown',
                strategic_alignment      VARCHAR(20) NOT NULL DEFAULT 'unknown',
                urgency                  VARCHAR(20) NOT NULL DEFAULT 'unknown',
                business_uncertainty     VARCHAR(20) NOT NULL DEFAULT 'unknown',
                solution_uncertainty     VARCHAR(20) NOT NULL DEFAULT 'unknown',
                initial_viability        VARCHAR(20) NOT NULL DEFAULT 'unknown',
                recommendation           VARCHAR(60),
                rationale                TEXT,
                assessed_by              VARCHAR(200),
                assessed_at              TIMESTAMP,
                created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_oppass_opp ON opportunity_assessments(opportunity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_oppass_assessed_at ON opportunity_assessments(assessed_at)"))
        conn.execute(text("""
            INSERT INTO opportunity_sources (
                id, opportunity_id, source_type, original_context, is_primary, created_at, updated_at
            )
            SELECT
                md5(random()::text || clock_timestamp()::text)::uuid::text,
                o.id,
                (
                    CASE o.origin
                        WHEN 'customer_feedback' THEN 'customer_feedback'
                        WHEN 'internal_analysis' THEN 'internal_analysis'
                        WHEN 'market_research' THEN 'market_research'
                        WHEN 'stakeholder_request' THEN 'stakeholder_request'
                        WHEN 'data_analysis' THEN 'data_analysis'
                        WHEN 'regulatory_compliance' THEN 'regulatory_requirement'
                        ELSE 'other'
                    END
                )::opportunitysourcetype,
                o.origin,
                TRUE,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM discovery_opportunities o
            WHERE o.origin IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM opportunity_sources s
                WHERE s.opportunity_id = o.id
              )
        """))
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
        conn.execute(text("ALTER TABLE communications ADD COLUMN IF NOT EXISTS report_kind VARCHAR(60)"))
        conn.execute(text("ALTER TABLE communications ADD COLUMN IF NOT EXISTS report_scope JSONB"))
        conn.execute(text("ALTER TABLE communications ADD COLUMN IF NOT EXISTS supported_export_formats JSONB"))
        conn.execute(text("ALTER TABLE publications ADD COLUMN IF NOT EXISTS rendered_html TEXT"))
        conn.execute(text("ALTER TABLE publications ADD COLUMN IF NOT EXISTS export_payload JSONB"))
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
        conn.execute(text("ALTER TABLE requirements ADD COLUMN IF NOT EXISTS requirement_classification VARCHAR(50)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_classification ON requirements(requirement_classification)"))
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
                process_scope       VARCHAR(20) NOT NULL DEFAULT 'PRODUCT',
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
            source_handle        VARCHAR(20),
            target_handle        VARCHAR(20),
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
        conn.execute(text("ALTER TABLE process_edges ADD COLUMN IF NOT EXISTS source_handle VARCHAR(20)"))
        conn.execute(text("ALTER TABLE process_edges ADD COLUMN IF NOT EXISTS target_handle VARCHAR(20)"))
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

        # ── Process Mapping — new tables & columns (2026-08) ─────────────────
        # business_areas
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS business_areas (
                id               SERIAL PRIMARY KEY,
                area_name        VARCHAR(150) NOT NULL,
                area_description VARCHAR(400),
                area_color       VARCHAR(30),
                display_order    INTEGER NOT NULL DEFAULT 0,
                is_active        BOOLEAN NOT NULL DEFAULT TRUE,
                created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        # process_groups
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS process_groups (
                id              SERIAL PRIMARY KEY,
                process_id      INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
                group_name      VARCHAR(200) NOT NULL,
                group_type      VARCHAR(30) NOT NULL DEFAULT 'PHASE',
                parent_group_id INTEGER REFERENCES process_groups(id) ON DELETE SET NULL,
                display_order   INTEGER NOT NULL DEFAULT 0,
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_process_groups_process ON process_groups(process_id)"))
        # process_tools
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS process_tools (
                id               SERIAL PRIMARY KEY,
                process_id       INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
                tool_name        VARCHAR(150) NOT NULL,
                tool_description VARCHAR(300),
                tool_icon        VARCHAR(100),
                display_order    INTEGER NOT NULL DEFAULT 0,
                created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_process_tools_process ON process_tools(process_id)"))
        # process_nodes — new columns
        conn.execute(text("ALTER TABLE process_nodes ADD COLUMN IF NOT EXISTS node_subtitle  VARCHAR(200)"))
        conn.execute(text("ALTER TABLE process_nodes ADD COLUMN IF NOT EXISTS node_icon      VARCHAR(100)"))
        conn.execute(text("ALTER TABLE process_nodes ADD COLUMN IF NOT EXISTS group_id       INTEGER REFERENCES process_groups(id) ON DELETE SET NULL"))
        conn.execute(text("ALTER TABLE process_nodes ADD COLUMN IF NOT EXISTS child_process_id INTEGER REFERENCES processes(id) ON DELETE SET NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pnode_child_proc ON process_nodes(child_process_id)"))
        # process.is_macro — marca processos macro (visão end-to-end)
        conn.execute(text("ALTER TABLE processes ADD COLUMN IF NOT EXISTS is_macro BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE processes ADD COLUMN IF NOT EXISTS process_scope VARCHAR(20) NOT NULL DEFAULT 'PRODUCT'"))
        conn.execute(text("""
            UPDATE processes
            SET process_scope = CASE
                WHEN product_id IS NULL THEN 'GLOBAL'
                ELSE 'PRODUCT'
            END
            WHERE process_scope IS NULL OR process_scope = ''
        """))

        # ── Multi-client (2026-08) ────────────────────────────────────────────
        # companies
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS companies (
                id            SERIAL PRIMARY KEY,
                company_name  VARCHAR(200) NOT NULL,
                company_type  VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
                cnpj          VARCHAR(20),
                website       VARCHAR(200),
                country       VARCHAR(100),
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                notes         TEXT,
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        # user_companies
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_companies (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                role       VARCHAR(50) NOT NULL DEFAULT 'PM',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_user_company UNIQUE (user_id, company_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_user_companies_user    ON user_companies(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id)"))
        # products — add company_id
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id)"))
        # stakeholders — add company_id
        conn.execute(text("ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stakeholders_company ON stakeholders(company_id)"))
        # team_members — add company_id
        conn.execute(text("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_team_members_company ON team_members(company_id)"))
        # business_areas — add product_id and area_type
        conn.execute(text("ALTER TABLE business_areas ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_business_areas_product ON business_areas(product_id)"))
        conn.execute(text("ALTER TABLE business_areas ADD COLUMN IF NOT EXISTS area_type VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL'"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ba_active ON business_areas(is_active)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ba_type ON business_areas(area_type)"))

        # company_business_areas — associação N:M empresa ↔ área de negócio
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS company_business_areas (
                id               SERIAL PRIMARY KEY,
                company_id       INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                business_area_id INTEGER NOT NULL REFERENCES business_areas(id) ON DELETE CASCADE,
                manager_name     VARCHAR(150),
                manager_email    VARCHAR(255),
                notes            TEXT,
                is_active        BOOLEAN NOT NULL DEFAULT TRUE,
                display_order    INTEGER NOT NULL DEFAULT 0,
                created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_company_area UNIQUE (company_id, business_area_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cba_company  ON company_business_areas(company_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cba_area     ON company_business_areas(business_area_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cba_active   ON company_business_areas(is_active)"))
        # stakeholder_id, manager_name, manager_email removed from company_business_areas
        # (managed via company_area_members instead)

        # business_areas — hierarquia (parent + level)
        conn.execute(text("ALTER TABLE business_areas ADD COLUMN IF NOT EXISTS parent_area_id INTEGER REFERENCES business_areas(id) ON DELETE SET NULL"))
        conn.execute(text("ALTER TABLE business_areas ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ba_parent ON business_areas(parent_area_id)"))

        # company_area_members — tabela unificada: membros + líderes de área
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS company_area_members (
                id                   SERIAL PRIMARY KEY,
                company_id           INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                business_area_id     INTEGER NOT NULL REFERENCES business_areas(id) ON DELETE CASCADE,
                stakeholder_id       INTEGER NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
                role_in_area         VARCHAR(100),
                leadership_level     VARCHAR(50),
                is_current           BOOLEAN NOT NULL DEFAULT TRUE,
                started_at           DATE DEFAULT CURRENT_DATE,
                ended_at             DATE,
                reports_to_member_id INTEGER REFERENCES company_area_members(id) ON DELETE SET NULL,
                is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                notes                TEXT,
                created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cam_company     ON company_area_members(company_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cam_area        ON company_area_members(business_area_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cam_stakeholder ON company_area_members(stakeholder_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cam_current     ON company_area_members(is_current)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cam_leader      ON company_area_members(leadership_level)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cam_reports_to  ON company_area_members(reports_to_member_id)"))
        # idempotent: add new columns if table existed before
        conn.execute(text("ALTER TABLE company_area_members ADD COLUMN IF NOT EXISTS leadership_level VARCHAR(50)"))
        conn.execute(text("ALTER TABLE company_area_members ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE company_area_members ADD COLUMN IF NOT EXISTS started_at DATE DEFAULT CURRENT_DATE"))
        conn.execute(text("ALTER TABLE company_area_members ADD COLUMN IF NOT EXISTS ended_at DATE"))
        conn.execute(text("ALTER TABLE company_area_members ADD COLUMN IF NOT EXISTS reports_to_member_id INTEGER REFERENCES company_area_members(id) ON DELETE SET NULL"))
        conn.execute(text("ALTER TABLE company_area_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))

        # ── Universal Follow-Ups (2026-09) ───────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS followups (
                id          VARCHAR(36)  NOT NULL,
                entity_type VARCHAR(50)  NOT NULL,
                entity_id   VARCHAR(36)  NOT NULL,
                action_type VARCHAR(30)  NOT NULL DEFAULT 'other',
                description TEXT         NOT NULL,
                assigned_to VARCHAR(200),
                due_date    DATE,
                status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
                notes       TEXT,
                created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT followups_pkey PRIMARY KEY (id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_entity      ON followups (entity_type, entity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_status      ON followups (status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_due_date    ON followups (due_date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_assigned_to ON followups (assigned_to)"))
        # Migrate existing discovery_research_followups → followups (idempotent)
        # Wrapped in IF EXISTS so it is safe on repeat restarts after the table was dropped
        conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name   = 'discovery_research_followups'
                ) THEN
                    INSERT INTO followups (
                        id, entity_type, entity_id, action_type,
                        description, assigned_to, due_date, status,
                        notes, created_at, updated_at
                    )
                    SELECT
                        id,
                        'discovery_research' AS entity_type,
                        research_id          AS entity_id,
                        action_type,
                        description,
                        assigned_to,
                        due_date,
                        status,
                        notes,
                        created_at,
                        updated_at
                    FROM discovery_research_followups
                    ON CONFLICT (id) DO NOTHING;
                END IF;
            END $$;
        """))
        # Drop legacy table — data fully migrated to followups (safe on repeat)
        conn.execute(text("DROP TABLE IF EXISTS discovery_research_followups CASCADE"))

        # ── Business Domains (2026-09) ───────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS business_domains (
                id              SERIAL PRIMARY KEY,
                domain_code     VARCHAR(50)  NOT NULL UNIQUE,
                domain_name     VARCHAR(200) NOT NULL,
                description     TEXT,
                owner           VARCHAR(200),
                is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
                display_order   INTEGER      NOT NULL DEFAULT 0,
                created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bd_active ON business_domains(is_active)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bd_code   ON business_domains(domain_code)"))
        conn.execute(text("ALTER TABLE business_domains ADD COLUMN IF NOT EXISTS business_objective TEXT"))
        conn.execute(text("ALTER TABLE business_domains ADD COLUMN IF NOT EXISTS scope_in TEXT"))
        conn.execute(text("ALTER TABLE business_domains ADD COLUMN IF NOT EXISTS scope_out TEXT"))
        conn.execute(text("ALTER TABLE business_domains ADD COLUMN IF NOT EXISTS business_value TEXT"))
        conn.execute(text("ALTER TABLE business_domains ADD COLUMN IF NOT EXISTS document_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'"))
        conn.execute(text("ALTER TABLE business_domains ADD COLUMN IF NOT EXISTS version VARCHAR(30) NOT NULL DEFAULT '1.0'"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS business_subdomains (
                id              SERIAL PRIMARY KEY,
                domain_id       INTEGER      NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
                subdomain_code  VARCHAR(50)  NOT NULL,
                subdomain_name  VARCHAR(200) NOT NULL,
                description     TEXT,
                display_order   INTEGER      NOT NULL DEFAULT 0,
                is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
                created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_subdomain_code UNIQUE (domain_id, subdomain_code)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bsd_domain ON business_subdomains(domain_id)"))
        conn.execute(text("ALTER TABLE business_subdomains ADD COLUMN IF NOT EXISTS subdomain_type VARCHAR(30)"))
        conn.execute(text("ALTER TABLE business_subdomains ADD COLUMN IF NOT EXISTS owner VARCHAR(200)"))
        conn.execute(text("ALTER TABLE business_subdomains ADD COLUMN IF NOT EXISTS business_rules TEXT"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_domain_links (
                id              SERIAL PRIMARY KEY,
                requirement_id  INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                domain_id       INTEGER NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
                subdomain_id    INTEGER REFERENCES business_subdomains(id) ON DELETE SET NULL,
                created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_req_domain UNIQUE (requirement_id, domain_id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rdl_requirement ON requirement_domain_links(requirement_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rdl_domain      ON requirement_domain_links(domain_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_rdl_subdomain   ON requirement_domain_links(subdomain_id)"))

        # ── Requirement Change Management (2026-09) ──────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_history (
                id              SERIAL PRIMARY KEY,
                requirement_id  INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                changed_by      VARCHAR(200),
                changed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
                change_type     VARCHAR(30) NOT NULL,
                field_name      VARCHAR(100),
                old_value       TEXT,
                new_value       TEXT,
                change_reason   TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_hist_req   ON requirement_history(requirement_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_hist_type  ON requirement_history(change_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_hist_field ON requirement_history(field_name)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS requirement_change_requests (
                id                  SERIAL PRIMARY KEY,
                requirement_id      INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
                requested_by        VARCHAR(200) NOT NULL,
                requested_at        TIMESTAMP NOT NULL DEFAULT NOW(),
                change_description  TEXT NOT NULL,
                impact_analysis     TEXT,
                priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
                status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                approved_by         VARCHAR(200),
                approved_at         TIMESTAMP,
                rejection_reason    TEXT,
                updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_cr_req    ON requirement_change_requests(requirement_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_req_cr_status ON requirement_change_requests(status)"))

        # ── RACI Matrix (2026-09) ─────────────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS raci_assignments (
                id              SERIAL PRIMARY KEY,
                product_id      INTEGER,
                object_type     VARCHAR(30) NOT NULL,
                object_id       INTEGER NOT NULL,
                stakeholder_id  INTEGER NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
                role            CHAR(1) NOT NULL CHECK (role IN ('R','A','C','I')),
                notes           TEXT,
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_raci_assignment UNIQUE (object_type, object_id, stakeholder_id, role)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_raci_object      ON raci_assignments(object_type, object_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_raci_stakeholder  ON raci_assignments(stakeholder_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_raci_product      ON raci_assignments(product_id)"))

        # ── Integration sync logs — operation_type (2026-09) ─────────────────
        conn.execute(text("ALTER TABLE integration_sync_logs ADD COLUMN IF NOT EXISTS operation_type VARCHAR(20) NOT NULL DEFAULT 'full_sync'"))
        # backfill: logs created by sync/apply endpoint have no operation_type yet
        conn.execute(text("""
            UPDATE integration_sync_logs
            SET operation_type = 'apply'
            WHERE operation_type = 'full_sync'
              AND (details IS NOT NULL AND details != 'null'::jsonb)
        """))

        # ── Meetings — sessions, transcripts, summaries and relations (2026-10)
        conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS primary_entity_type VARCHAR(40)"))
        conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS primary_entity_id VARCHAR(36)"))
        conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS primary_relation_note TEXT"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meetings_primary_entity_id ON meetings(primary_entity_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting_sessions (
                id               VARCHAR(36) PRIMARY KEY,
                meeting_id       VARCHAR(36) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                title            VARCHAR(300),
                session_date     DATE,
                start_time       VARCHAR(5),
                end_time         VARCHAR(5),
                duration_minutes INTEGER,
                location         VARCHAR(200),
                status           VARCHAR(20) NOT NULL DEFAULT 'scheduled',
                notes            TEXT,
                created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_sessions_meeting_id ON meeting_sessions(meeting_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_sessions_session_date ON meeting_sessions(session_date)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting_transcripts (
                id                   VARCHAR(36) PRIMARY KEY,
                meeting_id           VARCHAR(36) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                session_id           VARCHAR(36) REFERENCES meeting_sessions(id) ON DELETE CASCADE,
                title                VARCHAR(300) NOT NULL,
                content_text         TEXT NOT NULL,
                language             VARCHAR(20),
                source_type          VARCHAR(30) NOT NULL DEFAULT 'paste',
                source_attachment_id VARCHAR(36),
                created_by           VARCHAR(200),
                created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_meeting_id ON meeting_transcripts(meeting_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_session_id ON meeting_transcripts(session_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_source_type ON meeting_transcripts(source_type)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting_summaries (
                id            VARCHAR(36) PRIMARY KEY,
                meeting_id    VARCHAR(36) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                session_id    VARCHAR(36) REFERENCES meeting_sessions(id) ON DELETE CASCADE,
                transcript_id VARCHAR(36) REFERENCES meeting_transcripts(id) ON DELETE SET NULL,
                title         VARCHAR(300) NOT NULL,
                summary_type  VARCHAR(30) NOT NULL DEFAULT 'minutes',
                content       TEXT NOT NULL,
                created_by    VARCHAR(200),
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_summaries_meeting_id ON meeting_summaries(meeting_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_summaries_session_id ON meeting_summaries(session_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_summaries_transcript_id ON meeting_summaries(transcript_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS meeting_relations (
                id            VARCHAR(36) PRIMARY KEY,
                meeting_id    VARCHAR(36) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                entity_type   VARCHAR(40) NOT NULL,
                entity_id     VARCHAR(36) NOT NULL,
                relation_type VARCHAR(30) NOT NULL DEFAULT 'related',
                label         VARCHAR(200),
                notes         TEXT,
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_relations_meeting_id ON meeting_relations(meeting_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_relations_entity ON meeting_relations(entity_type, entity_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_meeting_relations_relation_type ON meeting_relations(relation_type)"))
        conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'meeting_links'
                      AND column_name = 'url'
                      AND data_type = 'character varying'
                ) THEN
                    ALTER TABLE meeting_links
                    ALTER COLUMN url TYPE TEXT;
                END IF;
            END $$;
        """))

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
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_stale_sync_logs():
    """
    Mark any integration_sync_logs stuck in 'running' as 'failed'.
    This handles the case where the backend was restarted while a sync was running.
    """
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE integration_sync_logs
                SET status        = 'failed',
                    finished_at   = NOW(),
                    error_message = 'Execution abandoned — backend restarted while running'
                WHERE status = 'running'
            """))
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"cleanup_stale_sync_logs skipped: {e}")


@app.on_event("startup")
def on_startup():
    run_migrations()
    create_tables()
    cleanup_stale_sync_logs()

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    try:
        detail = f"{type(exc).__name__}: {exc}"
    except Exception:
        detail = type(exc).__name__
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, detail)
    try:
        return JSONResponse(
            status_code=500,
            content={
                "detail": detail,
                "path": str(request.url.path),
                "method": request.method,
            },
        )
    except Exception as inner:
        logger.exception("Exception handler itself failed: %s", inner)
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(status_code=500, content=f"500: {detail[:200]}")

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/api/v1/healthcheck2", tags=["System"])
def healthcheck2():
    return {"code_version": "v2-direct-jsonresponse", "loaded": True}


@app.get("/api/v1/debug/routes", tags=["System"])
def debug_routes():
    """Retorna as rotas carregadas pelo processo vivo. Remover após diagnóstico."""
    routes = sorted([
        {"path": r.path, "name": getattr(r, "name", "")}
        for r in app.routes
        if hasattr(r, "path")
    ], key=lambda x: x["path"])
    opp_routes = [r for r in routes if "opportunit" in r["path"]]
    return {
        "total_routes": len(routes),
        "opportunities_routes": opp_routes,
        "router_file": __import__("app.api.v1.router", fromlist=["router"]).__file__,
    }

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
        "_code_version": "v2-direct-jsonresponse",
    }
