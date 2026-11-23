import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost, apiDelete } from "../services/api";
import AttachmentsPanel from "./AttachmentsPanel";

interface StakeholderRef { id: number; full_name: string; position_title?: string; }
interface RaciAssignment {
  id: number; object_type: string; object_id: number; stakeholder_id: number;
  stakeholder?: { id: number; full_name: string; position?: string };
  role: "R" | "A" | "C" | "I"; notes?: string | null;
  approved_at?: string | null; approval_method?: string | null;
  approval_evidence?: string | null; approved_by?: string | null;
}
interface Props {
  objectType: "REQUIREMENT"|"BACKLOG"|"DECISION"|"RISK"|"ROADMAP"|"PROCESS"|"DISCOVERY"|"MEETING";
  objectId: number; productId?: string | number | null;
}

const ROLE_COLOR: Record<string,string> = { R:"#00ff88", A:"#ff9900", C:"#00d4ff", I:"#c084fc" };
const ROLES = ["R","A","C","I"] as const;
const APPROVAL_METHODS = ["email","verbal","document","meeting","other"] as const;
type ApprovalMethod = typeof APPROVAL_METHODS[number];
const METHOD_ICON: Record<string,string> = { email:"✉", verbal:"🗣", document:"📄", meeting:"🤝", other:"◈" };

// ─── Approval Modal ────────────────────────────────────────────────────────
function ApprovalModal({ assignment, onClose, onSaved }: {
  assignment: RaciAssignment; onClose: ()=>void; onSaved: (u: RaciAssignment)=>void;
}) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<ApprovalMethod>((assignment.approval_method as ApprovalMethod) ?? "email");
  const [evidence, setEvidence] = useState(assignment.approval_evidence ?? "");
  const [approvedBy, setApprovedBy] = useState(assignment.approved_by ?? "");
  const [approvedAt, setApprovedAt] = useState(
    assignment.approved_at ? new Date(assignment.approved_at).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("pl_token") ?? document.cookie.match(/pl_token=([^;]+)/)?.[1] : "";

  const save = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${BASE}/raci/${assignment.object_type}/${assignment.object_id}/${assignment.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ approval_method: method, approval_evidence: evidence || null, approved_by: approvedBy || null, approved_at: approvedAt ? new Date(approvedAt).toISOString() : null }),
      });
      if (!res.ok) { const b = await res.json().catch(()=>({})); throw new Error(b?.detail ?? `HTTP ${res.status}`); }
      onSaved(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("raci.err_save")); }
    finally { setSaving(false); }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth:520 }} onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// RACI — APROVAÇÃO //</span>
            <h3 className="mod-modal__title">{t("raci.approval_modal_title")} <span>{assignment.stakeholder?.full_name ?? `#${assignment.stakeholder_id}`}</span></h3>
          </div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div style={{ fontSize:10, color:"#ff6b6b", marginBottom:10 }}>⚠ {error}</div>}
          <div className="mod-field">
            <label className="mod-field__label">{t("raci.approval_method")}</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {APPROVAL_METHODS.map(m=>(
                <button key={m} type="button" onClick={()=>setMethod(m)} style={{ padding:"5px 12px", fontSize:10, letterSpacing:1, border:`1px solid ${method===m?"#ff9900":"rgba(0,212,255,0.2)"}`, background:method===m?"rgba(255,153,0,0.15)":"rgba(0,0,0,0.2)", color:method===m?"#ff9900":"#7899b0", borderRadius:2, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                  <span>{METHOD_ICON[m]}</span>{t(`raci.approval_method_${m}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="mod-field">
            <label className="mod-field__label">{t("raci.approval_date")}</label>
            <input className="mod-input" type="date" value={approvedAt} onChange={e=>setApprovedAt(e.target.value)} />
          </div>
          <div className="mod-field">
            <label className="mod-field__label">{t("raci.approval_registered_by")}</label>
            <input className="mod-input" value={approvedBy} onChange={e=>setApprovedBy(e.target.value)} placeholder={t("raci.approval_registered_by_placeholder")} />
          </div>
          <div className="mod-field">
            <label className="mod-field__label">{t("raci.approval_evidence")}</label>
            <textarea className="mod-textarea" style={{ minHeight:100 }} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder={t("raci.approval_evidence_placeholder")} />
          </div>
          {/* File attachments for this approval */}
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:9, letterSpacing:2, color:"#00d4ff", marginBottom:6 }}>
              📎 {t("raci.approval_attachments")}
            </div>
            <AttachmentsPanel entityType="raci_assignment" entityId={String(assignment.id)} />
          </div>
        </div>
        <div className="mod-modal__footer">
          <button className="btn-cancel" onClick={onClose}>{t("raci.btn_cancel")}</button>
          <button className="btn-save" onClick={save} disabled={saving}>{saving ? t("raci.btn_saving") : t("raci.approval_btn_save")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Approval Badge ────────────────────────────────────────────────────────
function ApprovalBadge({ assignment, onClear, onEdit }: { assignment: RaciAssignment; onClear:()=>void; onEdit:()=>void; }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!assignment.approved_at) return null;
  const date = new Date(assignment.approved_at).toLocaleDateString("pt-BR");
  const method = assignment.approval_method ?? "other";
  return (
    <div style={{ marginTop:4, position:"relative" }}>
      <button onClick={()=>setOpen(v=>!v)} title={t("raci.approval_view")} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", background:"rgba(0,255,136,0.08)", border:"1px solid rgba(0,255,136,0.4)", borderRadius:2, cursor:"pointer", fontSize:9, color:"#00ff88", letterSpacing:0.5 }}>
        ✓ {t("raci.approval_badge")} · {METHOD_ICON[method]} {t(`raci.approval_method_${method}`)} · {date}
      </button>
      {open && (
        <div onClick={e=>e.stopPropagation()} style={{ position:"absolute", top:"100%", left:0, zIndex:20, background:"#0d1e36", border:"1px solid rgba(0,255,136,0.3)", borderRadius:4, padding:"10px 14px", minWidth:280, boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:9, color:"#00ff88", letterSpacing:2, marginBottom:8 }}>✓ {t("raci.approval_evidence_title")}</div>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"4px 10px", fontSize:10, marginBottom:8 }}>
            <span style={{ color:"#7899b0" }}>{t("raci.approval_method")}:</span>
            <span style={{ color:"#c8dce8" }}>{METHOD_ICON[method]} {t(`raci.approval_method_${method}`)}</span>
            <span style={{ color:"#7899b0" }}>{t("raci.approval_date")}:</span>
            <span style={{ color:"#c8dce8" }}>{date}</span>
            {assignment.approved_by && (<><span style={{ color:"#7899b0" }}>{t("raci.approval_registered_by")}:</span><span style={{ color:"#c8dce8" }}>{assignment.approved_by}</span></>)}
          </div>
          {assignment.approval_evidence && (
            <div style={{ fontSize:10, color:"#c8dce8", lineHeight:1.5, padding:"6px 8px", background:"rgba(0,212,255,0.04)", border:"1px solid rgba(0,212,255,0.12)", borderRadius:2, marginBottom:8, whiteSpace:"pre-wrap" }}>
              {assignment.approval_evidence}
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <button className="btn-icon" style={{ fontSize:8, padding:"2px 6px" }} onClick={()=>{ setOpen(false); onEdit(); }}>{t("raci.approval_btn_edit")}</button>
            <button className="btn-icon btn-icon--danger" style={{ fontSize:8, padding:"2px 6px" }} onClick={()=>{ setOpen(false); onClear(); }}>{t("raci.approval_btn_revoke")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────
export default function RaciPanel({ objectType, objectId, productId }: Props): React.ReactElement {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<RaciAssignment[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ stakeholder_id:"", role:"R" as string });
  const [approvalTarget, setApprovalTarget] = useState<RaciAssignment | null>(null);

  const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("pl_token") ?? document.cookie.match(/pl_token=([^;]+)/)?.[1] : "";

  const loadAssignments = useCallback(async () => {
    if (!objectId) return;
    setLoading(true);
    try { setAssignments(await apiGet<RaciAssignment[]>(`/raci/${objectType}/${objectId}`)); }
    catch { setAssignments([]); }
    finally { setLoading(false); }
  }, [objectType, objectId]);

  const loadStakeholders = useCallback(async () => {
    try { const d = await apiGet<{ items: StakeholderRef[] }>(`/stakeholders?page=1&size=200`); setStakeholders(d.items); }
    catch { setStakeholders([]); }
  }, []);

  useEffect(() => { loadAssignments(); loadStakeholders(); }, [loadAssignments, loadStakeholders]);

  const add = async () => {
    if (!form.stakeholder_id) return;
    setSaving(true); setError("");
    try {
      await apiPost(`/raci/${objectType}/${objectId}`, { object_type:objectType, object_id:objectId, stakeholder_id:Number(form.stakeholder_id), role:form.role, product_id:productId?Number(productId):null });
      setForm({ stakeholder_id:"", role:"R" });
      await loadAssignments();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("raci.err_save");
      if (msg.includes("Accountable")) setError(t("raci.err_duplicate_a"));
      else if (msg.includes("already exists")) setError(t("raci.err_duplicate"));
      else setError(msg);
    } finally { setSaving(false); }
  };

  const remove = async (a: RaciAssignment) => {
    if (!confirm(t("raci.confirm_delete"))) return;
    try { await apiDelete(`/raci/${objectType}/${objectId}/${a.id}`); setAssignments(p=>p.filter(x=>x.id!==a.id)); }
    catch {/**/ }
  };

  const clearApproval = async (a: RaciAssignment) => {
    if (!confirm(t("raci.approval_confirm_revoke"))) return;
    try {
      const res = await fetch(`${BASE}/raci/${objectType}/${objectId}/${a.id}/approve`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        const updated: RaciAssignment = await res.json();
        setAssignments(p => p.map(x => x.id === a.id ? updated : x));
      }
    } catch {/**/ }
  };

  // Group by role
  const byRole: Record<string, RaciAssignment[]> = { R:[], A:[], C:[], I:[] };
  assignments.forEach(a => { if (byRole[a.role]) byRole[a.role].push(a); });

  return (
    <div style={{ marginTop:12, padding:"12px 14px", background:"rgba(255,153,0,0.02)", border:"1px solid rgba(255,153,0,0.18)", borderRadius:3 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
      <span style={{ fontSize:9, letterSpacing:2, color:"#ff9900" }}>◈ RACI {assignments.length > 0 && `(${assignments.length})`}</span>
      </div>

      {error && <div style={{ fontSize:10, color:"#ff6b6b", marginBottom:8 }}>⚠ {error}</div>}

      {loading ? (
        <div style={{ fontSize:10, color:"#7899b0", padding:"4px 0" }}>{t("raci.loading")}</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:10 }}>
          {ROLES.map(role => (
            <div key={role} style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
              {/* Role badge */}
              <div style={{ flexShrink:0, width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", background:`${ROLE_COLOR[role]}22`, border:`1px solid ${ROLE_COLOR[role]}66`, borderRadius:2, fontSize:9, fontWeight:700, color:ROLE_COLOR[role] }}>
                {role}
              </div>
              {/* Role label */}
              <div style={{ flexShrink:0, width:72, fontSize:9, color:"#7899b0", paddingTop:3, letterSpacing:0.5 }}>
                {t(`raci.role_${role.toLowerCase()}_full`)}
              </div>
              {/* Assignees */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
                {byRole[role].length === 0 ? (
                  <span style={{ fontSize:9, color:"rgba(120,153,176,0.4)", fontStyle:"italic" }}>—</span>
                ) : (
                  byRole[role].map(a => (
                    <div key={a.id}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"1px 6px", background:`${ROLE_COLOR[role]}12`, border:`1px solid ${ROLE_COLOR[role]}33`, borderRadius:2, fontSize:9, color:ROLE_COLOR[role] }}>
                        {a.stakeholder?.full_name ?? `#${a.stakeholder_id}`}
                        {/* Register approval button — only for A without existing approval */}
                        {role === "A" && !a.approved_at && (
                          <button
                            onClick={() => setApprovalTarget(a)}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,153,0,0.6)", padding:0, fontSize:8, lineHeight:1, marginLeft:3 }}
                            title={t("raci.approval_register")}
                          >
                            ✓?
                          </button>
                        )}
                        <button
                          onClick={() => remove(a)}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,107,107,0.6)", padding:0, fontSize:9, lineHeight:1, marginLeft:2 }}
                          title={t("raci.confirm_delete")}
                        >
                          ✕
                        </button>
                      </span>
                      {role === "A" && (
                        <ApprovalBadge
                          assignment={a}
                          onEdit={() => setApprovalTarget(a)}
                          onClear={() => clearApproval(a)}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div style={{ borderTop:"1px solid rgba(255,153,0,0.12)", paddingTop:8, display:"flex", gap:4, alignItems:"flex-end", flexWrap:"wrap" }}>
        <select
          className="mod-select"
          style={{ flex:"1 1 140px", fontSize:10, padding:"3px 6px" }}
          value={form.stakeholder_id}
          onChange={e => setForm(f=>({...f, stakeholder_id:e.target.value}))}
        >
          <option value="">{t("raci.select_stakeholder")}</option>
          {stakeholders.map(s => (
            <option key={s.id} value={s.id}>
              {s.full_name}{s.position_title ? ` — ${s.position_title}` : ""}
            </option>
          ))}
        </select>
        <select
          className="mod-select"
          style={{ flex:"0 0 54px", fontSize:10, padding:"3px 6px" }}
          value={form.role}
          onChange={e => setForm(f=>({...f, role:e.target.value}))}
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{r} — {t(`raci.role_${r.toLowerCase()}_full`)}</option>
          ))}
        </select>
        <button
          className="btn-add"
          style={{ fontSize:9, padding:"3px 10px", flexShrink:0 }}
          disabled={saving || !form.stakeholder_id}
          onClick={add}
        >
          {saving ? t("raci.btn_saving") : t("raci.btn_add")}
        </button>
      </div>

      {/* Approval modal */}
      {approvalTarget && (
        <ApprovalModal
          assignment={approvalTarget}
          onClose={() => setApprovalTarget(null)}
          onSaved={updated => {
            setAssignments(p => p.map(x => x.id === updated.id ? updated : x));
            setApprovalTarget(null);
          }}
        />
      )}
    </div>
  );
}
