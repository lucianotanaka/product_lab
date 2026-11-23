-- ============================================================
-- 016_requirement_change_management.sql
-- Phase 1: Field-level history log
-- Phase 2: Mandatory justification for status changes
-- Phase 3: Change Request workflow
-- ============================================================

-- History: one row per field change per PATCH
CREATE TABLE IF NOT EXISTS requirement_history (
    id              SERIAL PRIMARY KEY,
    requirement_id  INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    changed_by      VARCHAR(200),
    changed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    change_type     VARCHAR(30) NOT NULL,   -- CREATED|UPDATED|STATUS_CHANGE|APPROVED|REJECTED|OBSOLETE|DELETED
    field_name      VARCHAR(100),           -- NULL for CREATED events
    old_value       TEXT,
    new_value       TEXT,
    change_reason   TEXT                    -- mandatory for STATUS_CHANGE when going from APPROVED
);

CREATE INDEX IF NOT EXISTS idx_req_hist_req   ON requirement_history(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_hist_type  ON requirement_history(change_type);
CREATE INDEX IF NOT EXISTS idx_req_hist_field ON requirement_history(field_name);

-- Change Requests: formal change management for APPROVED requirements
CREATE TABLE IF NOT EXISTS requirement_change_requests (
    id                  SERIAL PRIMARY KEY,
    requirement_id      INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    requested_by        VARCHAR(200) NOT NULL,
    requested_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    change_description  TEXT NOT NULL,
    impact_analysis     TEXT,
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|REJECTED|IMPLEMENTED
    approved_by         VARCHAR(200),
    approved_at         TIMESTAMP,
    rejection_reason    TEXT,
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_cr_req    ON requirement_change_requests(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_cr_status ON requirement_change_requests(status);
