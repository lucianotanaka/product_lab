import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Followup {
  id: string; entity_type: string; entity_id: string;
  action_type: string; description: string;
  assigned_to?: string; due_date?: string;
  status: string; notes?: string;
  created_at: string; updated_at: string;
}

const ACTION_TYPES = ["schedule_meeting","request_info","send_material","review_answer","validate","escalate","send_email","update_stakeholder","other"];
const ENTITY_TYPES = ["general","meeting","backlog_item","decision","risk","roadmap_item","requirement","process","discovery_research","discovery_opportunity"];
const STATUS_COLORS: Record<string,string> = { pending:"#f59e0b", done:"#10b981", cancelled:"#6b7280" };
const ACTION_ICONS: Record<string,string> = { schedule_meeting:"📅", request_info:"❓", send_material:"📤", review_answer:"🔍", validate:"✅", escalate:"⚠️", send_email:"📧", update_stakeholder:"👤", other:"📌" };
const ENTITY_LABELS: Record<string,string> = { general:"Geral", discovery_research:"Research", discovery_opportunity:"Discovery", meeting:"Meeting", backlog_item:"Backlog", decision:"Decision", risk:"Risk", roadmap_item:"Roadmap", requirement:"Requisito", process:"Processo" };

function isOverdue(d?: string, s?: string) { return !!d && s==="pending" && new Date(d) < new Date(new Date().toDateString()); }
function isToday(d?: string) { return !!d && d===new Date().toISOString().split("T")[0]; }
function fmtDate(iso?: string) { if (!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }

const EMPTY_FORM = { entity_type:"general", entity_id:"global", action_type:"other", description:"", assigned_to:"", due_date:"", status:"pending", notes:"" };

export default function FollowUpsPage() {
  const { t } = useTranslation();
  const [items, setItems]       = useState<Followup[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [modal, setModal]       = useState<"create"|"edit"|null>(null);
  const [editing, setEditing]   = useState<Followup|null>(null);
  const [form, setForm]         = useState({...EMPTY_FORM});
  const [saving, setSaving]     = useState(false);
  // Filters
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterEntity, setFilterEntity]   = useState("");
  const [filterSearch, setFilterSearch]   = useState("");

  const BASE  = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const token = typeof window!=="undefined" ? (localStorage.getItem("pl_token") ?? document.cookie.match(/pl_token=([^;]+)/)?.[1] ?? "") : "";
  const hdr   = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterEntity) params.set("entity_type", filterEntity);
      const r = await fetch(`${BASE}/followups/all?${params}`, { headers:{ Authorization:`Bearer ${token}` }, credentials:"include" });
      if (r.ok) setItems(await r.json());
      else setError(`HTTP ${r.status}`);
    } catch { setError("Erro ao carregar"); } finally { setLoading(false); }
  }, [filterStatus, filterEntity]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterSearch
    ? items.filter(i => i.description.toLowerCase().includes(filterSearch.toLowerCase()) || (i.assigned_to??'').toLowerCase().includes(filterSearch.toLowerCase()))
    : items;

  const pending = items.filter(i=>i.status==="pending").length;
  const overdue = items.filter(i=>isOverdue(i.due_date,i.status)).length;

  const openCreate = () => { setForm({...EMPTY_FORM}); setEditing(null); setModal("create"); setError(""); };
  const openEdit = (x: Followup) => {
    setForm({ entity_type:x.entity_type, entity_id:x.entity_id, action_type:x.action_type, description:x.description, assigned_to:x.assigned_to??"", due_date:x.due_date??"", status:x.status, notes:x.notes??"" });
    setEditing(x); setModal("edit"); setError("");
  };
  const closeModal = () => { setModal(null); setEditing(null); setError(""); };
  const sf = (k: keyof typeof EMPTY_FORM, v: string) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.description.trim()) { setError(t("followups.err_description_required")); return; }
    setSaving(true); setError("");
    try {
      const body = { ...form, entity_id: form.entity_type==="general"?"global":form.entity_id, assigned_to:form.assigned_to.trim()||null, due_date:form.due_date||null, notes:form.notes.trim()||null };
      const r = editing
        ? await fetch(`${BASE}/followups/${editing.id}`, { method:"PATCH", headers:hdr, credentials:"include", body:JSON.stringify(body) })
        : await fetch(`${BASE}/followups`,               { method:"POST",  headers:hdr, credentials:"include", body:JSON.stringify(body) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      closeModal(); load();
    } catch (e) { setError(e instanceof Error ? e.message : t("followups.err_save")); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("followups.confirm_delete"))) return;
    try { await fetch(`${BASE}/followups/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` }, credentials:"include" }); setItems(p=>p.filter(x=>x.id!==id)); } catch {/**/}
  };

  const toggleStatus = async (item: Followup) => {
    const next = item.status==="pending"?"done":item.status==="done"?"pending":item.status;
    try {
      const r = await fetch(`${BASE}/followups/${item.id}`, { method:"PATCH", headers:hdr, credentials:"include", body:JSON.stringify({status:next}) });
      if (r.ok) { const u=await r.json(); setItems(p=>p.map(x=>x.id===u.id?u:x)); }
    } catch {/**/}
  };

  const ics = (id: string) => window.open(`${BASE}/followups/${id}/ics`,"_blank");

  const lbl: React.CSSProperties = { fontSize:8, letterSpacing:1, color:"#7899b0", display:"block", marginBottom:3 };
  const inp: React.CSSProperties = { width:"100%", background:"rgba(0,0,0,0.3)", border:"1px solid rgba(0,212,255,0.2)", borderRadius:2, color:"#c8dce8", fontSize:11, padding:"4px 7px", boxSizing:"border-box" };

  return (
    <ModuleLayout moduleIcon="⊙" moduleName="FOLLOW-UPS" moduleAccent="FOLLOW-UPS">
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// MÓDULO FOLLOW-UPS //</span>
          <h1 className="mod-header__title">FOLLOW-<span>UPS</span></h1>
          <p className="mod-header__meta">
            {items.length} registro(s)
            {pending>0 && <span style={{marginLeft:10, color:"#f59e0b"}}> · ⊙ {pending} pendente(s)</span>}
            {overdue>0 && <span style={{marginLeft:10, color:"#ef4444"}}> · ▲ {overdue} atrasado(s)</span>}
          </p>
        </div>
        <button className="btn-add" style={{ borderColor:"rgba(245,158,11,0.5)", color:"#f59e0b" }} onClick={openCreate}>
          {t("followups.btn_new")}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <select style={{ ...inp, width:"auto", minWidth:140 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">— TODOS OS STATUS —</option>
          <option value="pending">🟡 Pendente</option>
          <option value="done">🟢 Concluído</option>
          <option value="cancelled">⚫ Cancelado</option>
        </select>
        <select style={{ ...inp, width:"auto", minWidth:160 }} value={filterEntity} onChange={e=>setFilterEntity(e.target.value)}>
          <option value="">— TODOS OS MÓDULOS —</option>
          {ENTITY_TYPES.map(et => <option key={et} value={et}>{ENTITY_LABELS[et]??et}</option>)}
        </select>
        <input style={{ ...inp, flex:1, minWidth:180 }} placeholder="🔍 Buscar descrição ou responsável..." value={filterSearch} onChange={e=>setFilterSearch(e.target.value)} />
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      {/* Table */}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : filtered.length===0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">⊙</div>
            <div className="mod-empty__title">NENHUM FOLLOW-UP</div>
            <div className="mod-empty__sub">{filterStatus||filterEntity||filterSearch ? "Nenhum resultado para os filtros selecionados" : "Clique em '+ FOLLOW-UP' para criar o primeiro lembrete"}</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th style={{width:28}}>TIPO</th>
                <th>DESCRIÇÃO</th>
                <th>MÓDULO</th>
                <th>RESPONSÁVEL</th>
                <th>PRAZO</th>
                <th>STATUS</th>
                <th style={{width:100}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const ov = isOverdue(item.due_date, item.status);
                const td = isToday(item.due_date);
                const done = item.status==="done";
                const canc = item.status==="cancelled";
                const col  = STATUS_COLORS[item.status]??"#7899b0";
                return (
                  <tr key={item.id} style={{ opacity:canc?0.55:1, background:ov?"rgba(239,68,68,0.04)":done?"rgba(16,185,129,0.03)":"" }}>
                    <td style={{ fontSize:16, textAlign:"center" }}>{ACTION_ICONS[item.action_type]??"📌"}</td>
                    <td>
                      <div style={{ fontWeight:600, color:done?"#7899b0":"#c8dce8", textDecoration:done?"line-through":"none", fontSize:12 }}>{item.description}</div>
                      {item.notes && <div style={{ fontSize:9, color:"#7899b0", marginTop:2, fontStyle:"italic" }}>"{item.notes.slice(0,80)}{item.notes.length>80?"…":""}"</div>}
                    </td>
                    <td>
                      <span style={{ fontSize:9, padding:"1px 6px", background:"rgba(0,212,255,0.1)", color:"#00d4ff", border:"1px solid rgba(0,212,255,0.2)", borderRadius:3 }}>
                        {ENTITY_LABELS[item.entity_type]??item.entity_type}
                      </span>
                    </td>
                    <td style={{ fontSize:10, color:"#7899b0" }}>{item.assigned_to ?? "—"}</td>
                    <td style={{ fontSize:10, color:ov?"#ef4444":td?"#f59e0b":"#7899b0", fontWeight:ov||td?700:400 }}>
                      {item.due_date ? <>
                        {fmtDate(item.due_date)}
                        {ov && <span style={{ marginLeft:5, fontSize:7, background:"#ef4444", color:"#fff", padding:"0 3px", borderRadius:2 }}>ATRASADO</span>}
                        {td && !ov && <span style={{ marginLeft:5, fontSize:7, background:"#f59e0b", color:"#000", padding:"0 3px", borderRadius:2 }}>HOJE</span>}
                      </> : "—"}
                    </td>
                    <td>
                      <span onClick={()=>toggleStatus(item)} style={{ fontSize:8, padding:"2px 6px", borderRadius:8, cursor:"pointer", userSelect:"none", background:`${col}22`, color:col, border:`1px solid ${col}55` }}>
                        {item.status==="pending"?"Pendente":item.status==="done"?"Concluído":"Cancelado"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {item.due_date && item.status!=="cancelled" && (
                          <button className="btn-icon" style={{ fontSize:8, padding:"1px 4px" }} onClick={()=>ics(item.id)} title="Exportar .ics">📅</button>
                        )}
                        <button className="btn-icon" style={{ fontSize:8 }} onClick={()=>openEdit(item)}>EDITAR</button>
                        <button className="btn-icon btn-icon--danger" style={{ fontSize:8 }} onClick={()=>handleDelete(item.id)}>DEL</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" style={{ maxWidth:560 }} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// FOLLOW-UP //</span>
                <h3 className="mod-modal__title">{modal==="create"?"NOVO":"EDITAR"} <span>FOLLOW-UP</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              {/* Row 1: action type + status */}
              <div className="mod-field-row">
                <div className="mod-field">
                  <label style={lbl}>{t("followups.field_type")}</label>
                  <select style={inp} value={form.action_type} onChange={e=>sf("action_type",e.target.value)}>
                    {ACTION_TYPES.map(at=><option key={at} value={at}>{t(`followups.type_${at}`,at)}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label style={lbl}>{t("followups.field_status")}</label>
                  <select style={inp} value={form.status} onChange={e=>sf("status",e.target.value)}>
                    <option value="pending">{t("followups.status_pending")}</option>
                    <option value="done">{t("followups.status_done")}</option>
                    <option value="cancelled">{t("followups.status_cancelled")}</option>
                  </select>
                </div>
              </div>
              {/* Row 2: entity type (only on create) */}
              {modal==="create" && (
                <div className="mod-field">
                  <label style={lbl}>MÓDULO / CONTEXTO</label>
                  <select style={inp} value={form.entity_type} onChange={e=>sf("entity_type",e.target.value)}>
                    {ENTITY_TYPES.map(et=><option key={et} value={et}>{ENTITY_LABELS[et]??et}</option>)}
                  </select>
                </div>
              )}
              {/* Description */}
              <div className="mod-field">
                <label style={lbl}>{t("followups.field_description")}</label>
                <textarea className="mod-textarea" rows={2} value={form.description} onChange={e=>sf("description",e.target.value)} placeholder={t("followups.placeholder_description")} />
              </div>
              {/* Row 3: assigned + due date */}
              <div className="mod-field-row">
                <div className="mod-field">
                  <label style={lbl}>{t("followups.field_assigned_to")}</label>
                  <input style={inp} value={form.assigned_to} onChange={e=>sf("assigned_to",e.target.value)} placeholder={t("followups.placeholder_assigned")} />
                </div>
                <div className="mod-field">
                  <label style={lbl}>{t("followups.field_due_date")}</label>
                  <input type="date" style={inp} value={form.due_date} onChange={e=>sf("due_date",e.target.value)} />
                </div>
              </div>
              {/* Notes */}
              <div className="mod-field">
                <label style={lbl}>{t("followups.field_notes")}</label>
                <input style={inp} value={form.notes} onChange={e=>sf("notes",e.target.value)} placeholder={t("followups.placeholder_notes")} />
              </div>
              {error && <div className="mod-error" style={{ marginTop:8 }}>⚠ {error}</div>}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("followups.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSave} disabled={saving||!form.description.trim()}>
                {saving ? t("followups.btn_saving") : t("followups.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
