from typing import Optional, List
from io import BytesIO
from fastapi import APIRouter, Depends, status
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse
from sqlalchemy import cast, or_, String
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.attachment import Attachment
from app.models.backlog import BacklogItem, BacklogItemType, BacklogItemSuggestion, BacklogItemNote, BacklogItemLink, Sprint
from app.models.knowledge import KnowledgeArticle, KnowledgeReference
from app.models.stakeholder import Stakeholder
from app.models.team_member import TeamMember
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from html import escape, unescape
from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
import re

# ── Schemas ───────────────────────────────────────────────────────────────────

def calc_wsjf(bv: int, tc: int, rr: int, js: int) -> float:
    """WSJF = CoD / Job Size  (1 decimal place). CoD = BV + TC + RR."""
    cost_of_delay = bv + tc + rr
    if js <= 0:
        return 0.0
    return round(cost_of_delay / js, 1)

class BacklogItemCreate(BaseModel):
    product_id:                  Optional[int]  = None
    feature_id:                  Optional[int]  = None
    sprint_id:                   Optional[int]  = None
    start_sprint_id:             Optional[int]  = None
    end_sprint_id:               Optional[int]  = None
    requester_stakeholder_id:    Optional[int]  = None
    assigned_to_member_id:       Optional[int]  = None
    management_owner_member_id:  Optional[int]  = None
    discovery_opportunity_id:    Optional[str]  = None
    ado_id:                      Optional[str]  = None
    ado_work_item_type:          Optional[str]  = None
    enabler_type:                Optional[str]  = None
    item_type_id:                Optional[int]  = None
    title:                       str
    description:                 Optional[str]  = None
    current_status:              str            = "open"
    business_value:              Optional[str]  = None
    acceptance_criteria:         Optional[str]  = None
    definition_of_done:          Optional[str]  = None
    business_rules:              Optional[str]  = None
    story_points:                Optional[int]  = None
    priority:                    int            = 3
    wsjf_business_value:         int            = 0
    wsjf_time_criticality:       int            = 0
    wsjf_risk_reduction:         int            = 0
    wsjf_job_size:               int            = 0

class BacklogItemUpdate(BaseModel):
    feature_id:                  Optional[int]  = None
    sprint_id:                   Optional[int]  = None
    start_sprint_id:             Optional[int]  = None
    end_sprint_id:               Optional[int]  = None
    requester_stakeholder_id:    Optional[int]  = None
    assigned_to_member_id:       Optional[int]  = None
    management_owner_member_id:  Optional[int]  = None
    discovery_opportunity_id:    Optional[str]  = None
    ado_id:                      Optional[str]  = None
    ado_work_item_type:          Optional[str]  = None
    enabler_type:                Optional[str]  = None
    item_type_id:                Optional[int]  = None
    title:                       Optional[str]  = None
    description:                 Optional[str]  = None
    current_status:              Optional[str]  = None
    business_value:              Optional[str]  = None
    acceptance_criteria:         Optional[str]  = None
    definition_of_done:          Optional[str]  = None
    business_rules:              Optional[str]  = None
    story_points:                Optional[int]  = None
    priority:                    Optional[int]  = None
    completed_at:                Optional[datetime] = None
    wsjf_business_value:         Optional[int]  = None
    wsjf_time_criticality:       Optional[int]  = None
    wsjf_risk_reduction:         Optional[int]  = None
    wsjf_job_size:               Optional[int]  = None

class BacklogItemOut(BaseModel):
    item_id:                         int
    product_id:                      Optional[int]  = None
    feature_id:                      Optional[int]  = None
    sprint_id:                       Optional[int]  = None
    start_sprint_id:                 Optional[int]  = None
    end_sprint_id:                   Optional[int]  = None
    requester_stakeholder_id:        Optional[int]  = None
    assigned_to_member_id:           Optional[int]  = None
    management_owner_member_id:      Optional[int]  = None
    discovery_opportunity_id:        Optional[str]  = None
    discovery_opportunity_title:     Optional[str]  = None
    ado_id:                          Optional[str]  = None
    ado_work_item_type:              Optional[str]  = None
    enabler_type:                    Optional[str]  = None
    item_type_id:                    Optional[int]  = None
    item_type_name:                  Optional[str]  = None
    title:                           str
    description:                     Optional[str]  = None
    current_status:                  str
    business_value:                  Optional[str]  = None
    acceptance_criteria:             Optional[str]  = None
    definition_of_done:              Optional[str]  = None
    business_rules:                  Optional[str]  = None
    story_points:                    Optional[int]  = None
    priority:                        int            = 3
    wsjf_business_value:             int            = 0
    wsjf_time_criticality:           int            = 0
    wsjf_risk_reduction:             int            = 0
    wsjf_job_size:                   int            = 0
    wsjf_score:                      float          = 0.0
    created_at:                      datetime
    updated_at:                      datetime
    completed_at:                    Optional[datetime] = None
    class Config: from_attributes = True

class ItemTypeOut(BaseModel):
    item_type_id:  int
    name:          str
    description:   Optional[str] = None
    display_order: int           = 0
    is_active:     bool          = True
    class Config: from_attributes = True

class SprintCreate(BaseModel):
    product_id: int
    name:       str
    goal:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    status:     str            = "planned"
    capacity:   Optional[int]  = None
    velocity:   Optional[int]  = None

class SprintUpdate(BaseModel):
    name:       Optional[str]  = None
    goal:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    status:     Optional[str]  = None
    capacity:   Optional[int]  = None
    velocity:   Optional[int]  = None

class SprintOut(BaseModel):
    sprint_id:  int
    product_id: int
    name:       str
    goal:       Optional[str]  = None
    start_date: Optional[date] = None
    end_date:   Optional[date] = None
    status:     str            = "planned"
    capacity:   Optional[int]  = None
    velocity:   Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

class SuggestionCreate(BaseModel):
    vpc_id:              Optional[int]  = None
    feature_id:          Optional[int]  = None
    suggested_type:      Optional[str]  = None
    title:               str
    description:         Optional[str]  = None
    rationale:           Optional[str]  = None
    acceptance_criteria: Optional[str]  = None

class SuggestionUpdate(BaseModel):
    status:      Optional[str]  = None
    reviewed_by: Optional[str]  = None
    reviewed_at: Optional[datetime] = None

class SuggestionOut(BaseModel):
    suggestion_id:       int
    vpc_id:              Optional[int]  = None
    feature_id:          Optional[int]  = None
    suggested_type:      Optional[str]  = None
    title:               str
    description:         Optional[str]  = None
    rationale:           Optional[str]  = None
    acceptance_criteria: Optional[str]  = None
    status:              str            = "pending"
    reviewed_by:         Optional[str]  = None
    reviewed_at:         Optional[datetime] = None
    created_at:          datetime
    class Config: from_attributes = True

# ── Helpers ───────────────────────────────────────────────────────────────────

APP_UTC_OFFSET_HOURS = -3

def _now_local() -> datetime:
    return datetime.utcnow() + timedelta(hours=APP_UTC_OFFSET_HOURS)

def _item_to_out(item: BacklogItem, db: Session) -> BacklogItemOut:
    out = BacklogItemOut.model_validate(item)
    if item.discovery_opportunity_id:
        try:
            from app.models.discovery import DiscoveryOpportunity
            opp = db.get(DiscoveryOpportunity, item.discovery_opportunity_id)
            if opp:
                out.discovery_opportunity_title = opp.title
        except Exception:
            pass
    if item.item_type_id:
        item_type = db.get(BacklogItemType, item.item_type_id)
        if item_type:
            out.item_type_name = item_type.name
    return out

def _list_links_for_export(item_id: int, db: Session) -> List[LinkOut]:
    result = []
    outgoing = db.query(BacklogItemLink).filter(BacklogItemLink.source_id == item_id).order_by(BacklogItemLink.created_at).all()
    for lnk in outgoing:
        out = LinkOut.model_validate(lnk)
        target = db.get(BacklogItem, lnk.target_id)
        out.target_title = target.title if target else f"Item #{lnk.target_id}"
        result.append(out)
    incoming = db.query(BacklogItemLink).filter(BacklogItemLink.target_id == item_id).order_by(BacklogItemLink.created_at).all()
    for lnk in incoming:
        out = LinkOut(
            link_id=lnk.link_id,
            source_id=lnk.target_id,
            target_id=lnk.source_id,
            link_type=INVERSE_TYPES.get(lnk.link_type, lnk.link_type),
            created_at=lnk.created_at,
        )
        source = db.get(BacklogItem, lnk.source_id)
        out.target_title = source.title if source else f"Item #{lnk.source_id}"
        result.append(out)
    return result

def _list_notes_for_export(item_id: int, db: Session) -> List[NoteOut]:
    notes = db.query(BacklogItemNote)\
              .filter(BacklogItemNote.item_id == item_id)\
              .order_by(BacklogItemNote.created_at.desc()).all()
    return [NoteOut.model_validate(n) for n in notes]

def _list_knowledge_for_export(item: BacklogItem, db: Session) -> List[ExportKnowledgeArticleOut]:
    ref_keys = []
    if item.item_id:
        ref_keys.append(("BACKLOG_ITEM", item.item_id))
    if item.product_id:
        ref_keys.append(("PRODUCT", item.product_id))
    if item.sprint_id:
        ref_keys.append(("SPRINT", item.sprint_id))
    if item.feature_id:
        ref_keys.append(("FEATURE", item.feature_id))

    refs = []
    seen_ref = set()
    for ref_type, ref_id in ref_keys:
        rows = db.query(KnowledgeReference).filter(
            KnowledgeReference.reference_type == ref_type,
            KnowledgeReference.reference_id_ext == ref_id
        ).all()
        for row in rows:
            key = (row.article_id, row.reference_type, row.reference_id_ext)
            if key not in seen_ref:
                seen_ref.add(key)
                refs.append(row)

    articles = []
    seen_article = set()
    for ref in refs:
        article = db.get(KnowledgeArticle, ref.article_id)
        if not article or article.article_id in seen_article:
            continue
        seen_article.add(article.article_id)
        articles.append(ExportKnowledgeArticleOut(
            article_id=article.article_id,
            title=article.title,
            category=article.category,
            status=article.status,
            created_by=article.created_by,
            updated_at=article.updated_at,
            content=article.content,
            reference_type=ref.reference_type,
            reference_id_ext=ref.reference_id_ext,
        ))
    return sorted(articles, key=lambda x: (x.reference_type or "", x.title.lower()))

def _list_attachments_for_export(item_id: int, db: Session) -> List[ExportAttachmentOut]:
    rows = db.query(Attachment)\
             .filter(Attachment.entity_type == "backlog_item", Attachment.entity_id == str(item_id))\
             .order_by(Attachment.created_at.desc()).all()
    return [ExportAttachmentOut.model_validate(row) for row in rows]

def _build_export(item_id: int, db: Session) -> BacklogExportOut:
    item = BaseRepository(BacklogItem, db).get_or_404(item_id)
    context = ExportContextOut()
    if item.requester_stakeholder_id:
        requester = db.get(Stakeholder, item.requester_stakeholder_id)
        if requester:
            context.requester_name = requester.full_name
    if item.assigned_to_member_id:
        assigned = db.get(TeamMember, item.assigned_to_member_id)
        if assigned:
            context.assigned_to_name = assigned.full_name
    if item.sprint_id:
        sprint = db.get(Sprint, item.sprint_id)
        if sprint:
            context.sprint_name = sprint.name
    if item.start_sprint_id:
        sprint = db.get(Sprint, item.start_sprint_id)
        if sprint:
            context.start_sprint_name = sprint.name
    if item.end_sprint_id:
        sprint = db.get(Sprint, item.end_sprint_id)
        if sprint:
            context.end_sprint_name = sprint.name

    return BacklogExportOut(
        generated_at=datetime.utcnow(),
        item=_item_to_out(item, db),
        context=context,
        links=_list_links_for_export(item_id, db),
        notes=_list_notes_for_export(item_id, db),
        knowledge=_list_knowledge_for_export(item, db),
        attachments=_list_attachments_for_export(item_id, db),
    )

def _clean_export_text(value: Optional[str]) -> str:
    text = (value or "").strip()
    if not text:
        return ""

    text = unescape(text)
    text = text.replace("\u00a0", " ")

    block_tags = r"(div|p|li|ul|ol|h[1-6]|section|article|tr|table)"
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(rf"(?i)</?{block_tags}[^>]*>", "\n", text)
    text = re.sub(r"(?i)</?(td|th)[^>]*>", " ", text)

    text = re.sub(r"(?i)<\s*(strong|b)[^>]*>", "", text)
    text = re.sub(r"(?i)</\s*(strong|b)\s*>", "", text)
    text = re.sub(r"(?i)<\s*(em|i)[^>]*>", "", text)
    text = re.sub(r"(?i)</\s*(em|i)\s*>", "", text)
    text = re.sub(r"(?i)<[^>]+>", "", text)

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    cleaned_lines = [line.strip() for line in text.splitlines()]
    return "\n".join(cleaned_lines).strip()

def _multiline_md(value: Optional[str]) -> str:
    text = _clean_export_text(value)
    return text if text else "_N/A_"

def _render_markdown(export_data: BacklogExportOut) -> str:
    item = export_data.item
    context = export_data.context
    lines = [
        f"# {item.title}",
        "",
        "## Summary",
        f"- **Item ID:** {item.item_id}",
        f"- **Type:** {item.item_type_name or '—'}",
        f"- **Status:** {item.current_status}",
        f"- **Priority:** {item.priority}",
        f"- **Story Points:** {item.story_points if item.story_points is not None else '—'}",
        f"- **WSJF:** {item.wsjf_score}",
        f"- **Sprint:** {context.sprint_name or '—'}",
        f"- **Start Sprint:** {context.start_sprint_name or '—'}",
        f"- **End Sprint:** {context.end_sprint_name or '—'}",
        f"- **Requester:** {context.requester_name or '—'}",
        f"- **Assigned To:** {context.assigned_to_name or '—'}",
        f"- **ADO:** {item.ado_id or '—'}",
        f"- **ADO Work Item Type:** {item.ado_work_item_type or '—'}",
        f"- **Enabler Type:** {item.enabler_type or '—'}",
        "",
        "## Description",
        _multiline_md(item.description),
        "",
        "## Business Value",
        _multiline_md(item.business_value),
        "",
        "## Acceptance Criteria",
        _multiline_md(item.acceptance_criteria),
        "",
        "## Definition of Done",
        _multiline_md(item.definition_of_done),
        "",
        "## Business Rules",
        _multiline_md(item.business_rules),
        "",
        "## Links",
    ]
    if export_data.links:
        for link in export_data.links:
            lines.append(f"- **{link.link_type}** → {link.target_title or f'Item #{link.target_id}'}")
    else:
        lines.append("_No links_")
    lines.extend(["", "## Notes"])
    if export_data.notes:
        for note in export_data.notes:
            lines.append(f"- **{note.author}** ({note.created_at.strftime('%Y-%m-%d %H:%M')}): {note.content}")
    else:
        lines.append("_No notes_")
    lines.extend(["", "## Knowledge Base"])
    if export_data.knowledge:
        for article in export_data.knowledge:
            lines.extend([
                f"### {article.title}",
                f"- Category: {article.category or '—'}",
                f"- Status: {article.status}",
                f"- Reference: {article.reference_type or '—'} #{article.reference_id_ext or '—'}",
                "",
                _multiline_md(article.content),
                "",
            ])
    else:
        lines.append("_No knowledge articles linked_")
    lines.extend(["", "## Attachments"])
    if export_data.attachments:
        for attachment in export_data.attachments:
            lines.append(f"- {attachment.file_name} ({attachment.mime_type}, {attachment.file_size} bytes)")
    else:
        lines.append("_No attachments_")
    return "\n".join(lines)

def _render_html(export_data: BacklogExportOut) -> str:
    item = export_data.item
    context = export_data.context
    def p(text: Optional[str]) -> str:
        if not text or not text.strip():
            return "<em>N/A</em>"
        return "<br>".join(escape(line) for line in text.splitlines())
    summary_rows = [
        ("Item ID", str(item.item_id)),
        ("Type", item.item_type_name or "—"),
        ("Status", item.current_status),
        ("Priority", str(item.priority)),
        ("Story Points", str(item.story_points) if item.story_points is not None else "—"),
        ("WSJF", str(item.wsjf_score)),
        ("Sprint", context.sprint_name or "—"),
        ("Start Sprint", context.start_sprint_name or "—"),
        ("End Sprint", context.end_sprint_name or "—"),
        ("Requester", context.requester_name or "—"),
        ("Assigned To", context.assigned_to_name or "—"),
        ("ADO", item.ado_id or "—"),
        ("ADO Work Item Type", item.ado_work_item_type or "—"),
        ("Enabler Type", item.enabler_type or "—"),
    ]
    links_html = "".join(f"<li><strong>{escape(link.link_type)}</strong> → {escape(link.target_title or f'Item #{link.target_id}')}</li>" for link in export_data.links) or "<li><em>No links</em></li>"
    notes_html = "".join(f"<li><strong>{escape(note.author)}</strong> ({note.created_at.strftime('%Y-%m-%d %H:%M')}) — {escape(note.content)}</li>" for note in export_data.notes) or "<li><em>No notes</em></li>"
    knowledge_html = "".join(
        f"<article><h3>{escape(article.title)}</h3><p><strong>Category:</strong> {escape(article.category or '—')} &nbsp; <strong>Status:</strong> {escape(article.status)} &nbsp; <strong>Reference:</strong> {escape(article.reference_type or '—')} #{article.reference_id_ext or '—'}</p><div>{p(article.content)}</div></article>"
        for article in export_data.knowledge
    ) or "<p><em>No knowledge articles linked</em></p>"
    attachments_html = "".join(f"<li>{escape(att.file_name)} ({escape(att.mime_type)}, {att.file_size} bytes)</li>" for att in export_data.attachments) or "<li><em>No attachments</em></li>"
    summary_html = "".join(f"<tr><th>{escape(label)}</th><td>{escape(value)}</td></tr>" for label, value in summary_rows)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>{escape(item.title)}</title>
<style>
body {{ font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }}
h1, h2, h3 {{ color: #0f172a; }}
table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
th, td {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }}
th {{ width: 220px; background: #f8fafc; }}
section {{ margin-bottom: 28px; }}
article {{ border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 12px; border-radius: 6px; background: #f8fafc; }}
ul {{ padding-left: 20px; }}
small {{ color: #475569; }}
</style>
</head>
<body>
<h1>{escape(item.title)}</h1>
<small>Generated at {export_data.generated_at.strftime('%Y-%m-%d %H:%M:%S')} UTC</small>

<section>
  <h2>Summary</h2>
  <table>{summary_html}</table>
</section>

<section><h2>Description</h2><p>{p(item.description)}</p></section>
<section><h2>Business Value</h2><p>{p(item.business_value)}</p></section>
<section><h2>Acceptance Criteria</h2><p>{p(item.acceptance_criteria)}</p></section>
<section><h2>Definition of Done</h2><p>{p(item.definition_of_done)}</p></section>
<section><h2>Business Rules</h2><p>{p(item.business_rules)}</p></section>
<section><h2>Links</h2><ul>{links_html}</ul></section>
<section><h2>Notes</h2><ul>{notes_html}</ul></section>
<section><h2>Knowledge Base</h2>{knowledge_html}</section>
<section><h2>Attachments</h2><ul>{attachments_html}</ul></section>
</body>
</html>"""

def _safe_filename(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in value).strip("_") or "backlog_item"

def _render_txt(export_data: BacklogExportOut) -> str:
    item = export_data.item
    context = export_data.context
    lines = [
        f"BACKLOG ITEM: {item.title}",
        "=" * 80,
        f"Item ID: {item.item_id}",
        f"Type: {item.item_type_name or '-'}",
        f"Status: {item.current_status}",
        f"Priority: {item.priority}",
        f"Story Points: {item.story_points if item.story_points is not None else '-'}",
        f"WSJF: {item.wsjf_score}",
        f"Sprint: {context.sprint_name or '-'}",
        f"Start Sprint: {context.start_sprint_name or '-'}",
        f"End Sprint: {context.end_sprint_name or '-'}",
        f"Requester: {context.requester_name or '-'}",
        f"Assigned To: {context.assigned_to_name or '-'}",
        f"ADO: {item.ado_id or '-'}",
        f"ADO Work Item Type: {item.ado_work_item_type or '-'}",
        f"Enabler Type: {item.enabler_type or '-'}",
        "",
        "DESCRIPTION",
        "-" * 80,
        _clean_export_text(item.description) or "N/A",
        "",
        "BUSINESS VALUE",
        "-" * 80,
        _clean_export_text(item.business_value) or "N/A",
        "",
        "ACCEPTANCE CRITERIA",
        "-" * 80,
        _clean_export_text(item.acceptance_criteria) or "N/A",
        "",
        "DEFINITION OF DONE",
        "-" * 80,
        _clean_export_text(item.definition_of_done) or "N/A",
        "",
        "BUSINESS RULES",
        "-" * 80,
        _clean_export_text(item.business_rules) or "N/A",
        "",
        "LINKS",
        "-" * 80,
    ]
    if export_data.links:
        for link in export_data.links:
            lines.append(f"* {link.link_type}: {link.target_title or f'Item #{link.target_id}'}")
    else:
        lines.append("No links")
    lines.extend(["", "NOTES", "-" * 80])
    if export_data.notes:
        for note in export_data.notes:
            lines.append(f"* {note.author} ({note.created_at.strftime('%Y-%m-%d %H:%M')}): {note.content}")
    else:
        lines.append("No notes")
    lines.extend(["", "KNOWLEDGE BASE", "-" * 80])
    if export_data.knowledge:
        for article in export_data.knowledge:
            lines.extend([
                f"{article.title}",
                f"  Category: {article.category or '-'}",
                f"  Status: {article.status}",
                f"  Reference: {article.reference_type or '-'} #{article.reference_id_ext or '-'}",
                f"  Content: {_clean_export_text(article.content) or 'N/A'}",
                "",
            ])
    else:
        lines.append("No knowledge articles linked")
    lines.extend(["", "ATTACHMENTS", "-" * 80])
    if export_data.attachments:
        for attachment in export_data.attachments:
            lines.append(f"* {attachment.file_name} ({attachment.mime_type}, {attachment.file_size} bytes)")
    else:
        lines.append("No attachments")
    return "\n".join(lines)

def _build_docx_bytes(export_data: BacklogExportOut) -> bytes:
    item = export_data.item
    context = export_data.context
    doc = Document()
    doc.add_heading(item.title, level=0)

    doc.add_heading("Summary", level=1)
    for line in [
        f"Item ID: {item.item_id}",
        f"Type: {item.item_type_name or '-'}",
        f"Status: {item.current_status}",
        f"Priority: {item.priority}",
        f"Story Points: {item.story_points if item.story_points is not None else '-'}",
        f"WSJF: {item.wsjf_score}",
        f"Sprint: {context.sprint_name or '-'}",
        f"Start Sprint: {context.start_sprint_name or '-'}",
        f"End Sprint: {context.end_sprint_name or '-'}",
        f"Requester: {context.requester_name or '-'}",
        f"Assigned To: {context.assigned_to_name or '-'}",
        f"ADO: {item.ado_id or '-'}",
        f"ADO Work Item Type: {item.ado_work_item_type or '-'}",
        f"Enabler Type: {item.enabler_type or '-'}",
    ]:
        doc.add_paragraph(line)

    for title, value in [
        ("Description", item.description),
        ("Business Value", item.business_value),
        ("Acceptance Criteria", item.acceptance_criteria),
        ("Definition of Done", item.definition_of_done),
        ("Business Rules", item.business_rules),
    ]:
        doc.add_heading(title, level=1)
        for part in (_clean_export_text(value) or "N/A").splitlines():
            doc.add_paragraph(part)

    doc.add_heading("Links", level=1)
    if export_data.links:
        for link in export_data.links:
            doc.add_paragraph(
                f"{link.link_type}: {link.target_title or f'Item #{link.target_id}'}",
                style="List Bullet",
            )
    else:
        doc.add_paragraph("No links")

    doc.add_heading("Notes", level=1)
    if export_data.notes:
        for note in export_data.notes:
            doc.add_paragraph(
                f"{note.author} ({note.created_at.strftime('%Y-%m-%d %H:%M')}): {note.content}",
                style="List Bullet",
            )
    else:
        doc.add_paragraph("No notes")

    doc.add_heading("Knowledge Base", level=1)
    if export_data.knowledge:
        for article in export_data.knowledge:
            doc.add_heading(article.title, level=2)
            doc.add_paragraph(f"Category: {article.category or '-'}")
            doc.add_paragraph(f"Status: {article.status}")
            doc.add_paragraph(f"Reference: {article.reference_type or '-'} #{article.reference_id_ext or '-'}")
            for part in (_clean_export_text(article.content) or "N/A").splitlines():
                doc.add_paragraph(part)
    else:
        doc.add_paragraph("No knowledge articles linked")

    doc.add_heading("Attachments", level=1)
    if export_data.attachments:
        for attachment in export_data.attachments:
            doc.add_paragraph(
                f"{attachment.file_name} ({attachment.mime_type}, {attachment.file_size} bytes)",
                style="List Bullet",
            )
    else:
        doc.add_paragraph("No attachments")

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()

def _build_pdf_bytes(export_data: BacklogExportOut) -> bytes:
    item = export_data.item
    context = export_data.context
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x = 40
    y = height - 40
    max_width = width - (x * 2)

    def ensure_space(min_y: int = 50):
        nonlocal y
        if y < min_y:
            pdf.showPage()
            y = height - 40

    def wrap_text(text: str, font_name: str, size: int, available_width: float) -> List[str]:
        raw_lines = (text or "").splitlines() or [""]
        wrapped: List[str] = []
        for raw in raw_lines:
            candidate = raw.strip()
            if not candidate:
                wrapped.append("")
                continue
            words = candidate.split()
            line = ""
            for word in words:
                test = f"{line} {word}".strip()
                if stringWidth(test, font_name, size) <= available_width:
                    line = test
                else:
                    if line:
                        wrapped.append(line)
                    if stringWidth(word, font_name, size) <= available_width:
                        line = word
                    else:
                        chunk = ""
                        for ch in word:
                            probe = f"{chunk}{ch}"
                            if stringWidth(probe, font_name, size) <= available_width:
                                chunk = probe
                            else:
                                if chunk:
                                    wrapped.append(chunk)
                                chunk = ch
                        line = chunk
            if line:
                wrapped.append(line)
        return wrapped or [""]

    def write_paragraph(text: str, size: int = 10, gap: int = 14, font_name: str = "Helvetica"):
        nonlocal y
        pdf.setFont(font_name, size)
        cleaned_text = _clean_export_text(text) if text else ""
        for line in wrap_text(cleaned_text or "N/A", font_name, size, max_width):
            ensure_space()
            pdf.drawString(x, y, line)
            y -= gap

    write_paragraph(item.title, 16, 20, "Helvetica-Bold")
    for line in [
        f"Item ID: {item.item_id}",
        f"Type: {item.item_type_name or '-'}",
        f"Status: {item.current_status}",
        f"Priority: {item.priority}",
        f"Story Points: {item.story_points if item.story_points is not None else '-'}",
        f"WSJF: {item.wsjf_score}",
        f"Sprint: {context.sprint_name or '-'}",
        f"Start Sprint: {context.start_sprint_name or '-'}",
        f"End Sprint: {context.end_sprint_name or '-'}",
        f"Requester: {context.requester_name or '-'}",
        f"Assigned To: {context.assigned_to_name or '-'}",
        f"ADO: {item.ado_id or '-'}",
    ]:
        write_paragraph(line)

    sections = [
        ("Description", item.description),
        ("Business Value", item.business_value),
        ("Acceptance Criteria", item.acceptance_criteria),
        ("Definition of Done", item.definition_of_done),
        ("Business Rules", item.business_rules),
    ]
    for title, value in sections:
        y -= 4
        write_paragraph(title, 12, 16, "Helvetica-Bold")
        cleaned_value = _clean_export_text(value) or "N/A"
        write_paragraph(cleaned_value)

    y -= 4
    write_paragraph("Links", 12, 16, "Helvetica-Bold")
    if export_data.links:
        for link in export_data.links:
            write_paragraph(f"- {link.link_type}: {link.target_title or f'Item #{link.target_id}'}")
    else:
        write_paragraph("No links")

    y -= 4
    write_paragraph("Notes", 12, 16, "Helvetica-Bold")
    if export_data.notes:
        for note in export_data.notes:
            cleaned_note = _clean_export_text(note.content) or "N/A"
            write_paragraph(f"- {note.author} ({note.created_at.strftime('%Y-%m-%d %H:%M')}): {cleaned_note}")
    else:
        write_paragraph("No notes")

    y -= 4
    write_paragraph("Knowledge Base", 12, 16, "Helvetica-Bold")
    if export_data.knowledge:
        for article in export_data.knowledge:
            write_paragraph(article.title, 11, 14, "Helvetica-Bold")
            write_paragraph(f"Category: {article.category or '-'}")
            write_paragraph(f"Status: {article.status}")
            write_paragraph(f"Reference: {article.reference_type or '-'} #{article.reference_id_ext or '-'}")
            write_paragraph(_clean_export_text(article.content) or "N/A")
    else:
        write_paragraph("No knowledge articles linked")

    y -= 4
    write_paragraph("Attachments", 12, 16, "Helvetica-Bold")
    if export_data.attachments:
        for attachment in export_data.attachments:
            write_paragraph(f"- {attachment.file_name} ({attachment.mime_type}, {attachment.file_size} bytes)")
    else:
        write_paragraph("No attachments")

    pdf.save()
    return buffer.getvalue()

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# NOTE: specific routes MUST be declared BEFORE the generic /{id} route.

# ── Item Types ────────────────────────────────────────────────────────────────

@router.get("/types/list", response_model=List[ItemTypeOut])
def list_types(db: Session = Depends(get_db)):
    types = db.query(BacklogItemType).filter(BacklogItemType.is_active == True)\
               .order_by(BacklogItemType.display_order).all()
    return [ItemTypeOut.model_validate(t) for t in types]


# ── Sprints ───────────────────────────────────────────────────────────────────

@router.get("/sprints", response_model=List[SprintOut])
def list_sprints(product_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Sprint)
    if product_id is not None:
        q = q.filter(Sprint.product_id == product_id)
    return [SprintOut.model_validate(s) for s in q.order_by(Sprint.sprint_id).all()]


@router.post("/sprints", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
def create_sprint(body: SprintCreate, db: Session = Depends(get_db)):
    return BaseRepository(Sprint, db).create(body.model_dump())


@router.patch("/sprints/{id}", response_model=SprintOut)
def update_sprint(id: int, body: SprintUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(Sprint, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


@router.delete("/sprints/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(Sprint, db)
    repo.delete(repo.get_or_404(id))


# ── Suggestions ───────────────────────────────────────────────────────────────

@router.get("/suggestions/list", response_model=Paginated)
def list_suggestions(page: int = 1, size: int = 20,
                     status: Optional[str] = None, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItemSuggestion, db)
    filters: dict = {}
    if status: filters["status"] = status
    total, items = repo.list(skip=(page - 1) * size, limit=size, **filters)
    return {"total": total, "page": page, "size": size,
            "items": [SuggestionOut.model_validate(i) for i in items]}


@router.post("/suggestions", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
def create_suggestion(body: SuggestionCreate, db: Session = Depends(get_db)):
    return BaseRepository(BacklogItemSuggestion, db).create(body.model_dump())


@router.patch("/suggestions/{id}", response_model=SuggestionOut)
def update_suggestion(id: int, body: SuggestionUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItemSuggestion, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))


# ── Item Links ────────────────────────────────────────────────────────────────

LINK_LABELS = {
    "parent_of": "é pai de", "child_of": "é filho de",
    "predecessor_of": "predecessora de", "successor_of": "sucessora de",
    "blocks": "bloqueia", "blocked_by": "bloqueado por",
    "relates_to": "relacionado a", "duplicates": "duplicata de", "cloned_from": "clonado de",
}
INVERSE_TYPES = {
    "parent_of": "child_of", "child_of": "parent_of",
    "predecessor_of": "successor_of", "successor_of": "predecessor_of",
    "blocks": "blocked_by", "blocked_by": "blocks",
    "relates_to": "relates_to", "duplicates": "duplicates", "cloned_from": "cloned_from",
}

class LinkCreate(BaseModel):
    target_id: int
    link_type: str = "relates_to"

class LinkOut(BaseModel):
    link_id:      int
    source_id:    int
    target_id:    int
    link_type:    str
    target_title: Optional[str] = None
    created_at:   datetime
    class Config: from_attributes = True

@router.get("/link-types", response_model=dict)
def get_link_types():
    return LINK_LABELS

@router.get("/links/by-product", response_model=List[dict])
def get_links_by_product(product_id: int, db: Session = Depends(get_db)):
    """Returns all links where source or target belongs to items of a product."""
    item_ids = [r[0] for r in db.query(BacklogItem.item_id).filter(BacklogItem.product_id == product_id).all()]
    if not item_ids: return []
    links = db.query(BacklogItemLink).filter(
        (BacklogItemLink.source_id.in_(item_ids)) | (BacklogItemLink.target_id.in_(item_ids))
    ).all()
    return [{"link_id": l.link_id, "source_id": l.source_id, "target_id": l.target_id, "link_type": l.link_type} for l in links]

@router.get("/{item_id}/links", response_model=List[LinkOut])
def list_links(item_id: int, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    result = []
    # Outgoing links (this item is the source)
    outgoing = db.query(BacklogItemLink).filter(BacklogItemLink.source_id == item_id).order_by(BacklogItemLink.created_at).all()
    for lnk in outgoing:
        out = LinkOut.model_validate(lnk)
        target = db.get(BacklogItem, lnk.target_id)
        out.target_title = target.title if target else f"Item #{lnk.target_id}"
        result.append(out)
    # Incoming links (this item is the target) — show with inverse type
    incoming = db.query(BacklogItemLink).filter(BacklogItemLink.target_id == item_id).order_by(BacklogItemLink.created_at).all()
    for lnk in incoming:
        out = LinkOut(
            link_id=lnk.link_id,
            source_id=lnk.target_id,   # from this item's perspective, source IS the other item
            target_id=lnk.source_id,
            link_type=INVERSE_TYPES.get(lnk.link_type, lnk.link_type),
            created_at=lnk.created_at
        )
        source = db.get(BacklogItem, lnk.source_id)
        out.target_title = source.title if source else f"Item #{lnk.source_id}"
        result.append(out)
    return result

@router.post("/{item_id}/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(item_id: int, body: LinkCreate, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    BaseRepository(BacklogItem, db).get_or_404(body.target_id)
    lnk = BacklogItemLink(source_id=item_id, target_id=body.target_id, link_type=body.link_type)
    db.add(lnk); db.commit(); db.refresh(lnk)
    out = LinkOut.model_validate(lnk)
    target = db.get(BacklogItem, body.target_id)
    out.target_title = target.title if target else f"Item #{body.target_id}"
    return out

@router.delete("/{item_id}/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(item_id: int, link_id: int, db: Session = Depends(get_db)):
    # Find link where item is source OR target (supports bidirectional display)
    from sqlalchemy import or_
    lnk = db.query(BacklogItemLink).filter(
        BacklogItemLink.link_id == link_id,
        or_(BacklogItemLink.source_id == item_id, BacklogItemLink.target_id == item_id)
    ).first()
    if lnk: db.delete(lnk); db.commit()

# ── Notes (before /{id} to avoid routing conflicts) ──────────────────────────

VALID_NOTE_TYPES = {"information", "blocker", "issue", "decision", "risk", "follow_up", "status_update"}
VALID_NOTE_STATUSES = {"open", "in_progress", "done", "cancelled"}

class NoteCreate(BaseModel):
    author: str
    content: str
    note_type: str = "information"
    status: str = "open"
    parent_note_id: Optional[int] = None
    create_followup: bool = False
    followup_assigned_to: Optional[str] = None
    followup_due_date: Optional[date] = None
    followup_notes: Optional[str] = None

class NoteHistoryEntryOut(BaseModel):
    author: Optional[str] = None
    timestamp: Optional[str] = None
    content: str

class NoteOut(BaseModel):
    note_id: int
    item_id: int
    author: str
    content: str
    note_type: str = "information"
    status: str = "open"
    followup_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    last_updated_by: Optional[str] = None
    history_entries: List[NoteHistoryEntryOut] = []
    class Config: from_attributes = True

class ExportKnowledgeArticleOut(BaseModel):
    article_id: int
    title: str
    category: Optional[str] = None
    status: str
    created_by: Optional[str] = None
    updated_at: datetime
    content: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id_ext: Optional[int] = None

class ExportAttachmentOut(BaseModel):
    id: str
    file_name: str
    mime_type: str
    file_size: int
    uploaded_by: Optional[str] = None
    created_at: datetime

class ExportContextOut(BaseModel):
    requester_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    sprint_name: Optional[str] = None
    start_sprint_name: Optional[str] = None
    end_sprint_name: Optional[str] = None

class BacklogExportOut(BaseModel):
    generated_at: datetime
    item: BacklogItemOut
    context: ExportContextOut
    links: List[LinkOut]
    notes: List[NoteOut]
    knowledge: List[ExportKnowledgeArticleOut]
    attachments: List[ExportAttachmentOut]

def _parse_note_history(content: Optional[str], fallback_author: Optional[str]) -> List[NoteHistoryEntryOut]:
    normalized = (content or "").replace("\r", "").strip()
    if not normalized:
        return []

    pattern = re.compile(r"\[(\d{1,2}-[A-Za-zÀ-ÿ]{3}-\d{4}\s+\d{1,2}:\d{2})\]\s*")
    matches = list(pattern.finditer(normalized))
    entries: List[NoteHistoryEntryOut] = []

    if matches:
        for index, match in enumerate(matches):
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(normalized)
            entry_content = normalized[start:end].strip()
            if entry_content:
                entries.append(
                    NoteHistoryEntryOut(
                        author=fallback_author if index == 0 else None,
                        timestamp=match.group(1),
                        content=entry_content,
                    )
                )
        return entries

    return [
        NoteHistoryEntryOut(
            author=fallback_author,
            timestamp=None,
            content=normalized,
        )
    ]

def _note_to_out(note: BacklogItemNote) -> NoteOut:
    out = NoteOut.model_validate(note)
    entries = _parse_note_history(note.content, note.author)
    out.history_entries = entries
    out.created_by = entries[-1].author if entries else note.author
    out.last_updated_by = entries[0].author if entries else note.author
    return out

@router.get("/{item_id}/notes", response_model=List[NoteOut])
def list_notes(item_id: int, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)
    notes = db.query(BacklogItemNote)\
               .filter(BacklogItemNote.item_id == item_id)\
               .order_by(BacklogItemNote.created_at.desc()).all()
    return [_note_to_out(n) for n in notes]

@router.post("/{item_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(item_id: int, body: NoteCreate, db: Session = Depends(get_db)):
    BaseRepository(BacklogItem, db).get_or_404(item_id)

    note_type = (body.note_type or "information").strip().lower()
    note_status = (body.status or "open").strip().lower()
    raw_content = body.content.strip()

    if note_type not in VALID_NOTE_TYPES:
        raise ValueError(f"Tipo de nota inválido: {note_type}")
    if note_status not in VALID_NOTE_STATUSES:
        raise ValueError(f"Status de nota inválido: {note_status}")
    if not raw_content:
        raise ValueError("Conteúdo da nota é obrigatório")

    month_map = {
        1: "jan", 2: "fev", 3: "mar", 4: "abr", 5: "mai", 6: "jun",
        7: "jul", 8: "ago", 9: "set", 10: "out", 11: "nov", 12: "dez",
    }
    now = _now_local()
    stamped_timestamp = f"{now.day:02d}-{month_map[now.month]}-{now.year} {now.hour:02d}:{now.minute:02d}"
    stamped_entry = f"[{stamped_timestamp}] {raw_content}"

    existing_note = None
    if body.parent_note_id is not None:
        existing_note = db.query(BacklogItemNote).filter(
            BacklogItemNote.note_id == body.parent_note_id,
            BacklogItemNote.item_id == item_id
        ).first()
        if not existing_note:
            raise ValueError("Registro de histórico não encontrado para atualização")

    followup_id = existing_note.followup_id if existing_note else None
    if body.create_followup and not followup_id:
        from app.models.followup import Followup
        import uuid

        followup = Followup(
            id=str(uuid.uuid4()),
            entity_type="backlog_item",
            entity_id=str(item_id),
            action_type="other" if note_type == "follow_up" else note_type if note_type in {"blocker", "issue", "risk"} else "other",
            description=raw_content,
            assigned_to=body.followup_assigned_to.strip() if body.followup_assigned_to else None,
            due_date=body.followup_due_date,
            status="done" if note_status == "done" else "pending",
            notes=body.followup_notes.strip() if body.followup_notes else None,
        )
        db.add(followup)
        db.flush()
        followup_id = followup.id

    if existing_note:
        existing_note.author = body.author
        existing_note.note_type = note_type
        existing_note.status = note_status
        existing_note.followup_id = followup_id
        previous_content = (existing_note.content or "").strip()
        existing_note.content = f"{stamped_entry}\n{previous_content}" if previous_content else stamped_entry
        db.commit()
        db.refresh(existing_note)
        return _note_to_out(existing_note)

    n = BacklogItemNote(
        item_id=item_id,
        author=body.author,
        content=stamped_entry,
        note_type=note_type,
        status=note_status,
        followup_id=followup_id,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return _note_to_out(n)

@router.delete("/{item_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(item_id: int, note_id: int, db: Session = Depends(get_db)):
    n = db.query(BacklogItemNote).filter(
        BacklogItemNote.note_id == note_id,
        BacklogItemNote.item_id == item_id
    ).first()
    if n:
        db.delete(n); db.commit()

# ── Backlog Items (generic /{id} routes LAST) ─────────────────────────────────

@router.get("", response_model=Paginated)
def list_items(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    current_status: Optional[str] = None,
    item_type_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    no_sprint: Optional[bool] = None,
    management_owner_member_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(BacklogItem)
    if product_id is not None:     q = q.filter(BacklogItem.product_id     == product_id)
    if current_status is not None: q = q.filter(BacklogItem.current_status == current_status)
    if item_type_id is not None:   q = q.filter(BacklogItem.item_type_id   == item_type_id)
    if no_sprint is True:          q = q.filter(BacklogItem.sprint_id.is_(None))
    elif sprint_id is not None:    q = q.filter(BacklogItem.sprint_id      == sprint_id)
    if management_owner_member_id is not None:
        q = q.filter(BacklogItem.management_owner_member_id == management_owner_member_id)
    if search:
        term = search.strip()
        if term:
            like_term = f"%{term}%"
            conditions = [
                BacklogItem.title.ilike(like_term),
                BacklogItem.description.ilike(like_term),
                BacklogItem.business_value.ilike(like_term),
                BacklogItem.acceptance_criteria.ilike(like_term),
                BacklogItem.definition_of_done.ilike(like_term),
                BacklogItem.business_rules.ilike(like_term),
                BacklogItem.current_status.ilike(like_term),
                BacklogItem.ado_id.ilike(like_term),
                BacklogItem.ado_work_item_type.ilike(like_term),
                BacklogItem.enabler_type.ilike(like_term),
                cast(BacklogItem.item_id, String).ilike(like_term),
            ]
            if term.isdigit():
                conditions.append(BacklogItem.item_id == int(term))
            q = q.filter(or_(*conditions))
    total = q.count()
    items = q.order_by(BacklogItem.item_id.desc()).offset((page - 1) * size).limit(size).all()
    # Enrich with discovery opportunity titles
    opp_ids = {i.discovery_opportunity_id for i in items if i.discovery_opportunity_id}
    opp_map: dict = {}
    if opp_ids:
        try:
            from app.models.discovery import DiscoveryOpportunity
            opps = db.query(DiscoveryOpportunity).filter(DiscoveryOpportunity.id.in_(opp_ids)).all()
            opp_map = {o.id: o.title for o in opps}
        except Exception:
            pass
    type_ids = {i.item_type_id for i in items if i.item_type_id}
    type_map: dict[int, str] = {}
    if type_ids:
        types = db.query(BacklogItemType).filter(BacklogItemType.item_type_id.in_(type_ids)).all()
        type_map = {tp.item_type_id: tp.name for tp in types}

    enriched = []
    for i in items:
        out = BacklogItemOut.model_validate(i)
        if i.discovery_opportunity_id:
            out.discovery_opportunity_title = opp_map.get(i.discovery_opportunity_id)
        if i.item_type_id:
            out.item_type_name = type_map.get(i.item_type_id)
        enriched.append(out)
    return {"total": total, "page": page, "size": size, "items": enriched}


@router.post("", response_model=BacklogItemOut, status_code=status.HTTP_201_CREATED)
def create_item(body: BacklogItemCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    data["wsjf_score"] = calc_wsjf(
        data["wsjf_business_value"], data["wsjf_time_criticality"],
        data["wsjf_risk_reduction"], data["wsjf_job_size"]
    )
    return BaseRepository(BacklogItem, db).create(data)


@router.get("/{id}/export-data", response_model=BacklogExportOut)
def get_item_export_data(id: int, db: Session = Depends(get_db)):
    return _build_export(id, db)


@router.get("/{id}/export.md", response_class=PlainTextResponse)
def export_item_markdown(id: int, db: Session = Depends(get_db)):
    return PlainTextResponse(_render_markdown(_build_export(id, db)), media_type="text/markdown; charset=utf-8")


@router.get("/{id}/export.html", response_class=HTMLResponse)
def export_item_html(id: int, db: Session = Depends(get_db)):
    return HTMLResponse(_render_html(_build_export(id, db)))

@router.get("/{id}/export.txt", response_class=PlainTextResponse)
def export_item_txt(id: int, db: Session = Depends(get_db)):
    return PlainTextResponse(_render_txt(_build_export(id, db)), media_type="text/plain; charset=utf-8")

@router.get("/{id}/export.docx")
def export_item_docx(id: int, db: Session = Depends(get_db)):
    export_data = _build_export(id, db)
    filename = f"{_safe_filename(export_data.item.title)}.docx"
    return StreamingResponse(
        BytesIO(_build_docx_bytes(export_data)),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/{id}/export.pdf")
def export_item_pdf(id: int, db: Session = Depends(get_db)):
    export_data = _build_export(id, db)
    filename = f"{_safe_filename(export_data.item.title)}.pdf"
    return StreamingResponse(
        BytesIO(_build_pdf_bytes(export_data)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{id}", response_model=BacklogItemOut)
def get_item(id: int, db: Session = Depends(get_db)):
    item = BaseRepository(BacklogItem, db).get_or_404(id)
    return _item_to_out(item, db)


@router.patch("/{id}", response_model=BacklogItemOut)
def update_item(id: int, body: BacklogItemUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItem, db)
    obj  = repo.get_or_404(id)
    data = body.model_dump(exclude_unset=True)
    wsjf_fields = {"wsjf_business_value", "wsjf_time_criticality", "wsjf_risk_reduction", "wsjf_job_size"}
    if wsjf_fields & set(data.keys()):
        bv = data.get("wsjf_business_value", obj.wsjf_business_value if obj.wsjf_business_value is not None else 0)
        tc = data.get("wsjf_time_criticality", obj.wsjf_time_criticality if obj.wsjf_time_criticality is not None else 0)
        rr = data.get("wsjf_risk_reduction", obj.wsjf_risk_reduction if obj.wsjf_risk_reduction is not None else 0)
        js = data.get("wsjf_job_size", obj.wsjf_job_size if obj.wsjf_job_size is not None else 0)
        data["wsjf_score"] = calc_wsjf(bv, tc, rr, js)
    return repo.update(obj, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id: int, db: Session = Depends(get_db)):
    repo = BaseRepository(BacklogItem, db)
    repo.delete(repo.get_or_404(id))
