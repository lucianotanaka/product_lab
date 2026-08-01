from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.vpc import VPCItem, VPCCanvas, VPCItemLink, VPCType
from app.repositories.base import BaseRepository
from app.schemas.common import Paginated
from pydantic import BaseModel, Field
from datetime import datetime

# ── Canvas Schemas ────────────────────────────────────────────────────────────

class VPCCanvasCreate(BaseModel):
    product_id: str
    name: str = "Canvas Principal"
    description: Optional[str] = None

class VPCCanvasUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class VPCCanvasOut(BaseModel):
    id: str; product_id: str; name: str; description: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

# ── Item Schemas ──────────────────────────────────────────────────────────────

class VPCCreate(BaseModel):
    product_id: str
    type: VPCType
    name: Optional[str] = None
    content: str
    priority: int = Field(default=3, ge=1, le=5)
    canvas_id: Optional[str] = None
    parent_id: Optional[str] = None          # only for pain→job and gain→job

class VPCUpdate(BaseModel):
    type: Optional[VPCType] = None
    name: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[int] = None
    canvas_id: Optional[str] = None
    parent_id: Optional[str] = None

class VPCOut(BaseModel):
    id: str; product_id: str; type: VPCType
    name: Optional[str] = None
    content: str; priority: int
    canvas_id: Optional[str] = None
    parent_id: Optional[str] = None
    created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

# ── Link Schemas ──────────────────────────────────────────────────────────────

class VPCLinkCreate(BaseModel):
    canvas_id: str
    source_id: str   # pain_reliever | gain_creator | product
    target_id: str   # pain           | gain          | job

class VPCLinkOut(BaseModel):
    id: str; canvas_id: str; source_id: str; target_id: str
    created_at: datetime
    class Config: from_attributes = True

# ── Structured Canvas Response ────────────────────────────────────────────────

class VPCItemSlim(BaseModel):
    id: str; type: str
    name: Optional[str] = None
    content: str; priority: int
    parent_id: Optional[str] = None
    class Config: from_attributes = True

class VPCJobNode(BaseModel):
    """A Customer Job with its nested Pains and Gains."""
    job: VPCItemSlim
    pains: list[VPCItemSlim] = []
    gains: list[VPCItemSlim] = []

class VPCVPNode(BaseModel):
    """A Value Proposition item with ALL the CP items it addresses (N:M)."""
    item: VPCItemSlim
    addresses: list[VPCItemSlim] = []   # all linked targets (pain/gain/job)

class VPCStructuredOut(BaseModel):
    canvas_id: str
    canvas_name: str
    # Customer Profile
    jobs: list[VPCJobNode] = []
    orphan_pains: list[VPCItemSlim] = []
    orphan_gains: list[VPCItemSlim] = []
    # Value Proposition
    products: list[VPCVPNode] = []
    pain_relievers: list[VPCVPNode] = []
    gain_creators: list[VPCVPNode] = []

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# NOTE: specific routes MUST be declared BEFORE the generic /{id} route.

# ── Canvas endpoints ──────────────────────────────────────────────────────────

@router.get("/canvas", response_model=list[VPCCanvasOut])
def list_canvases(product_id: Optional[str] = None, db: Session = Depends(get_db)):
    repo = BaseRepository(VPCCanvas, db)
    _, canvases = repo.list(skip=0, limit=200, **({"product_id": product_id} if product_id else {}))
    return [VPCCanvasOut.model_validate(c) for c in canvases]

@router.post("/canvas", response_model=VPCCanvasOut, status_code=status.HTTP_201_CREATED)
def create_canvas(body: VPCCanvasCreate, db: Session = Depends(get_db)):
    return BaseRepository(VPCCanvas, db).create(body.model_dump())

@router.get("/canvas/{canvas_id}/structured", response_model=VPCStructuredOut)
def get_canvas_structured(canvas_id: str, db: Session = Depends(get_db)):
    """Returns all items organised in a tree, resolving N:M links from vpc_item_links."""
    canvas = BaseRepository(VPCCanvas, db).get_or_404(canvas_id)
    _, all_items = BaseRepository(VPCItem, db).list(skip=0, limit=1000, canvas_id=canvas_id)

    # Index items by id
    by_id: dict = {i.id: i for i in all_items}

    jobs_raw      = [i for i in all_items if i.type == VPCType.job]
    pains_raw     = [i for i in all_items if i.type == VPCType.pain]
    gains_raw     = [i for i in all_items if i.type == VPCType.gain]
    products_raw  = [i for i in all_items if i.type == VPCType.product]
    relievers_raw = [i for i in all_items if i.type == VPCType.pain_reliever]
    creators_raw  = [i for i in all_items if i.type == VPCType.gain_creator]

    job_ids = {j.id for j in jobs_raw}

    # Load all N:M links for this canvas
    links_raw = db.query(VPCItemLink).filter(VPCItemLink.canvas_id == canvas_id).all()
    links_by_source: dict[str, list[str]] = {}
    for lnk in links_raw:
        links_by_source.setdefault(lnk.source_id, []).append(lnk.target_id)

    # Build job nodes (pains/gains still use parent_id 1:1)
    job_nodes = []
    for job in sorted(jobs_raw, key=lambda x: -x.priority):
        job_nodes.append(VPCJobNode(
            job=VPCItemSlim.model_validate(job),
            pains=[VPCItemSlim.model_validate(p) for p in sorted(pains_raw, key=lambda x: -x.priority) if p.parent_id == job.id],
            gains=[VPCItemSlim.model_validate(g) for g in sorted(gains_raw, key=lambda x: -x.priority) if g.parent_id == job.id],
        ))

    orphan_pains = [VPCItemSlim.model_validate(p) for p in pains_raw if p.parent_id not in job_ids]
    orphan_gains = [VPCItemSlim.model_validate(g) for g in gains_raw if g.parent_id not in job_ids]

    def vp_node(item) -> VPCVPNode:
        target_ids = links_by_source.get(item.id, [])
        # Backward compat: if no link records but has parent_id, use it
        if not target_ids and item.parent_id:
            target_ids = [item.parent_id]
        return VPCVPNode(
            item=VPCItemSlim.model_validate(item),
            addresses=[VPCItemSlim.model_validate(by_id[tid]) for tid in target_ids if tid in by_id],
        )

    return VPCStructuredOut(
        canvas_id=canvas.id,
        canvas_name=canvas.name,
        jobs=job_nodes,
        orphan_pains=orphan_pains,
        orphan_gains=orphan_gains,
        products=[vp_node(i) for i in sorted(products_raw, key=lambda x: -x.priority)],
        pain_relievers=[vp_node(i) for i in sorted(relievers_raw, key=lambda x: -x.priority)],
        gain_creators=[vp_node(i) for i in sorted(creators_raw, key=lambda x: -x.priority)],
    )

@router.get("/canvas/{canvas_id}", response_model=VPCCanvasOut)
def get_canvas(canvas_id: str, db: Session = Depends(get_db)):
    return BaseRepository(VPCCanvas, db).get_or_404(canvas_id)

@router.patch("/canvas/{canvas_id}", response_model=VPCCanvasOut)
def update_canvas(canvas_id: str, body: VPCCanvasUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(VPCCanvas, db)
    return repo.update(repo.get_or_404(canvas_id), body.model_dump(exclude_unset=True))

@router.delete("/canvas/{canvas_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_canvas(canvas_id: str, db: Session = Depends(get_db)):
    repo = BaseRepository(VPCCanvas, db)
    repo.delete(repo.get_or_404(canvas_id))

# ── Link endpoints (MUST come before /{id}) ───────────────────────────────────

@router.post("/links", response_model=VPCLinkOut, status_code=status.HTTP_201_CREATED)
def create_link(body: VPCLinkCreate, db: Session = Depends(get_db)):
    """Create a N:M link between a VP item and a CP item."""
    existing = db.query(VPCItemLink).filter(
        VPCItemLink.source_id == body.source_id,
        VPCItemLink.target_id == body.target_id,
    ).first()
    if existing:
        return VPCLinkOut.model_validate(existing)
    link = VPCItemLink(
        canvas_id=body.canvas_id,
        source_id=body.source_id,
        target_id=body.target_id,
    )
    db.add(link); db.commit(); db.refresh(link)
    return VPCLinkOut.model_validate(link)

@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: str, db: Session = Depends(get_db)):
    link = db.query(VPCItemLink).filter(VPCItemLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link); db.commit()

@router.get("/items/{item_id}/links", response_model=list[VPCLinkOut])
def list_item_links(item_id: str, db: Session = Depends(get_db)):
    """Return all N:M links where this item is the source."""
    links = db.query(VPCItemLink).filter(VPCItemLink.source_id == item_id).all()
    return [VPCLinkOut.model_validate(l) for l in links]

# ── Item endpoints ────────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_items(
    page: int = 1, size: int = 100,
    product_id: Optional[str] = None,
    canvas_id: Optional[str] = None,
    type: Optional[VPCType] = None,
    db: Session = Depends(get_db)
):
    repo = BaseRepository(VPCItem, db)
    filters = {}
    if product_id: filters["product_id"] = product_id
    if canvas_id:  filters["canvas_id"]  = canvas_id
    if type:       filters["type"]        = type
    total, items = repo.list(skip=(page - 1) * size, limit=size, **filters)
    return {"total": total, "page": page, "size": size, "items": [VPCOut.model_validate(i) for i in items]}

@router.post("", response_model=VPCOut, status_code=status.HTTP_201_CREATED)
def create_item(body: VPCCreate, db: Session = Depends(get_db)):
    return BaseRepository(VPCItem, db).create(body.model_dump())

@router.get("/{id}", response_model=VPCOut)
def get_item(id: str, db: Session = Depends(get_db)):
    return BaseRepository(VPCItem, db).get_or_404(id)

@router.patch("/{id}", response_model=VPCOut)
def update_item(id: str, body: VPCUpdate, db: Session = Depends(get_db)):
    repo = BaseRepository(VPCItem, db)
    return repo.update(repo.get_or_404(id), body.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(id: str, db: Session = Depends(get_db)):
    repo = BaseRepository(VPCItem, db)
    repo.delete(repo.get_or_404(id))
