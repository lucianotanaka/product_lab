import sys
sys.path.insert(0, 'c:/Users/luciano.tanaka/Projects/product_lab/backend')

from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()

# Check enablers
print("=== Enabler rows (enabler_type IS NOT NULL) ===")
rows = db.execute(text(
    "SELECT item_id, title, ado_work_item_type, enabler_type, "
    "item_type_id FROM backlog_items "
    "WHERE product_id=1 AND enabler_type IS NOT NULL LIMIT 10"
)).mappings().all()
for r in rows:
    print(dict(r))

print()
print("=== Item type name counts ===")
rows2 = db.execute(text(
    "SELECT bit.name, count(*) as cnt "
    "FROM backlog_items bi "
    "JOIN backlog_item_types bit ON bi.item_type_id=bit.item_type_id "
    "WHERE bi.product_id=1 "
    "GROUP BY bit.name ORDER BY cnt DESC"
)).mappings().all()
for r in rows2:
    print(dict(r))

print()
print("=== Sample backlog items from API format (first 5) ===")
rows3 = db.execute(text(
    "SELECT bi.item_id, bi.title, bi.ado_work_item_type, bi.enabler_type, "
    "bit.name as item_type_name "
    "FROM backlog_items bi "
    "LEFT JOIN backlog_item_types bit ON bi.item_type_id=bit.item_type_id "
    "WHERE bi.product_id=1 "
    "ORDER BY bi.item_id LIMIT 10"
)).mappings().all()
for r in rows3:
    print(dict(r))

db.close()
