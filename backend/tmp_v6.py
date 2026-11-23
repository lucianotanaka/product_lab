"""Inspect links for risks 11-15 and test HTTP serialization chain."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))
from dotenv import load_dotenv; load_dotenv(".env")

from app.core.database import SessionLocal
from app.models.risk import Risk, RiskLink
import sqlalchemy as sa

db = SessionLocal()

# Get risks sorted by created_at DESC (same as list_risks)
risks = db.query(Risk).filter(Risk.product_id == "1").order_by(sa.desc(Risk.created_at)).all()

print("Risks with links:")
for i, r in enumerate(risks):
    links = db.query(RiskLink).filter(RiskLink.risk_id == r.id).all()
    if links:
        for lnk in links:
            print(f"  [{i+1:2d}] risk={r.id!r} entity_type={lnk.entity_type!r} entity_id={lnk.entity_id!r}")

# Now test HTTP layer with FastAPI response serialization directly
# Test if the issue is in jsonable_encoder
from fastapi.encoders import jsonable_encoder
from app.api.v1.endpoints.risks import _serialize_risk

print("\nTesting jsonable_encoder for each risk:")
for i, r in enumerate(risks):
    try:
        out = _serialize_risk(r, db)
        encoded = jsonable_encoder(out)
        # Try JSON serialization
        import json
        json.dumps(encoded)
        print(f"  [{i+1:2d}] OK")
    except Exception as e:
        print(f"  [{i+1:2d}] FAIL: {type(e).__name__}: {e}")
        import traceback; traceback.print_exc()

db.close()
print("\nDone.")
