from fastapi import APIRouter
from .endpoints import auth, products, decisions, knowledge, prioritization, risks, roadmap, stakeholders, vpc, stats

router = APIRouter()
router.include_router(auth.router,            prefix="/auth",            tags=["Auth"])
router.include_router(products.router,        prefix="/products",        tags=["Products"])
router.include_router(decisions.router,       prefix="/decisions",       tags=["Decisions"])
router.include_router(knowledge.router,       prefix="/knowledge",       tags=["Knowledge"])
router.include_router(prioritization.router,  prefix="/prioritization",  tags=["Prioritization"])
router.include_router(risks.router,           prefix="/risks",           tags=["Risks"])
router.include_router(roadmap.router,         prefix="/roadmap",         tags=["Roadmap"])
router.include_router(stakeholders.router,    prefix="/stakeholders",    tags=["Stakeholders"])
router.include_router(vpc.router,             prefix="/vpc",             tags=["VPC"])
router.include_router(stats.router,           prefix="/stats",           tags=["Stats"])
