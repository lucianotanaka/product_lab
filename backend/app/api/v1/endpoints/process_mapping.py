from typing import Optional, List, Any, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.process_mapping import Process, ProcessNode, ProcessEdge, ProcessNodeRelation
from app.schemas.common import Paginated

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

PROCESS_TYPES    = ["AS_IS", "TO_BE"]
PROCESS_STATUSES = ["DRAFT", "VALIDATED", "APPROVED", "ARCHIVED"]
NODE_TYPES       = ["START", "ACTIVITY", "DECISION", "END", "SUBPROCESS", "SYSTEM", "WAIT", "HANDOFF"]
EDGE_TYPES       = ["SEQUENCE", "CONDITIONAL", "DEFAULT", "EXCEPTION"]
NODE_ENTITY_TYPES= ["REQUIREMENT", "FEATURE", "USER_STORY", "RISK", "INSIGHT", "VPC_PAIN", "VPC_GAIN", "RESEARCH"]


# ── Schemas ────────────────────────────────────────────────────────────────────

class ProcessCreate(BaseModel):
    product_id: Optional[int] = None
    business_area_id: Optional[int] = None
    process_name: str
    process_description: Optional[str] = None
    process_version: str = "1.0"
    process_type: str = "AS_IS"
    process_status: str = "DRAFT"
    process_owner: Optional[str] = None
    process_trigger: Optional[str] = None
    process_outcome: Optional[str] = None


class ProcessUpdate(BaseModel):
    process_name: Optional[str] = None
    process_description: Optional[str] = None
    process_version: Optional[str] = None
    process_type: Optional[str] = None
    process_status: Optional[str] = None
    process_owner: Optional[str] = None
    process_trigger: Optional[str] = None
    process_outcome: Optional[str] = None
    business_area_id: Optional[int] = None


class ProcessOut(BaseModel):
    id: int
    product_id: Optional[int]
    business_area_id: Optional[int]
    process_name: str
    process_description: Optional[str]
    process_version: str
    process_type: str
    process_status: str
    process_owner: Optional[str]
    process_trigger: Optional[str]
    process_outcome: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class NodeCreate(BaseModel):
    node_type: str
    node_title: str
    node_description: Optional[str] = None
    role_name: Optional[str] = None
    business_area_id: Optional[int] = None
    system_name: Optional[str] = None
    duration_minutes: Optional[float] = None
    is_manual: bool = False
    is_bottleneck: bool = False
    x_position: float = 0
    y_position: float = 0
    width: Optional[float] = None
    height: Optional[float] = None
    display_order: Optional[int] = None


class NodeUpdate(BaseModel):
    node_title: Optional[str] = None
    node_description: Optional[str] = None
    node_type: Optional[str] = None
    role_name: Optional[str] = None
    business_area_id: Optional[int] = None
    system_name: Optional[str] = None
    duration_minutes: Optional[float] = None
    is_manual: Optional[bool] = None
    is_bottleneck: Optional[bool] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    display_order: Optional[int] = None


class NodeOut(BaseModel):
    id: int
    process_id: int
    node_type: str
    node_title: str
    node_description: Optional[str]
    role_name: Optional[str]
    business_area_id: Optional[int]
    system_name: Optional[str]
    duration_minutes: Optional[float]
    is_manual: bool
    is_bottleneck: bool
    x_position: float
    y_position: float
    width: Optional[float]
    height: Optional[float]
    display_order: Optional[int]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class EdgeCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    edge_label: Optional[str] = None
    edge_type: str = "SEQUENCE"
    condition_expression: Optional[str] = None
    sequence_order: Optional[int] = None


class EdgeUpdate(BaseModel):
    edge_label: Optional[str] = None
    edge_type: Optional[str] = None
    condition_expression: Optional[str] = None
    sequence_order: Optional[int] = None


class EdgeOut(BaseModel):
    id: int
    process_id: int
    source_node_id: int
    target_node_id: int
    edge_label: Optional[str]
    edge_type: str
    condition_expression: Optional[str]
    sequence_order: Optional[int]
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class NodeRelationCreate(BaseModel):
    entity_type: str
    entity_id: int
    relation_type: Optional[str] = None
    notes: Optional[str] = None


class NodeRelationOut(BaseModel):
    id: int; node_id: int; entity_type: str; entity_id: int
    relation_type: Optional[str]; notes: Optional[str]; created_at: datetime
    class Config: from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_process(id: int, db: Session) -> Process:
    obj = db.get(Process, id)
    if not obj or obj.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Process not found")
    return obj


def _get_node(process_id: int, node_id: int, db: Session) -> ProcessNode:
    obj = db.get(ProcessNode, node_id)
    if not obj or obj.process_id != process_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Node not found")
    return obj


def _get_edge(process_id: int, edge_id: int, db: Session) -> ProcessEdge:
    obj = db.get(ProcessEdge, edge_id)
    if not obj or obj.process_id != process_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Edge not found")
    return obj


# ── Process CRUD ──────────────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
def list_processes(
    page: int = 1, size: int = 20,
    product_id: Optional[int] = None,
    process_type: Optional[str] = None,
    process_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Process).filter(Process.is_deleted == False)
    if product_id:     q = q.filter(Process.product_id == product_id)
    if process_type:   q = q.filter(Process.process_type == process_type)
    if process_status: q = q.filter(Process.process_status == process_status)
    total = q.count()
    items = q.order_by(Process.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size,
            "items": [ProcessOut.model_validate(i) for i in items]}


@router.post("", response_model=ProcessOut, status_code=status.HTTP_201_CREATED)
def create_process(body: ProcessCreate, db: Session = Depends(get_db)):
    obj = Process(**body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.get("/{id}", response_model=ProcessOut)
def get_process(id: int, db: Session = Depends(get_db)):
    return _get_process(id, db)


@router.patch("/{id}", response_model=ProcessOut)
def update_process(id: int, body: ProcessUpdate, db: Session = Depends(get_db)):
    obj = _get_process(id, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_process(id: int, db: Session = Depends(get_db)):
    obj = _get_process(id, db)
    obj.is_deleted = True
    db.commit()


# ── Graph (nodes + edges in one call for React Flow) ─────────────────────────

@router.get("/{id}/graph")
def get_graph(id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    _get_process(id, db)
    nodes = db.query(ProcessNode).filter(ProcessNode.process_id == id).all()
    edges = db.query(ProcessEdge).filter(ProcessEdge.process_id == id).all()
    return {
        "nodes": [NodeOut.model_validate(n) for n in nodes],
        "edges": [EdgeOut.model_validate(e) for e in edges],
    }


# ── Nodes ─────────────────────────────────────────────────────────────────────

@router.get("/{id}/nodes", response_model=List[NodeOut])
def list_nodes(id: int, db: Session = Depends(get_db)):
    _get_process(id, db)
    return db.query(ProcessNode).filter(ProcessNode.process_id == id).all()


@router.post("/{id}/nodes", response_model=NodeOut, status_code=status.HTTP_201_CREATED)
def create_node(id: int, body: NodeCreate, db: Session = Depends(get_db)):
    _get_process(id, db)
    if body.node_type not in NODE_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"node_type must be one of {NODE_TYPES}")
    obj = ProcessNode(process_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/nodes/{nid}", response_model=NodeOut)
def update_node(id: int, nid: int, body: NodeUpdate, db: Session = Depends(get_db)):
    obj = _get_node(id, nid, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/nodes/{nid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(id: int, nid: int, db: Session = Depends(get_db)):
    obj = _get_node(id, nid, db)
    db.delete(obj); db.commit()


# ── Edges ─────────────────────────────────────────────────────────────────────

@router.get("/{id}/edges", response_model=List[EdgeOut])
def list_edges(id: int, db: Session = Depends(get_db)):
    _get_process(id, db)
    return db.query(ProcessEdge).filter(ProcessEdge.process_id == id).all()


@router.post("/{id}/edges", response_model=EdgeOut, status_code=status.HTTP_201_CREATED)
def create_edge(id: int, body: EdgeCreate, db: Session = Depends(get_db)):
    _get_process(id, db)
    if body.source_node_id == body.target_node_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "source_node_id and target_node_id must differ")
    # validate nodes belong to this process
    _get_node(id, body.source_node_id, db)
    _get_node(id, body.target_node_id, db)
    obj = ProcessEdge(process_id=id, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.patch("/{id}/edges/{eid}", response_model=EdgeOut)
def update_edge(id: int, eid: int, body: EdgeUpdate, db: Session = Depends(get_db)):
    obj = _get_edge(id, eid, db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/edges/{eid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(id: int, eid: int, db: Session = Depends(get_db)):
    obj = _get_edge(id, eid, db)
    db.delete(obj); db.commit()


# ── Node Relations ────────────────────────────────────────────────────────────

@router.get("/{id}/nodes/{nid}/relations", response_model=List[NodeRelationOut])
def list_node_relations(id: int, nid: int, db: Session = Depends(get_db)):
    _get_node(id, nid, db)
    return db.query(ProcessNodeRelation).filter(ProcessNodeRelation.node_id == nid).all()


@router.post("/{id}/nodes/{nid}/relations", response_model=NodeRelationOut,
             status_code=status.HTTP_201_CREATED)
def add_node_relation(id: int, nid: int, body: NodeRelationCreate, db: Session = Depends(get_db)):
    _get_node(id, nid, db)
    if body.entity_type not in NODE_ENTITY_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"entity_type must be one of {NODE_ENTITY_TYPES}")
    obj = ProcessNodeRelation(node_id=nid, **body.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@router.delete("/{id}/nodes/{nid}/relations/{rid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node_relation(id: int, nid: int, rid: int, db: Session = Depends(get_db)):
    _get_node(id, nid, db)
    obj = db.get(ProcessNodeRelation, rid)
    if not obj or obj.node_id != nid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Relation not found")
    db.delete(obj); db.commit()
