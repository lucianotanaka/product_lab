from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.repositories.base import BaseRepository
from app.models.discovery import (
    DiscoveryOpportunity, OpportunityStatus,
    DiscoveryProblemStatement,
    DiscoveryPersona,
    DiscoveryJTBD, JobType,
    DiscoveryResearch, ResearchType, ReliabilityLevel,
    DiscoveryInsight, ImpactLevel, ConfidenceLevel,
    DiscoveryAssumption, AssumptionType, AssumptionStatus, UncertaintyLevel,
    DiscoverySolutionIdea, SolutionComplexity, SolutionStatus,
    DiscoveryExperiment, ExperimentMethod, ExperimentStatus,
    DiscoverySuccessMetric, MetricType,
)

router = APIRouter()

# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_or_404(model, id: str, db: Session):
    obj = BaseRepository(model, db).get(id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


# ══════════════════════════════════════════════════════════════════════════════
# 1. OPPORTUNITIES
# ══════════════════════════════════════════════════════════════════════════════

class OpportunityCreate(BaseModel):
    product_id: int
    title: str
    description: Optional[str] = None
    origin: Optional[str] = None
    impacted_area: Optional[str] = None
    responsible: Optional[str] = None
    identified_at: Optional[date] = None
    status: OpportunityStatus = OpportunityStatus.identified
    priority: int = Field(default=3, ge=1, le=5)

class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    origin: Optional[str] = None
    impacted_area: Optional[str] = None
    responsible: Optional[str] = None
    identified_at: Optional[date] = None
    status: Optional[OpportunityStatus] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)

class OpportunityOut(BaseModel):
    id: str; product_id: int; title: str
    description: Optional[str] = None
    origin: Optional[str] = None
    impacted_area: Optional[str] = None
    responsible: Optional[str] = None
    identified_at: Optional[date] = None
    status: OpportunityStatus
    priority: int
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities", response_model=list[OpportunityOut])
def list_opportunities(product_id: Optional[int] = None, status: Optional[OpportunityStatus] = None, db: Session = Depends(get_db)):
    q = db.query(DiscoveryOpportunity)
    if product_id: q = q.filter(DiscoveryOpportunity.product_id == product_id)
    if status:     q = q.filter(DiscoveryOpportunity.status == status)
    return [OpportunityOut.model_validate(o) for o in q.order_by(DiscoveryOpportunity.created_at.desc()).all()]

@router.post("/opportunities", response_model=OpportunityOut, status_code=status.HTTP_201_CREATED)
def create_opportunity(body: OpportunityCreate, db: Session = Depends(get_db)):
    return BaseRepository(DiscoveryOpportunity, db).create(body.model_dump())

@router.get("/opportunities/{id}", response_model=OpportunityOut)
def get_opportunity(id: str, db: Session = Depends(get_db)):
    return _get_or_404(DiscoveryOpportunity, id, db)

@router.patch("/opportunities/{id}", response_model=OpportunityOut)
def update_opportunity(id: str, body: OpportunityUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryOpportunity, db)
    return repo.update(_get_or_404(DiscoveryOpportunity, id, db), body.model_dump(exclude_unset=True))

@router.delete("/opportunities/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryOpportunity, db).delete(_get_or_404(DiscoveryOpportunity, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 2. PROBLEM STATEMENTS
# ══════════════════════════════════════════════════════════════════════════════

class ProblemStatementUpsert(BaseModel):
    observed_problem: Optional[str] = None
    who_is_affected: Optional[str] = None
    current_impact: Optional[str] = None
    available_evidence: Optional[str] = None
    consequence_of_inaction: Optional[str] = None

class ProblemStatementOut(BaseModel):
    id: str; opportunity_id: str
    observed_problem: Optional[str] = None
    who_is_affected: Optional[str] = None
    current_impact: Optional[str] = None
    available_evidence: Optional[str] = None
    consequence_of_inaction: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/problem-statement", response_model=Optional[ProblemStatementOut])
def get_problem_statement(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    obj = db.query(DiscoveryProblemStatement).filter(DiscoveryProblemStatement.opportunity_id == opp_id).first()
    return ProblemStatementOut.model_validate(obj) if obj else None

@router.put("/opportunities/{opp_id}/problem-statement", response_model=ProblemStatementOut)
def upsert_problem_statement(opp_id: str, body: ProblemStatementUpsert, db: Session = Depends(get_db)):
    """Create or fully replace the problem statement for an opportunity."""
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    obj = db.query(DiscoveryProblemStatement).filter(DiscoveryProblemStatement.opportunity_id == opp_id).first()
    data = body.model_dump()
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        db.commit(); db.refresh(obj)
    else:
        obj = DiscoveryProblemStatement(opportunity_id=opp_id, **data)
        db.add(obj); db.commit(); db.refresh(obj)
    return ProblemStatementOut.model_validate(obj)


# ══════════════════════════════════════════════════════════════════════════════
# 3. PERSONAS
# ══════════════════════════════════════════════════════════════════════════════

class PersonaCreate(BaseModel):
    product_id: int
    opportunity_id: Optional[str] = None
    name: str
    role: Optional[str] = None
    objectives: Optional[str] = None
    responsibilities: Optional[str] = None
    usage_context: Optional[str] = None
    main_needs: Optional[str] = None
    constraints: Optional[str] = None

class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    objectives: Optional[str] = None
    responsibilities: Optional[str] = None
    usage_context: Optional[str] = None
    main_needs: Optional[str] = None
    constraints: Optional[str] = None
    opportunity_id: Optional[str] = None

class PersonaOut(BaseModel):
    id: str; product_id: int; opportunity_id: Optional[str] = None
    name: str; role: Optional[str] = None
    objectives: Optional[str] = None; responsibilities: Optional[str] = None
    usage_context: Optional[str] = None; main_needs: Optional[str] = None
    constraints: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/personas", response_model=list[PersonaOut])
def list_personas(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryPersona).filter(DiscoveryPersona.opportunity_id == opp_id).all()
    return [PersonaOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/personas", response_model=PersonaOut, status_code=status.HTTP_201_CREATED)
def create_persona(opp_id: str, body: PersonaCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoveryPersona, db).create(data)

@router.patch("/personas/{id}", response_model=PersonaOut)
def update_persona(id: str, body: PersonaUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryPersona, db)
    return repo.update(_get_or_404(DiscoveryPersona, id, db), body.model_dump(exclude_unset=True))

@router.delete("/personas/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_persona(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryPersona, db).delete(_get_or_404(DiscoveryPersona, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 4. JTBD
# ══════════════════════════════════════════════════════════════════════════════

class JTBDCreate(BaseModel):
    product_id: int
    opportunity_id: Optional[str] = None
    description: str
    job_type: JobType = JobType.principal
    priority: int = Field(default=3, ge=1, le=5)
    frequency: Optional[str] = None
    context: Optional[str] = None
    expected_result: Optional[str] = None
    vpc_item_id: Optional[str] = None

class JTBDUpdate(BaseModel):
    description: Optional[str] = None
    job_type: Optional[JobType] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    frequency: Optional[str] = None
    context: Optional[str] = None
    expected_result: Optional[str] = None
    vpc_item_id: Optional[str] = None

class JTBDOut(BaseModel):
    id: str; product_id: int; opportunity_id: Optional[str] = None
    description: str; job_type: JobType; priority: int
    frequency: Optional[str] = None; context: Optional[str] = None
    expected_result: Optional[str] = None; vpc_item_id: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/jtbd", response_model=list[JTBDOut])
def list_jtbd(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryJTBD).filter(DiscoveryJTBD.opportunity_id == opp_id).all()
    return [JTBDOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/jtbd", response_model=JTBDOut, status_code=status.HTTP_201_CREATED)
def create_jtbd(opp_id: str, body: JTBDCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoveryJTBD, db).create(data)

@router.patch("/jtbd/{id}", response_model=JTBDOut)
def update_jtbd(id: str, body: JTBDUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryJTBD, db)
    return repo.update(_get_or_404(DiscoveryJTBD, id, db), body.model_dump(exclude_unset=True))

@router.delete("/jtbd/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_jtbd(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryJTBD, db).delete(_get_or_404(DiscoveryJTBD, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 5. RESEARCH
# ══════════════════════════════════════════════════════════════════════════════

class ResearchCreate(BaseModel):
    research_type: ResearchType
    participants: Optional[str] = None
    research_date: Optional[date] = None
    questions: Optional[str] = None
    findings: Optional[str] = None
    evidence: Optional[str] = None
    source: Optional[str] = None
    reliability: ReliabilityLevel = ReliabilityLevel.medium

class ResearchUpdate(BaseModel):
    research_type: Optional[ResearchType] = None
    participants: Optional[str] = None
    research_date: Optional[date] = None
    questions: Optional[str] = None
    findings: Optional[str] = None
    evidence: Optional[str] = None
    source: Optional[str] = None
    reliability: Optional[ReliabilityLevel] = None

class ResearchOut(BaseModel):
    id: str; opportunity_id: str; research_type: ResearchType
    participants: Optional[str] = None; research_date: Optional[date] = None
    questions: Optional[str] = None; findings: Optional[str] = None
    evidence: Optional[str] = None; source: Optional[str] = None
    reliability: ReliabilityLevel
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/research", response_model=list[ResearchOut])
def list_research(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryResearch).filter(DiscoveryResearch.opportunity_id == opp_id).all()
    return [ResearchOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/research", response_model=ResearchOut, status_code=status.HTTP_201_CREATED)
def create_research(opp_id: str, body: ResearchCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoveryResearch, db).create(data)

@router.patch("/research/{id}", response_model=ResearchOut)
def update_research(id: str, body: ResearchUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryResearch, db)
    return repo.update(_get_or_404(DiscoveryResearch, id, db), body.model_dump(exclude_unset=True))

@router.delete("/research/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_research(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryResearch, db).delete(_get_or_404(DiscoveryResearch, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 6. INSIGHTS
# ══════════════════════════════════════════════════════════════════════════════

class InsightCreate(BaseModel):
    insight: str
    research_id: Optional[str] = None
    affected_audience: Optional[str] = None
    impact: ImpactLevel = ImpactLevel.medium
    observed_frequency: Optional[str] = None
    confidence: ConfidenceLevel = ConfidenceLevel.medium
    product_implication: Optional[str] = None

class InsightUpdate(BaseModel):
    insight: Optional[str] = None
    research_id: Optional[str] = None
    affected_audience: Optional[str] = None
    impact: Optional[ImpactLevel] = None
    observed_frequency: Optional[str] = None
    confidence: Optional[ConfidenceLevel] = None
    product_implication: Optional[str] = None

class InsightOut(BaseModel):
    id: str; opportunity_id: str; research_id: Optional[str] = None
    insight: str; affected_audience: Optional[str] = None
    impact: ImpactLevel; observed_frequency: Optional[str] = None
    confidence: ConfidenceLevel; product_implication: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/insights", response_model=list[InsightOut])
def list_insights(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryInsight).filter(DiscoveryInsight.opportunity_id == opp_id).all()
    return [InsightOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/insights", response_model=InsightOut, status_code=status.HTTP_201_CREATED)
def create_insight(opp_id: str, body: InsightCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoveryInsight, db).create(data)

@router.patch("/insights/{id}", response_model=InsightOut)
def update_insight(id: str, body: InsightUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryInsight, db)
    return repo.update(_get_or_404(DiscoveryInsight, id, db), body.model_dump(exclude_unset=True))

@router.delete("/insights/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_insight(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryInsight, db).delete(_get_or_404(DiscoveryInsight, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 7. ASSUMPTIONS
# ══════════════════════════════════════════════════════════════════════════════

class AssumptionCreate(BaseModel):
    hypothesis: str
    assumption_type: AssumptionType
    impact: ImpactLevel = ImpactLevel.medium
    uncertainty_level: UncertaintyLevel = UncertaintyLevel.high
    existing_evidence: Optional[str] = None
    validation_method: Optional[str] = None
    status: AssumptionStatus = AssumptionStatus.unvalidated

class AssumptionUpdate(BaseModel):
    hypothesis: Optional[str] = None
    assumption_type: Optional[AssumptionType] = None
    impact: Optional[ImpactLevel] = None
    uncertainty_level: Optional[UncertaintyLevel] = None
    existing_evidence: Optional[str] = None
    validation_method: Optional[str] = None
    status: Optional[AssumptionStatus] = None

class AssumptionOut(BaseModel):
    id: str; opportunity_id: str
    hypothesis: str; assumption_type: AssumptionType
    impact: ImpactLevel; uncertainty_level: UncertaintyLevel
    existing_evidence: Optional[str] = None; validation_method: Optional[str] = None
    status: AssumptionStatus
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/assumptions", response_model=list[AssumptionOut])
def list_assumptions(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryAssumption).filter(DiscoveryAssumption.opportunity_id == opp_id).all()
    return [AssumptionOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/assumptions", response_model=AssumptionOut, status_code=status.HTTP_201_CREATED)
def create_assumption(opp_id: str, body: AssumptionCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoveryAssumption, db).create(data)

@router.patch("/assumptions/{id}", response_model=AssumptionOut)
def update_assumption(id: str, body: AssumptionUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryAssumption, db)
    return repo.update(_get_or_404(DiscoveryAssumption, id, db), body.model_dump(exclude_unset=True))

@router.delete("/assumptions/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assumption(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryAssumption, db).delete(_get_or_404(DiscoveryAssumption, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 8. SOLUTION IDEAS
# ══════════════════════════════════════════════════════════════════════════════

class SolutionIdeaCreate(BaseModel):
    idea: str
    description: Optional[str] = None
    related_problem: Optional[str] = None
    expected_benefit: Optional[str] = None
    estimated_complexity: SolutionComplexity = SolutionComplexity.medium
    risks: Optional[str] = None
    dependencies: Optional[str] = None
    status: SolutionStatus = SolutionStatus.idea

class SolutionIdeaUpdate(BaseModel):
    idea: Optional[str] = None
    description: Optional[str] = None
    related_problem: Optional[str] = None
    expected_benefit: Optional[str] = None
    estimated_complexity: Optional[SolutionComplexity] = None
    risks: Optional[str] = None
    dependencies: Optional[str] = None
    status: Optional[SolutionStatus] = None

class SolutionIdeaOut(BaseModel):
    id: str; opportunity_id: str; idea: str
    description: Optional[str] = None; related_problem: Optional[str] = None
    expected_benefit: Optional[str] = None
    estimated_complexity: SolutionComplexity
    risks: Optional[str] = None; dependencies: Optional[str] = None
    status: SolutionStatus
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/solution-ideas", response_model=list[SolutionIdeaOut])
def list_solution_ideas(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoverySolutionIdea).filter(DiscoverySolutionIdea.opportunity_id == opp_id).all()
    return [SolutionIdeaOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/solution-ideas", response_model=SolutionIdeaOut, status_code=status.HTTP_201_CREATED)
def create_solution_idea(opp_id: str, body: SolutionIdeaCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoverySolutionIdea, db).create(data)

@router.patch("/solution-ideas/{id}", response_model=SolutionIdeaOut)
def update_solution_idea(id: str, body: SolutionIdeaUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoverySolutionIdea, db)
    return repo.update(_get_or_404(DiscoverySolutionIdea, id, db), body.model_dump(exclude_unset=True))

@router.delete("/solution-ideas/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_solution_idea(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoverySolutionIdea, db).delete(_get_or_404(DiscoverySolutionIdea, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 9. EXPERIMENTS
# ══════════════════════════════════════════════════════════════════════════════

class ExperimentCreate(BaseModel):
    method: ExperimentMethod
    assumption_id: Optional[str] = None
    participants: Optional[str] = None
    success_criteria: Optional[str] = None
    result: Optional[str] = None
    evidence: Optional[str] = None
    conclusion: Optional[str] = None
    next_action: Optional[str] = None
    status: ExperimentStatus = ExperimentStatus.planned

class ExperimentUpdate(BaseModel):
    method: Optional[ExperimentMethod] = None
    assumption_id: Optional[str] = None
    participants: Optional[str] = None
    success_criteria: Optional[str] = None
    result: Optional[str] = None
    evidence: Optional[str] = None
    conclusion: Optional[str] = None
    next_action: Optional[str] = None
    status: Optional[ExperimentStatus] = None

class ExperimentOut(BaseModel):
    id: str; opportunity_id: str; method: ExperimentMethod
    assumption_id: Optional[str] = None; participants: Optional[str] = None
    success_criteria: Optional[str] = None; result: Optional[str] = None
    evidence: Optional[str] = None; conclusion: Optional[str] = None
    next_action: Optional[str] = None; status: ExperimentStatus
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/experiments", response_model=list[ExperimentOut])
def list_experiments(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryExperiment).filter(DiscoveryExperiment.opportunity_id == opp_id).all()
    return [ExperimentOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/experiments", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
def create_experiment(opp_id: str, body: ExperimentCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoveryExperiment, db).create(data)

@router.patch("/experiments/{id}", response_model=ExperimentOut)
def update_experiment(id: str, body: ExperimentUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryExperiment, db)
    return repo.update(_get_or_404(DiscoveryExperiment, id, db), body.model_dump(exclude_unset=True))

@router.delete("/experiments/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experiment(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryExperiment, db).delete(_get_or_404(DiscoveryExperiment, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 10. SUCCESS METRICS
# ══════════════════════════════════════════════════════════════════════════════

class SuccessMetricCreate(BaseModel):
    metric: str
    metric_type: MetricType
    baseline: Optional[str] = None
    target: Optional[str] = None
    data_source: Optional[str] = None
    measurement_frequency: Optional[str] = None
    responsible: Optional[str] = None

class SuccessMetricUpdate(BaseModel):
    metric: Optional[str] = None
    metric_type: Optional[MetricType] = None
    baseline: Optional[str] = None
    target: Optional[str] = None
    data_source: Optional[str] = None
    measurement_frequency: Optional[str] = None
    responsible: Optional[str] = None

class SuccessMetricOut(BaseModel):
    id: str; opportunity_id: str; metric: str; metric_type: MetricType
    baseline: Optional[str] = None; target: Optional[str] = None
    data_source: Optional[str] = None; measurement_frequency: Optional[str] = None
    responsible: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("/opportunities/{opp_id}/success-metrics", response_model=list[SuccessMetricOut])
def list_success_metrics(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoverySuccessMetric).filter(DiscoverySuccessMetric.opportunity_id == opp_id).all()
    return [SuccessMetricOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/success-metrics", response_model=SuccessMetricOut, status_code=status.HTTP_201_CREATED)
def create_success_metric(opp_id: str, body: SuccessMetricCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    return BaseRepository(DiscoverySuccessMetric, db).create(data)

@router.patch("/success-metrics/{id}", response_model=SuccessMetricOut)
def update_success_metric(id: str, body: SuccessMetricUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoverySuccessMetric, db)
    return repo.update(_get_or_404(DiscoverySuccessMetric, id, db), body.model_dump(exclude_unset=True))

@router.delete("/success-metrics/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_success_metric(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoverySuccessMetric, db).delete(_get_or_404(DiscoverySuccessMetric, id, db))
