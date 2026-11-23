"""Test if app.main imports correctly with new code."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))
os.environ["SECRET_KEY"] = "dev-secret-key-productlab-2026"
os.environ["DATABASE_URL"] = "postgresql://postgres:nttbsp@localhost:5432/product_lab"

# Import app.main
from app.main import healthcheck2
print("LOADED OK - healthcheck2 exists:", healthcheck2)

# Also verify risks endpoint has the new code
from app.api.v1.endpoints.risks import list_risks
import inspect
sig = inspect.signature(list_risks)
print("list_risks params:", list(sig.parameters.keys()))
if "risk_status" in sig.parameters:
    print("CONFIRMED: new parameter 'risk_status' found (not 'status')")
elif "status" in sig.parameters:
    print("WARNING: old parameter 'status' found - old code loaded!")
else:
    print("no status/risk_status param found")
