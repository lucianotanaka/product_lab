"""Get OpenAPI spec to see what routes are registered."""
import urllib.request, json
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

# Get OpenAPI spec (no auth needed)
with urllib.request.urlopen("http://127.0.0.1:8000/api/openapi.json") as r:
    spec = json.loads(r.read())

# Find /health and /healthcheck2 in paths
paths = spec.get("paths", {})
print("Paths matching 'health':")
for p in sorted(paths.keys()):
    if "health" in p:
        print(f"  {p}")

print(f"\nTotal registered paths: {len(paths)}")
print("First few paths:")
for p in sorted(paths.keys())[:5]:
    print(f"  {p}")
