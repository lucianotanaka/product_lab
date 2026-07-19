"""
Communication Domain — SQLAlchemy models
Mapeiam exatamente as tabelas criadas pelo DDL v1.0
"""
from datetime import date, datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Integer,
    Numeric, BigInteger, SmallInteger, String, Text, Time, TIMESTAMP,
)
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base


class CommunicationType(Base):
    __tablename__ = "communication_types"

    communication_type_id = Column(Integer, primary_key=True)
    name                  = Column(String(120), nullable=False, unique=True)
    description           = Column(Text)
    default_format        = Column(String(50))
    is_active             = Column(Boolean, nullable=False, default=True)
    created_at            = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at            = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CommunicationTemplate(Base):
    __tablename__ = "communication_templates"

    communication_template_id = Column(Integer, primary_key=True)
    communication_type_id     = Column(Integer, nullable=False)
    name                      = Column(String(150), nullable=False)
    description               = Column(Text)
    general_prompt            = Column(Text)
    default_language          = Column(String(10), nullable=False, default="pt-BR")
    default_tone              = Column(String(50))
    default_detail_level      = Column(String(30))
    default_output_format     = Column(String(50))
    is_active                 = Column(Boolean, nullable=False, default=True)
    created_by                = Column(Integer)
    updated_by                = Column(Integer)
    created_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class TemplateSection(Base):
    __tablename__ = "template_sections"

    template_section_id       = Column(Integer, primary_key=True)
    communication_template_id = Column(Integer, nullable=False)
    section_key               = Column(String(80), nullable=False)
    title                     = Column(String(200), nullable=False)
    description               = Column(Text)
    generation_prompt         = Column(Text)
    display_order             = Column(Integer, nullable=False, default=0)
    is_required               = Column(Boolean, nullable=False, default=True)
    minimum_items             = Column(Integer)
    maximum_items             = Column(Integer)
    target_length             = Column(Integer)
    is_active                 = Column(Boolean, nullable=False, default=True)
    created_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Communication(Base):
    __tablename__ = "communications"

    communication_id          = Column(Integer, primary_key=True)
    product_id                = Column(Integer, nullable=False)
    communication_type_id     = Column(Integer, nullable=False)
    communication_template_id = Column(Integer)
    name                      = Column(String(180), nullable=False)
    description               = Column(Text)
    objective                 = Column(Text, nullable=False)
    trigger_type              = Column(String(20), nullable=False)   # SCHEDULED | EVENT | MANUAL
    default_language          = Column(String(10))
    default_tone              = Column(String(50))
    default_detail_level      = Column(String(30))
    status                    = Column(String(20), nullable=False, default="DRAFT")  # DRAFT | ACTIVE | INACTIVE | ARCHIVED
    is_active                 = Column(Boolean, nullable=False, default=True)
    created_by                = Column(Integer)
    updated_by                = Column(Integer)
    created_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CommunicationSchedule(Base):
    __tablename__ = "communication_schedules"

    communication_schedule_id = Column(Integer, primary_key=True)
    communication_id          = Column(Integer, nullable=False, unique=True)
    recurrence_type           = Column(String(30), nullable=False)   # SPRINT | DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY | CRON
    recurrence_interval       = Column(Integer, nullable=False, default=1)
    reference_event           = Column(String(80))
    publication_offset_days   = Column(Integer, nullable=False, default=0)
    day_of_week               = Column(SmallInteger)
    day_of_month              = Column(SmallInteger)
    execution_time            = Column(Time)
    timezone                  = Column(String(100), nullable=False, default="America/Sao_Paulo")
    cron_expression           = Column(String(255))
    starts_at                 = Column(Date)
    ends_at                   = Column(Date)
    is_active                 = Column(Boolean, nullable=False, default=True)
    created_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at                = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Audience(Base):
    __tablename__ = "audiences"

    audience_id            = Column(Integer, primary_key=True)
    product_id             = Column(Integer)
    name                   = Column(String(150), nullable=False)
    description            = Column(Text)
    audience_type          = Column(String(30), nullable=False)  # PERSON | GROUP | BUSINESS_AREA | ROLE | COMMUNITY | EXTERNAL
    preferred_language     = Column(String(10))
    preferred_tone         = Column(String(50))
    preferred_detail_level = Column(String(30))
    is_active              = Column(Boolean, nullable=False, default=True)
    created_at             = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at             = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Publication(Base):
    __tablename__ = "publications"

    publication_id           = Column(Integer, primary_key=True)
    communication_id         = Column(Integer, nullable=False)
    reference_label          = Column(String(150))
    title                    = Column(String(250), nullable=False)
    subtitle                 = Column(String(300))
    reference_start_date     = Column(Date)
    reference_end_date       = Column(Date)
    planned_publication_date = Column(Date)
    published_at             = Column(TIMESTAMP)
    status                   = Column(String(30), nullable=False, default="DRAFT")  # DRAFT | GENERATING | GENERATED | IN_REVIEW | APPROVED | PUBLISHED | ARCHIVED | CANCELLED
    editorial_summary        = Column(Text)
    version_number           = Column(Integer, nullable=False, default=1)
    created_by               = Column(Integer)
    updated_by               = Column(Integer)
    created_at               = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at               = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class PublicationAudience(Base):
    __tablename__ = "publication_audiences"

    publication_audience_id = Column(Integer, primary_key=True)
    publication_id          = Column(Integer, nullable=False)
    audience_id             = Column(Integer, nullable=False)
    is_primary              = Column(Boolean, nullable=False, default=False)
    custom_language         = Column(String(10))
    custom_tone             = Column(String(50))
    custom_detail_level     = Column(String(30))
    created_at              = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)


class Section(Base):
    __tablename__ = "sections"

    section_id          = Column(Integer, primary_key=True)
    publication_id      = Column(Integer, nullable=False)
    template_section_id = Column(Integer)
    section_key         = Column(String(80), nullable=False)
    title               = Column(String(250), nullable=False)
    subtitle            = Column(String(300))
    current_content     = Column(Text)
    display_order       = Column(Integer, nullable=False, default=0)
    status              = Column(String(20), nullable=False, default="DRAFT")  # DRAFT | GENERATING | GENERATED | REVIEWED | APPROVED | PUBLISHED
    is_ai_generated     = Column(Boolean, nullable=False, default=False)
    created_by          = Column(Integer)
    updated_by          = Column(Integer)
    created_at          = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at          = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    agent_execution_id = Column(Integer, primary_key=True)
    section_id         = Column(Integer, nullable=False)
    provider           = Column(String(80))
    agent_name         = Column(String(150))
    model_name         = Column(String(150))
    model_version      = Column(String(100))
    general_prompt     = Column(Text)
    section_prompt     = Column(Text)
    assembled_context  = Column(Text)
    model_parameters   = Column(JSONB)
    generated_content  = Column(Text)
    input_tokens       = Column(Integer)
    output_tokens      = Column(Integer)
    total_tokens       = Column(Integer)
    estimated_cost     = Column(Numeric(18, 8))
    currency           = Column(String(3))
    execution_time_ms  = Column(BigInteger)
    temperature        = Column(Numeric(5, 3))
    status             = Column(String(30), nullable=False, default="PENDING")  # PENDING | RUNNING | COMPLETED | FAILED | CANCELLED | REJECTED | ACCEPTED
    error_message      = Column(Text)
    requested_by       = Column(Integer)
    started_at         = Column(TIMESTAMP)
    completed_at       = Column(TIMESTAMP)
    created_at         = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)


class ExecutionEvidence(Base):
    __tablename__ = "execution_evidences"

    execution_evidence_id = Column(Integer, primary_key=True)
    agent_execution_id    = Column(Integer, nullable=False)
    source_type           = Column(String(80), nullable=False)
    source_id             = Column(Integer, nullable=False)
    relevance_notes       = Column(Text)
    evidence_snapshot     = Column(JSONB)
    display_order         = Column(Integer, nullable=False, default=0)
    created_at            = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)


class PublicationReview(Base):
    __tablename__ = "publication_reviews"

    publication_review_id = Column(Integer, primary_key=True)
    publication_id        = Column(Integer, nullable=False)
    action                = Column(String(40), nullable=False)  # SUBMITTED_FOR_REVIEW | REVIEWED | CHANGES_REQUESTED | APPROVED | REJECTED | PUBLISHED | REPUBLISHED | ARCHIVED
    comments              = Column(Text)
    performed_by          = Column(Integer)
    performed_at          = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)


class PublicationVersion(Base):
    __tablename__ = "publication_versions"

    publication_version_id = Column(Integer, primary_key=True)
    publication_id         = Column(Integer, nullable=False)
    version_number         = Column(Integer, nullable=False)
    version_label          = Column(String(50))
    change_reason          = Column(Text)
    publication_snapshot   = Column(JSONB, nullable=False)
    created_by             = Column(Integer)
    created_at             = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)


class DeliveryChannel(Base):
    __tablename__ = "delivery_channels"

    delivery_channel_id = Column(Integer, primary_key=True)
    name                = Column(String(80), nullable=False, unique=True)
    description         = Column(Text)
    channel_type        = Column(String(40), nullable=False)  # FILE | EMAIL | TEAMS | WEB | SHAREPOINT | DASHBOARD | API | OTHER
    is_active           = Column(Boolean, nullable=False, default=True)
    created_at          = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at          = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class PublicationDelivery(Base):
    __tablename__ = "publication_deliveries"

    publication_delivery_id  = Column(Integer, primary_key=True)
    publication_id           = Column(Integer, nullable=False)
    publication_version_id   = Column(Integer)
    delivery_channel_id      = Column(Integer, nullable=False)
    status                   = Column(String(30), nullable=False, default="PENDING")  # PENDING | SCHEDULED | PROCESSING | DELIVERED | PARTIALLY_DELIVERED | FAILED | CANCELLED
    destination              = Column(String(500))
    artifact_uri             = Column(Text)
    external_reference       = Column(String(255))
    error_message            = Column(Text)
    delivered_by             = Column(Integer)
    scheduled_at             = Column(TIMESTAMP)
    delivered_at             = Column(TIMESTAMP)
    created_at               = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)


class DeliveryRecipient(Base):
    __tablename__ = "delivery_recipients"

    delivery_recipient_id    = Column(Integer, primary_key=True)
    publication_delivery_id  = Column(Integer, nullable=False)
    recipient_type           = Column(String(30), nullable=False)  # PERSON | EMAIL | GROUP | TEAMS_CHANNEL | URL | SYSTEM | OTHER
    recipient_name           = Column(String(180))
    recipient_address        = Column(String(320))
    status                   = Column(String(30), nullable=False, default="PENDING")  # PENDING | DELIVERED | FAILED | SKIPPED | CANCELLED
    delivered_at             = Column(TIMESTAMP)
    error_message            = Column(Text)
    created_at               = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
