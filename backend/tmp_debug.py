"""Direct ORM test to find the 500 error cause."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.chdir(os.path.dirname(__file__))

# Load env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.core.database import SessionLocal
from app.models.risk import Risk, RiskLink, RiskLinkType, RiskStatus
from datetime import datetime

db = SessionLocal()

# 1. Check actual product_id column type
result = db.execute(__import__("sqlalchemy").text(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name='risks' AND table_schema='public' ORDER BY ordinal_position"
)).fetchall()
print("risks columns:")
for row in result:
    print(f"  {row[0]}: {row[1]}")

# 2. Check sample product_id values
rows = db.execute(__import__("sqlalchemy").text(
    "SELECT id, product_id, title, status FROM risks LIMIT 3"
)).fetchall()
print("\nSample risks:")
for r in rows:
    print(f"  id={r[0]} product_id={r[1]!r} (type={type(r[1]).__name__}) title={r[2]!r} status={r[3]!r}")

# 3. Test ORM filter with product_id="1"
try:
    from app.repositories.base import BaseRepository
    total, items = BaseRepository(Risk, db).list(skip=0, limit=5, product_id="1")
    print(f"\nORM filter product_id='1': total={total}, items={len(items)}")
    
    # 4. Test serialization of each item
    for item in items[:3]:
        try:
            links_rows = db.query(RiskLink).filter(RiskLink.risk_id == item.id).all()
            print(f"  risk id={item.id!r} product_id={item.product_id!r} status={item.status!r} links={len(links_rows)}")
            # Test RiskStatus conversion
            sv = RiskStatus(item.status) if item.status is not None else RiskStatus.identified
            print(f"    status_value={sv}")
        except Exception as e:
            print(f"  ERROR serializing risk {item.id}: {type(e).__name__}: {e}")
except Exception as e:
    import traceback
    print(f"\nORM list FAILED: {type(e).__name__}: {e}")
    traceback.print_exc()

db.close()
print("\nDone.")
