import sys, json, os, urllib.request, urllib.error

BASE = "http://localhost:8000/api/v1"
PID = 1  # NTT 360 product_id

def http(method, path, data=None, cookie="", token=""):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", f"Bearer {token}")
    if cookie: req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, body

# ── Auth ──────────────────────────────────────────────────────────────────────
print(">> Auth...")
import urllib.parse
login_body = urllib.parse.urlencode({"username":"luciano.tanaka@global.ntt","password":"ntt@2024"}).encode()
login_req = urllib.request.Request(f"{BASE}/auth/login", data=login_body, method="POST")
login_req.add_header("Content-Type","application/x-www-form-urlencoded")
try:
    with urllib.request.urlopen(login_req) as resp:
        sc = resp.status
        rd = json.loads(resp.read())
        # Capture Set-Cookie header for httpOnly cookie
        set_cookie = resp.headers.get("Set-Cookie","")
        CK = set_cookie.split(";")[0] if set_cookie else ""
except urllib.error.HTTPError as e:
    print(f"Login fail {e.code}: {e.read().decode()}"); sys.exit(1)
TOK = ""  # cookie-based auth; token not exposed
print(f"  OK cookie={'yes' if CK else 'no token'}")

def api(method, path, data=None):
    sc, rd = http(method, path, data, cookie=CK, token=TOK)
    if sc >= 400: print(f"  ERR {sc}: {str(rd)[:300]}")
    return sc, rd

# ── Domain ────────────────────────────────────────────────────────────────────
print("\n>> Business Domain CISCO-LCI...")
sc, rd = api("POST", "/business-domains", {
    "domain_code":"CISCO-LCI","domain_name":"Cisco Lifecycle Incentive",
    "description":"Dominio de negocio do programa Cisco LCI. Cobre tasks, activities, elegibilidade, opt-in/out e importacao via PXP. Todo recurso NTT 360 que toque dados LCI deve respeitar estas regras.",
    "owner":"Alliance Manager - Cisco Partnership","display_order":1
})
if sc in (200,201):
    DID = rd["id"]; print(f"  created id={DID}")
elif sc == 409:
    _, ds = api("GET", "/business-domains?include_inactive=true")
    d = next((x for x in (ds if isinstance(ds,list) else []) if x["domain_code"]=="CISCO-LCI"), None)
    if not d: print("  domain not found!"); sys.exit(1)
    DID = d["id"]; print(f"  exists id={DID}")
else: sys.exit(1)

# ── Subdomains ────────────────────────────────────────────────────────────────
SD = {"TASK":None,"ACT":None,"IMPORT":None}
SD_DEF = [
    ("CISCO-LCI-TASK","TASK","Task Management Rules","Ciclo de vida das tasks LCI: criacao, update, cancelamento, opt-in/out, elegibilidade.",1),
    ("CISCO-LCI-ACT","ACT","Activity Management Rules","Ciclo de vida das activities LCI: status, claim approval, deduplicacao, sync com task pai.",2),
    ("CISCO-LCI-IMPORT","IMPORT","Import Processing Rules","Regras operacionais dos importadores PXP: formato, chunks, cutoff FY, confirmacao, falhas.",3),
]
print("\n>> Subdomains...")
_, ex = api("GET", f"/business-domains/{DID}/subdomains")
for e in (ex if isinstance(ex,list) else []):
    for code,key,*_ in SD_DEF:
        if e["subdomain_code"]==code: SD[key]=e["id"]; print(f"  {code} exists id={SD[key]}")
for code,key,name,desc,order in SD_DEF:
    if SD[key]: continue
    sc,rd = api("POST",f"/business-domains/{DID}/subdomains",{"subdomain_code":code,"subdomain_name":name,"description":desc,"display_order":order})
    if sc in (200,201): SD[key]=rd["id"]; print(f"  created {code} id={SD[key]}")

# ── Load rules ────────────────────────────────────────────────────────────────
rules_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cisco_lci_rules.json")
with open(rules_file) as f: rules = json.load(f)

# Get existing codes
_,r2 = api("GET",f"/requirements?page=1&size=200&product_id={PID}")
existing = {x["requirement_code"] for x in (r2.get("items",[]) if isinstance(r2,dict) else [])}
print(f"\n>> Creating {len(rules)} requirements (already exist: {len(existing)})...")

created=0; linked=0
for code,sd_key,priority,title,desc,acceptance in rules:
    if code in existing: print(f"  {code} skip (exists)"); continue
    rtype = "BUSINESS" if sd_key in("TASK","ACT") else "INTEGRATION"
    sc,rd = api("POST","/requirements",{
        "requirement_code":code,"requirement_title":title,
        "requirement_description":desc,"requirement_type":rtype,
        "priority":priority,"lifecycle_status":"VALIDATED","fulfillment_status":"MET",
        "acceptance_definition":acceptance,
        "requirement_owner":"Bridge Adoption / NTT 360 Team",
        "requirement_source":f"DOCUMENT|bridge-adoption|pxp_import_task_6702+pxp_import_activity_5890",
        "product_id":PID,
    })
    if sc in (200,201):
        rid=rd["id"]; created+=1; print(f"  {code} created id={rid}")
        sc2,_ = api("POST",f"/business-domains/requirements/{rid}/domains",{"domain_id":DID,"subdomain_id":SD.get(sd_key)})
        if sc2 in (200,201): linked+=1; print(f"    linked => CISCO-LCI/{sd_key}")
        elif sc2==409: print(f"    already linked")

print(f"\n>> DONE: {created} created, {linked} linked")
print(f"   Domain id={DID} | TASK={SD['TASK']} ACT={SD['ACT']} IMPORT={SD['IMPORT']}")
