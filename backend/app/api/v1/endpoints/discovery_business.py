from datetime import datetime
from typing import Optional


from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.discovery import (
    BusinessCaseStatus,
    CharterStatus,
    DiscoveryBusinessCase,
    DiscoveryOpportunity,
    ProjectCharter,
)
from app.models.roadmap import RoadmapItem, RoadmapItemStatus, RoadmapItemType
from app.repositories.base import BaseRepository

router = APIRouter()

ROADMAP_TYPE_DEFAULT = RoadmapItemType.strategic_initiative
ROADMAP_STATUS_DEFAULT = RoadmapItemStatus.planned


def _get_or_404(model, id: str, db: Session):
    obj = BaseRepository(model, db).get(id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


class BusinessCaseUpsert(BaseModel):
    title: str
    executive_summary: Optional[str] = None
    problem_statement: Optional[str] = None
    current_scenario: Optional[str] = None
    proposed_solution: Optional[str] = None
    expected_benefits: Optional[str] = None
    strategic_alignment: Optional[str] = None
    financial_impact: Optional[str] = None
    estimated_cost: Optional[str] = None
    estimated_effort: Optional[str] = None
    risks_summary: Optional[str] = None
    dependencies_summary: Optional[str] = None
    assumptions: Optional[str] = None
    constraints: Optional[str] = None
    go_no_go_recommendation: Optional[str] = None
    status: BusinessCaseStatus = BusinessCaseStatus.draft
    approved_by: Optional[int] = None


class BusinessCaseOut(BaseModel):
    id: str
    opportunity_id: str
    product_id: int
    title: str
    executive_summary: Optional[str] = None
    problem_statement: Optional[str] = None
    current_scenario: Optional[str] = None
    proposed_solution: Optional[str] = None
    expected_benefits: Optional[str] = None
    strategic_alignment: Optional[str] = None
    financial_impact: Optional[str] = None
    estimated_cost: Optional[str] = None
    estimated_effort: Optional[str] = None
    risks_summary: Optional[str] = None
    dependencies_summary: Optional[str] = None
    assumptions: Optional[str] = None
    constraints: Optional[str] = None
    go_no_go_recommendation: Optional[str] = None
    status: BusinessCaseStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectCharterUpsert(BaseModel):
    business_case_id: Optional[str] = None
    roadmap_item_id: Optional[str] = None
    project_name: str
    project_purpose: Optional[str] = None
    business_objective: Optional[str] = None
    objectives: Optional[str] = None
    scope_in: Optional[str] = None
    scope_out: Optional[str] = None
    success_criteria: Optional[str] = None
    high_level_requirements: Optional[str] = None
    major_deliverables: Optional[str] = None
    high_level_timeline: Optional[str] = None
    budget_summary: Optional[str] = None
    risks_summary: Optional[str] = None
    assumptions_constraints: Optional[str] = None
    sponsor_name: Optional[str] = None
    project_manager_name: Optional[str] = None
    status: CharterStatus = CharterStatus.draft
    approved_by: Optional[int] = None


class ProjectCharterOut(BaseModel):
    id: str
    business_case_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    roadmap_item_id: Optional[str] = None
    product_id: int
    project_name: str
    project_purpose: Optional[str] = None
    business_objective: Optional[str] = None
    objectives: Optional[str] = None
    scope_in: Optional[str] = None
    scope_out: Optional[str] = None
    success_criteria: Optional[str] = None
    high_level_requirements: Optional[str] = None
    major_deliverables: Optional[str] = None
    high_level_timeline: Optional[str] = None
    budget_summary: Optional[str] = None
    risks_summary: Optional[str] = None
    assumptions_constraints: Optional[str] = None
    sponsor_name: Optional[str] = None
    project_manager_name: Optional[str] = None
    status: CharterStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/opportunities/{opp_id}/business-case", response_model=Optional[BusinessCaseOut])
def get_business_case(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    return (
        db.query(DiscoveryBusinessCase)
        .filter(
            DiscoveryBusinessCase.opportunity_id == opp_id,
            DiscoveryBusinessCase.is_deleted == False,
        )
        .first()
    )


@router.put("/opportunities/{opp_id}/business-case", response_model=BusinessCaseOut)
def upsert_business_case(opp_id: str, body: BusinessCaseUpsert, db: Session = Depends(get_db)):
    opp = _get_or_404(DiscoveryOpportunity, opp_id, db)
    obj = (
        db.query(DiscoveryBusinessCase)
        .filter(
            DiscoveryBusinessCase.opportunity_id == opp_id,
            DiscoveryBusinessCase.is_deleted == False,
        )
        .first()
    )
    data = body.model_dump()
    approved_at = datetime.utcnow() if data.get("status") == BusinessCaseStatus.approved else None
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.approved_at = approved_at
        db.commit()
        db.refresh(obj)
        return obj

    obj = DiscoveryBusinessCase(
        opportunity_id=opp_id,
        product_id=opp.product_id,
        approved_at=approved_at,
        **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/opportunities/{opp_id}/project-charter", response_model=Optional[ProjectCharterOut])
def get_project_charter_by_opportunity(opp_id: str, db: Session = Depends(get_db)):
    _get_or_404(DiscoveryOpportunity, opp_id, db)
    return (
        db.query(ProjectCharter)
        .filter(ProjectCharter.opportunity_id == opp_id, ProjectCharter.is_deleted == False)
        .first()
    )


@router.put("/opportunities/{opp_id}/project-charter", response_model=ProjectCharterOut)
def upsert_project_charter_for_opportunity(
    opp_id: str, body: ProjectCharterUpsert, db: Session = Depends(get_db)
):
    opp = _get_or_404(DiscoveryOpportunity, opp_id, db)
    if body.business_case_id:
        bc = _get_or_404(DiscoveryBusinessCase, body.business_case_id, db)
        if bc.opportunity_id != opp_id:
            raise HTTPException(status_code=400, detail="Business case does not belong to this opportunity")
    if body.roadmap_item_id:
        roadmap = _get_or_404(RoadmapItem, body.roadmap_item_id, db)
        if str(roadmap.product_id) != str(opp.product_id):
            raise HTTPException(status_code=400, detail="Roadmap item belongs to another product")

    obj = (
        db.query(ProjectCharter)
        .filter(ProjectCharter.opportunity_id == opp_id, ProjectCharter.is_deleted == False)
        .first()
    )
    data = body.model_dump()
    approved_at = datetime.utcnow() if data.get("status") == CharterStatus.approved else None
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.approved_at = approved_at
        db.commit()
        db.refresh(obj)
        return obj

    obj = ProjectCharter(
        opportunity_id=opp_id,
        product_id=opp.product_id,
        approved_at=approved_at,
        **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/roadmap/{roadmap_item_id}/project-charter", response_model=Optional[ProjectCharterOut])
def get_project_charter_by_roadmap(roadmap_item_id: str, db: Session = Depends(get_db)):
    _get_or_404(RoadmapItem, roadmap_item_id, db)
    return (
        db.query(ProjectCharter)
        .filter(
            ProjectCharter.roadmap_item_id == roadmap_item_id,
            ProjectCharter.is_deleted == False,
        )
        .first()
    )


@router.put("/roadmap/{roadmap_item_id}/project-charter", response_model=ProjectCharterOut)
def upsert_project_charter_for_roadmap(
    roadmap_item_id: str, body: ProjectCharterUpsert, db: Session = Depends(get_db)
):
    roadmap = _get_or_404(RoadmapItem, roadmap_item_id, db)
    if body.business_case_id:
        _get_or_404(DiscoveryBusinessCase, body.business_case_id, db)
    obj = (
        db.query(ProjectCharter)
        .filter(
            ProjectCharter.roadmap_item_id == roadmap_item_id,
            ProjectCharter.is_deleted == False,
        )
        .first()
    )
    data = body.model_dump()
    approved_at = datetime.utcnow() if data.get("status") == CharterStatus.approved else None
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.approved_at = approved_at
        db.commit()
        db.refresh(obj)
        return obj

    obj = ProjectCharter(
        roadmap_item_id=roadmap_item_id,
        product_id=int(roadmap.product_id),
        approved_at=approved_at,
        **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


class ForwardToRoadmapIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quarter: Optional[str] = None
    item_type: RoadmapItemType = ROADMAP_TYPE_DEFAULT
    roadmap_status: RoadmapItemStatus = ROADMAP_STATUS_DEFAULT
    roadmap_item_id: Optional[str] = None


class ForwardToRoadmapOut(BaseModel):
    opportunity_id: str
    roadmap_item_id: str
    roadmap_title: str
    opportunity_status: str
    journey_stage: str
    lifecycle_status: str


@router.post("/opportunities/{opp_id}/forward-to-roadmap", response_model=ForwardToRoadmapOut, status_code=status.HTTP_201_CREATED)
def forward_opportunity_to_roadmap(
    opp_id: str,
    body: ForwardToRoadmapIn,
    db: Session = Depends(get_db),
):
    opp = _get_or_404(DiscoveryOpportunity, opp_id, db)

    business_case = (
        db.query(DiscoveryBusinessCase)
        .filter(
            DiscoveryBusinessCase.opportunity_id == opp_id,
            DiscoveryBusinessCase.is_deleted == False,
        )
        .first()
    )
    project_charter = (
        db.query(ProjectCharter)
        .filter(
            ProjectCharter.opportunity_id == opp_id,
            ProjectCharter.is_deleted == False,
        )
        .first()
    )

    if not business_case:
        raise HTTPException(status_code=409, detail="Business Case is required before forwarding to Roadmap")
    if not project_charter:
        raise HTTPException(status_code=409, detail="Project Charter is required before forwarding to Roadmap")

    if body.roadmap_item_id:
        roadmap_item = _get_or_404(RoadmapItem, body.roadmap_item_id, db)
        if str(roadmap_item.product_id) != str(opp.product_id):
            raise HTTPException(status_code=400, detail="Roadmap item belongs to another product")
    else:
        title = (
            body.title
            or project_charter.project_name
            or business_case.title
            or opp.title
        )
        description_parts = [
            body.description,
            project_charter.project_purpose,
            business_case.executive_summary,
            opp.description,
        ]
        description = next((part for part in description_parts if part), None)

        roadmap_item = RoadmapItem(
            product_id=str(opp.product_id),
            title=title,
            description=description,
            type=body.item_type,
            status=body.roadmap_status,
            quarter=body.quarter,
        )
        db.add(roadmap_item)
        db.flush()

    project_charter.roadmap_item_id = roadmap_item.id
    if not project_charter.business_case_id and business_case:
        project_charter.business_case_id = business_case.id

    opp.status = "forwarded_to_roadmap"
    opp.journey_stage = "decide"
    opp.lifecycle_status = "active"

    db.commit()
    db.refresh(roadmap_item)
    db.refresh(opp)
    db.refresh(project_charter)

    return ForwardToRoadmapOut(
        opportunity_id=opp.id,
        roadmap_item_id=roadmap_item.id,
        roadmap_title=roadmap_item.title,
        opportunity_status=opp.status.value if hasattr(opp.status, "value") else str(opp.status),
        journey_stage=opp.journey_stage.value if hasattr(opp.journey_stage, "value") else str(opp.journey_stage),
        lifecycle_status=opp.lifecycle_status.value if hasattr(opp.lifecycle_status, "value") else str(opp.lifecycle_status),
    )
