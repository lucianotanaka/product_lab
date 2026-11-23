import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiDelete, apiGet, apiPost } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface RoadmapItem { id: string; product_id: string; title: string; description?: string; item_type_id?: number; type?: string; status: string; start_date?: string; end_date?: string; quarter?: string; created_at: string; backlog_items?: { item_id: number }[]; }

const INITIATIVE_TYPES = [
  "strategic_initiative",
  "business_initiative",
  "technical_initiative",
  "enabling_initiative",
  "improvement_initiative",
  "compliance_initiative",
  "research_initiative",
  "operational_initiative",
] as const;

const LEGACY_TYPE_LABELS: Record<string, string> = {
  epic: "Epic",
  feature: "Feature",
  milestone: "Milestone",
};

const EMPTY = { title: "", description: "", type: "strategic_initiative", status: "planned", start_date: "", end_date: "", quarter: "" };

export default function RoadmapPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create"|null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const SIZE = 20;
  const typeLabel = (item: RoadmapItem) => {
    if (!item.type) return "—";
    const initiativeTypeMap: Record<string, string> = {
      strategic_initiative: t("roadmap.initiative_types.strategic_initiative"),
      business_initiative: t("roadmap.initiative_types.business_initiative"),
      technical_initiative: t("roadmap.initiative_types.technical_initiative"),
      enabling_initiative: t("roadmap.initiative_types.enabling_initiative"),
      improvement_initiative: t("roadmap.initiative_types.improvement_initiative"),
      compliance_initiative: t("roadmap.initiative_types.compliance_initiative"),
      research_initiative: t("roadmap.initiative_types.research_initiative"),
      operational_initiative: t("roadmap.initiative_types.operational_initiative"),
    };
    return initiativeTypeMap[item.type] ?? LEGACY_TYPE_LABELS[item.type] ?? item.type.replaceAll("_", " ");
  };

  const load = async (p = page, pid = productId) => {
    setLoading(true);
    setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<RoadmapItem>>(`/roadmap?${qs}`);
      setItems(r.items);
      setTotal(r.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("roadmap.err_generic"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => {
    localStorage.setItem("pl_product", id);
    setProductId(id);
  };

  const openCreate = () => {
    setForm({ ...EMPTY });
    setModal("create");
  };

  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId) {
      setError(t("roadmap.err_select_product"));
      return;
    }
    setSaving(true);
    try {
      await apiPost("/roadmap", {
        ...form,
        product_id: productId,
        item_type_id: null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        quarter: form.quarter || null,
      });
      closeModal();
      load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("roadmap.err_generic"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("roadmap.confirm_delete"))) return;
    try {
      await apiDelete(`/roadmap/${id}`);
      load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("roadmap.err_generic"));
    }
  };

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString(i18n.language === "pt" ? "pt-BR" : i18n.language === "es" ? "es-ES" : "en-US") : "—";

  return (
    <ModuleLayout
      moduleIcon="⬢"
      moduleName={t("roadmap.module_name")}
      moduleAccent={t("roadmap.module_accent")}
      selectedProductId={productId}
      onProductChange={handleProductChange}
    >
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("roadmap.eyebrow")}</span>
          <h1 className="mod-header__title">
            {t("roadmap.title")} <span>{t("roadmap.title_accent")}</span>
          </h1>
          <p className="mod-header__meta">{t("roadmap.meta", { count: total })}</p>
        </div>
        <button className="btn-add" onClick={openCreate}>{t("roadmap.btn_new")}</button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">{t("roadmap.loading")}</div>
        : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">⬢</div>
            <div className="mod-empty__title">{t("roadmap.empty_title")}</div>
            <div className="mod-empty__sub">{t("roadmap.empty_sub")}</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>{t("roadmap.col_title")}</th>
                <th>{t("roadmap.col_type")}</th>
                <th>{t("roadmap.col_status")}</th>
                <th>{t("roadmap.col_backlog")}</th>
                <th>{t("roadmap.col_quarter")}</th>
                <th>{t("roadmap.col_start")}</th>
                <th>{t("roadmap.col_end")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/modules/roadmap/${item.id}`)}>
                  <td><strong>{item.title}</strong>{item.description && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{item.description.slice(0, 60)}…</div>}</td>
                  <td><span style={{ fontSize: 10, letterSpacing: 1, color: "#00e5cc", border: "1px solid rgba(0,229,204,0.3)", padding: "2px 6px" }}>{typeLabel(item).toUpperCase()}</span></td>
                  <td><span className={`badge badge--${item.status}`}>{item.status.toUpperCase()}</span></td>
                  <td style={{ color: "#7899b0" }}>{t("roadmap.backlog_count", { count: item.backlog_items?.length ?? 0 })}</td>
                  <td><span className="roadmap-quarter">{item.quarter || "—"}</span></td>
                  <td style={{ color: "#7899b0", whiteSpace: "nowrap" }}>{fmt(item.start_date)}</td>
                  <td style={{ color: "#7899b0", whiteSpace: "nowrap" }}>{fmt(item.end_date)}</td>
                  <td>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => navigate(`/modules/roadmap/${item.id}`)}>{t("roadmap.btn_open")}</button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>{t("roadmap.btn_del")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > SIZE && (
          <div className="mod-pagination">
            <span>{(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} {t("roadmap.pagination_of")} {total}</span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t("roadmap.btn_prev")}</button>
              <button className="btn-page" disabled={page * SIZE >= total} onClick={() => setPage(p => p + 1)}>{t("roadmap.btn_next")}</button>
            </div>
          </div>
        )}
      </div>

      {modal === "create" && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">{t("roadmap.modal_eyebrow")}</span>
                <h3 className="mod-modal__title">{t("roadmap.modal_new")} <span>{t("roadmap.modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_title")} <span>*</span></label><input className="mod-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("roadmap.placeholder_title")} /></div>
              <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_description")}</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("roadmap.placeholder_description")} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_type")}</label><select className="mod-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{INITIATIVE_TYPES.map(type => <option key={type} value={type}>{({
                  strategic_initiative: t("roadmap.initiative_types.strategic_initiative"),
                  business_initiative: t("roadmap.initiative_types.business_initiative"),
                  technical_initiative: t("roadmap.initiative_types.technical_initiative"),
                  enabling_initiative: t("roadmap.initiative_types.enabling_initiative"),
                  improvement_initiative: t("roadmap.initiative_types.improvement_initiative"),
                  compliance_initiative: t("roadmap.initiative_types.compliance_initiative"),
                  research_initiative: t("roadmap.initiative_types.research_initiative"),
                  operational_initiative: t("roadmap.initiative_types.operational_initiative"),
                }[type] ?? type).toUpperCase()}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_status")}</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="planned">{t("roadmap.status_planned")}</option><option value="in_progress">{t("roadmap.status_in_progress")}</option><option value="completed">{t("roadmap.status_completed")}</option><option value="cancelled">{t("roadmap.status_cancelled")}</option></select></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_quarter")}</label><input className="mod-input" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))} placeholder={t("roadmap.placeholder_quarter")} /></div>
                <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_start_date")}</label><input className="mod-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">{t("roadmap.field_end_date")}</label><input className="mod-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              <div style={{ color: "#7899b0", fontSize: 11 }}>
                {t("roadmap.modal_hint")}
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("roadmap.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? t("roadmap.btn_saving") : t("roadmap.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
