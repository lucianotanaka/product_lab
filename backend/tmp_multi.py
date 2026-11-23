"""Test health multiple times to see if different servers respond."""
import urllib.request, json
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

for i in range(8):
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/v1/health",
            headers={"Cookie": f"pl_token={token}"}
        )
        with urllib.request.urlopen(req) as r:
            body = json.loads(r.read())
            ver = body.get("_code_version", "OLD-CODE")
            print(f"  [{i+1}] {ver} env={body.get('env')}")
    except Exception as e:
        print(f"  [{i+1}] ERROR: {e}")

# Also test risks with product_id
print("\nRisks endpoint:")
for i in range(3):
    req2 = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/risks?page=1&size=11&product_id=1",
        headers={"Cookie": f"pl_token={token}"}
    )
    try:
        with urllib.request.urlopen(req2) as r2:
            body2 = json.loads(r2.read())
            print(f"  [{i+1}] OK total={body2.get('total')} items={len(body2.get('items',[]))}")
    except urllib.error.HTTPError as e:
        print(f"  [{i+1}] HTTP {e.code} ct={e.headers.get('Content-Type','?')!r} {e.read().decode()[:80]!r}")
