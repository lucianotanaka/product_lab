-- ============================================================
-- 013_followups_universal.sql
-- Universal Follow-Ups table — polymorphic entity_type + entity_id
-- Replaces discovery_research_followups scope with cross-module coverage.
-- Supported entity_types (non-exhaustive):
--   'discovery_research' | 'discovery_opportunity' | 'meeting'
--   'backlog_item'       | 'decision'              | 'risk'
--   'roadmap_item'       | 'requirement'           | 'process'
-- ============================================================

CREATE TABLE IF NOT EXISTS public.followups (
    id          VARCHAR(36)  NOT NULL,
    entity_type VARCHAR(50)  NOT NULL,
    entity_id   VARCHAR(36)  NOT NULL,
    action_type VARCHAR(30)  NOT NULL DEFAULT 'other',
    description TEXT         NOT NULL,
    assigned_to VARCHAR(200),
    due_date    DATE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
    notes       TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT followups_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_followups_entity      ON public.followups (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_followups_status      ON public.followups (status);
CREATE INDEX IF NOT EXISTS ix_followups_due_date    ON public.followups (due_date);
CREATE INDEX IF NOT EXISTS ix_followups_assigned_to ON public.followups (assigned_to);

-- ── Migrate existing discovery_research_followups data ────────────────────────
INSERT INTO public.followups (
    id, entity_type, entity_id, action_type,
    description, assigned_to, due_date, status,
    notes, created_at, updated_at
)
SELECT
    id,
    'discovery_research'   AS entity_type,
    research_id            AS entity_id,
    action_type,
    description,
    assigned_to,
    due_date,
    status,
    notes,
    created_at,
    updated_at
FROM public.discovery_research_followups
ON CONFLICT (id) DO NOTHING;

-- ── Drop legacy table (data fully migrated) ───────────────────────────────────
DROP TABLE IF EXISTS public.discovery_research_followups CASCADE;
