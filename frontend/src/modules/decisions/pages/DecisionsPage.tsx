import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import RaciPanel from "../../../shared/components/RaciPanel";
import { INTL_LOCALE } from "../../../i18n";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Decision {
  id: string;
  product_id: string;
  title: string;
  context?: string;
  decision?: string;
  consequences?: string;
  status: string;
  tags: string[];
  created_at: string;
  discovery_opportunity_id?: string | null;
  business_case_id?: string | null;
  decided_by?: string | null;
  decision_date?: string | null;
}

interface OpportunityOption {
  id: string;
  title: string;
}

interface OpportunitySelectProps {
  value: string;
  options: OpportunityOption[];
  placeholder: string;
  onChange: (value: string) => void;
}

const EMPTY = {
  title: "",
  context: "",
  decision: "",
  consequences: "",
  status: "proposed",
  tags: [] as string[],
  discovery_opportunity_id: "",
  business_case_id: "",
  decided_by: "",
  decision_date: "",
};

function OpportunitySelect({ value, options, placeholder, onChange }: OpportunitySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  const displayLabel = selected?.title || placeholder;

  return (
    <div
      style={{ position: "relative", minWidth: 260, flex: 1 }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="mod-select"
        onClick={() => setOpen((prev) => !prev)}
        title={displayLabel}
        style={{
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          textTransform: "none",
          letterSpacing: 0.4,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayLabel}
        </span>
        <span aria-hidden="true">▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#0f1a2e",
            border: "1px solid rgba(0,212,255,.35)",
            boxShadow: "0 10px 24px rgba(0,0,0,.45)",
            zIndex: 20,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(0,212,255,.08)",
              color: "#e7f7ff",
              padding: "10px 12px",
              cursor: "pointer",
              font: "inherit",
              fontSize: 12,
              lineHeight: 1.35,
            }}
            title={placeholder}
          >
            {placeholder}
          </button>

          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                background: option.id === value ? "rgba(0,212,255,.12)" : "transparent",
                border: "none",
                borderBottom: "1px solid rgba(0,212,255,.08)",
                color: "#e7f7ff",
                padding: "10px 12px",
                cursor: "pointer",
                font: "inherit",
                fontSize: 12,
                lineHeight: 1.35,
                textTransform: "none",
                letterSpacing: 0.2,
              }}
              title={option.title}
            >
              {option.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DecisionsPage() {
  const { t, i18n } = useTranslation();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<Decision[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Decision | null>(null);
  const [saving, setSaving] = useState(false);
  const [opportunityFilter, setOpportunityFilter] = useState("");
  const [opportunityOptions, setOpportunityOptions] = useState<OpportunityOption[]>([]);
  const SIZE = 20;

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(INTL_LOCALE[i18n.language] ?? "en-US");
  };

  const resolveErrorMessage = (e: unknown) => (e instanceof Error ? e.message : t("decisions.err_generic"));

  const statusLabel = (status: string) => {
    const key = `decisions.status_${status}`;
    const translated = t(key);
    return translated === key ? status.toUpperCase() : translated;
  };

  const load = async (p = page, pid = productId) => {
    setLoading(true);
    setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<Decision>>(`/decisions?${qs}`);
      setItems(r.items);
      setTotal(r.total);
    } catch (e: unknown) {
      setError(resolveErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, productId);
    setPage(1);
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setOpportunityOptions([]);
      return;
    }
    apiGet<OpportunityOption[]>(`/opportunities/opportunities?product_id=${productId}`)
      .then((options) => setOpportunityOptions(options.map((item) => ({ id: item.id, title: item.title }))))
      .catch(() => setOpportunityOptions([]));
  }, [productId]);

  useEffect(() => {
    load();
  }, [page]);

  const filteredItems = useMemo(
    () => items.filter((item) => !opportunityFilter || item.discovery_opportunity_id === opportunityFilter),
    [items, opportunityFilter]
  );

  const handleProductChange = (id: string) => {
    localStorage.setItem("pl_product", id);
    setProductId(id);
  };

  const openCreate = () => {
    setForm({ ...EMPTY, discovery_opportunity_id: opportunityFilter || "" });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (item: Decision) => {
    setForm({
      title: item.title,
      context: item.context ?? "",
      decision: item.decision ?? "",
      consequences: item.consequences ?? "",
      status: item.status,
      tags: item.tags,
      discovery_opportunity_id: item.discovery_opportunity_id ?? "",
      business_case_id: item.business_case_id ?? "",
      decided_by: item.decided_by ?? "",
      decision_date: item.decision_date ?? "",
    });
    setEditing(item);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") {
      setError(t("decisions.err_select_product"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const tags =
        typeof form.tags === "string"
          ? (form.tags as unknown as string)
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : form.tags;

      const payload = {
        ...form,
        tags,
        discovery_opportunity_id: form.discovery_opportunity_id || null,
        business_case_id: form.business_case_id || null,
        decided_by: form.decided_by || null,
        decision_date: form.decision_date || null,
      };

      if (modal === "create") {
        await apiPost("/decisions", { ...payload, product_id: productId });
      } else if (editing) {
        await apiPatch(`/decisions/${editing.id}`, payload);
      }

      closeModal();
      load(page);
    } catch (e: unknown) {
      setError(resolveErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("decisions.confirm_delete"))) return;
    try {
      await apiDelete(`/decisions/${id}`);
      load(page);
    } catch (e: unknown) {
      setError(resolveErrorMessage(e));
    }
  };

  return (
    <ModuleLayout
      moduleIcon="◎"
      moduleName={t("decisions.module_name")}
      moduleAccent={t("decisions.module_accent")}
      selectedProductId={productId}
      onProductChange={handleProductChange}
    >
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("decisions.eyebrow")}</span>
          <h1 className="mod-header__title">
            {t("decisions.title")} <span>{t("decisions.title_accent")}</span>
          </h1>
          <p className="mod-header__meta">{t("decisions.meta", { count: filteredItems.length })}</p>
        </div>
        <button className="btn-add" onClick={openCreate}>
          {t("decisions.btn_new")}
        </button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <OpportunitySelect
          value={opportunityFilter}
          options={opportunityOptions}
          placeholder={t("decisions.filter_all_opportunities")}
          onChange={setOpportunityFilter}
        />
      </div>

      <div className="mod-table-wrap">
        {loading ? (
          <div className="mod-loading">{t("decisions.loading")}</div>
        ) : filteredItems.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◎</div>
            <div className="mod-empty__title">{t("decisions.empty_title")}</div>
            <div className="mod-empty__sub">
              {productId ? t("decisions.empty_sub_with_product") : t("decisions.empty_sub_no_product")}
            </div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>{t("decisions.col_title")}</th>
                <th>{t("decisions.col_status")}</th>
                <th>{t("decisions.col_opportunity")}</th>
                <th>{t("decisions.col_decision")}</th>
                <th>{t("decisions.col_tags")}</th>
                <th>{t("decisions.col_date")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.context && (
                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{item.context.slice(0, 60)}…</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge--${item.status}`}>{statusLabel(item.status)}</span>
                  </td>
                  <td style={{ color: "#7899b0", fontSize: 10 }}>
                    {opportunityOptions.find((option) => option.id === item.discovery_opportunity_id)?.title ?? "—"}
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.decision?.slice(0, 80) || "—"}
                  </td>
                  <td>{item.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}</td>
                  <td style={{ color: "#7899b0" }}>{formatDate(item.decision_date || item.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => openEdit(item)}>
                        {t("decisions.btn_edit")}
                      </button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>
                        {t("decisions.btn_del")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > SIZE && (
          <div className="mod-pagination">
            <span>
              {(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} {t("decisions.pagination_of")} {total}
            </span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
                {t("decisions.btn_prev")}
              </button>
              <button className="btn-page" disabled={page * SIZE >= total} onClick={() => setPage((prev) => prev + 1)}>
                {t("decisions.btn_next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">{t("decisions.modal_eyebrow")}</span>
                <h3 className="mod-modal__title">
                  {modal === "create" ? t("decisions.modal_new") : t("decisions.modal_edit")}{" "}
                  <span>{t("decisions.modal_subtitle")}</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">
                  {t("decisions.field_title")} <span>*</span>
                </label>
                <input
                  className="mod-input"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t("decisions.placeholder_title")}
                />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("decisions.field_context")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.context}
                  onChange={(e) => setForm((prev) => ({ ...prev, context: e.target.value }))}
                  placeholder={t("decisions.placeholder_context")}
                />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("decisions.field_decision")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.decision}
                  onChange={(e) => setForm((prev) => ({ ...prev, decision: e.target.value }))}
                  placeholder={t("decisions.placeholder_decision")}
                />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("decisions.field_consequences")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.consequences}
                  onChange={(e) => setForm((prev) => ({ ...prev, consequences: e.target.value }))}
                  placeholder={t("decisions.placeholder_consequences")}
                />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("decisions.field_opportunity")}</label>
                <select
                  className="mod-select"
                  value={form.discovery_opportunity_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, discovery_opportunity_id: e.target.value }))}
                  style={{ textTransform: "none", letterSpacing: 0.3 }}
                >
                  <option value="">{t("decisions.select_opportunity_none")}</option>
                  {opportunityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("decisions.field_status")}</label>
                  <select
                    className="mod-select"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="proposed">{t("decisions.status_proposed")}</option>
                    <option value="accepted">{t("decisions.status_accepted")}</option>
                    <option value="deprecated">{t("decisions.status_deprecated")}</option>
                    <option value="superseded">{t("decisions.status_superseded")}</option>
                  </select>
                </div>

                <div className="mod-field">
                  <label className="mod-field__label">{t("decisions.field_decided_by")}</label>
                  <input
                    className="mod-input"
                    value={form.decided_by}
                    onChange={(e) => setForm((prev) => ({ ...prev, decided_by: e.target.value }))}
                    placeholder={t("decisions.placeholder_decided_by")}
                  />
                </div>
              </div>

              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("decisions.field_decision_date")}</label>
                  <input
                    className="mod-input"
                    type="datetime-local"
                    value={form.decision_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, decision_date: e.target.value }))}
                  />
                </div>

                <div className="mod-field">
                  <label className="mod-field__label">{t("decisions.field_tags")}</label>
                  <input
                    className="mod-input"
                    value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags}
                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value as unknown as string[] }))}
                    placeholder={t("decisions.placeholder_tags")}
                  />
                </div>
              </div>
            </div>

            {modal === "edit" && editing && (
              <div style={{ padding: "0 16px 8px" }}>
                <RaciPanel objectType="DECISION" objectId={Number(editing.id)} productId={productId} />
              </div>
            )}

            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>
                {t("decisions.btn_cancel")}
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? t("decisions.btn_saving") : t("decisions.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
