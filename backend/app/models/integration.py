"""
Integration Connections — SQLAlchemy models
Tables: integration_field_schemas, integration_connections, integration_sync_logs
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAE
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base


class IntegrationProvider(str, Enum):
    azure_devops = "azure_devops"
    openai       = "openai"
    anthropic    = "anthropic"
    azure_openai = "azure_openai"
    axet_flows   = "axet_flows"
    jira         = "jira"
    github       = "github"
    gitlab       = "gitlab"
    slack        = "slack"
    teams        = "teams"
    webhook      = "webhook"
    custom       = "custom"


class IntegrationScope(str, Enum):
    global_scope = "global"
    company = "company"
    product = "product"


class IntegrationFieldSchema(Base):
    __tablename__ = "integration_field_schemas"
    provider    = Column(SAE(IntegrationProvider, name="integration_provider", values_callable=lambda enum_cls: [item.value for item in enum_cls]), primary_key=True)
    field_key   = Column(String(100), primary_key=True)
    field_label = Column(String(200), nullable=False)
    field_type  = Column(String(50),  nullable=False)   # text|password|url|select|boolean|number|textarea
    is_secret   = Column(Boolean, default=False, nullable=False)
    is_required = Column(Boolean, default=True,  nullable=False)
    options     = Column(JSONB, nullable=True)
    hint        = Column(Text,  nullable=True)
    placeholder = Column(String(300), nullable=True)
    sort_order  = Column(Integer, default=0, nullable=False)


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"
    id          = Column(String(36), primary_key=True)
    name        = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    provider    = Column(SAE(IntegrationProvider, name="integration_provider", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False, index=True)
    scope       = Column(SAE(IntegrationScope,    name="integration_scope", values_callable=lambda enum_cls: [item.value for item in enum_cls]), nullable=False, index=True)
    company_id  = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"),         nullable=True, index=True)
    product_id  = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"),  nullable=True, index=True)
    params      = Column(JSONB, nullable=False, default=dict)
    secrets     = Column(JSONB, nullable=False, default=dict)   # stored encrypted; never returned via API
    is_active   = Column(Boolean, default=True, nullable=False, index=True)
    last_sync_at = Column(DateTime, nullable=True)
    last_error   = Column(Text,    nullable=True)
    sync_cursor  = Column(Text,    nullable=True)
    created_by  = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class IntegrationSyncLog(Base):
    __tablename__ = "integration_sync_logs"
    id             = Column(String(36), primary_key=True)
    connection_id  = Column(String(36), ForeignKey("integration_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type = Column(String(20), nullable=False, default="full_sync", index=True)  # full_sync|apply
    status         = Column(String(20), nullable=False, default="running", index=True)  # running|completed|failed|partial
    started_at     = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    finished_at    = Column(DateTime, nullable=True)
    items_created  = Column(Integer, default=0, nullable=False)
    items_updated  = Column(Integer, default=0, nullable=False)
    items_skipped  = Column(Integer, default=0, nullable=False)
    error_message  = Column(Text,    nullable=True)
    details        = Column(JSONB,   nullable=True)
    triggered_by   = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
