"""Test risks endpoint with product_id filter - detailed error capture."""
import urllib.request
import json
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

# Get products list
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/products?page=1&size=20",
    headers={"Cookie": f"pl_token={token}"}
)
with urllib.request.urlopen(req) as r:
    products = json.loads(r.read())

print("Products:")
for p in products.get("items", []):
    print(f"  id={p['product_id']} name={p.get('product_name', p.get('name', '?'))!r}")

# Test risks with each product_id - capture full response
for p in products.get("items", [])[:5]:
    pid = p["product_id"]
    req2 = urllib.request.Request(
        f"http://127.0.0.1:8000/api/v1/risks?page=1&size=500&product_id={pid}",
        headers={"Cookie": f"pl_token={token}"}
    )
    try:
        with urllib.request.urlopen(req2) as r2:
            body = json.loads(r2.read())
            print(f"OK  product_id={pid}: total={body['total']}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        headers = dict(e.headers)
        ct = headers.get("Content-Type", "?")
        print(f"FAIL product_id={pid}: HTTP {e.code} Content-Type={ct!r}")
        print(f"     body={raw[:500]!r}")
