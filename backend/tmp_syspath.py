"""Debug: find where app.main is actually loading from."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))
os.environ["SECRET_KEY"] = "dev-secret-key-productlab-2026"
os.environ["DATABASE_URL"] = "postgresql://postgres:nttbsp@localhost:5432/product_lab"

# Check sys.path
print("sys.path:")
for p in sys.path[:10]:
    print(f"  {p!r}")

# Check where app.main comes from
import app.main as m
print(f"\napp.main file: {m.__file__!r}")
print(f"healthcheck2 exists: {hasattr(m, 'healthcheck2')}")
print(f"health func: {m.health}")
import inspect
src = inspect.getsource(m.health)
print(f"health returns _code_version: {'_code_version' in src}")
