"""Use TestClient to test the risks endpoint with full FastAPI stack."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

token = create_access_token({"sub": "luciano.tanaka@global.ntt"})

client = TestClient(app, raise_server_exceptions=False)

# Test without product_id
r = client.get("/api/v1/risks?page=1&size=5",
               cookies={"pl_token": token})
print(f"No product_id: HTTP {r.status_code}")
if r.status_code != 200:
    print(f"  body={r.text[:500]!r}")

# Test with product_id=1
r2 = client.get("/api/v1/risks?page=1&size=500&product_id=1",
                cookies={"pl_token": token})
print(f"product_id=1:  HTTP {r2.status_code}")
if r2.status_code != 200:
    print(f"  headers={dict(r2.headers)}")
    print(f"  body={r2.text[:800]!r}")
else:
    body = r2.json()
    print(f"  total={body['total']} items={len(body['items'])}")
