from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.discovery import (
    AssessmentLevel,
    DiscoveryBusinessCase,
    DiscoveryOpportunity,
    OpportunityAssessment,
    OpportunityAssessmentRecommendation,
    OpportunityAssessmentType,
    OpportunityJourneyStage,
    OpportunityLifecycleStatus,
    OpportunitySource,
    OpportunitySourceType,
    OpportunityStatus,
)
from app.models.decision import Decision, DecisionStatus
from app.repositories.base import BaseRepository

router = APIRouter()


def _get_or_404(model, id: str, db: Session):
    obj = BaseRepository(model, db).get(id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


def _resolve_area_name(area_id: int, db: Session) -> Optional[str]:
    try:
        from app.models.process_mapping import BusinessArea

        area = db.get(BusinessArea, area_id)
        return area.area_name if area else None
    except Exception:
        return None


def _resolve_responsible_name(stakeholder_id: Optional[int], db: Session) -> Optional[str]:
    if not stakeholder_id:
        return None
    try:
        from app.models.stakeholder import Stakeholder

        stk = db.get(Stakeholder, stakeholder_id)
        return stk.full_name if stk else None
    except Exception:
        return None


def _legacy_origin_to_source_type(origin: Optional[str]) -> OpportunitySourceType:
    mapping = {
        "customer_feedback": OpportunitySourceType.customer_feedback,
        "internal_analysis": OpportunitySourceType.internal_analysis,
        "market_research": OpportunitySourceType.market_research,
        "stakeholder_request": OpportunitySourceType.stakeholder_request,
        "data_analysis": OpportunitySourceType.data_analysis,
        "regulatory_compliance": OpportunitySourceType.regulatory_requirement,
    }
    return mapping.get(origin or "", OpportunitySourceType.other)


def _default_journey_stage_for_status(status_value: OpportunityStatus) -> OpportunityJourneyStage:
    mapping = {
        OpportunityStatus.identified: OpportunityJourneyStage.capture,
        OpportunityStatus.under_investigation: OpportunityJourneyStage.discover,
        OpportunityStatus.validated: OpportunityJourneyStage.decide,
        OpportunityStatus.paused: OpportunityJourneyStage.assess,
        OpportunityStatus.discarded: OpportunityJourneyStage.decide,
        OpportunityStatus.forwarded_to_roadmap: OpportunityJourneyStage.decide,
    }
    return mapping.get(status_value, OpportunityJourneyStage.capture)


def _default_lifecycle_status_for_status(status_value: OpportunityStatus) -> OpportunityLifecycleStatus:
    mapping = {
        OpportunityStatus.paused: OpportunityLifecycleStatus.on_hold,
        OpportunityStatus.discarded: OpportunityLifecycleStatus.closed,
    }
    return mapping.get(status_value, OpportunityLifecycleStatus.active)


class OpportunitySourceCreate(BaseModel):
    source_type: OpportunitySourceType
    source_system: Optional[str] = None
    external_reference: Optional[str] = None
    external_url: Optional[str] = None
    requester_reference: Optional[str] = None
    requester_name: Optional[str] = None
    sponsor_reference: Optional[str] = None
    sponsor_name: Optional[str] = None
    received_at: Optional[datetime] = None
    original_context: Optional[str] = None
    is_primary: bool = False


class OpportunitySourceUpdate(BaseModel):
    source_type: Optional[OpportunitySourceType] = None
    source_system: Optional[str] = None
    external_reference: Optional[str] = None
    external_url: Optional[str] = None
    requester_reference: Optional[str] = None
    requester_name: Optional[str] = None
    sponsor_reference: Optional[str] = None
    sponsor_name: Optional[str] = None
    received_at: Optional[datetime] = None
    original_context: Optional[str] = None
    is_primary: Optional[bool] = None


class OpportunitySourceOut(BaseModel):
    id: str
    opportunity_id: str
    source_type: OpportunitySourceType
    source_system: Optional[str] = None
    external_reference: Optional[str] = None
    external_url: Optional[str] = None
    requester_reference: Optional[str] = None
    requester_name: Optional[str] = None
    sponsor_reference: Optional[str] = None
    sponsor_name: Optional[str] = None
    received_at: Optional[datetime] = None
    original_context: Optional[str] = None
    is_primary: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OpportunityAssessmentCreate(BaseModel):
    assessment_type: OpportunityAssessmentType = OpportunityAssessmentType.initial
    problem_clarity: AssessmentLevel = AssessmentLevel.unknown
    evidence_strength: AssessmentLevel = AssessmentLevel.unknown
    business_impact: AssessmentLevel = AssessmentLevel.unknown
    expected_outcome_clarity: AssessmentLevel = AssessmentLevel.unknown
    potential_business_value: AssessmentLevel = AssessmentLevel.unknown
    strategic_alignment: AssessmentLevel = AssessmentLevel.unknown
    urgency: AssessmentLevel = AssessmentLevel.unknown
    business_uncertainty: AssessmentLevel = AssessmentLevel.unknown
    solution_uncertainty: AssessmentLevel = AssessmentLevel.unknown
    initial_viability: AssessmentLevel = AssessmentLevel.unknown
    recommendation: Optional[OpportunityAssessmentRecommendation] = None
    rationale: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_at: Optional[datetime] = None


class OpportunityAssessmentUpdate(BaseModel):
    assessment_type: Optional[OpportunityAssessmentType] = None
    problem_clarity: Optional[AssessmentLevel] = None
    evidence_strength: Optional[AssessmentLevel] = None
    business_impact: Optional[AssessmentLevel] = None
    expected_outcome_clarity: Optional[AssessmentLevel] = None
    potential_business_value: Optional[AssessmentLevel] = None
    strategic_alignment: Optional[AssessmentLevel] = None
    urgency: Optional[AssessmentLevel] = None
    business_uncertainty: Optional[AssessmentLevel] = None
    solution_uncertainty: Optional[AssessmentLevel] = None
    initial_viability: Optional[AssessmentLevel] = None
    recommendation: Optional[OpportunityAssessmentRecommendation] = None
    rationale: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_at: Optional[datetime] = None


class OpportunityAssessmentOut(BaseModel):
    id: str
    opportunity_id: str
    assessment_type: OpportunityAssessmentType
    problem_clarity: AssessmentLevel
    evidence_strength: AssessmentLevel
    business_impact: AssessmentLevel
    expected_outcome_clarity: AssessmentLevel
    potential_business_value: AssessmentLevel
    strategic_alignment: AssessmentLevel
    urgency: AssessmentLevel
    business_uncertainty: AssessmentLevel
    solution_uncertainty: AssessmentLevel
    initial_viability: AssessmentLevel
    recommendation: Optional[OpportunityAssessmentRecommendation] = None
    rationale: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OpportunityAssessmentSummary(BaseModel):
    id: str
    assessment_type: OpportunityAssessmentType
    recommendation: Optional[OpportunityAssessmentRecommendation] = None
    assessed_by: Optional[str] = None
    assessed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OpportunityDecisionCreate(BaseModel):
    title: str
    context: Optional[str] = None
    decision: Optional[str] = None
    consequences: Optional[str] = None
    status: DecisionStatus = DecisionStatus.proposed
    tags: list[str] = []
    business_case_id: Optional[str] = None
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None

class OpportunityDecisionUpdate(BaseModel):
    title: Optional[str] = None
    context: Optional[str] = None
    decision: Optional[str] = None
    consequences: Optional[str] = None
    status: Optional[DecisionStatus] = None
    tags: Optional[list[str]] = None
    business_case_id: Optional[str] = None
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None

class OpportunityDecisionOut(BaseModel):
    id: str
    product_id: str
    title: str
    context: Optional[str] = None
    decision: Optional[str] = None
    consequences: Optional[str] = None
    status: DecisionStatus
    tags: list[str] = []
    discovery_opportunity_id: Optional[str] = None
    business_case_id: Optional[str] = None
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OpportunityCreate(BaseModel):
    product_id: int
    title: str
    description: Optional[str] = None
    origin: Optional[str] = None
    impacted_area_id: Optional[int] = None
    responsible_stakeholder_id: Optional[int] = None
    identified_at: Optional[date] = None
    status: OpportunityStatus = OpportunityStatus.identified
    journey_stage: Optional[OpportunityJourneyStage] = None
    lifecycle_status: Optional[OpportunityLifecycleStatus] = None
    priority: int = Field(default=3, ge=1, le=5)


class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    origin: Optional[str] = None
    impacted_area_id: Optional[int] = None
    responsible_stakeholder_id: Optional[int] = None
    identified_at: Optional[date] = None
    status: Optional[OpportunityStatus] = None
    journey_stage: Optional[OpportunityJourneyStage] = None
    lifecycle_status: Optional[OpportunityLifecycleStatus] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)


class OpportunityOut(BaseModel):
    id: str
    product_id: int
    title: str
    description: Optional[str] = None
    origin: Optional[str] = None
    impacted_area_id: Optional[int] = None
    impacted_area_name: Optional[str] = None
    responsible_stakeholder_id: Optional[int] = None
    responsible_name: Optional[str] = None
    identified_at: Optional[date] = None
    status: OpportunityStatus
    journey_stage: OpportunityJourneyStage
    lifecycle_status: OpportunityLifecycleStatus
    priority: int
    primary_source: Optional[OpportunitySourceOut] = None
    latest_assessment: Optional[OpportunityAssessmentSummary] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _get_primary_source(opp_id: str, db: Session) -> Optional[OpportunitySource]:
    return (
        db.query(OpportunitySource)
        .filter(OpportunitySource.opportunity_id == opp_id)
        .order_by(OpportunitySource.is_primary.desc(), OpportunitySource.created_at.asc())
        .first()
    )


def _get_latest_assessment(opp_id: str, db: Session) -> Optional[OpportunityAssessment]:
    return (
        db.query(OpportunityAssessment)
        .filter(OpportunityAssessment.opportunity_id == opp_id)
        .order_by(OpportunityAssessment.assessed_at.desc().nullslast(), OpportunityAssessment.created_at.desc())
        .first()
    )


def _ensure_primary_source_for_legacy_origin(opp: DiscoveryOpportunity, db: Session) -> Optional[OpportunitySource]:
    existing = _get_primary_source(opp.id, db)
    if existing or not opp.origin:
        return existing

    source = OpportunitySource(
        opportunity_id=opp.id,
        source_type=_legacy_origin_to_source_type(opp.origin),
        source_system=None,
        external_reference=None,
        original_context=opp.origin,
        is_primary=True,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def _enrich_opportunity(opp: DiscoveryOpportunity, db: Session) -> OpportunityOut:
    primary_source = _ensure_primary_source_for_legacy_origin(opp, db)
    latest_assessment = _get_latest_assessment(opp.id, db)
    return OpportunityOut(
        id=opp.id,
        product_id=opp.product_id,
        title=opp.title,
        description=opp.description,
        origin=opp.origin,
        impacted_area_id=opp.impacted_area_id,
        impacted_area_name=_resolve_area_name(opp.impacted_area_id, db) if opp.impacted_area_id else None,
        responsible_stakeholder_id=opp.responsible_stakeholder_id,
        responsible_name=_resolve_responsible_name(opp.responsible_stakeholder_id, db),
        identified_at=opp.identified_at,
        status=opp.status,
        journey_stage=opp.journey_stage or _default_journey_stage_for_status(opp.status),
        lifecycle_status=opp.lifecycle_status or _default_lifecycle_status_for_status(opp.status),
        priority=opp.priority,
        primary_source=OpportunitySourceOut.model_validate(primary_source) if primary_source else None,
        latest_assessment=OpportunityAssessmentSummary.model_validate(latest_assessment) if latest_assessment else None,
        created_at=opp.created_at,
        updated_at=opp.updated_at,
    )


@router.get("/opportunities", response_model=list[OpportunityOut])
def list_opportunities(
    product_id: Optional[int] = None,
    status: Optional[OpportunityStatus] = None,
    journey_stage: Optional[OpportunityJourneyStage] = None,
    lifecycle_status: Optional[OpportunityLifecycleStatus] = None,
    db: Session = Depends(get_db),
):
    q = db.query(DiscoveryOpportunity)
    if product_id:
        q = q.filter(DiscoveryOpportunity.product_id == product_id)
    if status:
        q = q.filter(DiscoveryOpportunity.status == status)
    if journey_stage:
        q = q.filter(DiscoveryOpportunity.journey_stage == journey_stage)
    if lifecycle_status:
        q = q.filter(DiscoveryOpportunity.lifecycle_status == lifecycle_status)
    return [_enrich_opportunity(o, db) for o in q.order_by(DiscoveryOpportunity.created_at.desc()).all()]


@router.post("/opportunities", response_model=OpportunityOut, status_code=status.HTTP_201_CREATED)
def create_opportunity(body: OpportunityCreate, db: Session = Depends(get_db)):
    payload = body.model_dump()
    payload["journey_stage"] = payload.get("journey_stage") or _default_journey_stage_for_status(body.status)
    payload["lifecycle_status"] = payload.get("lifecycle_status") or _default_lifecycle_status_for_status(body.status)
    obj = BaseRepository(DiscoveryOpportunity, db).create(payload)
    _ensure_primary_source_for_legacy_origin(obj, db)
    return _enrich_opportunity(obj, db)


@router.get("/opportunities/{id}", response_model=OpportunityOut)
def get_opportunity(id: str, db: Session = Depends(get_db)):
    return _enrich_opportunity(_get_or_404(DiscoveryOpportunity, id, db), db)


@router.patch("/opportunities/{id}", response_model=OpportunityOut)
def update_opportunity(id: str, body: OpportunityUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(DiscoveryOpportunity, db)
    obj = _get_or_404(DiscoveryOpportunity, id, db)
    payload = body.model_dump(exclude_unset=True)

    next_status = payload.get("status", obj.status)
    if "journey_stage" not in payload or payload["journey_stage"] is None:
        payload.pop("journey_stage", None)
    if "lifecycle_status" not in payload or payload["lifecycle_status"] is None:
        payload.pop("lifecycle_status", None)

    if "status" in payload:
        if "journey_stage" not in payload:
            payload["journey_stage"] = _default_journey_stage_for_status(next_status)
        if "lifecycle_status" not in payload:
            payload["lifecycle_status"] = _default_lifecycle_status_for_status(next_status)

    updated = repo.update(obj, payload)
    _ensure_primary_source_for_legacy_origin(updated, db)
    return _enrich_opportunity(updated, db)


@router.get("/opportunities/{opp_id}/sources", response_model=list[OpportunitySourceOut])
def list_opportunity_sources(opp_id: str, db: Session = Depends(get_db)):
    opp = _get_or_404(DiscoveryOpportunity, opp_id, db)
    _ensure_primary_source_for_legacy_origin(opp, db)
    rows = (
        db.query(OpportunitySource)
        .filter(OpportunitySource.opportunity_id == opp_id)
        .order_by(OpportunitySource.is_primary.desc(), OpportunitySource.created_at.asc())
        .all()
    )
    return [OpportunitySourceOut.model_validate(r) for r in rows]


@router.post("/opportunities/{opp_id}/sources", response_model=OpportunitySourceOut, status_code=status.HTTP_201_CREATED)
def create_opportunity_source(opp_id: str, body: OpportunitySourceCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    if body.is_primary:
        db.query(OpportunitySource).filter(OpportunitySource.opportunity_id == opp_id).update({"is_primary": False})
    obj = OpportunitySource(opportunity_id=opp_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return OpportunitySourceOut.model_validate(obj)


@router.patch("/opportunity-sources/{source_id}", response_model=OpportunitySourceOut)
def update_opportunity_source(source_id: str, body: OpportunitySourceUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(OpportunitySource, source_id, db)
    payload = body.model_dump(exclude_unset=True)
    if payload.get("is_primary") is True:
        db.query(OpportunitySource).filter(
            OpportunitySource.opportunity_id == obj.opportunity_id,
            OpportunitySource.id != obj.id,
        ).update({"is_primary": False})
    for key, value in payload.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return OpportunitySourceOut.model_validate(obj)


@router.delete("/opportunity-sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity_source(source_id: str, db: Session = Depends(get_db)):
    obj = _get_or_404(OpportunitySource, source_id, db)
    db.delete(obj)
    db.commit()


@router.get("/opportunities/{opp_id}/assessments", response_model=list[OpportunityAssessmentOut])
def list_opportunity_assessments(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = (
        db.query(OpportunityAssessment)
        .filter(OpportunityAssessment.opportunity_id == opp_id)
        .order_by(OpportunityAssessment.assessed_at.desc().nullslast(), OpportunityAssessment.created_at.desc())
        .all()
    )
    return [OpportunityAssessmentOut.model_validate(r) for r in rows]


@router.post("/opportunities/{opp_id}/assessments", response_model=OpportunityAssessmentOut, status_code=status.HTTP_201_CREATED)
def create_opportunity_assessment(opp_id: str, body: OpportunityAssessmentCreate, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    obj = OpportunityAssessment(opportunity_id=opp_id, **body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return OpportunityAssessmentOut.model_validate(obj)


@router.patch("/opportunity-assessments/{assessment_id}", response_model=OpportunityAssessmentOut)
def update_opportunity_assessment(assessment_id: str, body: OpportunityAssessmentUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(OpportunityAssessment, assessment_id, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return OpportunityAssessmentOut.model_validate(obj)


@router.delete("/opportunity-assessments/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity_assessment(assessment_id: str, db: Session = Depends(get_db)):
    obj = _get_or_404(OpportunityAssessment, assessment_id, db)
    db.delete(obj)
    db.commit()

@router.get("/opportunities/{opp_id}/decisions", response_model=list[OpportunityDecisionOut])
def list_opportunity_decisions(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    rows = (
        db.query(Decision)
        .filter(Decision.discovery_opportunity_id == opp_id)
        .order_by(Decision.decision_date.desc().nullslast(), Decision.created_at.desc())
        .all()
    )
    return [OpportunityDecisionOut.model_validate(r) for r in rows]

@router.post("/opportunities/{opp_id}/decisions", response_model=OpportunityDecisionOut, status_code=status.HTTP_201_CREATED)
def create_opportunity_decision(opp_id: str, body: OpportunityDecisionCreate, db: Session = Depends(get_db)):
    opp = _get_or_404(DiscoveryOpportunity, opp_id, db)
    if body.business_case_id:
        bc = db.get(DiscoveryBusinessCase, body.business_case_id)
        if not bc or bc.opportunity_id != opp_id:
            raise HTTPException(status_code=404, detail="Business case not found for this opportunity")

    obj = Decision(
        product_id=str(opp.product_id),
        title=body.title,
        context=body.context,
        decision=body.decision,
        consequences=body.consequences,
        status=body.status,
        tags=body.tags,
        discovery_opportunity_id=opp_id,
        business_case_id=body.business_case_id,
        decided_by=body.decided_by,
        decision_date=body.decision_date,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return OpportunityDecisionOut.model_validate(obj)

@router.patch("/opportunity-decisions/{decision_id}", response_model=OpportunityDecisionOut)
def update_opportunity_decision(decision_id: str, body: OpportunityDecisionUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(Decision, decision_id, db)
    if body.business_case_id:
        bc = db.get(DiscoveryBusinessCase, body.business_case_id)
        if not bc or (obj.discovery_opportunity_id and bc.opportunity_id != obj.discovery_opportunity_id):
            raise HTTPException(status_code=404, detail="Business case not found for this opportunity")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return OpportunityDecisionOut.model_validate(obj)

@router.delete("/opportunity-decisions/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity_decision(decision_id: str, db: Session = Depends(get_db)):
    obj = _get_or_404(Decision, decision_id, db)
    db.delete(obj)
    db.commit()
