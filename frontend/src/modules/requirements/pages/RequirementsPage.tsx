import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import RaciPanel from "../../../shared/components/RaciPanel";
import AttachmentsPanel from "../../../shared/components/AttachmentsPanel";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

// Prefix map: requirement_type → code prefix
const TYPE_PREFIX: Record<string,string> = {
  BUSINESS:      "BR",
  FUNCTIONAL:    "FR",
  NON_FUNCTIONAL:"NFR",
  DATA:          "DR",
  INTEGRATION:   "IR",
  SECURITY:      "SR",
  COMPLIANCE:    "CR",
  UX:            "UXR",
};

const SOURCE_TYPES = ["DISCOVERY","MEETING","STAKEHOLDER","RESEARCH","DOCUMENT","MANUAL"] as const;
const SOURCE_WITH_RECORDS = ["DISCOVERY","MEETING","STAKEHOLDER"];
const LOCKED_FIELDS = ["requirement_title","requirement_description","requirement_type","priority","acceptance_definition","fulfillment_status"];
const STATUS_LOCKED_FROM = ["APPROVED","VALIDATED"];

const parseSource = (src: string|null) => {
  if (!src) return { type:"MANUAL", refId:"", refLabel:"" };
  const p = src.split("|");
  if (p.length===3) return { type:p[0], refId:p[1], refLabel:p[2] };
  return { type:"MANUAL", refId:"", refLabel:src };
};
const buildSource = (type:string, refId:string, refLabel:string) => `${type}|${refId}|${refLabel}`;
const isRoadmapSource = (src: string|null) => parseSource(src).type === "ROADMAP";

interface Req { id:number; product_id:number|null; requirement_code:string; requirement_title:string; requirement_description:string; requirement_type:string; requirement_source:string|null; priority:string; lifecycle_status:string; fulfillment_status:string; acceptance_definition:string|null; requirement_owner:string|null; created_at:string; updated_at:string; }
interface Ver { id:number; requirement_id:number; verification_type:string; verification_result:string; evidence:string|null; notes:string|null; created_at:string; updated_at:string; }
interface HistEntry { id:number; requirement_id:number; changed_by:string|null; changed_at:string; change_type:string; field_name:string|null; old_value:string|null; new_value:string|null; change_reason:string|null; }
interface CREntry { id:number; requirement_id:number; requested_by:string; requested_at:string; change_description:string; impact_analysis:string|null; priority:string; status:string; approved_by:string|null; rejection_reason:string|null; }
interface DeliveryBacklogLink { requirement_id:number; backlog_item_id:number; title:string; current_status:string; item_type_id?:number|null; item_type_name?:string|null; coverage_type:string; notes?:string|null; }

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
const crC=(s:string)=>s==="APPROVED"?"#00ff88":s==="REJECTED"?"#ff4444":s==="IMPLEMENTED"?"#00d4ff":"#ff9900";

// ── DomainLinksTab ────────────────────────────────────────────────────────────
interface DomainLink { id:number; requirement_id:number; domain_id:number; subdomain_id:number|null; domain_code:string|null; domain_name:string|null; subdomain_code:string|null; subdomain_name:string|null; }
interface DomainItem { id:number; domain_code:string; domain_name:string; subdomains:{id:number;subdomain_code:string;subdomain_name:string}[]; }
function DomainLinksTab({ requirementId, t }: { requirementId:number; t:(k:string,o?:Record<string,string>)=>string }) {
  const [links, setLinks] = useState<DomainLink[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selDomain, setSelDomain] = useState("");
  const [selSub, setSelSub] = useState("");
  const [saving, setSaving] = useState(false);
  const load=()=>{ apiGet<DomainLink[]>(`/business-domains/requirements/${requirementId}/domains`).then(setLinks).catch(()=>setLinks([])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); apiGet<DomainItem[]>("/business-domains").then(setDomains).catch(()=>{}); },[requirementId]);
  const chosenDomain = domains.find(d=>String(d.id)===selDomain);
  const link=async()=>{
    if(!selDomain) return; setSaving(true);
    try{ await apiPost(`/business-domains/requirements/${requirementId}/domains`,{domain_id:Number(selDomain),subdomain_id:selSub?Number(selSub):null}); setSelDomain(""); setSelSub(""); load(); }
    catch{/**/}finally{setSaving(false);}
  };
  const unlink=async(linkId:number)=>{ try{ await apiDelete(`/business-domains/requirements/${requirementId}/domains/${linkId}`); load(); }catch{/**/} };
  if(loading) return <div className="mod-loading" style={{fontSize:10}}>{t("requirements.loading")}</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{fontSize:9,color:"#a78bfa",letterSpacing:2,marginBottom:4}}>// BUSINESS DOMAINS //</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 10px",background:"rgba(167,139,250,0.05)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:3}}>
        <select className="mod-select" style={{flex:2,minWidth:120}} value={selDomain} onChange={e=>{setSelDomain(e.target.value);setSelSub("");}}>
          <option value="">— Select domain —</option>
          {domains.map(d=><option key={d.id} value={String(d.id)}>{d.domain_code} — {d.domain_name}</option>)}
        </select>
        {chosenDomain&&chosenDomain.subdomains.length>0&&(
          <select className="mod-select" style={{flex:2,minWidth:100}} value={selSub} onChange={e=>setSelSub(e.target.value)}>
            <option value="">— Subdomain (optional) —</option>
            {chosenDomain.subdomains.map(s=><option key={s.id} value={String(s.id)}>{s.subdomain_code} — {s.subdomain_name}</option>)}
          </select>
        )}
        <button className="btn-save" style={{flex:"0 0 auto",fontSize:9,padding:"4px 10px"}} disabled={!selDomain||saving} onClick={link}>{saving?"...":"LINK ⟩"}</button>
      </div>
      {links.length===0?<div style={{color:"#7899b0",fontSize:11}}>No domains linked yet.</div>:links.map(lk=>(
        <div key={lk.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:3,padding:"7px 10px"}}>
          <div>
            <span style={{fontFamily:"monospace",color:"#a78bfa",fontWeight:700,fontSize:10}}>{lk.domain_code}</span>
            <span style={{color:"#c0d4e8",fontSize:11,marginLeft:6}}>{lk.domain_name}</span>
            {lk.subdomain_code&&<span style={{fontSize:9,color:"#7899b0",marginLeft:6}}>/ {lk.subdomain_code}</span>}
          </div>
          <button className="btn-icon btn-icon--danger" style={{fontSize:9}} onClick={()=>unlink(lk.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── HistoryTab ────────────────────────────────────────────────────────────────
function HistoryTab({ requirementId, t }: { requirementId:number; t:(k:string,o?:Record<string,string>)=>string }) {
  const [items, setItems] = useState<HistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    apiGet<HistEntry[]>(`/requirements/${requirementId}/history`)
      .then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false));
  },[requirementId]);
  if(loading) return <div className="mod-loading" style={{fontSize:10}}>{t("requirements.loading")}</div>;
  if(!items.length) return <div style={{color:"#7899b0",fontSize:11,padding:"8px 0"}}>{t("requirements.history_empty")}</div>;
  const tLabel=(ct:string)=>ct==="CREATED"?t("requirements.history_type_created"):ct==="STATUS_CHANGE"?t("requirements.history_type_status_change"):ct==="DELETED"?t("requirements.history_type_deleted"):t("requirements.history_type_updated");
  const tColor=(ct:string)=>ct==="CREATED"?"#00ff88":ct==="DELETED"?"#ff4444":ct==="STATUS_CHANGE"?"#ff9900":"#00d4ff";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:4}}>{t("requirements.history_eyebrow")}</div>
      {items.map(h=>(
        <div key={h.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:3,padding:"8px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span className="badge" style={{background:`${tColor(h.change_type)}22`,color:tColor(h.change_type),fontSize:9}}>{tLabel(h.change_type)}</span>
            <span style={{fontSize:9,color:"#7899b0"}}>{new Date(h.changed_at).toLocaleString("pt-BR")}</span>
          </div>
          {h.field_name&&<div style={{fontSize:10,color:"#c0d4e8"}}><span style={{color:"#7899b0"}}>{t("requirements.history_field_label")}:</span> {h.field_name} <span style={{color:"#ff4444",textDecoration:"line-through"}}>{h.old_value}</span> → <span style={{color:"#00ff88"}}>{h.new_value}</span></div>}
          {h.change_reason&&<div style={{fontSize:10,color:"#ff9900",marginTop:3}}><span style={{color:"#7899b0"}}>{t("requirements.history_reason_label")}:</span> {h.change_reason}</div>}
          {h.changed_by&&<div style={{fontSize:9,color:"#7899b0",marginTop:2}}>{h.changed_by}</div>}
        </div>
      ))}
    </div>
  );
}

// ── ChangeRequestsTab ─────────────────────────────────────────────────────────
function ChangeRequestsTab({ requirementId, t }: { requirementId:number; t:(k:string,o?:Record<string,string>)=>string }) {
  const [items, setItems] = useState<CREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ requested_by:"", change_description:"", impact_analysis:"", priority:"MEDIUM" });
  const [saving, setSaving] = useState(false);
  const load=()=>{ apiGet<CREntry[]>(`/requirements/${requirementId}/change-requests`).then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[requirementId]);
  const submit=async()=>{
    if(!form.requested_by.trim()||!form.change_description.trim()) return;
    setSaving(true);
    try{ await apiPost(`/requirements/${requirementId}/change-requests`,form); setShowNew(false); setForm({requested_by:"",change_description:"",impact_analysis:"",priority:"MEDIUM"}); load(); }
    catch{/**/}finally{setSaving(false);}
  };
  if(loading) return <div className="mod-loading" style={{fontSize:10}}>{t("requirements.loading")}</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>{t("requirements.cr_eyebrow")}</div>
        <button className="btn-icon" style={{fontSize:9}} onClick={()=>setShowNew(!showNew)}>{t("requirements.cr_btn_new")}</button>
      </div>
      {showNew&&(
        <div style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:3,padding:10,display:"flex",flexDirection:"column",gap:6}}>
          <input className="mod-input" placeholder={t("requirements.cr_field_requester")} value={form.requested_by} onChange={e=>setForm(f=>({...f,requested_by:e.target.value}))} />
          <textarea className="mod-textarea" rows={2} placeholder={t("requirements.cr_placeholder_description")} value={form.change_description} onChange={e=>setForm(f=>({...f,change_description:e.target.value}))} />
          <textarea className="mod-textarea" rows={2} placeholder={t("requirements.cr_placeholder_impact")} value={form.impact_analysis} onChange={e=>setForm(f=>({...f,impact_analysis:e.target.value}))} />
          <select className="mod-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
            {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{display:"flex",gap:6}}>
            <button className="btn-cancel" style={{flex:1}} onClick={()=>setShowNew(false)}>{t("requirements.btn_cancel")}</button>
            <button className="btn-save" style={{flex:1}} onClick={submit} disabled={saving}>{saving?t("requirements.btn_saving"):t("requirements.btn_save")}</button>
          </div>
        </div>
      )}
      {!items.length&&<div style={{color:"#7899b0",fontSize:11,padding:"4px 0"}}>{t("requirements.cr_empty")}</div>}
      {items.map(cr=>(
        <div key={cr.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:3,padding:"8px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span className="badge" style={{background:`${crC(cr.status)}22`,color:crC(cr.status),fontSize:9}}>{cr.status}</span>
            <span style={{fontSize:9,color:"#7899b0"}}>{new Date(cr.requested_at).toLocaleDateString("pt-BR")}</span>
          </div>
          <div style={{fontSize:11,color:"#c0d4e8"}}>{cr.change_description}</div>
          {cr.impact_analysis&&<div style={{fontSize:10,color:"#7899b0",marginTop:3}}>{cr.impact_analysis}</div>}
          <div style={{fontSize:9,color:"#7899b0",marginTop:3}}>{cr.requested_by} · {cr.priority}</div>
          {cr.approved_by&&<div style={{fontSize:9,color:"#00ff88",marginTop:2}}>✓ {cr.approved_by}</div>}
          {cr.rejection_reason&&<div style={{fontSize:9,color:"#ff4444",marginTop:2}}>{cr.rejection_reason}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RequirementsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [pid, setPid] = useState(localStorage.getItem("pl_product")??"");
  const [items, setItems] = useState<Req[]>([]); const [total,setTotal] = useState(0); const [page,setPage] = useState(1);
  const [loading,setLoading] = useState(false); const [err,setErr] = useState("");
  const [fType,setFType] = useState(""); const [fLife,setFLife] = useState(""); const [fPrio,setFPrio] = useState("");
  const [modal,setModal] = useState<"create"|"edit"|null>(null); const [form,setForm] = useState({...EMPTY});
  const [editing,setEditing] = useState<Req|null>(null); const [saving,setSaving] = useState(false);
  const listRef = useRef<HTMLDivElement|null>(null);
  const [sel,setSel] = useState<Req|null>(null); const [tab,setTab] = useState<"info"|"delivery"|"ver"|"raci"|"evidence"|"history"|"changes"|"domains">("info");
  const [vers,setVers] = useState<Ver[]>([]); const [vf,setVf] = useState({...EMPTY_V}); const [savingV,setSavingV] = useState(false);
  const [deliveryLinks,setDeliveryLinks] = useState<DeliveryBacklogLink[]>([]);
  const [deliveryForm,setDeliveryForm] = useState({ backlog_item_id:"", title:"", description:"", item_type_id:"", current_status:"open", priority:3, acceptance_criteria:"", definition_of_done:"" });
  const [savingDelivery,setSavingDelivery] = useState(false);
  const [sourceType,setSourceType] = useState("MANUAL");
  const [sourceRefId,setSourceRefId] = useState("");
  const [sourceRefLabel,setSourceRefLabel] = useState("");
  const [sourceRecords,setSourceRecords] = useState<{id:string,label:string}[]>([]);
  const [sourceLoading,setSourceLoading] = useState(false);
  const [domains,setDomains] = useState<DomainItem[]>([]);
  const [domainLoading,setDomainLoading] = useState(false);
  const [selDomainId,setSelDomainId] = useState("");
  const [selSubdomainId,setSelSubdomainId] = useState("");
  const [changeReasonModal,setChangeReasonModal] = useState<{pendingData:Record<string,unknown>,hint:string}|null>(null);
  const [changeReason,setChangeReason] = useState("");
  const highlightId = Number(new URLSearchParams(location.search).get("highlight") || "");
  const S=20;

  const load=async(p=page,id=pid)=>{
    setLoading(true);setErr("");
    try{
      let qs=`page=${p}&size=${S}`;if(id)qs+=`&product_id=${id}`;if(fType)qs+=`&requirement_type=${fType}`;if(fLife)qs+=`&lifecycle_status=${fLife}`;if(fPrio)qs+=`&priority=${fPrio}`;
      const r=await apiGet<Paginated<Req>>(`/requirements?${qs}`);setItems(r.items);setTotal(r.total);
    }catch(e:unknown){setErr(e instanceof Error?e.message:t("requirements.err_load"));}finally{setLoading(false);}
  };
  const loadV=async(id:number)=>{try{setVers(await apiGet<Ver[]>(`/requirements/${id}/verifications`));}catch{setVers([]);}};
  const loadDelivery=async(id:number)=>{try{setDeliveryLinks(await apiGet<DeliveryBacklogLink[]>(`/requirements/${id}/delivery-backlog`));}catch{setDeliveryLinks([]);}};

  useEffect(()=>{load(1,pid);setPage(1);},[pid,fType,fLife,fPrio]);
  useEffect(()=>{load();},[page]);
  useEffect(()=>{
    setDomainLoading(true);
    apiGet<DomainItem[]>("/business-domains").then(setDomains).catch(()=>setDomains([])).finally(()=>setDomainLoading(false));
  },[]);

  useEffect(()=>{
    if(!SOURCE_WITH_RECORDS.includes(sourceType)){setSourceRecords([]);return;}
    setSourceLoading(true);
    const fetchRecords=async()=>{
      try{
        if(sourceType==="DISCOVERY"){
          const r=await apiGet<Paginated<{id:number,title:string}>>(`/discovery?page=1&size=100${pid?`&product_id=${pid}`:""}`);
          setSourceRecords(r.items.map(i=>({id:String(i.id),label:i.title})));
        }else if(sourceType==="MEETING"){
          const r=await apiGet<Paginated<{id:number,title:string}>>(`/meetings?page=1&size=100${pid?`&product_id=${pid}`:""}`);
          setSourceRecords(r.items.map(i=>({id:String(i.id),label:i.title})));
        }else if(sourceType==="STAKEHOLDER"){
          const r=await apiGet<Paginated<{id:number,full_name:string}>>(`/stakeholders?page=1&size=100`);
          setSourceRecords(r.items.map(i=>({id:String(i.id),label:i.full_name})));
        }
      }catch{setSourceRecords([]);}finally{setSourceLoading(false);}
    };
    fetchRecords();
  },[sourceType,pid]);

  const changePid=(id:string)=>{localStorage.setItem("pl_product",id);setPid(id);setSel(null);};
  const genCode=async(reqType:string)=>{
    const prefix=TYPE_PREFIX[reqType]??"REQ";
    try{
      // Count existing requirements of this type for this product (or globally) to get next number
      let qs=`page=1&size=1&requirement_type=${reqType}`;if(pid)qs+=`&product_id=${pid}`;
      const r=await apiGet<Paginated<Req>>(`/requirements?${qs}`);
      return `${prefix}-${String(r.total+1).padStart(3,"0")}`;
    }catch{
      return `${prefix}-001`;
    }
  };

  const openCreate=async()=>{
    const nextCode=await genCode(EMPTY.requirement_type);
    setForm({...EMPTY,requirement_code:nextCode});
    setEditing(null);setModal("create");setSourceType("MANUAL");setSourceRefId("");setSourceRefLabel("");setSelDomainId("");setSelSubdomainId("");
  };
  const openEdit=(item:Req)=>{
    setForm({requirement_code:item.requirement_code,requirement_title:item.requirement_title,requirement_description:item.requirement_description,requirement_type:item.requirement_type,requirement_source:item.requirement_source??"",priority:item.priority,lifecycle_status:item.lifecycle_status,fulfillment_status:item.fulfillment_status,acceptance_definition:item.acceptance_definition??"",requirement_owner:item.requirement_owner??""});
    setEditing(item);setModal("edit");
    const parsed=parseSource(item.requirement_source);setSourceType(parsed.type);setSourceRefId(parsed.refId);setSourceRefLabel(parsed.refLabel);
    setSelDomainId("");setSelSubdomainId("");
    apiGet<DomainLink[]>(`/business-domains/requirements/${item.id}/domains`).then(links=>{
      const first=links[0];
      setSelDomainId(first?.domain_id?String(first.domain_id):"");
      setSelSubdomainId(first?.subdomain_id?String(first.subdomain_id):"");
    }).catch(()=>{setSelDomainId("");setSelSubdomainId("");});
  };
  const closeModal=()=>{setModal(null);setEditing(null);};

  const trySave=async()=>{
    if(!form.requirement_code.trim()||!form.requirement_title.trim()||!form.requirement_description.trim())return;
    const combined=buildSource(sourceType,sourceRefId,sourceRefLabel);
    const pendingData:Record<string,unknown>={...form,requirement_source:combined||null,product_id:pid?Number(pid):null};
    if(editing){
      const oldStatus=editing.lifecycle_status;
      const newStatus=String(pendingData.lifecycle_status||"");
      const lockedChanged=LOCKED_FIELDS.some(f=>String(pendingData[f]??""!==String((editing as unknown as Record<string,unknown>)[f]??"")));
      const statusChanging=newStatus&&newStatus!==oldStatus;
      if(STATUS_LOCKED_FROM.includes(oldStatus)&&(lockedChanged||(statusChanging))){
        const hint=statusChanging?t("requirements.change_reason_modal_hint_status",{status:oldStatus}):t("requirements.change_reason_modal_hint_fields");
        setChangeReasonModal({pendingData,hint});return;
      }
    }
    await doSave(pendingData,undefined);
  };

  const doSave=async(pendingData:Record<string,unknown>,reason:string|undefined)=>{
    if(reason!==undefined)(pendingData as Record<string,unknown>).change_reason=reason;
    setSaving(true);
    try{
      let requirementId = editing?.id ?? null;
      if(modal==="create"){
        const created = await apiPost<Req>("/requirements",pendingData);
        requirementId = created.id;
      } else if(editing){
        await apiPatch(`/requirements/${editing.id}`,pendingData);
      }

      if(requirementId){
        const existingLinks = await apiGet<DomainLink[]>(`/business-domains/requirements/${requirementId}/domains`).catch(()=>[]);
        for(const link of existingLinks){
          await apiDelete(`/business-domains/requirements/${requirementId}/domains/${link.id}`).catch(()=>{/**/});
        }
        if(selDomainId){
          await apiPost(`/business-domains/requirements/${requirementId}/domains`,{
            domain_id:Number(selDomainId),
            subdomain_id:selSubdomainId?Number(selSubdomainId):null,
          });
        }
      }

      closeModal();load(page);
    }catch(e:unknown){setErr(e instanceof Error?e.message:t("requirements.err_save"));}finally{setSaving(false);}
  };

  const del=async(id:number)=>{
    if(!confirm(t("requirements.confirm_delete")))return;
    try{await apiDelete(`/requirements/${id}`);load(page);if(sel?.id===id)setSel(null);}
    catch(e:unknown){setErr(e instanceof Error?e.message:t("requirements.err_load"));}
  };
  const select=(item:Req)=>{
    setSel(item);setTab("info");loadV(item.id);loadDelivery(item.id);
    // auto-scroll selected row into view inside the list container
    setTimeout(()=>{
      if(listRef.current){
        const row=listRef.current.querySelector(`[data-req-id="${item.id}"]`) as HTMLElement|null;
        if(row) row.scrollIntoView({block:"start",behavior:"smooth"});
      }
    },50);
  };
  const addV=async()=>{if(!sel)return;setSavingV(true);try{await apiPost(`/requirements/${sel.id}/verifications`,vf);setVf({...EMPTY_V});loadV(sel.id);}catch(e:unknown){setErr(e instanceof Error?e.message:t("requirements.err_save"));}finally{setSavingV(false);}};
  const delV=async(vid:number)=>{if(!sel||!confirm(t("requirements.confirm_del_ver")))return;try{await apiDelete(`/requirements/${sel.id}/verifications/${vid}`);loadV(sel.id);}catch{/**/}};
  const createDeliveryBacklog=async()=>{
    if(!sel) return;
    setSavingDelivery(true);
    setErr("");
    try{
      await apiPost(`/requirements/${sel.id}/delivery-backlog`,{
        backlog_item_id: deliveryForm.backlog_item_id ? Number(deliveryForm.backlog_item_id) : null,
        title: deliveryForm.backlog_item_id ? null : deliveryForm.title,
        description: deliveryForm.backlog_item_id ? null : deliveryForm.description,
        item_type_id: deliveryForm.item_type_id ? Number(deliveryForm.item_type_id) : null,
        current_status: deliveryForm.current_status,
        priority: deliveryForm.priority,
        acceptance_criteria: deliveryForm.acceptance_criteria || null,
        definition_of_done: deliveryForm.definition_of_done || null,
      });
      await loadDelivery(sel.id);
      setDeliveryForm({ backlog_item_id:"", title:"", description:"", item_type_id:"", current_status:"open", priority:3, acceptance_criteria:"", definition_of_done:"" });
    }catch(e:unknown){
      setErr(e instanceof Error?e.message:t("requirements.err_save"));
    }finally{
      setSavingDelivery(false);
    }
  };
  const chosenDomain = domains.find(d=>String(d.id)===selDomainId);
  const F=(lbl:string,ch:React.ReactNode)=><div className="mod-field"><label className="mod-field__label">{lbl}</label>{ch}</div>;

  useEffect(()=>{
    if(!highlightId || items.length===0) return;
    const found = items.find(item=>item.id===highlightId);
    if(found){
      setSel(found);
      setTab("info");
      loadV(found.id);
      setTimeout(()=>{
        if(listRef.current){
          const row=listRef.current.querySelector(`[data-req-id="${found.id}"]`) as HTMLElement|null;
          if(row) row.scrollIntoView({block:"center",behavior:"smooth"});
        }
      },50);
    }
  },[highlightId, items]);

  return (
    <ModuleLayout moduleIcon="◫" moduleName="REQUIREMENTS" moduleAccent="MANAGEMENT" selectedProductId={pid} onProductChange={changePid}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("requirements.eyebrow")}</span>
          <h1 className="mod-header__title">{t("requirements.title")} <span>{t("requirements.title_accent")}</span></h1>
          <p className="mod-header__meta">{t("requirements.meta",{count:String(total)})}</p>
        </div>
        <button className="btn-add" onClick={openCreate}>{t("requirements.btn_new")}</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"nowrap"}}>
        <select className="mod-select" style={{flex:1,minWidth:0}} value={fType} onChange={e=>{setFType(e.target.value);setPage(1);}}>
          <option value="">{t("requirements.filter_all_types")}</option>
          {REQ_TYPES.map(tp=><option key={tp} value={tp}>{tp}</option>)}
        </select>
        <select className="mod-select" style={{flex:1,minWidth:0}} value={fLife} onChange={e=>{setFLife(e.target.value);setPage(1);}}>
          <option value="">{t("requirements.filter_all_status")}</option>
          {LIFECYCLE.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="mod-select" style={{flex:1,minWidth:0}} value={fPrio} onChange={e=>{setFPrio(e.target.value);setPage(1);}}>
          <option value="">{t("requirements.filter_all_priorities")}</option>
          {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {err&&<div className="mod-error">⚠ {err}</div>}

      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div className="mod-table-wrap" style={{flex:sel?"0 0 56%":"1 1 100%",minWidth:0,height:sel?700:"calc(100vh - 290px)",display:"flex",flexDirection:"column"}}>
          <div ref={listRef} style={{flex:1,overflowY:"auto",minHeight:0,scrollbarWidth:"thin",scrollbarColor:"rgba(0,212,255,0.3) transparent"}}>
          {loading?<div className="mod-loading">{t("requirements.loading")}</div>:items.length===0?(
            <div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">{t("requirements.empty_title")}</div><div className="mod-empty__sub">{t("requirements.empty_sub")}</div></div>
          ):(
            <table className="mod-table">
              <thead><tr><th>{t("requirements.col_code")}</th><th>{t("requirements.col_title")}</th><th>{t("requirements.col_type")}</th><th>{t("requirements.col_priority")}</th><th>{t("requirements.col_lifecycle")}</th><th>{t("requirements.col_fulfillment")}</th><th></th></tr></thead>
              <tbody>
                {items.map(item=>(
                  <tr key={item.id} data-req-id={item.id} style={{cursor:"pointer",background:sel?.id===item.id?"rgba(0,212,255,0.06)":undefined}} onClick={()=>select(item)}>
                    <td><span style={{fontFamily:"monospace",color:"#00d4ff",fontSize:11}}>{item.requirement_code}</span></td>
                    <td><strong style={{fontSize:12}}>{item.requirement_title}</strong>{item.requirement_owner&&<div style={{fontSize:9,color:"#7899b0",marginTop:2}}>{item.requirement_owner}</div>}</td>
                    <td><span className="badge" style={{background:"rgba(0,229,204,0.12)",color:"#00e5cc",fontSize:9}}>{item.requirement_type}</span></td>
                    <td><span className="badge" style={{background:`${prioC(item.priority)}22`,color:prioC(item.priority),fontSize:9}}>{item.priority}</span></td>
                    <td><span className="badge" style={{background:`${lifeC(item.lifecycle_status)}22`,color:lifeC(item.lifecycle_status),fontSize:9}}>{item.lifecycle_status}</span></td>
                    <td><span className="badge" style={{background:`${fulC(item.fulfillment_status)}22`,color:fulC(item.fulfillment_status),fontSize:9}}>{item.fulfillment_status.replace(/_/g," ")}</span></td>
                    <td onClick={e=>e.stopPropagation()}><div className="row-actions"><button className="btn-icon" onClick={()=>openEdit(item)}>{t("requirements.btn_edit")}</button><button className="btn-icon btn-icon--danger" onClick={()=>del(item.id)}>{t("requirements.btn_del")}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
          {total>S&&(
            <div className="mod-pagination" style={{flexShrink:0}}>
              <span>{(page-1)*S+1}–{Math.min(page*S,total)} {t("requirements.pagination_of")} {total}</span>
              <div className="mod-pagination__btns">
                <button className="btn-page" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t("requirements.btn_prev")}</button>
                <button className="btn-page" disabled={page*S>=total} onClick={()=>setPage(p=>p+1)}>{t("requirements.btn_next")}</button>
              </div>
            </div>
          )}
        </div>

        {sel&&(
          <div style={{flex:"0 0 42%",minWidth:0,background:"rgba(6,10,20,0.95)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:4,padding:16,fontSize:11,overflowY:"auto",height:700}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>{t("requirements.detail_eyebrow")}</div>
                <div style={{fontWeight:700,fontSize:13,color:"#00d4ff"}}>{sel.requirement_code}</div>
                <div style={{fontSize:12,color:"#e0eaff",marginTop:2}}>{sel.requirement_title}</div>
              </div>
              <button className="mod-modal__close" onClick={()=>setSel(null)}>✕</button>
            </div>
            <div style={{display:"flex",gap:4,marginBottom:10,borderBottom:"1px solid rgba(0,212,255,0.1)",paddingBottom:8,flexWrap:"wrap"}}>
              {(["info","delivery","ver","raci","evidence","history","changes","domains"] as const).map(tabKey=>(
                <button key={tabKey} className={`btn-page${tab===tabKey?" btn-page--active":""}`} onClick={()=>setTab(tabKey)} style={{fontSize:8,padding:"2px 7px"}}>
                  {tabKey==="info"?t("requirements.tab_info"):tabKey==="delivery"?"DELIVERY":tabKey==="ver"?t("requirements.tab_ver"):tabKey==="raci"?"RACI":tabKey==="evidence"?t("requirements.tab_evidence"):tabKey==="history"?t("requirements.tab_history"):tabKey==="changes"?t("requirements.tab_changes"):"DOMAINS"}
                </button>
              ))}
            </div>

            {tab==="info"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("requirements.detail_type")}</div><div style={{color:"#00e5cc"}}>{sel.requirement_type}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("requirements.detail_priority")}</div><div style={{color:prioC(sel.priority)}}>{sel.priority}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("requirements.detail_lifecycle")}</div><div style={{color:lifeC(sel.lifecycle_status)}}>{sel.lifecycle_status}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("requirements.detail_fulfillment")}</div><div style={{color:fulC(sel.fulfillment_status)}}>{sel.fulfillment_status.replace(/_/g," ")}</div></div>
                </div>
                <div style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:4}}>{t("requirements.detail_description")}</div>
                <div style={{color:"#c0d4e8",lineHeight:1.5,marginTop:2}}>{sel.requirement_description}</div>
                {sel.acceptance_definition&&<><div style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:8}}>{t("requirements.detail_acceptance")}</div><div style={{color:"#c0d4e8",lineHeight:1.5,marginTop:2}}>{sel.acceptance_definition}</div></>}
                {sel.requirement_source&&(()=>{const ps=parseSource(sel.requirement_source);return(<><div style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:8}}>{t("requirements.detail_source")}</div><div style={{color:"#c0d4e8",marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span style={{color:"#00e5cc",fontSize:9,marginRight:6}}>{ps.type==="ROADMAP"?"ROADMAP":t(`requirements.source_type_${ps.type.toLowerCase()}`)}</span><span>{ps.refLabel}</span>{ps.type==="ROADMAP"&&ps.refId&&<button className="btn-icon" onClick={()=>navigate(`/modules/roadmap/${ps.refId}`)}>ABRIR INICIATIVA</button>}</div></>);})()}
                {isRoadmapSource(sel.requirement_source)&&<div style={{marginTop:8,fontSize:10,color:"#a78bfa",padding:"8px 10px",border:"1px solid rgba(167,139,250,0.2)",background:"rgba(167,139,250,0.05)"}}>Requirement originado da fase DEFINE a partir de uma initiative do Roadmap.</div>}
                <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn-icon" onClick={()=>openEdit(sel)}>{t("requirements.btn_edit_req")}</button>{isRoadmapSource(sel.requirement_source)&&(()=>{const ps=parseSource(sel.requirement_source);return ps.refId?<button className="btn-icon" onClick={()=>navigate(`/modules/roadmap/${ps.refId}`)}>IR PARA ROADMAP</button>:null;})()}</div>
              </div>
            )}

            {tab==="evidence"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:4}}>{t("requirements.evidence_eyebrow")}</div>
                <div style={{fontSize:10,color:sel.lifecycle_status==="APPROVED"?"#00ff88":"#7899b0",background:sel.lifecycle_status==="APPROVED"?"rgba(0,255,136,0.06)":"rgba(0,0,0,0.1)",border:`1px solid ${sel.lifecycle_status==="APPROVED"?"rgba(0,255,136,0.2)":"rgba(120,153,176,0.2)"}`,borderRadius:3,padding:"8px 10px",lineHeight:1.5}}>
                  {sel.lifecycle_status==="APPROVED"?t("requirements.evidence_hint_approved"):t("requirements.evidence_hint")}
                </div>
                <AttachmentsPanel entityType="requirement_approval" entityId={String(sel.id)} />
              </div>
            )}

            {tab==="domains"&&<DomainLinksTab requirementId={sel.id} t={t} />}
            {tab==="history"&&<HistoryTab requirementId={sel.id} t={t} />}
            {tab==="changes"&&<ChangeRequestsTab requirementId={sel.id} t={t} />}
            {tab==="raci"&&<RaciPanel objectType="REQUIREMENT" objectId={sel.id} productId={pid} />}

            {tab==="delivery"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>DEFINE → DELIVER</div>
                <div style={{fontSize:10,color:"#7899b0",lineHeight:1.6,padding:"8px 10px",border:"1px solid rgba(0,212,255,0.15)",background:"rgba(0,212,255,0.03)"}}>
                  Gate atual: apenas requirements com status <strong>VALIDATED</strong> ou <strong>APPROVED</strong>, com <strong>acceptance definition</strong> e <strong>owner</strong>, podem gerar vínculo de delivery.
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>BACKLOG VINCULADO</div>
                  {deliveryLinks.length===0 ? <div style={{color:"#7899b0",fontSize:11}}>Nenhum item de backlog vinculado a este requirement.</div> : deliveryLinks.map(link=>(
                    <div key={link.backlog_item_id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:4,padding:"8px 10px",display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:11,color:"#c0d4e8"}}>#{link.backlog_item_id} — {link.title}</div>
                        <div style={{fontSize:9,color:"#7899b0",marginTop:2}}>{link.item_type_name ?? "ITEM"} • {link.current_status} • {link.coverage_type}</div>
                      </div>
                      <button className="btn-icon" onClick={()=>navigate(`/modules/backlog?highlight=${link.backlog_item_id}`)}>ABRIR BACKLOG</button>
                    </div>
                  ))}
                </div>

                <div style={{borderTop:"1px solid rgba(0,212,255,0.1)",paddingTop:10,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>CRIAR ITEM DE DELIVERY</div>
                  <input className="mod-input" placeholder="Título do backlog item" value={deliveryForm.title} onChange={e=>setDeliveryForm(f=>({...f,title:e.target.value}))} />
                  <textarea className="mod-textarea" rows={3} placeholder="Descrição" value={deliveryForm.description} onChange={e=>setDeliveryForm(f=>({...f,description:e.target.value}))} />
                  <div className="mod-field-row">
                    <div className="mod-field">
                      <label className="mod-field__label">ITEM TYPE ID</label>
                      <input className="mod-input" value={deliveryForm.item_type_id} onChange={e=>setDeliveryForm(f=>({...f,item_type_id:e.target.value}))} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">PRIORITY</label>
                      <input className="mod-input" type="number" value={deliveryForm.priority} onChange={e=>setDeliveryForm(f=>({...f,priority:Number(e.target.value)}))} />
                    </div>
                  </div>
                  <textarea className="mod-textarea" rows={2} placeholder="Acceptance criteria" value={deliveryForm.acceptance_criteria} onChange={e=>setDeliveryForm(f=>({...f,acceptance_criteria:e.target.value}))} />
                  <textarea className="mod-textarea" rows={2} placeholder="Definition of done" value={deliveryForm.definition_of_done} onChange={e=>setDeliveryForm(f=>({...f,definition_of_done:e.target.value}))} />
                  <button className="btn-save" onClick={createDeliveryBacklog} disabled={savingDelivery || !deliveryForm.title.trim()}>{savingDelivery?"SALVANDO...":"GERAR ITEM DE BACKLOG"}</button>
                </div>
              </div>
            )}

            {tab==="ver"&&(
              <div>
                {vers.length===0?<div style={{color:"#7899b0",fontSize:11,padding:"8px 0"}}>{t("requirements.ver_empty")}</div>:(
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {vers.map(v=>(
                      <div key={v.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:4,padding:"8px 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:10,color:"#00e5cc",letterSpacing:1}}>{v.verification_type}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span className="badge" style={{background:`${verC(v.verification_result)}22`,color:verC(v.verification_result),fontSize:9}}>{v.verification_result}</span>
                            <button className="btn-icon btn-icon--danger" style={{fontSize:9,padding:"2px 6px"}} onClick={()=>delV(v.id)}>{t("requirements.btn_del")}</button>
                          </div>
                        </div>
                        {v.evidence&&<div style={{fontSize:10,color:"#c0d4e8",marginTop:4}}>{v.evidence}</div>}
                        {v.notes&&<div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{v.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{borderTop:"1px solid rgba(0,212,255,0.1)",paddingTop:10,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>{t("requirements.ver_new_eyebrow")}</div>
                  <select className="mod-select" value={vf.verification_type} onChange={e=>setVf(v=>({...v,verification_type:e.target.value}))}>{VER_TYPES.map(tp=><option key={tp} value={tp}>{tp}</option>)}</select>
                  <select className="mod-select" value={vf.verification_result} onChange={e=>setVf(v=>({...v,verification_result:e.target.value}))}>{VER_RESULTS.map(r=><option key={r} value={r}>{r}</option>)}</select>
                  <input className="mod-input" placeholder={t("requirements.ver_evidence_placeholder")} value={vf.evidence} onChange={e=>setVf(v=>({...v,evidence:e.target.value}))} />
                  <textarea className="mod-textarea" placeholder={t("requirements.ver_notes_placeholder")} value={vf.notes} onChange={e=>setVf(v=>({...v,notes:e.target.value}))} rows={2} />
                  <button className="btn-save" onClick={addV} disabled={savingV}>{savingV?t("requirements.btn_saving"):t("requirements.btn_add_ver")}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Reason Modal */}
      {changeReasonModal&&(
        <div className="mod-overlay">
          <div className="mod-modal" style={{maxWidth:520,width:"95%"}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// CHANGE MANAGEMENT //</span><h3 className="mod-modal__title">{t("requirements.change_reason_modal_title")}</h3></div>
              <button className="mod-modal__close" onClick={()=>{setChangeReasonModal(null);setChangeReason("");}}>✕</button>
            </div>
            <div className="mod-modal__body" style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,color:"#ff9900",background:"rgba(255,153,0,0.06)",border:"1px solid rgba(255,153,0,0.2)",borderRadius:3,padding:"8px 12px"}}>⚠ {changeReasonModal.hint}</div>
              <div className="mod-field">
                <label className="mod-field__label">{t("requirements.change_reason_label")}</label>
                <textarea className="mod-textarea" rows={3} placeholder={t("requirements.change_reason_placeholder")} value={changeReason} onChange={e=>setChangeReason(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>{setChangeReasonModal(null);setChangeReason("");}}>{t("requirements.btn_cancel")}</button>
              <button className="btn-save" disabled={saving||!changeReason.trim()} onClick={async()=>{await doSave(changeReasonModal.pendingData,changeReason);setChangeReasonModal(null);setChangeReason("");}}>
                {saving?t("requirements.btn_saving"):t("requirements.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Edit/Create Modal */}
      {modal&&(
        <div className="mod-overlay">
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:680,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">{t("requirements.modal_eyebrow")}</span><h3 className="mod-modal__title">{modal==="create"?t("requirements.modal_new"):t("requirements.modal_edit")} <span>{t("requirements.modal_subtitle")}</span></h3></div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                {F(t("requirements.field_code"),<input className="mod-input" value={form.requirement_code} onChange={e=>setForm(f=>({...f,requirement_code:e.target.value}))} placeholder={t("requirements.placeholder_code")} />)}
                {F(t("requirements.field_owner"),<input className="mod-input" value={form.requirement_owner} onChange={e=>setForm(f=>({...f,requirement_owner:e.target.value}))} placeholder={t("requirements.placeholder_owner")} />)}
              </div>
              {F(t("requirements.field_title"),<input className="mod-input" value={form.requirement_title} onChange={e=>setForm(f=>({...f,requirement_title:e.target.value}))} placeholder={t("requirements.placeholder_title")} />)}
              {F(t("requirements.field_description"),<textarea className="mod-textarea" value={form.requirement_description} onChange={e=>setForm(f=>({...f,requirement_description:e.target.value}))} placeholder={t("requirements.placeholder_description")} rows={3} />)}
              {F(t("requirements.field_acceptance"),<textarea className="mod-textarea" value={form.acceptance_definition} onChange={e=>setForm(f=>({...f,acceptance_definition:e.target.value}))} placeholder={t("requirements.placeholder_acceptance")} rows={2} />)}
              <div className="mod-field-row">
              {F(t("requirements.field_type"),(
                <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                  <select className="mod-select" style={{flex:1}} value={form.requirement_type} onChange={async e=>{
                const newType=e.target.value;
                // Only auto-update code if it was auto-generated (matches current prefix pattern) and not editing
                if(modal==="create"){
                  const oldPrefix=TYPE_PREFIX[form.requirement_type]??"REQ";
                  const isAutoCode=form.requirement_code.startsWith(`${oldPrefix}-`)||form.requirement_code.startsWith("REQ-");
                  if(isAutoCode){const newCode=await genCode(newType);setForm(f=>({...f,requirement_type:newType,requirement_code:newCode}));return;}
                }
                    setForm(f=>({...f,requirement_type:newType}));
                  }}>
                    {REQ_TYPES.map(tp=><option key={tp} value={tp}>{tp}</option>)}
                  </select>
                  <div style={{position:"relative",flexShrink:0}} className="type-help-wrap">
                    <button
                      type="button"
                      style={{width:18,height:18,borderRadius:"50%",border:"1px solid rgba(0,212,255,0.4)",background:"rgba(0,212,255,0.08)",color:"#00d4ff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,marginTop:2}}
                      onClick={e=>{e.stopPropagation();const el=e.currentTarget.nextElementSibling as HTMLElement;if(el)el.style.display=el.style.display==="block"?"none":"block";}}
                    >?</button>
                    <div style={{display:"none",position:"absolute",right:0,top:22,zIndex:999,width:320,background:"#060a14",border:"1px solid rgba(0,212,255,0.2)",borderRadius:4,padding:"10px 12px",boxShadow:"0 4px 20px rgba(0,0,0,0.6)"}}>
                      <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:8}}>{t("requirements.type_help_title")}</div>
                      {REQ_TYPES.map(tp=>(
                        <div key={tp} style={{marginBottom:6,paddingBottom:6,borderBottom:"1px solid rgba(0,212,255,0.06)"}}>
                          <span style={{fontFamily:"monospace",color:form.requirement_type===tp?"#00ff88":"#00e5cc",fontSize:9,fontWeight:700}}>{TYPE_PREFIX[tp]??tp}</span>
                          <span style={{color:"#7899b0",fontSize:9,marginLeft:6}}>{t(`requirements.type_desc_${tp}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
                {F(t("requirements.field_priority"),<select className="mod-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}</select>)}
              </div>
              <div className="mod-field-row">
                {F(t("requirements.field_lifecycle"),<select className="mod-select" value={form.lifecycle_status} onChange={e=>setForm(f=>({...f,lifecycle_status:e.target.value}))}>{LIFECYCLE.map(s=><option key={s} value={s}>{s}</option>)}</select>)}
                {F(t("requirements.field_fulfillment"),<select className="mod-select" value={form.fulfillment_status} onChange={e=>setForm(f=>({...f,fulfillment_status:e.target.value}))}>{FULFILLMENT.map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select>)}
              </div>
              <div className="mod-field-row">
                {F(t("requirements.field_source_type"),<select className="mod-select" value={sourceType} onChange={e=>{setSourceType(e.target.value);setSourceRefId("");setSourceRefLabel("");}}>{SOURCE_TYPES.map(st=><option key={st} value={st}>{t(`requirements.source_type_${st.toLowerCase()}`)}</option>)}</select>)}
                {SOURCE_WITH_RECORDS.includes(sourceType)
                  ?F(t("requirements.field_source_ref"),sourceLoading?<input className="mod-input" disabled value={t("requirements.source_loading")} />:<select className="mod-select" value={sourceRefId} onChange={e=>{const rec=sourceRecords.find(r=>r.id===e.target.value);setSourceRefId(e.target.value);setSourceRefLabel(rec?.label??"");}}><option value="">{t("requirements.source_select_record")}</option>{sourceRecords.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select>)
                  :F(t("requirements.field_source_ref"),<input className="mod-input" value={sourceRefLabel} onChange={e=>setSourceRefLabel(e.target.value)} placeholder={t("requirements.source_ref_placeholder")} />)
                }
              </div>
              <div className="mod-field-row">
                {F("Business domain",domainLoading?<input className="mod-input" disabled value="Loading domains..." />:<select className="mod-select" value={selDomainId} onChange={e=>{setSelDomainId(e.target.value);setSelSubdomainId("");}}>
                  <option value="">— No domain —</option>
                  {domains.map(d=><option key={d.id} value={String(d.id)}>{d.domain_code} — {d.domain_name}</option>)}
                </select>)}
                {F("Business subdomain",chosenDomain&&chosenDomain.subdomains.length>0?<select className="mod-select" value={selSubdomainId} onChange={e=>setSelSubdomainId(e.target.value)}>
                  <option value="">— No subdomain —</option>
                  {chosenDomain.subdomains.map(s=><option key={s.id} value={String(s.id)}>{s.subdomain_code} — {s.subdomain_name}</option>)}
                </select>:<input className="mod-input" disabled value={selDomainId?"No subdomains available":"Select a domain first"} />)}
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("requirements.btn_cancel")}</button>
              <button className="btn-save" onClick={trySave} disabled={saving||!form.requirement_code.trim()||!form.requirement_title.trim()}>{saving?t("requirements.btn_saving"):t("requirements.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
