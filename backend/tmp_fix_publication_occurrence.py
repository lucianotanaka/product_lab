import psycopg2

DSN = "postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab"

SQL = """
BEGIN;

ALTER TABLE public.publications
    ADD COLUMN IF NOT EXISTS owner_name VARCHAR(200) NULL,
    ADD COLUMN IF NOT EXISTS occurrence_kind VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    ADD COLUMN IF NOT EXISTS operational_status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    ADD COLUMN IF NOT EXISTS due_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS followup_id VARCHAR(36) NULL,
    ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(36) NULL,
    ADD COLUMN IF NOT EXISTS outcome_summary TEXT NULL,
    ADD COLUMN IF NOT EXISTS next_occurrence_date DATE NULL,
    ADD COLUMN IF NOT EXISTS source_reason VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS is_followup_generated BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'publications'
          AND constraint_name = 'ck_publications_occurrence_kind'
    ) THEN
        ALTER TABLE public.publications
        ADD CONSTRAINT ck_publications_occurrence_kind
        CHECK (occurrence_kind IN ('SCHEDULED','EVENT','MANUAL','FOLLOW_UP','ESCALATION'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'publications'
          AND constraint_name = 'ck_publications_operational_status'
    ) THEN
        ALTER TABLE public.publications
        ADD CONSTRAINT ck_publications_operational_status
        CHECK (operational_status IN ('PLANNED','DUE','IN_PREPARATION','READY','PRESENTED','CANCELLED','OVERDUE'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'publications'
          AND constraint_name = 'fk_publications_followup'
    ) THEN
        ALTER TABLE public.publications
        ADD CONSTRAINT fk_publications_followup
        FOREIGN KEY (followup_id)
        REFERENCES public.followups (id)
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'publications'
          AND constraint_name = 'fk_publications_meeting_occurrence'
    ) THEN
        ALTER TABLE public.publications
        ADD CONSTRAINT fk_publications_meeting_occurrence
        FOREIGN KEY (meeting_id)
        REFERENCES public.meetings (id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_publications_operational_status
    ON public.publications (operational_status);

CREATE INDEX IF NOT EXISTS idx_publications_due_at
    ON public.publications (due_at);

CREATE INDEX IF NOT EXISTS idx_publications_followup_id
    ON public.publications (followup_id);

CREATE INDEX IF NOT EXISTS idx_publications_meeting_occurrence
    ON public.publications (meeting_id);

COMMIT;
"""

def main():
    conn = psycopg2.connect(DSN)
    try:
        conn.autocommit = False
        cur = conn.cursor()
        cur.execute(SQL)

        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'publications'
              AND column_name IN (
                'owner_name', 'occurrence_kind', 'operational_status',
                'due_at', 'occurred_at', 'followup_id', 'meeting_id',
                'outcome_summary', 'next_occurrence_date', 'source_reason',
                'is_followup_generated'
              )
            ORDER BY ordinal_position
        """)
        print("COLUMNS=", cur.fetchall())

        cur.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'publications'
              AND constraint_name IN (
                'ck_publications_occurrence_kind',
                'ck_publications_operational_status',
                'fk_publications_followup',
                'fk_publications_meeting_occurrence'
              )
            ORDER BY constraint_name
        """)
        print("CONSTRAINTS=", cur.fetchall())

        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'publications'
              AND indexname IN (
                'idx_publications_operational_status',
                'idx_publications_due_at',
                'idx_publications_followup_id',
                'idx_publications_meeting_occurrence'
              )
            ORDER BY indexname
        """)
        print("INDEXES=", cur.fetchall())

        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
