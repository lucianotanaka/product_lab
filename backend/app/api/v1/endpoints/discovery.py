from typing import Optional
from datetime import date, datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.repositories.base import BaseRepository
from app.models.discovery import (
    DiscoveryOpportunity, OpportunityStatus,
    DiscoveryOpportunityArea,
    DiscoveryProblemStatement, DiscoveryProblemAffectedArea,
    DiscoveryJTBD, JobType,
    DiscoveryResearch, ResearchType, ReliabilityLevel, ResearchStatus,
    ResearchTemplate, ResearchTemplateQuestion, ResearchAnswer,
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

def _ensure_research_answers_session_columns(db: Session):
    db.execute(text("""
        ALTER TABLE research_answers
        ADD COLUMN IF NOT EXISTS section VARCHAR(20) NOT NULL DEFAULT 'during'
    """))
    db.execute(text("""
        ALTER TABLE research_answers
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
    """))
    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# 2. PROBLEM STATEMENTS
# ══════════════════════════════════════════════════════════════════════════════

class ProblemStatementUpsert(BaseModel):
    observed_problem: Optional[str] = None
    who_is_affected: Optional[str] = None
    current_impact: Optional[str] = None
    available_evidence: Optional[str] = None
    consequence_of_inaction: Optional[str] = None

class ProblemAffectedAreaOut(BaseModel):
    id: str; problem_statement_id: str; area_id: int
    area_name: Optional[str] = None
    impact_type: str = "direct"
    description: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class ProblemStatementOut(BaseModel):
    id: str; opportunity_id: str
    observed_problem: Optional[str] = None
    who_is_affected: Optional[str] = None
    current_impact: Optional[str] = None
    available_evidence: Optional[str] = None
    consequence_of_inaction: Optional[str] = None
    affected_areas: list[ProblemAffectedAreaOut] = []
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

def _enrich_problem(obj: DiscoveryProblemStatement, db: Session) -> ProblemStatementOut:
    area_rows = db.query(DiscoveryProblemAffectedArea).filter(
        DiscoveryProblemAffectedArea.problem_statement_id == obj.id
    ).all()
    affected_areas = [
        ProblemAffectedAreaOut(
            id=a.id, problem_statement_id=a.problem_statement_id,
            area_id=a.area_id, area_name=_resolve_area_name(a.area_id, db),
            impact_type=a.impact_type, description=a.description, created_at=a.created_at,
        ) for a in area_rows
    ]
    return ProblemStatementOut(
        id=obj.id, opportunity_id=obj.opportunity_id,
        observed_problem=obj.observed_problem, who_is_affected=obj.who_is_affected,
        current_impact=obj.current_impact, available_evidence=obj.available_evidence,
        consequence_of_inaction=obj.consequence_of_inaction,
        affected_areas=affected_areas,
        created_at=obj.created_at, updated_at=obj.updated_at,
    )

@router.get("/opportunities/{opp_id}/problem-statement", response_model=Optional[ProblemStatementOut])
def get_problem_statement(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    obj = db.query(DiscoveryProblemStatement).filter(DiscoveryProblemStatement.opportunity_id == opp_id).first()
    return _enrich_problem(obj, db) if obj else None

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
    return _enrich_problem(obj, db)


# ── Problem Affected Areas (N:M) ──────────────────────────────────────────────

class ProblemAffectedAreaCreate(BaseModel):
    area_id: int
    impact_type: str = "direct"   # direct | indirect
    description: Optional[str] = None

class ProblemAffectedAreaUpdate(BaseModel):
    impact_type: Optional[str] = None
    description: Optional[str] = None

@router.get("/opportunities/{opp_id}/problem-statement/affected-areas", response_model=list[ProblemAffectedAreaOut])
def list_problem_affected_areas(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    ps = db.query(DiscoveryProblemStatement).filter(DiscoveryProblemStatement.opportunity_id == opp_id).first()
    if not ps:
        return []
    rows = db.query(DiscoveryProblemAffectedArea).filter(
        DiscoveryProblemAffectedArea.problem_statement_id == ps.id
    ).all()
    return [ProblemAffectedAreaOut(
        id=r.id, problem_statement_id=r.problem_statement_id,
        area_id=r.area_id, area_name=_resolve_area_name(r.area_id, db),
        impact_type=r.impact_type, description=r.description, created_at=r.created_at,
    ) for r in rows]

@router.post("/opportunities/{opp_id}/problem-statement/affected-areas", response_model=ProblemAffectedAreaOut, status_code=status.HTTP_201_CREATED)
def add_problem_affected_area(opp_id: str, body: ProblemAffectedAreaCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    ps = db.query(DiscoveryProblemStatement).filter(DiscoveryProblemStatement.opportunity_id == opp_id).first()
    if not ps:
        # Auto-create empty problem statement if it doesn't exist yet
        ps = DiscoveryProblemStatement(opportunity_id=opp_id)
        db.add(ps); db.commit(); db.refresh(ps)
    obj = DiscoveryProblemAffectedArea(problem_statement_id=ps.id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return ProblemAffectedAreaOut(
        id=obj.id, problem_statement_id=obj.problem_statement_id,
        area_id=obj.area_id, area_name=_resolve_area_name(obj.area_id, db),
        impact_type=obj.impact_type, description=obj.description, created_at=obj.created_at,
    )

@router.patch("/problem-affected-areas/{area_id}", response_model=ProblemAffectedAreaOut)
def update_problem_affected_area(area_id: str, body: ProblemAffectedAreaUpdate, db: Session = Depends(get_db)):
    obj = db.get(DiscoveryProblemAffectedArea, area_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Affected area not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return ProblemAffectedAreaOut(
        id=obj.id, problem_statement_id=obj.problem_statement_id,
        area_id=obj.area_id, area_name=_resolve_area_name(obj.area_id, db),
        impact_type=obj.impact_type, description=obj.description, created_at=obj.created_at,
    )

@router.delete("/problem-affected-areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_problem_affected_area(area_id: str, db: Session = Depends(get_db)):
    obj = db.get(DiscoveryProblemAffectedArea, area_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Affected area not found")
    db.delete(obj); db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# 2b. GENERATE VPC FROM DISCOVERY (snapshot — Opção A)
# ══════════════════════════════════════════════════════════════════════════════

import uuid as _uuid

class GenerateVPCOut(BaseModel):
    canvas_id: str
    canvas_name: str
    items_created: int
    class Config: from_attributes = True

@router.post("/opportunities/{opp_id}/generate-vpc", response_model=GenerateVPCOut, status_code=status.HTTP_201_CREATED)
def generate_vpc_from_discovery(opp_id: str, db: Session = Depends(get_db)):
    """
    Snapshot — Opção A: creates a new vpc_canvas linked to the opportunity
    and populates it with data from JTBD, PROBLEM and SOLUTIONS.
    """
    from app.models.vpc import VPCCanvas, VPCItem

    opp = _get_or_404(DiscoveryOpportunity, opp_id, db)

    # Create canvas
    canvas_id = str(_uuid.uuid4())
    canvas_name = f"VPC — {opp.title[:60]}"
    canvas = VPCCanvas(
        id=canvas_id,
        product_id=str(opp.product_id),
        name=canvas_name,
        description=f"Gerado automaticamente a partir da oportunidade: {opp.title}",
        discovery_opportunity_id=opp_id,
    )
    db.add(canvas)
    db.flush()

    items_created = 0

    # 1. JTBD → Customer Jobs
    jtbd_list = db.query(DiscoveryJTBD).filter(DiscoveryJTBD.opportunity_id == opp_id).all()
    for j in jtbd_list:
        item = VPCItem(
            id=str(_uuid.uuid4()),
            product_id=str(opp.product_id),
            canvas_id=canvas_id,
            type="job",
            name=j.description[:150] if j.description else None,
            content=j.description or "",
            priority=j.priority,
        )
        db.add(item)
        # Update vpc_item_id link on the JTBD for traceability
        j.vpc_item_id = item.id
        items_created += 1

    # 2. PROBLEM STATEMENT → Pains
    from app.models.discovery import DiscoveryProblemStatement
    ps = db.query(DiscoveryProblemStatement).filter(
        DiscoveryProblemStatement.opportunity_id == opp_id
    ).first()
    if ps:
        pain_fields = [
            ("Problema Observado", ps.observed_problem),
            ("Quem é Afetado", ps.who_is_affected),
            ("Impacto Atual", ps.current_impact),
        ]
        for name, content in pain_fields:
            if content and content.strip():
                db.add(VPCItem(
                    id=str(_uuid.uuid4()),
                    product_id=str(opp.product_id),
                    canvas_id=canvas_id,
                    type="pain",
                    name=name,
                    content=content,
                    priority=3,
                ))
                items_created += 1

    # 3. SOLUTIONS (not discarded) → Products & Services
    solutions = db.query(DiscoverySolutionIdea).filter(
        DiscoverySolutionIdea.opportunity_id == opp_id,
        DiscoverySolutionIdea.status != "discarded",
    ).all()
    for s in solutions:
        db.add(VPCItem(
            id=str(_uuid.uuid4()),
            product_id=str(opp.product_id),
            canvas_id=canvas_id,
            type="product",
            name=s.idea[:150] if s.idea else None,
            content=s.description or s.idea or "",
            priority=3,
        ))
        items_created += 1

    db.commit()
    return GenerateVPCOut(canvas_id=canvas_id, canvas_name=canvas_name, items_created=items_created)


# ══════════════════════════════════════════════════════════════════════════════
# 3. JTBD
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
    impacted_area_id: Optional[int] = None
    vpc_item_id: Optional[str] = None

class JTBDUpdate(BaseModel):
    description: Optional[str] = None
    job_type: Optional[JobType] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    frequency: Optional[str] = None
    context: Optional[str] = None
    expected_result: Optional[str] = None
    impacted_area_id: Optional[int] = None
    vpc_item_id: Optional[str] = None

class JTBDOut(BaseModel):
    id: str; product_id: int; opportunity_id: Optional[str] = None
    description: str; job_type: JobType; priority: int
    frequency: Optional[str] = None; context: Optional[str] = None
    expected_result: Optional[str] = None
    impacted_area_id: Optional[int] = None
    impacted_area_name: Optional[str] = None
    vpc_item_id: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

def _enrich_jtbd(j: DiscoveryJTBD, db: Session) -> JTBDOut:
    return JTBDOut(
        id=j.id, product_id=j.product_id, opportunity_id=j.opportunity_id,
        description=j.description, job_type=j.job_type, priority=j.priority,
        frequency=j.frequency, context=j.context, expected_result=j.expected_result,
        impacted_area_id=j.impacted_area_id,
        impacted_area_name=_resolve_area_name(j.impacted_area_id, db) if j.impacted_area_id else None,
        vpc_item_id=j.vpc_item_id,
        created_at=j.created_at, updated_at=j.updated_at,
    )

@router.get("/opportunities/{opp_id}/jtbd", response_model=list[JTBDOut])
def list_jtbd(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = db.query(DiscoveryJTBD).filter(DiscoveryJTBD.opportunity_id == opp_id).all()
    return [_enrich_jtbd(r, db) for r in rows]

@router.post("/opportunities/{opp_id}/jtbd", response_model=JTBDOut, status_code=status.HTTP_201_CREATED)
def create_jtbd(opp_id: str, body: JTBDCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    obj = BaseRepository(DiscoveryJTBD, db).create(data)
    return _enrich_jtbd(obj, db)

@router.patch("/jtbd/{id}", response_model=JTBDOut)
def update_jtbd(id: str, body: JTBDUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryJTBD, db)
    obj = repo.update(_get_or_404(DiscoveryJTBD, id, db), body.model_dump(exclude_unset=True))
    return _enrich_jtbd(obj, db)

@router.delete("/jtbd/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_jtbd(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryJTBD, db).delete(_get_or_404(DiscoveryJTBD, id, db))


# ══════════════════════════════════════════════════════════════════════════════
# 4b. RESEARCH TEMPLATES
# ══════════════════════════════════════════════════════════════════════════════

class TemplateQuestionOut(BaseModel):
    id: str; template_id: str; section: str; question: str
    hint: Optional[str] = None
    is_research_question: bool = False
    question_type: str = "open_text"
    is_required: bool = False
    sort_order: int = 0
    class Config: from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kw):
        return cls(
            id=obj.id, template_id=obj.template_id, section=obj.section,
            question=obj.question, hint=obj.hint,
            is_research_question=obj.is_research_question in (True, "true", "True"),
            question_type=obj.question_type,
            is_required=obj.is_required in (True, "true", "True"),
            sort_order=obj.sort_order,
        )

class TemplateOut(BaseModel):
    id: str; research_type: ResearchType; name: str
    description: Optional[str] = None; objective: Optional[str] = None
    when_to_use: Optional[str] = None; expected_outputs: Optional[str] = None
    opening_script: Optional[str] = None; reference: Optional[str] = None
    version: str = "1.0"; is_active: bool = True; sort_order: int = 0
    class Config: from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kw):
        return cls(
            id=obj.id, research_type=obj.research_type, name=obj.name,
            description=obj.description, objective=obj.objective,
            when_to_use=obj.when_to_use, expected_outputs=obj.expected_outputs,
            opening_script=obj.opening_script, reference=obj.reference,
            version=obj.version or "1.0",
            is_active=obj.is_active in (True, "true", "True"),
            sort_order=obj.sort_order or 0,
        )

@router.get("/research-templates", response_model=list[TemplateOut])
def list_research_templates(research_type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ResearchTemplate).filter(ResearchTemplate.is_active == "true")
    if research_type:
        q = q.filter(ResearchTemplate.research_type == research_type)
    rows = q.order_by(ResearchTemplate.research_type, ResearchTemplate.sort_order).all()
    return [TemplateOut.model_validate(r) for r in rows]

@router.get("/research-templates/{template_id}/questions", response_model=list[TemplateQuestionOut])
def list_template_questions(template_id: str, section: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ResearchTemplateQuestion).filter(ResearchTemplateQuestion.template_id == template_id)
    if section:
        q = q.filter(ResearchTemplateQuestion.section == section)
    rows = q.order_by(ResearchTemplateQuestion.section, ResearchTemplateQuestion.sort_order).all()
    return [TemplateQuestionOut.model_validate(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
# 5. RESEARCH
# ══════════════════════════════════════════════════════════════════════════════

class ResearchCreate(BaseModel):
    research_type: ResearchType
    template_id: Optional[str] = None
    participants: Optional[str] = None
    research_date: Optional[date] = None
    objective: Optional[str] = None
    research_questions: Optional[str] = None
    consent_obtained: Optional[bool] = False
    duration_minutes: Optional[int] = None
    context: Optional[str] = None
    questions: Optional[str] = None
    findings: Optional[str] = None
    evidence: Optional[str] = None
    source: Optional[str] = None
    summary: Optional[str] = None
    reliability: ReliabilityLevel = ReliabilityLevel.medium
    session_status: ResearchStatus = ResearchStatus.planned

class ResearchUpdate(BaseModel):
    research_type: Optional[ResearchType] = None
    template_id: Optional[str] = None
    participants: Optional[str] = None
    research_date: Optional[date] = None
    objective: Optional[str] = None
    research_questions: Optional[str] = None
    consent_obtained: Optional[bool] = None
    duration_minutes: Optional[int] = None
    context: Optional[str] = None
    questions: Optional[str] = None
    findings: Optional[str] = None
    evidence: Optional[str] = None
    source: Optional[str] = None
    summary: Optional[str] = None
    reliability: Optional[ReliabilityLevel] = None
    session_status: Optional[ResearchStatus] = None

class ResearchOut(BaseModel):
    id: str; opportunity_id: str; research_type: ResearchType
    template_id: Optional[str] = None
    participants: Optional[str] = None; research_date: Optional[date] = None
    objective: Optional[str] = None; research_questions: Optional[str] = None
    consent_obtained: Optional[bool] = False; duration_minutes: Optional[int] = None
    context: Optional[str] = None
    questions: Optional[str] = None; findings: Optional[str] = None
    evidence: Optional[str] = None; source: Optional[str] = None
    summary: Optional[str] = None
    reliability: ReliabilityLevel
    session_status: ResearchStatus = ResearchStatus.planned
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
    _ensure_research_answers_session_columns(db)
    data = body.model_dump(); data["opportunity_id"] = opp_id
    # Auto-create answers from template questions
    research_obj = BaseRepository(DiscoveryResearch, db).create(data)
    if research_obj.template_id:
        questions = db.query(ResearchTemplateQuestion).filter(
            ResearchTemplateQuestion.template_id == research_obj.template_id
        ).order_by(ResearchTemplateQuestion.section, ResearchTemplateQuestion.sort_order).all()
        for q in questions:
            ans = ResearchAnswer(
                research_id=research_obj.id,
                question_id=q.id,
                status="pending",
                section=q.section,
                sort_order=q.sort_order,
            )
            db.add(ans)
        db.commit(); db.refresh(research_obj)
    return ResearchOut.model_validate(research_obj)

@router.patch("/research/{id}", response_model=ResearchOut)
def update_research(id: str, body: ResearchUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(DiscoveryResearch, id, db)
    payload = body.model_dump(exclude_unset=True)

    removing_template = "template_id" in payload and payload["template_id"] is None and obj.template_id
    if removing_template:
        linked_answers = db.query(ResearchAnswer).filter(
            ResearchAnswer.research_id == obj.id,
            ResearchAnswer.question_id.isnot(None),
        ).all()

        for answer in linked_answers:
            question = db.get(ResearchTemplateQuestion, answer.question_id) if answer.question_id else None
            question_text = question.question if question else None
            has_content = bool((answer.answer or "").strip())
            keep_as_editable_question = has_content or answer.status == "answered"

            if keep_as_editable_question:
                answer.custom_question = question_text or answer.custom_question
                answer.question_id = None
            else:
                db.delete(answer)

        db.flush()

    repo = BaseRepository(DiscoveryResearch, db)
    return repo.update(obj, payload)

@router.delete("/research/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_research(id: str, db: Session = Depends(get_db)):
    BaseRepository(DiscoveryResearch, db).delete(_get_or_404(DiscoveryResearch, id, db))


# ── Research Answers ──────────────────────────────────────────────────────────

class AnswerOut(BaseModel):
    id: str; research_id: str
    question_id: Optional[str] = None; custom_question: Optional[str] = None
    answer: Optional[str] = None; status: str
    section: Optional[str] = None; question_text: Optional[str] = None
    hint: Optional[str] = None; question_type: Optional[str] = None
    sort_order: Optional[int] = None
    class Config: from_attributes = True

class AnswerUpdate(BaseModel):
    answer: Optional[str] = None
    status: Optional[str] = None         # pending|answered|skipped|na
    custom_question: Optional[str] = None
    section: Optional[str] = None
    sort_order: Optional[int] = None

class AnswerCreate(BaseModel):
    question_id: Optional[str] = None
    custom_question: Optional[str] = None
    answer: Optional[str] = None
    status: str = "pending"
    section: str = "during"
    sort_order: int = 0

class SessionQuestionCreate(BaseModel):
    question: str
    section: str = "during"
    sort_order: int = 0
    save_to_template: bool = False
    is_required: bool = False
    hint: Optional[str] = None

@router.get("/research/{research_id}/answers", response_model=list[AnswerOut])
def list_answers(research_id: str, db: Session = Depends(get_db)):
    _ensure_research_answers_session_columns(db)
    research = _get_or_404(DiscoveryResearch, research_id, db)
    answers = db.query(ResearchAnswer).filter(ResearchAnswer.research_id == research_id).all()

    if not research.template_id:
        changed = False
        for answer in list(answers):
            if not answer.question_id:
                continue
            question = db.get(ResearchTemplateQuestion, answer.question_id)
            question_text = question.question if question else None
            has_content = bool((answer.answer or "").strip())
            keep_as_editable_question = has_content or answer.status == "answered"

            if keep_as_editable_question:
                answer.custom_question = question_text or answer.custom_question
                answer.question_id = None
                changed = True
            else:
                db.delete(answer)
                answers.remove(answer)
                changed = True

        if changed:
            db.commit()
            answers = db.query(ResearchAnswer).filter(ResearchAnswer.research_id == research_id).all()
    if not answers and research.template_id:
        questions = db.query(ResearchTemplateQuestion).filter(
            ResearchTemplateQuestion.template_id == research.template_id
        ).order_by(ResearchTemplateQuestion.section, ResearchTemplateQuestion.sort_order).all()
        for q in questions:
            db.add(ResearchAnswer(
                research_id=research.id,
                question_id=q.id,
                status="pending",
                section=q.section,
                sort_order=q.sort_order,
            ))
        db.commit()
        answers = db.query(ResearchAnswer).filter(ResearchAnswer.research_id == research_id).all()
    result = []
    for a in answers:
        q = db.get(ResearchTemplateQuestion, a.question_id) if a.question_id else None
        result.append(AnswerOut(
            id=a.id, research_id=a.research_id,
            question_id=a.question_id, custom_question=a.custom_question,
            answer=a.answer, status=a.status,
            section=q.section if q else a.section,
            question_text=(a.custom_question if a.custom_question else (q.question if q and q.question else a.custom_question)),
            hint=q.hint if q else None,
            question_type=q.question_type if q else "open_text",
            sort_order=a.sort_order if a.sort_order is not None else (q.sort_order if q else 0),
        ))
    result.sort(key=lambda x: (x.section or "z", x.sort_order or 0))
    return result

@router.post("/research/{research_id}/answers", response_model=AnswerOut, status_code=status.HTTP_201_CREATED)
def add_answer(research_id: str, body: AnswerCreate, db: Session = Depends(get_db)):
    _ensure_research_answers_session_columns(db)
    _get_or_404(DiscoveryResearch, research_id, db)
    obj = ResearchAnswer(research_id=research_id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    q = db.get(ResearchTemplateQuestion, obj.question_id) if obj.question_id else None
    return AnswerOut(
        id=obj.id, research_id=obj.research_id,
        question_id=obj.question_id,
        custom_question=obj.custom_question,
        answer=obj.answer, status=obj.status,
        section=q.section if q else obj.section,
        question_text=(obj.custom_question if obj.custom_question else (q.question if q and q.question else obj.custom_question)),
        hint=q.hint if q else None,
        question_type=q.question_type if q else "open_text",
        sort_order=obj.sort_order if obj.sort_order is not None else (q.sort_order if q else 0),
    )

@router.post("/research/{research_id}/session-questions", response_model=AnswerOut, status_code=status.HTTP_201_CREATED)
def add_session_question(research_id: str, body: SessionQuestionCreate, db: Session = Depends(get_db)):
    _ensure_research_answers_session_columns(db)
    research = _get_or_404(DiscoveryResearch, research_id, db)
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    question_id = None
    if body.save_to_template and research.template_id:
        question_obj = ResearchTemplateQuestion(
            id=str(uuid.uuid4()),
            template_id=research.template_id,
            section=body.section,
            question=body.question.strip(),
            hint=body.hint,
            is_research_question="true",
            question_type="open_text",
            is_required="true" if body.is_required else "false",
            sort_order=body.sort_order,
        )
        db.add(question_obj)
        db.flush()
        question_id = question_obj.id

    obj = ResearchAnswer(
        research_id=research_id,
        question_id=question_id,
        custom_question=None if question_id else body.question.strip(),
        status="pending",
        section=body.section,
        sort_order=body.sort_order,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    q = db.get(ResearchTemplateQuestion, obj.question_id) if obj.question_id else None
    return AnswerOut(
        id=obj.id, research_id=obj.research_id,
        question_id=obj.question_id,
        custom_question=obj.custom_question,
        answer=obj.answer, status=obj.status,
        section=q.section if q else obj.section,
        question_text=(obj.custom_question if obj.custom_question else (q.question if q and q.question else obj.custom_question)),
        hint=q.hint if q else body.hint,
        question_type=q.question_type if q else "open_text",
        sort_order=obj.sort_order if obj.sort_order is not None else (q.sort_order if q else 0),
    )

@router.patch("/answers/{answer_id}", response_model=AnswerOut)
def update_answer(answer_id: str, body: AnswerUpdate, db: Session = Depends(get_db)):
    _ensure_research_answers_session_columns(db)
    obj = db.get(ResearchAnswer, answer_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Answer not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    q = db.get(ResearchTemplateQuestion, obj.question_id) if obj.question_id else None
    return AnswerOut(
        id=obj.id, research_id=obj.research_id,
        question_id=obj.question_id,
        custom_question=obj.custom_question,
        answer=obj.answer, status=obj.status,
        section=q.section if q else obj.section,
        question_text=(obj.custom_question if obj.custom_question else (q.question if q and q.question else obj.custom_question)),
        hint=q.hint if q else None,
        question_type=q.question_type if q else "open_text",
        sort_order=obj.sort_order if obj.sort_order is not None else (q.sort_order if q else 0),
    )

def _delete_answer_record(answer_id: str, db: Session):
    obj = db.get(ResearchAnswer, answer_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Answer not found")
    db.delete(obj)
    db.commit()

@router.delete("/answers/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_answer(answer_id: str, db: Session = Depends(get_db)):
    _delete_answer_record(answer_id, db)

@router.delete("/research/{research_id}/answers/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_research_answer(research_id: str, answer_id: str, db: Session = Depends(get_db)):
    obj = db.get(ResearchAnswer, answer_id)
    if not obj or obj.research_id != research_id:
        raise HTTPException(status_code=404, detail="Answer not found")
    _delete_answer_record(answer_id, db)


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


# ══════════════════════════════════════════════════════════════════════════════
# 11. RESEARCH FOLLOW-UPS — migrated to universal /followups endpoint
# Use: GET/POST /followups?entity_type=discovery_research&entity_id={research_id}
# ══════════════════════════════════════════════════════════════════════════════
