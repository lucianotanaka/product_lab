-- ============================================================
-- 012_raci.sql — RACI Matrix
-- Polimorphic: one row per (object_type, object_id, stakeholder_id, role)
-- ============================================================

CREATE TABLE IF NOT EXISTS raci_assignments (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER,                        -- denormalized for fast product-scoped queries
    object_type     VARCHAR(30)  NOT NULL,          -- REQUIREMENT|BACKLOG|DECISION|RISK|ROADMAP|PROCESS|DISCOVERY|MEETING
    object_id       INTEGER      NOT NULL,
    stakeholder_id  INTEGER      NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    role            CHAR(1)      NOT NULL CHECK (role IN ('R','A','C','I')),
    notes           TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (object_type, object_id, stakeholder_id, role)
);

CREATE INDEX IF NOT EXISTS idx_raci_object     ON raci_assignments(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_raci_stakeholder ON raci_assignments(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_raci_product    ON raci_assignments(product_id);
