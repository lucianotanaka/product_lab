"""
Inspeciona o processo uvicorn ativo via HTTP para entender
qual roteador está sendo servido. Não modifica nada.
"""
import json
import urllib.request

BASE = "http://127.0.0.1:8000"

# 1. Contagem total de rotas no OpenAPI ativo
spec = json.loads(urllib.request.urlopen(f"{BASE}/api/openapi.json").read())
paths = spec.get("paths", {})
print(f"Total de rotas registradas no OpenAPI ativo: {len(paths)}")

# 2. Rotas que contêm 'opportunit'
opp_paths = sorted([p for p in paths if "opportunit" in p])
print(f"\nRotas com 'opportunit' ({len(opp_paths)}):")
for p in opp_paths:
    print(f"  {p}")

# 3. Verificação específica da nova família de rotas
new_routes = [
    "/api/v1/opportunities/opportunities",
    "/api/v1/opportunities/opportunities/{id}",
    "/api/v1/opportunities/opportunities/{opp_id}/sources",
    "/api/v1/opportunities/opportunities/{opp_id}/assessments",
]
print("\nVerificação das novas rotas de Opportunities:")
for r in new_routes:
    present = r in paths
    print(f"  {'OK' if present else 'FALTA'} | {r}")

# 4. Total de rotas que começam com /api/v1/discovery/opportunities
discovery_opp = [p for p in paths if p.startswith("/api/v1/discovery/opportunities")]
print(f"\nRotas legadas /api/v1/discovery/opportunities: {len(discovery_opp)}")

# 5. Inspecionar o openapi.json diretamente para descobrir versão/title
info = spec.get("info", {})
print(f"\nAPI info: title={info.get('title')} version={info.get('version')}")

# 6. Verificar se há diferença entre a versão local e a ativa
try:
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
    os.chdir(os.path.dirname(__file__))
    from app.main import app as local_app
    local_spec = local_app.openapi()
    local_paths = local_spec.get("paths", {})
    local_opp = sorted([p for p in local_paths if p.startswith("/api/v1/opportunities")])
    print(f"\nOpenAPI LOCAL (importado diretamente):")
    print(f"  Total de rotas: {len(local_paths)}")
    print(f"  Rotas /api/v1/opportunities ({len(local_opp)}):")
    for p in local_opp:
        print(f"    {p}")
    print(f"\n  Delta (presente no local mas ausente no ativo):")
    for p in local_opp:
        if p not in paths:
            print(f"    AUSENTE NO ATIVO: {p}")
except Exception as e:
    print(f"\nNão foi possível importar o app local: {e}")
