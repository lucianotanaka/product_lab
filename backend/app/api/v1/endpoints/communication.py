"""
Communication Domain — API Endpoints — v2.2
UC-001 Types | UC-003 Templates | UC-005 OpenAI | UC-006/7/8 Review/Approve/Publish
UC-009 History | UC-010 Regenerate | Schedules | Versions | Delivery
Extended with prebuilt roadmap reports, PT-BR and EN templates, scope filters and HTML/PDF/PPT exports.
"""
import time, json
from typing import Optional, List, Any
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.config import settings
from app.models.communication import (
    CommunicationType, CommunicationTemplate, TemplateSection,
    Communication, CommunicationLink, CommunicationAudience, CommunicationSchedule, Audience, AudienceMember,
    Publication, PublicationAudience, Section,
    AgentExecution, PublicationReview, PublicationPresentation, PublicationVersion,
    DeliveryChannel, PublicationDelivery,
)
from app.models.stakeholder import Stakeholder
from app.models.roadmap import RoadmapItem, RoadmapBacklogLink
from app.models.backlog import BacklogItem, BacklogItemType
from app.models.discovery import DiscoveryOpportunity
from app.models.risk import Risk, RiskLink, RiskStatus
from app.models.followup import Followup
from app.models.meeting import Meeting, MeetingType, MeetingStatus, MeetingEntityType

router = APIRouter()

REPORT_KIND_ROADMAP = "ROADMAP_EXECUTIVE_REPORT"
REPORT_KIND_ROADMAP_EN = "ROADMAP_EXECUTIVE_REPORT_EN"
REPORT_KIND_RISK_MATRIX = "RISK_MATRIX_REPORT"
REPORT_KIND_RISK_MAPPING = "RISK_MAPPING_DETAIL_REPORT"
EXPORT_FORMATS = {"HTML", "PDF", "PPT"}

PREBUILT_REPORTS = [
    {
        "report_kind": REPORT_KIND_ROADMAP,
        "type_name": REPORT_KIND_ROADMAP,
        "type_description": "Report pré-pronto para comunicação executiva de roadmap em português.",
        "default_format": "HTML/PDF/PPT",
        "template_name": "Roadmap Executive Report (PT-BR)",
        "description": "Template pré-pronto para status executivo de roadmap com oportunidades, iniciativas, epics e features.",
        "general_prompt": "Estruture o relatório com foco executivo, linguagem clara, objetiva e voltada para stakeholders e liderança.",
        "default_language": "pt-BR",
        "default_tone": "Executive",
        "default_detail_level": "STANDARD",
        "default_output_format": "HTML",
        "sample": {
            "title": "Integração de Bases NTT",
            "preview_label": "Sample Preview • Roadmap Executive Report (PT-BR)",
            "summary_heading": "Principais pontos para acompanhamento",
            "status_labels": {
                "on_track": "On track",
                "attention": "Em atenção",
                "waiting_owner": "Aguardando interlocutor",
                "not_started": "Não iniciado",
                "blocked": "Bloqueado",
                "completed": "Concluído",
            },
            "sections": [
                {
                    "section_key": "EXEC_SUMMARY",
                    "title": "Resumo Executivo",
                    "description": "Consolidação dos principais KPIs e leitura geral do andamento.",
                    "generation_prompt": "Resuma o status geral do roadmap com foco executivo.",
                    "display_order": 0,
                    "is_required": True,
                    "target_length": 120,
                },
                {
                    "section_key": "EXEC_ATTENTION",
                    "title": "Principais Pontos para Acompanhamento",
                    "description": "Itens em atenção, bloqueios, dependências e escalonamentos.",
                    "generation_prompt": "Liste os principais pontos de atenção que precisam de acompanhamento executivo.",
                    "display_order": 1,
                    "is_required": True,
                    "target_length": 180,
                },
                {
                    "section_key": "ROADMAP_DETAILS",
                    "title": "Epic e Features",
                    "description": "Detalhamento das iniciativas selecionadas, agrupadas por epic e features.",
                    "generation_prompt": "Estruture o detalhamento por epic e features, destacando status, risco/dependência e próximo passo.",
                    "display_order": 2,
                    "is_required": True,
                    "target_length": 400,
                },
            ],
            "attention_points": [
                {"title": "Integração Oracle", "status": "Em atenção", "summary": "Mudança de estratégia de integração para CSV/FTP.", "next_step": "Validar carga e cronograma."},
                {"title": "Integração Kosmos", "status": "Aguardando interlocutor", "summary": "Responsável técnico ainda não definido.", "next_step": "Confirmar ponto focal da área."},
            ],
            "group": {
                "type": "epic",
                "title": "Integração de Bases NTT",
                "executive_status": "attention",
                "executive_status_label": "Em atenção",
                "executive_summary": "Epic crítica para a jornada de integração de dados corporativos.",
                "executive_risk_dependency": "Dependência de áreas externas para APIs e interlocução técnica.",
                "executive_next_step": "Fechar responsáveis e sequência de conexão por fonte.",
                "opportunities": ["Base Única de Dados", "Automação de Fluxos Operacionais"],
                "features": [
                    {"backlog_item_id": 34813, "title": "Integração Oracle", "executive_status": "attention", "executive_status_label": "Em atenção", "executive_summary": "Estratégia alterada para CSV/FTP.", "executive_risk_dependency": "Homologação do processo de ingestão.", "executive_next_step": "Testar primeiro arquivo."},
                    {"backlog_item_id": 34814, "title": "Integração Salesforce", "executive_status": "on_track", "executive_status_label": "On track", "executive_summary": "Tratativa da API com time Salesforce.", "executive_risk_dependency": "Ajustes de disponibilização da API.", "executive_next_step": "Acompanhar resolução do ticket."},
                    {"backlog_item_id": 34815, "title": "Integração Kosmos", "executive_status": "waiting_owner", "executive_status_label": "Aguardando interlocutor", "executive_summary": "Aguardando definição de responsável técnico.", "executive_risk_dependency": "Dependência externa.", "executive_next_step": "Confirmar interlocutor."},
                    {"backlog_item_id": 34816, "title": "Integração Direct", "executive_status": "not_started", "executive_status_label": "Não iniciado", "executive_summary": "Mapeamento inicial pendente.", "executive_risk_dependency": "Necessidade de kick-off técnico.", "executive_next_step": "Abrir desenho da conexão."},
                    {"backlog_item_id": 34817, "title": "Integração ServiceNow", "executive_status": "not_started", "executive_status_label": "Não iniciado", "executive_summary": "Iniciativa ainda não começou.", "executive_risk_dependency": "Abertura de chamado para API.", "executive_next_step": "Abrir chamado com ServiceNow."},
                ],
            },
        },
    },
    {
        "report_kind": REPORT_KIND_ROADMAP_EN,
        "type_name": REPORT_KIND_ROADMAP_EN,
        "type_description": "Prebuilt roadmap executive communication report in English.",
        "default_format": "HTML/PDF/PPT",
        "template_name": "Roadmap Executive Report (EN)",
        "description": "Prebuilt template for executive roadmap status with opportunities, initiatives, epics and features.",
        "general_prompt": "Structure the report with an executive focus, clear language and concise stakeholder-oriented updates.",
        "default_language": "en-US",
        "default_tone": "Executive",
        "default_detail_level": "STANDARD",
        "default_output_format": "HTML",
        "sample": {
            "title": "NTT Core Data Integration",
            "preview_label": "Sample Preview • Roadmap Executive Report (EN)",
            "summary_heading": "Key points for executive follow-up",
            "status_labels": {
                "on_track": "On track",
                "attention": "Needs attention",
                "waiting_owner": "Waiting for owner",
                "not_started": "Not started",
                "blocked": "Blocked",
                "completed": "Completed",
            },
            "sections": [
                {
                    "section_key": "EXEC_SUMMARY",
                    "title": "Executive Summary",
                    "description": "Consolidated KPI snapshot and overall delivery view.",
                    "generation_prompt": "Summarize the overall roadmap status using executive language.",
                    "display_order": 0,
                    "is_required": True,
                    "target_length": 120,
                },
                {
                    "section_key": "EXEC_ATTENTION",
                    "title": "Key Follow-up Items",
                    "description": "Attention points, blockers, dependencies and escalations.",
                    "generation_prompt": "List the key issues that require executive attention.",
                    "display_order": 1,
                    "is_required": True,
                    "target_length": 180,
                },
                {
                    "section_key": "ROADMAP_DETAILS",
                    "title": "Epic and Features",
                    "description": "Detailed initiative view grouped by epic and features.",
                    "generation_prompt": "Structure the detailed view by epic and features, highlighting status, dependency/risk and next step.",
                    "display_order": 2,
                    "is_required": True,
                    "target_length": 400,
                },
            ],
            "attention_points": [
                {"title": "Oracle Integration", "status": "Needs attention", "summary": "Integration strategy changed to CSV/FTP delivery.", "next_step": "Validate ingestion timeline and test load."},
                {"title": "Kosmos Integration", "status": "Waiting for owner", "summary": "Technical counterpart still not assigned.", "next_step": "Confirm technical focal point."},
            ],
            "group": {
                "type": "epic",
                "title": "NTT Core Data Integration",
                "executive_status": "attention",
                "executive_status_label": "Needs attention",
                "executive_summary": "Critical epic for the target-state enterprise data integration journey.",
                "executive_risk_dependency": "Depends on external teams for APIs and technical ownership.",
                "executive_next_step": "Confirm owners and connection sequence by source system.",
                "opportunities": ["Single Source of Data", "Operational Automation"],
                "features": [
                    {"backlog_item_id": 34813, "title": "Oracle Integration", "executive_status": "attention", "executive_status_label": "Needs attention", "executive_summary": "Strategy changed to CSV/FTP.", "executive_risk_dependency": "Ingestion process still needs validation.", "executive_next_step": "Test the first delivered file."},
                    {"backlog_item_id": 34814, "title": "Salesforce Integration", "executive_status": "on_track", "executive_status_label": "On track", "executive_summary": "API handling in progress with Salesforce team.", "executive_risk_dependency": "API availability adjustments pending.", "executive_next_step": "Track ticket resolution."},
                    {"backlog_item_id": 34815, "title": "Kosmos Integration", "executive_status": "waiting_owner", "executive_status_label": "Waiting for owner", "executive_summary": "Technical owner not defined yet.", "executive_risk_dependency": "External dependency.", "executive_next_step": "Confirm counterpart."},
                    {"backlog_item_id": 34816, "title": "Direct Integration", "executive_status": "not_started", "executive_status_label": "Not started", "executive_summary": "Initial mapping is still pending.", "executive_risk_dependency": "Technical kickoff required.", "executive_next_step": "Start connection design."},
                    {"backlog_item_id": 34817, "title": "ServiceNow Integration", "executive_status": "not_started", "executive_status_label": "Not started", "executive_summary": "Initiative has not started yet.", "executive_risk_dependency": "API request ticket must be opened.", "executive_next_step": "Open ServiceNow API request."},
                ],
            },
        },
    },
    {
        "report_kind": REPORT_KIND_RISK_MATRIX,
        "type_name": REPORT_KIND_RISK_MATRIX,
        "type_description": "Report pré-pronto para comunicação consolidada da matriz de riscos do produto.",
        "default_format": "HTML/PDF/PPT",
        "template_name": "Risk Matrix Report (PT-BR)",
        "description": "Template pré-pronto para visão consolidada da matriz de riscos, níveis, status e mapeamentos cross-module.",
        "general_prompt": "Estruture o relatório com foco executivo-gerencial, destacando criticidade, distribuição dos riscos e itens que demandam ação imediata.",
        "default_language": "pt-BR",
        "default_tone": "Executive",
        "default_detail_level": "STANDARD",
        "default_output_format": "HTML",
        "sample": {
            "title": "Risk Matrix Report — Product Overview",
            "preview_label": "Sample Preview • Risk Matrix Report (PT-BR)",
            "summary_heading": "Principais riscos e cobertura de mapeamento",
            "status_labels": {
                "identified": "Identificado",
                "mitigated": "Mitigado",
                "accepted": "Aceito",
                "closed": "Fechado",
                "high": "Alto",
                "medium": "Médio",
                "low": "Baixo",
            },
            "sections": [
                {
                    "section_key": "RISK_EXEC_SUMMARY",
                    "title": "Resumo Executivo",
                    "description": "Consolidação da matriz com volume total, distribuição por nível e status.",
                    "generation_prompt": "Resuma a situação da matriz de riscos com foco executivo, destacando concentração de riscos altos, cobertura de mapeamento e pontos que exigem ação.",
                    "display_order": 0,
                    "is_required": True,
                    "target_length": 160,
                },
                {
                    "section_key": "RISK_ATTENTION",
                    "title": "Riscos Críticos e Atenções",
                    "description": "Riscos com maior score, dependências e riscos sem mapeamento.",
                    "generation_prompt": "Liste os riscos mais críticos e chame atenção para riscos sem vínculo com roadmap, backlog ou outros módulos.",
                    "display_order": 1,
                    "is_required": True,
                    "target_length": 220,
                },
                {
                    "section_key": "RISK_MATRIX_DETAILS",
                    "title": "Detalhamento da Matriz",
                    "description": "Tabela consolidada dos riscos com score, nível, status e quantidade de vínculos.",
                    "generation_prompt": "Estruture um detalhamento da matriz listando cada risco, score, nível, status e vínculos com outros módulos.",
                    "display_order": 2,
                    "is_required": True,
                    "target_length": 420,
                },
            ],
            "attention_points": [
                {"title": "Dependência externa sem owner definido", "status": "Alto", "summary": "Risco impacta roadmap e backlog crítico.", "next_step": "Definir owner executivo e contingência."},
                {"title": "Risco sem mapeamento cross-module", "status": "Médio", "summary": "Risco registrado, mas ainda não associado a backlog ou roadmap.", "next_step": "Associar item operacional ou iniciativa afetada."},
            ],
            "group": {
                "type": "risk_matrix",
                "title": "Visão consolidada da matriz",
                "executive_status": "attention",
                "executive_status_label": "Em atenção",
                "executive_summary": "Concentração de riscos em iniciativas estratégicas e backlog operacional.",
                "executive_risk_dependency": "Parte dos riscos ainda depende de mapeamento completo com módulos relacionados.",
                "executive_next_step": "Priorizar mitigação dos riscos altos e completar rastreabilidade cross-module.",
                "opportunities": ["Roadmap", "Backlog", "Discovery", "Requirements"],
                "features": [
                    {"backlog_item_id": 1, "title": "Integração ERP bloqueada", "executive_status": "high", "executive_status_label": "Alto", "executive_summary": "Afeta iniciativa do roadmap e backlog técnico.", "executive_risk_dependency": "Dependência de fornecedor externo.", "executive_next_step": "Escalar com fornecedor e definir fallback."},
                    {"backlog_item_id": 2, "title": "Risco regulatório sem requisito consolidado", "executive_status": "medium", "executive_status_label": "Médio", "executive_summary": "Risco associado a requirement ainda incompleto.", "executive_risk_dependency": "Falta validação jurídica.", "executive_next_step": "Revisar requirement e formalizar aceite."}
                ],
            },
        },
    },
    {
        "report_kind": REPORT_KIND_RISK_MAPPING,
        "type_name": REPORT_KIND_RISK_MAPPING,
        "type_description": "Report pré-pronto para comunicação detalhada de um risco e seus vínculos com outros módulos.",
        "default_format": "HTML/PDF/PPT",
        "template_name": "Risk Mapping Detail Report (PT-BR)",
        "description": "Template pré-pronto para detalhar um risco específico, score, mitigação e rastreabilidade com roadmap, backlog e demais módulos.",
        "general_prompt": "Estruture o relatório de forma analítica, deixando claro o risco, seus impactos, vínculos cross-module e plano de mitigação.",
        "default_language": "pt-BR",
        "default_tone": "Analytical",
        "default_detail_level": "DETAILED",
        "default_output_format": "HTML",
        "sample": {
            "title": "Risk Mapping Detail Report — Single Risk",
            "preview_label": "Sample Preview • Risk Mapping Detail Report (PT-BR)",
            "summary_heading": "Risco detalhado e impactos relacionados",
            "status_labels": {
                "identified": "Identificado",
                "mitigated": "Mitigado",
                "accepted": "Aceito",
                "closed": "Fechado",
                "high": "Alto",
                "medium": "Médio",
                "low": "Baixo",
            },
            "sections": [
                {
                    "section_key": "RISK_IDENTIFICATION",
                    "title": "Identificação do Risco",
                    "description": "Título, descrição, status, classificação e contexto.",
                    "generation_prompt": "Apresente o risco detalhado com título, descrição, status, score, nível e contexto de negócio.",
                    "display_order": 0,
                    "is_required": True,
                    "target_length": 140,
                },
                {
                    "section_key": "RISK_CROSS_MODULE_MAPPING",
                    "title": "Mapeamento Cross-Module",
                    "description": "Vínculos do risco com roadmap, backlog, decisions, discovery e requirements.",
                    "generation_prompt": "Explique como o risco está mapeado com os demais módulos, listando os itens relacionados e seu impacto.",
                    "display_order": 1,
                    "is_required": True,
                    "target_length": 260,
                },
                {
                    "section_key": "RISK_MITIGATION_AND_ACTIONS",
                    "title": "Mitigação e Próximas Ações",
                    "description": "Plano de mitigação, bloqueios, responsáveis e próximos passos.",
                    "generation_prompt": "Detalhe o plano de mitigação, ações em andamento, dependências, responsáveis e próximos passos.",
                    "display_order": 2,
                    "is_required": True,
                    "target_length": 260,
                },
            ],
            "attention_points": [
                {"title": "Integração ERP bloqueada", "status": "Alto", "summary": "Risco afeta iniciativa estratégica e backlog operacional.", "next_step": "Executar plano de contingência e escalonamento."}
            ],
            "group": {
                "type": "risk_detail",
                "title": "Integração ERP bloqueada",
                "executive_status": "high",
                "executive_status_label": "Alto",
                "executive_summary": "Risco de atraso crítico por dependência externa.",
                "executive_risk_dependency": "Fornecedor externo ainda não confirmou SLA.",
                "executive_next_step": "Formalizar fallback manual e renegociar prazo.",
                "opportunities": ["Discovery: Automação Financeira", "Requirement: Integração Regulatória"],
                "features": [
                    {"backlog_item_id": 245, "title": "Roadmap — Modernização ERP", "executive_status": "high", "executive_status_label": "Alto", "executive_summary": "Iniciativa impactada diretamente.", "executive_risk_dependency": "Risco de atraso do marco.", "executive_next_step": "Replanejar marco executivo."},
                    {"backlog_item_id": 251, "title": "Backlog — Rotina de Retry", "executive_status": "medium", "executive_status_label": "Médio", "executive_summary": "Ação mitigatória no backlog.", "executive_risk_dependency": "Depende de priorização técnica.", "executive_next_step": "Priorizar na próxima sprint."}
                ],
            },
        },
    },
]

# ── helpers ───────────────────────────────────────────────────────────────────
def _get_or_404(db, model, pk_field, pk_value):
    obj = db.get(model, pk_value)
    if not obj:
        raise HTTPException(404, f"{model.__name__} {pk_value} not found")
    return obj

def _paginate(db, query, page, size):
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page-1)*size).limit(size)).all()
    return {"total": total or 0, "page": page, "size": size, "items": items}

def _json_safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return value

def _normalize_export_formats(formats: Optional[List[str]]) -> List[str]:
    if not formats:
        return ["HTML", "PDF", "PPT"]
    cleaned = []
    for item in formats:
        token = str(item).upper().strip()
        if token in EXPORT_FORMATS and token not in cleaned:
            cleaned.append(token)
    return cleaned or ["HTML", "PDF", "PPT"]

def _normalize_report_scope(scope: Optional[dict]) -> Optional[dict]:
    if scope is None:
        return None
    normalized = dict(scope)
    for key in ("opportunity_ids", "roadmap_item_ids", "backlog_item_ids"):
        values = normalized.get(key) or []
        normalized[key] = [str(v) for v in values if str(v).strip()]
    for key in ("include_epics", "include_features", "include_only_attention", "include_completed"):
        if key in normalized:
            normalized[key] = bool(normalized[key])
    if "group_by" in normalized and normalized["group_by"] is not None:
        normalized["group_by"] = str(normalized["group_by"]).strip()
    if "period_label" in normalized and normalized["period_label"] is not None:
        normalized["period_label"] = str(normalized["period_label"]).strip()
    return normalized

def _status_color(status_value: Optional[str]) -> str:
    mapping = {
        "on_track": "#2563eb",
        "attention": "#f59e0b",
        "blocked": "#ef4444",
        "waiting_owner": "#94a3b8",
        "completed": "#22c55e",
        "not_started": "#94a3b8",
    }
    return mapping.get((status_value or "").lower(), "#94a3b8")

def _status_label(status_value: Optional[str], report_kind: str) -> str:
    pt = {
        "on_track": "On track",
        "attention": "Em atenção",
        "blocked": "Bloqueado",
        "waiting_owner": "Aguardando interlocutor",
        "completed": "Concluído",
        "not_started": "Não iniciado",
        "identified": "Identificado",
        "mitigated": "Mitigado",
        "accepted": "Aceito",
        "closed": "Fechado",
        "high": "Alto",
        "medium": "Médio",
        "low": "Baixo",
    }
    en = {
        "on_track": "On track",
        "attention": "Needs attention",
        "blocked": "Blocked",
        "waiting_owner": "Waiting for owner",
        "completed": "Completed",
        "not_started": "Not started",
        "identified": "Identified",
        "mitigated": "Mitigated",
        "accepted": "Accepted",
        "closed": "Closed",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
    }
    mapping = en if report_kind == REPORT_KIND_ROADMAP_EN else pt
    return mapping.get((status_value or "").lower(), status_value or "—")

def _get_prebuilt_config(report_kind: str) -> Optional[dict]:
    return next((cfg for cfg in PREBUILT_REPORTS if cfg["report_kind"] == report_kind), None)

def _get_backlog_type_map(db: Session, ids: list[int]) -> dict[int, str]:
    if not ids:
        return {}
    rows = db.scalars(select(BacklogItemType).where(BacklogItemType.item_type_id.in_(ids))).all()
    return {row.item_type_id: row.name for row in rows}

def _ensure_prebuilt_templates(db: Session):
    resolved = {}

    for cfg in PREBUILT_REPORTS:
        comm_type = db.scalars(select(CommunicationType).where(CommunicationType.name == cfg["type_name"])).first()
        if not comm_type:
            comm_type = CommunicationType(
                name=cfg["type_name"],
                description=cfg["type_description"],
                default_format=cfg["default_format"],
                is_active=True,
            )
            db.add(comm_type)
            db.flush()

        template = db.scalars(
            select(CommunicationTemplate).where(
                CommunicationTemplate.communication_type_id == comm_type.communication_type_id,
                CommunicationTemplate.name == cfg["template_name"],
            )
        ).first()

        if not template:
            template = CommunicationTemplate(
                communication_type_id=comm_type.communication_type_id,
                name=cfg["template_name"],
                description=cfg["description"],
                general_prompt=cfg["general_prompt"],
                default_language=cfg["default_language"],
                default_tone=cfg["default_tone"],
                default_detail_level=cfg["default_detail_level"],
                default_output_format=cfg["default_output_format"],
                is_active=True,
            )
            db.add(template)
            db.flush()

        template.name = cfg["template_name"]
        template.description = cfg["description"]
        template.general_prompt = cfg["general_prompt"]
        template.default_language = cfg["default_language"]
        template.default_tone = cfg["default_tone"]
        template.default_detail_level = cfg["default_detail_level"]
        template.default_output_format = cfg["default_output_format"]
        template.is_active = True

        existing_sections = db.scalars(
            select(TemplateSection).where(TemplateSection.communication_template_id == template.communication_template_id)
        ).all()
        existing_by_key = {row.section_key: row for row in existing_sections}

        for section_data in cfg["sample"]["sections"]:
            existing = existing_by_key.get(section_data["section_key"])
            if not existing:
                existing = TemplateSection(
                    communication_template_id=template.communication_template_id,
                    section_key=section_data["section_key"],
                )
                db.add(existing)

            existing.title = section_data["title"]
            existing.description = section_data["description"]
            existing.generation_prompt = section_data["generation_prompt"]
            existing.display_order = section_data["display_order"]
            existing.is_required = section_data["is_required"]
            existing.target_length = section_data["target_length"]
            existing.is_active = True

        resolved[cfg["report_kind"]] = {"type": comm_type, "template": template}

    db.flush()
    return resolved

def _resolve_roadmap_scope(comm: Communication, db: Session) -> dict:
    scope = comm.report_scope or {}
    product_id = comm.product_id
    report_kind = comm.report_kind or REPORT_KIND_ROADMAP
    roadmap_item_ids = [str(v) for v in (scope.get("roadmap_item_ids") or [])]
    opportunity_ids = [str(v) for v in (scope.get("opportunity_ids") or [])]
    include_epics = bool(scope.get("include_epics", True))
    include_features = bool(scope.get("include_features", True))
    include_only_attention = bool(scope.get("include_only_attention", False))
    include_completed = bool(scope.get("include_completed", True))

    q = select(RoadmapItem).where(RoadmapItem.product_id == str(product_id))
    if roadmap_item_ids:
        q = q.where(RoadmapItem.id.in_(roadmap_item_ids))
    if not include_completed:
        q = q.where(RoadmapItem.executive_status != "completed")
    roadmap_items = db.scalars(q.order_by(RoadmapItem.title)).all()

    if opportunity_ids:
        matching_roadmap_ids = set()
        links = db.scalars(select(RoadmapBacklogLink).where(RoadmapBacklogLink.roadmap_item_id.in_([item.id for item in roadmap_items]))).all() if roadmap_items else []
        backlog_ids = [link.backlog_item_id for link in links]
        backlog_map = {}
        if backlog_ids:
            backlog_rows = db.scalars(select(BacklogItem).where(BacklogItem.item_id.in_(backlog_ids))).all()
            backlog_map = {row.item_id: row for row in backlog_rows}
        for item in roadmap_items:
            for link in links:
                if link.roadmap_item_id != item.id:
                    continue
                backlog = backlog_map.get(link.backlog_item_id)
                if backlog and backlog.discovery_opportunity_id and backlog.discovery_opportunity_id in opportunity_ids:
                    matching_roadmap_ids.add(item.id)
                    break
        roadmap_items = [item for item in roadmap_items if item.id in matching_roadmap_ids]

    link_rows = db.scalars(select(RoadmapBacklogLink).where(RoadmapBacklogLink.roadmap_item_id.in_([item.id for item in roadmap_items]))).all() if roadmap_items else []
    link_map: dict[str, list[RoadmapBacklogLink]] = {}
    backlog_ids = []
    for link in link_rows:
        link_map.setdefault(link.roadmap_item_id, []).append(link)
        backlog_ids.append(link.backlog_item_id)

    backlog_items = db.scalars(select(BacklogItem).where(BacklogItem.item_id.in_(backlog_ids))).all() if backlog_ids else []
    backlog_map = {row.item_id: row for row in backlog_items}
    type_map = _get_backlog_type_map(db, [row.item_type_id for row in backlog_items if row.item_type_id])

    opp_ids = {row.discovery_opportunity_id for row in backlog_items if row.discovery_opportunity_id}
    opp_map = {}
    if opp_ids:
        opp_rows = db.scalars(select(DiscoveryOpportunity).where(DiscoveryOpportunity.id.in_(opp_ids))).all()
        opp_map = {row.id: row.title for row in opp_rows}

    groups = []
    summary_cards = {"total_in_scope": 0, "on_track": 0, "attention": 0, "waiting_owner": 0, "not_started": 0, "blocked": 0, "completed": 0}
    attention_points = []

    for item in roadmap_items:
        status_value = (item.executive_status.value if hasattr(item.executive_status, "value") else item.executive_status) or "not_started"
        if include_only_attention and status_value not in {"attention", "blocked", "waiting_owner"} and not item.attention_flag:
            continue
        if item.type == "epic" and not include_epics:
            continue
        if item.type == "feature" and not include_features:
            continue

        summary_cards["total_in_scope"] += 1
        if status_value in summary_cards:
            summary_cards[status_value] += 1

        linked_features = []
        linked_opportunity_titles = []
        for link in sorted(link_map.get(item.id, []), key=lambda current: (current.display_order is None, current.display_order or 0, current.id)):
            backlog = backlog_map.get(link.backlog_item_id)
            if not backlog:
                continue
            type_name = type_map.get(backlog.item_type_id, "") if backlog.item_type_id else ""
            is_feature = type_name.lower() == "feature"
            if not include_features and is_feature:
                continue
            linked_features.append({
                "backlog_item_id": backlog.item_id,
                "title": backlog.title,
                "type_name": type_name,
                "current_status": backlog.current_status,
                "executive_status": link.executive_status or status_value,
                "executive_status_label": _status_label(link.executive_status or status_value, report_kind),
                "executive_summary": link.executive_summary,
                "executive_risk_dependency": link.executive_risk_dependency,
                "executive_next_step": link.executive_next_step,
                "attention_flag": bool(link.attention_flag),
                "attention_reason": link.attention_reason,
                "opportunity_id": backlog.discovery_opportunity_id,
                "opportunity_title": opp_map.get(backlog.discovery_opportunity_id) if backlog.discovery_opportunity_id else None,
            })
            if backlog.discovery_opportunity_id and opp_map.get(backlog.discovery_opportunity_id):
                linked_opportunity_titles.append(opp_map[backlog.discovery_opportunity_id])

        item_payload = {
            "roadmap_item_id": item.id,
            "title": item.title,
            "type": item.type.value if hasattr(item.type, "value") else item.type,
            "quarter": item.quarter,
            "status": item.status.value if hasattr(item.status, "value") else item.status,
            "executive_status": status_value,
            "executive_status_label": _status_label(status_value, report_kind),
            "executive_summary": item.executive_summary,
            "executive_risk_dependency": item.executive_risk_dependency,
            "executive_next_step": item.executive_next_step,
            "executive_owner_name": item.executive_owner_name,
            "attention_flag": bool(item.attention_flag),
            "attention_reason": item.attention_reason,
            "committed_deadline": _json_safe(item.committed_deadline),
            "opportunities": sorted(set(linked_opportunity_titles)),
            "features": linked_features,
        }
        groups.append(item_payload)

        if item.executive_summary or item.attention_reason or item.executive_risk_dependency:
            attention_points.append({
                "title": item.title,
                "status": _status_label(status_value, report_kind),
                "summary": item.executive_summary or item.attention_reason or item.executive_risk_dependency,
                "next_step": item.executive_next_step,
            })

    return {
        "report_kind": report_kind,
        "scope": scope,
        "summary_cards": summary_cards,
        "groups": groups,
        "attention_points": attention_points[:8],
        "generated_at": datetime.utcnow().isoformat(),
    }

def _risk_level(score: Optional[int]) -> str:
    value = score or 0
    if value >= 15:
        return "high"
    if value >= 6:
        return "medium"
    return "low"

def _risk_link_label(entity_type: str, entity_id: str, db: Session) -> Optional[str]:
    if entity_type == "roadmap":
        item = db.get(RoadmapItem, entity_id)
        return item.title if item else None
    if entity_type == "backlog":
        try:
            item = db.get(BacklogItem, int(entity_id))
            return item.title if item else None
        except ValueError:
            return None
    return entity_id

def _resolve_risk_scope(comm: Communication, db: Session) -> dict:
    scope = comm.report_scope or {}
    product_id = comm.product_id
    risk_ids = [str(v) for v in (scope.get("risk_ids") or []) if str(v).strip()]
    include_only_open = bool(scope.get("include_only_open", False))
    include_only_high = bool(scope.get("include_only_high", False))

    q = select(Risk).where(Risk.product_id == str(product_id))
    if risk_ids:
        q = q.where(Risk.id.in_(risk_ids))
    if include_only_open:
        q = q.where(Risk.status.in_([RiskStatus.identified, RiskStatus.mitigated, RiskStatus.accepted]))
    risks = db.scalars(q.order_by(Risk.risk_score.desc(), Risk.updated_at.desc())).all()

    rows = []
    attention_points = []
    mapped = 0
    unmapped = 0
    by_level = {"high": 0, "medium": 0, "low": 0}
    by_status = {"identified": 0, "mitigated": 0, "accepted": 0, "closed": 0}
    module_counts = {"roadmap": 0, "backlog": 0, "decision": 0}

    for risk in risks:
        score = risk.risk_score or ((risk.probability or 1) * (risk.impact or 1))
        level = _risk_level(score)
        if include_only_high and level != "high":
            continue

        status_value = risk.status.value if hasattr(risk.status, "value") else str(risk.status or "identified")
        links = db.scalars(select(RiskLink).where(RiskLink.risk_id == risk.id).order_by(RiskLink.entity_type, RiskLink.id)).all()
        serialized_links = []
        related_modules = set()

        for link in links:
            related_modules.add(link.entity_type)
            module_counts[link.entity_type] = module_counts.get(link.entity_type, 0) + 1
            serialized_links.append({
                "entity_type": link.entity_type,
                "entity_id": link.entity_id,
                "label": _risk_link_label(link.entity_type, link.entity_id, db),
            })

        if serialized_links:
            mapped += 1
        else:
            unmapped += 1

        by_level[level] += 1
        by_status[status_value] = by_status.get(status_value, 0) + 1

        row = {
            "risk_id": risk.id,
            "title": risk.title,
            "description": risk.description,
            "category": risk.category,
            "responsible": risk.responsible,
            "probability": risk.probability or 1,
            "impact": risk.impact or 1,
            "risk_score": score,
            "level": level,
            "level_label": _status_label(level, REPORT_KIND_RISK_MATRIX),
            "status": status_value,
            "status_label": _status_label(status_value, REPORT_KIND_RISK_MATRIX),
            "mitigation_plan": risk.mitigation_plan,
            "links": serialized_links,
            "mapping_count": len(serialized_links),
            "related_modules": sorted(related_modules),
            "updated_at": _json_safe(risk.updated_at),
        }
        rows.append(row)

        if level == "high" or not serialized_links:
            attention_points.append({
                "title": risk.title,
                "status": _status_label(level, REPORT_KIND_RISK_MATRIX),
                "summary": risk.description or risk.mitigation_plan or "Sem resumo registrado.",
                "next_step": risk.mitigation_plan or ("Associar roadmap/backlog e definir mitigação." if not serialized_links else None),
            })

    return {
        "report_kind": comm.report_kind or REPORT_KIND_RISK_MATRIX,
        "scope": scope,
        "summary_cards": {
            "total": len(rows),
            "high": by_level["high"],
            "medium": by_level["medium"],
            "low": by_level["low"],
            "mapped": mapped,
            "unmapped": unmapped,
            "identified": by_status.get("identified", 0),
            "mitigated": by_status.get("mitigated", 0),
            "accepted": by_status.get("accepted", 0),
            "closed": by_status.get("closed", 0),
        },
        "module_counts": module_counts,
        "rows": rows,
        "attention_points": attention_points[:10],
        "generated_at": datetime.utcnow().isoformat(),
    }

def _build_risk_matrix_sections_from_scope(comm: Communication, pub: Publication, db: Session) -> list[dict]:
    data = _resolve_risk_scope(comm, db)
    summary = data["summary_cards"]
    details_lines = []
    for row in data["rows"]:
        details_lines.append(
            f"{row['title']} | Status: {row['status_label']} | Score: {row['risk_score']} | "
            f"Nível: {row['level_label']} | Vínculos: {row['mapping_count']}"
        )
    attention_lines = [
        f"• {point['title']} ({point['status']}): {point['summary']}" + (f" Próximo passo: {point['next_step']}" if point["next_step"] else "")
        for point in data["attention_points"]
    ]
    modules_line = " | ".join(
        [
            f"Roadmap: {data['module_counts'].get('roadmap', 0)}",
            f"Backlog: {data['module_counts'].get('backlog', 0)}",
            f"Decision: {data['module_counts'].get('decision', 0)}",
        ]
    )
    return [
        {
            "section_key": "RISK_EXEC_SUMMARY",
            "title": "Resumo Executivo",
            "display_order": 0,
            "current_content": (
                f"Riscos no escopo: {summary['total']} | Altos: {summary['high']} | Médios: {summary['medium']} | "
                f"Baixos: {summary['low']} | Mapeados: {summary['mapped']} | Não mapeados: {summary['unmapped']} | "
                f"Status — Identificados: {summary['identified']}, Mitigados: {summary['mitigated']}, Aceitos: {summary['accepted']}, Fechados: {summary['closed']}"
            ),
        },
        {
            "section_key": "RISK_ATTENTION",
            "title": "Riscos Críticos e Atenções",
            "display_order": 1,
            "current_content": "\n".join(attention_lines) if attention_lines else "Nenhum risco crítico ou sem mapeamento no escopo selecionado.",
        },
        {
            "section_key": "RISK_MATRIX_DETAILS",
            "title": "Detalhamento da Matriz",
            "display_order": 2,
            "current_content": (modules_line + "\n\n" + "\n".join(details_lines)).strip() if details_lines else "Nenhum risco encontrado para o escopo selecionado.",
        },
    ]

def _build_risk_mapping_sections_from_scope(comm: Communication, pub: Publication, db: Session) -> list[dict]:
    data = _resolve_risk_scope(comm, db)
    rows = data["rows"]
    if not rows:
        return [
            {
                "section_key": "RISK_IDENTIFICATION",
                "title": "Identificação do Risco",
                "display_order": 0,
                "current_content": "Nenhum risco encontrado para o escopo selecionado.",
            },
            {
                "section_key": "RISK_CROSS_MODULE_MAPPING",
                "title": "Mapeamento Cross-Module",
                "display_order": 1,
                "current_content": "Sem dados de mapeamento disponíveis.",
            },
            {
                "section_key": "RISK_MITIGATION_AND_ACTIONS",
                "title": "Mitigação e Próximas Ações",
                "display_order": 2,
                "current_content": "Sem plano de mitigação registrado para o escopo selecionado.",
            },
        ]

    row = rows[0]
    mapping_lines = []
    for link in row["links"]:
        mapping_lines.append(f"• {link['entity_type'].upper()} — {link['label'] or link['entity_id']}")

    return [
        {
            "section_key": "RISK_IDENTIFICATION",
            "title": "Identificação do Risco",
            "display_order": 0,
            "current_content": (
                f"Título: {row['title']}\n"
                f"Status: {row['status_label']}\n"
                f"Score: {row['risk_score']}\n"
                f"Nível: {row['level_label']}\n"
                f"Probabilidade: {row['probability']}\n"
                f"Impacto: {row['impact']}\n"
                f"Categoria: {row['category'] or '—'}\n"
                f"Responsável: {row['responsible'] or '—'}\n"
                f"Descrição: {row['description'] or '—'}"
            ),
        },
        {
            "section_key": "RISK_CROSS_MODULE_MAPPING",
            "title": "Mapeamento Cross-Module",
            "display_order": 1,
            "current_content": "\n".join(mapping_lines) if mapping_lines else "Risco sem vínculos cross-module registrados.",
        },
        {
            "section_key": "RISK_MITIGATION_AND_ACTIONS",
            "title": "Mitigação e Próximas Ações",
            "display_order": 2,
            "current_content": row["mitigation_plan"] or "Sem plano de mitigação registrado.",
        },
    ]

def _render_risk_matrix_html(pub: Publication, comm: Communication, data: dict) -> str:
    summary = data["summary_cards"]
    cards = [
        ("Riscos no escopo", summary["total"], "#2563eb"),
        ("Altos", summary["high"], "#ef4444"),
        ("Médios", summary["medium"], "#f59e0b"),
        ("Não mapeados", summary["unmapped"], "#94a3b8"),
    ]
    card_html = "".join(
        f"<div style='flex:1;min-width:180px;border:1px solid #dbe3f0;border-radius:12px;padding:16px;background:#fff;'>"
        f"<div style='font-size:12px;color:#64748b;margin-bottom:8px;'>{label}</div>"
        f"<div style='font-size:34px;font-weight:700;color:{color};'>{value}</div>"
        f"</div>"
        for label, value, color in cards
    )
    attention_html = "".join(
        f"<li><strong>{point['title']}</strong> ({point['status']}): {point['summary']}"
        f"{f' — Próximo passo: {point['next_step']}' if point['next_step'] else ''}</li>"
        for point in data["attention_points"]
    ) or "<li>Nenhum ponto crítico no período.</li>"
    rows_html = "".join(
        f"<tr>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;'>{row['title']}</td>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;'>{row['status_label']}</td>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;'>{row['probability']}</td>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;'>{row['impact']}</td>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;'>{row['risk_score']}</td>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;color:{'#ef4444' if row['level']=='high' else '#f59e0b' if row['level']=='medium' else '#22c55e'};'>{row['level_label']}</td>"
        f"<td style='padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;'>{row['mapping_count']}</td>"
        f"</tr>"
        for row in data["rows"]
    ) or "<tr><td colspan='7' style='padding:12px;'>Nenhum risco encontrado.</td></tr>"
    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>{pub.title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#1f2937;margin:0;padding:24px;">
  <div style="max-width:1180px;margin:0 auto;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Product Lab • Risk Matrix Report</div>
      <h1 style="margin:8px 0 4px 0;color:#183153;">{pub.title}</h1>
      <div style="color:#64748b;">{pub.subtitle or ''}</div>
      <div style="color:#64748b;font-size:12px;margin-top:8px;">Referência: {pub.reference_label or '—'} • Gerado em {data['generated_at']}</div>
    </header>
    <section style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">{card_html}</section>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">Principais riscos e cobertura de mapeamento</h2>
      <ul>{attention_html}</ul>
    </section>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">Detalhamento da Matriz</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#eaf3ff;">
            <th style="padding:10px;text-align:left;">Risco</th>
            <th style="padding:10px;text-align:left;">Status</th>
            <th style="padding:10px;text-align:center;">Prob.</th>
            <th style="padding:10px;text-align:center;">Impacto</th>
            <th style="padding:10px;text-align:center;">Score</th>
            <th style="padding:10px;text-align:left;">Nível</th>
            <th style="padding:10px;text-align:center;">Vínculos</th>
          </tr>
        </thead>
        <tbody>{rows_html}</tbody>
      </table>
    </section>
  </div>
</body>
</html>
""".strip()

def _render_risk_mapping_html(pub: Publication, comm: Communication, data: dict) -> str:
    row = data["rows"][0] if data["rows"] else None
    if not row:
        return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>{pub.title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#1f2937;margin:0;padding:24px;">
  <div style="max-width:980px;margin:0 auto;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Product Lab • Risk Mapping Detail Report</div>
      <h1 style="margin:8px 0 4px 0;color:#183153;">{pub.title}</h1>
    </header>
    <section style="padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">Nenhum risco encontrado para o escopo selecionado.</section>
  </div>
</body>
</html>
""".strip()

    links_html = "".join(
        f"<li><strong>{link['entity_type'].upper()}</strong> — {link['label'] or link['entity_id']}</li>"
        for link in row["links"]
    ) or "<li>Sem vínculos cross-module registrados.</li>"

    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>{pub.title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#1f2937;margin:0;padding:24px;">
  <div style="max-width:980px;margin:0 auto;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Product Lab • Risk Mapping Detail Report</div>
      <h1 style="margin:8px 0 4px 0;color:#183153;">{pub.title}</h1>
      <div style="color:#64748b;">{pub.subtitle or ''}</div>
      <div style="color:#64748b;font-size:12px;margin-top:8px;">Referência: {pub.reference_label or '—'} • Gerado em {data['generated_at']}</div>
    </header>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">Identificação do Risco</h2>
      <p><strong>Título:</strong> {row['title']}</p>
      <p><strong>Status:</strong> {row['status_label']}</p>
      <p><strong>Score:</strong> {row['risk_score']} • <strong>Nível:</strong> {row['level_label']}</p>
      <p><strong>Probabilidade:</strong> {row['probability']} • <strong>Impacto:</strong> {row['impact']}</p>
      <p><strong>Categoria:</strong> {row['category'] or '—'} • <strong>Responsável:</strong> {row['responsible'] or '—'}</p>
      <p><strong>Descrição:</strong> {row['description'] or '—'}</p>
    </section>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">Mapeamento Cross-Module</h2>
      <ul>{links_html}</ul>
    </section>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">Mitigação e Próximas Ações</h2>
      <p>{row['mitigation_plan'] or 'Sem plano de mitigação registrado.'}</p>
    </section>
  </div>
</body>
</html>
""".strip()

def _build_roadmap_sections_from_scope(comm: Communication, pub: Publication, db: Session) -> list[dict]:
    data = _resolve_roadmap_scope(comm, db)
    cfg = _get_prebuilt_config(comm.report_kind or REPORT_KIND_ROADMAP) or PREBUILT_REPORTS[0]
    summary = data["summary_cards"]
    sections = []
    heading1 = cfg["sample"]["sections"][0]["title"]
    heading2 = cfg["sample"]["sections"][1]["title"]
    heading3 = cfg["sample"]["sections"][2]["title"]

    sections.append({
        "section_key": "EXEC_SUMMARY",
        "title": heading1,
        "display_order": 0,
        "current_content": (
            f"Items in scope: {summary['total_in_scope']} | "
            f"On track: {summary['on_track']} | "
            f"Attention: {summary['attention']} | "
            f"Waiting owner: {summary['waiting_owner']} | "
            f"Not started: {summary['not_started']} | "
            f"Blocked: {summary['blocked']} | "
            f"Completed: {summary['completed']}"
        ) if comm.report_kind == REPORT_KIND_ROADMAP_EN else (
            f"Itens no escopo: {summary['total_in_scope']} | "
            f"On track: {summary['on_track']} | "
            f"Em atenção: {summary['attention']} | "
            f"Aguardando interlocutor: {summary['waiting_owner']} | "
            f"Não iniciados: {summary['not_started']} | "
            f"Bloqueados: {summary['blocked']} | "
            f"Concluídos: {summary['completed']}"
        )
    })

    if data["attention_points"]:
        sections.append({
            "section_key": "EXEC_ATTENTION",
            "title": heading2,
            "display_order": 1,
            "current_content": "\n".join(
                f"• {point['title']} ({point['status']}): {point['summary']}" + (f" Next step: {point['next_step']}" if point["next_step"] and comm.report_kind == REPORT_KIND_ROADMAP_EN else f" Próximo passo: {point['next_step']}" if point["next_step"] else "")
                for point in data["attention_points"]
            )
        })

    details_lines = []
    for group in data["groups"]:
        details_lines.append(f"{group['type'].upper()} — {group['title']} [{group['executive_status_label']}]")
        if group["executive_summary"]:
            details_lines.append(("Summary: " if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Resumo: ") + group["executive_summary"])
        if group["executive_risk_dependency"]:
            details_lines.append(("Risk/Dependency: " if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Risco/Dependência: ") + group["executive_risk_dependency"])
        if group["executive_next_step"]:
            details_lines.append(("Next step: " if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Próximo passo: ") + group["executive_next_step"])
        for feature in group["features"]:
            details_lines.append(f"→ Feature {feature['backlog_item_id']} — {feature['title']} [{feature['executive_status_label']}]")
        details_lines.append("")
    sections.append({
        "section_key": "ROADMAP_DETAILS",
        "title": heading3,
        "display_order": 2,
        "current_content": "\n".join(details_lines).strip() or ("No items found for selected scope." if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Nenhum item encontrado para o escopo selecionado."),
    })
    return sections

def _render_roadmap_html(pub: Publication, comm: Communication, data: dict) -> str:
    cfg = _get_prebuilt_config(comm.report_kind or REPORT_KIND_ROADMAP) or PREBUILT_REPORTS[0]
    summary = data["summary_cards"]
    sample = cfg["sample"]
    cards = [
        ("Items in scope" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "No escopo", summary["total_in_scope"], "#2563eb"),
        ("On track", summary["on_track"], "#22c55e"),
        ("Needs attention" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Em atenção", summary["attention"], "#f59e0b"),
        ("Waiting for owner" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Aguardando interlocutor", summary["waiting_owner"], "#94a3b8"),
    ]
    card_html = "".join(
        f"<div style='flex:1;min-width:180px;border:1px solid #dbe3f0;border-radius:12px;padding:16px;background:#fff;'>"
        f"<div style='font-size:12px;color:#64748b;margin-bottom:8px;'>{label}</div>"
        f"<div style='font-size:34px;font-weight:700;color:{color};'>{value}</div>"
        f"</div>"
        for label, value, color in cards
    )
    attention_html = "".join(
        f"<li><strong>{point['title']}</strong> ({point['status']}): {point['summary']}"
        f"{f' — Next step: {point['next_step']}' if point['next_step'] and comm.report_kind == REPORT_KIND_ROADMAP_EN else f' — Próximo passo: {point['next_step']}' if point['next_step'] else ''}</li>"
        for point in data["attention_points"]
    ) or ("<li>No critical items in this period.</li>" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "<li>Nenhum ponto crítico no período.</li>")
    groups_html = []
    for group in data["groups"]:
        feature_lines = "".join(
            f"<li><strong>Feature {feature['backlog_item_id']}</strong> — {feature['title']} "
            f"<span style='color:{_status_color(feature['executive_status'])};font-weight:600;'>({feature['executive_status_label']})</span></li>"
            for feature in group["features"]
        ) or ("<li>No linked features.</li>" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "<li>Sem features vinculadas.</li>")

        group_html = (
            f"<section style='margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;'>"
            f"<h2 style='margin:0 0 10px 0;color:#1e3a5f;'>{group['type'].upper()} — {group['title']}</h2>"
            f"<div style='margin-bottom:8px;color:{_status_color(group['executive_status'])};font-weight:700;'>{group['executive_status_label']}</div>"
        )
        if group["executive_summary"]:
            group_html += f"<p><strong>{'Summary' if comm.report_kind == REPORT_KIND_ROADMAP_EN else 'Resumo'}:</strong> {group['executive_summary']}</p>"
        if group["executive_risk_dependency"]:
            group_html += f"<p><strong>{'Risk/Dependency' if comm.report_kind == REPORT_KIND_ROADMAP_EN else 'Risco/Dependência'}:</strong> {group['executive_risk_dependency']}</p>"
        if group["executive_next_step"]:
            group_html += f"<p><strong>{'Next step' if comm.report_kind == REPORT_KIND_ROADMAP_EN else 'Próximo passo'}:</strong> {group['executive_next_step']}</p>"
        group_html += f"<ul>{feature_lines}</ul></section>"
        groups_html.append(group_html)
    title_prefix = "Roadmap Executive Report" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Roadmap Executive Report"
    subtitle_label = "Reference" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Referência"
    generated_label = "Generated at" if comm.report_kind == REPORT_KIND_ROADMAP_EN else "Gerado em"
    return f"""
<!DOCTYPE html>
<html lang="{cfg['default_language']}">
<head><meta charset="UTF-8" /><title>{pub.title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#1f2937;margin:0;padding:24px;">
  <div style="max-width:1180px;margin:0 auto;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Product Lab • {title_prefix}</div>
      <h1 style="margin:8px 0 4px 0;color:#183153;">{pub.title}</h1>
      <div style="color:#64748b;">{pub.subtitle or ''}</div>
      <div style="color:#64748b;font-size:12px;margin-top:8px;">{subtitle_label}: {pub.reference_label or '—'} • {generated_label} {data['generated_at']}</div>
    </header>
    <section style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">{card_html}</section>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">{sample['summary_heading']}</h2>
      <ul>{attention_html}</ul>
    </section>
    {''.join(groups_html)}
  </div>
</body>
</html>
""".strip()

# Types, Templates, Audiences, Communications, Publications, Sections, Reviews, Versions, Delivery
# Remaining endpoints preserved from previous implementation

class CommTypeCreate(BaseModel):
    name: str; description: Optional[str]=None; default_format: Optional[str]=None

class CommTypeUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    default_format: Optional[str]=None; is_active: Optional[bool]=None

class CommTypeOut(BaseModel):
    communication_type_id: int; name: str; description: Optional[str]
    default_format: Optional[str]; is_active: bool; created_at: datetime
    class Config: from_attributes=True

@router.get("/types", response_model=List[CommTypeOut], tags=["Communication Types"])
def list_communication_types(only_active: bool=True, db: Session=Depends(get_db)):
    _ensure_prebuilt_templates(db)
    q = select(CommunicationType)
    if only_active: q = q.where(CommunicationType.is_active==True)
    return db.scalars(q.order_by(CommunicationType.name)).all()

@router.post("/types", response_model=CommTypeOut, status_code=201, tags=["Communication Types"])
def create_communication_type(body: CommTypeCreate, db: Session=Depends(get_db)):
    obj = CommunicationType(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.get("/types/{id}", response_model=CommTypeOut, tags=["Communication Types"])
def get_communication_type(id: int, db: Session=Depends(get_db)):
    return _get_or_404(db, CommunicationType, "communication_type_id", id)

@router.patch("/types/{id}", response_model=CommTypeOut, tags=["Communication Types"])
def update_communication_type(id: int, body: CommTypeUpdate, db: Session=Depends(get_db)):
    obj = _get_or_404(db, CommunicationType, "communication_type_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/types/{id}", status_code=204, tags=["Communication Types"])
def delete_communication_type(id: int, db: Session=Depends(get_db)):
    obj = _get_or_404(db, CommunicationType, "communication_type_id", id)
    obj.is_active=False; obj.updated_at=datetime.utcnow(); db.commit()

class TemplateCreate(BaseModel):
    communication_type_id: int; name: str; description: Optional[str]=None
    general_prompt: Optional[str]=None; default_language: str="pt-BR"
    default_tone: Optional[str]=None; default_detail_level: Optional[str]=None
    default_output_format: Optional[str]=None

class TemplateUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    general_prompt: Optional[str]=None; default_language: Optional[str]=None
    default_tone: Optional[str]=None; default_detail_level: Optional[str]=None
    default_output_format: Optional[str]=None; is_active: Optional[bool]=None

class TemplateOut(BaseModel):
    communication_template_id: int; communication_type_id: int; name: str
    description: Optional[str]; general_prompt: Optional[str]; default_language: str
    default_tone: Optional[str]; default_detail_level: Optional[str]
    default_output_format: Optional[str]; is_active: bool
    created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

@router.get("/templates", response_model=dict, tags=["Templates"])
def list_templates(page:int=1, size:int=50, comm_type_id:Optional[int]=None, only_active:bool=True, db:Session=Depends(get_db)):
    _ensure_prebuilt_templates(db)
    q = select(CommunicationTemplate)
    if only_active: q=q.where(CommunicationTemplate.is_active==True)
    if comm_type_id: q=q.where(CommunicationTemplate.communication_type_id==comm_type_id)
    result=_paginate(db, q.order_by(CommunicationTemplate.name), page, size)
    result["items"]=[TemplateOut.model_validate(i) for i in result["items"]]; return result

@router.post("/templates", response_model=TemplateOut, status_code=201, tags=["Templates"])
def create_template(body: TemplateCreate, db:Session=Depends(get_db)):
    obj=CommunicationTemplate(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.get("/templates/{id}", response_model=TemplateOut, tags=["Templates"])
def get_template(id:int, db:Session=Depends(get_db)):
    return _get_or_404(db, CommunicationTemplate, "communication_template_id", id)

@router.patch("/templates/{id}", response_model=TemplateOut, tags=["Templates"])
def update_template(id:int, body:TemplateUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, CommunicationTemplate, "communication_template_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/templates/{id}", status_code=204, tags=["Templates"])
def delete_template(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, CommunicationTemplate, "communication_template_id", id)
    obj.is_active=False; obj.updated_at=datetime.utcnow(); db.commit()

class TplSectionCreate(BaseModel):
    section_key: str; title: str; description: Optional[str]=None
    generation_prompt: Optional[str]=None; display_order: int=0; is_required: bool=True
    minimum_items: Optional[int]=None; maximum_items: Optional[int]=None; target_length: Optional[int]=None

class TplSectionUpdate(BaseModel):
    section_key: Optional[str]=None; title: Optional[str]=None; description: Optional[str]=None
    generation_prompt: Optional[str]=None; display_order: Optional[int]=None
    is_required: Optional[bool]=None; minimum_items: Optional[int]=None
    maximum_items: Optional[int]=None; target_length: Optional[int]=None; is_active: Optional[bool]=None

class TplSectionOut(BaseModel):
    template_section_id: int; communication_template_id: int; section_key: str; title: str
    description: Optional[str]; generation_prompt: Optional[str]; display_order: int
    is_required: bool; minimum_items: Optional[int]; maximum_items: Optional[int]
    target_length: Optional[int]; is_active: bool
    class Config: from_attributes=True

class TemplateSampleSectionOut(BaseModel):
    section_key: str
    title: str
    description: Optional[str] = None
    generation_prompt: Optional[str] = None
    display_order: int
    is_required: bool
    target_length: Optional[int] = None

class TemplateSampleViewOut(BaseModel):
    report_kind: Optional[str] = None
    template_id: int
    template_name: str
    language: Optional[str] = None
    tone: Optional[str] = None
    detail_level: Optional[str] = None
    output_format: Optional[str] = None
    title: Optional[str] = None
    preview_label: Optional[str] = None
    summary_heading: Optional[str] = None
    status_labels: dict[str, str] = Field(default_factory=dict)
    sections: List[TemplateSampleSectionOut] = Field(default_factory=list)
    attention_points: List[dict] = Field(default_factory=list)
    group: Optional[dict] = None
    sample_payload: dict = Field(default_factory=dict)
    sample_html: str = ""

def _build_sample_html_from_config(cfg: dict) -> str:
    sample = cfg["sample"]
    summary_heading = sample.get("summary_heading") or "Resumo"
    attention_points = sample.get("attention_points", [])
    sections = sample.get("sections", [])
    group = sample.get("group") or {}
    title = sample.get("title") or cfg["template_name"]
    preview_label = sample.get("preview_label") or cfg["description"]

    card_html = "".join(
        f"<div style='flex:1;min-width:180px;border:1px solid #dbe3f0;border-radius:12px;padding:16px;background:#fff;'>"
        f"<div style='font-size:12px;color:#64748b;margin-bottom:8px;'>{section['title']}</div>"
        f"<div style='font-size:13px;font-weight:600;color:#183153;'>{section.get('description') or 'Seção do template'}</div>"
        f"</div>"
        for section in sections[:3]
    )

    attention_html = "".join(
        (
            f"<li><strong>{point.get('title', 'Ponto')}</strong> "
            f"({point.get('status', '—')}): {point.get('summary', '')}"
            + (f" — Próximo passo: {point.get('next_step')}" if point.get("next_step") else "")
            + "</li>"
        )
        for point in attention_points
    ) or "<li>Sem pontos de atenção no exemplo.</li>"

    feature_lines = "".join(
        [
            (
                f"<li><strong>{feature.get('title', 'Item')}</strong> "
                f"<span style='color:#0f766e;font-weight:600;'>"
                f"({feature.get('executive_status_label', feature.get('executive_status', '—'))})"
                f"</span>"
                + (
                    f"<div style='font-size:12px;color:#64748b;'>{feature.get('executive_summary')}</div>"
                    if feature.get("executive_summary")
                    else ""
                )
                + "</li>"
            )
            for feature in group.get("features", [])
        ]
    ) or "<li>Sem itens relacionados no exemplo.</li>"

    sections_html = "".join(
        [
            (
                f"<section style='margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;'>"
                f"<h2 style='margin:0 0 8px 0;color:#1e3a5f;'>{section['title']}</h2>"
                + (
                    f"<p style='margin:0 0 12px 0;color:#64748b;'>{section.get('description')}</p>"
                    if section.get("description")
                    else ""
                )
                + (
                    f"<p style='margin:0;color:#334155;'><strong>Prompt:</strong> {section.get('generation_prompt')}</p>"
                    if section.get("generation_prompt")
                    else ""
                )
                + "</section>"
            )
            for section in sections
        ]
    )

    group_html = ""
    if group:
        group_html = (
            f"<section style='margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;'>"
            f"<h2 style='margin:0 0 8px 0;color:#1e3a5f;'>{group.get('title', 'Grupo de exemplo')}</h2>"
            + (
                f"<div style='margin-bottom:8px;color:#0f766e;font-weight:700;'>{group.get('executive_status_label')}</div>"
                if group.get("executive_status_label")
                else ""
            )
            + (
                f"<p><strong>Resumo:</strong> {group.get('executive_summary')}</p>"
                if group.get("executive_summary")
                else ""
            )
            + (
                f"<p><strong>Risco/Dependência:</strong> {group.get('executive_risk_dependency')}</p>"
                if group.get("executive_risk_dependency")
                else ""
            )
            + (
                f"<p><strong>Próximo passo:</strong> {group.get('executive_next_step')}</p>"
                if group.get("executive_next_step")
                else ""
            )
            + f"<ul>{feature_lines}</ul>"
            + "</section>"
        )

    return f"""
<!DOCTYPE html>
<html lang="{cfg.get('default_language', 'pt-BR')}">
<head>
  <meta charset="UTF-8" />
  <title>{title}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#1f2937;margin:0;padding:24px;">
  <div style="max-width:1180px;margin:0 auto;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Product Lab • Template Preview</div>
      <h1 style="margin:8px 0 4px 0;color:#183153;">{title}</h1>
      <div style="color:#64748b;">{preview_label}</div>
    </header>
    <section style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">{card_html}</section>
    <section style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;">
      <h2 style="margin-top:0;color:#1e3a5f;">{summary_heading}</h2>
      <ul>{attention_html}</ul>
    </section>
    {group_html}
    {sections_html}
  </div>
</body>
</html>
""".strip()

def _build_template_sample_view(template: CommunicationTemplate, db: Session) -> TemplateSampleViewOut:
    comm_type = db.get(CommunicationType, template.communication_type_id)
    report_kind = comm_type.name if comm_type else None
    cfg = _get_prebuilt_config(report_kind) if report_kind else None

    if cfg:
        sample = cfg["sample"]
        sections = [
            TemplateSampleSectionOut(
                section_key=section["section_key"],
                title=section["title"],
                description=section.get("description"),
                generation_prompt=section.get("generation_prompt"),
                display_order=section["display_order"],
                is_required=section["is_required"],
                target_length=section.get("target_length"),
            )
            for section in sample.get("sections", [])
        ]
        return TemplateSampleViewOut(
            report_kind=cfg["report_kind"],
            template_id=template.communication_template_id,
            template_name=template.name,
            language=template.default_language,
            tone=template.default_tone,
            detail_level=template.default_detail_level,
            output_format=template.default_output_format,
            title=sample.get("title"),
            preview_label=sample.get("preview_label"),
            summary_heading=sample.get("summary_heading"),
            status_labels=sample.get("status_labels", {}),
            sections=sections,
            attention_points=sample.get("attention_points", []),
            group=sample.get("group"),
            sample_payload=sample,
            sample_html=_build_sample_html_from_config(cfg),
        )

    template_sections = db.scalars(
        select(TemplateSection)
        .where(TemplateSection.communication_template_id == template.communication_template_id)
        .where(TemplateSection.is_active == True)
        .order_by(TemplateSection.display_order)
    ).all()

    sections = [
        TemplateSampleSectionOut(
            section_key=section.section_key,
            title=section.title,
            description=section.description,
            generation_prompt=section.generation_prompt,
            display_order=section.display_order,
            is_required=section.is_required,
            target_length=section.target_length,
        )
        for section in template_sections
    ]

    generic_sections_html = "".join(
        [
            (
                f"<section style='margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:14px;background:#fff;'>"
                f"<h2 style='margin:0 0 8px 0;color:#1e3a5f;'>{section.title}</h2>"
                + (
                    f"<p style='margin:0 0 12px 0;color:#64748b;'>{section.description}</p>"
                    if section.description
                    else ""
                )
                + (
                    f"<p style='margin:0;color:#334155;'><strong>Prompt:</strong> {section.generation_prompt}</p>"
                    if section.generation_prompt
                    else ""
                )
                + "</section>"
            )
            for section in template_sections
        ]
    )

    generic_html = f"""
<!DOCTYPE html>
<html lang="{template.default_language or 'pt-BR'}">
<head>
  <meta charset="UTF-8" />
  <title>{template.name}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;color:#1f2937;margin:0;padding:24px;">
  <div style="max-width:1080px;margin:0 auto;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Product Lab • Template Preview</div>
      <h1 style="margin:8px 0 4px 0;color:#183153;">{template.name}</h1>
      <div style="color:#64748b;">{template.description or ''}</div>
    </header>
    {generic_sections_html}
  </div>
</body>
</html>
""".strip()

    return TemplateSampleViewOut(
        report_kind=report_kind,
        template_id=template.communication_template_id,
        template_name=template.name,
        language=template.default_language,
        tone=template.default_tone,
        detail_level=template.default_detail_level,
        output_format=template.default_output_format,
        title=template.name,
        preview_label=template.description,
        sections=sections,
        sample_payload={
            "template_name": template.name,
            "description": template.description,
            "sections": [
                {
                    "section_key": section.section_key,
                    "title": section.title,
                    "description": section.description,
                    "generation_prompt": section.generation_prompt,
                    "display_order": section.display_order,
                }
                for section in template_sections
            ],
        },
        sample_html=generic_html,
    )

@router.get("/templates/{tpl_id}/sections", response_model=List[TplSectionOut], tags=["Templates"])
def list_template_sections(tpl_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, CommunicationTemplate, "communication_template_id", tpl_id)
    q=(select(TemplateSection).where(TemplateSection.communication_template_id==tpl_id)
       .where(TemplateSection.is_active==True).order_by(TemplateSection.display_order))
    return db.scalars(q).all()

@router.get("/templates/{tpl_id}/sample-view", response_model=TemplateSampleViewOut, tags=["Templates"])
def get_template_sample_view(tpl_id:int, db:Session=Depends(get_db)):
    _ensure_prebuilt_templates(db)
    template = _get_or_404(db, CommunicationTemplate, "communication_template_id", tpl_id)
    return _build_template_sample_view(template, db)

@router.post("/templates/{tpl_id}/sections", response_model=TplSectionOut, status_code=201, tags=["Templates"])
def create_template_section(tpl_id:int, body:TplSectionCreate, db:Session=Depends(get_db)):
    _get_or_404(db, CommunicationTemplate, "communication_template_id", tpl_id)
    obj=TemplateSection(**body.model_dump(), communication_template_id=tpl_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/template-sections/{id}", response_model=TplSectionOut, tags=["Templates"])
def update_template_section(id:int, body:TplSectionUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, TemplateSection, "template_section_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/template-sections/{id}", status_code=204, tags=["Templates"])
def delete_template_section(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, TemplateSection, "template_section_id", id)
    obj.is_active=False; obj.updated_at=datetime.utcnow(); db.commit()

class AudienceCreate(BaseModel):
    product_id: Optional[int]=None; name: str; description: Optional[str]=None
    audience_type: str="GROUP"; preferred_language: Optional[str]=None
    preferred_tone: Optional[str]=None; preferred_detail_level: Optional[str]=None

class AudienceUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None; audience_type: Optional[str]=None
    preferred_language: Optional[str]=None; preferred_tone: Optional[str]=None
    preferred_detail_level: Optional[str]=None; is_active: Optional[bool]=None

class AudienceOut(BaseModel):
    audience_id: int; product_id: Optional[int]; name: str; description: Optional[str]
    audience_type: str; preferred_language: Optional[str]; preferred_tone: Optional[str]
    preferred_detail_level: Optional[str]; is_active: bool; created_at: datetime
    class Config: from_attributes=True

@router.get("/audiences", response_model=dict, tags=["Audiences"])
def list_audiences(page:int=1, size:int=50, product_id:Optional[int]=None, db:Session=Depends(get_db)):
    q=select(Audience).where(Audience.is_active==True)
    if product_id is not None: q=q.where((Audience.product_id==product_id)|(Audience.product_id.is_(None)))
    result=_paginate(db, q.order_by(Audience.name), page, size)
    result["items"]=[AudienceOut.model_validate(i) for i in result["items"]]; return result

@router.post("/audiences", response_model=AudienceOut, status_code=201, tags=["Audiences"])
def create_audience(body:AudienceCreate, db:Session=Depends(get_db)):
    obj=Audience(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/audiences/{id}", response_model=AudienceOut, tags=["Audiences"])
def update_audience(id:int, body:AudienceUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Audience, "audience_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/audiences/{id}", status_code=204, tags=["Audiences"])
def delete_audience(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Audience, "audience_id", id); db.delete(obj); db.commit()

class AudienceMemberOut(BaseModel):
    audience_member_id: int
    audience_id: int
    stakeholder_id: int
    notes: Optional[str]
    created_at: datetime
    full_name: Optional[str] = None
    position_title: Optional[str] = None
    area: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    class Config: from_attributes=True

class AudienceMemberAdd(BaseModel):
    stakeholder_id: int
    notes: Optional[str] = None

@router.get("/audiences/{aud_id}/members", response_model=List[AudienceMemberOut], tags=["Audiences"])
def list_audience_members(aud_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Audience, "audience_id", aud_id)
    members = db.scalars(select(AudienceMember).where(AudienceMember.audience_id==aud_id).order_by(AudienceMember.created_at)).all()
    result = []
    for m in members:
        stk = db.get(Stakeholder, m.stakeholder_id)
        result.append(AudienceMemberOut(
            audience_member_id=m.audience_member_id, audience_id=m.audience_id, stakeholder_id=m.stakeholder_id,
            notes=m.notes, created_at=m.created_at,
            full_name=stk.full_name if stk else None,
            position_title=stk.position_title if stk else None,
            area=stk.area if stk else None, company=stk.company if stk else None, email=stk.email if stk else None,
        ))
    return result

@router.post("/audiences/{aud_id}/members", response_model=AudienceMemberOut, status_code=201, tags=["Audiences"])
def add_audience_member(aud_id:int, body:AudienceMemberAdd, db:Session=Depends(get_db)):
    _get_or_404(db, Audience, "audience_id", aud_id)
    _get_or_404(db, Stakeholder, "stakeholder_id", body.stakeholder_id)
    existing = db.scalars(select(AudienceMember).where(AudienceMember.audience_id==aud_id, AudienceMember.stakeholder_id==body.stakeholder_id)).first()
    if existing:
        raise HTTPException(400, "Stakeholder already member of this audience")
    obj = AudienceMember(audience_id=aud_id, stakeholder_id=body.stakeholder_id, notes=body.notes)
    db.add(obj); db.commit(); db.refresh(obj)
    stk = db.get(Stakeholder, obj.stakeholder_id)
    return AudienceMemberOut(
        audience_member_id=obj.audience_member_id, audience_id=obj.audience_id, stakeholder_id=obj.stakeholder_id,
        notes=obj.notes, created_at=obj.created_at,
        full_name=stk.full_name if stk else None,
        position_title=stk.position_title if stk else None,
        area=stk.area if stk else None, company=stk.company if stk else None, email=stk.email if stk else None,
    )

@router.delete("/audiences/{aud_id}/members/{stakeholder_id}", status_code=204, tags=["Audiences"])
def remove_audience_member(aud_id:int, stakeholder_id:int, db:Session=Depends(get_db)):
    obj = db.scalars(select(AudienceMember).where(AudienceMember.audience_id==aud_id, AudienceMember.stakeholder_id==stakeholder_id)).first()
    if not obj: raise HTTPException(404, "Member not found")
    db.delete(obj); db.commit()

class ReportScopeOption(BaseModel):
    id: str
    title: str
    item_type: Optional[str] = None
    executive_status: Optional[str] = None

class ReportScopeOut(BaseModel):
    report_kind: str
    export_formats: List[str]
    opportunities: List[ReportScopeOption]
    roadmap_items: List[ReportScopeOption]

@router.get("/report-scopes/roadmap", response_model=ReportScopeOut, tags=["Reports"])
def get_roadmap_report_scope(product_id: int, report_kind: str = REPORT_KIND_ROADMAP, db: Session = Depends(get_db)):
    _ensure_prebuilt_templates(db)
    roadmap_items = db.scalars(select(RoadmapItem).where(RoadmapItem.product_id == str(product_id)).order_by(RoadmapItem.title)).all()
    links = db.scalars(select(RoadmapBacklogLink).where(RoadmapBacklogLink.roadmap_item_id.in_([item.id for item in roadmap_items]))).all() if roadmap_items else []
    backlog_ids = [link.backlog_item_id for link in links]
    backlog_map = {}
    if backlog_ids:
        backlog_rows = db.scalars(select(BacklogItem).where(BacklogItem.item_id.in_(backlog_ids))).all()
        backlog_map = {row.item_id: row for row in backlog_rows}
    opp_ids = {row.discovery_opportunity_id for row in backlog_map.values() if row.discovery_opportunity_id}
    opp_map = {}
    if opp_ids:
        opp_rows = db.scalars(select(DiscoveryOpportunity).where(DiscoveryOpportunity.id.in_(opp_ids))).all()
        opp_map = {row.id: row for row in opp_rows}

    roadmap_options = [
        ReportScopeOption(
            id=item.id,
            title=item.title,
            item_type=item.type.value if hasattr(item.type, "value") else item.type,
            executive_status=_status_label(item.executive_status.value if hasattr(item.executive_status, "value") else item.executive_status, report_kind),
        ) for item in roadmap_items
    ]
    seen = set()
    opportunity_options = []
    for row in backlog_map.values():
        if not row.discovery_opportunity_id or row.discovery_opportunity_id in seen:
            continue
        seen.add(row.discovery_opportunity_id)
        opportunity_options.append(ReportScopeOption(id=row.discovery_opportunity_id, title=opp_map.get(row.discovery_opportunity_id) or row.discovery_opportunity_id))
    return ReportScopeOut(report_kind=report_kind, export_formats=["HTML", "PDF", "PPT"], opportunities=sorted(opportunity_options, key=lambda item: item.title.lower()), roadmap_items=roadmap_options)

class CommunicationCreate(BaseModel):
    product_id: int; communication_type_id: int; communication_template_id: Optional[int]=None
    name: str; description: Optional[str]=None; objective: str; trigger_type: str="MANUAL"
    default_language: Optional[str]="pt-BR"; default_tone: Optional[str]=None
    default_detail_level: Optional[str]=None; report_kind: Optional[str]=None
    report_scope: Optional[dict]=None; supported_export_formats: Optional[List[str]]=None

class CommunicationUpdate(BaseModel):
    communication_template_id: Optional[int]=None; name: Optional[str]=None
    description: Optional[str]=None; objective: Optional[str]=None
    trigger_type: Optional[str]=None; default_language: Optional[str]=None
    default_tone: Optional[str]=None; default_detail_level: Optional[str]=None
    report_kind: Optional[str]=None; report_scope: Optional[dict]=None
    supported_export_formats: Optional[List[str]]=None; status: Optional[str]=None; is_active: Optional[bool]=None

class CommunicationOut(BaseModel):
    communication_id: int; product_id: int; communication_type_id: int
    communication_template_id: Optional[int]; name: str; description: Optional[str]
    objective: str; trigger_type: str; default_language: Optional[str]
    default_tone: Optional[str]; default_detail_level: Optional[str]
    report_kind: Optional[str]; report_scope: Optional[dict]
    supported_export_formats: List[str] = Field(default_factory=list)
    status: str; is_active: bool; created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

def _to_communication_out(obj: Communication) -> CommunicationOut:
    return CommunicationOut(
        communication_id=obj.communication_id, product_id=obj.product_id, communication_type_id=obj.communication_type_id,
        communication_template_id=obj.communication_template_id, name=obj.name, description=obj.description,
        objective=obj.objective, trigger_type=obj.trigger_type, default_language=obj.default_language,
        default_tone=obj.default_tone, default_detail_level=obj.default_detail_level,
        report_kind=obj.report_kind, report_scope=obj.report_scope,
        supported_export_formats=_normalize_export_formats(obj.supported_export_formats),
        status=obj.status, is_active=obj.is_active, created_at=obj.created_at, updated_at=obj.updated_at,
    )

@router.get("", response_model=dict, tags=["Communications"])
def list_communications(page:int=1, size:int=20, product_id:Optional[int]=None, status:Optional[str]=None, db:Session=Depends(get_db)):
    q=select(Communication)
    if product_id: q=q.where(Communication.product_id==product_id)
    if status: q=q.where(Communication.status==status)
    result=_paginate(db, q.order_by(Communication.name), page, size)
    result["items"]=[_to_communication_out(i) for i in result["items"]]; return result

@router.post("", response_model=CommunicationOut, status_code=201, tags=["Communications"])
def create_communication(body:CommunicationCreate, db:Session=Depends(get_db)):
    prebuilt = _ensure_prebuilt_templates(db)
    data = body.model_dump()
    data["report_scope"] = _normalize_report_scope(data.get("report_scope"))
    data["supported_export_formats"] = _normalize_export_formats(data.get("supported_export_formats"))
    if data.get("report_kind") in prebuilt:
        data["communication_type_id"] = prebuilt[data["report_kind"]]["type"].communication_type_id
        if not data.get("communication_template_id"):
            data["communication_template_id"] = prebuilt[data["report_kind"]]["template"].communication_template_id
    obj=Communication(**data); db.add(obj); db.commit(); db.refresh(obj); return _to_communication_out(obj)

@router.get("/{id}", response_model=CommunicationOut, tags=["Communications"])
def get_communication(id:int, db:Session=Depends(get_db)):
    return _to_communication_out(_get_or_404(db, Communication, "communication_id", id))

@router.patch("/{id}", response_model=CommunicationOut, tags=["Communications"])
def update_communication(id:int, body:CommunicationUpdate, db:Session=Depends(get_db)):
    prebuilt = _ensure_prebuilt_templates(db)
    obj=_get_or_404(db, Communication, "communication_id", id)
    data = body.model_dump(exclude_unset=True)
    if "report_scope" in data: data["report_scope"] = _normalize_report_scope(data["report_scope"])
    if "supported_export_formats" in data: data["supported_export_formats"] = _normalize_export_formats(data["supported_export_formats"])
    target_report_kind = data.get("report_kind", obj.report_kind)
    if target_report_kind in prebuilt:
        data["communication_type_id"] = prebuilt[target_report_kind]["type"].communication_type_id
        if not data.get("communication_template_id") and not obj.communication_template_id:
            data["communication_template_id"] = prebuilt[target_report_kind]["template"].communication_template_id
    for k,v in data.items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return _to_communication_out(obj)

@router.delete("/{id}", status_code=204, tags=["Communications"])
def delete_communication(id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Communication, "communication_id", id); db.delete(obj); db.commit()

class CommunicationLinkCreate(BaseModel):
    entity_type: str
    entity_id: str
    link_role: str = "RELATED"
    is_primary: bool = False
    notes: Optional[str] = None

class CommunicationLinkUpdate(BaseModel):
    link_role: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None

class CommunicationLinkOut(BaseModel):
    communication_link_id: int
    communication_id: int
    entity_type: str
    entity_id: str
    link_role: str
    is_primary: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    entity_title: Optional[str] = None
    class Config: from_attributes = True

def _resolve_link_entity_title(entity_type: str, entity_id: str, db: Session) -> Optional[str]:
    if entity_type == "OPPORTUNITY":
        row = db.get(DiscoveryOpportunity, entity_id)
        return row.title if row else None
    if entity_type == "ROADMAP_ITEM":
        row = db.get(RoadmapItem, entity_id)
        return row.title if row else None
    if entity_type == "BACKLOG_ITEM":
        try:
            row = db.get(BacklogItem, int(entity_id))
            return row.title if row else None
        except ValueError:
            return None
    if entity_type == "RISK":
        row = db.get(Risk, entity_id)
        return row.title if row else None
    return None

def _normalize_link_role(value: Optional[str]) -> str:
    token = (value or "RELATED").strip().upper()
    allowed = {"PRIMARY", "RELATED", "SOURCE", "TARGET"}
    if token not in allowed:
        raise HTTPException(400, f"Invalid link_role: {value}")
    return token

def _normalize_link_entity_type(value: str) -> str:
    token = (value or "").strip().upper()
    allowed = {"OPPORTUNITY", "ROADMAP_ITEM", "BACKLOG_ITEM", "RISK", "DECISION", "REQUIREMENT"}
    if token not in allowed:
        raise HTTPException(400, f"Invalid entity_type: {value}")
    return token

def _ensure_primary_uniqueness(db: Session, communication_id: int, entity_type: str, entity_id: str, is_primary: bool, current_link_id: Optional[int] = None):
    if not is_primary:
        return
    q = select(CommunicationLink).where(
        CommunicationLink.entity_type == entity_type,
        CommunicationLink.entity_id == entity_id,
        CommunicationLink.is_primary == True,
    )
    rows = db.scalars(q).all()
    for row in rows:
        if current_link_id and row.communication_link_id == current_link_id:
            continue
        if row.communication_id != communication_id or row.communication_link_id != current_link_id:
            row.is_primary = False
            row.updated_at = datetime.utcnow()

def _to_communication_link_out(obj: CommunicationLink, db: Session) -> CommunicationLinkOut:
    return CommunicationLinkOut(
        communication_link_id=obj.communication_link_id,
        communication_id=obj.communication_id,
        entity_type=obj.entity_type,
        entity_id=obj.entity_id,
        link_role=obj.link_role,
        is_primary=obj.is_primary,
        notes=obj.notes,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
        entity_title=_resolve_link_entity_title(obj.entity_type, obj.entity_id, db),
    )

@router.get("/{comm_id}/links", response_model=List[CommunicationLinkOut], tags=["Communication Links"])
def list_communication_links(comm_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    rows = db.scalars(
        select(CommunicationLink)
        .where(CommunicationLink.communication_id == comm_id)
        .order_by(CommunicationLink.is_primary.desc(), CommunicationLink.entity_type, CommunicationLink.entity_id)
    ).all()
    return [_to_communication_link_out(row, db) for row in rows]

@router.post("/{comm_id}/links", response_model=CommunicationLinkOut, status_code=201, tags=["Communication Links"])
def create_communication_link(comm_id: int, body: CommunicationLinkCreate, db: Session = Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    entity_type = _normalize_link_entity_type(body.entity_type)
    entity_id = str(body.entity_id).strip()
    if not entity_id:
        raise HTTPException(400, "entity_id is required")
    link_role = _normalize_link_role(body.link_role)

    existing = db.scalars(
        select(CommunicationLink).where(
            CommunicationLink.communication_id == comm_id,
            CommunicationLink.entity_type == entity_type,
            CommunicationLink.entity_id == entity_id,
            CommunicationLink.link_role == link_role,
        )
    ).first()
    if existing:
        raise HTTPException(400, "Communication link already exists")

    _ensure_primary_uniqueness(db, comm_id, entity_type, entity_id, body.is_primary)

    obj = CommunicationLink(
        communication_id=comm_id,
        entity_type=entity_type,
        entity_id=entity_id,
        link_role=link_role,
        is_primary=body.is_primary,
        notes=body.notes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _to_communication_link_out(obj, db)

@router.patch("/links/{link_id}", response_model=CommunicationLinkOut, tags=["Communication Links"])
def update_communication_link(link_id: int, body: CommunicationLinkUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, CommunicationLink, "communication_link_id", link_id)
    data = body.model_dump(exclude_unset=True)

    if "link_role" in data:
        data["link_role"] = _normalize_link_role(data["link_role"])
    if "is_primary" in data:
        _ensure_primary_uniqueness(db, obj.communication_id, obj.entity_type, obj.entity_id, bool(data["is_primary"]), obj.communication_link_id)

    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return _to_communication_link_out(obj, db)

@router.delete("/links/{link_id}", status_code=204, tags=["Communication Links"])
def delete_communication_link(link_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, CommunicationLink, "communication_link_id", link_id)
    db.delete(obj)
    db.commit()

@router.get("/by-entity", response_model=List[CommunicationOut], tags=["Communication Links"])
def list_communications_by_entity(entity_type: str, entity_id: str, product_id: Optional[int] = None, db: Session = Depends(get_db)):
    entity_type = _normalize_link_entity_type(entity_type)
    entity_id = str(entity_id).strip()
    if not entity_id:
        raise HTTPException(400, "entity_id is required")

    q = (
        select(Communication)
        .join(CommunicationLink, Communication.communication_id == CommunicationLink.communication_id)
        .where(CommunicationLink.entity_type == entity_type)
        .where(CommunicationLink.entity_id == entity_id)
    )
    if product_id is not None:
        q = q.where(Communication.product_id == product_id)

    rows = db.scalars(q.order_by(Communication.updated_at.desc(), Communication.name)).all()
    return [_to_communication_out(row) for row in rows]

class ScheduleCreate(BaseModel):
    recurrence_type: str; recurrence_interval: int=1; reference_event: Optional[str]=None
    publication_offset_days: int=0; day_of_week: Optional[int]=None; day_of_month: Optional[int]=None
    execution_time: Optional[str]=None; timezone: str="America/Sao_Paulo"
    cron_expression: Optional[str]=None; starts_at: Optional[date]=None; ends_at: Optional[date]=None

class ScheduleUpdate(BaseModel):
    recurrence_type: Optional[str]=None; recurrence_interval: Optional[int]=None
    reference_event: Optional[str]=None; publication_offset_days: Optional[int]=None
    day_of_week: Optional[int]=None; day_of_month: Optional[int]=None
    execution_time: Optional[str]=None; timezone: Optional[str]=None
    cron_expression: Optional[str]=None; starts_at: Optional[date]=None
    ends_at: Optional[date]=None; is_active: Optional[bool]=None

class ScheduleOut(BaseModel):
    communication_schedule_id: int; communication_id: int; recurrence_type: str
    recurrence_interval: int; reference_event: Optional[str]; publication_offset_days: int
    day_of_week: Optional[int]; day_of_month: Optional[int]; timezone: str
    cron_expression: Optional[str]; starts_at: Optional[date]; ends_at: Optional[date]; is_active: bool
    class Config: from_attributes=True

@router.get("/{comm_id}/schedule", response_model=Optional[ScheduleOut], tags=["Schedules"])
def get_schedule(comm_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    return db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()

@router.post("/{comm_id}/schedule", response_model=ScheduleOut, status_code=201, tags=["Schedules"])
def create_schedule(comm_id:int, body:ScheduleCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    existing=db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()
    if existing: raise HTTPException(400, "Schedule already exists, use PATCH to update")
    obj=CommunicationSchedule(**body.model_dump(), communication_id=comm_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/{comm_id}/schedule", response_model=ScheduleOut, tags=["Schedules"])
def update_schedule(comm_id:int, body:ScheduleUpdate, db:Session=Depends(get_db)):
    obj=db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()
    if not obj: raise HTTPException(404, "Schedule not found")
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/{comm_id}/schedule", status_code=204, tags=["Schedules"])
def delete_schedule(comm_id:int, db:Session=Depends(get_db)):
    obj=db.scalars(select(CommunicationSchedule).where(CommunicationSchedule.communication_id==comm_id)).first()
    if not obj: raise HTTPException(404, "Schedule not found")
    db.delete(obj); db.commit()

class PublicationCreate(BaseModel):
    communication_id: int; title: str; subtitle: Optional[str]=None
    reference_label: Optional[str]=None; editorial_summary: Optional[str]=None
    reference_start_date: Optional[date]=None; reference_end_date: Optional[date]=None
    planned_publication_date: Optional[date]=None; auto_generate_from_scope: bool=False
    owner_name: Optional[str]=None
    occurrence_kind: str="SCHEDULED"
    operational_status: str="PLANNED"
    due_at: Optional[datetime]=None
    next_occurrence_date: Optional[date]=None
    source_reason: Optional[str]=None

class PublicationUpdate(BaseModel):
    title: Optional[str]=None; subtitle: Optional[str]=None
    reference_label: Optional[str]=None; editorial_summary: Optional[str]=None
    reference_start_date: Optional[date]=None; reference_end_date: Optional[date]=None
    planned_publication_date: Optional[date]=None; status: Optional[str]=None
    owner_name: Optional[str]=None
    occurrence_kind: Optional[str]=None
    operational_status: Optional[str]=None
    due_at: Optional[datetime]=None
    occurred_at: Optional[datetime]=None
    outcome_summary: Optional[str]=None
    next_occurrence_date: Optional[date]=None
    source_reason: Optional[str]=None
    meeting_id: Optional[str]=None

class PublicationOut(BaseModel):
    publication_id: int; communication_id: int; reference_label: Optional[str]
    title: str; subtitle: Optional[str]; reference_start_date: Optional[date]
    reference_end_date: Optional[date]; planned_publication_date: Optional[date]
    published_at: Optional[datetime]; status: str; editorial_summary: Optional[str]
    rendered_html: Optional[str]=None; export_payload: Optional[dict]=None
    version_number: int
    owner_name: Optional[str]=None
    occurrence_kind: Optional[str]=None
    operational_status: Optional[str]=None
    due_at: Optional[datetime]=None
    occurred_at: Optional[datetime]=None
    followup_id: Optional[str]=None
    meeting_id: Optional[str]=None
    outcome_summary: Optional[str]=None
    next_occurrence_date: Optional[date]=None
    source_reason: Optional[str]=None
    is_followup_generated: bool=False
    created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

def _compute_operational_status(obj: Publication) -> str:
    if obj.operational_status in {"PRESENTED", "CANCELLED"}:
        return obj.operational_status
    now = datetime.utcnow()
    if obj.due_at and obj.due_at < now:
        return "OVERDUE"
    if obj.due_at and obj.due_at.date() == now.date() and (obj.operational_status or "PLANNED") == "PLANNED":
        return "DUE"
    return obj.operational_status or "PLANNED"

def _ensure_publication_followup(pub: Publication, comm: Communication, db: Session):
    if pub.followup_id or not pub.planned_publication_date or pub.is_followup_generated:
        return
    row = Followup(
        entity_type="communication_publication",
        entity_id=str(pub.publication_id),
        action_type="review_answer",
        description=f"Prepare communication occurrence: {pub.title}",
        assigned_to=pub.owner_name,
        due_date=pub.planned_publication_date,
        status="pending",
        notes=f"Communication: {comm.name}",
    )
    db.add(row)
    db.flush()
    pub.followup_id = row.id
    pub.is_followup_generated = True

def _to_publication_out(obj: Publication) -> PublicationOut:
    obj.operational_status = _compute_operational_status(obj)
    return PublicationOut.model_validate(obj)

def _sync_prebuilt_publication(pub: Publication, db: Session):
    comm = _get_or_404(db, Communication, "communication_id", pub.communication_id)
    if comm.report_kind == REPORT_KIND_ROADMAP or comm.report_kind == REPORT_KIND_ROADMAP_EN:
        data = _resolve_roadmap_scope(comm, db)
        pub.export_payload = _json_safe(data)
        pub.rendered_html = _render_roadmap_html(pub, comm, data)
        db.query(Section).filter(Section.publication_id == pub.publication_id).delete()
        for section_data in _build_roadmap_sections_from_scope(comm, pub, db):
            db.add(Section(publication_id=pub.publication_id, **section_data))
        db.commit()
        return

    if comm.report_kind == REPORT_KIND_RISK_MATRIX:
        data = _resolve_risk_scope(comm, db)
        pub.export_payload = _json_safe(data)
        pub.rendered_html = _render_risk_matrix_html(pub, comm, data)
        db.query(Section).filter(Section.publication_id == pub.publication_id).delete()
        for section_data in _build_risk_matrix_sections_from_scope(comm, pub, db):
            db.add(Section(publication_id=pub.publication_id, **section_data))
        db.commit()
        return

    if comm.report_kind == REPORT_KIND_RISK_MAPPING:
        data = _resolve_risk_scope(comm, db)
        pub.export_payload = _json_safe(data)
        pub.rendered_html = _render_risk_mapping_html(pub, comm, data)
        db.query(Section).filter(Section.publication_id == pub.publication_id).delete()
        for section_data in _build_risk_mapping_sections_from_scope(comm, pub, db):
            db.add(Section(publication_id=pub.publication_id, **section_data))
        db.commit()
        return

@router.get("/{comm_id}/publications", response_model=dict, tags=["Publications"])
def list_publications(comm_id:int, page:int=1, size:int=20, status:Optional[str]=None, db:Session=Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    q=select(Publication).where(Publication.communication_id==comm_id)
    if status: q=q.where(Publication.status==status)
    result=_paginate(db, q.order_by(Publication.created_at.desc()), page, size)
    result["items"]=[_to_publication_out(i) for i in result["items"]]; return result

@router.post("/{comm_id}/publications", response_model=PublicationOut, status_code=201, tags=["Publications"])
def create_publication(comm_id:int, body:PublicationCreate, db:Session=Depends(get_db)):
    comm = _get_or_404(db, Communication, "communication_id", comm_id)
    data=body.model_dump(exclude={"auto_generate_from_scope"}); data["communication_id"]=comm_id
    if not data.get("due_at") and data.get("planned_publication_date"):
        data["due_at"] = datetime.combine(data["planned_publication_date"], datetime.min.time())
    obj=Publication(**data); db.add(obj); db.flush()
    _ensure_publication_followup(obj, comm, db)
    db.commit(); db.refresh(obj)
    if body.auto_generate_from_scope or comm.report_kind in {REPORT_KIND_ROADMAP, REPORT_KIND_ROADMAP_EN}:
        _sync_prebuilt_publication(obj, db)
        db.refresh(obj)
    return _to_publication_out(obj)

@router.get("/publications/{pub_id}", response_model=PublicationOut, tags=["Publications"])
def get_publication(pub_id:int, db:Session=Depends(get_db)):
    return _to_publication_out(_get_or_404(db, Publication, "publication_id", pub_id))

@router.patch("/publications/{pub_id}", response_model=PublicationOut, tags=["Publications"])
def update_publication(pub_id:int, body:PublicationUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Publication, "publication_id", pub_id)
    comm = _get_or_404(db, Communication, "communication_id", obj.communication_id)
    data = body.model_dump(exclude_unset=True)
    for k,v in data.items(): setattr(obj,k,v)
    if "planned_publication_date" in data and "due_at" not in data and obj.planned_publication_date:
        obj.due_at = datetime.combine(obj.planned_publication_date, datetime.min.time())
    obj.updated_at=datetime.utcnow()
    _ensure_publication_followup(obj, comm, db)
    db.commit(); db.refresh(obj); return _to_publication_out(obj)

@router.delete("/publications/{pub_id}", status_code=204, tags=["Publications"])
def delete_publication(pub_id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Publication, "publication_id", pub_id); db.delete(obj); db.commit()

@router.post("/publications/{pub_id}/sync-report", response_model=PublicationOut, tags=["Publications"])
def sync_publication_report(pub_id:int, db:Session=Depends(get_db)):
    pub = _get_or_404(db, Publication, "publication_id", pub_id)
    _sync_prebuilt_publication(pub, db)
    db.refresh(pub)
    return _to_publication_out(pub)

class PublicationExportOut(BaseModel):
    publication_id: int
    format: str
    file_name: str
    mime_type: str
    content: Any

@router.get("/publications/{pub_id}/export/{export_format}", response_model=PublicationExportOut, tags=["Reports"])
def export_publication(pub_id:int, export_format:str, db:Session=Depends(get_db)):
    pub = _get_or_404(db, Publication, "publication_id", pub_id)
    comm = _get_or_404(db, Communication, "communication_id", pub.communication_id)
    export_format = export_format.upper()
    supported = _normalize_export_formats(comm.supported_export_formats)
    if export_format not in supported:
        raise HTTPException(400, f"Export format {export_format} not enabled for this communication")
    if comm.report_kind == REPORT_KIND_ROADMAP or comm.report_kind == REPORT_KIND_ROADMAP_EN:
        data = pub.export_payload or _resolve_roadmap_scope(comm, db)
        if export_format == "HTML" and not pub.rendered_html:
            pub.rendered_html = _render_roadmap_html(pub, comm, data)
            db.commit(); db.refresh(pub)
    elif comm.report_kind == REPORT_KIND_RISK_MATRIX:
        data = pub.export_payload or _resolve_risk_scope(comm, db)
        if export_format == "HTML" and not pub.rendered_html:
            pub.rendered_html = _render_risk_matrix_html(pub, comm, data)
            db.commit(); db.refresh(pub)
    elif comm.report_kind == REPORT_KIND_RISK_MAPPING:
        data = pub.export_payload or _resolve_risk_scope(comm, db)
        if export_format == "HTML" and not pub.rendered_html:
            pub.rendered_html = _render_risk_mapping_html(pub, comm, data)
            db.commit(); db.refresh(pub)
    else:
        raise HTTPException(400, "Automatic export is currently available only for prebuilt reports")

    return PublicationExportOut(publication_id=pub_id, **{
        "format": export_format,
        "file_name": f"publication-{pub.publication_id}.{ 'html' if export_format=='HTML' else 'json' }",
        "mime_type": "text/html" if export_format == "HTML" else "application/json",
        "content": pub.rendered_html if export_format == "HTML" else {
            "document_title": pub.title,
            "format": export_format,
            "data": data,
        }
    })

class PubAudienceAdd(BaseModel):
    audience_id: int; is_primary: bool=False
    custom_language: Optional[str]=None; custom_tone: Optional[str]=None; custom_detail_level: Optional[str]=None

class PubAudienceOut(BaseModel):
    publication_audience_id: int; publication_id: int; audience_id: int
    is_primary: bool; custom_language: Optional[str]; custom_tone: Optional[str]; custom_detail_level: Optional[str]
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/audiences", response_model=List[PubAudienceOut], tags=["Publication Audiences"])
def list_publication_audiences(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(PublicationAudience).where(PublicationAudience.publication_id==pub_id)).all()

@router.post("/publications/{pub_id}/audiences", response_model=PubAudienceOut, status_code=201, tags=["Publication Audiences"])
def add_publication_audience(pub_id:int, body:PubAudienceAdd, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    _get_or_404(db, Audience, "audience_id", body.audience_id)
    obj=PublicationAudience(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.delete("/publications/{pub_id}/audiences/{audience_id}", status_code=204, tags=["Publication Audiences"])
def remove_publication_audience(pub_id:int, audience_id:int, db:Session=Depends(get_db)):
    obj=db.scalars(select(PublicationAudience).where(PublicationAudience.publication_id==pub_id, PublicationAudience.audience_id==audience_id)).first()
    if not obj: raise HTTPException(404, "PublicationAudience not found")
    db.delete(obj); db.commit()

class CommunicationAudienceAdd(BaseModel):
    audience_id: int
    is_primary: bool = False
    custom_language: Optional[str] = None
    custom_tone: Optional[str] = None
    custom_detail_level: Optional[str] = None

class CommunicationAudienceOut(BaseModel):
    communication_audience_id: int
    communication_id: int
    audience_id: int
    is_primary: bool
    custom_language: Optional[str]
    custom_tone: Optional[str]
    custom_detail_level: Optional[str]
    created_at: datetime
    audience_name: Optional[str] = None
    audience_type: Optional[str] = None
    class Config: from_attributes = True

def _to_communication_audience_out(obj: CommunicationAudience, db: Session) -> CommunicationAudienceOut:
    audience = db.get(Audience, obj.audience_id)
    return CommunicationAudienceOut(
        communication_audience_id=obj.communication_audience_id,
        communication_id=obj.communication_id,
        audience_id=obj.audience_id,
        is_primary=obj.is_primary,
        custom_language=obj.custom_language,
        custom_tone=obj.custom_tone,
        custom_detail_level=obj.custom_detail_level,
        created_at=obj.created_at,
        audience_name=audience.name if audience else None,
        audience_type=audience.audience_type if audience else None,
    )

def _ensure_communication_audience_primary(db: Session, communication_id: int, is_primary: bool, current_id: Optional[int] = None):
    if not is_primary:
        return
    rows = db.scalars(
        select(CommunicationAudience).where(
            CommunicationAudience.communication_id == communication_id,
            CommunicationAudience.is_primary == True,
        )
    ).all()
    for row in rows:
        if current_id and row.communication_audience_id == current_id:
            continue
        row.is_primary = False

@router.get("/{comm_id}/audiences", response_model=List[CommunicationAudienceOut], tags=["Communication Audiences"])
def list_communication_audiences(comm_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    rows = db.scalars(
        select(CommunicationAudience)
        .where(CommunicationAudience.communication_id == comm_id)
        .order_by(CommunicationAudience.is_primary.desc(), CommunicationAudience.communication_audience_id.desc())
    ).all()
    return [_to_communication_audience_out(row, db) for row in rows]

@router.post("/{comm_id}/audiences", response_model=CommunicationAudienceOut, status_code=201, tags=["Communication Audiences"])
def add_communication_audience(comm_id: int, body: CommunicationAudienceAdd, db: Session = Depends(get_db)):
    _get_or_404(db, Communication, "communication_id", comm_id)
    _get_or_404(db, Audience, "audience_id", body.audience_id)

    existing = db.scalars(
        select(CommunicationAudience).where(
            CommunicationAudience.communication_id == comm_id,
            CommunicationAudience.audience_id == body.audience_id,
        )
    ).first()
    if existing:
        raise HTTPException(400, "Audience already linked to this communication")

    _ensure_communication_audience_primary(db, comm_id, body.is_primary)

    obj = CommunicationAudience(
        communication_id=comm_id,
        audience_id=body.audience_id,
        is_primary=body.is_primary,
        custom_language=body.custom_language,
        custom_tone=body.custom_tone,
        custom_detail_level=body.custom_detail_level,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _to_communication_audience_out(obj, db)

@router.delete("/{comm_id}/audiences/{audience_id}", status_code=204, tags=["Communication Audiences"])
def remove_communication_audience(comm_id: int, audience_id: int, db: Session = Depends(get_db)):
    obj = db.scalars(
        select(CommunicationAudience).where(
            CommunicationAudience.communication_id == comm_id,
            CommunicationAudience.audience_id == audience_id,
        )
    ).first()
    if not obj:
        raise HTTPException(404, "CommunicationAudience not found")
    db.delete(obj)
    db.commit()

class SectionCreate(BaseModel):
    section_key: str; title: str; subtitle: Optional[str]=None
    current_content: Optional[str]=None; display_order: int=0; template_section_id: Optional[int]=None

class SectionUpdate(BaseModel):
    title: Optional[str]=None; subtitle: Optional[str]=None
    current_content: Optional[str]=None; display_order: Optional[int]=None; status: Optional[str]=None

class SectionOut(BaseModel):
    section_id: int; publication_id: int; template_section_id: Optional[int]
    section_key: str; title: str; subtitle: Optional[str]; current_content: Optional[str]
    display_order: int; status: str; is_ai_generated: bool; created_at: datetime; updated_at: datetime
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/sections", response_model=List[SectionOut], tags=["Sections"])
def list_sections(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(Section).where(Section.publication_id==pub_id).order_by(Section.display_order)).all()

@router.post("/publications/{pub_id}/sections", response_model=SectionOut, status_code=201, tags=["Sections"])
def create_section(pub_id:int, body:SectionCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    obj=Section(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/sections/{section_id}", response_model=SectionOut, tags=["Sections"])
def update_section(section_id:int, body:SectionUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Section, "section_id", section_id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

@router.delete("/sections/{section_id}", status_code=204, tags=["Sections"])
def delete_section(section_id:int, db:Session=Depends(get_db)):
    obj=_get_or_404(db, Section, "section_id", section_id); db.delete(obj); db.commit()

class GenerateRequest(BaseModel):
    extra_context: Optional[str]=None
    requested_by: Optional[int]=None

class AgentExecOut(BaseModel):
    agent_execution_id: int; section_id: int; provider: Optional[str]; model_name: Optional[str]
    status: str; generated_content: Optional[str]; input_tokens: Optional[int]
    output_tokens: Optional[int]; total_tokens: Optional[int]; estimated_cost: Optional[float]
    execution_time_ms: Optional[int]; error_message: Optional[str]
    created_at: datetime; started_at: Optional[datetime]; completed_at: Optional[datetime]
    class Config: from_attributes=True; protected_namespaces=()

def _build_context(db:Session, section:Section) -> tuple[str,str,str]:
    pub = db.get(Publication, section.publication_id)
    comm = db.get(Communication, pub.communication_id)
    comm_type = db.get(CommunicationType, comm.communication_type_id)
    template = db.get(CommunicationTemplate, comm.communication_template_id) if comm.communication_template_id else None
    tpl_section = db.get(TemplateSection, section.template_section_id) if section.template_section_id else None
    general_prompt = (template.general_prompt if template else None) or "You are a product communication assistant. Use only the provided information."
    section_prompt = (tpl_section.generation_prompt if tpl_section else None) or f"Generate content for section '{section.title}'."
    ctx_parts = [f"COMMUNICATION TYPE: {comm_type.name if comm_type else 'N/A'}", f"COMMUNICATION: {comm.name}", f"OBJECTIVE: {comm.objective}", f"PUBLICATION: {pub.title}"]
    if comm.report_kind and comm.report_scope:
        ctx_parts.append("REPORT SCOPE:")
        ctx_parts.append(json.dumps(_json_safe(comm.report_scope), ensure_ascii=False, indent=2))
    if pub.export_payload:
        ctx_parts.append("STRUCTURED PUBLICATION DATA:")
        ctx_parts.append(json.dumps(_json_safe(pub.export_payload), ensure_ascii=False, indent=2))
    assembled = "\n".join(ctx_parts)
    return general_prompt, section_prompt, assembled

@router.post("/sections/{section_id}/generate", response_model=AgentExecOut, tags=["AI Generation"])
def generate_section(section_id:int, body:GenerateRequest, db:Session=Depends(get_db)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(400, "OPENAI_API_KEY not configured")
    section = _get_or_404(db, Section, "section_id", section_id)
    general_prompt, section_prompt, assembled_context = _build_context(db, section)
    if body.extra_context:
        assembled_context += f"\n\nEXTRA CONTEXT:\n{body.extra_context}"
    execution = AgentExecution(section_id=section_id, provider="openai", model_name=settings.OPENAI_MODEL, general_prompt=general_prompt, section_prompt=section_prompt, assembled_context=assembled_context, status="RUNNING", requested_by=body.requested_by, started_at=datetime.utcnow())
    db.add(execution); db.commit(); db.refresh(execution)
    section.status = "GENERATING"; section.updated_at = datetime.utcnow(); db.commit()
    t0 = time.time()
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(model=settings.OPENAI_MODEL, messages=[{"role":"system","content": general_prompt}, {"role":"user","content": f"{assembled_context}\n\nSECTION INSTRUCTIONS:\n{section_prompt}"}], temperature=0.7)
        elapsed_ms = int((time.time()-t0)*1000)
        content = response.choices[0].message.content or ""
        usage = response.usage
        cost = round((usage.prompt_tokens*0.00000015)+(usage.completion_tokens*0.0000006), 8) if usage else None
        execution.status="COMPLETED"; execution.generated_content=content
        execution.input_tokens=usage.prompt_tokens if usage else None
        execution.output_tokens=usage.completion_tokens if usage else None
        execution.total_tokens=usage.total_tokens if usage else None
        execution.estimated_cost=cost; execution.currency="USD"; execution.execution_time_ms=elapsed_ms; execution.completed_at=datetime.utcnow()
        db.commit()
        section.current_content=content; section.status="GENERATED"; section.is_ai_generated=True; section.updated_at=datetime.utcnow()
        db.commit(); db.refresh(execution); return execution
    except Exception as e:
        execution.status="FAILED"; execution.error_message=str(e); execution.completed_at=datetime.utcnow(); db.commit()
        section.status="DRAFT"; section.updated_at=datetime.utcnow(); db.commit()
        raise HTTPException(500, f"OpenAI error: {e}")

@router.get("/sections/{section_id}/executions", response_model=List[AgentExecOut], tags=["AI Generation"])
def list_section_executions(section_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Section, "section_id", section_id)
    return db.scalars(select(AgentExecution).where(AgentExecution.section_id==section_id).order_by(AgentExecution.created_at.desc())).all()

class ReviewCreate(BaseModel):
    action: str; comments: Optional[str]=None; performed_by: Optional[int]=None

class ReviewOut(BaseModel):
    publication_review_id: int; publication_id: int; action: str
    comments: Optional[str]; performed_by: Optional[int]; performed_at: datetime
    class Config: from_attributes=True

STATUS_MAP = {"SUBMITTED_FOR_REVIEW":"IN_REVIEW","APPROVED":"APPROVED","REJECTED":"DRAFT","PUBLISHED":"PUBLISHED","ARCHIVED":"ARCHIVED"}

@router.get("/publications/{pub_id}/reviews", response_model=List[ReviewOut], tags=["Reviews"])
def list_reviews(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(PublicationReview).where(PublicationReview.publication_id==pub_id).order_by(PublicationReview.performed_at.desc())).all()

@router.post("/publications/{pub_id}/reviews", response_model=ReviewOut, status_code=201, tags=["Reviews"])
def create_review(pub_id:int, body:ReviewCreate, db:Session=Depends(get_db)):
    pub=_get_or_404(db, Publication, "publication_id", pub_id)
    if body.action in STATUS_MAP:
        pub.status=STATUS_MAP[body.action]
        if body.action=="PUBLISHED": pub.published_at=datetime.utcnow()
        pub.updated_at=datetime.utcnow()
    review=PublicationReview(publication_id=pub_id, action=body.action, comments=body.comments, performed_by=body.performed_by)
    db.add(review); db.commit(); db.refresh(review); return review

class VersionOut(BaseModel):
    publication_version_id: int; publication_id: int; version_number: int
    version_label: Optional[str]; change_reason: Optional[str]
    publication_snapshot: dict; created_by: Optional[int]; created_at: datetime
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/versions", response_model=List[VersionOut], tags=["Versions"])
def list_versions(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(PublicationVersion).where(PublicationVersion.publication_id==pub_id).order_by(PublicationVersion.version_number.desc())).all()

@router.post("/publications/{pub_id}/versions", response_model=VersionOut, status_code=201, tags=["Versions"])
def create_version(pub_id:int, change_reason:Optional[str]=None, created_by:Optional[int]=None, db:Session=Depends(get_db)):
    pub=_get_or_404(db, Publication, "publication_id", pub_id)
    sections=db.scalars(select(Section).where(Section.publication_id==pub_id)).all()
    snapshot={"title":pub.title,"subtitle":pub.subtitle,"status":pub.status,"reference_label":pub.reference_label,"editorial_summary":pub.editorial_summary,"rendered_html":pub.rendered_html,"export_payload":_json_safe(pub.export_payload),"sections":[{"section_key":s.section_key,"title":s.title,"content":s.current_content,"status":s.status} for s in sections]}
    last=db.scalar(select(func.max(PublicationVersion.version_number)).where(PublicationVersion.publication_id==pub_id)) or 0
    version=PublicationVersion(publication_id=pub_id, version_number=last+1, version_label=f"v{last+1}", change_reason=change_reason, publication_snapshot=snapshot, created_by=created_by)
    db.add(version); db.commit(); db.refresh(version); return version

class PresentationCreate(BaseModel):
    publication_version_id: Optional[int]=None
    meeting_id: Optional[str]=None
    presentation_date: date
    presented_at: Optional[datetime]=None
    presented_by: Optional[int]=None
    context_label: Optional[str]=None
    audience_label: Optional[str]=None
    notes: Optional[str]=None
    presentation_mode: str="LIVE"
    status: str="COMPLETED"

class PresentationUpdate(BaseModel):
    publication_version_id: Optional[int]=None
    meeting_id: Optional[str]=None
    presentation_date: Optional[date]=None
    presented_at: Optional[datetime]=None
    presented_by: Optional[int]=None
    context_label: Optional[str]=None
    audience_label: Optional[str]=None
    notes: Optional[str]=None
    presentation_mode: Optional[str]=None
    status: Optional[str]=None

class PresentationOut(BaseModel):
    presentation_id: int
    publication_id: int
    publication_version_id: Optional[int]
    meeting_id: Optional[str]
    presentation_date: date
    presented_at: Optional[datetime]
    presented_by: Optional[int]
    context_label: Optional[str]
    audience_label: Optional[str]
    notes: Optional[str]
    presentation_mode: str
    status: str
    created_at: datetime
    updated_at: datetime
    version_label: Optional[str] = None
    version_number: Optional[int] = None
    class Config: from_attributes=True

def _to_presentation_out(obj: PublicationPresentation, db: Session) -> PresentationOut:
    version = db.get(PublicationVersion, obj.publication_version_id) if obj.publication_version_id else None
    return PresentationOut(
        presentation_id=obj.presentation_id,
        publication_id=obj.publication_id,
        publication_version_id=obj.publication_version_id,
        meeting_id=obj.meeting_id,
        presentation_date=obj.presentation_date,
        presented_at=obj.presented_at,
        presented_by=obj.presented_by,
        context_label=obj.context_label,
        audience_label=obj.audience_label,
        notes=obj.notes,
        presentation_mode=obj.presentation_mode,
        status=obj.status,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
        version_label=version.version_label if version else None,
        version_number=version.version_number if version else None,
    )

@router.get("/publications/{pub_id}/presentations", response_model=List[PresentationOut], tags=["Presentations"])
def list_presentations(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    items = db.scalars(
        select(PublicationPresentation)
        .where(PublicationPresentation.publication_id==pub_id)
        .order_by(PublicationPresentation.presentation_date.desc(), PublicationPresentation.presented_at.desc(), PublicationPresentation.presentation_id.desc())
    ).all()
    return [_to_presentation_out(item, db) for item in items]

@router.post("/publications/{pub_id}/presentations", response_model=PresentationOut, status_code=201, tags=["Presentations"])
def create_presentation(pub_id:int, body:PresentationCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    if body.publication_version_id:
        version = _get_or_404(db, PublicationVersion, "publication_version_id", body.publication_version_id)
        if version.publication_id != pub_id:
            raise HTTPException(400, "Publication version does not belong to this publication")
    obj = PublicationPresentation(publication_id=pub_id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return _to_presentation_out(obj, db)

@router.patch("/presentations/{presentation_id}", response_model=PresentationOut, tags=["Presentations"])
def update_presentation(presentation_id:int, body:PresentationUpdate, db:Session=Depends(get_db)):
    obj = _get_or_404(db, PublicationPresentation, "presentation_id", presentation_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("publication_version_id"):
        version = _get_or_404(db, PublicationVersion, "publication_version_id", data["publication_version_id"])
        if version.publication_id != obj.publication_id:
            raise HTTPException(400, "Publication version does not belong to this publication")
    for k,v in data.items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj)
    return _to_presentation_out(obj, db)

@router.delete("/presentations/{presentation_id}", status_code=204, tags=["Presentations"])
def delete_presentation(presentation_id:int, db:Session=Depends(get_db)):
    obj = _get_or_404(db, PublicationPresentation, "presentation_id", presentation_id)
    db.delete(obj); db.commit()

class ChannelCreate(BaseModel):
    name: str; description: Optional[str]=None; channel_type: str="FILE"

class ChannelUpdate(BaseModel):
    name: Optional[str]=None; description: Optional[str]=None
    channel_type: Optional[str]=None; is_active: Optional[bool]=None

class ChannelOut(BaseModel):
    delivery_channel_id: int; name: str; description: Optional[str]
    channel_type: str; is_active: bool; created_at: datetime
    class Config: from_attributes=True

@router.get("/delivery-channels", response_model=List[ChannelOut], tags=["Delivery"])
def list_channels(only_active:bool=True, db:Session=Depends(get_db)):
    q=select(DeliveryChannel)
    if only_active: q=q.where(DeliveryChannel.is_active==True)
    return db.scalars(q.order_by(DeliveryChannel.name)).all()

@router.post("/delivery-channels", response_model=ChannelOut, status_code=201, tags=["Delivery"])
def create_channel(body:ChannelCreate, db:Session=Depends(get_db)):
    obj=DeliveryChannel(**body.model_dump()); db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/delivery-channels/{id}", response_model=ChannelOut, tags=["Delivery"])
def update_channel(id:int, body:ChannelUpdate, db:Session=Depends(get_db)):
    obj=_get_or_404(db, DeliveryChannel, "delivery_channel_id", id)
    for k,v in body.model_dump(exclude_unset=True).items(): setattr(obj,k,v)
    obj.updated_at=datetime.utcnow(); db.commit(); db.refresh(obj); return obj

class DeliveryCreate(BaseModel):
    delivery_channel_id: int; destination: Optional[str]=None; scheduled_at: Optional[datetime]=None

class DeliveryOut(BaseModel):
    publication_delivery_id: int; publication_id: int; delivery_channel_id: int
    status: str; destination: Optional[str]; artifact_uri: Optional[str]
    scheduled_at: Optional[datetime]; delivered_at: Optional[datetime]
    error_message: Optional[str]; created_at: datetime
    class Config: from_attributes=True

@router.get("/publications/{pub_id}/deliveries", response_model=List[DeliveryOut], tags=["Delivery"])
def list_deliveries(pub_id:int, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    return db.scalars(select(PublicationDelivery).where(PublicationDelivery.publication_id==pub_id)).all()

@router.post("/publications/{pub_id}/deliveries", response_model=DeliveryOut, status_code=201, tags=["Delivery"])
def create_delivery(pub_id:int, body:DeliveryCreate, db:Session=Depends(get_db)):
    _get_or_404(db, Publication, "publication_id", pub_id)
    _get_or_404(db, DeliveryChannel, "delivery_channel_id", body.delivery_channel_id)
    obj=PublicationDelivery(**body.model_dump(), publication_id=pub_id)
    db.add(obj); db.commit(); db.refresh(obj); return obj

@router.patch("/deliveries/{id}", response_model=DeliveryOut, tags=["Delivery"])
def update_delivery(id:int, status:str, db:Session=Depends(get_db)):
    obj=_get_or_404(db, PublicationDelivery, "publication_delivery_id", id)
    obj.status=status
    if status=="DELIVERED": obj.delivered_at=datetime.utcnow()
    db.commit(); db.refresh(obj); return obj
