import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import RaciPanel from "../../../shared/components/RaciPanel";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface RiskLink {
  entity_type: "roadmap" | "backlog" | "decision";
  entity_id: string;
  label?: string;
}

interface Risk {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  probability: number;
  impact: number;
  risk_score: number;
  status: string;
  mitigation_plan?: string;
  category?: string;
  responsible?: string;
  created_at: string;
  links: RiskLink[];
}

interface RoadmapItem {
  id: string;
  title: string;
  status?: string;
  type?: string;
}

interface BacklogItem {
  item_id: number;
  title: string;
  current_status?: string;
  item_type_name?: string;
  ado_id?: string;
}

interface SelectOption {
  id: string;
  label: string;
  searchText?: string;
}

interface RiskForm {
  title: string;
  description: string;
  probability: number;
  impact: number;
  risk_score: number;
  status: string;
  mitigation_plan: string;
  roadmap_ids: string[];
  backlog_ids: string[];
  roadmap_input: string;
  backlog_input: string;
}

const EMPTY: RiskForm = {
  title: "",
  description: "",
  probability: 1,
  impact: 1,
  risk_score: 1,
  status: "identified",
  mitigation_plan: "",
  roadmap_ids: [],
  backlog_ids: [],
  roadmap_input: "",
  backlog_input: "",
};

function resolveRiskErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError) {
    if (error.status === 401) return t("risks.err_auth");
    if (error.status >= 500) return t("risks.err_load_server");
    return error.message || t("risks.err_generic");
  }
  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();
    if (
      normalized.includes("unauthorized") ||
      normalized.includes("not authenticated") ||
      normalized.includes("forbidden")
    ) {
      return t("risks.err_auth");
    }
    if (normalized.includes("internal server error")) {
      return t("risks.err_load_server");
    }
    return error.message || t("risks.err_generic");
  }
  return t("risks.err_generic");
}

function FilterableMultiSelect({
  label,
  placeholder,
  value,
  options,
  selectedIds,
  noneLabel,
  countLabel,
  selectedLabel,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  selectedIds: string[];
  noneLabel: string;
  countLabel: string;
  selectedLabel: string;
  onInputChange: (value: string) => void;
  onAdd: (option: SelectOption) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const selected = new Set(selectedIds);
    const term = value.trim().toLowerCase();
    return options.filter((option) => {
      if (selected.has(option.id)) return false;
      if (!term) return true;
      const haystack = `${option.label} ${option.searchText ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [options, selectedIds, value]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id)),
    [options, selectedIds]
  );

  return (
    <div className="mod-field">
      <label className="mod-field__label">{label}</label>
      <div
        style={{ position: "relative" }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <div
          className="mod-input"
          style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 32, cursor: "text", position: "relative" }}
          onClick={() => setOpen(true)}
        >
          <input
            value={value}
            onChange={(e) => {
              onInputChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              font: "inherit",
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "none",
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#8db4c9",
              cursor: "pointer",
              padding: 0,
              fontSize: 12,
            }}
            aria-label="toggle options"
          >
            ▼
          </button>
        </div>

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
              zIndex: 5,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "10px 12px", color: "#7899b0", fontSize: 11 }}>{noneLabel}</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onAdd(option);
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
                    letterSpacing: 1,
                    lineHeight: 1.35,
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                border: "1px solid rgba(0,212,255,.28)",
                background: "rgba(0,212,255,.08)",
                color: "#d9f3ff",
                fontSize: 10,
              }}
            >
              {option.label}
              <button
                type="button"
                onClick={() => onRemove(option.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9cc8db",
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label={`remove ${option.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 4, fontSize: 10, color: "#6f94aa" }}>
        {countLabel}
        {selectedOptions.length > 0 ? ` • ${selectedLabel}: ${selectedOptions.length}` : ""}
      </div>
    </div>
  );
}

export default function RisksPage() {
  const { t } = useTranslation();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<RiskForm>({ ...EMPTY });
  const [editing, setEditing] = useState<Risk | null>(null);
  const [saving, setSaving] = useState(false);
  const [roadmapOptions, setRoadmapOptions] = useState<RoadmapItem[]>([]);
  const [backlogOptions, setBacklogOptions] = useState<BacklogItem[]>([]);
  const [page, setPage] = useState(1);
  const [titleFilter, setTitleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [mappedRoadmapFilter, setMappedRoadmapFilter] = useState("");
  const [mappedBacklogFilter, setMappedBacklogFilter] = useState("");
  const SIZE = 10;

  const load = async (pid = productId) => {
    setLoading(true);
    setError("");
    try {
      const qs = `page=1&size=500${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<Risk>>(`/risks?${qs}`);
      setItems(r.items);
    } catch (e: unknown) {
      setError(resolveRiskErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  const loadAssociations = async (pid = productId) => {
    if (!pid) {
      setRoadmapOptions([]);
      setBacklogOptions([]);
      return;
    }
    try {
      const [roadmapRes, backlogRes] = await Promise.all([
        apiGet<Paginated<RoadmapItem>>(`/roadmap?page=1&size=200&product_id=${pid}`),
        apiGet<BacklogItem[]>(`/roadmap/backlog-options?product_id=${pid}`),
      ]);
      setRoadmapOptions(roadmapRes.items ?? []);
      setBacklogOptions(backlogRes ?? []);
    } catch {
      setRoadmapOptions([]);
      setBacklogOptions([]);
    }
  };

  useEffect(() => {
    load(productId);
    loadAssociations(productId);
    setPage(1);
  }, [productId]);

  useEffect(() => {
    setPage(1);
  }, [titleFilter, statusFilter, levelFilter, mappedRoadmapFilter, mappedBacklogFilter]);

  const roadmapDisplayOptions = useMemo(
    () => roadmapOptions.map((option) => ({ id: option.id, label: option.title })),
    [roadmapOptions]
  );

  const backlogDisplayOptions = useMemo(
    () =>
      backlogOptions.map((option) => ({
        id: String(option.item_id),
        label: `#${option.item_id} — ${option.title}${option.ado_id ? ` · ADO ${option.ado_id}` : ""}`,
        searchText: `${option.ado_id ?? ""} ${option.title} ${option.item_id}`,
      })),
    [backlogOptions]
  );

  const mappedRoadmapFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((risk) => {
      risk.links
        ?.filter((link) => link.entity_type === "roadmap")
        .forEach((link) => map.set(link.entity_id, link.label || link.entity_id));
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const mappedBacklogFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((risk) => {
      risk.links
        ?.filter((link) => link.entity_type === "backlog")
        .forEach((link) => map.set(link.entity_id, link.label || link.entity_id));
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const handleProductChange = (id: string) => {
    localStorage.setItem("pl_product", id);
    setProductId(id);
  };

  const openCreate = () => {
    setForm({ ...EMPTY });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (item: Risk) => {
    const roadmapIds = item.links?.filter((link) => link.entity_type === "roadmap").map((link) => link.entity_id) ?? [];
    const backlogIds = item.links?.filter((link) => link.entity_type === "backlog").map((link) => link.entity_id) ?? [];
    setForm({
      title: item.title,
      description: item.description ?? "",
      probability: item.probability,
      impact: item.impact,
      risk_score: item.risk_score,
      status: item.status,
      mitigation_plan: item.mitigation_plan ?? "",
      roadmap_ids: roadmapIds,
      backlog_ids: backlogIds,
      roadmap_input: "",
      backlog_input: "",
    });
    setEditing(item);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  const updateRisk = (field: "probability" | "impact", val: number) => {
    const safeVal = Number.isFinite(val) ? val : 1;
    setForm((f) => {
      const p = field === "probability" ? safeVal : f.probability;
      const i = field === "impact" ? safeVal : f.impact;
      return { ...f, [field]: safeVal, risk_score: p * i };
    });
  };

  const buildLinks = (): RiskLink[] => {
    const links: RiskLink[] = [];
    form.roadmap_ids.forEach((id) => links.push({ entity_type: "roadmap", entity_id: id }));
    form.backlog_ids.forEach((id) => links.push({ entity_type: "backlog", entity_id: id }));
    return links;
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") {
      setError(t("risks.err_select_product"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        probability: Number(form.probability),
        impact: Number(form.impact),
        risk_score: Number(form.probability) * Number(form.impact),
        status: form.status,
        mitigation_plan: form.mitigation_plan || null,
        links: buildLinks(),
      };
      if (modal === "create") {
        await apiPost("/risks", { ...body, product_id: productId });
      } else if (editing) {
        await apiPatch(`/risks/${editing.id}`, { ...body, product_id: editing.product_id || productId });
      }
      closeModal();
      load(productId);
    } catch (e: unknown) {
      setError(resolveRiskErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("risks.confirm_delete"))) return;
    try {
      await apiDelete(`/risks/${id}`);
      load(productId);
    } catch (e: unknown) {
      setError(resolveRiskErrorMessage(e, t));
    }
  };

  const scoreClass = (s: number) => (s >= 15 ? "risk-score--high" : s >= 6 ? "risk-score--medium" : "risk-score--low");
  const scoreLevel = (s: number) => (s >= 15 ? "high" : s >= 6 ? "medium" : "low");
  const scoreLabel = (s: number) =>
    s >= 15 ? t("risks.level_high") : s >= 6 ? t("risks.level_medium") : t("risks.level_low");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const titleMatch =
        !titleFilter.trim() ||
        item.title.toLowerCase().includes(titleFilter.trim().toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(titleFilter.trim().toLowerCase());

      const statusMatch = !statusFilter || item.status === statusFilter;
      const levelMatch = !levelFilter || scoreLevel(item.risk_score) === levelFilter;

      const roadmapLinks = item.links?.filter((link) => link.entity_type === "roadmap") ?? [];
      const backlogLinks = item.links?.filter((link) => link.entity_type === "backlog") ?? [];

      const roadmapMatch =
        !mappedRoadmapFilter ||
        (mappedRoadmapFilter === "__unmapped__"
          ? roadmapLinks.length === 0
          : roadmapLinks.some((link) => link.entity_id === mappedRoadmapFilter));

      const backlogMatch =
        !mappedBacklogFilter ||
        (mappedBacklogFilter === "__unmapped__"
          ? backlogLinks.length === 0
          : backlogLinks.some((link) => link.entity_id === mappedBacklogFilter));

      return titleMatch && statusMatch && levelMatch && roadmapMatch && backlogMatch;
    });
  }, [items, titleFilter, statusFilter, levelFilter, mappedRoadmapFilter, mappedBacklogFilter]);

  const total = filteredItems.length;
  const pagedItems = useMemo(() => {
    const start = (page - 1) * SIZE;
    return filteredItems.slice(start, start + SIZE);
  }, [filteredItems, page]);

  const mappingCountLabel = (item: Risk) =>
    t("risks.mapping_count", { count: item.links?.length ?? 0 });

  return (
    <ModuleLayout moduleIcon="△" moduleName="RISK MATRIX" moduleAccent="MATRIX" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("risks.eyebrow")}</span>
          <h1 className="mod-header__title">
            {t("risks.title")} <span>{t("risks.title_accent")}</span>
          </h1>
          <p className="mod-header__meta">{t("risks.meta", { count: total })}</p>
        </div>
        <button className="btn-add" onClick={openCreate}>
          {t("risks.btn_new")}
        </button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div className="mod-table-wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr repeat(4, 1fr)",
            gap: 12,
            padding: "0 0 16px",
          }}
        >
          <input
            className="mod-input"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            placeholder={t("risks.filter_title")}
          />
          <select className="mod-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t("risks.filter_all_status")}</option>
            <option value="identified">{t("risks.status_identified")}</option>
            <option value="mitigated">{t("risks.status_mitigated")}</option>
            <option value="accepted">{t("risks.status_accepted")}</option>
            <option value="closed">{t("risks.status_closed")}</option>
          </select>
          <select className="mod-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">{t("risks.filter_all_levels")}</option>
            <option value="high">{t("risks.level_high")}</option>
            <option value="medium">{t("risks.level_medium")}</option>
            <option value="low">{t("risks.level_low")}</option>
          </select>
          <select className="mod-select" value={mappedRoadmapFilter} onChange={(e) => setMappedRoadmapFilter(e.target.value)}>
            <option value="">{t("risks.filter_mapped_roadmap")}</option>
            <option value="__unmapped__">{t("risks.filter_unmapped_roadmap")}</option>
            {mappedRoadmapFilterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="mod-select" value={mappedBacklogFilter} onChange={(e) => setMappedBacklogFilter(e.target.value)}>
            <option value="">{t("risks.filter_mapped_backlog")}</option>
            <option value="__unmapped__">{t("risks.filter_unmapped_backlog")}</option>
            {mappedBacklogFilterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="mod-loading">{t("risks.loading")}</div>
        ) : pagedItems.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">△</div>
            <div className="mod-empty__title">{t("risks.empty_title")}</div>
            <div className="mod-empty__sub">{t("risks.empty_sub")}</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>{t("risks.col_title")}</th>
                <th>{t("risks.col_status")}</th>
                <th>{t("risks.col_level")}</th>
                <th>{t("risks.col_mapping")}</th>
                <th>{t("risks.col_mitigation")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description && (
                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                        {item.description.slice(0, 60)}…
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge--${item.status}`}>{item.status.toUpperCase()}</span>
                  </td>
                  <td>
                    <span className={`badge ${scoreClass(item.risk_score)}`}>{scoreLabel(item.risk_score)}</span>
                  </td>
                  <td style={{ color: "#7899b0" }}>{mappingCountLabel(item)}</td>
                  <td
                    style={{
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#7899b0",
                    }}
                  >
                    {item.mitigation_plan?.slice(0, 60) || "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => openEdit(item)}>
                        {t("risks.btn_edit")}
                      </button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>
                        {t("risks.btn_del")}
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
              {(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} {t("risks.pagination_of")} {total}
            </span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                {t("risks.btn_prev")}
              </button>
              <button className="btn-page" disabled={page * SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                {t("risks.btn_next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="mod-overlay">
          <div className="mod-modal">
            <div
              className="mod-modal__header"
              style={{ position: "sticky", top: 0, zIndex: 3, background: "#0b1323", borderBottom: "1px solid rgba(0,212,255,.18)" }}
            >
              <div>
                <span className="mod-modal__eyebrow">{t("risks.modal_eyebrow")}</span>
                <h3 className="mod-modal__title">
                  {modal === "create" ? t("risks.modal_new") : t("risks.modal_edit")} <span>{t("risks.modal_title_accent")}</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">
                  {t("risks.field_title")} <span>*</span>
                </label>
                <input
                  className="mod-input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t("risks.placeholder_title")}
                />
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("risks.field_description")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("risks.placeholder_description")}
                />
              </div>

              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("risks.field_probability")}</label>
                  <input
                    className="mod-input"
                    type="number"
                    min="1"
                    max="5"
                    value={form.probability}
                    onChange={(e) => updateRisk("probability", Number(e.target.value))}
                  />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("risks.field_impact")}</label>
                  <input
                    className="mod-input"
                    type="number"
                    min="1"
                    max="5"
                    value={form.impact}
                    onChange={(e) => updateRisk("impact", Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ padding: "4px 0 12px", fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>
                {t("risks.score_label")}{" "}
                <span className={`score-chip ${scoreClass(form.probability * form.impact)}`}>{form.probability * form.impact}</span> —{" "}
                <span className={scoreClass(form.probability * form.impact)}>{scoreLabel(form.probability * form.impact)}</span>
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("risks.field_status")}</label>
                <select className="mod-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="identified">{t("risks.status_identified")}</option>
                  <option value="mitigated">{t("risks.status_mitigated")}</option>
                  <option value="accepted">{t("risks.status_accepted")}</option>
                  <option value="closed">{t("risks.status_closed")}</option>
                </select>
              </div>

              <FilterableMultiSelect
                label={t("risks.field_roadmap")}
                placeholder={t("risks.placeholder_filter_roadmap")}
                value={form.roadmap_input}
                options={roadmapDisplayOptions}
                selectedIds={form.roadmap_ids}
                noneLabel={t("risks.select_none")}
                countLabel={t("risks.roadmap_count", { count: roadmapDisplayOptions.length })}
                selectedLabel={t("risks.field_roadmap")}
                onInputChange={(value) => setForm((f) => ({ ...f, roadmap_input: value }))}
                onAdd={(option) =>
                  setForm((f) => ({
                    ...f,
                    roadmap_ids: [...f.roadmap_ids, option.id],
                    roadmap_input: "",
                  }))
                }
                onRemove={(id) =>
                  setForm((f) => ({
                    ...f,
                    roadmap_ids: f.roadmap_ids.filter((itemId) => itemId !== id),
                  }))
                }
              />

              <FilterableMultiSelect
                label={t("risks.field_backlog")}
                placeholder={t("risks.placeholder_filter_backlog")}
                value={form.backlog_input}
                options={backlogDisplayOptions}
                selectedIds={form.backlog_ids}
                noneLabel={t("risks.select_none")}
                countLabel={t("risks.backlog_count", { count: backlogDisplayOptions.length })}
                selectedLabel={t("risks.field_backlog")}
                onInputChange={(value) => setForm((f) => ({ ...f, backlog_input: value }))}
                onAdd={(option) =>
                  setForm((f) => ({
                    ...f,
                    backlog_ids: [...f.backlog_ids, option.id],
                    backlog_input: "",
                  }))
                }
                onRemove={(id) =>
                  setForm((f) => ({
                    ...f,
                    backlog_ids: f.backlog_ids.filter((itemId) => itemId !== id),
                  }))
                }
              />

              <div className="mod-field">
                <label className="mod-field__label">{t("risks.field_mitigation")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.mitigation_plan}
                  onChange={(e) => setForm((f) => ({ ...f, mitigation_plan: e.target.value }))}
                  placeholder={t("risks.placeholder_mitigation")}
                />
              </div>
            </div>

            {modal === "edit" && editing && (
              <div style={{ padding: "0 16px 8px" }}>
                <RaciPanel objectType="RISK" objectId={Number(editing.id)} productId={productId} />
              </div>
            )}

            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>
                {t("risks.btn_cancel")}
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? t("risks.btn_saving") : t("risks.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
