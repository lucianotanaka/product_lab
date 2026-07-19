import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface ItemType {
  item_type_id:  number;
  name:          string;
  display_order: number;
  is_active:     boolean;
}

interface BacklogItem {
  item_id:             number;
  product_id?:         number;
  feature_id?:         number;
  sprint_id?:          number;
  ado_id?:             string;
  item_type_id?:       number;
  title:               string;
  description?:        string;
  current_status:      string;
  business_value?:     string;
  acceptance_criteria?:string;
  story_points?:       number;
  priority:            number;
  created_at:          string;
  updated_at:          string;
  completed_at?:       string;
}

const EMPTY = {
  title: "", description: "", item_type_id: "", current_status: "open",
  ado_id: "", story_points: "", priority: "3",
  business_value: "", acceptance_criteria: "",
};

const STATUSES = ["open", "in_progress", "done", "blocked", "cancelled"];

const statusColor = (s: string) =>
  ({ open: "#00d4ff", in_progress: "#ff9900", done: "#00ff88",
     blocked: "#ff6b6b", cancelled: "#7899b0" }[s] ?? "#7899b0");

const priorityLabel = (p: number) =>
  ({ 1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW", 5: "MINIMAL" }[p] ?? String(p));

const priorityColor = (p: number) =>
  ({ 1: "#ff6b6b", 2: "#ff9900", 3: "#00d4ff", 4: "#00e5cc", 5: "#7899b0" }[p] ?? "#7899b0");

export default function BacklogPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items,   setItems]   = useState<BacklogItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [modal,   setModal]   = useState<"create" | "edit" | null>(null);
  const [form,    setForm]    = useState({ ...EMPTY });
  const [editing, setEditing] = useState<BacklogItem | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterTypeId,   setFilterTypeId]   = useState("");
  const [itemTypes,      setItemTypes]       = useState<ItemType[]>([]);

  const SIZE = 20;
  const pid  = productId ? parseInt(productId, 10) : undefined;

  useEffect(() => {
    apiGet<ItemType[]>("/backlog/types/list").then(setItemTypes).catch(() => {});
  }, []);

  const typeLabel = (id?: number) =>
    itemTypes.find(t => t.item_type_id === id)?.name ?? "—";

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      let qs = `page=${p}&size=${SIZE}`;
      if (pid)            qs += `&product_id=${pid}`;
      if (filterStatus)   qs += `&current_status=${filterStatus}`;
      if (filterTypeId)   qs += `&item_type_id=${filterTypeId}`;
      const r = await apiGet<Paginated<BacklogItem>>(`/backlog?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [productId, filterStatus, filterTypeId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit   = (item: BacklogItem) => {
    setForm({
      title: item.title, description: item.description ?? "",
      item_type_id: item.item_type_id ? String(item.item_type_id) : "",
      current_status: item.current_status,
      ado_id: item.ado_id ?? "", story_points: String(item.story_points ?? ""),
      priority: String(item.priority), business_value: item.business_value ?? "",
      acceptance_criteria: item.acceptance_criteria ?? "",
    });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        product_id:   pid ?? null,
        item_type_id: form.item_type_id ? parseInt(form.item_type_id, 10) : null,
        story_points: form.story_points ? parseInt(form.story_points, 10) : null,
        priority:     parseInt(form.priority, 10),
      };
      if (modal === "create") await apiPost("/backlog", body);
      else if (editing)       await apiPatch(`/backlog/${editing.item_id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir item do backlog?")) return;
    try { await apiDelete(`/backlog/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao excluir"); }
  };

  return (
    <ModuleLayout moduleIcon="◫" moduleName="BACKLOG ITEMS" moduleAccent="ITEMS"
      selectedProductId={productId} onProductChange={handleProductChange}>

      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// GESTÃO DE BACKLOG //</span>
          <h1 className="mod-header__title">BACKLOG <span>ITEMS</span></h1>
          <p className="mod-header__meta">{total} item(ns) no backlog</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO ITEM</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="mod-select" style={{ width: 160 }} value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">TODOS OS STATUS</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <select className="mod-select" style={{ width: 160 }} value={filterTypeId}
          onChange={e => setFilterTypeId(e.target.value)}>
          <option value="">TODOS OS TIPOS</option>
          {itemTypes.map(t => <option key={t.item_type_id} value={t.item_type_id}>{t.name.toUpperCase()}</option>)}
        </select>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div className="mod-table-wrap">
        {loading ? (
          <div className="mod-loading">CARREGANDO...</div>
        ) : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◫</div>
            <div className="mod-empty__title">BACKLOG VAZIO</div>
            <div className="mod-empty__sub">Adicione user stories, tasks e bugs</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>TÍTULO</th><th>TIPO</th><th>STATUS</th>
                <th>PRIORIDADE</th><th>SP</th><th>ADO</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.item_id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description && (
                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                        {item.description.slice(0, 70)}{item.description.length > 70 ? "…" : ""}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 10, letterSpacing: 1, color: "#00e5cc",
                      border: "1px solid rgba(0,229,204,0.3)", padding: "2px 6px" }}>
                      {typeLabel(item.item_type_id).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 10, letterSpacing: 1, color: statusColor(item.current_status),
                      border: `1px solid ${statusColor(item.current_status)}40`, padding: "2px 6px" }}>
                      {item.current_status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 10, color: priorityColor(item.priority), letterSpacing: 1 }}>
                      {priorityLabel(item.priority)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", color: "#c8d8e8" }}>
                    {item.story_points ?? "—"}
                  </td>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{item.ado_id || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => openEdit(item)}>EDITAR</button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.item_id)}>DEL</button>
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

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// BACKLOG //</span>
                <h3 className="mod-modal__title">{modal === "create" ? "NOVO" : "EDITAR"} <span>ITEM</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">TÍTULO <span>*</span></label>
                <input className="mod-input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Título do item" />
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">TIPO</label>
                  <select className="mod-select" value={form.item_type_id}
                    onChange={e => setForm(f => ({ ...f, item_type_id: e.target.value }))}>
                    <option value="">— SELECIONE —</option>
                    {itemTypes.map(t => <option key={t.item_type_id} value={t.item_type_id}>{t.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">STATUS</label>
                  <select className="mod-select" value={form.current_status}
                    onChange={e => setForm(f => ({ ...f, current_status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">PRIORIDADE (1–5)</label>
                  <select className="mod-select" value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {[1,2,3,4,5].map(p => <option key={p} value={p}>{p} — {priorityLabel(p)}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">STORY POINTS</label>
                  <input className="mod-input" type="number" min="0" value={form.story_points}
                    onChange={e => setForm(f => ({ ...f, story_points: e.target.value }))}
                    placeholder="Ex: 5" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">ADO ID</label>
                  <input className="mod-input" value={form.ado_id}
                    onChange={e => setForm(f => ({ ...f, ado_id: e.target.value }))}
                    placeholder="Ex: AB-1234" />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">DESCRIÇÃO</label>
                <textarea className="mod-textarea" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição do item..." />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">CRITÉRIOS DE ACEITE</label>
                <textarea className="mod-textarea" value={form.acceptance_criteria}
                  onChange={e => setForm(f => ({ ...f, acceptance_criteria: e.target.value }))}
                  placeholder="Dado... Quando... Então..." />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">VALOR DE NEGÓCIO</label>
                <textarea className="mod-textarea" value={form.business_value}
                  onChange={e => setForm(f => ({ ...f, business_value: e.target.value }))}
                  placeholder="Descreva o valor para o negócio..." />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>CANCELAR</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
