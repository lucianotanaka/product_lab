"""
Direct WSJF fix for backlog_items where the sync ran on old server code.
Fetches the correct values directly from ADO and updates backlog_items.
"""
import sys
sys.path.insert(0, 'c:/Users/luciano.tanaka/Projects/product_lab/backend')

from app.core.database import SessionLocal
from app.models.backlog import BacklogItem
from app.models.integration import IntegrationConnection
from app.api.v1.endpoints.integrations import (
    _fetch_ado_work_items, _extract_wsjf_fields, _safe_int
)
from decimal import Decimal

db = SessionLocal()

conn_id = 'c4b77b2f-4d15-4a7a-868b-46cd8d3e776d'
c = db.query(IntegrationConnection).filter(IntegrationConnection.id == conn_id).first()
if not c:
    print("Connection not found")
    db.close()
    sys.exit(1)

product_id = c.product_id
print(f"Connection: {c.name}, product_id={product_id}")

# Fetch ALL items from ADO (uses the fixed field_list including optional WSJF fields)
print("Fetching items from ADO with full field list...")
ado_items, missing_fields, diag = _fetch_ado_work_items(c)
print(f"ADO returned {len(ado_items)} items")
print(f"missing_optional_fields: {missing_fields}")

updated = 0
skipped = 0
wsjf_zero = 0

for wi in ado_items:
    f = wi.get("fields", {})
    ado_id = str(wi.get("id", ""))
    story_pts = _safe_int(f.get("Microsoft.VSTS.Scheduling.StoryPoints"))
    wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, wsjf_score = _extract_wsjf_fields(f, story_pts)

    # Only update if we have at least one non-None WSJF value
    if all(v is None for v in (wsjf_bv, wsjf_tc, wsjf_rr, wsjf_js, wsjf_score)):
        skipped += 1
        continue

    item = db.query(BacklogItem).filter(
        BacklogItem.ado_id == ado_id,
        BacklogItem.product_id == product_id
    ).first()
    if not item:
        skipped += 1
        continue

    old_bv = item.wsjf_business_value
    new_bv = wsjf_bv if wsjf_bv is not None else 0
    new_tc = wsjf_tc if wsjf_tc is not None else 0
    new_rr = wsjf_rr if wsjf_rr is not None else 0
    new_js = wsjf_js if wsjf_js is not None else 0
    new_sc = wsjf_score if wsjf_score is not None else Decimal("0.0")

    item.wsjf_business_value = new_bv
    item.wsjf_time_criticality = new_tc
    item.wsjf_risk_reduction = new_rr
    item.wsjf_job_size = new_js
    item.wsjf_score = new_sc
    updated += 1

    if ado_id == '34539' or old_bv != new_bv:
        print(f"  ado_id={ado_id}: bv={old_bv}->{new_bv} tc={new_tc} rr={new_rr} js={new_js} score={new_sc}")

db.commit()
print(f"\nDone: updated={updated}, skipped={skipped}")
print("Item 34539 final values:")
item = db.query(BacklogItem).filter(BacklogItem.ado_id == '34539').first()
if item:
    print(f"  wsjf_business_value  = {item.wsjf_business_value}")
    print(f"  wsjf_time_criticality= {item.wsjf_time_criticality}")
    print(f"  wsjf_risk_reduction  = {item.wsjf_risk_reduction}")
    print(f"  wsjf_job_size        = {item.wsjf_job_size}")
    print(f"  wsjf_score           = {item.wsjf_score}")
db.close()
