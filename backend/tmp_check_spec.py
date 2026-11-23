"""Check OpenAPI spec for risks endpoint to identify which code is running."""
import urllib.request, json

with urllib.request.urlopen("http://127.0.0.1:8000/api/openapi.json") as r:
    spec = json.loads(r.read())

# Find /api/v1/risks GET endpoint
path_data = spec.get("paths", {}).get("/api/v1/risks", {}).get("get", {})
params = path_data.get("parameters", [])
print("GET /api/v1/risks parameters:")
for p in params:
    print(f"  {p.get('name')!r} in={p.get('in')} required={p.get('required')}")

# Check if risk_status or status is there
param_names = [p.get("name") for p in params]
if "risk_status" in param_names:
    print("\nNEW CODE: 'risk_status' parameter found")
elif "status" in param_names:
    print("\nOLD CODE: 'status' parameter found")

# Check if response_model is Paginated
print("\nResponse schemas for GET /api/v1/risks:")
responses = path_data.get("responses", {})
for code, r in responses.items():
    content = r.get("content", {})
    for ct, schema_info in content.items():
        schema_ref = schema_info.get("schema", {}).get("$ref", "?")
        print(f"  {code} {ct}: {schema_ref}")
