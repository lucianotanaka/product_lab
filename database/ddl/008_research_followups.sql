-- ─── Migration 008: Research Follow-ups ──────────────────────────────────────
-- Adds the discovery_research_followups table to track next-steps arising from
-- research sessions (e.g. schedule new meeting, client needs to gather data).
-- Safe to run multiple times (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS discovery_research_followups (
    id               VARCHAR(36)  PRIMARY KEY,
    research_id      VARCHAR(36)  NOT NULL REFERENCES discovery_research(id) ON DELETE CASCADE,
    action_type      VARCHAR(30)  NOT NULL DEFAULT 'other',
    description      TEXT         NOT NULL,
    assigned_to      VARCHAR(200),
    due_date         DATE,
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
    linked_answer_id VARCHAR(36)  REFERENCES research_answers(id) ON DELETE SET NULL,
    notes            TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_discovery_research_followups_research_id
    ON discovery_research_followups (research_id);

CREATE INDEX IF NOT EXISTS ix_discovery_research_followups_status
    ON discovery_research_followups (status);

CREATE INDEX IF NOT EXISTS ix_discovery_research_followups_due_date
    ON discovery_research_followups (due_date);
