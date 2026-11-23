import psycopg2

DSN = "postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab"

SQL = """
BEGIN;

ALTER TABLE public.communication_links
    ADD COLUMN IF NOT EXISTS notes TEXT NULL;

ALTER TABLE public.communication_links
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.communication_links
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.communication_links
    ADD COLUMN IF NOT EXISTS link_role VARCHAR(30) NOT NULL DEFAULT 'RELATED';

ALTER TABLE public.communication_links
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'communication_links'
          AND constraint_name = 'fk_communication_links_communication'
    ) THEN
        ALTER TABLE public.communication_links
        ADD CONSTRAINT fk_communication_links_communication
        FOREIGN KEY (communication_id)
        REFERENCES public.communications (communication_id)
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'communication_links'
          AND constraint_name = 'ck_communication_links_entity_type'
    ) THEN
        ALTER TABLE public.communication_links
        ADD CONSTRAINT ck_communication_links_entity_type
        CHECK (entity_type IN (
            'OPPORTUNITY',
            'ROADMAP_ITEM',
            'BACKLOG_ITEM',
            'RISK',
            'DECISION',
            'REQUIREMENT'
        ));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'communication_links'
          AND constraint_name = 'ck_communication_links_link_role'
    ) THEN
        ALTER TABLE public.communication_links
        ADD CONSTRAINT ck_communication_links_link_role
        CHECK (link_role IN (
            'PRIMARY',
            'RELATED',
            'SOURCE',
            'TARGET'
        ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_communication_links_communication_id
    ON public.communication_links (communication_id);

CREATE INDEX IF NOT EXISTS idx_communication_links_entity
    ON public.communication_links (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_communication_links_primary
    ON public.communication_links (entity_type, entity_id, is_primary);

CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_links_unique_link
    ON public.communication_links (communication_id, entity_type, entity_id, link_role);

CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_links_one_primary_per_entity
    ON public.communication_links (entity_type, entity_id)
    WHERE is_primary = TRUE;

DROP TRIGGER IF EXISTS trg_communication_links_updated_at ON public.communication_links;

CREATE TRIGGER trg_communication_links_updated_at
BEFORE UPDATE ON public.communication_links
FOR EACH ROW
EXECUTE FUNCTION public.set_communication_links_updated_at();

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
              AND table_name = 'communication_links'
            ORDER BY ordinal_position
        """)
        cols = cur.fetchall()

        cur.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'communication_links'
            ORDER BY constraint_name
        """)
        cons = cur.fetchall()

        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'communication_links'
            ORDER BY indexname
        """)
        idx = cur.fetchall()

        print("COLUMNS=", cols)
        print("CONSTRAINTS=", cons)
        print("INDEXES=", idx)

        cur.close()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
