import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Product {
  product_id:    number;
  name:          string;
  description?:  string;
  status:        string;
  owner_user_id?: number;
  tags:          string[];
  created_at:    string;
}

const EMPTY = {
  name: "", description: "", status: "active", tags: [] as string[],
};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const SIZE = 20;

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      const r = await apiGet<Paginated<Product>>(`/products?page=${p}&size=${SIZE}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: Product) => {
    setForm({ name: item.name, description: item.description ?? "", status: item.status, tags: item.tags ?? [] });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, tags: typeof form.tags === "string" ? (form.tags as string).split(",").map((t) => t.trim()).filter(Boolean) : form.tags };
      if (modal === "create") await apiPost("/products", body);
      else if (editing) await apiPatch(`/products/${editing.product_id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir produto e todos os seus dados?")) return;
    try { await apiDelete(`/products/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao excluir"); }
  };

  return (
    <ModuleLayout moduleIcon="⬡" moduleName="GESTÃO DE PRODUTOS" moduleAccent="PRODUTOS" showProductSelector={false}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// MÓDULO DE PRODUTOS //</span>
          <h1 className="mod-header__title">GESTÃO DE <span>PRODUTOS</span></h1>
          <p className="mod-header__meta">{total} produto(s) cadastrado(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO PRODUTO</button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div className="mod-table-wrap">
        {loading ? (
          <div className="mod-loading">CARREGANDO...</div>
        ) : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">⬡</div>
            <div className="mod-empty__title">NENHUM PRODUTO</div>
            <div className="mod-empty__sub">Crie o primeiro produto para começar</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>NOME</th><th>STATUS</th><th>OWNER</th><th>TAGS</th><th>CRIADO EM</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product_id}>
                  <td><strong>{item.name}</strong>{item.description && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{item.description.slice(0, 60)}{item.description.length > 60 ? "…" : ""}</div>}</td>
                  <td><span className={`badge badge--${item.status}`}>{item.status.toUpperCase()}</span></td>
                  <td>{item.owner_user_id ?? "—"}</td>
                  <td>{item.tags?.map((t) => <span key={t} className="tag">{t}</span>)}</td>
                  <td style={{ color: "#7899b0" }}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => openEdit(item)}>EDITAR</button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.product_id)}>DEL</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > SIZE && (
          <div className="mod-pagination">
            <span>{(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} de {total}</span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page === 1} onClick={() => setPage(p => p - 1)}>ANTERIOR</button>
              <button className="btn-page" disabled={page * SIZE >= total} onClick={() => setPage(p => p + 1)}>PRÓXIMO</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// PRODUTO //</span>
                <h3 className="mod-modal__title">{modal === "create" ? "NOVO" : "EDITAR"} <span>PRODUTO</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">NOME <span>*</span></label>
                <input className="mod-input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do produto" />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">DESCRIÇÃO</label>
                <textarea className="mod-textarea" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do produto..." />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">STATUS</label>
                <select className="mod-select" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">ACTIVE</option>
                  <option value="draft">DRAFT</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">TAGS (separadas por vírgula)</label>
                <input className="mod-input" value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value as unknown as string[] }))} placeholder="mobile, b2b, fintech" />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>CANCELAR</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
