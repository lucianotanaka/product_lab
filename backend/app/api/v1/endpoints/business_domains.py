from typing import Optional, List, Dict, Any
from datetime import datetime
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, HTMLResponse, StreamingResponse
from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from openpyxl import Workbook
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.business_domain import BusinessDomain, BusinessSubdomain, RequirementDomainLink
from app.models.requirement import Requirement
from app.models.risk import Risk

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class DomainCreate(BaseModel):
    domain_code: str
    domain_name: str
    description: Optional[str] = None
    owner: Optional[str] = None
    business_objective: Optional[str] = None
    scope_in: Optional[str] = None
    scope_out: Optional[str] = None
    business_value: Optional[str] = None
    document_status: str = "DRAFT"
    version: str = "1.0"
    display_order: int = 0


class DomainUpdate(BaseModel):
    domain_name: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    business_objective: Optional[str] = None
    scope_in: Optional[str] = None
    scope_out: Optional[str] = None
    business_value: Optional[str] = None
    document_status: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class SubdomainCreate(BaseModel):
    subdomain_code: str
    subdomain_name: str
    description: Optional[str] = None
    subdomain_type: Optional[str] = None
    owner: Optional[str] = None
    business_rules: Optional[str] = None
    display_order: int = 0


class SubdomainUpdate(BaseModel):
    subdomain_name: Optional[str] = None
    description: Optional[str] = None
    subdomain_type: Optional[str] = None
    owner: Optional[str] = None
    business_rules: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class SubdomainOut(BaseModel):
    id: int
    domain_id: int
    subdomain_code: str
    subdomain_name: str
    description: Optional[str]
    subdomain_type: Optional[str]
    owner: Optional[str]
    business_rules: Optional[str]
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DomainOut(BaseModel):
    id: int
    domain_code: str
    domain_name: str
    description: Optional[str]
    owner: Optional[str]
    business_objective: Optional[str]
    scope_in: Optional[str]
    scope_out: Optional[str]
    business_value: Optional[str]
    document_status: str
    version: str
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime
    subdomains: List[SubdomainOut] = []
    requirement_count: int = 0

    class Config:
        from_attributes = True


class DomainLinkCreate(BaseModel):
    domain_id: int
    subdomain_id: Optional[int] = None


class DomainLinkOut(BaseModel):
    id: int
    requirement_id: int
    domain_id: int
    subdomain_id: Optional[int]
    domain_code: Optional[str] = None
    domain_name: Optional[str] = None
    subdomain_code: Optional[str] = None
    subdomain_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_domain(id: int, db: Session) -> BusinessDomain:
    obj = db.get(BusinessDomain, id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business domain not found")
    return obj


def _enrich_domain(domain: BusinessDomain, db: Session) -> DomainOut:
    subdomains = (
        db.query(BusinessSubdomain)
        .filter(BusinessSubdomain.domain_id == domain.id)
        .order_by(BusinessSubdomain.display_order, BusinessSubdomain.subdomain_name)
        .all()
    )
    req_count = (
        db.query(RequirementDomainLink)
        .filter(RequirementDomainLink.domain_id == domain.id)
        .count()
    )

    out = DomainOut.model_validate(domain)
    out.subdomains = [SubdomainOut.model_validate(s) for s in subdomains]
    out.requirement_count = req_count
    return out


def _enrich_link(link: RequirementDomainLink, db: Session) -> DomainLinkOut:
    out = DomainLinkOut.model_validate(link)
    domain = db.get(BusinessDomain, link.domain_id)
    if domain:
        out.domain_code = domain.domain_code
        out.domain_name = domain.domain_name
    if link.subdomain_id:
        sub = db.get(BusinessSubdomain, link.subdomain_id)
        if sub:
            out.subdomain_code = sub.subdomain_code
            out.subdomain_name = sub.subdomain_name
    return out


def _get_domain_requirements_data(domain_id: int, db: Session) -> List[Dict[str, Any]]:
    links = db.query(RequirementDomainLink).filter(
        RequirementDomainLink.domain_id == domain_id
    ).all()

    result: List[Dict[str, Any]] = []
    for link in links:
        req = db.get(Requirement, link.requirement_id)
        if not req or req.is_deleted:
            continue

        sub = db.get(BusinessSubdomain, link.subdomain_id) if link.subdomain_id else None
        result.append(
            {
                "link_id": link.id,
                "requirement_id": req.id,
                "requirement_code": req.requirement_code,
                "requirement_title": req.requirement_title,
                "requirement_description": req.requirement_description,
                "requirement_type": req.requirement_type,
                "requirement_classification": req.requirement_classification,
                "requirement_source": req.requirement_source,
                "lifecycle_status": req.lifecycle_status,
                "fulfillment_status": req.fulfillment_status,
                "priority": req.priority,
                "acceptance_definition": req.acceptance_definition,
                "requirement_owner": req.requirement_owner,
                "created_at": req.created_at.isoformat() if req.created_at else None,
                "updated_at": req.updated_at.isoformat() if req.updated_at else None,
                "subdomain_id": sub.id if sub else None,
                "subdomain_code": sub.subdomain_code if sub else None,
                "subdomain_name": sub.subdomain_name if sub else None,
            }
        )

    return sorted(
        result,
        key=lambda item: (
            item["subdomain_name"] or "ZZZ",
            item["priority"] or "",
            item["requirement_code"] or "",
        ),
    )


def _get_domain_risks_data(domain_id: int, db: Session) -> List[Dict[str, Any]]:
    risks = (
        db.query(Risk)
        .filter(Risk.domain_id == domain_id)
        .order_by(Risk.risk_score.desc(), Risk.updated_at.desc())
        .all()
    )

    result: List[Dict[str, Any]] = []
    for risk in risks:
        sub = db.get(BusinessSubdomain, risk.subdomain_id) if risk.subdomain_id else None
        # status might be Enum or plain string depending on how SQLAlchemy hydrated it.
        status_value = getattr(risk.status, "value", risk.status)

        result.append(
            {
                "id": risk.id,
                "title": risk.title,
                "description": risk.description,
                "probability": risk.probability,
                "impact": risk.impact,
                "risk_score": risk.risk_score,
                "status": status_value,
                "mitigation_plan": risk.mitigation_plan,
                "subdomain_id": sub.id if sub else None,
                "subdomain_code": sub.subdomain_code if sub else None,
                "subdomain_name": sub.subdomain_name if sub else None,
                "requirement_id": risk.requirement_id,
                "created_at": risk.created_at.isoformat() if risk.created_at else None,
                "updated_at": risk.updated_at.isoformat() if risk.updated_at else None,
            }
        )
    return result


def _classify_business_rules(requirements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Regra simples (ajustável): business rule quando:
    # - requirement_type == BUSINESS
    # - ou requirement_classification == BUSINESS_RULE
    return [
        req
        for req in requirements
        if req.get("requirement_type") == "BUSINESS"
        or req.get("requirement_classification") == "BUSINESS_RULE"
    ]


def _build_document_payload(domain_id: int, db: Session) -> Dict[str, Any]:
    domain = _get_domain(domain_id, db)
    domain_out = _enrich_domain(domain, db)

    requirements = _get_domain_requirements_data(domain_id, db)
    risks = _get_domain_risks_data(domain_id, db)
    business_rules = _classify_business_rules(requirements)

    subdomains: List[Dict[str, Any]] = []
    for sub in domain_out.subdomains:
        subdomains.append(
            {
                "id": sub.id,
                "subdomain_code": sub.subdomain_code,
                "subdomain_name": sub.subdomain_name,
                "description": sub.description,
                "subdomain_type": sub.subdomain_type,
                "owner": sub.owner,
                "business_rules_text": sub.business_rules,
                "requirements": [r for r in requirements if r["subdomain_id"] == sub.id],
                "risks": [r for r in risks if r["subdomain_id"] == sub.id],
                # business rules “derivadas” de requirements (filtrado acima)
                "business_rules": [r for r in business_rules if r["subdomain_id"] == sub.id],
            }
        )

    return {
        "domain": {
            "id": domain_out.id,
            "domain_code": domain_out.domain_code,
            "domain_name": domain_out.domain_name,
            "description": domain_out.description,
            "owner": domain_out.owner,
            "business_objective": domain_out.business_objective,
            "scope_in": domain_out.scope_in,
            "scope_out": domain_out.scope_out,
            "business_value": domain_out.business_value,
            "document_status": domain_out.document_status,
            "version": domain_out.version,
            "is_active": domain_out.is_active,
            "created_at": domain_out.created_at.isoformat() if domain_out.created_at else None,
            "updated_at": domain_out.updated_at.isoformat() if domain_out.updated_at else None,
        },
        "subdomains": subdomains,
        "requirements": requirements,
        "business_rules": business_rules,
        "risks": risks,
        "summary": {
            "subdomain_count": len(subdomains),
            "requirement_count": len(requirements),
            "business_rule_count": len(business_rules),
            "risk_count": len(risks),
            "generated_at": datetime.utcnow().isoformat(),
        },
    }


def _build_markdown_document(payload: Dict[str, Any]) -> str:
    d = payload["domain"]
    lines: List[str] = [
        f"# Business Domain Specification — {d['domain_name']}",
        "",
        "## Overview",
        f"- **Code:** {d['domain_code']}",
        f"- **Owner:** {d['owner'] or '-'}",
        f"- **Status:** {d['document_status']}",
        f"- **Version:** {d['version']}",
        f"- **Generated at:** {payload['summary']['generated_at']}",
        "",
        "## Description",
        d.get("description") or "-",
        "",
        "## Business Objective",
        d.get("business_objective") or "-",
        "",
        "## Scope In",
        d.get("scope_in") or "-",
        "",
        "## Scope Out",
        d.get("scope_out") or "-",
        "",
        "## Business Value",
        d.get("business_value") or "-",
        "",
        "## Summary",
        f"- Subdomains: {payload['summary']['subdomain_count']}",
        f"- Requirements: {payload['summary']['requirement_count']}",
        f"- Business Rules: {payload['summary']['business_rule_count']}",
        f"- Risks: {payload['summary']['risk_count']}",
        "",
        "## Subdomains",
    ]

    if not payload["subdomains"]:
        lines += ["- No subdomains registered.", ""]
    else:
        for sub in payload["subdomains"]:
            lines += [
                f"### {sub['subdomain_code']} — {sub['subdomain_name']}",
                f"- Type: {sub.get('subdomain_type') or '-'}",
                f"- Owner: {sub.get('owner') or '-'}",
                f"- Description: {sub.get('description') or '-'}",
                f"- Business Rules Text: {sub.get('business_rules_text') or '-'}",
                "",
            ]

            # Business rules (derived from requirements)
            if sub.get("business_rules"):
                lines += ["#### Business Rules", ""]
                for br in sub["business_rules"]:
                    lines += [
                        f"- **{br['requirement_code']}** — {br['requirement_title']}",
                        f"  - Classification: {br.get('requirement_classification') or '-'}",
                        f"  - Priority: {br.get('priority') or '-'}",
                        f"  - Lifecycle: {br.get('lifecycle_status') or '-'}",
                    ]
                lines += [""]

            # Requirements
            if sub.get("requirements"):
                lines += ["#### Requirements", ""]
                for req in sub["requirements"]:
                    lines += [
                        f"- **{req['requirement_code']}** — {req['requirement_title']}",
                        f"  - Type: {req.get('requirement_type') or '-'}",
                        f"  - Classification: {req.get('requirement_classification') or '-'}",
                        f"  - Priority: {req.get('priority') or '-'}",
                        f"  - Lifecycle: {req.get('lifecycle_status') or '-'}",
                        f"  - Fulfillment: {req.get('fulfillment_status') or '-'}",
                        f"  - Source: {req.get('requirement_source') or '-'}",
                    ]
                lines += [""]

            # Risks
            if sub.get("risks"):
                lines += ["#### Risks", ""]
                for r in sub["risks"]:
                    lines += [
                        f"- **{r['title']}**",
                        f"  - Status: {r.get('status') or '-'}",
                        f"  - Score: {r.get('risk_score') or '-'} (P={r.get('probability')}, I={r.get('impact')})",
                        f"  - Description: {r.get('description') or '-'}",
                        f"  - Mitigation: {r.get('mitigation_plan') or '-'}",
                    ]
                lines += [""]

    return "\n".join(lines).strip() + "\n"


def _build_html_document(payload: Dict[str, Any]) -> str:
    md = _build_markdown_document(payload)
    html_lines: List[str] = []
    for line in md.splitlines():
        if line.startswith("# "):
            html_lines.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("### "):
            html_lines.append(f"<h3>{line[4:]}</h3>")
        elif line.startswith("#### "):
            html_lines.append(f"<h4>{line[5:]}</h4>")
        elif line.startswith("- **") or line.startswith("- **"):
            html_lines.append(f"<p>{line}</p>")
        elif line.startswith("- "):
            html_lines.append(f"<p>{line[2:]}</p>")
        elif line.strip():
            html_lines.append(f"<p>{line}</p>")
        else:
            html_lines.append("")
    return "\n".join(html_lines)


def _safe_filename(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in value).strip("_") or "business_domain"


def _build_docx_bytes(payload: Dict[str, Any]) -> bytes:
    d = payload["domain"]
    doc = Document()
    doc.add_heading(f"Business Domain Specification — {d['domain_name']}", level=0)

    doc.add_heading("Overview", level=1)
    doc.add_paragraph(f"Code: {d['domain_code']}")
    doc.add_paragraph(f"Owner: {d['owner'] or '-'}")
    doc.add_paragraph(f"Status: {d['document_status'] or '-'}")
    doc.add_paragraph(f"Version: {d['version'] or '-'}")
    doc.add_paragraph(f"Generated at: {payload['summary']['generated_at']}")

    for title, value in [
        ("Description", d.get("description")),
        ("Business Objective", d.get("business_objective")),
        ("Scope In", d.get("scope_in")),
        ("Scope Out", d.get("scope_out")),
        ("Business Value", d.get("business_value")),
    ]:
        doc.add_heading(title, level=1)
        doc.add_paragraph(value or "-")

    doc.add_heading("Subdomains", level=1)
    if not payload["subdomains"]:
        doc.add_paragraph("No subdomains registered.")
    else:
        for sub in payload["subdomains"]:
            doc.add_heading(f"{sub['subdomain_code']} — {sub['subdomain_name']}", level=2)
            doc.add_paragraph(f"Type: {sub.get('subdomain_type') or '-'}")
            doc.add_paragraph(f"Owner: {sub.get('owner') or '-'}")
            doc.add_paragraph(f"Description: {sub.get('description') or '-'}")
            doc.add_paragraph(f"Business Rules Text: {sub.get('business_rules_text') or '-'}")

            if sub.get("requirements"):
                doc.add_heading("Requirements", level=3)
                for req in sub["requirements"]:
                    doc.add_paragraph(
                        f"{req['requirement_code']} — {req['requirement_title']} | "
                        f"Type: {req.get('requirement_type') or '-'} | "
                        f"Priority: {req.get('priority') or '-'} | "
                        f"Lifecycle: {req.get('lifecycle_status') or '-'}",
                        style="List Bullet",
                    )

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def _build_pdf_bytes(payload: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x = 40
    y = height - 40

    def write_line(text: str, size: int = 10, gap: int = 14):
        nonlocal y
        if y < 50:
            pdf.showPage()
            y = height - 40
        pdf.setFont("Helvetica", size)
        pdf.drawString(x, y, text[:120])
        y -= gap

    d = payload["domain"]
    write_line(f"Business Domain Specification — {d['domain_name']}", 14, 20)
    write_line(f"Code: {d['domain_code']}")
    write_line(f"Owner: {d['owner'] or '-'}")
    write_line(f"Status: {d['document_status'] or '-'}")
    write_line(f"Version: {d['version'] or '-'}")
    write_line("")

    for label, value in [
        ("Description", d.get("description")),
        ("Business Objective", d.get("business_objective")),
        ("Scope In", d.get("scope_in")),
        ("Scope Out", d.get("scope_out")),
        ("Business Value", d.get("business_value")),
    ]:
        write_line(label, 12, 16)
        for part in (value or "-").splitlines() or ["-"]:
            write_line(f"  {part}")

    write_line("Subdomains", 12, 16)
    if not payload["subdomains"]:
        write_line("  No subdomains registered.")
    else:
        for sub in payload["subdomains"]:
            write_line(f"  {sub['subdomain_code']} — {sub['subdomain_name']}", 11, 14)
            write_line(f"    Owner: {sub.get('owner') or '-'}")
            write_line(f"    Requirements: {len(sub.get('requirements') or [])}")
            write_line(f"    Risks: {len(sub.get('risks') or [])}")

    pdf.save()
    return buffer.getvalue()


def _build_xlsx_bytes(payload: Dict[str, Any]) -> bytes:
    wb = Workbook()

    ws_summary = wb.active
    ws_summary.title = "Summary"
    d = payload["domain"]
    ws_summary.append(["Field", "Value"])
    for row in [
        ("Code", d["domain_code"]),
        ("Name", d["domain_name"]),
        ("Owner", d.get("owner") or ""),
        ("Status", d.get("document_status") or ""),
        ("Version", d.get("version") or ""),
        ("Description", d.get("description") or ""),
        ("Business Objective", d.get("business_objective") or ""),
        ("Scope In", d.get("scope_in") or ""),
        ("Scope Out", d.get("scope_out") or ""),
        ("Business Value", d.get("business_value") or ""),
    ]:
        ws_summary.append(list(row))

    ws_sub = wb.create_sheet("Subdomains")
    ws_sub.append(["Code", "Name", "Type", "Owner", "Description", "Business Rules Text"])
    for sub in payload["subdomains"]:
        ws_sub.append([
            sub["subdomain_code"],
            sub["subdomain_name"],
            sub.get("subdomain_type") or "",
            sub.get("owner") or "",
            sub.get("description") or "",
            sub.get("business_rules_text") or "",
        ])

    ws_req = wb.create_sheet("Requirements")
    ws_req.append(["Code", "Title", "Type", "Classification", "Priority", "Lifecycle", "Subdomain"])
    for req in payload["requirements"]:
        ws_req.append([
            req.get("requirement_code") or "",
            req.get("requirement_title") or "",
            req.get("requirement_type") or "",
            req.get("requirement_classification") or "",
            req.get("priority") or "",
            req.get("lifecycle_status") or "",
            req.get("subdomain_name") or "",
        ])

    ws_risk = wb.create_sheet("Risks")
    ws_risk.append(["Title", "Status", "Score", "Subdomain", "Mitigation"])
    for risk in payload["risks"]:
        ws_risk.append([
            risk.get("title") or "",
            risk.get("status") or "",
            risk.get("risk_score") or "",
            risk.get("subdomain_name") or "",
            risk.get("mitigation_plan") or "",
        ])

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ── Domain CRUD ───────────────────────────────────────────────────────────────

@router.get("", response_model=List[DomainOut])
def list_domains(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(BusinessDomain)
    if not include_inactive:
        q = q.filter(BusinessDomain.is_active == True)
    domains = q.order_by(BusinessDomain.display_order, BusinessDomain.domain_name).all()
    return [_enrich_domain(d, db) for d in domains]


@router.post("", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
def create_domain(body: DomainCreate, db: Session = Depends(get_db)):
    existing = db.query(BusinessDomain).filter(
        BusinessDomain.domain_code == body.domain_code.upper()
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Domain code '{body.domain_code}' already exists.")

    obj = BusinessDomain(
        domain_code=body.domain_code.upper(),
        domain_name=body.domain_name,
        description=body.description,
        owner=body.owner,
        business_objective=body.business_objective,
        scope_in=body.scope_in,
        scope_out=body.scope_out,
        business_value=body.business_value,
        document_status=body.document_status,
        version=body.version,
        display_order=body.display_order,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _enrich_domain(obj, db)


@router.get("/{id}", response_model=DomainOut)
def get_domain(id: int, db: Session = Depends(get_db)):
    return _enrich_domain(_get_domain(id, db), db)


@router.patch("/{id}", response_model=DomainOut)
def update_domain(id: int, body: DomainUpdate, db: Session = Depends(get_db)):
    obj = _get_domain(id, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return _enrich_domain(obj, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(id: int, db: Session = Depends(get_db)):
    obj = _get_domain(id, db)
    db.delete(obj)
    db.commit()


# ── Subdomain CRUD ────────────────────────────────────────────────────────────

@router.get("/{id}/subdomains", response_model=List[SubdomainOut])
def list_subdomains(id: int, db: Session = Depends(get_db)):
    _get_domain(id, db)
    return (
        db.query(BusinessSubdomain)
        .filter(BusinessSubdomain.domain_id == id)
        .order_by(BusinessSubdomain.display_order, BusinessSubdomain.subdomain_name)
        .all()
    )


@router.post("/{id}/subdomains", response_model=SubdomainOut, status_code=status.HTTP_201_CREATED)
def create_subdomain(id: int, body: SubdomainCreate, db: Session = Depends(get_db)):
    _get_domain(id, db)

    existing = db.query(BusinessSubdomain).filter(
        BusinessSubdomain.domain_id == id,
        BusinessSubdomain.subdomain_code == body.subdomain_code.upper(),
    ).first()
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Subdomain code '{body.subdomain_code}' already exists in this domain.",
        )

    obj = BusinessSubdomain(
        domain_id=id,
        subdomain_code=body.subdomain_code.upper(),
        subdomain_name=body.subdomain_name,
        description=body.description,
        subdomain_type=body.subdomain_type,
        owner=body.owner,
        business_rules=body.business_rules,
        display_order=body.display_order,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{id}/subdomains/{sid}", response_model=SubdomainOut)
def update_subdomain(id: int, sid: int, body: SubdomainUpdate, db: Session = Depends(get_db)):
    _get_domain(id, db)

    obj = db.query(BusinessSubdomain).filter(
        BusinessSubdomain.id == sid,
        BusinessSubdomain.domain_id == id,
    ).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subdomain not found")

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)

    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{id}/subdomains/{sid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subdomain(id: int, sid: int, db: Session = Depends(get_db)):
    _get_domain(id, db)
    obj = db.query(BusinessSubdomain).filter(
        BusinessSubdomain.id == sid,
        BusinessSubdomain.domain_id == id,
    ).first()
    if obj:
        db.delete(obj)
        db.commit()


# ── Requirement ↔ Domain Links ─────────────────────────────────────────────────

@router.get("/requirements/{req_id}/domains", response_model=List[DomainLinkOut])
def list_requirement_domains(req_id: int, db: Session = Depends(get_db)):
    links = db.query(RequirementDomainLink).filter(
        RequirementDomainLink.requirement_id == req_id
    ).all()
    return [_enrich_link(l, db) for l in links]


@router.post("/requirements/{req_id}/domains", response_model=DomainLinkOut, status_code=status.HTTP_201_CREATED)
def link_requirement_domain(req_id: int, body: DomainLinkCreate, db: Session = Depends(get_db)):
    existing = db.query(RequirementDomainLink).filter(
        RequirementDomainLink.requirement_id == req_id,
        RequirementDomainLink.domain_id == body.domain_id,
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "This requirement is already linked to this domain.")

    link = RequirementDomainLink(
        requirement_id=req_id,
        domain_id=body.domain_id,
        subdomain_id=body.subdomain_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return _enrich_link(link, db)


@router.delete("/requirements/{req_id}/domains/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_requirement_domain(req_id: int, link_id: int, db: Session = Depends(get_db)):
    link = db.query(RequirementDomainLink).filter(
        RequirementDomainLink.id == link_id,
        RequirementDomainLink.requirement_id == req_id,
    ).first()
    if link:
        db.delete(link)
        db.commit()


@router.get("/{id}/requirements", response_model=List[dict])
def list_domain_requirements(id: int, db: Session = Depends(get_db)):
    _get_domain(id, db)
    requirements = _get_domain_requirements_data(id, db)
    return [
        {
            "link_id": r["link_id"],
            "requirement_id": r["requirement_id"],
            "requirement_code": r["requirement_code"],
            "requirement_title": r["requirement_title"],
            "requirement_type": r["requirement_type"],
            "lifecycle_status": r["lifecycle_status"],
            "priority": r["priority"],
            "subdomain_code": r["subdomain_code"],
            "subdomain_name": r["subdomain_name"],
        }
        for r in requirements
    ]


# ── Consolidated Documentation / Export ────────────────────────────────────

@router.get("/{id}/export-data", response_model=dict)
def export_domain_data(id: int, db: Session = Depends(get_db)):
    return _build_document_payload(id, db)


@router.get("/{id}/export.md", response_class=PlainTextResponse)
def export_domain_markdown(id: int, db: Session = Depends(get_db)):
    payload = _build_document_payload(id, db)
    return _build_markdown_document(payload)


@router.get("/{id}/export.html", response_class=HTMLResponse)
def export_domain_html(id: int, db: Session = Depends(get_db)):
    payload = _build_document_payload(id, db)
    return _build_html_document(payload)


@router.get("/{id}/export.docx")
def export_domain_docx(id: int, db: Session = Depends(get_db)):
    payload = _build_document_payload(id, db)
    filename = f"{_safe_filename(payload['domain']['domain_code'])}_business_domain.docx"
    return StreamingResponse(
        BytesIO(_build_docx_bytes(payload)),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{id}/export.pdf")
def export_domain_pdf(id: int, db: Session = Depends(get_db)):
    payload = _build_document_payload(id, db)
    filename = f"{_safe_filename(payload['domain']['domain_code'])}_business_domain.pdf"
    return StreamingResponse(
        BytesIO(_build_pdf_bytes(payload)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{id}/export.xlsx")
def export_domain_xlsx(id: int, db: Session = Depends(get_db)):
    payload = _build_document_payload(id, db)
    filename = f"{_safe_filename(payload['domain']['domain_code'])}_business_domain.xlsx"
    return StreamingResponse(
        BytesIO(_build_xlsx_bytes(payload)),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
