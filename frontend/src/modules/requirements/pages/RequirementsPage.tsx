import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Req { id:number; product_id:number|null; requirement_code:string; requirement_title:string; requirement_description:string; requirement_type:string; requirement_source:string|null; priority:string; lifecycle_status:string; fulfillment_status:string; acceptance_definition:string|null; requirement_owner:string|null; created_at:string; updated_at:string; }
interface Ver { id:number; requirement_id:number; verification_type:string; verification_result:string; evidence:string|null; notes:string|null; created_at:string; updated_at:string; }

const REQ_TYPES = ["BUSINESS","FUNCTIONAL","NON_FUNCTIONAL","DATA","INTEGRATION","SECURITY","COMPLIANCE","UX"];
const PRIORITIES = ["LOW","MEDIUM","HIGH","CRITICAL"];
const LIFECYCLE = ["DRAFT","PROPOSED","VALIDATED","APPROVED","REJECTED","OBSOLETE"];
const FULFILLMENT = ["NOT_STARTED","PARTIALLY_MET","MET","NOT_MET","NOT_APPLICABLE"];
const VER_TYPES = ["TEST","USER_ACCEPTANCE","DOCUMENT_REVIEW","METRIC","MANUAL_VALIDATION"];
const VER_RESULTS = ["PASS","PARTIAL","FAIL","NOT_VERIFIED"];
const EMPTY = { requirement_code:"", requirement_title:"", requirement_description:"", requirement_type:"FUNCTIONAL", requirement_source:"", priority:"MEDIUM", lifecycle_status:"DRAFT", fulfillment_status:"NOT_STARTED", acceptance_definition:"", requirement_owner:"" };
const EMPTY_V = { verification_type:"TEST", verification_result:"NOT_VERIFIED", evidence:"", notes:"" };

const prioC=(p:string)=>p==="CRITICAL"?"#ff4444":p==="HIGH"?"#ff9900":p==="MEDIUM"?"#00d4ff":"#7899b0";
const lifeC=(s:string)=>s==="APPROVED"?"#00ff88":s==="VALIDATED"?"#00d4ff":s==="REJECTED"?"#ff4444":s==="OBSOLETE"?"#555":"#ff9900";
const fulC=(s:string)=>s==="MET"?"#00ff88":s==="PARTIALLY_MET"?"#ff9900":s==="NOT_MET"?"#ff4444":"#7899b0";
const verC=(r:string)=>r==="PASS"?"#00ff88":r==="PARTIAL"?"#ff9900":r==="FAIL"?"#ff4444":"#7899b0";

export default function RequirementsPage() {
  const [pid, setPid]= useState(localStorage.getItem("pl_product")??"");
  const [items, setItems]=useState<Req[]>([]); const [total,setTotal]=useState(0); const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const [fType,setFType]=useState(""); const [fLife,setFLife]=useState(""); const [fPrio,setFPrio]=useState("");
  const [modal,setModal]=useState<"create"|"edit"|null>(null); const [form,setForm]=useState({...EMPTY});
  const [editing,setEditing]=useState<Req|null>(null); const [saving,setSaving]=useState(false);
  const [sel,setSel]=useState<Req|null>(null); const [tab,setTab]=useState<"info"|"ver">("info");
  const [vers,setVers]=useState<Ver[]>([]); const [vf,setVf]=useState({...EMPTY_V}); const [savingV,setSavingV]=useState(false);
  const S=20;

  const load=async(p=page,id=pid)=>{
    setLoading(true);setErr("");
    try{
      let qs=`page=${p}&size=${S}`;if(id)qs+=`&product_id=${id}`;if(fType)qs+=`&requirement_type=${fType}`;if(fLife)qs+=`&lifecycle_status=${fLife}`;if(fPrio)qs+=`&priority=${fPrio}`;
      const r=await apiGet<Paginated<Req>>(`/requirements?${qs}`);setItems(r.items);setTotal(r.total);
    }catch(e:unknown){setErr(e instanceof Error?e.message:"Erro");}finally{setLoading(false);}
  };
  const loadV=async(id:number)=>{try{setVers(await apiGet<Ver[]>(`/requirements/${id}/verifications`));}catch{setVers([]);}};

  useEffect(()=>{load(1,pid);setPage(1);},[pid,fType,fLife,fPrio]);
  useEffect(()=>{load();},[page]);

  const changePid=(id:string)=>{localStorage.setItem("pl_product",id);setPid(id);setSel(null);};
  const openCreate=()=>{setForm({...EMPTY});setEditing(null);setModal("create");};
  const openEdit=(item:Req)=>{setForm({requirement_code:item.requirement_code,requirement_title:item.requirement_title,requirement_description:item.requirement_description,requirement_type:item.requirement_type,requirement_source:item.requirement_source??"",priority:item.priority,lifecycle_status:item.lifecycle_status,fulfillment_status:item.fulfillment_status,acceptance_definition:item.acceptance_definition??"",requirement_owner:item.requirement_owner??""});setEditing(item);setModal("edit");};
  const closeModal=()=>{setModal(null);setEditing(null);};

  const save=async()=>{
    if(!form.requirement_code.trim()||!form.requirement_title.trim()||!form.requirement_description.trim())return;
    setSaving(true);
    try{
      const body={...form,product_id:pid?Number(pid):null};
      if(modal==="create")await apiPost("/requirements",body);
      else if(editing)await apiPatch(`/requirements/${editing.id}`,body);
      closeModal();load(page);
    }catch(e:unknown){setErr(e instanceof Error?e.message:"Erro ao salvar");}finally{setSaving(false);}
  };

  const del=async(id:number)=>{
    if(!confirm("Excluir este requisito?"))return;
    try{await apiDelete(`/requirements/${id}`);load(page);if(sel?.id===id)setSel(null);}
    catch(e:unknown){setErr(e instanceof Error?e.message:"Erro");}
  };

  const select=(item:Req)=>{setSel(item);setTab("info");loadV(item.id);};

  const addV=async()=>{
    if(!sel)return;setSavingV(true);
    try{await apiPost(`/requirements/${sel.id}/verifications`,vf);setVf({...EMPTY_V});loadV(sel.id);}
    catch(e:unknown){setErr(e instanceof Error?e.message:"Erro");}finally{setSavingV(false);}
  };

  const delV=async(vid:number)=>{
    if(!sel||!confirm("Excluir verificação?"))return;
    try{await apiDelete(`/requirements/${sel.id}/verifications/${vid}`);loadV(sel.id);}catch{/**/}
  };

  const F=(lbl:string,ch:React.ReactNode)=><div className="mod-field"><label className="mod-field__label">{lbl}</label>{ch}</div>;

  return (
    <ModuleLayout moduleIcon="◫" moduleName="REQUIREMENTS" moduleAccent="MANAGEMENT" selectedProductId={pid} onProductChange={changePid}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// REQUIREMENTS MANAGEMENT //</span>
          <h1 className="mod-header__title">REQUIREMENTS <span>MANAGEMENT</span></h1>
          <p className="mod-header__meta">{total} requisito(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO REQUISITO</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <select className="mod-select" value={fType} onChange={e=>{setFType(e.target.value);setPage(1);}}>
          <option value="">TODOS OS TIPOS</option>{REQ_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="mod-select" value={fLife} onChange={e=>{setFLife(e.target.value);setPage(1);}}>
          <option value="">TODOS OS STATUS</option>{LIFECYCLE.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="mod-select" value={fPrio} onChange={e=>{setFPrio(e.target.value);setPage(1);}}>
          <option value="">TODAS AS PRIORIDADES</option>{PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {err&&<div className="mod-error">⚠ {err}</div>}

      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div className="mod-table-wrap" style={{flex:sel?"0 0 56%":"1 1 100%",minWidth:0}}>
          {loading?<div className="mod-loading">CARREGANDO...</div>:items.length===0?(
            <div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">SEM REQUISITOS</div><div className="mod-empty__sub">Cadastre os requisitos do produto</div></div>
          ):(
            <table className="mod-table">
              <thead><tr><th>CÓDIGO</th><th>TÍTULO</th><th>TIPO</th><th>PRIORIDADE</th><th>LIFECYCLE</th><th>ATENDIMENTO</th><th></th></tr></thead>
              <tbody>
                {items.map(item=>(
                  <tr key={item.id} style={{cursor:"pointer",background:sel?.id===item.id?"rgba(0,212,255,0.06)":undefined}} onClick={()=>select(item)}>
                    <td><span style={{fontFamily:"monospace",color:"#00d4ff",fontSize:11}}>{item.requirement_code}</span></td>
                    <td><strong style={{fontSize:12}}>{item.requirement_title}</strong>{item.requirement_owner&&<div style={{fontSize:9,color:"#7899b0",marginTop:2}}>{item.requirement_owner}</div>}</td>
                    <td><span className="badge" style={{background:"rgba(0,229,204,0.12)",color:"#00e5cc",fontSize:9}}>{item.requirement_type}</span></td>
                    <td><span className="badge" style={{background:`${prioC(item.priority)}22`,color:prioC(item.priority),fontSize:9}}>{item.priority}</span></td>
                    <td><span className="badge" style={{background:`${lifeC(item.lifecycle_status)}22`,color:lifeC(item.lifecycle_status),fontSize:9}}>{item.lifecycle_status}</span></td>
                    <td><span className="badge" style={{background:`${fulC(item.fulfillment_status)}22`,color:fulC(item.fulfillment_status),fontSize:9}}>{item.fulfillment_status.replace(/_/g," ")}</span></td>
                    <td onClick={e=>e.stopPropagation()}><div className="row-actions"><button className="btn-icon" onClick={()=>openEdit(item)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={()=>del(item.id)}>DEL</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {total>S&&<div className="mod-pagination"><span>{(page-1)*S+1}–{Math.min(page*S,total)} de {total}</span><div className="mod-pagination__btns"><button className="btn-page" disabled={page===1} onClick={()=>setPage(p=>p-1)}>ANTERIOR</button><button className="btn-page" disabled={page*S>=total} onClick={()=>setPage(p=>p+1)}>PRÓXIMO</button></div></div>}
        </div>

        {sel&&(
          <div style={{flex:"0 0 42%",minWidth:0,background:"rgba(6,10,20,0.95)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:4,padding:16,fontSize:11,overflowY:"auto",maxHeight:700}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>// DETALHE //</div>
                <div style={{fontWeight:700,fontSize:13,color:"#00d4ff"}}>{sel.requirement_code}</div>
                <div style={{fontSize:12,color:"#e0eaff",marginTop:2}}>{sel.requirement_title}</div>
              </div>
              <button className="mod-modal__close" onClick={()=>setSel(null)}>✕</button>
            </div>
            <div style={{display:"flex",gap:4,marginBottom:10,borderBottom:"1px solid rgba(0,212,255,0.1)",paddingBottom:8}}>
              {(["info","ver"] as const).map(t=>(
                <button key={t} className={`btn-page${tab===t?" btn-page--active":""}`} onClick={()=>setTab(t)} style={{fontSize:9,padding:"3px 10px"}}>
                  {t==="info"?"INFO":"VERIFICAÇÕES"}
                </button>
              ))}
            </div>

            {tab==="info"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>TIPO</div><div style={{color:"#00e5cc"}}>{sel.requirement_type}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>PRIORIDADE</div><div style={{color:prioC(sel.priority)}}>{sel.priority}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>LIFECYCLE</div><div style={{color:lifeC(sel.lifecycle_status)}}>{sel.lifecycle_status}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>ATENDIMENTO</div><div style={{color:fulC(sel.fulfillment_status)}}>{sel.fulfillment_status.replace(/_/g," ")}</div></div>
                </div>
                <div style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:4}}>DESCRIÇÃO</div>
                <div style={{color:"#c0d4e8",lineHeight:1.5,marginTop:2}}>{sel.requirement_description}</div>
                {sel.acceptance_definition&&<><div style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:8}}>CRITÉRIO DE ACEITE</div><div style={{color:"#c0d4e8",lineHeight:1.5,marginTop:2}}>{sel.acceptance_definition}</div></>}
                {sel.requirement_source&&<><div style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:8}}>FONTE</div><div style={{color:"#c0d4e8",marginTop:2}}>{sel.requirement_source}</div></>}
                <div style={{marginTop:12,display:"flex",gap:6}}>
                  <button className="btn-icon" onClick={()=>openEdit(sel)}>EDITAR REQUISITO</button>
                </div>
              </div>
            )}

            {tab==="ver"&&(
              <div>
                {vers.length===0?<div style={{color:"#7899b0",fontSize:11,padding:"8px 0"}}>Nenhuma verificação ainda.</div>:(
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {vers.map(v=>(
                      <div key={v.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:4,padding:"8px 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:10,color:"#00e5cc",letterSpacing:1}}>{v.verification_type}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span className="badge" style={{background:`${verC(v.verification_result)}22`,color:verC(v.verification_result),fontSize:9}}>{v.verification_result}</span>
                            <button className="btn-icon btn-icon--danger" style={{fontSize:9,padding:"2px 6px"}} onClick={()=>delV(v.id)}>DEL</button>
                          </div>
                        </div>
                        {v.evidence&&<div style={{fontSize:10,color:"#c0d4e8",marginTop:4}}>{v.evidence}</div>}
                        {v.notes&&<div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{v.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{borderTop:"1px solid rgba(0,212,255,0.1)",paddingTop:10,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>// NOVA VERIFICAÇÃO //</div>
                  <select className="mod-select" value={vf.verification_type} onChange={e=>setVf(v=>({...v,verification_type:e.target.value}))}>
                    {VER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="mod-select" value={vf.verification_result} onChange={e=>setVf(v=>({...v,verification_result:e.target.value}))}>
                    {VER_RESULTS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <input className="mod-input" placeholder="Evidência" value={vf.evidence} onChange={e=>setVf(v=>({...v,evidence:e.target.value}))} />
                  <textarea className="mod-textarea" placeholder="Notas" value={vf.notes} onChange={e=>setVf(v=>({...v,notes:e.target.value}))} rows={2} />
                  <button className="btn-save" onClick={addV} disabled={savingV}>{savingV?"SALVANDO...":"ADICIONAR VERIFICAÇÃO ⟩"}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modal&&(
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:680,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// REQUISITO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVO":"EDITAR"} <span>REQUISITO</span></h3></div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                {F("CÓDIGO *",<input className="mod-input" value={form.requirement_code} onChange={e=>setForm(f=>({...f,requirement_code:e.target.value}))} placeholder="Ex: REQ-001" />)}
                {F("RESPONSÁVEL",<input className="mod-input" value={form.requirement_owner} onChange={e=>setForm(f=>({...f,requirement_owner:e.target.value}))} placeholder="Nome do responsável" />)}
              </div>
              {F("TÍTULO *",<input className="mod-input" value={form.requirement_title} onChange={e=>setForm(f=>({...f,requirement_title:e.target.value}))} placeholder="Título do requisito" />)}
              {F("DESCRIÇÃO *",<textarea className="mod-textarea" value={form.requirement_description} onChange={e=>setForm(f=>({...f,requirement_description:e.target.value}))} placeholder="Descreva o requisito em detalhes..." rows={3} />)}
              {F("CRITÉRIO DE ACEITE",<textarea className="mod-textarea" value={form.acceptance_definition} onChange={e=>setForm(f=>({...f,acceptance_definition:e.target.value}))} placeholder="Definição de aceite / DoD..." rows={2} />)}
              <div className="mod-field-row">
                {F("TIPO",<select className="mod-select" value={form.requirement_type} onChange={e=>setForm(f=>({...f,requirement_type:e.target.value}))}>{REQ_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>)}
                {F("PRIORIDADE",<select className="mod-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}</select>)}
              </div>
              <div className="mod-field-row">
                {F("LIFECYCLE STATUS",<select className="mod-select" value={form.lifecycle_status} onChange={e=>setForm(f=>({...f,lifecycle_status:e.target.value}))}>{LIFECYCLE.map(s=><option key={s} value={s}>{s}</option>)}</select>)}
                {F("ATENDIMENTO",<select className="mod-select" value={form.fulfillment_status} onChange={e=>setForm(f=>({...f,fulfillment_status:e.target.value}))}>{FULFILLMENT.map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select>)}
              </div>
              {F("FONTE / ORIGEM",<input className="mod-input" value={form.requirement_source} onChange={e=>setForm(f=>({...f,requirement_source:e.target.value}))} placeholder="Stakeholder, documento, entrevista..." />)}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>CANCELAR</button>
              <button className="btn-save" onClick={save} disabled={saving||!form.requirement_code.trim()||!form.requirement_title.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
