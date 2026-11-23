import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";

interface Subdomain { id:number; domain_id:number; subdomain_code:string; subdomain_name:string; description:string|null; display_order:number; is_active:boolean; }
interface Domain { id:number; domain_code:string; domain_name:string; description:string|null; owner:string|null; is_active:boolean; display_order:number; subdomains:Subdomain[]; requirement_count:number; }
interface DomainReq { link_id:number; requirement_id:number; requirement_code:string; requirement_title:string; requirement_type:string; lifecycle_status:string; priority:string; subdomain_code:string|null; subdomain_name:string|null; }
interface DomainDocPayload {
  domain: {
    domain_code: string;
    domain_name: string;
    description: string | null;
    owner: string | null;
    business_objective?: string | null;
    scope_in?: string | null;
    scope_out?: string | null;
    business_value?: string | null;
    document_status?: string | null;
    version?: string | null;
  };
  subdomains: Array<{
    id: number;
    subdomain_code: string;
    subdomain_name: string;
    description: string | null;
    subdomain_type?: string | null;
    owner?: string | null;
    business_rules_text?: string | null;
    requirements: DomainReq[];
    risks: Array<{ id:number; title:string; status?:string|null; mitigation_plan?:string|null }>;
    business_rules: DomainReq[];
  }>;
  requirements: DomainReq[];
  business_rules: DomainReq[];
  risks: Array<{ id:number; title:string; status?:string|null; mitigation_plan?:string|null; subdomain_name?:string|null }>;
  summary: {
    subdomain_count: number;
    requirement_count: number;
    business_rule_count: number;
    risk_count: number;
    generated_at: string;
  };
}

const EMPTY_D = { domain_code:"", domain_name:"", description:"", owner:"", display_order:0 };
const EMPTY_S = { subdomain_code:"", subdomain_name:"", description:"", display_order:0 };

const lcC=(s:string)=>s==="APPROVED"?"#00ff88":s==="VALIDATED"?"#00d4ff":s==="REJECTED"?"#ff4444":s==="OBSOLETE"?"#555":"#ff9900";

export default function BusinessDomainPage() {
  const { t } = useTranslation();
  const [pid, setPid] = useState(localStorage.getItem("pl_product") ?? "");
  const changePid = (id: string) => { localStorage.setItem("pl_product", id); setPid(id); };
  const [items, setItems] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Domain|null>(null);
  const [tab, setTab] = useState<"info"|"subdomains"|"requirements">("info");
  const [reqs, setReqs] = useState<DomainReq[]>([]);
  const [docOpen, setDocOpen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docData, setDocData] = useState<DomainDocPayload | null>(null);
  const [exportingDomain, setExportingDomain] = useState<Domain | null>(null);

  // Domain modal
  const [modalD, setModalD] = useState<"new"|"edit"|null>(null);
  const [formD, setFormD] = useState({...EMPTY_D});
  const [savingD, setSavingD] = useState(false);
  const [editingD, setEditingD] = useState<Domain|null>(null);

  // Subdomain modal
  const [modalS, setModalS] = useState<"new"|"edit"|null>(null);
  const [formS, setFormS] = useState({...EMPTY_S});
  const [savingS, setSavingS] = useState(false);
  const [editingS, setEditingS] = useState<Subdomain|null>(null);

  const load = async () => {
    setLoading(true); setErr("");
    try { setItems(await apiGet<Domain[]>("/business-domains?include_inactive=true")); }
    catch(e:unknown){ setErr(e instanceof Error?e.message:t("business_domain.err_load")); }
    finally { setLoading(false); }
  };

  const loadReqs = async (id:number) => {
    try { setReqs(await apiGet<DomainReq[]>(`/business-domains/${id}/requirements`)); }
    catch { setReqs([]); }
  };

  useEffect(() => { load(); }, []);

  const select = (d: Domain) => { setSel(d); setTab("info"); loadReqs(d.id); };

  // Domain CRUD
  const openNewD = () => { setFormD({...EMPTY_D}); setEditingD(null); setModalD("new"); };
  const openEditD = (d:Domain) => { setFormD({domain_code:d.domain_code,domain_name:d.domain_name,description:d.description??"",owner:d.owner??"",display_order:d.display_order}); setEditingD(d); setModalD("edit"); };
  const saveD = async () => {
    if(!formD.domain_code.trim()||!formD.domain_name.trim()) return;
    setSavingD(true);
    try {
      if(modalD==="new") await apiPost("/business-domains", formD);
      else if(editingD) await apiPatch(`/business-domains/${editingD.id}`, {domain_name:formD.domain_name,description:formD.description,owner:formD.owner,display_order:formD.display_order});
      setModalD(null); await load();
      if(editingD) { const updated=items.find(i=>i.id===editingD.id); if(updated)setSel({...updated,...formD}); }
    } catch(e:unknown){ setErr(e instanceof Error?e.message:t("business_domain.err_save")); }
    finally { setSavingD(false); }
  };
  const delD = async (d:Domain) => {
    if(!confirm(t("business_domain.confirm_delete_domain"))) return;
    try { await apiDelete(`/business-domains/${d.id}`); if(sel?.id===d.id)setSel(null); await load(); }
    catch(e:unknown){ setErr(e instanceof Error?e.message:t("business_domain.err_save")); }
  };

  // Subdomain CRUD
  const openNewS = () => { setFormS({...EMPTY_S}); setEditingS(null); setModalS("new"); };
  const openEditS = (s:Subdomain) => { setFormS({subdomain_code:s.subdomain_code,subdomain_name:s.subdomain_name,description:s.description??"",display_order:s.display_order}); setEditingS(s); setModalS("edit"); };
  const saveS = async () => {
    if(!sel) return;
    if(!formS.subdomain_code.trim()||!formS.subdomain_name.trim()) return;
    setSavingS(true);
    try {
      if(modalS==="new") await apiPost(`/business-domains/${sel.id}/subdomains`, formS);
      else if(editingS) await apiPatch(`/business-domains/${sel.id}/subdomains/${editingS.id}`, {subdomain_name:formS.subdomain_name,description:formS.description,display_order:formS.display_order});
      setModalS(null); await load();
    } catch(e:unknown){ setErr(e instanceof Error?e.message:t("business_domain.err_save")); }
    finally { setSavingS(false); }
  };
  const delS = async (s:Subdomain) => {
    if(!sel||!confirm(t("business_domain.confirm_delete_sub"))) return;
    try { await apiDelete(`/business-domains/${sel.id}/subdomains/${s.id}`); await load(); }
    catch(e:unknown){ setErr(e instanceof Error?e.message:t("business_domain.err_save")); }
  };

  const openExport = (format: "md" | "html" | "data" | "docx" | "pdf" | "xlsx", domainId?: number) => {
    const targetId = domainId ?? sel?.id;
    if (!targetId) return;
    const base = `/api/v1/business-domains/${targetId}`;
    const url =
      format === "md"
        ? `${base}/export.md`
        : format === "html"
          ? `${base}/export.html`
          : format === "docx"
            ? `${base}/export.docx`
            : format === "pdf"
              ? `${base}/export.pdf`
              : format === "xlsx"
                ? `${base}/export.xlsx`
                : `${base}/export-data`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openDocumentation = async () => {
    if (!sel) return;
    setDocOpen(true);
    setDocLoading(true);
    try {
      const data = await apiGet<DomainDocPayload>(`/business-domains/${sel.id}/export-data`);
      setDocData(data);
    } catch {
      setDocData(null);
    } finally {
      setDocLoading(false);
    }
  };

  const pendingItems = (data: DomainDocPayload | null) => {
    if (!data) return [] as string[];
    const pending: string[] = [];
    if (!data.domain.description?.trim()) pending.push("Domain description");
    if (!data.domain.owner?.trim()) pending.push("Domain owner");
    if (!data.domain.business_objective?.trim()) pending.push("Business objective");
    if (!data.domain.scope_in?.trim()) pending.push("Scope in");
    if (!data.domain.scope_out?.trim()) pending.push("Scope out");
    if (!data.domain.business_value?.trim()) pending.push("Business value");
    if (data.subdomains.length === 0) pending.push("Subdomains");
    if (data.requirements.length === 0) pending.push("Linked requirements");
    const subdomainsWithoutDescription = data.subdomains.filter(s => !s.description?.trim()).length;
    if (subdomainsWithoutDescription > 0) pending.push(`Subdomain descriptions (${subdomainsWithoutDescription})`);
    const subdomainsWithoutOwner = data.subdomains.filter(s => !s.owner?.trim()).length;
    if (subdomainsWithoutOwner > 0) pending.push(`Subdomain owners (${subdomainsWithoutOwner})`);
    return pending;
  };

  const exportFormats: { key: "html" | "md" | "docx" | "pdf" | "xlsx" | "data"; label: string; hint: string; action: "open" | "download" }[] = [
    { key: "html", label: "HTML", hint: "Abrir em nova aba", action: "open" },
    { key: "md", label: "Markdown", hint: "Baixar arquivo .md", action: "download" },
    { key: "docx", label: "DOCX", hint: "Baixar documento Word", action: "download" },
    { key: "pdf", label: "PDF", hint: "Baixar PDF", action: "download" },
    { key: "xlsx", label: "XLSX", hint: "Baixar planilha Excel", action: "download" },
    { key: "data", label: "JSON", hint: "Baixar estrutura bruta", action: "download" },
  ];

  const handleChooseExportFormat = (format: "html" | "md" | "docx" | "pdf" | "xlsx" | "data") => {
    if (!exportingDomain) return;
    openExport(format, exportingDomain.id);
    setExportingDomain(null);
  };

  const F=(lbl:string,ch:React.ReactNode)=><div className="mod-field"><label className="mod-field__label">{lbl}</label>{ch}</div>;

  return (
    <ModuleLayout moduleIcon="◈" moduleName="BUSINESS" moduleAccent="DOMAINS" selectedProductId={pid} onProductChange={changePid}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("business_domain.eyebrow")}</span>
          <h1 className="mod-header__title">{t("business_domain.title")} <span>{t("business_domain.title_accent")}</span></h1>
          <p className="mod-header__meta">{t("business_domain.meta",{count:String(items.length)})}</p>
        </div>
        <button className="btn-add" onClick={openNewD}>{t("business_domain.btn_new")}</button>
      </div>

      {/* Hint banner */}
      <div style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:10,color:"#7899b0",background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:3,padding:"8px 12px",marginBottom:12,lineHeight:1.5}}>
        <AccountTreeOutlinedIcon sx={{fontSize:14,color:"#a78bfa",flexShrink:0,marginTop:"1px"}} />
        <span>{t("business_domain.hint")}</span>
      </div>

      {err&&<div className="mod-error">⚠ {err}</div>}

      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        {/* Domain list */}
        <div className="mod-table-wrap" style={{flex:sel?"0 0 52%":"1 1 100%",minWidth:0}}>
          {loading ? <div className="mod-loading">{t("business_domain.loading")}</div> : items.length===0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">◈</div>
              <div className="mod-empty__title">{t("business_domain.empty_title")}</div>
              <div className="mod-empty__sub">{t("business_domain.empty_sub")}</div>
            </div>
          ) : (
            <table className="mod-table">
              <thead>
                <tr>
                  <th>{t("business_domain.col_code")}</th>
                  <th>{t("business_domain.col_name")}</th>
                  <th>{t("business_domain.col_owner")}</th>
                  <th>{t("business_domain.col_subdomains")}</th>
                  <th>{t("business_domain.col_reqs")}</th>
                  <th>{t("business_domain.col_status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(d=>(
                  <tr key={d.id} style={{cursor:"pointer",background:sel?.id===d.id?"rgba(0,212,255,0.06)":undefined}} onClick={()=>select(d)}>
                    <td><span style={{fontFamily:"monospace",color:"#00d4ff",fontSize:11,fontWeight:700}}>{d.domain_code}</span></td>
                    <td><strong style={{fontSize:12}}>{d.domain_name}</strong>{d.owner&&<div style={{fontSize:9,color:"#7899b0",marginTop:1}}>{d.owner}</div>}</td>
                    <td style={{fontSize:10,color:"#7899b0"}}>{d.owner||"—"}</td>
                    <td><span className="badge" style={{background:"rgba(0,229,204,0.1)",color:"#00e5cc",fontSize:9}}>{d.subdomains.length}</span></td>
                    <td><span className="badge" style={{background:"rgba(0,212,255,0.1)",color:"#00d4ff",fontSize:9}}>{d.requirement_count}</span></td>
                    <td><span className="badge" style={{background:d.is_active?"rgba(0,255,136,0.1)":"rgba(85,85,85,0.2)",color:d.is_active?"#00ff88":"#666",fontSize:9}}>{d.is_active?t("business_domain.status_active"):t("business_domain.status_inactive")}</span></td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="btn-icon" onClick={()=>openEditD(d)}>{t("business_domain.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={()=>delD(d)}>{t("business_domain.btn_del")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {sel&&(
          <div style={{flex:"0 0 46%",minWidth:0,background:"rgba(6,10,20,0.95)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:4,padding:16,fontSize:11,overflowY:"auto",maxHeight:700}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontFamily:"monospace",fontSize:14,color:"#00d4ff",fontWeight:700}}>{sel.domain_code}</div>
                <div style={{fontSize:12,color:"#e0eaff",marginTop:2}}>{sel.domain_name}</div>
              </div>
              <button className="mod-modal__close" onClick={()=>setSel(null)}>✕</button>
            </div>

            <div style={{display:"flex",gap:4,marginBottom:10,borderBottom:"1px solid rgba(0,212,255,0.1)",paddingBottom:8}}>
              {(["info","subdomains","requirements"] as const).map(tk=>(
                <button key={tk} className={`btn-page${tab===tk?" btn-page--active":""}`} onClick={()=>{setTab(tk);if(tk==="requirements")loadReqs(sel.id);}} style={{fontSize:8,padding:"2px 7px"}}>
                  {tk==="info"?t("business_domain.tab_info"):tk==="subdomains"?t("business_domain.tab_subdomains"):t("business_domain.tab_requirements")}
                </button>
              ))}
            </div>

            {tab==="info"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sel.description&&<><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("business_domain.field_description")}</div><div style={{color:"#c0d4e8",lineHeight:1.5}}>{sel.description}</div></>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("business_domain.col_owner")}</div><div style={{color:"#e0eaff"}}>{sel.owner||"—"}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("business_domain.col_status")}</div><div style={{color:sel.is_active?"#00ff88":"#666"}}>{sel.is_active?t("business_domain.status_active"):t("business_domain.status_inactive")}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("business_domain.col_subdomains")}</div><div style={{color:"#00e5cc"}}>{sel.subdomains.length}</div></div>
                  <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>{t("business_domain.col_reqs")}</div><div style={{color:"#00d4ff"}}>{sel.requirement_count}</div></div>
                </div>
                <div style={{marginTop:12,display:"grid",gridTemplateColumns:"auto auto 1fr auto",gap:8,alignItems:"center"}}>
                  <button
                    className="btn-icon"
                    onClick={()=>openEditD(sel)}
                    title="Edit"
                    aria-label="Edit"
                    style={{minWidth:92,height:36,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"0 12px"}}
                  >
                    <EditOutlinedIcon sx={{fontSize:18}} />
                    <span>EDIT</span>
                  </button>
                  <button
                    className="btn-icon"
                    onClick={openDocumentation}
                    title="View"
                    aria-label="View"
                    style={{minWidth:92,height:36,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"0 12px"}}
                  >
                    <VisibilityOutlinedIcon sx={{fontSize:18}} />
                    <span>VIEW</span>
                  </button>
                  <div />
                  <button
                    className="btn-icon"
                    onClick={()=>setExportingDomain(sel)}
                    title="Export"
                    aria-label="Export"
                    style={{minWidth:110,height:36,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}
                  >
                    <FileDownloadOutlinedIcon sx={{fontSize:18}} />
                    <span>EXPORT</span>
                  </button>
                </div>
              </div>
            )}

            {tab==="subdomains"&&(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2}}>{t("business_domain.subdomains_section")}</div>
                  <button className="btn-icon" style={{fontSize:9}} onClick={openNewS}>{t("business_domain.btn_new_sub")}</button>
                </div>
                {sel.subdomains.length===0 ? <div style={{color:"#7899b0",fontSize:11}}>{t("business_domain.subdomains_empty")}</div> : sel.subdomains.map(s=>(
                  <div key={s.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:3,padding:"8px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <span style={{fontFamily:"monospace",color:"#00e5cc",fontSize:10,fontWeight:700}}>{s.subdomain_code}</span>
                        <span style={{color:"#c0d4e8",fontSize:11,marginLeft:8}}>{s.subdomain_name}</span>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn-icon" style={{fontSize:9}} onClick={()=>openEditS(s)}>{t("business_domain.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" style={{fontSize:9}} onClick={()=>delS(s)}>{t("business_domain.btn_del")}</button>
                      </div>
                    </div>
                    {s.description&&<div style={{fontSize:10,color:"#7899b0",marginTop:3}}>{s.description}</div>}
                  </div>
                ))}
              </div>
            )}

            {tab==="requirements"&&(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:4}}>{t("business_domain.requirements_section")}</div>
                {reqs.length===0 ? <div style={{color:"#7899b0",fontSize:11}}>{t("business_domain.requirements_empty")}</div> : (
                  <table className="mod-table" style={{fontSize:10}}>
                    <thead><tr><th>{t("business_domain.req_col_code")}</th><th>{t("business_domain.req_col_title")}</th><th>{t("business_domain.req_col_type")}</th><th>{t("business_domain.req_col_status")}</th><th>{t("business_domain.req_col_subdomain")}</th></tr></thead>
                    <tbody>
                      {reqs.map(r=>(
                        <tr key={r.link_id}>
                          <td><span style={{fontFamily:"monospace",color:"#00d4ff",fontSize:10}}>{r.requirement_code}</span></td>
                          <td style={{maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.requirement_title}</td>
                          <td><span className="badge" style={{background:"rgba(0,229,204,0.1)",color:"#00e5cc",fontSize:8}}>{r.requirement_type}</span></td>
                          <td><span className="badge" style={{background:`${lcC(r.lifecycle_status)}22`,color:lcC(r.lifecycle_status),fontSize:8}}>{r.lifecycle_status}</span></td>
                          <td style={{color:"#7899b0",fontSize:9}}>{r.subdomain_code||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Domain Modal */}
      {modalD&&(
        <div className="mod-overlay">
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// BUSINESS DOMAIN //</span><h3 className="mod-modal__title">{modalD==="new"?t("business_domain.modal_new_domain"):t("business_domain.modal_edit_domain")}</h3></div>
              <button className="mod-modal__close" onClick={()=>setModalD(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              {F(t("business_domain.field_code"),
                <input className="mod-input" value={formD.domain_code} onChange={e=>setFormD(f=>({...f,domain_code:e.target.value.toUpperCase()}))} placeholder={t("business_domain.placeholder_code")} disabled={modalD==="edit"} />
              )}
              {F(t("business_domain.field_name"),<input className="mod-input" value={formD.domain_name} onChange={e=>setFormD(f=>({...f,domain_name:e.target.value}))} placeholder={t("business_domain.placeholder_name")} />)}
              {F(t("business_domain.field_description"),<textarea className="mod-textarea" rows={2} value={formD.description} onChange={e=>setFormD(f=>({...f,description:e.target.value}))} placeholder={t("business_domain.placeholder_description")} />)}
              {F(t("business_domain.field_owner"),<input className="mod-input" value={formD.owner} onChange={e=>setFormD(f=>({...f,owner:e.target.value}))} placeholder={t("business_domain.placeholder_owner")} />)}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setModalD(null)}>{t("business_domain.btn_cancel")}</button>
              <button className="btn-save" onClick={saveD} disabled={savingD||!formD.domain_code.trim()||!formD.domain_name.trim()}>{savingD?t("business_domain.btn_saving"):t("business_domain.btn_save")}</button>
            </div>
          </div>
        </div>
      )}

      {docOpen&&(
        <div className="mod-overlay" onClick={()=>setDocOpen(false)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:980,width:"96%",maxHeight:"88vh",overflow:"auto"}}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// DOMAIN DOCUMENTATION //</span>
                <h3 className="mod-modal__title">{sel?.domain_code} — {sel?.domain_name}</h3>
              </div>
              <button className="mod-modal__close" onClick={()=>setDocOpen(false)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:16,alignItems:"flex-start"}}>
              <div style={{border:"1px solid rgba(0,212,255,0.15)",borderRadius:4,padding:12,background:"rgba(0,212,255,0.03)"}}>
                <div style={{fontSize:10,color:"#00d4ff",letterSpacing:2,marginBottom:8}}>DOCUMENT STATUS</div>
                {docLoading ? (
                  <div style={{color:"#7899b0"}}>Loading documentation...</div>
                ) : !docData ? (
                  <div style={{color:"#ff9900"}}>Documentation could not be loaded.</div>
                ) : (
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:10,marginBottom:12}}>
                      <div><div style={{color:"#7899b0"}}>Subdomains</div><div style={{color:"#00e5cc"}}>{docData.summary.subdomain_count}</div></div>
                      <div><div style={{color:"#7899b0"}}>Requirements</div><div style={{color:"#00d4ff"}}>{docData.summary.requirement_count}</div></div>
                      <div><div style={{color:"#7899b0"}}>Business Rules</div><div style={{color:"#a78bfa"}}>{docData.summary.business_rule_count}</div></div>
                      <div><div style={{color:"#7899b0"}}>Risks</div><div style={{color:"#ff9900"}}>{docData.summary.risk_count}</div></div>
                    </div>
                    <div style={{fontSize:10,color:"#ffcc66",letterSpacing:2,marginBottom:6}}>PENDING INFORMATION</div>
                    {pendingItems(docData).length === 0 ? (
                      <div style={{color:"#00ff88",fontSize:11}}>No pending information detected in the current document structure.</div>
                    ) : (
                      <ul style={{margin:0,paddingLeft:18,color:"#ffd580",fontSize:11,lineHeight:1.6}}>
                        {pendingItems(docData).map(item => <li key={item}>{item}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </div>

              <div style={{border:"1px solid rgba(0,212,255,0.12)",borderRadius:4,padding:12}}>
                {docLoading ? (
                  <div style={{color:"#7899b0"}}>Loading preview...</div>
                ) : !docData ? (
                  <div style={{color:"#ff9900"}}>No preview available.</div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div>
                      <div style={{fontSize:18,color:"#00d4ff",fontWeight:700}}>{docData.domain.domain_name}</div>
                      <div style={{fontFamily:"monospace",fontSize:11,color:"#7899b0",marginTop:2}}>{docData.domain.domain_code}</div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>OWNER</div><div>{docData.domain.owner || "—"}</div></div>
                      <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>STATUS</div><div>{docData.domain.document_status || "—"}</div></div>
                      <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>VERSION</div><div>{docData.domain.version || "—"}</div></div>
                      <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>GENERATED</div><div>{docData.summary.generated_at}</div></div>
                    </div>

                    <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>DESCRIPTION</div><div>{docData.domain.description || "—"}</div></div>
                    <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>BUSINESS OBJECTIVE</div><div>{docData.domain.business_objective || "—"}</div></div>
                    <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>SCOPE IN</div><div>{docData.domain.scope_in || "—"}</div></div>
                    <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>SCOPE OUT</div><div>{docData.domain.scope_out || "—"}</div></div>
                    <div><div style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>BUSINESS VALUE</div><div>{docData.domain.business_value || "—"}</div></div>

                    <div>
                      <div style={{fontSize:10,color:"#00d4ff",letterSpacing:2,marginBottom:6}}>SUBDOMAINS</div>
                      {docData.subdomains.length===0 ? <div style={{color:"#7899b0"}}>No subdomains documented.</div> : (
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {docData.subdomains.map(sd=>(
                            <div key={sd.id} style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:4,padding:10}}>
                              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                                <div>
                                  <div style={{color:"#00e5cc",fontFamily:"monospace"}}>{sd.subdomain_code}</div>
                                  <div>{sd.subdomain_name}</div>
                                </div>
                                <div style={{fontSize:10,color:"#7899b0"}}>Reqs: {sd.requirements.length} · Rules: {sd.business_rules.length} · Risks: {sd.risks.length}</div>
                              </div>
                              <div style={{fontSize:10,color:"#7899b0",marginTop:4}}>{sd.description || "No description."}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setDocOpen(false)}>Close</button>
              <button className="btn-save" onClick={()=>openExport("html")}>Open HTML</button>
            </div>
          </div>
        </div>
      )}

      {exportingDomain&&(
        <div className="mod-overlay" onClick={()=>setExportingDomain(null)}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:620}}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// EXPORT //</span>
                <h3 className="mod-modal__title">EXPORT DOMAIN <span>CHOOSE FORMAT</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>setExportingDomain(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div style={{fontSize:12,color:"#c8d8e8",marginBottom:14}}>
                <strong>{exportingDomain.domain_name}</strong>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10}}>
                {exportFormats.map(fmt=>(
                  <button
                    key={fmt.key}
                    className="btn-icon"
                    style={{padding:"12px 10px",minHeight:72,display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:6,textAlign:"left"}}
                    onClick={()=>handleChooseExportFormat(fmt.key)}
                  >
                    <span style={{fontSize:12,fontWeight:700,letterSpacing:1}}>{fmt.label}</span>
                    <span style={{fontSize:10,color:"#7899b0"}}>{fmt.hint}</span>
                  </button>
                ))}
              </div>
              <div style={{fontSize:10,color:"#7899b0",marginTop:12,lineHeight:1.5}}>
                HTML é o formato mais indicado para copiar/colar no Confluence.
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setExportingDomain(null)}>{t("business_domain.btn_cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Subdomain Modal */}
      {modalS&&sel&&(
        <div className="mod-overlay">
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480,width:"95%"}}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// {sel.domain_code} //</span><h3 className="mod-modal__title">{modalS==="new"?t("business_domain.modal_new_sub"):t("business_domain.modal_edit_sub")}</h3></div>
              <button className="mod-modal__close" onClick={()=>setModalS(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              {F(t("business_domain.field_sub_code"),
                <input className="mod-input" value={formS.subdomain_code} onChange={e=>setFormS(f=>({...f,subdomain_code:e.target.value.toUpperCase()}))} placeholder={t("business_domain.placeholder_sub_code")} disabled={modalS==="edit"} />
              )}
              {F(t("business_domain.field_sub_name"),<input className="mod-input" value={formS.subdomain_name} onChange={e=>setFormS(f=>({...f,subdomain_name:e.target.value}))} placeholder={t("business_domain.placeholder_sub_name")} />)}
              {F(t("business_domain.field_description"),<textarea className="mod-textarea" rows={2} value={formS.description} onChange={e=>setFormS(f=>({...f,description:e.target.value}))} placeholder={t("business_domain.placeholder_description")} />)}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setModalS(null)}>{t("business_domain.btn_cancel")}</button>
              <button className="btn-save" onClick={saveS} disabled={savingS||!formS.subdomain_code.trim()||!formS.subdomain_name.trim()}>{savingS?t("business_domain.btn_saving"):t("business_domain.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
