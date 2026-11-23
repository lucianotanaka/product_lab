"""Compare no-filter vs product_id filter on the live server."""
import urllib.request, json
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

def call(path):
    req = urllib.request.Request(
        f"http://127.0.0.1:8000{path}",
        headers={"Cookie": f"pl_token={token}"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            body = json.loads(r.read())
            return f"HTTP 200 total={body.get('total')} items={len(body.get('items',[]))}"
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        ct = e.headers.get("Content-Type", "?")
        return f"HTTP {e.code} ct={ct!r} body={raw[:300]!r}"
    except Exception as e:
        return f"ERROR: {e}"

print("no filter:    ", call("/api/v1/risks?page=1&size=5"))
print("product_id=1: ", call("/api/v1/risks?page=1&size=5&product_id=1"))
print("product_id=1 size=500:", call("/api/v1/risks?page=1&size=500&product_id=1"))
print("health:       ", call("/api/v1/health"))
