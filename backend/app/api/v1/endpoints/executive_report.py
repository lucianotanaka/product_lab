"""
Executive Report — Opportunities × Roadmap
Aggregates data from multiple modules to produce a single executive dashboard payload.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.discovery import (
    DiscoveryOpportunity,
    OpportunityJourneyStage,
    OpportunityLifecycleStatus,
    OpportunityStatus,
    DiscoveryBusinessCase,
    ProjectCharter,
    BusinessCaseStatus,
    CharterStatus,
    OpportunitySource,
)
from app.models.decision import Decision, DecisionStatus
from app.models.roadmap import RoadmapItem, RoadmapItemStatus
from app.models.prioritization import QuarterPrioritizationItem
from app.models.risk import Risk, RiskLink, RiskStatus

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _safe(val, default=None):
    return val if val is not None else default


@router.get("/summary")
def get_executive_summary(
    product_id: str = Query(..., description="Product ID"),
    fiscal_year: Optional[int] = Query(None, description="Fiscal year filter (e.g. 2026)"),
    quarter: Optional[str] = Query(None, description="Quarter filter (Q1-Q4)"),
    db: Session = Depends(get_db),
):
    """
    Single aggregated endpoint for the Executive Report dashboard.
    Returns KPIs, funnel, governance, roadmap initiatives, quarter prioritization and risks.
    """
    # product_id type split: Integer columns vs String(36) columns
    try:
        pid_int = int(product_id)
    except (ValueError, TypeError):
        pid_int = None
    pid_str = str(product_id)

    # ── 1. Opportunities (product_id = Integer) ───────────────────────────────
    opps = db.query(DiscoveryOpportunity).filter(
        DiscoveryOpportunity.product_id == pid_int
    ).all()
    opp_ids = [o.id for o in opps]

    active_opps = [o for o in opps if o.lifecycle_status == OpportunityLifecycleStatus.active]
    validated_count = sum(
        1 for o in opps
        if o.status in (OpportunityStatus.validated, OpportunityStatus.forwarded_to_roadmap)
    )

    # Journey stage funnel (active only)
    stage_order = [
        OpportunityJourneyStage.capture,
        OpportunityJourneyStage.assess,
        OpportunityJourneyStage.discover,
        OpportunityJourneyStage.evaluate,
        OpportunityJourneyStage.decide,
    ]
    funnel: List[Dict[str, Any]] = [
        {"stage": stage.value, "count": sum(1 for o in active_opps if o.journey_stage == stage)}
        for stage in stage_order
    ]

    # Source breakdown
    if opp_ids:
        sources_q = (
            db.query(OpportunitySource.source_type, func.count(OpportunitySource.id))
            .filter(OpportunitySource.opportunity_id.in_(opp_ids))
            .group_by(OpportunitySource.source_type)
            .all()
        )
        source_breakdown = [
            {"source": st.value if st else "other", "count": cnt}
            for st, cnt in sources_q
        ]
    else:
        source_breakdown = []

    # ── 2. Business Cases (product_id = Integer) ─────────────────────────────
    bcs = db.query(DiscoveryBusinessCase).filter(
        DiscoveryBusinessCase.product_id == pid_int,
        DiscoveryBusinessCase.is_deleted == False,
    ).all()
    bc_by_opp: Dict[str, DiscoveryBusinessCase] = {b.opportunity_id: b for b in bcs}
    bc_approved = sum(1 for b in bcs if b.status == BusinessCaseStatus.approved)
    bc_in_review = sum(1 for b in bcs if b.status == BusinessCaseStatus.in_review)

    # ── 3. Project Charters (product_id = Integer) ───────────────────────────
    charters = db.query(ProjectCharter).filter(
        ProjectCharter.product_id == pid_int,
        ProjectCharter.is_deleted == False,
    ).all()
    charter_by_roadmap: Dict[str, ProjectCharter] = {}
    for c in charters:
        if c.roadmap_item_id:
            charter_by_roadmap[c.roadmap_item_id] = c
    charter_in_execution = sum(1 for c in charters if c.status == CharterStatus.in_execution)

    # ── 4. Decisions (product_id = String(36)) ────────────────────────────────
    decisions = db.query(Decision).filter(Decision.product_id == pid_str).all()
    decisions_accepted = sum(1 for d in decisions if d.status == DecisionStatus.accepted)
    decisions_pending_list = [
        {
            "id": d.id,
            "title": d.title,
            "context": (_safe(d.context, ""))[:200],
            "status": d.status.value if d.status else "proposed",
            "decided_by": _safe(d.decided_by),
            "decision_date": d.decision_date.isoformat() if d.decision_date else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in decisions if d.status == DecisionStatus.proposed
    ]
    decisions_by_opp: Dict[str, Decision] = {}
    for d in decisions:
        if d.discovery_opportunity_id and d.discovery_opportunity_id not in decisions_by_opp:
            decisions_by_opp[d.discovery_opportunity_id] = d

    # ── 5. Roadmap (product_id = String(36)) ─────────────────────────────────
    roadmap_q = db.query(RoadmapItem).filter(
        RoadmapItem.product_id == pid_str,
        RoadmapItem.status != RoadmapItemStatus.cancelled,
    )
    if quarter:
        roadmap_q = roadmap_q.filter(RoadmapItem.quarter == quarter)
    roadmap_items = roadmap_q.order_by(RoadmapItem.created_at.desc()).all()
    roadmap_ids = [r.id for r in roadmap_items]

    exec_status_counts: Dict[str, int] = {}
    for item in roadmap_items:
        key = item.executive_status.value if item.executive_status else "not_started"
        exec_status_counts[key] = exec_status_counts.get(key, 0) + 1

    attention_count = sum(1 for r in roadmap_items if r.attention_flag)

    # ── 6. Quarter Prioritization ─────────────────────────────────────────────
    if roadmap_ids:
        qpi_q = db.query(QuarterPrioritizationItem).filter(
            QuarterPrioritizationItem.product_id == pid_str,
            QuarterPrioritizationItem.roadmap_item_id.in_(roadmap_ids),
        )
        if fiscal_year:
            qpi_q = qpi_q.filter(QuarterPrioritizationItem.fiscal_year == fiscal_year)
        if quarter:
            qpi_q = qpi_q.filter(QuarterPrioritizationItem.quarter == quarter)
        qpi_items = qpi_q.order_by(QuarterPrioritizationItem.priority_rank).all()
    else:
        qpi_items = []

    qpi_by_roadmap: Dict[str, QuarterPrioritizationItem] = {
        q.roadmap_item_id: q for q in qpi_items
    }

    # ── 7. Risks ──────────────────────────────────────────────────────────────
    risks_all = db.query(Risk).filter(Risk.product_id == pid_str).all()
    risks_open_count = sum(1 for r in risks_all if r.status == RiskStatus.identified)
    risks_mitigated_count = sum(1 for r in risks_all if r.status == RiskStatus.mitigated)
    risks_accepted_count = sum(1 for r in risks_all if r.status == RiskStatus.accepted)
    risks_closed_count = sum(1 for r in risks_all if r.status == RiskStatus.closed)

    if roadmap_ids:
        risk_links = db.query(RiskLink).filter(
            RiskLink.entity_type == "roadmap",
            RiskLink.entity_id.in_(roadmap_ids),
        ).all()
    else:
        risk_links = []

    risk_ids_linked = {rl.risk_id for rl in risk_links}
    risks_by_id: Dict[str, Risk] = {
        r.id: r for r in risks_all if r.id in risk_ids_linked
    }
    risks_by_roadmap: Dict[str, List[Risk]] = {}
    for rl in risk_links:
        risk_obj = risks_by_id.get(rl.risk_id)
        if risk_obj:
            risks_by_roadmap.setdefault(rl.entity_id, []).append(risk_obj)

    # ── 8. Build initiatives table ────────────────────────────────────────────
    opp_by_id: Dict[str, DiscoveryOpportunity] = {o.id: o for o in opps}

    initiatives: List[Dict[str, Any]] = []
    for item in roadmap_items:
        charter = charter_by_roadmap.get(item.id)
        opp = opp_by_id.get(charter.opportunity_id) if (charter and charter.opportunity_id) else None
        bc = bc_by_opp.get(opp.id) if opp else None
        decision = decisions_by_opp.get(opp.id) if opp else None
        qpi = qpi_by_roadmap.get(item.id)
        item_risks = risks_by_roadmap.get(item.id, [])

        opp_data = None
        if opp:
            opp_data = {
                "id": opp.id,
                "title": opp.title,
                "status": opp.status.value if opp.status else None,
                "journey_stage": opp.journey_stage.value if opp.journey_stage else None,
                "lifecycle_status": opp.lifecycle_status.value if opp.lifecycle_status else None,
            }

        bc_data = None
        if bc:
            bc_data = {
                "id": bc.id,
                "status": bc.status.value if bc.status else None,
                "go_no_go_recommendation": _safe(bc.go_no_go_recommendation),
                "estimated_cost": _safe(bc.estimated_cost),
                "estimated_effort": _safe(bc.estimated_effort),
                "approved_by": bc.approved_by,
                "approved_at": bc.approved_at.isoformat() if bc.approved_at else None,
            }

        charter_data = None
        if charter:
            charter_data = {
                "id": charter.id,
                "status": charter.status.value if charter.status else None,
                "sponsor_name": _safe(charter.sponsor_name),
                "project_manager_name": _safe(charter.project_manager_name),
                "success_criteria": (_safe(charter.success_criteria, ""))[:200],
                "budget_summary": (_safe(charter.budget_summary, ""))[:150],
                "high_level_timeline": (_safe(charter.high_level_timeline, ""))[:150],
            }

        decision_data = None
        if decision:
            decision_data = {
                "id": decision.id,
                "title": decision.title,
                "status": decision.status.value if decision.status else None,
                "decided_by": _safe(decision.decided_by),
                "decision_date": decision.decision_date.isoformat() if decision.decision_date else None,
            }

        qpi_data = None
        if qpi:
            qpi_data = {
                "id": str(qpi.id),
                "priority_rank": qpi.priority_rank,
                "quarter_score": float(qpi.quarter_score) if qpi.quarter_score else 0.0,
                "business_value": float(qpi.business_value) if qpi.business_value else 0.0,
                "time_criticality": float(qpi.urgency) if qpi.urgency else 0.0,
                "risk_reduction": float(qpi.strategic_alignment) if qpi.strategic_alignment else 0.0,
                "job_size": float(qpi.estimated_effort) if qpi.estimated_effort else 0.0,
                "delivery_risk": float(qpi.delivery_risk) if qpi.delivery_risk else 0.0,
                "dependency_readiness": float(qpi.dependency_readiness) if qpi.dependency_readiness else 0.0,
                "confidence": float(qpi.confidence) if qpi.confidence else 0.0,
                "planning_status": _safe(qpi.planning_status, "candidate"),
                "fiscal_year": qpi.fiscal_year,
                "quarter": qpi.quarter,
                "decision_rationale": (_safe(qpi.decision_rationale, ""))[:200],
            }

        risks_data = {
            "total": len(item_risks),
            "open": sum(1 for r in item_risks if r.status == RiskStatus.identified),
            "mitigated": sum(1 for r in item_risks if r.status == RiskStatus.mitigated),
            "accepted": sum(1 for r in item_risks if r.status == RiskStatus.accepted),
            "max_score": max((r.risk_score or 0 for r in item_risks), default=0),
            "critical": [
                {
                    "id": r.id,
                    "title": r.title,
                    "risk_score": r.risk_score or 0,
                    "status": r.status.value if r.status else None,
                    "responsible": _safe(r.responsible),
                }
                for r in sorted(item_risks, key=lambda x: x.risk_score or 0, reverse=True)[:3]
                if (r.risk_score or 0) >= 9
            ],
        }

        initiatives.append({
            "roadmap_item": {
                "id": item.id,
                "title": item.title,
                "type": item.type.value if item.type else None,
                "quarter": _safe(item.quarter),
                "status": item.status.value if item.status else None,
                "executive_status": item.executive_status.value if item.executive_status else "not_started",
                "executive_summary": (_safe(item.executive_summary, ""))[:300],
                "executive_next_step": _safe(item.executive_next_step, ""),
                "executive_owner_name": _safe(item.executive_owner_name),
                "executive_risk_dependency": _safe(item.executive_risk_dependency, ""),
                "committed_deadline": item.committed_deadline.isoformat() if item.committed_deadline else None,
                "attention_flag": bool(item.attention_flag),
                "attention_reason": _safe(item.attention_reason),
            },
            "opportunity": opp_data,
            "business_case": bc_data,
            "project_charter": charter_data,
            "decision": decision_data,
            "prioritization": qpi_data,
            "risks": risks_data,
        })

    # ── 9. Build quarter ranking list ─────────────────────────────────────────
    quarter_ranking: List[Dict[str, Any]] = []
    for qpi in sorted(qpi_items, key=lambda x: x.priority_rank or 999):
        ri = next((r for r in roadmap_items if r.id == qpi.roadmap_item_id), None)
        if ri:
            quarter_ranking.append({
                "roadmap_item_id": qpi.roadmap_item_id,
                "roadmap_item_title": ri.title,
                "priority_rank": qpi.priority_rank,
                "quarter_score": float(qpi.quarter_score) if qpi.quarter_score else 0.0,
                "business_value": float(qpi.business_value) if qpi.business_value else 0.0,
                "time_criticality": float(qpi.urgency) if qpi.urgency else 0.0,
                "risk_reduction": float(qpi.strategic_alignment) if qpi.strategic_alignment else 0.0,
                "delivery_risk": float(qpi.delivery_risk) if qpi.delivery_risk else 0.0,
                "dependency_readiness": float(qpi.dependency_readiness) if qpi.dependency_readiness else 0.0,
                "confidence": float(qpi.confidence) if qpi.confidence else 0.0,
                "estimated_effort": float(qpi.estimated_effort) if qpi.estimated_effort else 0.0,
                "planning_status": _safe(qpi.planning_status, "candidate"),
                "fiscal_year": qpi.fiscal_year,
                "quarter": qpi.quarter,
                "decision_rationale": (_safe(qpi.decision_rationale, ""))[:300],
            })

    # ── 10. Final response ────────────────────────────────────────────────────
    return {
        "kpis": {
            "total_active_opportunities": len(active_opps),
            "validated_opportunities": validated_count,
            "decisions_accepted": decisions_accepted,
            "decisions_pending": len(decisions_pending_list),
            "roadmap_items_active": len(roadmap_items),
            "risks_open": risks_open_count,
            "attention_items": attention_count,
            "business_cases_approved": bc_approved,
            "business_cases_in_review": bc_in_review,
            "charters_in_execution": charter_in_execution,
        },
        "opportunity_funnel": funnel,
        "source_breakdown": source_breakdown,
        "governance": {
            "decisions_pending": decisions_pending_list,
        },
        "roadmap_status": {
            "by_executive_status": exec_status_counts,
            "attention_count": attention_count,
        },
        "roadmap_initiatives": initiatives,
        "quarter_prioritization": quarter_ranking,
        "risks_summary": {
            "total": len(risks_all),
            "open": risks_open_count,
            "mitigated": risks_mitigated_count,
            "accepted": risks_accepted_count,
            "closed": risks_closed_count,
        },
    }
