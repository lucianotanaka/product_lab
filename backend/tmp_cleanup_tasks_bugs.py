from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

count_sql = text("""
SELECT COALESCE(bit.name, 'SEM_TIPO') AS name, COUNT(*) AS qty
FROM backlog_items bi
LEFT JOIN backlog_item_types bit ON bit.item_type_id = bi.item_type_id
WHERE lower(COALESCE(bit.name, '')) IN ('task', 'bug')
GROUP BY COALESCE(bit.name, 'SEM_TIPO')
ORDER BY 1
""")

delete_links_sql = text("""
DELETE FROM backlog_item_links
WHERE source_id IN (
    SELECT bi.item_id
    FROM backlog_items bi
    LEFT JOIN backlog_item_types bit ON bit.item_type_id = bi.item_type_id
    WHERE lower(COALESCE(bit.name, '')) IN ('task', 'bug')
)
OR target_id IN (
    SELECT bi.item_id
    FROM backlog_items bi
    LEFT JOIN backlog_item_types bit ON bit.item_type_id = bi.item_type_id
    WHERE lower(COALESCE(bit.name, '')) IN ('task', 'bug')
)
""")

delete_notes_sql = text("""
DELETE FROM backlog_item_notes
WHERE item_id IN (
    SELECT bi.item_id
    FROM backlog_items bi
    LEFT JOIN backlog_item_types bit ON bit.item_type_id = bi.item_type_id
    WHERE lower(COALESCE(bit.name, '')) IN ('task', 'bug')
)
""")

delete_items_sql = text("""
DELETE FROM backlog_items
WHERE item_id IN (
    SELECT bi.item_id
    FROM backlog_items bi
    LEFT JOIN backlog_item_types bit ON bit.item_type_id = bi.item_type_id
    WHERE lower(COALESCE(bit.name, '')) IN ('task', 'bug')
)
""")

with engine.begin() as conn:
    before = conn.execute(count_sql).fetchall()
    print("BEFORE:", before)

    links_deleted = conn.execute(delete_links_sql).rowcount
    notes_deleted = conn.execute(delete_notes_sql).rowcount
    items_deleted = conn.execute(delete_items_sql).rowcount

    after = conn.execute(count_sql).fetchall()
    print("LINKS_DELETED:", links_deleted)
    print("NOTES_DELETED:", notes_deleted)
    print("ITEMS_DELETED:", items_deleted)
    print("AFTER:", after)
