-- ─── Migration 011: Attachments ─────────────────────────────────────────────
-- Polimorphic attachment table: stores file binary data directly in PostgreSQL.
-- Works for any module: meetings, backlog_items, discovery_research, etc.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS attachments (
    id           VARCHAR(36)  PRIMARY KEY,
    entity_type  VARCHAR(50)  NOT NULL,   -- 'meeting' | 'backlog_item' | 'discovery_research' | etc.
    entity_id    VARCHAR(36)  NOT NULL,
    file_name    VARCHAR(300) NOT NULL,
    mime_type    VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
    file_size    INTEGER      NOT NULL DEFAULT 0,  -- bytes
    file_data    BYTEA        NOT NULL,
    uploaded_by  VARCHAR(200),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_attachments_entity ON attachments (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_attachments_created ON attachments (created_at DESC);
