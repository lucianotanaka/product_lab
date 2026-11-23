"""Direct test for flows stakeholders endpoints with JWT cookie."""
import urllib.request
import urllib.error
from jose import jwt
from datetime import datetime, timedelta

SECRET = "dev-secret-key-productlab-2026"
token = jwt.encode(
    {"sub": "luciano.tanaka@global.ntt", "exp": datetime.utcnow() + timedelta(hours=2)},
    SECRET,
    algorithm="HS256",
)

for path in [
    "/api/v1/healthcheck2",
    "/api/v1/health",
    "/api/v1/flows/products/1/stakeholders",
    "/api/v1/flows/products/1/stakeholders-summary",
]:
    req = urllib.request.Request(
        f"http://127.0.0.1:8000{path}",
        headers={"Cookie": f"pl_token={token}"},
    )
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode()
            print(f"{path}: HTTP {response.status} -> {body[:500]!r}")
    except urllib.error.HTTPError as error:
        body = error.read().decode()
        print(f"{path}: HTTP {error.code} ct={error.headers.get('Content-Type', '?')!r} -> {body[:500]!r}")
