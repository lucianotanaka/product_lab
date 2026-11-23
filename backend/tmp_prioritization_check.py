import sys
sys.path.insert(0, r"c:\Users\luciano.tanaka\Projects\product_lab\backend")

from sqlalchemy import text
from app.core.database import SessionLocal

db = SessionLocal()

print("=== Quarter prioritization rows ===")
quarter_rows = db.execute(text("""
SELECT
  id,
  company_id,
  product_id,
  roadmap_item_id,
  fiscal_year,
  quarter,
  priority_rank,
  planning_status,
  created_at,
  updated_at
FROM quarter_prioritization_items
WHERE product_id = '1'
ORDER BY fiscal_year DESC, quarter ASC, priority_rank ASC NULLS LAST, updated_at DESC
""")).mappings().all()
for r in quarter_rows:
    print(dict(r))

print()
print("=== Matching roadmap rows ===")
roadmap_rows = db.execute(text("""
SELECT
  id,
  product_id,
  title
FROM roadmap_items
WHERE id IN (
  SELECT roadmap_item_id
  FROM quarter_prioritization_items
  WHERE product_id = '1'
)
ORDER BY title
""")).mappings().all()
for r in roadmap_rows:
    print(dict(r))

print()
print("=== Simulated API payload (/prioritization/quarter/items) ===")
api_rows = db.execute(text("""
SELECT
  q.id,
  q.company_id,
  q.product_id,
  q.roadmap_item_id,
  r.title AS roadmap_title,
  q.fiscal_year,
  q.quarter,
  q.priority_rank,
  q.planning_status
FROM quarter_prioritization_items q
LEFT JOIN roadmap_items r
  ON r.id = q.roadmap_item_id
WHERE CAST(q.product_id AS TEXT) = '1'
  AND q.fiscal_year = 2026
ORDER BY q.fiscal_year DESC, q.quarter ASC, q.priority_rank ASC NULLS LAST, q.updated_at DESC
""")).mappings().all()
for r in api_rows:
    print(dict(r))

db.close()
