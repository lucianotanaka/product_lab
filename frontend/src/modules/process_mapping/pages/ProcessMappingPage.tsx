import { useEffect, useState, useCallback } from "react";
import { ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  type NodeChange,
  MarkerType, Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Proc { id:number; product_id:number|null; process_name:string; process_description:string|null; process_version:string; process_type:string; process_status:string; process_owner:string|null; process_trigger:string|null; process_outcome:string|null; created_at:string; updated_at:string; }
interface PNode { id:number; process_id:number; node_type:string; node_title:string; node_description:string|null; role_name:string|null; system_name:string|null; duration_minutes:number|null; is_manual:boolean; is_bottleneck:boolean; x_position:number; y_position:number; }
interface PEdge { id:number; process_id:number; source_node_id:number; target_node_id:number; edge_label:string|null; edge_type:string; }

const PROC_TYPES   = ["AS_IS","TO_BE"];
const PROC_STATUS  = ["DRAFT","VALIDATED","APPROVED","ARCHIVED"];
const NODE_TYPES_L = ["START","ACTIVITY","DECISION","END","SUBPROCESS","SYSTEM","WAIT","HANDOFF"];
const EDGE_TYPES_L = ["SEQUENCE","CONDITIONAL","DEFAULT","EXCEPTION"];

const EMPTY_P = { process_name:"", process_description:"", process_version:"1.0", process_type:"AS_IS", process_status:"DRAFT", process_owner:"", process_trigger:"", process_outcome:"" };
const EMPTY_N = { node_type:"ACTIVITY", node_title:"", node_description:"", role_name:"", system_name:"", duration_minutes:"", is_manual:false, is_bottleneck:false };

// ── Node appearance ───────────────────────────────────────────────────────────
const NODE_COLORS: Record<string,string> = {
  START:"#00ff88", END:"#ff4444", DECISION:"#ff9900", ACTIVITY:"#00d4ff",
  SUBPROCESS:"#c084fc", SYSTEM:"#00e5cc", WAIT:"#7899b0", HANDOFF:"#ffcc44",
};
const NODE_SHAPES: Record<string,string> = {
  START:"●", END:"■", DECISION:"◆", ACTIVITY:"▣",
  SUBPROCESS:"⬡", SYSTEM:"⚙", WAIT:"⏳", HANDOFF:"↔",
};

function buildRFNodes(pnodes: PNode[]): Node[] {
  return pnodes.map(n => ({
    id: String(n.id),
    position: { x: Number(n.x_position), y: Number(n.y_position) },
    data: {
      label: (
        <div style={{ textAlign:"center", padding:"4px 8px", minWidth:80 }}>
          <div style={{ fontSize:16, color:NODE_COLORS[n.node_type]??"#00d4ff" }}>{NODE_SHAPES[n.node_type]??"◈"}</div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"#e0eaff", marginTop:2 }}>{n.node_title}</div>
          {n.role_name&&<div style={{ fontSize:8, color:"#7899b0", marginTop:1 }}>{n.role_name}</div>}
          {n.is_bottleneck&&<div style={{ fontSize:8, color:"#ff4444", marginTop:1 }}>⚠ GARGALO</div>}
          {n.is_manual&&<div style={{ fontSize:8, color:"#ff9900", marginTop:1 }}>MANUAL</div>}
        </div>
      ),
      raw: n,
    },
    style: {
      background:"rgba(6,10,20,0.9)",
      border:`1.5px solid ${NODE_COLORS[n.node_type]??"#00d4ff"}44`,
      borderRadius: n.node_type==="DECISION"?4:n.node_type==="START"||n.node_type==="END"?20:4,
      color:"#e0eaff",
      fontSize:11,
      boxShadow:`0 0 8px ${NODE_COLORS[n.node_type]??"#00d4ff"}33`,
    },
  }));
}

function buildRFEdges(pedges: PEdge[]): Edge[] {
  return pedges.map(e => ({
    id: String(e.id),
    source: String(e.source_node_id),
    target: String(e.target_node_id),
    label: e.edge_label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, color:"#00d4ff" },
    style: { stroke: e.edge_type==="CONDITIONAL"?"#ff9900":e.edge_type==="EXCEPTION"?"#ff4444":"#00d4ff", strokeWidth:1.5 },
    labelStyle: { fill:"#7899b0", fontSize:9 },
    data: { raw: e },
  }));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProcessMappingPage() {
  const [pid, setPid] = useState(localStorage.getItem("pl_product")??"");
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [selProc, setSelProc]     = useState<Proc|null>(null);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");

  // Process modal
  const [procModal, setProcModal] = useState<"create"|"edit"|null>(null);
  const [procForm, setProcForm]   = useState({...EMPTY_P});
  const [savingProc, setSavingProc] = useState(false);

  // React Flow state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  // Node toolbar
  const [addNodeType, setAddNodeType] = useState("ACTIVITY");
  const [nodeModal, setNodeModal]     = useState<"add"|"edit"|null>(null);
  const [nodeForm, setNodeForm]       = useState({...EMPTY_N});
  const [editingNode, setEditingNode] = useState<PNode|null>(null);
  const [savingNode, setSavingNode]   = useState(false);

  // Edge modal
  const [edgeModal, setEdgeModal]   = useState(false);
  const [pendingConn, setPendingConn] = useState<Connection|null>(null);
  const [edgeLabel, setEdgeLabel]   = useState("");
  const [edgeType, setEdgeType]     = useState("SEQUENCE");
  const [savingEdge, setSavingEdge] = useState(false);

  const loadProcesses = async (id=pid) => {
    setLoading(true); setErr("");
    try {
      const r = await apiGet<Paginated<Proc>>(`/processes?size=100${id?`&product_id=${id}`:""}`);
      setProcesses(r.items);
    } catch(e:unknown) { setErr(e instanceof Error?e.message:"Erro"); }
    finally { setLoading(false); }
  };

  const loadGraph = async (proc: Proc) => {
    setGraphLoading(true);
    try {
      const g = await apiGet<{nodes:PNode[];edges:PEdge[]}>(`/processes/${proc.id}/graph`);
      setRfNodes(buildRFNodes(g.nodes));
      setRfEdges(buildRFEdges(g.edges));
    } catch { setRfNodes([]); setRfEdges([]); }
    finally { setGraphLoading(false); }
  };

  useEffect(() => { loadProcesses(pid); setSelProc(null); setRfNodes([]); setRfEdges([]); }, [pid]);

  const changePid = (id:string) => { localStorage.setItem("pl_product",id); setPid(id); };

  const selectProcess = (p: Proc) => { setSelProc(p); loadGraph(p); };

  // ── Process CRUD ──────────────────────────────────────────────────────────
  const openCreateProc = () => { setProcForm({...EMPTY_P}); setProcModal("create"); };
  const openEditProc = (p:Proc) => {
    setProcForm({ process_name:p.process_name, process_description:p.process_description??"", process_version:p.process_version, process_type:p.process_type, process_status:p.process_status, process_owner:p.process_owner??"", process_trigger:p.process_trigger??"", process_outcome:p.process_outcome??"" });
    setProcModal("edit");
  };

  const saveProc = async () => {
    if (!procForm.process_name.trim()) return;
    setSavingProc(true);
    try {
      const body = { ...procForm, product_id: pid?Number(pid):null };
      if (procModal==="create") {
        const created = await apiPost<Proc>("/processes", body);
        await loadProcesses(pid);
        selectProcess(created);
      } else if (selProc) {
        await apiPatch(`/processes/${selProc.id}`, procForm);
        await loadProcesses(pid);
      }
      setProcModal(null);
    } catch(e:unknown) { setErr(e instanceof Error?e.message:"Erro"); }
    finally { setSavingProc(false); }
  };

  const deleteProc = async () => {
    if (!selProc||!confirm(`Excluir processo "${selProc.process_name}"?`)) return;
    try { await apiDelete(`/processes/${selProc.id}`); setSelProc(null); setRfNodes([]); setRfEdges([]); loadProcesses(pid); }
    catch(e:unknown) { setErr(e instanceof Error?e.message:"Erro"); }
  };

  // ── Node CRUD ─────────────────────────────────────────────────────────────
  const openAddNode = () => { setNodeForm({...EMPTY_N, node_type:addNodeType}); setEditingNode(null); setNodeModal("add"); };

  const saveNode = async () => {
    if (!selProc||!nodeForm.node_title.trim()) return;
    setSavingNode(true);
    try {
      if (nodeModal==="add") {
        const body = { node_type:nodeForm.node_type, node_title:nodeForm.node_title, node_description:nodeForm.node_description||null, role_name:nodeForm.role_name||null, system_name:nodeForm.system_name||null, duration_minutes:nodeForm.duration_minutes?Number(nodeForm.duration_minutes):null, is_manual:nodeForm.is_manual, is_bottleneck:nodeForm.is_bottleneck, x_position: rfNodes.length*160, y_position: 80 };
        await apiPost(`/processes/${selProc.id}/nodes`, body);
      } else if (editingNode) {
        await apiPatch(`/processes/${selProc.id}/nodes/${editingNode.id}`, { node_title:nodeForm.node_title, node_description:nodeForm.node_description||null, role_name:nodeForm.role_name||null, system_name:nodeForm.system_name||null, duration_minutes:nodeForm.duration_minutes?Number(nodeForm.duration_minutes):null, is_manual:nodeForm.is_manual, is_bottleneck:nodeForm.is_bottleneck });
      }
      setNodeModal(null); loadGraph(selProc);
    } catch(e:unknown) { setErr(e instanceof Error?e.message:"Erro"); }
    finally { setSavingNode(false); }
  };

  const deleteNode = async (nid:number) => {
    if (!selProc||!confirm("Excluir nó? Todas as conexões serão removidas.")) return;
    try { await apiDelete(`/processes/${selProc.id}/nodes/${nid}`); loadGraph(selProc); }
    catch(e:unknown) { setErr(e instanceof Error?e.message:"Erro"); }
  };

  // ── Node position persist on drag ─────────────────────────────────────────
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    changes.forEach(async (ch) => {
      if (ch.type==="position" && !ch.dragging && selProc && ch.position) {
        const nid = Number(ch.id);
        try { await apiPatch(`/processes/${selProc.id}/nodes/${nid}`, { x_position:ch.position.x, y_position:ch.position.y }); }
        catch { /* silently ignore */ }
      }
    });
  }, [selProc, onNodesChange]);

  // ── Connect handler ───────────────────────────────────────────────────────
  const handleConnect = useCallback((conn: Connection) => {
    setPendingConn(conn); setEdgeLabel(""); setEdgeType("SEQUENCE"); setEdgeModal(true);
  }, []);

  const saveEdge = async () => {
    if (!selProc||!pendingConn) return;
    setSavingEdge(true);
    try {
      await apiPost(`/processes/${selProc.id}/edges`, { source_node_id:Number(pendingConn.source), target_node_id:Number(pendingConn.target), edge_label:edgeLabel||null, edge_type:edgeType });
      setEdgeModal(false); loadGraph(selProc);
    } catch(e:unknown) { setErr(e instanceof Error?e.message:"Erro"); }
    finally { setSavingEdge(false); }
  };

  const deleteEdge = async (eid:number) => {
    if (!selProc||!confirm("Remover conexão?")) return;
    try { await apiDelete(`/processes/${selProc.id}/edges/${eid}`); loadGraph(selProc); }
    catch { /* ignore */ }
  };

  // ── Node click → edit ─────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const raw = (node.data as {raw:PNode}).raw;
    setNodeForm({ node_type:raw.node_type, node_title:raw.node_title, node_description:raw.node_description??"", role_name:raw.role_name??"", system_name:raw.system_name??"", duration_minutes:raw.duration_minutes?String(raw.duration_minutes):"", is_manual:raw.is_manual, is_bottleneck:raw.is_bottleneck });
    setEditingNode(raw); setNodeModal("edit");
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const raw = (edge.data as {raw:PEdge}).raw;
    deleteEdge(raw.id);
  }, [selProc]);

  const statusColor=(s:string)=>s==="APPROVED"?"#00ff88":s==="VALIDATED"?"#00d4ff":s==="ARCHIVED"?"#555":"#ff9900";
  const typeColor=(t:string)=>t==="AS_IS"?"#00d4ff":"#c084fc";

  const NF=(lbl:string,ch:React.ReactNode)=><div className="mod-field"><label className="mod-field__label">{lbl}</label>{ch}</div>;

  return (
    <ModuleLayout moduleIcon="⬡" moduleName="PROCESS" moduleAccent="MAPPING" selectedProductId={pid} onProductChange={changePid}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// PROCESS MAPPING //</span>
          <h1 className="mod-header__title">PROCESS <span>MAPPING</span></h1>
          <p className="mod-header__meta">{processes.length} processo(s)</p>
        </div>
        <button className="btn-add" onClick={openCreateProc}>+ NOVO PROCESSO</button>
      </div>

      {err&&<div className="mod-error">⚠ {err}</div>}

      <div style={{display:"flex",gap:12,height:"calc(100vh - 220px)",minHeight:500}}>
        {/* PROCESS LIST */}
        <div style={{width:240,minWidth:200,display:"flex",flexDirection:"column",gap:6,overflowY:"auto"}}>
          <div style={{fontSize:9,color:"#7899b0",letterSpacing:2,marginBottom:4}}>// PROCESSOS //</div>
          {loading?<div className="mod-loading" style={{fontSize:10}}>CARREGANDO...</div>
          :processes.length===0?<div style={{color:"#7899b0",fontSize:10,padding:"8px 0"}}>Nenhum processo. Crie o primeiro.</div>
          :processes.map(p=>(
            <div key={p.id} onClick={()=>selectProcess(p)} style={{padding:"8px 10px",background:selProc?.id===p.id?"rgba(0,212,255,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${selProc?.id===p.id?"rgba(0,212,255,0.4)":"rgba(0,212,255,0.1)"}`,borderRadius:4,cursor:"pointer",transition:"all .15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:9,color:typeColor(p.process_type),letterSpacing:1}}>{p.process_type}</span>
                <span style={{fontSize:8,color:statusColor(p.process_status)}}>{p.process_status}</span>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:"#e0eaff",letterSpacing:.5}}>{p.process_name}</div>
              <div style={{fontSize:9,color:"#7899b0",marginTop:2}}>v{p.process_version}{p.process_owner?` · ${p.process_owner}`:""}</div>
            </div>
          ))}
        </div>

        {/* CANVAS AREA */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:0,minWidth:0}}>
          {!selProc?(
            <div className="mod-empty" style={{flex:1}}><div className="mod-empty__icon">⬡</div><div className="mod-empty__title">SELECIONE UM PROCESSO</div><div className="mod-empty__sub">Escolha um processo na lista ou crie um novo</div></div>
          ):(
            <>
              {/* Toolbar */}
              <div style={{display:"flex",gap:8,alignItems:"center",padding:"8px 12px",background:"rgba(6,10,20,0.9)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:"4px 4px 0 0",flexWrap:"wrap"}}>
                <div style={{display:"flex",flexDirection:"column"}}>
                  <span style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>{selProc.process_type} · {selProc.process_status}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#e0eaff"}}>{selProc.process_name}</span>
                </div>
                <div style={{flex:1}}/>
                <select className="mod-select" style={{fontSize:9}} value={addNodeType} onChange={e=>setAddNodeType(e.target.value)}>
                  {NODE_TYPES_L.map(t=><option key={t} value={t}>{NODE_SHAPES[t]} {t}</option>)}
                </select>
                <button className="btn-icon" onClick={openAddNode}>+ NÓ</button>
                <button className="btn-icon" onClick={()=>openEditProc(selProc)}>EDITAR</button>
                <button className="btn-icon btn-icon--danger" onClick={deleteProc}>DEL</button>
              </div>

              {/* React Flow Canvas */}
              <div style={{flex:1,position:"relative",background:"#060a14",border:"1px solid rgba(0,212,255,0.1)",borderTop:"none",borderRadius:"0 0 4px 4px"}}>
                {graphLoading&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"#00d4ff",fontSize:11,letterSpacing:2,zIndex:10}}>CARREGANDO GRAFO...</div>}
                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={handleConnect}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  fitView
                  style={{background:"#060a14"}}
                  deleteKeyCode={null}
                >
                  <Background color="#0d1829" gap={24} size={1}/>
                  <Controls style={{background:"rgba(6,10,20,0.9)",border:"1px solid rgba(0,212,255,0.2)"}}/>
                  <MiniMap style={{background:"rgba(6,10,20,0.9)",border:"1px solid rgba(0,212,255,0.15)"}} nodeColor={n=>{const raw=(n.data as {raw:PNode}).raw;return NODE_COLORS[raw?.node_type]??"#00d4ff";}}/>
                  <Panel position="top-right" style={{fontSize:9,color:"#7899b0",background:"rgba(6,10,20,0.8)",padding:"6px 10px",borderRadius:4,border:"1px solid rgba(0,212,255,0.1)"}}>
                    <div>CONECTAR: arraste de uma porta</div>
                    <div>MOVER: arraste o nó</div>
                    <div>EDITAR: clique no nó</div>
                    <div>REMOVER ARESTA: clique na seta</div>
                  </Panel>
                </ReactFlow>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PROCESS MODAL */}
      {procModal&&(
        <div className="mod-overlay" onClick={()=>setProcModal(null)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// PROCESSO //</span><h3 className="mod-modal__title">{procModal==="create"?"NOVO":"EDITAR"} <span>PROCESSO</span></h3></div>
              <button className="mod-modal__close" onClick={()=>setProcModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              {NF("NOME *",<input className="mod-input" value={procForm.process_name} onChange={e=>setProcForm(f=>({...f,process_name:e.target.value}))} placeholder="Nome do processo" />)}
              {NF("DESCRIÇÃO",<textarea className="mod-textarea" value={procForm.process_description} onChange={e=>setProcForm(f=>({...f,process_description:e.target.value}))} rows={2} placeholder="Descreva o processo..." />)}
              <div className="mod-field-row">
                {NF("TIPO",<select className="mod-select" value={procForm.process_type} onChange={e=>setProcForm(f=>({...f,process_type:e.target.value}))}>{PROC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>)}
                {NF("STATUS",<select className="mod-select" value={procForm.process_status} onChange={e=>setProcForm(f=>({...f,process_status:e.target.value}))}>{PROC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select>)}
                {NF("VERSÃO",<input className="mod-input" value={procForm.process_version} onChange={e=>setProcForm(f=>({...f,process_version:e.target.value}))} placeholder="1.0" />)}
              </div>
              {NF("RESPONSÁVEL",<input className="mod-input" value={procForm.process_owner} onChange={e=>setProcForm(f=>({...f,process_owner:e.target.value}))} placeholder="Nome do responsável" />)}
              {NF("GATILHO",<input className="mod-input" value={procForm.process_trigger} onChange={e=>setProcForm(f=>({...f,process_trigger:e.target.value}))} placeholder="O que dispara este processo?" />)}
              {NF("RESULTADO ESPERADO",<input className="mod-input" value={procForm.process_outcome} onChange={e=>setProcForm(f=>({...f,process_outcome:e.target.value}))} placeholder="Qual o resultado esperado?" />)}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setProcModal(null)}>CANCELAR</button>
              <button className="btn-save" onClick={saveProc} disabled={savingProc||!procForm.process_name.trim()}>{savingProc?"SALVANDO...":"SALVAR ⟩"}</button>
            </div>
          </div>
        </div>
      )}

      {/* NODE MODAL */}
      {nodeModal&&(
        <div className="mod-overlay" onClick={()=>setNodeModal(null)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// NÓ DO PROCESSO //</span><h3 className="mod-modal__title">{nodeModal==="add"?"NOVO":"EDITAR"} <span>NÓ</span></h3></div>
              <button className="mod-modal__close" onClick={()=>setNodeModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                {NF("TIPO",<select className="mod-select" value={nodeForm.node_type} onChange={e=>setNodeForm(f=>({...f,node_type:e.target.value}))} disabled={nodeModal==="edit"}>{NODE_TYPES_L.map(t=><option key={t} value={t}>{NODE_SHAPES[t]} {t}</option>)}</select>)}
                {NF("TÍTULO *",<input className="mod-input" value={nodeForm.node_title} onChange={e=>setNodeForm(f=>({...f,node_title:e.target.value}))} placeholder="Título do nó" />)}
              </div>
              {NF("DESCRIÇÃO",<textarea className="mod-textarea" value={nodeForm.node_description} onChange={e=>setNodeForm(f=>({...f,node_description:e.target.value}))} rows={2} placeholder="Descrição opcional..." />)}
              <div className="mod-field-row">
                {NF("PAPEL / EQUIPE",<input className="mod-input" value={nodeForm.role_name} onChange={e=>setNodeForm(f=>({...f,role_name:e.target.value}))} placeholder="Ex: Analista, Time XYZ" />)}
                {NF("SISTEMA / FERRAMENTA",<input className="mod-input" value={nodeForm.system_name} onChange={e=>setNodeForm(f=>({...f,system_name:e.target.value}))} placeholder="Ex: SAP, Salesforce" />)}
              </div>
              {NF("DURAÇÃO (minutos)",<input className="mod-input" type="number" min="0" value={nodeForm.duration_minutes} onChange={e=>setNodeForm(f=>({...f,duration_minutes:e.target.value}))} placeholder="Ex: 30" />)}
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label" style={{display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={nodeForm.is_manual} onChange={e=>setNodeForm(f=>({...f,is_manual:e.target.checked}))} /> MANUAL</label></div>
                <div className="mod-field"><label className="mod-field__label" style={{display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={nodeForm.is_bottleneck} onChange={e=>setNodeForm(f=>({...f,is_bottleneck:e.target.checked}))} /> <span style={{color:"#ff9900"}}>⚠ GARGALO</span></label></div>
              </div>
              {nodeModal==="edit"&&editingNode&&(
                <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,68,68,0.2)"}}>
                  <button className="btn-icon btn-icon--danger" onClick={()=>{setNodeModal(null);deleteNode(editingNode.id);}}>EXCLUIR ESTE NÓ</button>
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setNodeModal(null)}>CANCELAR</button>
              <button className="btn-save" onClick={saveNode} disabled={savingNode||!nodeForm.node_title.trim()}>{savingNode?"SALVANDO...":"SALVAR ⟩"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDGE MODAL */}
      {edgeModal&&(
        <div className="mod-overlay" onClick={()=>setEdgeModal(false)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// CONEXÃO //</span><h3 className="mod-modal__title">NOVA <span>CONEXÃO</span></h3></div>
              <button className="mod-modal__close" onClick={()=>setEdgeModal(false)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TIPO DE CONEXÃO</label>
                <select className="mod-select" value={edgeType} onChange={e=>setEdgeType(e.target.value)}>
                  {EDGE_TYPES_L.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="mod-field"><label className="mod-field__label">RÓTULO (opcional)</label>
                <input className="mod-input" value={edgeLabel} onChange={e=>setEdgeLabel(e.target.value)} placeholder="Ex: Sim / Não / Aprovado" />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setEdgeModal(false)}>CANCELAR</button>
              <button className="btn-save" onClick={saveEdge} disabled={savingEdge}>{savingEdge?"SALVANDO...":"CONECTAR ⟩"}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
