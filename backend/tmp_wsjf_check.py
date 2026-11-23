import sys
sys.path.insert(0, 'c:/Users/luciano.tanaka/Projects/product_lab/backend')

from sqlalchemy import text
from app.core.database import SessionLocal
import json

db = SessionLocal()

# Check all backlog_items rows for ado_id 34539
rows = db.execute(text(
    "SELECT item_id, product_id, wsjf_business_value, wsjf_time_criticality, "
    "wsjf_risk_reduction, wsjf_job_size, wsjf_score "
    "FROM backlog_items WHERE ado_id = '34539'"
)).mappings().all()

print("=== backlog_items rows with ado_id=34539 ===")
for r in rows:
    print(dict(r))

# Check last 3 sync logs
print("\n=== Last 3 sync logs ===")
logs = db.execute(text(
    "SELECT id, status, started_at, finished_at, items_created, items_updated, "
    "error_message, details "
    "FROM integration_sync_logs "
    "WHERE connection_id = 'c4b77b2f-4d15-4a7a-868b-46cd8d3e776d' "
    "ORDER BY started_at DESC LIMIT 3"
)).mappings().all()

for lg in logs:
    print({k: v for k, v in lg.items() if k != 'details'})
    if lg.get('details'):
        d = lg['details']
        if isinstance(d, str):
            d = json.loads(d)
        print("  missing_optional_fields:", d.get('missing_optional_fields'))
        print("  fetch_diagnostics keys :", list(d.get('fetch_diagnostics', {}).keys()) if d.get('fetch_diagnostics') else None)

db.close()
