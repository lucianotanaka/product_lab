-- ─── Migration 009: Research Session Status ──────────────────────────────────
-- Adds session_status column to discovery_research to track whether a research
-- session is planned, in_progress, completed or cancelled.
-- Safe to run multiple times (uses IF NOT EXISTS / DO block).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'discovery_research'
          AND column_name = 'session_status'
    ) THEN
        ALTER TABLE discovery_research
            ADD COLUMN session_status VARCHAR(20) NOT NULL DEFAULT 'planned';
    END IF;
END $$;
