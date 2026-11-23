import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Date, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy import Enum as SAE
from app.core.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class OpportunityStatus(str, Enum):
    identified           = "identified"
    under_investigation  = "under_investigation"
    validated            = "validated"
    paused               = "paused"
    discarded            = "discarded"
    forwarded_to_roadmap = "forwarded_to_roadmap"


class OpportunityJourneyStage(str, Enum):
    capture  = "capture"
    assess   = "assess"
    discover = "discover"
    evaluate = "evaluate"
    decide   = "decide"


class OpportunityLifecycleStatus(str, Enum):
    active  = "active"
    on_hold = "on_hold"
    closed  = "closed"


class OpportunityAssessmentType(str, Enum):
    initial               = "initial"
    post_discovery_review = "post_discovery_review"
    reassessment          = "reassessment"


class AssessmentLevel(str, Enum):
    low     = "low"
    medium  = "medium"
    high    = "high"
    unknown = "unknown"


class OpportunityAssessmentRecommendation(str, Enum):
    discovery_required      = "discovery_required"
    ready_for_evaluation    = "ready_for_evaluation"
    more_information_required = "more_information_required"
    hold                    = "hold"
    merge                   = "merge"
    do_not_pursue           = "do_not_pursue"


class OpportunitySourceType(str, Enum):
    stakeholder_request = "stakeholder_request"
    customer_feedback   = "customer_feedback"
    data_analysis       = "data_analysis"
    market_research     = "market_research"
    consultant_discovery = "consultant_discovery"
    external_demand_system = "external_demand_system"
    workshop            = "workshop"
    regulatory_requirement = "regulatory_requirement"
    internal_analysis   = "internal_analysis"
    other               = "other"


class ResearchType(str, Enum):
    interview    = "interview"
    meeting      = "meeting"
    observation  = "observation"
    survey       = "survey"
    quantitative = "quantitative"
    feedback     = "feedback"
    document     = "document"
    evidence     = "evidence"


class ReliabilityLevel(str, Enum):
    high   = "high"
    medium = "medium"
    low    = "low"


class ConfidenceLevel(str, Enum):
    high   = "high"
    medium = "medium"
    low    = "low"


class ImpactLevel(str, Enum):
    high   = "high"
    medium = "medium"
    low    = "low"


class UncertaintyLevel(str, Enum):
    high   = "high"
    medium = "medium"
    low    = "low"


class JobType(str, Enum):
    principal = "principal"
    secondary = "secondary"


class AssumptionType(str, Enum):
    desirability = "desirability"
    viability    = "viability"
    usability    = "usability"
    value        = "value"
    data         = "data"
    technology   = "technology"
    process      = "process"


class AssumptionStatus(str, Enum):
    unvalidated = "unvalidated"
    in_progress = "in_progress"
    validated   = "validated"
    invalidated = "invalidated"


class SolutionComplexity(str, Enum):
    low       = "low"
    medium    = "medium"
    high      = "high"
    very_high = "very_high"


class SolutionStatus(str, Enum):
    idea             = "idea"
    under_evaluation = "under_evaluation"
    selected         = "selected"
    discarded        = "discarded"


class ExperimentMethod(str, Enum):
    prototype            = "prototype"
    interview            = "interview"
    usability_test       = "usability_test"
    mvp                  = "mvp"
    pilot                = "pilot"
    data_analysis        = "data_analysis"
    ab_test              = "ab_test"
    technical_validation = "technical_validation"


class ExperimentStatus(str, Enum):
    planned     = "planned"
    in_progress = "in_progress"
    completed   = "completed"
    cancelled   = "cancelled"


class MetricType(str, Enum):
    adoption         = "adoption"
    efficiency       = "efficiency"
    quality          = "quality"
    satisfaction     = "satisfaction"
    business_result  = "business_result"
    data_reliability = "data_reliability"


class ResearchStatus(str, Enum):
    planned     = "planned"
    in_progress = "in_progress"
    completed   = "completed"
    cancelled   = "cancelled"


class BusinessCaseStatus(str, Enum):
    draft      = "draft"
    in_review  = "in_review"
    approved   = "approved"
    rejected   = "rejected"


class CharterStatus(str, Enum):
    draft        = "draft"
    approved     = "approved"
    in_execution = "in_execution"
    on_hold      = "on_hold"
    closed       = "closed"


# ─── Table 1: discovery_opportunities ────────────────────────────────────────

class DiscoveryOpportunity(Base):
    """Core entity of the Discovery module — identified opportunity."""
    __tablename__ = "discovery_opportunities"

    id                         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id                 = Column(Integer, nullable=False, index=True)
    title                      = Column(String(300), nullable=False)
    description                = Column(Text)
    origin                     = Column(String(200))
    impacted_area_id           = Column(Integer, nullable=True, index=True)  # legacy single FK — kept for compat
    responsible_stakeholder_id = Column(Integer, nullable=True, index=True)  # FK → stakeholders.stakeholder_id
    identified_at              = Column(Date, nullable=True)
    status                     = Column(SAE(OpportunityStatus), default=OpportunityStatus.identified, nullable=False)
    journey_stage              = Column(SAE(OpportunityJourneyStage), default=OpportunityJourneyStage.capture, nullable=False)
    lifecycle_status           = Column(SAE(OpportunityLifecycleStatus), default=OpportunityLifecycleStatus.active, nullable=False)
    priority                   = Column(Integer, default=3)
    created_at                 = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at                 = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 1b: discovery_opportunity_areas (N:M) ─────────────────────────────

class DiscoveryOpportunityArea(Base):
    """N:M link between opportunity and business areas with impact type."""
    __tablename__ = "discovery_opportunity_areas"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id = Column(String(36), ForeignKey("discovery_opportunities.id", ondelete="CASCADE"), nullable=False, index=True)
    area_id        = Column(Integer, nullable=False, index=True)  # FK → business_areas.id
    impact_type    = Column(String(20), default="direct", nullable=False)   # direct | indirect
    is_primary     = Column(Boolean, default=False, nullable=False)
    notes          = Column(Text)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)


# ─── Table 2: discovery_problem_statements ───────────────────────────────────

class DiscoveryProblemStatement(Base):
    """Defines the problem clearly before discussing a solution (1:1 with opportunity)."""
    __tablename__ = "discovery_problem_statements"

    id                      = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id          = Column(String(36), nullable=False, index=True)
    observed_problem        = Column(Text)
    who_is_affected         = Column(Text)
    current_impact          = Column(Text)
    available_evidence      = Column(Text)
    consequence_of_inaction = Column(Text)
    created_at              = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 2b: discovery_problem_affected_areas (N:M) ────────────────────────

class DiscoveryProblemAffectedArea(Base):
    """Structured areas affected by the problem (complements who_is_affected text)."""
    __tablename__ = "discovery_problem_affected_areas"

    id                   = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_statement_id = Column(String(36), ForeignKey("discovery_problem_statements.id", ondelete="CASCADE"), nullable=False, index=True)
    area_id              = Column(Integer, nullable=False, index=True)  # FK → business_areas.id
    impact_type          = Column(String(20), default="direct", nullable=False)   # direct | indirect
    description          = Column(Text)   # how specifically this area is affected
    created_at           = Column(DateTime, default=datetime.utcnow, nullable=False)


# ─── Table 4: discovery_jtbd ──────────────────────────────────────────────────

class DiscoveryJTBD(Base):
    """Customer Jobs / Jobs To Be Done — reusable by VPC."""
    __tablename__ = "discovery_jtbd"

    id               = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id       = Column(Integer, nullable=False, index=True)
    opportunity_id   = Column(String(36), nullable=True, index=True)
    description      = Column(Text, nullable=False)
    job_type         = Column(SAE(JobType), default=JobType.principal, nullable=False)
    priority         = Column(Integer, default=3)
    frequency        = Column(String(100))
    context          = Column(Text)
    expected_result  = Column(Text)
    impacted_area_id = Column(Integer, nullable=True, index=True)  # optional FK → business_areas.id
    vpc_item_id      = Column(String(36), nullable=True)   # link → vpc_items for VPC reuse
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table: research_templates ────────────────────────────────────────────────

class ResearchTemplate(Base):
    """Library of research templates with structured questions."""
    __tablename__ = "research_templates"

    id               = Column(String(36), primary_key=True)
    research_type    = Column(SAE(ResearchType), nullable=False, index=True)
    name             = Column(String(200), nullable=False)
    description      = Column(Text)
    objective        = Column(Text)
    when_to_use      = Column(Text)
    expected_outputs = Column(Text)
    opening_script   = Column(Text)
    reference        = Column(String(300))
    version          = Column(String(10), default="1.0", nullable=False)
    is_active        = Column(String(5), default="true", nullable=False)
    sort_order       = Column(Integer, default=0, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)


class ResearchTemplateQuestion(Base):
    """Questions belonging to a research template."""
    __tablename__ = "research_template_questions"

    id                   = Column(String(36), primary_key=True)
    template_id          = Column(String(36), ForeignKey("research_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    section              = Column(String(20), default="during", nullable=False)  # before|during|after
    question             = Column(Text, nullable=False)
    hint                 = Column(Text)
    is_research_question = Column(String(5), default="false", nullable=False)
    question_type        = Column(String(30), default="open_text", nullable=False)
    is_required          = Column(String(5), default="false", nullable=False)
    sort_order           = Column(Integer, default=0, nullable=False)


class ResearchAnswer(Base):
    """Answers/observations recorded during a research session."""
    __tablename__ = "research_answers"

    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    research_id     = Column(String(36), ForeignKey("discovery_research.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id     = Column(String(36), ForeignKey("research_template_questions.id", ondelete="SET NULL"), nullable=True, index=True)
    section         = Column(String(20), default="during", nullable=False)  # before|during|after
    sort_order      = Column(Integer, default=0, nullable=False)
    custom_question = Column(Text)
    answer          = Column(Text)
    status          = Column(String(20), default="pending", nullable=False)  # pending|answered|skipped|na
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)


# ─── Table 5: discovery_research ─────────────────────────────────────────────

class DiscoveryResearch(Base):
    """Centralises the evidence and research used in Discovery."""
    __tablename__ = "discovery_research"

    id                 = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id     = Column(String(36), nullable=False, index=True)
    research_type      = Column(SAE(ResearchType), nullable=False)
    template_id        = Column(String(36), ForeignKey("research_templates.id", ondelete="SET NULL"), nullable=True)
    participants       = Column(Text)
    research_date      = Column(Date, nullable=True)
    objective          = Column(Text)
    research_questions = Column(Text)
    consent_obtained   = Column(String(5), default="false")
    duration_minutes   = Column(Integer, nullable=True)
    context            = Column(Text)
    questions          = Column(Text)   # legacy free-text fallback
    findings           = Column(Text)
    evidence           = Column(Text)
    source             = Column(String(300))
    summary            = Column(Text)
    reliability        = Column(SAE(ReliabilityLevel), default=ReliabilityLevel.medium, nullable=False)
    session_status     = Column(SAE(ResearchStatus), default=ResearchStatus.planned, nullable=False)
    created_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 6: discovery_insights ─────────────────────────────────────────────

class DiscoveryInsight(Base):
    """Transforms collected information into useful conclusions about the problem/user."""
    __tablename__ = "discovery_insights"

    id                  = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id      = Column(String(36), nullable=False, index=True)
    research_id         = Column(String(36), nullable=True, index=True)
    insight             = Column(Text, nullable=False)
    affected_audience   = Column(Text)
    impact              = Column(SAE(ImpactLevel), default=ImpactLevel.medium, nullable=False)
    observed_frequency  = Column(String(100))
    confidence          = Column(SAE(ConfidenceLevel), default=ConfidenceLevel.medium, nullable=False)
    product_implication = Column(Text)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 7: discovery_assumptions ──────────────────────────────────────────

class DiscoveryAssumption(Base):
    """Records hypotheses that have not yet been proven."""
    __tablename__ = "discovery_assumptions"

    id                = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id    = Column(String(36), nullable=False, index=True)
    hypothesis        = Column(Text, nullable=False)
    assumption_type   = Column(SAE(AssumptionType), nullable=False)
    impact            = Column(SAE(ImpactLevel), default=ImpactLevel.medium, nullable=False)
    uncertainty_level = Column(SAE(UncertaintyLevel), default=UncertaintyLevel.high, nullable=False)
    existing_evidence = Column(Text)
    validation_method = Column(Text)
    status            = Column(SAE(AssumptionStatus), default=AssumptionStatus.unvalidated, nullable=False)
    created_at        = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 8: discovery_solution_ideas ───────────────────────────────────────

class DiscoverySolutionIdea(Base):
    """Possible solutions recorded without treating them as a final decision."""
    __tablename__ = "discovery_solution_ideas"

    id                   = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id       = Column(String(36), nullable=False, index=True)
    idea                 = Column(String(300), nullable=False)
    description          = Column(Text)
    related_problem      = Column(Text)
    expected_benefit     = Column(Text)
    estimated_complexity = Column(SAE(SolutionComplexity), default=SolutionComplexity.medium, nullable=False)
    risks                = Column(Text)
    dependencies         = Column(Text)
    status               = Column(SAE(SolutionStatus), default=SolutionStatus.idea, nullable=False)
    created_at           = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 9: discovery_experiments ──────────────────────────────────────────

class DiscoveryExperiment(Base):
    """Records how hypotheses were or will be tested."""
    __tablename__ = "discovery_experiments"

    id               = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id   = Column(String(36), nullable=False, index=True)
    assumption_id    = Column(String(36), nullable=True, index=True)
    method           = Column(SAE(ExperimentMethod), nullable=False)
    participants     = Column(Text)
    success_criteria = Column(Text)
    result           = Column(Text)
    evidence         = Column(Text)
    conclusion       = Column(Text)
    next_action      = Column(Text)
    status           = Column(SAE(ExperimentStatus), default=ExperimentStatus.planned, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 10: discovery_success_metrics ─────────────────────────────────────

class DiscoverySuccessMetric(Base):
    """Defines how we will know if the solution generated results."""
    __tablename__ = "discovery_success_metrics"

    id                    = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id        = Column(String(36), nullable=False, index=True)
    metric                = Column(String(300), nullable=False)
    metric_type           = Column(SAE(MetricType), nullable=False)
    baseline              = Column(String(200))
    target                = Column(String(200))
    data_source           = Column(String(200))
    measurement_frequency = Column(String(100))
    responsible           = Column(String(150))
    created_at            = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OpportunityAssessment(Base):
    __tablename__ = "opportunity_assessments"

    id                       = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id           = Column(String(36), ForeignKey("discovery_opportunities.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_type          = Column(SAE(OpportunityAssessmentType), default=OpportunityAssessmentType.initial, nullable=False)
    problem_clarity          = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    evidence_strength        = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    business_impact          = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    expected_outcome_clarity = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    potential_business_value = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    strategic_alignment      = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    urgency                  = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    business_uncertainty     = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    solution_uncertainty     = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    initial_viability        = Column(SAE(AssessmentLevel), default=AssessmentLevel.unknown, nullable=False)
    recommendation           = Column(SAE(OpportunityAssessmentRecommendation), nullable=True)
    rationale                = Column(Text)
    assessed_by              = Column(String(200))
    assessed_at              = Column(DateTime, nullable=True)
    created_at               = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OpportunitySource(Base):
    __tablename__ = "opportunity_sources"

    id                  = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id      = Column(String(36), ForeignKey("discovery_opportunities.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type         = Column(SAE(OpportunitySourceType), nullable=False)
    source_system       = Column(String(200))
    external_reference  = Column(String(200))
    external_url        = Column(String(500))
    requester_reference = Column(String(200))
    requester_name      = Column(String(200))
    sponsor_reference   = Column(String(200))
    sponsor_name        = Column(String(200))
    received_at         = Column(DateTime, nullable=True)
    original_context    = Column(Text)
    is_primary          = Column(Boolean, nullable=False, default=False)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DiscoveryBusinessCase(Base):
    __tablename__ = "discovery_business_cases"

    id                      = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id          = Column(String(36), ForeignKey("discovery_opportunities.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    product_id              = Column(Integer, nullable=False, index=True)
    title                   = Column(String(300), nullable=False)
    executive_summary       = Column(Text)
    problem_statement       = Column(Text)
    current_scenario        = Column(Text)
    proposed_solution       = Column(Text)
    expected_benefits       = Column(Text)
    strategic_alignment     = Column(Text)
    financial_impact        = Column(Text)
    estimated_cost          = Column(String(120))
    estimated_effort        = Column(String(120))
    risks_summary           = Column(Text)
    dependencies_summary    = Column(Text)
    assumptions             = Column(Text)
    constraints             = Column(Text)
    go_no_go_recommendation = Column(Text)
    status                  = Column(SAE(BusinessCaseStatus), default=BusinessCaseStatus.draft, nullable=False)
    approved_by             = Column(Integer, nullable=True)
    approved_at             = Column(DateTime, nullable=True)
    created_by              = Column(Integer, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_by              = Column(Integer, nullable=True)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_deleted              = Column(Boolean, nullable=False, default=False)


class ProjectCharter(Base):
    __tablename__ = "project_charters"

    id                      = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_case_id        = Column(String(36), ForeignKey("discovery_business_cases.id", ondelete="SET NULL"), nullable=True, index=True, unique=True)
    opportunity_id          = Column(String(36), ForeignKey("discovery_opportunities.id", ondelete="SET NULL"), nullable=True, index=True)
    roadmap_item_id         = Column(String(36), ForeignKey("roadmap_items.id", ondelete="SET NULL"), nullable=True, index=True)
    product_id              = Column(Integer, nullable=False, index=True)
    project_name            = Column(String(300), nullable=False)
    project_purpose         = Column(Text)
    business_objective      = Column(Text)
    objectives              = Column(Text)
    scope_in                = Column(Text)
    scope_out               = Column(Text)
    success_criteria        = Column(Text)
    high_level_requirements = Column(Text)
    major_deliverables      = Column(Text)
    high_level_timeline     = Column(Text)
    budget_summary          = Column(Text)
    risks_summary           = Column(Text)
    assumptions_constraints = Column(Text)
    sponsor_name            = Column(String(200))
    project_manager_name    = Column(String(200))
    status                  = Column(SAE(CharterStatus), default=CharterStatus.draft, nullable=False)
    approved_by             = Column(Integer, nullable=True)
    approved_at             = Column(DateTime, nullable=True)
    created_by              = Column(Integer, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_by              = Column(Integer, nullable=True)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_deleted              = Column(Boolean, nullable=False, default=False)
