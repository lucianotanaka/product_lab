import psycopg2

DSN = "postgresql://productlab:prdctmngr%402026@localhost:5432/product_lab"

SQL = """
BEGIN;

CREATE TABLE IF NOT EXISTS public.communication_audiences (
    communication_audience_id BIGSERIAL PRIMARY KEY,
    communication_id INT4 NOT NULL,
    audience_id INT4 NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    custom_language VARCHAR(10) NULL,
    custom_tone VARCHAR(50) NULL,
    custom_detail_level VARCHAR(30) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_communication_audiences_communication
        FOREIGN KEY (communication_id)
        REFERENCES public.communications (communication_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_communication_audiences_audience
        FOREIGN KEY (audience_id)
        REFERENCES public.audiences (audience_id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_communication_audiences
        UNIQUE (communication_id, audience_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_audiences_communication
    ON public.communication_audiences (communication_id);

CREATE INDEX IF NOT EXISTS idx_communication_audiences_audience
    ON public.communication_audiences (audience_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_audiences_one_primary
    ON public.communication_audiences (communication_id)
    WHERE is_primary = TRUE;

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
              AND table_name = 'communication_audiences'
            ORDER BY ordinal_position
        """)
        cols = cur.fetchall()

        cur.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'communication_audiences'
            ORDER BY constraint_name
        """)
        cons = cur.fetchall()

        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'communication_audiences'
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
