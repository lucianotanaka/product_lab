import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StakeholderMini { id: number; full_name: string; position?: string | null; }
interface RaciRow {
  id: number; product_id: number | null; object_type: string; object_id: number;
  stakeholder_id: number; stakeholder?: StakeholderMini | null;
  role: string; notes?: string | null; created_at: string; updated_at: string;
}
interface MatrixRow { object_type: string; object_id: number; object_label?: string | null; assignments: RaciRow[]; }

const OBJECT_TYPES = ["REQUIREMENT","BACKLOG","DECISION","RISK","ROADMAP","PROCESS","DISCOVERY","MEETING"] as const;
const ROLES = ["R","A","C","I"] as const;

const ROLE_COLORS: Record<string, string> = {
  R: "#00d4ff", A: "#00ff88", C: "#ff9900", I: "#7899b0",
};
const TYPE_ICON: Record<string, string> = {
  REQUIREMENT: "◫", BACKLOG: "▤", DECISION: "◆", RISK: "⚠",
  ROADMAP: "▶", PROCESS: "⟳", DISCOVERY: "◎", MEETING: "◉",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RaciPage() {
  const { t } = useTranslation();
  const [pid, setPid] = useState(localStorage.getItem("pl_product") ?? "");
  const [activeTab, setActiveTab] = useState<"matrix" | "stakeholders">("matrix");
  const [filterType, setFilterType] = useState("");
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [stakeholderRows, setStakeholderRows] = useState<RaciRow[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderMini[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Modal state
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ object_type: "REQUIREMENT", object_id: "", stakeholder_id: "", role: "R", notes: "" });
  const [objects, setObjects] = useState<{ id: string; label: string }[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stakeholder filter (for by-stakeholder tab)
  const [selStakeholder, setSelStakeholder] = useState("");

  const changePid = (id: string) => { localStorage.setItem("pl_product", id); setPid(id); };

  // ── Load matrix ──────────────────────────────────────────────────────────────
  const loadMatrix = async () => {
    if (!pid) return;
    setLoading(true); setErr("");
    try {
      let url = `/raci/matrix?product_id=${pid}`;
      if (filterType) url += `&object_type=${filterType}`;
      setMatrix(await apiGet<MatrixRow[]>(url));
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t("raci.err_load")); }
    finally { setLoading(false); }
  };

  // ── Load stakeholder view ────────────────────────────────────────────────────
  const loadByStakeholder = async () => {
    if (!selStakeholder) return;
    setLoading(true); setErr("");
    try {
      let url = `/raci/stakeholder/${selStakeholder}`;
      if (pid) url += `?product_id=${pid}`;
      setStakeholderRows(await apiGet<RaciRow[]>(url));
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t("raci.err_load")); }
    finally { setLoading(false); }
  };

  // ── Load stakeholders list ───────────────────────────────────────────────────
  const loadStakeholders = async () => {
    try {
      const r = await apiGet<Paginated<StakeholderMini>>("/stakeholders?page=1&size=200");
      setStakeholders(r.items);
    } catch { setStakeholders([]); }
  };

  useEffect(() => { loadStakeholders(); }, []);
  useEffect(() => { if (activeTab === "matrix") loadMatrix(); }, [pid, filterType, activeTab]);
  useEffect(() => { if (activeTab === "stakeholders" && selStakeholder) loadByStakeholder(); }, [selStakeholder, pid, activeTab]);

  // ── Load objects when object_type changes in modal ───────────────────────────
  useEffect(() => {
    if (!modal) return;
    setLoadingObjects(true);
    setForm(f => ({ ...f, object_id: "" }));
    const fetch = async () => {
      try {
        const ot = form.object_type;
        if (ot === "REQUIREMENT") {
          const r = await apiGet<Paginated<{ id: number; requirement_code: string; requirement_title: string }>>(`/requirements?page=1&size=100${pid ? `&product_id=${pid}` : ""}`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: `${i.requirement_code} — ${i.requirement_title}` })));
        } else if (ot === "BACKLOG") {
          const r = await apiGet<Paginated<{ item_id: number; title: string }>>(`/backlog?page=1&size=100${pid ? `&product_id=${pid}` : ""}`);
          setObjects(r.items.map(i => ({ id: String(i.item_id), label: i.title })));
        } else if (ot === "DECISION") {
          const r = await apiGet<Paginated<{ id: number; title: string }>>(`/decisions?page=1&size=100`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: i.title })));
        } else if (ot === "RISK") {
          const r = await apiGet<Paginated<{ id: number; title: string }>>(`/risks?page=1&size=100`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: i.title })));
        } else if (ot === "ROADMAP") {
          const r = await apiGet<Paginated<{ id: number; title: string }>>(`/roadmap?page=1&size=100`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: i.title })));
        } else if (ot === "PROCESS") {
          const r = await apiGet<Paginated<{ id: number; name: string }>>(`/processes?page=1&size=100`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: i.name })));
        } else if (ot === "DISCOVERY") {
          const r = await apiGet<Paginated<{ id: number; title: string }>>(`/discovery?page=1&size=100${pid ? `&product_id=${pid}` : ""}`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: i.title })));
        } else if (ot === "MEETING") {
          const r = await apiGet<Paginated<{ id: number; title: string }>>(`/meetings?page=1&size=100${pid ? `&product_id=${pid}` : ""}`);
          setObjects(r.items.map(i => ({ id: String(i.id), label: i.title })));
        }
      } catch { setObjects([]); }
      finally { setLoadingObjects(false); }
    };
    fetch();
  }, [form.object_type, modal, pid]);

  const openModal = () => {
    setForm({ object_type: "REQUIREMENT", object_id: "", stakeholder_id: "", role: "R", notes: "" });
    setModal(true);
  };

  const saveAssignment = async () => {
    if (!form.object_id || !form.stakeholder_id) return;
    setSaving(true);
    try {
      await apiPost(`/raci/${form.object_type}/${form.object_id}`, {
        product_id: pid ? Number(pid) : null,
        object_type: form.object_type,
        object_id: Number(form.object_id),
        stakeholder_id: Number(form.stakeholder_id),
        role: form.role,
        notes: form.notes || null,
      });
      setModal(false);
      loadMatrix();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("raci.err_save");
      setErr(msg);
    } finally { setSaving(false); }
  };

  const delAssignment = async (row: RaciRow) => {
    if (!confirm(t("raci.confirm_delete"))) return;
    try {
      await apiDelete(`/raci/${row.object_type}/${row.object_id}/${row.id}`);
      loadMatrix();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t("raci.err_load")); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getTypeLabel = (ot: string) => t(`raci.type_${ot.toLowerCase()}`);
  const getRoleColor = (role: string) => ROLE_COLORS[role] ?? "#7899b0";
  const getRoleFull = (role: string) => t(`raci.role_${role.toLowerCase()}_full`);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ModuleLayout moduleIcon="◈" moduleName={t("raci.title")} moduleAccent={t("raci.title_accent")} selectedProductId={pid} onProductChange={changePid}>

      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("raci.eyebrow")}</span>
          <h1 className="mod-header__title">{t("raci.title")} <span>{t("raci.title_accent")}</span></h1>
        </div>
        <button className="btn-add" onClick={openModal}>{t("raci.btn_add")}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid rgba(0,212,255,0.1)", paddingBottom: 8 }}>
        {(["matrix", "stakeholders"] as const).map(tab => (
          <button key={tab} className={`btn-page${activeTab === tab ? " btn-page--active" : ""}`}
            onClick={() => setActiveTab(tab)} style={{ fontSize: 10, padding: "4px 14px" }}>
            {tab === "matrix" ? t("raci.tab_matrix") : t("raci.tab_stakeholders")}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab === "matrix" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <select className="mod-select" style={{ width: 200 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">{t("raci.filter_all_types")}</option>
            {OBJECT_TYPES.map(ot => <option key={ot} value={ot}>{getTypeLabel(ot)}</option>)}
          </select>
        </div>
      )}
      {activeTab === "stakeholders" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <select className="mod-select" style={{ width: 280 }} value={selStakeholder} onChange={e => setSelStakeholder(e.target.value)}>
            <option value="">{t("raci.select_stakeholder")}</option>
            {stakeholders.map(s => <option key={s.id} value={String(s.id)}>{s.full_name}</option>)}
          </select>
        </div>
      )}

      {err && <div className="mod-error">⚠ {err}</div>}

      {!pid ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">◈</div>
          <div className="mod-empty__title">{t("raci.no_product")}</div>
        </div>
      ) : loading ? (
        <div className="mod-loading">{t("raci.loading")}</div>
      ) : activeTab === "matrix" ? (

        /* ── MATRIX TAB ────────────────────────────────────────────────────── */
        matrix.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◈</div>
            <div className="mod-empty__title">{t("raci.empty_title")}</div>
            <div className="mod-empty__sub">{t("raci.empty_sub")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 10, color: "#7899b0" }}>
              <span style={{ color: "#00d4ff", letterSpacing: 1 }}>{t("raci.legend_title")}</span>
              {ROLES.map(r => (
                <span key={r}>
                  <span style={{ color: getRoleColor(r), fontWeight: 700, marginRight: 4 }}>{r}</span>
                  <span>{getRoleFull(r)}</span>
                </span>
              ))}
            </div>

            <table className="mod-table">
              <thead>
                <tr>
                  <th>{t("raci.col_type")}</th>
                  <th>{t("raci.col_object")}</th>
                  <th style={{ color: ROLE_COLORS.R }}>{t("raci.col_r")}</th>
                  <th style={{ color: ROLE_COLORS.A }}>{t("raci.col_a")}</th>
                  <th style={{ color: ROLE_COLORS.C }}>{t("raci.col_c")}</th>
                  <th style={{ color: ROLE_COLORS.I }}>{t("raci.col_i")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => {
                  const byRole = (r: string) => row.assignments.filter(a => a.role === r);
                  return (
                    <tr key={`${row.object_type}-${row.object_id}`}>
                      <td>
                        <span style={{ fontSize: 10, color: "#00d4ff" }}>
                          {TYPE_ICON[row.object_type] ?? "◈"} {getTypeLabel(row.object_type)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <span style={{ fontSize: 11, color: "#e0eaff" }}>{row.object_label ?? `#${row.object_id}`}</span>
                      </td>
                      {ROLES.map(role => (
                        <td key={role} style={{ verticalAlign: "top", minWidth: 120 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {byRole(role).map(a => (
                              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 10, color: "#c0d4e8" }}>
                                  {a.stakeholder?.full_name ?? `#${a.stakeholder_id}`}
                                </span>
                                <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 4px" }}
                                  onClick={() => delAssignment(a)}>{t("raci.btn_del")}</button>
                              </div>
                            ))}
                          </div>
                        </td>
                      ))}
                      <td></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (

        /* ── BY STAKEHOLDER TAB ────────────────────────────────────────────── */
        !selStakeholder ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◈</div>
            <div className="mod-empty__title">{t("raci.select_stakeholder")}</div>
          </div>
        ) : stakeholderRows.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◈</div>
            <div className="mod-empty__title">{t("raci.empty_title")}</div>
            <div className="mod-empty__sub">{t("raci.empty_sub")}</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>{t("raci.col_type")}</th>
                <th>{t("raci.col_object")}</th>
                <th>{t("raci.col_role")}</th>
                <th>{t("raci.col_notes")}</th>
              </tr>
            </thead>
            <tbody>
              {stakeholderRows.map(row => (
                <tr key={row.id}>
                  <td><span style={{ fontSize: 10, color: "#00d4ff" }}>{TYPE_ICON[row.object_type] ?? "◈"} {getTypeLabel(row.object_type)}</span></td>
                  <td><span style={{ fontSize: 11, color: "#e0eaff" }}>#{row.object_id}</span></td>
                  <td>
                    <span className="badge" style={{ background: `${getRoleColor(row.role)}22`, color: getRoleColor(row.role), fontSize: 10, padding: "2px 8px", fontWeight: 700 }}>
                      {row.role} — {getRoleFull(row.role)}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: "#7899b0" }}>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* ── MODAL ────────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="mod-overlay">
          <div className="mod-modal" style={{ maxWidth: 560, width: "95%" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">{t("raci.modal_eyebrow")}</span>
                <h3 className="mod-modal__title">{t("raci.modal_new")} <span>{t("raci.modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("raci.field_object_type")}</label>
                  <select className="mod-select" value={form.object_type}
                    onChange={e => setForm(f => ({ ...f, object_type: e.target.value, object_id: "" }))}>
                    {OBJECT_TYPES.map(ot => <option key={ot} value={ot}>{getTypeLabel(ot)}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("raci.field_role")}</label>
                  <select className="mod-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r} — {getRoleFull(r)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("raci.field_object_id")}</label>
                {loadingObjects
                  ? <input className="mod-input" disabled value={t("raci.loading_objects")} />
                  : <select className="mod-select" value={form.object_id} onChange={e => setForm(f => ({ ...f, object_id: e.target.value }))}>
                      <option value="">{t("raci.select_object")}</option>
                      {objects.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                }
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("raci.field_stakeholder")}</label>
                <select className="mod-select" value={form.stakeholder_id} onChange={e => setForm(f => ({ ...f, stakeholder_id: e.target.value }))}>
                  <option value="">{t("raci.select_stakeholder")}</option>
                  {stakeholders.map(s => <option key={s.id} value={String(s.id)}>{s.full_name}{s.position ? ` — ${s.position}` : ""}</option>)}
                </select>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("raci.field_notes")}</label>
                <input className="mod-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setModal(false)}>{t("raci.btn_cancel")}</button>
              <button className="btn-save" onClick={saveAssignment}
                disabled={saving || !form.object_id || !form.stakeholder_id}>
                {saving ? t("raci.btn_saving") : t("raci.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
