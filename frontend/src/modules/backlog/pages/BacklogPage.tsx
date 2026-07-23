import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface ItemType { item_type_id: number; name: string; display_order: number; is_active: boolean; }
interface Sprint {
  sprint_id: number; product_id: number; name: string; goal?: string;
  start_date?: string; end_date?: string; status: string;
  capacity?: number; velocity?: number; created_at: string; updated_at: string;
}
interface BacklogItem {
  item_id: number; product_id?: number; feature_id?: number; sprint_id?: number;
  ado_id?: string; item_type_id?: number; title: string; description?: string;
  current_status: string; business_value?: string; acceptance_criteria?: string;
  story_points?: number; priority: number;
  wsjf_business_value: number; wsjf_time_criticality: number;
  wsjf_risk_reduction: number; wsjf_job_size: number; wsjf_score: number;
  created_at: string; updated_at: string; completed_at?: string;
}

const FIB = [1, 2, 3, 5, 8, 13, 20];
const calcWsjf = (bv: number, tc: number, rr: number, js: number): number =>
  js > 0 ? parseFloat(((bv + tc + rr) / js).toFixed(1)) : 0;
const wsjfLabel = (score: number, t: (k: string) => string) => {
  if (score >= 20) return { text: t("backlog.wsjf_critical"), color: "#ff6b6b" };
  if (score >= 10) return { text: t("backlog.wsjf_high"), color: "#ff9900" };
  if (score >= 5)  return { text: t("backlog.wsjf_medium"), color: "#00d4ff" };
  return { text: t("backlog.wsjf_low"), color: "#7899b0" };
};
const EMPTY = {
  title: "", description: "", item_type_id: "", current_status: "open",
  ado_id: "", story_points: "", priority: "3", sprint_id: "",
  business_value: "", acceptance_criteria: "",
  wsjf_business_value: "1", wsjf_time_criticality: "1", wsjf_risk_reduction: "1", wsjf_job_size: "1",
};
const EMPTY_SPRINT = { name: "", goal: "", start_date: "", end_date: "", status: "planned", capacity: "", velocity: "" };
const STATUSES = ["open", "in_progress", "done", "blocked", "cancelled"];
const SPRINT_STATUSES = ["planned", "active", "completed", "cancelled"];
const SC: Record<string, string> = { open: "#00d4ff", in_progress: "#ff9900", done: "#00ff88", blocked: "#ff6b6b", cancelled: "#7899b0" };
const sc = (s: string) => SC[s] ?? "#7899b0";
const SPRINT_SC: Record<string, string> = { planned: "#7899b0", active: "#00d4ff", completed: "#00ff88", cancelled: "#ff6b6b" };
const ssc = (s: string) => SPRINT_SC[s] ?? "#7899b0";
const DIM = "#7899b0";

export default function BacklogPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"items" | "sprints">("items");
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  // — Backlog Items state —
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<BacklogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  // — Sprints state —
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintLoading, setSprintLoading] = useState(false);
  const [sprintError, setSprintError] = useState("");
  const [sprintModal, setSprintModal] = useState<"create" | "edit" | null>(null);
  const [sprintForm, setSprintForm] = useState({ ...EMPTY_SPRINT });
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [savingSprint, setSavingSprint] = useState(false);

  const SIZE = 20;
  const pid = productId ? parseInt(productId, 10) : undefined;

  useEffect(() => { apiGet<ItemType[]>("/backlog/types/list").then(setItemTypes).catch(() => {}); }, []);

  const loadSprints = () => {
    if (!pid) { setSprints([]); return; }
    setSprintLoading(true); setSprintError("");
    apiGet<Sprint[]>(`/backlog/sprints?product_id=${pid}`)
      .then(setSprints)
      .catch(e => setSprintError(e instanceof Error ? e.message : t("backlog.spr_err_load")))
      .finally(() => setSprintLoading(false));
  };
  useEffect(() => { loadSprints(); }, [pid]);

  const typeLabel  = (id?: number) => itemTypes.find(x => x.item_type_id === id)?.name ?? "—";
  const sprintName = (id?: number) => sprints.find(s => s.sprint_id === id)?.name ?? "—";

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      let qs = `page=${p}&size=${SIZE}`;
      if (pid)          qs += `&product_id=${pid}`;
      if (filterStatus) qs += `&current_status=${filterStatus}`;
      if (filterTypeId) qs += `&item_type_id=${filterTypeId}`;
      const r = await apiGet<Paginated<BacklogItem>>(`/backlog?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("backlog.err_load")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(1); setPage(1); }, [productId, filterStatus, filterTypeId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };

  // — Item handlers —
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: BacklogItem) => {
    setForm({
      title: item.title, description: item.description ?? "",
      item_type_id: item.item_type_id ? String(item.item_type_id) : "",
      current_status: item.current_status, ado_id: item.ado_id ?? "",
      story_points: String(item.story_points ?? ""), priority: String(item.priority),
      sprint_id: item.sprint_id ? String(item.sprint_id) : "",
      business_value: item.business_value ?? "", acceptance_criteria: item.acceptance_criteria ?? "",
      wsjf_business_value: String(item.wsjf_business_value ?? 1),
      wsjf_time_criticality: String(item.wsjf_time_criticality ?? 1),
      wsjf_risk_reduction: String(item.wsjf_risk_reduction ?? 1),
      wsjf_job_size: String(item.wsjf_job_size ?? 1),
    });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };
  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const wBv = parseInt(form.wsjf_business_value, 10) || 1;
      const wTc = parseInt(form.wsjf_time_criticality, 10) || 1;
      const wRr = parseInt(form.wsjf_risk_reduction, 10) || 1;
      const wJs = parseInt(form.wsjf_job_size, 10) || 1;
      const body = {
        ...form, product_id: pid ?? null,
        item_type_id: form.item_type_id ? parseInt(form.item_type_id, 10) : null,
        story_points: form.story_points ? parseInt(form.story_points, 10) : null,
        priority: parseInt(form.priority, 10),
        sprint_id: form.sprint_id ? parseInt(form.sprint_id, 10) : null,
        wsjf_business_value: wBv, wsjf_time_criticality: wTc,
        wsjf_risk_reduction: wRr, wsjf_job_size: wJs,
        wsjf_score: calcWsjf(wBv, wTc, wRr, wJs),
      };
      if (modal === "create") await apiPost("/backlog", body);
      else if (editing) await apiPatch(`/backlog/${editing.item_id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("backlog.err_save")); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(t("backlog.confirm_delete"))) return;
    try { await apiDelete(`/backlog/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : t("backlog.err_delete")); }
  };

  // — Sprint handlers —
  const openCreateSprint = () => { setSprintForm({ ...EMPTY_SPRINT }); setEditingSprint(null); setSprintModal("create"); };
  const openEditSprint = (s: Sprint) => {
    setSprintForm({
      name: s.name, goal: s.goal ?? "", status: s.status,
      start_date: s.start_date ? s.start_date.slice(0, 10) : "",
      end_date: s.end_date ? s.end_date.slice(0, 10) : "",
      capacity: s.capacity != null ? String(s.capacity) : "",
      velocity: s.velocity != null ? String(s.velocity) : "",
    });
    setEditingSprint(s); setSprintModal("edit");
  };
  const closeSprintModal = () => { setSprintModal(null); setEditingSprint(null); };
  const handleSaveSprint = async () => {
    if (!sprintForm.name.trim() || !pid) return;
    setSavingSprint(true);
    try {
      const body = {
        product_id: pid,
        name: sprintForm.name.trim(),
        goal: sprintForm.goal || null,
        start_date: sprintForm.start_date || null,
        end_date: sprintForm.end_date || null,
        status: sprintForm.status,
        capacity: sprintForm.capacity ? parseInt(sprintForm.capacity, 10) : null,
        velocity: sprintForm.velocity ? parseInt(sprintForm.velocity, 10) : null,
      };
      if (sprintModal === "create") await apiPost("/backlog/sprints", body);
      else if (editingSprint) await apiPatch(`/backlog/sprints/${editingSprint.sprint_id}`, body);
      closeSprintModal(); loadSprints();
    } catch (e: unknown) { setSprintError(e instanceof Error ? e.message : t("backlog.spr_err_save")); }
    finally { setSavingSprint(false); }
  };
  const handleDeleteSprint = async (id: number) => {
    if (!confirm(t("backlog.spr_confirm_delete"))) return;
    try { await apiDelete(`/backlog/sprints/${id}`); loadSprints(); }
    catch (e: unknown) { setSprintError(e instanceof Error ? e.message : t("backlog.spr_err_delete")); }
  };

  // ── Tab style helper ──────────────────────────────────────────────────────
  const tabStyle = (active: boolean) => ({
    padding: "8px 20px", fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: "pointer",
    border: "none", background: "transparent",
    color: active ? "#00d4ff" : DIM,
    borderBottom: active ? "2px solid #00d4ff" : "2px solid transparent",
    transition: "all .2s",
  } as React.CSSProperties);

  return (
    <ModuleLayout moduleIcon="◫" moduleName={t("backlog.module_name")} moduleAccent={t("backlog.module_accent")}
      selectedProductId={productId} onProductChange={handleProductChange}>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,212,255,0.15)", marginBottom: 20 }}>
        <button style={tabStyle(activeTab === "items")} onClick={() => setActiveTab("items")}>
          {t("backlog.tab_items")}
        </button>
        <button style={tabStyle(activeTab === "sprints")} onClick={() => setActiveTab("sprints")}>
          {t("backlog.tab_sprints")}
        </button>
      </div>

      {/* ── ITEMS TAB ── */}
      {activeTab === "items" && (<>
        <div className="mod-header">
          <div className="mod-header__left">
            <span className="mod-header__eyebrow">{t("backlog.eyebrow")}</span>
            <h1 className="mod-header__title">{t("backlog.title")} <span>{t("backlog.title_accent")}</span></h1>
            <p className="mod-header__meta">{t("backlog.meta", { count: total })}</p>
          </div>
          <button className="btn-add" onClick={openCreate}>{t("backlog.btn_new")}</button>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <select className="mod-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">{t("backlog.filter_status")}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select className="mod-select" style={{ width: 160 }} value={filterTypeId} onChange={e => setFilterTypeId(e.target.value)}>
            <option value="">{t("backlog.filter_type")}</option>
            {itemTypes.map(tp => <option key={tp.item_type_id} value={tp.item_type_id}>{tp.name.toUpperCase()}</option>)}
          </select>
        </div>
        {error && <div className="mod-error">⚠ {error}</div>}
        <div className="mod-table-wrap">
          {loading ? <div className="mod-loading">{t("backlog.loading")}</div>
          : items.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">◫</div>
              <div className="mod-empty__title">{t("backlog.empty_title")}</div>
              <div className="mod-empty__sub">{t("backlog.empty_sub")}</div>
            </div>
          ) : (
            <table className="mod-table">
              <thead><tr>
                <th>{t("backlog.col_title")}</th><th>{t("backlog.col_type")}</th>
                <th>{t("backlog.col_status")}</th><th>{t("backlog.col_wsjf")}</th>
                <th>{t("backlog.col_sp")}</th><th>{t("backlog.col_sprint")}</th>
                <th>{t("backlog.col_ado")}</th><th></th>
              </tr></thead>
              <tbody>
                {items.map(item => {
                  const lbl = wsjfLabel(item.wsjf_score, t);
                  const color = sc(item.current_status);
                  return (
                    <tr key={item.item_id}>
                      <td>
                        <strong>{item.title}</strong>
                        {item.description && <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{item.description.slice(0, 70)}{item.description.length > 70 ? "…" : ""}</div>}
                      </td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color: "#00e5cc", border: "1px solid rgba(0,229,204,0.3)", padding: "2px 6px" }}>{typeLabel(item.item_type_id).toUpperCase()}</span></td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color, border: `1px solid ${color}40`, padding: "2px 6px" }}>{item.current_status.replace("_", " ").toUpperCase()}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: lbl.color }}>{item.wsjf_score}</div>
                        <div style={{ fontSize: 8, letterSpacing: 1, color: lbl.color }}>{lbl.text}</div>
                      </td>
                      <td style={{ textAlign: "center", color: "#c8d8e8" }}>{item.story_points ?? "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{item.sprint_id ? sprintName(item.sprint_id) : "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{item.ado_id || "—"}</td>
                      <td><div className="row-actions">
                        <button className="btn-icon" onClick={() => openEdit(item)}>{t("backlog.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.item_id)}>{t("backlog.btn_del")}</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {total > SIZE && (
            <div className="mod-pagination">
              <span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} {t("backlog.pagination_of")} {total}</span>
              <div className="mod-pagination__btns">
                <button className="btn-page" disabled={page===1} onClick={() => setPage(p=>p-1)}>{t("backlog.btn_prev")}</button>
                <button className="btn-page" disabled={page*SIZE>=total} onClick={() => setPage(p=>p+1)}>{t("backlog.btn_next")}</button>
              </div>
            </div>
          )}
        </div>
      </>)}

      {/* ── SPRINTS TAB ── */}
      {activeTab === "sprints" && (<>
        <div className="mod-header">
          <div className="mod-header__left">
            <span className="mod-header__eyebrow">{t("backlog.spr_eyebrow")}</span>
            <h1 className="mod-header__title">{t("backlog.spr_title")} <span>{t("backlog.spr_accent")}</span></h1>
            <p className="mod-header__meta">{t("backlog.spr_meta", { count: sprints.length })}</p>
          </div>
          {pid && <button className="btn-add" onClick={openCreateSprint}>{t("backlog.spr_btn_new")}</button>}
        </div>
        {!pid && <div className="mod-error">⚠ {t("backlog.spr_no_product")}</div>}
        {sprintError && <div className="mod-error">⚠ {sprintError}</div>}
        <div className="mod-table-wrap">
          {sprintLoading ? <div className="mod-loading">{t("backlog.loading")}</div>
          : sprints.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">⚡</div>
              <div className="mod-empty__title">{t("backlog.spr_empty_title")}</div>
              <div className="mod-empty__sub">{t("backlog.spr_empty_sub")}</div>
            </div>
          ) : (
            <table className="mod-table">
              <thead><tr>
                <th>{t("backlog.spr_col_name")}</th>
                <th>{t("backlog.spr_col_status")}</th>
                <th>{t("backlog.spr_col_dates")}</th>
                <th>{t("backlog.spr_col_capacity")}</th>
                <th>{t("backlog.spr_col_velocity")}</th>
                <th></th>
              </tr></thead>
              <tbody>
                {sprints.map(s => {
                  const color = ssc(s.status);
                  const pct = s.capacity && s.velocity ? Math.round((s.velocity/s.capacity)*100) : null;
                  return (
                    <tr key={s.sprint_id}>
                      <td>
                        <strong>{s.name}</strong>
                        {s.goal && <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{s.goal.slice(0,80)}{s.goal.length>80?"…":""}</div>}
                      </td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color, border: `1px solid ${color}40`, padding: "2px 6px" }}>{s.status.toUpperCase()}</span></td>
                      <td style={{ color: DIM, fontSize: 11 }}>
                        {s.start_date ? s.start_date.slice(0,10) : "—"}
                        {s.start_date && s.end_date ? " → " : ""}
                        {s.end_date ? s.end_date.slice(0,10) : ""}
                      </td>
                      <td style={{ textAlign: "center", color: "#c8d8e8" }}>{s.capacity ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ color: "#c8d8e8" }}>{s.velocity ?? "—"}</div>
                        {pct !== null && <div style={{ fontSize: 9, color: pct >= 80 ? "#00ff88" : pct >= 50 ? "#ff9900" : "#ff6b6b" }}>{pct}%</div>}
                      </td>
                      <td><div className="row-actions">
                        <button className="btn-icon" onClick={() => openEditSprint(s)}>{t("backlog.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteSprint(s.sprint_id)}>{t("backlog.btn_del")}</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>)}

      {/* ── MODAL: Backlog Item ── */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// BACKLOG //</span>
                <h3 className="mod-modal__title">{modal==="create"?t("backlog.modal_new"):t("backlog.modal_edit")} <span>{t("backlog.modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_title")} <span>*</span></label>
                <input className="mod-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder={t("backlog.placeholder_title")} />
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_type")}</label>
                  <select className="mod-select" value={form.item_type_id} onChange={e => setForm(f=>({...f,item_type_id:e.target.value}))}>
                    <option value="">{t("backlog.select_type")}</option>
                    {itemTypes.map(tp=><option key={tp.item_type_id} value={tp.item_type_id}>{tp.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_status")}</label>
                  <select className="mod-select" value={form.current_status} onChange={e => setForm(f=>({...f,current_status:e.target.value}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s.replace("_"," ").toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_priority")}</label>
                  <select className="mod-select" value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))}>
                    {[1,2,3,4,5].map(p=><option key={p} value={p}>{p} — {["CRITICAL","HIGH","MEDIUM","LOW","MINIMAL"][p-1]}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_story_points")}</label>
                  <input className="mod-input" type="number" min="0" value={form.story_points} onChange={e => setForm(f=>({...f,story_points:e.target.value}))} placeholder={t("backlog.placeholder_sp")} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_ado_id")}</label>
                  <input className="mod-input" value={form.ado_id} onChange={e => setForm(f=>({...f,ado_id:e.target.value}))} placeholder={t("backlog.placeholder_ado")} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_sprint")}</label>
                  <select className="mod-select" value={form.sprint_id} onChange={e => setForm(f=>({...f,sprint_id:e.target.value}))}>
                    <option value="">{t("backlog.select_sprint_none")}</option>
                    {sprints.map(s=><option key={s.sprint_id} value={s.sprint_id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_description")}</label>
                <textarea className="mod-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder={t("backlog.placeholder_description")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_acceptance")}</label>
                <textarea className="mod-textarea" value={form.acceptance_criteria} onChange={e => setForm(f=>({...f,acceptance_criteria:e.target.value}))} placeholder={t("backlog.placeholder_acceptance")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_business_value")}</label>
                <textarea className="mod-textarea" value={form.business_value} onChange={e => setForm(f=>({...f,business_value:e.target.value}))} placeholder={t("backlog.placeholder_business_value")} />
              </div>
              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>{t("backlog.wsjf_heading")}</div>
                <div className="mod-field-row">
                  {([
                    { key: "wsjf_business_value",   label: t("backlog.wsjf_business_value") },
                    { key: "wsjf_time_criticality", label: t("backlog.wsjf_time_criticality") },
                    { key: "wsjf_risk_reduction",   label: t("backlog.wsjf_risk_reduction") },
                    { key: "wsjf_job_size",         label: t("backlog.wsjf_job_size") },
                  ] as { key: string; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="mod-field">
                      <label className="mod-field__label" style={{ fontSize: 9 }}>{label}</label>
                      <select className="mod-select" value={(form as Record<string,string>)[key]}
                        onChange={e => setForm(f=>({...f,[key]:e.target.value}))}>
                        {FIB.map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {(() => {
                  const score = calcWsjf(parseInt(form.wsjf_business_value,10)||1, parseInt(form.wsjf_time_criticality,10)||1, parseInt(form.wsjf_risk_reduction,10)||1, parseInt(form.wsjf_job_size,10)||1);
                  const lbl = wsjfLabel(score, t);
                  return (
                    <div style={{ fontSize: 11, letterSpacing: 1, marginTop: 6 }}>
                      {t("backlog.wsjf_score_label")} <span style={{ color: lbl.color, fontWeight: 700, fontSize: 16 }}>{score}</span>
                      <span style={{ color: lbl.color, marginLeft: 8, fontSize: 9 }}>— {lbl.text}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("backlog.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>
                {saving ? t("backlog.btn_saving") : t("backlog.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Sprint ── */}
      {sprintModal && (
        <div className="mod-overlay" onClick={closeSprintModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// SPRINTS //</span>
                <h3 className="mod-modal__title">{sprintModal==="create"?t("backlog.spr_modal_new"):t("backlog.spr_modal_edit")} <span>{t("backlog.spr_modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeSprintModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.spr_field_name")} <span>*</span></label>
                <input className="mod-input" value={sprintForm.name} onChange={e => setSprintForm(f=>({...f,name:e.target.value}))} placeholder={t("backlog.spr_placeholder_name")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.spr_field_status")}</label>
                <select className="mod-select" value={sprintForm.status} onChange={e => setSprintForm(f=>({...f,status:e.target.value}))}>
                  {SPRINT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_start")}</label>
                  <input className="mod-input" type="date" value={sprintForm.start_date} onChange={e => setSprintForm(f=>({...f,start_date:e.target.value}))} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_end")}</label>
                  <input className="mod-input" type="date" value={sprintForm.end_date} onChange={e => setSprintForm(f=>({...f,end_date:e.target.value}))} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_capacity")}</label>
                  <input className="mod-input" type="number" min="0" value={sprintForm.capacity} onChange={e => setSprintForm(f=>({...f,capacity:e.target.value}))} placeholder="Ex: 40" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_velocity")}</label>
                  <input className="mod-input" type="number" min="0" value={sprintForm.velocity} onChange={e => setSprintForm(f=>({...f,velocity:e.target.value}))} placeholder="Ex: 36" />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.spr_field_goal")}</label>
                <textarea className="mod-textarea" value={sprintForm.goal} onChange={e => setSprintForm(f=>({...f,goal:e.target.value}))} placeholder={t("backlog.spr_placeholder_goal")} />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeSprintModal}>{t("backlog.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSaveSprint} disabled={savingSprint||!sprintForm.name.trim()}>
                {savingSprint ? t("backlog.btn_saving") : t("backlog.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
