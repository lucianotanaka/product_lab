"""Find the exact failing risk between positions 11-15."""
import urllib.request, json, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.chdir(os.path.dirname(__file__))

from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

def call(page, size):
    req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/v1/risks?page={page}&size={size}&product_id=1",
        headers={"Cookie": f"pl_token={token}"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            body = json.loads(r.read())
            return True, body.get("items", [])
    except urllib.error.HTTPError as e:
        return False, e.read().decode()[:200]

# Test page 2 (items 11-15) to confirm failure
ok, result = call(page=3, size=5)  # page 3 = items 11-15
print(f"page=3 size=5 (items 11-15): {'OK' if ok else '500'}")
if ok:
    for i, r in enumerate(result):
        print(f"  [{i+11}] id={r['id']!r} title={r['title']!r} links={len(r['links'])}")

# Now use ORM directly to test _serialize_risk for each item
from dotenv import load_dotenv
load_dotenv(".env")
from app.core.database import SessionLocal
from app.models.risk import Risk, RiskLink, RiskLinkType, RiskStatus
from app.api.v1.endpoints.risks import _serialize_risk

db = SessionLocal()
import sqlalchemy as sa

# Get risks sorted same way as list_risks (by created_at DESC)
risks = db.query(Risk).filter(Risk.product_id == "1").order_by(sa.desc(Risk.created_at)).all()
print(f"\nTotal risks: {len(risks)}")
print("Testing serialization of each risk:")
for i, risk in enumerate(risks):
    try:
        out = _serialize_risk(risk, db)
        print(f"  [{i+1:2d}] OK  id={risk.id!r} links={len(out.links)}")
    except Exception as e:
        print(f"  [{i+1:2d}] FAIL id={risk.id!r} title={risk.title!r}")
        print(f"       {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

db.close()
