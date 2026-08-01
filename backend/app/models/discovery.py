import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Date, Integer, String, Text
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


# ─── Table 1: discovery_opportunities ────────────────────────────────────────

class DiscoveryOpportunity(Base):
    """Core entity of the Discovery module — identified opportunity."""
    __tablename__ = "discovery_opportunities"

    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id    = Column(Integer, nullable=False, index=True)
    title         = Column(String(300), nullable=False)
    description   = Column(Text)
    origin        = Column(String(200))
    impacted_area = Column(String(200))
    responsible   = Column(String(150))
    identified_at = Column(Date, nullable=True)
    status        = Column(SAE(OpportunityStatus), default=OpportunityStatus.identified, nullable=False)
    priority      = Column(Integer, default=3)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


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


# ─── Table 4: discovery_jtbd ──────────────────────────────────────────────────

class DiscoveryJTBD(Base):
    """Customer Jobs / Jobs To Be Done — reusable by VPC."""
    __tablename__ = "discovery_jtbd"

    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id      = Column(Integer, nullable=False, index=True)
    opportunity_id  = Column(String(36), nullable=True, index=True)
    description     = Column(Text, nullable=False)
    job_type        = Column(SAE(JobType), default=JobType.principal, nullable=False)
    priority        = Column(Integer, default=3)
    frequency       = Column(String(100))
    context         = Column(Text)
    expected_result = Column(Text)
    vpc_item_id     = Column(String(36), nullable=True)   # link → vpc_items for VPC reuse
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ─── Table 5: discovery_research ─────────────────────────────────────────────

class DiscoveryResearch(Base):
    """Centralises the evidence and research used in Discovery."""
    __tablename__ = "discovery_research"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id = Column(String(36), nullable=False, index=True)
    research_type  = Column(SAE(ResearchType), nullable=False)
    participants   = Column(Text)
    research_date  = Column(Date, nullable=True)
    questions      = Column(Text)
    findings       = Column(Text)
    evidence       = Column(Text)
    source         = Column(String(300))
    reliability    = Column(SAE(ReliabilityLevel), default=ReliabilityLevel.medium, nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


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
