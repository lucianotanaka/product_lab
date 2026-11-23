"""Diagnóstico: qual main.py está sendo carregado pelo venv ativo."""
import sys
import os

print("=== sys.path ===")
for p in sys.path:
    print(" ", p)

print("\n=== app.main.__file__ ===")
try:
    import app.main as m
    print("  ", m.__file__)
except Exception as e:
    print("  ERRO:", e)

print("\n=== app.api.v1.router.__file__ ===")
try:
    import app.api.v1.router as r
    print("  ", r.__file__)
    opp = [rt.path for rt in r.router.routes if hasattr(rt, "path") and "opportunit" in rt.path]
    print("  opp routes:", opp)
except Exception as e:
    print("  ERRO:", e)

print("\n=== CWD ===")
print(" ", os.getcwd())
