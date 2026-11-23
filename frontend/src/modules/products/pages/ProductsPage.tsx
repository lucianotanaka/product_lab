import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Product {
  product_id:     number;
  name:           string;
  description?:   string;
  status:         string;
  owner_user_id?: number;
  company_id?:    number;
  tags:           string[];
  created_at:     string;
}

interface UserOption {
  user_id:        number;
  user_full_name: string;
  user_email:     string;
}

interface CompanyOption {
  id:           number;
  company_name: string;
}

const EMPTY = {
  name:          "",
  description:   "",
  status:        "active",
  tags:          [] as string[],
  owner_user_id: null as number | null,
  company_id:    null as number | null,
};

export default function ProductsPage() {
  const { t } = useTranslation();

  const [items,     setItems]     = useState<Product[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [modal,     setModal]     = useState<"create" | "edit" | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY });
  const [editing,   setEditing]   = useState<Product | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [users,     setUsers]     = useState<UserOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const SIZE = 20;

  /* ── Load products ─────────────────────────────────────────────────── */
  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      const r = await apiGet<Paginated<Product>>(`/products?page=${p}&size=${SIZE}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("products.err_load"));
    } finally { setLoading(false); }
  };

  /* ── Load select options (users + companies) ─────────────────────── */
  const loadOptions = async () => {
    const [usersRes, companiesRes] = await Promise.allSettled([
      apiGet<UserOption[]>("/users"),
      apiGet<CompanyOption[]>("/companies/mine"),
    ]);
    if (usersRes.status === "fulfilled") setUsers(usersRes.value ?? []);
    if (companiesRes.status === "fulfilled") setCompanies(companiesRes.value ?? []);
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { loadOptions(); }, []);

  /* ── Helpers to resolve names ────────────────────────────────────── */
  const resolveOwner = (id?: number | null) => {
    if (!id) return "—";
    const u = users.find((u) => u.user_id === id);
    return u ? u.user_full_name : String(id);
  };

  const resolveCompany = (id?: number | null) => {
    if (!id) return "—";
    const c = companies.find((c) => c.id === id);
    return c ? c.company_name : String(id);
  };

  /* ── Modal handlers ──────────────────────────────────────────────── */
  const openCreate = () => {
    setForm({ ...EMPTY });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (item: Product) => {
    setForm({
      name:          item.name,
      description:   item.description ?? "",
      status:        item.status,
      tags:          item.tags ?? [],
      owner_user_id: item.owner_user_id ?? null,
      company_id:    item.company_id    ?? null,
    });
    setEditing(item);
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        tags: typeof form.tags === "string"
          ? (form.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
          : form.tags,
        owner_user_id: form.owner_user_id || null,
        company_id:    form.company_id    || null,
      };
      if (modal === "create") await apiPost("/products", body);
      else if (editing)       await apiPatch(`/products/${editing.product_id}`, body);
      closeModal();
      load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("products.err_save"));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("products.confirm_delete"))) return;
    try {
      await apiDelete(`/products/${id}`);
      load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("products.err_delete"));
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <ModuleLayout
      moduleIcon="⬡"
      moduleName={`${t("products.nav_title_prefix")} ${t("products.nav_title_accent")}`}
      moduleAccent={t("products.nav_title_accent")}
      showProductSelector={false}
    >
      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("products.eyebrow")}</span>
          <h1 className="mod-header__title">
            {t("products.title_prefix")} <span>{t("products.title_accent")}</span>
          </h1>
          <p className="mod-header__meta">{t("products.meta", { count: total })}</p>
        </div>
        <button className="btn-add" onClick={openCreate}>{t("products.btn_new")}</button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      {/* Table */}
      <div className="mod-table-wrap">
        {loading ? (
          <div className="mod-loading">{t("products.loading")}</div>
        ) : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">⬡</div>
            <div className="mod-empty__title">{t("products.empty_title")}</div>
            <div className="mod-empty__sub">{t("products.empty_sub")}</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>{t("products.col_name")}</th>
                <th>{t("products.col_status")}</th>
                <th>{t("products.col_owner")}</th>
                <th>{t("products.col_company")}</th>
                <th>{t("products.col_tags")}</th>
                <th>{t("products.col_created")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product_id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description && (
                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                        {item.description.slice(0, 60)}{item.description.length > 60 ? "…" : ""}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge--${item.status}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "#7899b0" }}>{resolveOwner(item.owner_user_id)}</td>
                  <td style={{ color: "#7899b0" }}>{resolveCompany(item.company_id)}</td>
                  <td>{item.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}</td>
                  <td style={{ color: "#7899b0" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => openEdit(item)}>
                        {t("products.btn_edit")}
                      </button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.product_id)}>
                        {t("products.btn_del")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > SIZE && (
          <div className="mod-pagination">
            <span>{(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} / {total}</span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                {t("products.btn_prev")}
              </button>
              <button className="btn-page" disabled={page * SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                {t("products.btn_next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// {t("products.modal_subtitle")} //</span>
                <h3 className="mod-modal__title">
                  {modal === "create" ? t("products.modal_new") : t("products.modal_edit")}{" "}
                  <span>{t("products.modal_subtitle")}</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>

            {/* Modal body */}
            <div className="mod-modal__body">

              {/* Name */}
              <div className="mod-field">
                <label className="mod-field__label">{t("products.field_name")} <span>*</span></label>
                <input
                  className="mod-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t("products.placeholder_name")}
                />
              </div>

              {/* Description */}
              <div className="mod-field">
                <label className="mod-field__label">{t("products.field_description")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("products.placeholder_description")}
                />
              </div>

              {/* Status */}
              <div className="mod-field">
                <label className="mod-field__label">{t("products.field_status")}</label>
                <select
                  className="mod-select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">{t("products.status_active")}</option>
                  <option value="draft">{t("products.status_draft")}</option>
                  <option value="archived">{t("products.status_archived")}</option>
                </select>
              </div>

              {/* Owner */}
              <div className="mod-field">
                <label className="mod-field__label">{t("products.field_owner")}</label>
                <select
                  className="mod-select"
                  value={form.owner_user_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      owner_user_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">{t("products.select_owner_none")}</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_full_name} ({u.user_email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div className="mod-field">
                <label className="mod-field__label">{t("products.field_company")}</label>
                <select
                  className="mod-select"
                  value={form.company_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      company_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">{t("products.select_company_none")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div className="mod-field">
                <label className="mod-field__label">{t("products.field_tags")}</label>
                <input
                  className="mod-input"
                  value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value as unknown as string[] }))
                  }
                  placeholder={t("products.placeholder_tags")}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>
                {t("products.btn_cancel")}
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
              >
                {saving ? t("products.btn_saving") : t("products.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
