from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from .endpoints import (
    auth, products, decisions, knowledge, prioritization, risks,
    roadmap, stakeholders, vpc, stats, backlog, communication,
    users, team_members, discovery, discovery_business, opportunities, requirements, process_mapping,
    companies, business_areas, integrations, meetings, attachments,
    raci, followups, business_domains, flows_data, wsjf, executive_report,
)

router = APIRouter()

# ── Rotas públicas (sem autenticação) ─────────────────────────────────────────
# auth expõe /login, /register, /forgot-password e /reset-password publicamente;
# as rotas /me/* dentro de auth.py já usam Depends(get_current_user) individualmente.
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(flows_data.router, prefix="", tags=["Flows Data API"])

# ── Rotas protegidas — JWT obrigatório em TODOS os endpoints ──────────────────
_auth = [Depends(get_current_user)]

router.include_router(users.router,           prefix="/users",           tags=["Users (Admin)"],    dependencies=_auth)
router.include_router(products.router,        prefix="/products",        tags=["Products"],         dependencies=_auth)
router.include_router(decisions.router,       prefix="/decisions",       tags=["Decisions"],        dependencies=_auth)
router.include_router(knowledge.router,       prefix="/knowledge",       tags=["Knowledge"],        dependencies=_auth)
router.include_router(prioritization.router,  prefix="/prioritization",  tags=["Prioritization"],   dependencies=_auth)
router.include_router(risks.router,           prefix="/risks",           tags=["Risks"],            dependencies=_auth)
router.include_router(roadmap.router,         prefix="/roadmap",         tags=["Roadmap"],          dependencies=_auth)
router.include_router(stakeholders.router,    prefix="/stakeholders",    tags=["Stakeholders"],     dependencies=_auth)
router.include_router(vpc.router,             prefix="/vpc",             tags=["VPC"],              dependencies=_auth)
router.include_router(stats.router,           prefix="/stats",           tags=["Stats"],            dependencies=_auth)
router.include_router(backlog.router,         prefix="/backlog",         tags=["Backlog"],          dependencies=_auth)
router.include_router(communication.router,   prefix="/communication",   tags=["Communication"],    dependencies=_auth)
router.include_router(team_members.router,    prefix="/team-members",    tags=["Team Members"],     dependencies=_auth)
router.include_router(discovery.router,       prefix="/discovery",       tags=["Discovery"],        dependencies=_auth)
router.include_router(discovery_business.router, prefix="/discovery",    tags=["Discovery Business"], dependencies=_auth)
router.include_router(opportunities.router,   prefix="/opportunities",   tags=["Opportunities"],    dependencies=_auth)
router.include_router(requirements.router,    prefix="/requirements",    tags=["Requirements"],     dependencies=_auth)
router.include_router(process_mapping.router, prefix="/processes",       tags=["Process Mapping"],  dependencies=_auth)
router.include_router(business_areas.router,  prefix="/business-areas",  tags=["Business Areas"],   dependencies=_auth)
router.include_router(companies.router,       prefix="/companies",       tags=["Companies"],        dependencies=_auth)
router.include_router(integrations.router,    prefix="/integrations",    tags=["Integrations"],     dependencies=_auth)
router.include_router(meetings.router,        prefix="/meetings",        tags=["Meetings"],         dependencies=_auth)
router.include_router(attachments.router,     prefix="/attachments",     tags=["Attachments"],      dependencies=_auth)
router.include_router(raci.router,            prefix="/raci",            tags=["RACI"],             dependencies=_auth)
router.include_router(business_domains.router, prefix="/business-domains", tags=["Business Domains"], dependencies=_auth)
router.include_router(followups.router,       prefix="/followups",       tags=["Follow-Ups"],       dependencies=_auth)
router.include_router(wsjf.router,            prefix="/wsjf",            tags=["WSJF"],             dependencies=_auth)
router.include_router(executive_report.router, prefix="/executive-report", tags=["Executive Report"], dependencies=_auth)
