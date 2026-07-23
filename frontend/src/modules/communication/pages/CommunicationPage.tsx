import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CommType { communication_type_id: number; name: string; description?: string; default_format?: string; is_active: boolean; }
interface Template { communication_template_id: number; communication_type_id: number; name: string; description?: string; general_prompt?: string; default_language: string; default_tone?: string; default_detail_level?: string; is_active: boolean; }
interface TplSection { template_section_id: number; communication_template_id: number; section_key: string; title: string; description?: string; generation_prompt?: string; display_order: number; is_required: boolean; target_length?: number; is_active: boolean; }
interface Communication { communication_id: number; product_id: number; communication_type_id: number; communication_template_id?: number; name: string; description?: string; objective: string; trigger_type: string; default_language?: string; default_tone?: string; default_detail_level?: string; status: string; is_active: boolean; }
interface Audience { audience_id: number; product_id?: number; name: string; description?: string; audience_type: string; preferred_language?: string; preferred_tone?: string; preferred_detail_level?: string; is_active: boolean; }
interface AudienceMember { audience_member_id: number; audience_id: number; stakeholder_id: number; notes?: string; full_name?: string; position_title?: string; area?: string; company?: string; email?: string; created_at: string; }
interface StakeholderMin { stakeholder_id: number; full_name: string; position_title?: string; area?: string; company?: string; email?: string; }
interface Publication { publication_id: number; communication_id: number; reference_label?: string; title: string; subtitle?: string; status: string; editorial_summary?: string; version_number: number; reference_start_date?: string; reference_end_date?: string; planned_publication_date?: string; published_at?: string; }
interface Section { section_id: number; publication_id: number; template_section_id?: number; section_key: string; title: string; subtitle?: string; current_content?: string; display_order: number; status: string; is_ai_generated: boolean; }
interface PubAudience { publication_audience_id: number; publication_id: number; audience_id: number; is_primary: boolean; custom_language?: string; custom_tone?: string; }
interface AgentExec { agent_execution_id: number; section_id: number; provider?: string; model_name?: string; status: string; generated_content?: string; input_tokens?: number; output_tokens?: number; total_tokens?: number; estimated_cost?: number; execution_time_ms?: number; error_message?: string; created_at: string; }
interface Review { publication_review_id: number; publication_id: number; action: string; comments?: string; performed_by?: number; performed_at: string; }
interface Version { publication_version_id: number; publication_id: number; version_number: number; version_label?: string; change_reason?: string; created_at: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const TRIGGER_TYPES = ["MANUAL","SCHEDULED","EVENT"];
const TONE_OPTIONS  = ["","Executive","Strategic","Operational","Technical","Informative","Analytical","Inspirational","Formal","Friendly","Neutral"];
const LANG_OPTIONS  = ["pt-BR","en-US","es-ES"];
const COMM_STATUSES = ["DRAFT","ACTIVE","INACTIVE","ARCHIVED"];
const PUB_STATUSES  = ["DRAFT","GENERATING","GENERATED","IN_REVIEW","APPROVED","PUBLISHED","ARCHIVED","CANCELLED"];
const SEC_STATUSES  = ["DRAFT","GENERATING","GENERATED","REVIEWED","APPROVED","PUBLISHED"];
const AUD_TYPES     = ["PERSON","GROUP","BUSINESS_AREA","ROLE","COMMUNITY","EXTERNAL"];
const REVIEW_ACTIONS= ["SUBMITTED_FOR_REVIEW","REVIEWED","CHANGES_REQUESTED","APPROVED","REJECTED","PUBLISHED","ARCHIVED"];

const SC: Record<string,string> = {
  DRAFT:"#7899b0",ACTIVE:"#00ff88",INACTIVE:"#ff9900",ARCHIVED:"#555",
  GENERATING:"#c084fc",GENERATED:"#00e5cc",IN_REVIEW:"#ff9900",
  APPROVED:"#00ff88",PUBLISHED:"#00d4ff",CANCELLED:"#ff6b6b",REVIEWED:"#00e5cc",
  RUNNING:"#c084fc",COMPLETED:"#00ff88",FAILED:"#ff6b6b",PENDING:"#7899b0",
};
const Badge = ({s}:{s:string}) => <span className="badge" style={{borderColor:SC[s]??"#555",color:SC[s]??"#555"}}>{s}</span>;
const fmtDate = (d?:string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtDT   = (d?:string) => d ? new Date(d).toLocaleString("pt-BR") : "—";

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTION HISTORY MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ExecutionsModal({section, onClose}:{section:Section; onClose:()=>void}) {
  const [items,setItems]=useState<AgentExec[]>([]);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    setLoading(true);
    apiGet<AgentExec[]>(`/communication/sections/${section.section_id}/executions`)
      .then(setItems).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{maxWidth:900,width:"95vw"}} onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// HISTÓRICO IA //</span>
            <h3 className="mod-modal__title">{section.title} <span>— EXECUÇÕES</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length===0 ?
            <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM EXECUÇÕES</div></div> :
            <table className="mod-table">
              <thead><tr><th>DATA</th><th>MODELO</th><th>STATUS</th><th>TOKENS</th><th>CUSTO</th><th>TEMPO</th><th>CONTEÚDO</th></tr></thead>
              <tbody>{items.map(e=>(
                <tr key={e.agent_execution_id}>
                  <td style={{fontSize:10,color:"#7899b0"}}>{fmtDT(e.created_at)}</td>
                  <td style={{fontSize:10}}>{e.provider}/{e.model_name}</td>
                  <td><Badge s={e.status}/></td>
                  <td style={{fontSize:10,color:"#7899b0"}}>{e.total_tokens??"-"}</td>
                  <td style={{fontSize:10,color:"#7899b0"}}>{e.estimated_cost?`$${e.estimated_cost}`:"-"}</td>
                  <td style={{fontSize:10,color:"#7899b0"}}>{e.execution_time_ms?`${e.execution_time_ms}ms`:"-"}</td>
                  <td style={{maxWidth:200,fontSize:10,color:"#7899b0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {e.status==="FAILED"?<span style={{color:"#ff6b6b"}}>{e.error_message}</span>:(e.generated_content?.slice(0,80)??"-")}
                  </td>
                </tr>
              ))}</tbody>
            </table>}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTIONS MODAL (with AI generation — UC-005/UC-010)
// ══════════════════════════════════════════════════════════════════════════════
function SectionsModal({pub, onClose}:{pub:Publication; onClose:()=>void}) {
  const [items,setItems]=useState<Section[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [modal,setModal]=useState<"create"|"edit"|null>(null);
  const [sel,setSel]=useState<Section|null>(null);
  const [saving,setSaving]=useState(false);
  const [generating,setGenerating]=useState<number|null>(null);
  const [generatingAll,setGeneratingAll]=useState(false);
  const [reviewAction,setReviewAction]=useState("SUBMITTED_FOR_REVIEW");
  const [reviewComment,setReviewComment]=useState("");
  const [submittingReview,setSubmittingReview]=useState(false);
  const [execModal,setExecModal]=useState<Section|null>(null);
  const [extraCtx,setExtraCtx]=useState("");
  const EMPTY={section_key:"",title:"",subtitle:"",current_content:"",display_order:items.length,status:"DRAFT"};
  const [form,setForm]=useState({...EMPTY});

  const load=async()=>{ setLoading(true); try{ const r=await apiGet<Section[]>(`/communication/publications/${pub.publication_id}/sections`); setItems(r); } catch(e:unknown){setError(e instanceof Error?e.message:"Erro");} finally{setLoading(false);} };
  useEffect(()=>{load();},[]);

  const handleSave=async()=>{
    if(!form.title.trim()||!form.section_key.trim()) return; setSaving(true);
    try{
      if(modal==="create") await apiPost(`/communication/publications/${pub.publication_id}/sections`,form);
      else if(sel) await apiPatch(`/communication/sections/${sel.section_id}`,form);
      setModal(null); load();
    } catch(e:unknown){setError(e instanceof Error?e.message:"Erro");} finally{setSaving(false);}
  };

  const handleDelete=async(id:number)=>{
    if(!confirm("Excluir seção?")) return;
    try{await apiDelete(`/communication/sections/${id}`); load();} catch(e:unknown){setError(e instanceof Error?e.message:"Erro");}
  };

  const handleGenerate=async(s:Section)=>{
    setGenerating(s.section_id);
    try{
      await apiPost(`/communication/sections/${s.section_id}/generate`,{extra_context:extraCtx||null});
      load();
    } catch(e:unknown){setError(e instanceof Error?e.message:"OpenAI: "+(e instanceof Error?e.message:"Erro"));}
    finally{setGenerating(null);}
  };

  const handleGenerateAll=async()=>{
    setGeneratingAll(true);
    for(const s of items){
      try{ await apiPost(`/communication/sections/${s.section_id}/generate`,{extra_context:extraCtx||null}); }
      catch{}
    }
    setGeneratingAll(false); load();
  };

  const submitReview=async()=>{
    setSubmittingReview(true);
    try{ await apiPost(`/communication/publications/${pub.publication_id}/reviews`,{action:reviewAction,comments:reviewComment||null}); setReviewComment(""); }
    catch(e:unknown){setError(e instanceof Error?e.message:"Erro");} finally{setSubmittingReview(false);}
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{maxWidth:960,width:"95vw"}} onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// PUBLICAÇÃO: {pub.reference_label??`#${pub.publication_id}`} //</span>
            <h3 className="mod-modal__title">{pub.title} <span>— SEÇÕES</span></h3></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><Badge s={pub.status}/><button className="mod-modal__close" onClick={onClose}>✕</button></div>
        </div>
        <div className="mod-modal__body">
          {error&&<div className="mod-error">⚠ {error}</div>}
          {/* Review bar */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,padding:"8px 12px",background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:4}}>
            <span style={{fontSize:9,letterSpacing:2,color:"#7899b0"}}>REVISÃO:</span>
            <select className="mod-select" style={{flex:1,fontSize:11}} value={reviewAction} onChange={e=>setReviewAction(e.target.value)}>
              {REVIEW_ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            <input className="mod-input" style={{flex:2,fontSize:11}} value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder="Comentário (opcional)"/>
            <button className="btn-save" style={{whiteSpace:"nowrap"}} onClick={submitReview} disabled={submittingReview}>{submittingReview?"...":"REGISTRAR ⟩"}</button>
          </div>
          {/* AI context bar */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,padding:"8px 12px",background:"rgba(192,132,252,0.06)",border:"1px solid rgba(192,132,252,0.2)",borderRadius:4}}>
            <span style={{fontSize:9,letterSpacing:2,color:"#c084fc"}}>🤖 IA:</span>
            <input className="mod-input" style={{flex:3,fontSize:11}} value={extraCtx} onChange={e=>setExtraCtx(e.target.value)} placeholder="Contexto adicional para a IA (opcional)"/>
            <button className="btn-save" style={{whiteSpace:"nowrap",background:"rgba(192,132,252,0.15)",borderColor:"rgba(192,132,252,0.5)",color:"#c084fc"}} onClick={handleGenerateAll} disabled={generatingAll||items.length===0}>{generatingAll?"GERANDO...":"GERAR TODAS ⟩"}</button>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <button className="btn-add" onClick={()=>{setForm({...EMPTY,display_order:items.length});setSel(null);setModal("create");}}>+ NOVA SEÇÃO</button>
          </div>
          {loading?<div className="mod-loading">CARREGANDO...</div>:items.length===0?
            <div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">SEM SEÇÕES</div></div>:(
            <table className="mod-table">
              <thead><tr><th>#</th><th>KEY</th><th>TÍTULO</th><th>STATUS</th><th>IA</th><th></th></tr></thead>
              <tbody>{items.map(s=>(
                <tr key={s.section_id}>
                  <td style={{color:"#7899b0",fontSize:11}}>{s.display_order}</td>
                  <td><span className="badge badge--info" style={{fontSize:9}}>{s.section_key}</span></td>
                  <td><strong>{s.title}</strong>{s.current_content&&<div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{s.current_content.slice(0,60)}…</div>}</td>
                  <td><Badge s={s.status}/></td>
                  <td style={{color:s.is_ai_generated?"#c084fc":"#555",fontSize:11}}>{s.is_ai_generated?"SIM":"—"}</td>
                  <td><div className="row-actions">
                    <button className="btn-icon" style={{color:"#c084fc",borderColor:"rgba(192,132,252,0.4)"}} onClick={()=>handleGenerate(s)} disabled={generating===s.section_id}>{generating===s.section_id?"...":"🤖 GERAR"}</button>
                    <button className="btn-icon" style={{fontSize:9}} onClick={()=>setExecModal(s)}>HIST.</button>
                    <button className="btn-icon" onClick={()=>{setForm({section_key:s.section_key,title:s.title,subtitle:s.subtitle??"",current_content:s.current_content??"",display_order:s.display_order,status:s.status});setSel(s);setModal("edit");}}>EDITAR</button>
                    <button className="btn-icon btn-icon--danger" onClick={()=>handleDelete(s.section_id)}>DEL</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>)}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
      {modal&&(
        <div className="mod-overlay" onClick={()=>setModal(null)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// SEÇÃO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVA":"EDITAR"} <span>SEÇÃO</span></h3></div><button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">SECTION KEY *</label><input className="mod-input" value={form.section_key} onChange={e=>setForm(f=>({...f,section_key:e.target.value.toUpperCase().replace(/ /g,"_")}))}/></div>
                <div className="mod-field"><label className="mod-field__label">ORDEM</label><input className="mod-input" type="number" min="0" value={form.display_order} onChange={e=>setForm(f=>({...f,display_order:Number(e.target.value)}))}/></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
              <div className="mod-field"><label className="mod-field__label">SUBTÍTULO</label><input className="mod-input" value={form.subtitle} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))}/></div>
              <div className="mod-field"><label className="mod-field__label">CONTEÚDO</label><textarea className="mod-textarea" rows={6} value={form.current_content} onChange={e=>setForm(f=>({...f,current_content:e.target.value}))}/></div>
              {modal==="edit"&&<div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{SEC_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()||!form.section_key.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
  {execModal&&<ExecutionsModal section={execModal} onClose={()=>setExecModal(null)}/>}
    </div>
  );
}

// ── VersionsModal ──────────────────────────────────────────────────────────────
function VersionsModal({pub,onClose}:{pub:Publication;onClose:()=>void}) {
  const [items,setItems]=useState<Version[]>([]); const [loading,setLoading]=useState(false); const [saving,setSaving]=useState(false);
  const load=()=>{setLoading(true);apiGet<Version[]>(`/communication/publications/${pub.publication_id}/versions`).then(setItems).catch(()=>{}).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const snap=async()=>{setSaving(true);try{await apiPost(`/communication/publications/${pub.publication_id}/versions`,{});load();}catch{}finally{setSaving(false);}};
  return (<div className="mod-overlay" onClick={onClose}><div className="mod-modal" style={{maxWidth:700,width:"95vw"}} onClick={e=>e.stopPropagation()}>
    <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// VERSÕES //</span><h3 className="mod-modal__title">{pub.title} <span>— HISTÓRICO</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div>
    <div className="mod-modal__body">
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><button className="btn-add" onClick={snap} disabled={saving}>{saving?"...":"+ SNAPSHOT"}</button></div>
      {loading?<div className="mod-loading">CARREGANDO...</div>:items.length===0?<div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">SEM VERSÕES</div></div>:(
        <table className="mod-table"><thead><tr><th>VERSÃO</th><th>DATA</th><th>MOTIVO</th></tr></thead>
        <tbody>{items.map(v=>(<tr key={v.publication_version_id}><td><strong>{v.version_label??`v${v.version_number}`}</strong></td><td style={{fontSize:10,color:"#7899b0"}}>{fmtDT(v.created_at)}</td><td style={{fontSize:10,color:"#7899b0"}}>{v.change_reason??"-"}</td></tr>))}</tbody></table>)}
    </div>
    <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
  </div></div>);
}

// ── ReviewsHistoryModal ────────────────────────────────────────────────────────
function ReviewsHistoryModal({pub,onClose}:{pub:Publication;onClose:()=>void}) {
  const [items,setItems]=useState<Review[]>([]); const [loading,setLoading]=useState(false);
  useEffect(()=>{setLoading(true);apiGet<Review[]>(`/communication/publications/${pub.publication_id}/reviews`).then(setItems).catch(()=>{}).finally(()=>setLoading(false));},[]);
  return (<div className="mod-overlay" onClick={onClose}><div className="mod-modal" style={{maxWidth:700,width:"95vw"}} onClick={e=>e.stopPropagation()}>
    <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// REVISÕES //</span><h3 className="mod-modal__title">{pub.title} <span>— HISTÓRICO</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div>
    <div className="mod-modal__body">
      {loading?<div className="mod-loading">CARREGANDO...</div>:items.length===0?<div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM REVISÕES</div></div>:(
        <table className="mod-table"><thead><tr><th>DATA</th><th>AÇÃO</th><th>COMENTÁRIO</th></tr></thead>
        <tbody>{items.map(r=>(<tr key={r.publication_review_id}><td style={{fontSize:10,color:"#7899b0"}}>{fmtDT(r.performed_at)}</td><td><Badge s={r.action}/></td><td style={{fontSize:10,color:"#7899b0"}}>{r.comments??"-"}</td></tr>))}</tbody></table>)}
    </div>
    <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
  </div></div>);
}

// ── PublicationAudiencesModal ──────────────────────────────────────────────────
function PublicationAudiencesModal({pub,productId,onClose}:{pub:Publication;productId:string;onClose:()=>void}) {
  const [linked,setLinked]=useState<PubAudience[]>([]); const [available,setAvail]=useState<Audience[]>([]); const [loading,setLoading]=useState(false);
  const [selId,setSelId]=useState(""); const [isPrimary,setIsPrimary]=useState(false); const [adding,setAdding]=useState(false); const [error,setError]=useState("");
  const loadLinked=async()=>{const r=await apiGet<PubAudience[]>(`/communication/publications/${pub.publication_id}/audiences`);setLinked(r);};
  const loadAvail=async()=>{const qs=productId?`?product_id=${productId}`:"";const r=await apiGet<{items:Audience[]}>(`/communication/audiences${qs}`);setAvail(r.items);};
  useEffect(()=>{setLoading(true);Promise.all([loadLinked(),loadAvail()]).finally(()=>setLoading(false));},[]);
  const linkedIds=new Set(linked.map(l=>l.audience_id));
  const handleAdd=async()=>{if(!selId)return;setAdding(true);try{await apiPost(`/communication/publications/${pub.publication_id}/audiences`,{audience_id:Number(selId),is_primary:isPrimary});setSelId("");setIsPrimary(false);await loadLinked();}catch(e:unknown){setError(e instanceof Error?e.message:"Erro");}finally{setAdding(false);}};
  const handleRemove=async(aid:number)=>{try{await apiDelete(`/communication/publications/${pub.publication_id}/audiences/${aid}`);await loadLinked();}catch(e:unknown){setError(e instanceof Error?e.message:"Erro");}};
  return (<div className="mod-overlay" onClick={onClose}><div className="mod-modal" style={{maxWidth:640,width:"95vw"}} onClick={e=>e.stopPropagation()}>
    <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// AUDIÊNCIAS //</span><h3 className="mod-modal__title">{pub.title} <span>— PÚBLICO</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div>
    <div className="mod-modal__body">
      {error&&<div className="mod-error">⚠ {error}</div>}
      {loading?<div className="mod-loading">CARREGANDO...</div>:(<>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,padding:"8px 12px",background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:4}}>
          <select className="mod-select" style={{flex:3,fontSize:11}} value={selId} onChange={e=>setSelId(e.target.value)}>
            <option value="">— Selecione —</option>
            {available.filter(a=>!linkedIds.has(a.audience_id)).map(a=><option key={a.audience_id} value={a.audience_id}>{a.name} ({a.audience_type})</option>)}
          </select>
          <label style={{display:"flex",alignItems:"center",gap:4,fontSize:9,letterSpacing:1,color:"#7899b0",whiteSpace:"nowrap"}}>
            <input type="checkbox" checked={isPrimary} onChange={e=>setIsPrimary(e.target.checked)}/>PRIMÁRIA
          </label>
          <button className="btn-save" style={{whiteSpace:"nowrap"}} onClick={handleAdd} disabled={adding||!selId}>{adding?"...":"ADICIONAR ⟩"}</button>
        </div>
        {linked.length===0?<div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM AUDIÊNCIAS VINCULADAS</div></div>:(
          <table className="mod-table"><thead><tr><th>AUDIÊNCIA</th><th>TIPO</th><th>PRIMÁRIA</th><th></th></tr></thead>
          <tbody>{linked.map(la=>{const aud=available.find(a=>a.audience_id===la.audience_id);return(
            <tr key={la.publication_audience_id}>
              <td><strong>{aud?.name??`#${la.audience_id}`}</strong></td>
              <td><span className="badge badge--info">{aud?.audience_type??"—"}</span></td>
              <td style={{textAlign:"center"}}>{la.is_primary?<span style={{color:"#00ff88"}}>★</span>:"—"}</td>
              <td><button className="btn-icon btn-icon--danger" onClick={()=>handleRemove(la.audience_id)}>REMOVER</button></td>
            </tr>);})}</tbody>
          </table>)}
      </>)}
    </div>
    <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
  </div></div>);
}


// ══════════════════════════════════════════════════════════════════════════════
// PUBLICATIONS MODAL
// ══════════════════════════════════════════════════════════════════════════════
function PublicationsModal({communication, onClose}:{communication:Communication; onClose:()=>void}) {
  const [items,setItems]=useState<Publication[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [modal,setModal]=useState<"create"|"edit"|"sections"|"audiences"|"versions"|"reviews"|null>(null);
  const [sel,setSel]=useState<Publication|null>(null);
  const [saving,setSaving]=useState(false);
  const EMPTY={title:"",subtitle:"",reference_label:"",editorial_summary:"",reference_start_date:"",reference_end_date:"",planned_publication_date:"",status:"DRAFT"};
  const [form,setForm]=useState({...EMPTY});

  const load=async()=>{ setLoading(true); try{ const r=await apiGet<{total:number;items:Publication[]}>(`/communication/${communication.communication_id}/publications?size=50`); setItems(r.items); } catch(e:unknown){setError(e instanceof Error?e.message:"Erro");} finally{setLoading(false);} };
  useEffect(()=>{load();},[]);

  const handleSave=async()=>{
    if(!form.title.trim()) return; setSaving(true);
    try{
      const clean=(v:string)=>v||null;
      const body={title:form.title,subtitle:clean(form.subtitle),reference_label:clean(form.reference_label),editorial_summary:clean(form.editorial_summary),reference_start_date:clean(form.reference_start_date),reference_end_date:clean(form.reference_end_date),planned_publication_date:clean(form.planned_publication_date),status:form.status,communication_id:communication.communication_id};
      if(modal==="create") await apiPost(`/communication/${communication.communication_id}/publications`,body);
      else if(sel) await apiPatch(`/communication/publications/${sel.publication_id}`,body);
      setModal(null); load();
    } catch(e:unknown){setError(e instanceof Error?e.message:"Erro");} finally{setSaving(false);}
  };

  const handleDelete=async(id:number)=>{
    if(!confirm("Excluir publicação?")) return;
    try{await apiDelete(`/communication/publications/${id}`); load();} catch(e:unknown){setError(e instanceof Error?e.message:"Erro");}
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{maxWidth:900,width:"95vw"}} onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// PUBLICAÇÕES //</span><h3 className="mod-modal__title">{communication.name} <span>— EDIÇÕES</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error&&<div className="mod-error">⚠ {error}</div>}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><button className="btn-add" onClick={()=>{setForm({...EMPTY});setSel(null);setModal("create");}}>+ NOVA PUBLICAÇÃO</button></div>
          {loading?<div className="mod-loading">CARREGANDO...</div>:items.length===0?
            <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">SEM PUBLICAÇÕES</div></div>:(
            <table className="mod-table">
              <thead><tr><th>TÍTULO</th><th>REFERÊNCIA</th><th>STATUS</th><th>VER.</th><th>PUBLICADO</th><th></th></tr></thead>
              <tbody>{items.map(p=>(
                <tr key={p.publication_id}>
                  <td><strong>{p.title}</strong>{p.subtitle&&<div style={{fontSize:10,color:"#7899b0"}}>{p.subtitle}</div>}</td>
                  <td style={{color:"#7899b0",fontSize:11}}>{p.reference_label??"—"}</td>
                  <td><Badge s={p.status}/></td>
                  <td style={{textAlign:"center",color:"#7899b0"}}>v{p.version_number}</td>
                  <td style={{color:"#7899b0",fontSize:11}}>{fmtDate(p.published_at)}</td>
                  <td><div className="row-actions">
                    <button className="btn-icon" onClick={()=>{setSel(p);setModal("audiences");}}>PÚBLICO</button>
                    <button className="btn-icon" onClick={()=>{setSel(p);setModal("sections");}}>SEÇÕES</button>
                    <button className="btn-icon" onClick={()=>{setSel(p);setModal("reviews");}}>REVISÕES</button>
                    <button className="btn-icon" onClick={()=>{setSel(p);setModal("versions");}}>VERSÕES</button>
                    <button className="btn-icon" onClick={()=>{setForm({title:p.title,subtitle:p.subtitle??"",reference_label:p.reference_label??"",editorial_summary:p.editorial_summary??"",reference_start_date:p.reference_start_date??"",reference_end_date:p.reference_end_date??"",planned_publication_date:p.planned_publication_date??"",status:p.status});setSel(p);setModal("edit");}}>EDITAR</button>
                    <button className="btn-icon btn-icon--danger" onClick={()=>handleDelete(p.publication_id)}>DEL</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>)}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
      {(modal==="create"||modal==="edit")&&(
        <div className="mod-overlay" onClick={()=>setModal(null)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// PUBLICAÇÃO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVA":"EDITAR"} <span>PUBLICAÇÃO</span></h3></div><button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ex: BA Magazine — Issue 001"/></div>
              <div className="mod-field"><label className="mod-field__label">SUBTÍTULO</label><input className="mod-input" value={form.subtitle} onChange={e=>setForm(f=>({...f,subtitle:e.target.value}))}/></div>
              <div className="mod-field"><label className="mod-field__label">REFERÊNCIA</label><input className="mod-input" value={form.reference_label} onChange={e=>setForm(f=>({...f,reference_label:e.target.value}))} placeholder="Issue 001, Sprint 12, July 2026"/></div>
              <div className="mod-field"><label className="mod-field__label">SUMÁRIO EDITORIAL</label><textarea className="mod-textarea" value={form.editorial_summary} onChange={e=>setForm(f=>({...f,editorial_summary:e.target.value}))}/></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">INÍCIO</label><input className="mod-input" type="date" value={form.reference_start_date} onChange={e=>setForm(f=>({...f,reference_start_date:e.target.value}))}/></div>
                <div className="mod-field"><label className="mod-field__label">FIM</label><input className="mod-input" type="date" value={form.reference_end_date} onChange={e=>setForm(f=>({...f,reference_end_date:e.target.value}))}/></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">DATA PLANEJADA</label><input className="mod-input" type="date" value={form.planned_publication_date} onChange={e=>setForm(f=>({...f,planned_publication_date:e.target.value}))}/></div>
              {modal==="edit"&&<div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{PUB_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
      {modal==="sections"&&sel&&<SectionsModal pub={sel} onClose={()=>setModal(null)}/>}
      {modal==="audiences"&&sel&&<PublicationAudiencesModal pub={sel} productId={String(communication.product_id)} onClose={()=>setModal(null)}/>}
      {modal==="reviews"&&sel&&<ReviewsHistoryModal pub={sel} onClose={()=>setModal(null)}/>}
      {modal==="versions"&&sel&&<VersionsModal pub={sel} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIENCE MODAL — form + stakeholder members section
// ══════════════════════════════════════════════════════════════════════════════
type AudForm = {name:string;description:string;audience_type:string;preferred_language:string;preferred_tone:string;preferred_detail_level:string};
function AudienceModal({mode,sel,form,setForm,onSave,onClose,saving}:{
  mode:"create"|"edit"; sel:Audience|null;
  form:AudForm; setForm:React.Dispatch<React.SetStateAction<AudForm>>;
  onSave:()=>void; onClose:()=>void; saving:boolean;
}) {
  const { t } = useTranslation();
  const [members,setMembers]=useState<AudienceMember[]>([]);
  const [allStakeholders,setAllStakeholders]=useState<StakeholderMin[]>([]);
  const [loadingM,setLoadingM]=useState(false);
  const [selStk,setSelStk]=useState("");
  const [notes,setNotes]=useState("");
  const [adding,setAdding]=useState(false);
  const [search,setSearch]=useState("");

  const loadMembers=async()=>{
    if(!sel?.audience_id) return;
    setLoadingM(true);
    try{const r=await apiGet<AudienceMember[]>(`/communication/audiences/${sel.audience_id}/members`); setMembers(r);}
    catch{}finally{setLoadingM(false);}
  };

  useEffect(()=>{
    apiGet<{items:StakeholderMin[]}>("/stakeholders?size=200").then(r=>setAllStakeholders(r.items)).catch(()=>{});
    if(sel?.audience_id) loadMembers();
  },[sel?.audience_id]);

  const memberIds=new Set(members.map(m=>m.stakeholder_id));
  const filtered=allStakeholders.filter(s=>
    !memberIds.has(s.stakeholder_id) &&
    (s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.company||"").toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddMember=async()=>{
    if(!selStk||!sel?.audience_id) return;
    setAdding(true);
    try{
      await apiPost(`/communication/audiences/${sel.audience_id}/members`,{stakeholder_id:Number(selStk),notes:notes||null});
      setSelStk(""); setNotes(""); loadMembers();
    }catch(e:unknown){alert(e instanceof Error?e.message:"Erro");}
    finally{setAdding(false);}
  };

  const handleRemoveMember=async(stakeholder_id:number)=>{
    if(!sel?.audience_id) return;
    try{await apiDelete(`/communication/audiences/${sel.audience_id}/members/${stakeholder_id}`); loadMembers();}
    catch(e:unknown){alert(e instanceof Error?e.message:"Erro");}
  };

  return (<div className="mod-overlay" onClick={onClose}><div className="mod-modal" style={{maxWidth:720,width:"95vw"}} onClick={e=>e.stopPropagation()}>
    <div className="mod-modal__header">
      <div><span className="mod-modal__eyebrow">// {t("communication.aud_modal_subtitle").toUpperCase()} //</span>
        <h3 className="mod-modal__title">{mode==="create"?t("communication.aud_modal_new"):t("communication.aud_modal_edit")} <span>{t("communication.aud_modal_subtitle")}</span></h3>
      </div>
      <button className="mod-modal__close" onClick={onClose}>✕</button>
    </div>
    <div className="mod-modal__body">
      {/* Basic fields */}
      <div className="mod-field"><label className="mod-field__label">{t("communication.aud_form_name")}</label><input className="mod-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
      <div className="mod-field"><label className="mod-field__label">{t("communication.aud_form_description")}</label><textarea className="mod-textarea" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
      <div className="mod-field-row">
        <div className="mod-field"><label className="mod-field__label">{t("communication.aud_form_type")}</label><select className="mod-select" value={form.audience_type} onChange={e=>setForm(f=>({...f,audience_type:e.target.value}))}>{AUD_TYPES.map(at=><option key={at} value={at}>{at}</option>)}</select></div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.aud_form_language")}</label><select className="mod-select" value={form.preferred_language} onChange={e=>setForm(f=>({...f,preferred_language:e.target.value}))}>{LANG_OPTIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
      </div>
      <div className="mod-field"><label className="mod-field__label">{t("communication.aud_form_tone")}</label><select className="mod-select" value={form.preferred_tone} onChange={e=>setForm(f=>({...f,preferred_tone:e.target.value}))}>{TONE_OPTIONS.map(tone=><option key={tone} value={tone}>{tone||t("communication.select_tone")}</option>)}</select></div>
      <div className="mod-field"><label className="mod-field__label">{t("communication.aud_form_detail")}</label><select className="mod-select" value={form.preferred_detail_level} onChange={e=>setForm(f=>({...f,preferred_detail_level:e.target.value}))}><option value="">{t("communication.select_none")}</option><option value="SUMMARY">SUMMARY</option><option value="STANDARD">STANDARD</option><option value="DETAILED">DETAILED</option></select></div>

      {/* Members section — only for edit mode */}
      {mode==="edit"&&sel&&(<>
        <div style={{borderTop:"1px solid rgba(0,212,255,0.15)",margin:"16px 0 12px",paddingTop:12}}>
          <div style={{fontSize:9,letterSpacing:2,color:"#00d4ff",marginBottom:10}}>◉ STAKEHOLDERS — MEMBROS DA AUDIÊNCIA</div>
          {/* Add member */}
          <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
            <input className="mod-input" style={{flex:2,fontSize:11}} placeholder="Buscar stakeholder..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="mod-select" style={{flex:3,fontSize:11}} value={selStk} onChange={e=>setSelStk(e.target.value)}>
              <option value="">— Selecione —</option>
              {filtered.slice(0,50).map(s=><option key={s.stakeholder_id} value={s.stakeholder_id}>{s.full_name}{s.company?` (${s.company})`:""}</option>)}
            </select>
            <button className="btn-save" style={{whiteSpace:"nowrap",fontSize:10}} onClick={handleAddMember} disabled={adding||!selStk}>{adding?"...":"+ ADD"}</button>
          </div>
          {/* Members list */}
          {loadingM?<div className="mod-loading" style={{fontSize:11}}>CARREGANDO...</div>:members.length===0?(
            <div style={{color:"#7899b0",fontSize:11,textAlign:"center",padding:"12px 0",letterSpacing:1}}>Nenhum stakeholder adicionado</div>
          ):(
            <table className="mod-table">
              <thead><tr><th>NOME</th><th>CARGO</th><th>EMPRESA</th><th>E-MAIL</th><th></th></tr></thead>
              <tbody>{members.map(m=>(
                <tr key={m.audience_member_id}>
                  <td><strong style={{fontSize:11}}>{m.full_name??`#${m.stakeholder_id}`}</strong></td>
                  <td style={{fontSize:10,color:"#7899b0"}}>{m.position_title??"-"}</td>
                  <td style={{fontSize:10,color:"#7899b0"}}>{m.company??"-"}</td>
                  <td style={{fontSize:10,color:"#7899b0"}}>{m.email??"-"}</td>
                  <td><button className="btn-icon btn-icon--danger" style={{fontSize:9}} onClick={()=>handleRemoveMember(m.stakeholder_id)}>REM.</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </>)}
    </div>
    <div className="mod-modal__footer">
      <button className="btn-cancel" onClick={onClose}>{t("communication.btn_cancel")}</button>
      <button className="btn-save" onClick={onSave} disabled={saving||!form.name.trim()}>{saving?t("communication.btn_saving"):t("communication.btn_save")}</button>
    </div>
  </div></div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: AUDIENCES
// ══════════════════════════════════════════════════════════════════════════════
function AudiencesTab({productId}:{productId:string}) {
  const { t } = useTranslation();
  const [items,setItems]=useState<Audience[]>([]); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(false);
  const [modal,setModal]=useState<"create"|"edit"|null>(null); const [sel,setSel]=useState<Audience|null>(null); const [saving,setSaving]=useState(false);
  const EMPTY={name:"",description:"",audience_type:"GROUP",preferred_language:"pt-BR",preferred_tone:"",preferred_detail_level:""};
  const [form,setForm]=useState({...EMPTY});
  const load=async()=>{ setLoading(true); const qs=productId?`?product_id=${productId}`:""; const r=await apiGet<{total:number;items:Audience[]}>(`/communication/audiences${qs}`); setItems(r.items); setTotal(r.total); setLoading(false); };
  useEffect(()=>{load();},[productId]);
  const handleSave=async()=>{
    if(!form.name.trim()) return; setSaving(true);
    try{ const body={...form,product_id:productId?Number(productId):null,preferred_tone:form.preferred_tone||null,preferred_detail_level:form.preferred_detail_level||null};
      if(modal==="create") await apiPost("/communication/audiences",body); else if(sel) await apiPatch(`/communication/audiences/${sel.audience_id}`,body);
      setModal(null); load(); } catch(e:unknown){alert(e instanceof Error?e.message:"Erro");} finally{setSaving(false);}
  };
  return (
    <div>
      <div className="mod-header">
        <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.aud_eyebrow")}</span><h1 className="mod-header__title">{t("communication.aud_title")}</h1><p className="mod-header__meta">{t("communication.aud_meta",{count:total})}</p></div>
        <button className="btn-add" onClick={()=>{setForm({...EMPTY});setSel(null);setModal("create");}}>{t("communication.aud_btn_new")}</button>
      </div>
      {loading?<div className="mod-loading">{t("communication.loading")}</div>:items.length===0?<div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">{t("communication.aud_empty")}</div></div>:(
        <table className="mod-table">
          <thead><tr><th>{t("communication.aud_col_name")}</th><th>{t("communication.aud_col_type")}</th><th>{t("communication.aud_col_language")}</th><th>{t("communication.aud_col_tone")}</th><th></th></tr></thead>
          <tbody>{items.map(a=>(
            <tr key={a.audience_id}>
              <td><strong>{a.name}</strong>{a.description&&<div style={{fontSize:10,color:"#7899b0"}}>{a.description.slice(0,50)}</div>}</td>
              <td><span className="badge badge--info">{a.audience_type}</span></td>
              <td style={{color:"#7899b0"}}>{a.preferred_language??"—"}</td>
              <td style={{color:"#7899b0"}}>{a.preferred_tone??"—"}</td>
              <td><div className="row-actions">
                <button className="btn-icon" onClick={()=>{setForm({name:a.name,description:a.description??"",audience_type:a.audience_type,preferred_language:a.preferred_language??"pt-BR",preferred_tone:a.preferred_tone??"",preferred_detail_level:a.preferred_detail_level??""});setSel(a);setModal("edit");}}>{t("communication.aud_modal_edit")}</button>
                <button className="btn-icon btn-icon--danger" onClick={async()=>{if(!confirm(t("communication.confirm_delete"))) return; await apiDelete(`/communication/audiences/${a.audience_id}`); load();}}>{t("communication.comm_btn_del")}</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>)}
      {modal&&<AudienceModal
        mode={modal}
        sel={sel}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onClose={()=>setModal(null)}
        saving={saving}
    />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: TYPES (UC-001)
// ══════════════════════════════════════════════════════════════════════════════
function TypesTab() {
  const { t } = useTranslation();
  const [items,setItems]=useState<CommType[]>([]); const [modal,setModal]=useState<"create"|"edit"|null>(null); const [sel,setSel]=useState<CommType|null>(null); const [saving,setSaving]=useState(false);
  const EMPTY={name:"",description:"",default_format:""};
  const [form,setForm]=useState({...EMPTY});
  const load=()=>apiGet<CommType[]>("/communication/types?only_active=false").then(setItems).catch(()=>{});
  useEffect(()=>{load();},[]);
  const handleSave=async()=>{
    if(!form.name.trim()) return; setSaving(true);
    try{ if(modal==="create") await apiPost("/communication/types",form); else if(sel) await apiPatch(`/communication/types/${sel.communication_type_id}`,form); setModal(null); load(); }
    catch(e:unknown){alert(e instanceof Error?e.message:"Erro");} finally{setSaving(false);}
  };
  return (<div>
    <div className="mod-header">
      <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.types_eyebrow")}</span><h1 className="mod-header__title">{t("communication.types_title")}</h1><p className="mod-header__meta">{t("communication.types_meta",{count:items.length})}</p></div>
      <button className="btn-add" onClick={()=>{setForm({...EMPTY});setSel(null);setModal("create");}}>{t("communication.types_btn_new")}</button>
    </div>
    {items.length===0?<div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("communication.types_empty")}</div></div>:(
      <table className="mod-table"><thead><tr><th>{t("communication.types_col_name")}</th><th>{t("communication.types_col_format")}</th><th>{t("communication.types_col_active")}</th><th></th></tr></thead>
      <tbody>{items.map(ct=>(<tr key={ct.communication_type_id}>
        <td><strong>{ct.name}</strong>{ct.description&&<div style={{fontSize:10,color:"#7899b0"}}>{ct.description.slice(0,60)}</div>}</td>
        <td style={{color:"#7899b0"}}>{ct.default_format??"—"}</td>
        <td><Badge s={ct.is_active?"ACTIVE":"INACTIVE"}/></td>
        <td><div className="row-actions">
          <button className="btn-icon" onClick={()=>{setForm({name:ct.name,description:ct.description??"",default_format:ct.default_format??""});setSel(ct);setModal("edit");}}>{t("communication.types_modal_edit")}</button>
          <button className="btn-icon btn-icon--danger" onClick={async()=>{if(!confirm(t("communication.confirm_deactivate"))) return; await apiDelete(`/communication/types/${ct.communication_type_id}`); load();}}>{t("communication.types_btn_deactivate")}</button>
        </div></td>
      </tr>))}</tbody></table>)}
    {modal&&<div className="mod-overlay" onClick={()=>setModal(null)}><div className="mod-modal" onClick={e=>e.stopPropagation()}>
      <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// {t("communication.types_modal_subtitle").toUpperCase()} //</span><h3 className="mod-modal__title">{modal==="create"?t("communication.types_modal_new"):t("communication.types_modal_edit")} <span>{t("communication.types_modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button></div>
      <div className="mod-modal__body">
        <div className="mod-field"><label className="mod-field__label">{t("communication.types_form_name")}</label><input className="mod-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.types_form_description")}</label><textarea className="mod-textarea" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.types_form_format")}</label><input className="mod-input" value={form.default_format} onChange={e=>setForm(f=>({...f,default_format:e.target.value}))}/></div>
      </div>
      <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setModal(null)}>{t("communication.btn_cancel")}</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.name.trim()}>{saving?t("communication.btn_saving"):t("communication.btn_save")}</button></div>
    </div></div>}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: TEMPLATES (UC-003)
// ══════════════════════════════════════════════════════════════════════════════
function TemplatesTab({commTypes}:{commTypes:CommType[]}) {
  const { t } = useTranslation();
  const [items,setItems]=useState<Template[]>([]); const [tplSections,setTplSections]=useState<TplSection[]>([]); const [selTpl,setSelTpl]=useState<Template|null>(null);
  const [modal,setModal]=useState<"create"|"edit"|"sections"|null>(null); const [sel,setSel]=useState<Template|null>(null); const [saving,setSaving]=useState(false);
  const EMPTY={communication_type_id:commTypes[0]?.communication_type_id??0,name:"",description:"",general_prompt:"",default_language:"pt-BR",default_tone:"",default_detail_level:""};
  const [form,setForm]=useState({...EMPTY});
  const SECEMPTY={section_key:"",title:"",description:"",generation_prompt:"",display_order:0,is_required:true,target_length:""};
  const [secForm,setSecForm]=useState({...SECEMPTY}); const [secSel,setSecSel]=useState<TplSection|null>(null); const [secModal,setSecModal]=useState<"create"|"edit"|null>(null); const [secSaving,setSecSaving]=useState(false);

  const load=()=>apiGet<{items:Template[]}>("/communication/templates?size=100").then(r=>setItems(r.items)).catch(()=>{});
  const loadSections=(id:number)=>apiGet<TplSection[]>(`/communication/templates/${id}/sections`).then(setTplSections).catch(()=>{});
  useEffect(()=>{load();},[]);

  const handleSave=async()=>{
    if(!form.name.trim()) return; setSaving(true);
    try{
      const body={...form,communication_type_id:Number(form.communication_type_id),default_tone:form.default_tone||null,default_detail_level:form.default_detail_level||null,general_prompt:form.general_prompt||null};
      if(modal==="create") await apiPost("/communication/templates",body); else if(sel) await apiPatch(`/communication/templates/${sel.communication_template_id}`,body);
      setModal(null); load();
    } catch(e:unknown){alert(e instanceof Error?e.message:"Erro");} finally{setSaving(false);}
  };

  const handleSaveSection=async()=>{
    if(!secForm.title.trim()||!secForm.section_key.trim()||!selTpl) return; setSecSaving(true);
    try{
      const body={...secForm,display_order:Number(secForm.display_order),target_length:secForm.target_length?Number(secForm.target_length):null,generation_prompt:secForm.generation_prompt||null};
      if(secModal==="create") await apiPost(`/communication/templates/${selTpl.communication_template_id}/sections`,body);
      else if(secSel) await apiPatch(`/communication/template-sections/${secSel.template_section_id}`,body);
      setSecModal(null); loadSections(selTpl.communication_template_id);
    } catch(e:unknown){alert(e instanceof Error?e.message:"Erro");} finally{setSecSaving(false);}
  };

  return (<div>
    <div className="mod-header">
      <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.tpl_eyebrow")}</span><h1 className="mod-header__title">{t("communication.tpl_title")}</h1><p className="mod-header__meta">{t("communication.tpl_meta",{count:items.length})}</p></div>
      <button className="btn-add" onClick={()=>{setForm({...EMPTY,communication_type_id:commTypes[0]?.communication_type_id??0});setSel(null);setModal("create");}}>{t("communication.tpl_btn_new")}</button>
    </div>
    {items.length===0?<div className="mod-empty"><div className="mod-empty__icon">◧</div><div className="mod-empty__title">{t("communication.tpl_empty")}</div><div className="mod-empty__sub">{t("communication.tpl_empty_sub")}</div></div>:(
      <table className="mod-table"><thead><tr><th>{t("communication.tpl_col_name")}</th><th>{t("communication.tpl_col_type")}</th><th>{t("communication.tpl_col_language")}</th><th>{t("communication.tpl_col_tone")}</th><th></th></tr></thead>
      <tbody>{items.map(tpl=>(<tr key={tpl.communication_template_id}>
        <td><strong>{tpl.name}</strong>{tpl.description&&<div style={{fontSize:10,color:"#7899b0"}}>{tpl.description.slice(0,50)}</div>}</td>
        <td style={{fontSize:10,color:"#7899b0"}}>{commTypes.find(c=>c.communication_type_id===tpl.communication_type_id)?.name??"—"}</td>
        <td style={{color:"#7899b0"}}>{tpl.default_language}</td>
        <td style={{color:"#7899b0"}}>{tpl.default_tone??"—"}</td>
        <td><div className="row-actions">
          <button className="btn-icon" onClick={()=>{setSelTpl(tpl);loadSections(tpl.communication_template_id);setModal("sections");}}>{t("communication.tpl_btn_sections")}</button>
          <button className="btn-icon" onClick={()=>{setForm({communication_type_id:tpl.communication_type_id,name:tpl.name,description:tpl.description??"",general_prompt:tpl.general_prompt??"",default_language:tpl.default_language,default_tone:tpl.default_tone??"",default_detail_level:tpl.default_detail_level??""});setSel(tpl);setModal("edit");}}>{t("communication.tpl_btn_edit")}</button>
          <button className="btn-icon btn-icon--danger" onClick={async()=>{if(!confirm(t("communication.confirm_delete"))) return; await apiDelete(`/communication/templates/${tpl.communication_template_id}`); load();}}>{t("communication.tpl_btn_del")}</button>
        </div></td>
      </tr>))}</tbody></table>)}

    {/* Template create/edit modal */}
    {(modal==="create"||modal==="edit")&&<div className="mod-overlay" onClick={()=>setModal(null)}><div className="mod-modal" onClick={e=>e.stopPropagation()}>
      <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// {t("communication.tpl_modal_subtitle").toUpperCase()} //</span><h3 className="mod-modal__title">{modal==="create"?t("communication.tpl_modal_new"):t("communication.tpl_modal_edit")} <span>{t("communication.tpl_modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button></div>
      <div className="mod-modal__body">
        <div className="mod-field-row">
          <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_name")}</label><input className="mod-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_type")}</label><select className="mod-select" value={form.communication_type_id} onChange={e=>setForm(f=>({...f,communication_type_id:Number(e.target.value)}))}>{commTypes.map(ct=><option key={ct.communication_type_id} value={ct.communication_type_id}>{ct.name}</option>)}</select></div>
        </div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_description")}</label><textarea className="mod-textarea" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_general_prompt")}</label><textarea className="mod-textarea" rows={4} value={form.general_prompt} onChange={e=>setForm(f=>({...f,general_prompt:e.target.value}))}/></div>
        <div className="mod-field-row">
          <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_language")}</label><select className="mod-select" value={form.default_language} onChange={e=>setForm(f=>({...f,default_language:e.target.value}))}>{LANG_OPTIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
          <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_tone")}</label><select className="mod-select" value={form.default_tone} onChange={e=>setForm(f=>({...f,default_tone:e.target.value}))}>{TONE_OPTIONS.map(tone=><option key={tone} value={tone}>{tone||t("communication.select_none")}</option>)}</select></div>
        </div>
      </div>
      <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setModal(null)}>{t("communication.btn_cancel")}</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.name.trim()}>{saving?t("communication.btn_saving"):t("communication.btn_save")}</button></div>
    </div></div>}

    {/* Template sections modal */}
    {modal==="sections"&&selTpl&&<div className="mod-overlay" onClick={()=>setModal(null)}><div className="mod-modal" style={{maxWidth:900,width:"95vw"}} onClick={e=>e.stopPropagation()}>
      <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// SEÇÕES DO TEMPLATE //</span><h3 className="mod-modal__title">{selTpl.name}</h3></div><button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button></div>
      <div className="mod-modal__body">
        {selTpl.general_prompt&&<div style={{marginBottom:12,padding:"8px 12px",background:"rgba(192,132,252,0.06)",border:"1px solid rgba(192,132,252,0.2)",borderRadius:4,fontSize:10,color:"#c084fc"}}>🤖 PROMPT GERAL: {selTpl.general_prompt.slice(0,150)}…</div>}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><button className="btn-add" onClick={()=>{setSecForm({...SECEMPTY,display_order:tplSections.length});setSecSel(null);setSecModal("create");}}>+ NOVA SEÇÃO</button></div>
        {tplSections.length===0?<div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">SEM SEÇÕES</div></div>:(
          <table className="mod-table"><thead><tr><th>#</th><th>KEY</th><th>TÍTULO</th><th>OBRIG.</th><th>PROMPT IA</th><th></th></tr></thead>
          <tbody>{tplSections.map(s=>(<tr key={s.template_section_id}>
            <td style={{color:"#7899b0",fontSize:11}}>{s.display_order}</td>
            <td><span className="badge badge--info" style={{fontSize:9}}>{s.section_key}</span></td>
            <td><strong>{s.title}</strong>{s.description&&<div style={{fontSize:10,color:"#7899b0"}}>{s.description.slice(0,50)}</div>}</td>
            <td style={{textAlign:"center"}}>{s.is_required?<span style={{color:"#00ff88"}}>✓</span>:"—"}</td>
            <td style={{fontSize:10,color:"#c084fc",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.generation_prompt?"🤖 "+s.generation_prompt.slice(0,60)+"…":"—"}</td>
            <td><div className="row-actions">
              <button className="btn-icon" onClick={()=>{setSecForm({section_key:s.section_key,title:s.title,description:s.description??"",generation_prompt:s.generation_prompt??"",display_order:s.display_order,is_required:s.is_required,target_length:s.target_length?String(s.target_length):""});setSecSel(s);setSecModal("edit");}}>EDITAR</button>
              <button className="btn-icon btn-icon--danger" onClick={async()=>{if(!confirm("Excluir?")) return; await apiDelete(`/communication/template-sections/${s.template_section_id}`); loadSections(selTpl!.communication_template_id);}}>DEL</button>
            </div></td>
          </tr>))}</tbody></table>)}
      </div>
      <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setModal(null)}>FECHAR</button></div>
      {secModal&&<div className="mod-overlay" onClick={()=>setSecModal(null)}><div className="mod-modal" onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// SEÇÃO //</span><h3 className="mod-modal__title">{secModal==="create"?"NOVA":"EDITAR"} <span>SEÇÃO</span></h3></div><button className="mod-modal__close" onClick={()=>setSecModal(null)}>✕</button></div>
        <div className="mod-modal__body">
          <div className="mod-field-row">
            <div className="mod-field"><label className="mod-field__label">KEY *</label><input className="mod-input" value={secForm.section_key} onChange={e=>setSecForm(f=>({...f,section_key:e.target.value.toUpperCase().replace(/ /g,"_")}))}/></div>
            <div className="mod-field"><label className="mod-field__label">ORDEM</label><input className="mod-input" type="number" value={secForm.display_order} onChange={e=>setSecForm(f=>({...f,display_order:Number(e.target.value)}))}/></div>
          </div>
          <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={secForm.title} onChange={e=>setSecForm(f=>({...f,title:e.target.value}))}/></div>
          <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" rows={2} value={secForm.description} onChange={e=>setSecForm(f=>({...f,description:e.target.value}))}/></div>
          <div className="mod-field"><label className="mod-field__label">🤖 PROMPT DA SEÇÃO</label><textarea className="mod-textarea" rows={3} value={secForm.generation_prompt} onChange={e=>setSecForm(f=>({...f,generation_prompt:e.target.value}))} placeholder="Ex: Liste os benefícios entregues. Não cite IDs. Use até 150 palavras."/></div>
          <div className="mod-field-row">
            <div className="mod-field"><label className="mod-field__label">TAMANHO (palavras)</label><input className="mod-input" type="number" value={secForm.target_length} onChange={e=>setSecForm(f=>({...f,target_length:e.target.value}))}/></div>
            <div className="mod-field"><label className="mod-field__label" style={{display:"flex",gap:8,alignItems:"center",marginTop:16}}><input type="checkbox" checked={secForm.is_required} onChange={e=>setSecForm(f=>({...f,is_required:e.target.checked}))}/> OBRIGATÓRIA</label></div>
          </div>
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setSecModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSaveSection} disabled={secSaving||!secForm.title.trim()||!secForm.section_key.trim()}>{secSaving?"...":"SALVAR ⟩"}</button></div>
      </div></div>}
    </div></div>}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: COMMUNICATIONS
// ══════════════════════════════════════════════════════════════════════════════
function CommunicationsTab({productId,commTypes,templates}:{productId:string;commTypes:CommType[];templates:Template[]}) {
  const { t } = useTranslation();
  const [items,setItems]=useState<Communication[]>([]); const [total,setTotal]=useState(0); const [page,setPage]=useState(1);
  const [modal,setModal]=useState<"create"|"edit"|"publications"|null>(null); const [sel,setSel]=useState<Communication|null>(null); const [saving,setSaving]=useState(false);
  const SIZE=20;
  const EMPTY={name:"",description:"",objective:"",trigger_type:"MANUAL",communication_type_id:commTypes[0]?.communication_type_id??0,communication_template_id:"",default_language:"pt-BR",default_tone:"",default_detail_level:"",status:"DRAFT"};
  const [form,setForm]=useState({...EMPTY});

  const load=(p=page,pid=productId)=>{ apiGet<{total:number;items:Communication[]}>(`/communication?page=${p}&size=${SIZE}${pid?`&product_id=${pid}`:""}`).then(r=>{setItems(r.items);setTotal(r.total);}).catch(()=>{}); };
  useEffect(()=>{load(1,productId);setPage(1);},[productId]);
  useEffect(()=>{load();},[page]);

  const handleSave=async()=>{
    if(!form.name.trim()||!form.objective.trim()) return; setSaving(true);
    try{
      const body={...form,communication_type_id:Number(form.communication_type_id),communication_template_id:form.communication_template_id?Number(form.communication_template_id):null,product_id:Number(productId)||undefined,default_tone:form.default_tone||null,default_detail_level:form.default_detail_level||null};
      if(modal==="create") await apiPost("/communication",body); else if(sel) await apiPatch(`/communication/${sel.communication_id}`,body);
      setModal(null); load(page);
    } catch(e:unknown){alert(e instanceof Error?e.message:"Erro");} finally{setSaving(false);}
  };

  return (<div>
    <div className="mod-header">
      <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.comm_eyebrow")}</span><h1 className="mod-header__title">{t("communication.comm_title")}</h1><p className="mod-header__meta">{t("communication.comm_meta",{count:total})}</p></div>
      <button className="btn-add" onClick={()=>{setForm({...EMPTY,communication_type_id:commTypes[0]?.communication_type_id??0});setSel(null);setModal("create");}} disabled={!productId}>{t("communication.comm_btn_new")}</button>
    </div>
    {!productId&&<div className="mod-error">{t("communication.comm_no_product")}</div>}
    {items.length===0&&productId?<div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("communication.comm_empty")}</div></div>:(
      <table className="mod-table"><thead><tr><th>{t("communication.comm_col_name")}</th><th>{t("communication.comm_col_type")}</th><th>{t("communication.comm_col_trigger")}</th><th>{t("communication.comm_col_language")}</th><th>{t("communication.comm_col_status")}</th><th></th></tr></thead>
      <tbody>{items.map(c=>(<tr key={c.communication_id}>
        <td><strong>{c.name}</strong>{c.description&&<div style={{fontSize:10,color:"#7899b0"}}>{c.description.slice(0,50)}</div>}</td>
        <td style={{fontSize:10,color:"#7899b0"}}>{commTypes.find(t=>t.communication_type_id===c.communication_type_id)?.name??"—"}</td>
        <td><span className="badge badge--info">{c.trigger_type}</span></td>
        <td style={{color:"#7899b0"}}>{c.default_language??"—"}</td>
        <td><Badge s={c.status}/></td>
        <td><div className="row-actions">
          <button className="btn-icon" onClick={()=>{setSel(c);setModal("publications");}}>{t("communication.comm_btn_publications")}</button>
          <button className="btn-icon" onClick={()=>{setForm({name:c.name,description:c.description??"",objective:c.objective,trigger_type:c.trigger_type,communication_type_id:c.communication_type_id,communication_template_id:c.communication_template_id?String(c.communication_template_id):"",default_language:c.default_language??"pt-BR",default_tone:c.default_tone??"",default_detail_level:c.default_detail_level??"",status:c.status});setSel(c);setModal("edit");}}>{t("communication.comm_btn_edit")}</button>
          <button className="btn-icon btn-icon--danger" onClick={async()=>{if(!confirm(t("communication.confirm_delete"))) return; await apiDelete(`/communication/${c.communication_id}`); load(page);}}>{t("communication.comm_btn_del")}</button>
        </div></td>
      </tr>))}</tbody></table>)}
    {total>SIZE&&<div className="mod-pagination"><span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} de {total}</span><div className="mod-pagination__btns"><button className="btn-page" disabled={page===1} onClick={()=>setPage(p=>p-1)}>ANTERIOR</button><button className="btn-page" disabled={page*SIZE>=total} onClick={()=>setPage(p=>p+1)}>PRÓXIMO</button></div></div>}

    {(modal==="create"||modal==="edit")&&<div className="mod-overlay" onClick={()=>setModal(null)}><div className="mod-modal" onClick={e=>e.stopPropagation()}>
      <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// {t("communication.comm_modal_subtitle").toUpperCase()} //</span><h3 className="mod-modal__title">{modal==="create"?t("communication.comm_modal_new"):t("communication.comm_modal_edit")} <span>{t("communication.comm_modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button></div>
      <div className="mod-modal__body">
        <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_name")}</label><input className="mod-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: BA Magazine"/></div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_objective")}</label><textarea className="mod-textarea" value={form.objective} onChange={e=>setForm(f=>({...f,objective:e.target.value}))}/></div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_description")}</label><textarea className="mod-textarea" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
        <div className="mod-field-row">
          <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_type")}</label><select className="mod-select" value={form.communication_type_id} onChange={e=>setForm(f=>({...f,communication_type_id:Number(e.target.value)}))}>{commTypes.map(t=><option key={t.communication_type_id} value={t.communication_type_id}>{t.name}</option>)}</select></div>
          <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_template")}</label><select className="mod-select" value={form.communication_template_id} onChange={e=>setForm(f=>({...f,communication_template_id:e.target.value}))}><option value="">{t("communication.comm_form_no_template")}</option>{templates.map(t=><option key={t.communication_template_id} value={t.communication_template_id}>{t.name}</option>)}</select></div>
        </div>
        <div className="mod-field-row">
          <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_trigger")}</label><select className="mod-select" value={form.trigger_type} onChange={e=>setForm(f=>({...f,trigger_type:e.target.value}))}>{TRIGGER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_language")}</label><select className="mod-select" value={form.default_language} onChange={e=>setForm(f=>({...f,default_language:e.target.value}))}>{LANG_OPTIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
        </div>
        <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_tone")}</label><select className="mod-select" value={form.default_tone} onChange={e=>setForm(f=>({...f,default_tone:e.target.value}))}>{TONE_OPTIONS.map(tone=><option key={tone} value={tone}>{tone||t("communication.select_none")}</option>)}</select></div>
        {modal==="edit"&&<div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_status")}</label><select className="mod-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{COMM_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
      </div>
      <div className="mod-modal__footer"><button className="btn-cancel" onClick={()=>setModal(null)}>{t("communication.btn_cancel")}</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.name.trim()||!form.objective.trim()}>{saving?t("communication.btn_saving"):t("communication.btn_save")}</button></div>
    </div></div>}
    {modal==="publications"&&sel&&<PublicationsModal communication={sel} onClose={()=>setModal(null)}/>}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CommunicationPage() {
  const { t } = useTranslation();
  const [productId,setProductId]=useState(localStorage.getItem("pl_product")??"");
  const [tab,setTab]=useState<"communications"|"audiences"|"templates"|"types">("communications");
  const [commTypes,setCommTypes]=useState<CommType[]>([]);
  const [templates,setTemplates]=useState<Template[]>([]);

  useEffect(()=>{
    apiGet<CommType[]>("/communication/types").then(setCommTypes).catch(()=>{});
    apiGet<{items:Template[]}>("/communication/templates?size=100").then(r=>setTemplates(r.items)).catch(()=>{});
  },[]);

  const handleProductChange=(id:string)=>{localStorage.setItem("pl_product",id);setProductId(id);};

  const tabs=[
    {key:"communications",label:"COMMUNICATIONS"},
    {key:"audiences",label:"AUDIENCES"},
    {key:"templates",label:"TEMPLATES"},
    {key:"types",label:"TYPES"},
  ] as const;

  const tabStyle=(t:string):React.CSSProperties=>({
    padding:"6px 16px",fontSize:9,letterSpacing:3,cursor:"pointer",
    background:tab===t?"rgba(0,212,255,0.12)":"transparent",
    border:`1px solid ${tab===t?"rgba(0,212,255,0.5)":"rgba(0,212,255,0.15)"}`,
    color:tab===t?"#00d4ff":"#7899b0",borderRadius:2,
  });

  return (
    <ModuleLayout moduleIcon="◈" moduleName={t("communication.module_name")} moduleAccent={t("communication.module_name")} selectedProductId={productId} onProductChange={handleProductChange}>
      <div style={{display:"flex",gap:8,marginBottom:24,padding:"0 0 12px 0",borderBottom:"1px solid rgba(0,212,255,0.1)",flexWrap:"wrap"}}>
        {tabs.map(t=><button key={t.key} style={tabStyle(t.key)} onClick={()=>setTab(t.key)}>{t.label}</button>)}
      </div>
      {tab==="communications" && <CommunicationsTab productId={productId} commTypes={commTypes} templates={templates}/>}
      {tab==="audiences"      && <AudiencesTab productId={productId}/>}
      {tab==="templates"      && <TemplatesTab commTypes={commTypes}/>}
      {tab==="types"          && <TypesTab/>}
    </ModuleLayout>
  );
}
