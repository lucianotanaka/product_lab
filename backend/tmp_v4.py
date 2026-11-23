"""Binary search to find which risk index causes the 500."""
import urllib.request, json
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

def call(size, skip=0):
    path = f"/api/v1/risks?page=1&size={size}&product_id=1"
    # We can't pass skip directly, but use page trick
    req = urllib.request.Request(
        f"http://127.0.0.1:8000{path}",
        headers={"Cookie": f"pl_token={token}"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            body = json.loads(r.read())
            return True, body.get("total"), len(body.get("items", []))
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode()[:100]

# Binary search: find the smallest size that causes 500
print("Testing sizes:")
for size in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 36]:
    ok, a, b = call(size)
    status = "OK " if ok else "500"
    print(f"  size={size:3d}: {status}  total={a} items={b}")
    if not ok:
        print(f"    First failure at size={size}")
        break
