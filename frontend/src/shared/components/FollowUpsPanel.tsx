import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface Followup {
  id: string; entity_type: string; entity_id: string;
  action_type: string; description: string;
  assigned_to?: string; due_date?: string;
  status: string; notes?: string;
  created_at: string; updated_at: string;
}
interface Props { entityType: string; entityId: string; }

const ACTION_TYPES = ["schedule_meeting","request_info","send_material","review_answer","validate","escalate","send_email","update_stakeholder","other"];
const STATUS_COLORS: Record<string,string> = { pending:"#f59e0b", done:"#10b981", cancelled:"#6b7280" };
const ACTION_ICONS: Record<string,string>  = { schedule_meeting:"📅", request_info:"❓", send_material:"📤", review_answer:"🔍", validate:"✅", escalate:"⚠️", send_email:"📧", update_stakeholder:"👤", other:"📌" };

function isOverdue(d?: string, s?: string) { return !!d && s !== "done" && s !== "cancelled" && new Date(d) < new Date(new Date().toDateString()); }
function isToday(d?: string, s?: string)   { return !!d && s !== "done" && s !== "cancelled" && d === new Date().toISOString().split("T")[0]; }
function fmtDate(iso?: string) { if (!iso) return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
const EMPTY = { action_type:"other", description:"", assigned_to:"", due_date:"", notes:"", status:"pending" };

export default function FollowUpsPanel({ entityType, entityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems]     = useState<Followup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<Followup|null>(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({...EMPTY});

  const BASE  = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const token = typeof window !== "undefined" ? (localStorage.getItem("pl_token") ?? document.cookie.match(/pl_token=([^;]+)/)?.[1] ?? "") : "";
  const hdr   = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/followups?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`, { headers:{ Authorization:`Bearer ${token}` }, credentials:"include" });
      if (r.ok) setItems(await r.json());
    } catch {/**/} finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditing(null); setForm({...EMPTY}); setOpen(true); setError(""); };
  const openEdit = (x: Followup) => { setEditing(x); setForm({ action_type:x.action_type, description:x.description, assigned_to:x.assigned_to??"", due_date:x.due_date??"", notes:x.notes??"", status:x.status }); setOpen(true); setError(""); };
  const close    = () => { setOpen(false); setEditing(null); setError(""); };
  const sf       = (k: keyof typeof EMPTY, v: string) => setForm(p => ({...p,[k]:v}));

  const save = async () => {
    if (!form.description.trim()) { setError(t("followups.err_description_required")); return; }
    setSaving(true); setError("");
    try {
      const body = { entity_type:entityType, entity_id:entityId, action_type:form.action_type, description:form.description.trim(), assigned_to:form.assigned_to.trim()||null, due_date:form.due_date||null, status:form.status, notes:form.notes.trim()||null };
      const r = editing
        ? await fetch(`${BASE}/followups/${editing.id}`, { method:"PATCH", headers:hdr, credentials:"include", body:JSON.stringify(body) })
        : await fetch(`${BASE}/followups`,               { method:"POST",  headers:hdr, credentials:"include", body:JSON.stringify(body) });
      if (!r.ok) throw new Error();
      const saved: Followup = await r.json();
      if (editing) setItems(p => p.map(x => x.id===saved.id ? saved : x));
      else         setItems(p => [...p, saved]);
      close();
    } catch { setError(t("followups.err_save")); } finally { setSaving(false); }
  };

  const toggle = async (item: Followup) => {
    const next = item.status==="pending" ? "done" : item.status==="done" ? "pending" : item.status;
    try {
      const r = await fetch(`${BASE}/followups/${item.id}`, { method:"PATCH", headers:hdr, credentials:"include", body:JSON.stringify({status:next}) });
      if (r.ok) { const u: Followup = await r.json(); setItems(p => p.map(x => x.id===u.id ? u : x)); }
    } catch {/**/}
  };

  const del = async (id: string) => {
    if (!confirm(t("followups.confirm_delete"))) return;
    try { await fetch(`${BASE}/followups/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` }, credentials:"include" }); setItems(p => p.filter(x => x.id!==id)); } catch {/**/}
  };

  const ics = (id: string) => window.open(`${BASE}/followups/${id}/ics`, "_blank");

  const pending = items.filter(x => x.status==="pending").length;

  const lbl: React.CSSProperties = { fontSize:8, letterSpacing:1, color:"#7899b0", display:"block", marginBottom:3 };
  const inp: React.CSSProperties = { width:"100%", background:"rgba(0,0,0,0.3)", border:"1px solid rgba(0,212,255,0.2)", borderRadius:2, color:"#c8dce8", fontSize:11, padding:"4px 7px", boxSizing:"border-box" };

  return (
    <div style={{ marginTop:12, padding:"12px 14px", background:"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:3 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:9, letterSpacing:2, color:"#f59e0b" }}>
          ⊙ {t("followups.title")}
          {pending > 0 && (
            <span style={{ marginLeft:6, background:"#f59e0b", color:"#000", borderRadius:8, padding:"1px 5px", fontSize:8, fontWeight:700 }}>
              {pending} {t("followups.pending_count_suffix")}
            </span>
          )}
        </span>
        <button className="btn-add" style={{ fontSize:9, padding:"2px 8px", borderColor:"rgba(245,158,11,0.4)", color:"#f59e0b" }} onClick={openNew}>
          {t("followups.btn_new")}
        </button>
      </div>

      {loading && <div style={{ fontSize:10, color:"#7899b0", textAlign:"center", padding:"6px 0" }}>…</div>}
      {!loading && items.length===0 && !open && (
        <div style={{ fontSize:10, color:"#7899b0", textAlign:"center", padding:"8px 0" }}>{t("followups.empty")}</div>
      )}

      {/* List */}
      {items.map(item => {
        const ov = isOverdue(item.due_date, item.status);
        const td = isToday(item.due_date, item.status);
        const done = item.status==="done";
        const canc = item.status==="cancelled";
        const col  = STATUS_COLORS[item.status] ?? "#7899b0";
        return (
          <div key={item.id} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 9px", marginBottom:5, borderRadius:2, background:done?"rgba(16,185,129,0.04)":canc?"rgba(0,0,0,0.10)":ov?"rgba(239,68,68,0.06)":"rgba(0,0,0,0.15)", border:`1px solid ${done?"rgba(16,185,129,0.2)":canc?"rgba(107,114,128,0.2)":ov?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.15)"}`, opacity:canc?0.6:1 }}>
            <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{ACTION_ICONS[item.action_type]??"📌"}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, color:done?"#7899b0":"#c8dce8", textDecoration:done?"line-through":"none", lineHeight:1.4, wordBreak:"break-word" }}>{item.description}</div>
              <div style={{ fontSize:9, color:"#7899b0", marginTop:2, display:"flex", flexWrap:"wrap", gap:"4px 10px" }}>
                {item.assigned_to && <span>👤 {item.assigned_to}</span>}
                {item.due_date && (
                  <span style={{ color:ov?"#ef4444":td?"#f59e0b":"#7899b0" }}>
                    📆 {fmtDate(item.due_date)}
                    {ov && <span style={{ marginLeft:4, background:"#ef4444", color:"#fff", borderRadius:3, padding:"0 3px", fontSize:7 }}>{t("followups.badge_overdue")}</span>}
                    {td && <span style={{ marginLeft:4, background:"#f59e0b", color:"#000", borderRadius:3, padding:"0 3px", fontSize:7 }}>{t("followups.badge_today")}</span>}
                  </span>
                )}
                {item.notes && <span style={{ fontStyle:"italic", opacity:0.7 }}>"{item.notes.length>60?item.notes.slice(0,60)+"…":item.notes}"</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:3, flexShrink:0, alignItems:"center" }}>
              <span style={{ fontSize:7, padding:"1px 5px", borderRadius:8, cursor:"pointer", userSelect:"none", background:`${col}22`, color:col, border:`1px solid ${col}55` }} onClick={() => toggle(item)} title={t("followups.toggle_status_hint")}>
                {t(`followups.status_${item.status}`, item.status.toUpperCase())}
              </span>
              {item.due_date && !canc && (
                <button className="btn-icon" style={{ fontSize:8, padding:"1px 4px", color:"#7899b0" }} onClick={() => ics(item.id)} title={t("followups.btn_ics")}>📅</button>
              )}
              <button className="btn-icon" style={{ fontSize:8, padding:"1px 5px", color:"#00d4ff", borderColor:"rgba(0,212,255,0.3)" }} onClick={() => openEdit(item)}>
                {t("followups.btn_edit")}
              </button>
              <button className="btn-icon btn-icon--danger" style={{ fontSize:8, padding:"1px 5px" }} onClick={() => del(item.id)}>
                {t("followups.btn_del")}
              </button>
            </div>
          </div>
        );
      })}

      {/* Inline form */}
      {open && (
        <div style={{ marginTop:10, padding:"12px", background:"rgba(0,0,0,0.2)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:3 }}>
          <div style={{ fontSize:9, letterSpacing:2, color:"#f59e0b", marginBottom:10 }}>
            {editing ? t("followups.modal_edit") : t("followups.modal_new")} FOLLOW-UP
          </div>

          {/* Row 1: type + status */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <div>
              <label style={lbl}>{t("followups.field_type")}</label>
              <select style={inp} value={form.action_type} onChange={e => sf("action_type", e.target.value)}>
                {ACTION_TYPES.map(at => (
                  <option key={at} value={at}>{t(`followups.type_${at}`, at)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>{t("followups.field_status")}</label>
              <select style={inp} value={form.status} onChange={e => sf("status", e.target.value)}>
                <option value="pending">{t("followups.status_pending")}</option>
                <option value="done">{t("followups.status_done")}</option>
                <option value="cancelled">{t("followups.status_cancelled")}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom:8 }}>
            <label style={lbl}>{t("followups.field_description")}</label>
            <textarea rows={2} style={{ ...inp, resize:"vertical" }} value={form.description} onChange={e => sf("description", e.target.value)} placeholder={t("followups.placeholder_description")} />
          </div>

          {/* Row 2: assigned + due date */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <div>
              <label style={lbl}>{t("followups.field_assigned_to")}</label>
              <input style={inp} value={form.assigned_to} onChange={e => sf("assigned_to", e.target.value)} placeholder={t("followups.placeholder_assigned")} />
            </div>
            <div>
              <label style={lbl}>{t("followups.field_due_date")}</label>
              <input type="date" style={inp} value={form.due_date} onChange={e => sf("due_date", e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom:10 }}>
            <label style={lbl}>{t("followups.field_notes")}</label>
            <input style={inp} value={form.notes} onChange={e => sf("notes", e.target.value)} placeholder={t("followups.placeholder_notes")} />
          </div>

          {error && <div style={{ fontSize:10, color:"#ef4444", marginBottom:8 }}>⚠ {error}</div>}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn-cancel" onClick={close}>{t("followups.btn_cancel")}</button>
            <button className="btn-save" onClick={save} disabled={saving}>
              {saving ? t("followups.btn_saving") : t("followups.btn_save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
