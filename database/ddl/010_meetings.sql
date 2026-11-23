-- ─── Migration 010: Meetings Module ──────────────────────────────────────────
-- Creates meetings, meeting_sessions, meeting_transcripts, meeting_summaries,
-- meeting_participants, meeting_action_items, meeting_links and meeting_relations.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS meetings (
    id                    VARCHAR(36)  PRIMARY KEY,
    product_id            INTEGER,
    title                 VARCHAR(300) NOT NULL,
    meeting_type          VARCHAR(30)  NOT NULL DEFAULT 'other',
    meeting_date          DATE,
    start_time            VARCHAR(5),
    duration_minutes      INTEGER,
    location              VARCHAR(200),
    status                VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
    objective             TEXT,
    agenda                TEXT,
    transcript            TEXT,
    decisions             TEXT,
    notes                 TEXT,
    opportunity_id        VARCHAR(36),
    backlog_item_id       VARCHAR(36),
    roadmap_item_id       VARCHAR(36),
    primary_entity_type   VARCHAR(40),
    primary_entity_id     VARCHAR(36),
    primary_relation_note TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meetings_product_id        ON meetings (product_id);
CREATE INDEX IF NOT EXISTS ix_meetings_meeting_date      ON meetings (meeting_date DESC);
CREATE INDEX IF NOT EXISTS ix_meetings_status            ON meetings (status);
CREATE INDEX IF NOT EXISTS ix_meetings_opportunity_id    ON meetings (opportunity_id);
CREATE INDEX IF NOT EXISTS ix_meetings_primary_entity_id ON meetings (primary_entity_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_sessions (
    id               VARCHAR(36)  PRIMARY KEY,
    meeting_id       VARCHAR(36)  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    title            VARCHAR(300),
    session_date     DATE,
    start_time       VARCHAR(5),
    end_time         VARCHAR(5),
    duration_minutes INTEGER,
    location         VARCHAR(200),
    status           VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
    notes            TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_sessions_meeting_id   ON meeting_sessions (meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_sessions_session_date ON meeting_sessions (session_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_transcripts (
    id                   VARCHAR(36)  PRIMARY KEY,
    meeting_id           VARCHAR(36)  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    session_id           VARCHAR(36)  REFERENCES meeting_sessions(id) ON DELETE CASCADE,
    title                VARCHAR(300) NOT NULL,
    content_text         TEXT         NOT NULL,
    language             VARCHAR(20),
    source_type          VARCHAR(30)  NOT NULL DEFAULT 'paste',
    source_attachment_id VARCHAR(36),
    created_by           VARCHAR(200),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_meeting_id  ON meeting_transcripts (meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_session_id  ON meeting_transcripts (session_id);
CREATE INDEX IF NOT EXISTS ix_meeting_transcripts_source_type ON meeting_transcripts (source_type);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_summaries (
    id            VARCHAR(36)  PRIMARY KEY,
    meeting_id    VARCHAR(36)  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    session_id    VARCHAR(36)  REFERENCES meeting_sessions(id) ON DELETE CASCADE,
    transcript_id VARCHAR(36)  REFERENCES meeting_transcripts(id) ON DELETE SET NULL,
    title         VARCHAR(300) NOT NULL,
    summary_type  VARCHAR(30)  NOT NULL DEFAULT 'minutes',
    content       TEXT         NOT NULL,
    created_by    VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_summaries_meeting_id    ON meeting_summaries (meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_summaries_session_id    ON meeting_summaries (session_id);
CREATE INDEX IF NOT EXISTS ix_meeting_summaries_transcript_id ON meeting_summaries (transcript_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_participants (
    id             VARCHAR(36)  PRIMARY KEY,
    meeting_id     VARCHAR(36)  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    stakeholder_id INTEGER,
    name           VARCHAR(200) NOT NULL,
    role           VARCHAR(100),
    attended       VARCHAR(5)   NOT NULL DEFAULT 'true',
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_participants_meeting_id ON meeting_participants (meeting_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_action_items (
    id          VARCHAR(36) PRIMARY KEY,
    meeting_id  VARCHAR(36) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    description TEXT        NOT NULL,
    assigned_to VARCHAR(200),
    due_date    DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes       TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_action_items_meeting_id ON meeting_action_items (meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_action_items_status     ON meeting_action_items (status);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_links (
    id         VARCHAR(36)  PRIMARY KEY,
    meeting_id VARCHAR(36)  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    label      VARCHAR(200) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    link_type  VARCHAR(30)  NOT NULL DEFAULT 'document',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_links_meeting_id ON meeting_links (meeting_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_relations (
    id            VARCHAR(36)  PRIMARY KEY,
    meeting_id    VARCHAR(36)  NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    entity_type   VARCHAR(40)  NOT NULL,
    entity_id     VARCHAR(36)  NOT NULL,
    relation_type VARCHAR(30)  NOT NULL DEFAULT 'related',
    label         VARCHAR(200),
    notes         TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_meeting_relations_meeting_id    ON meeting_relations (meeting_id);
CREATE INDEX IF NOT EXISTS ix_meeting_relations_entity        ON meeting_relations (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_meeting_relations_relation_type ON meeting_relations (relation_type);
