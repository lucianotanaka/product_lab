"""Check what version of code is running."""
import urllib.request, json
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET, algorithm="HS256"
)

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/health",
    headers={"Cookie": f"pl_token={token}"}
)
with urllib.request.urlopen(req) as r:
    body = json.loads(r.read())
    print("Health response:", json.dumps(body, indent=2))
