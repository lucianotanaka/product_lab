import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Article {
  article_id:  number;
  product_id?: number;
  title:       string;
  category?:   string;
  content?:    string;
  status:      string;
  created_by?: string;
  created_at:  string;
  updated_at:  string;
}

interface Reference {
  reference_id:     number;
  article_id:       number;
  reference_type:   string;
  reference_id_ext: number;
  created_at:       string;
}

const EMPTY = { title: "", category: "", content: "", status: "active", created_by: "" };

const REFERENCE_TYPES = [
  "DECISION", "RISK", "VPC", "STAKEHOLDER", "PRODUCT",
  "FEATURE", "BACKLOG_ITEM", "ROADMAP_ITEM", "SPRINT",
];

const STATUS_OPTIONS = ["active", "draft", "archived", "review"];

const statusColor = (s: string): string =>
  ({ active: "#00ff88", draft: "#00d4ff", archived: "#7899b0", review: "#ff9900" }[s] ?? "#7899b0");

export default function KnowledgePage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items,     setItems]     = useState<Article[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [modal,     setModal]     = useState<"create" | "edit" | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY });
  const [editing,   setEditing]   = useState<Article | null>(null);
  const [saving,    setSaving]    = useState(false);

  const [refArticle, setRefArticle] = useState<Article | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [refType,    setRefType]    = useState(REFERENCE_TYPES[0]);
  const [refExtId,   setRefExtId]   = useState("");
  const [refSaving,  setRefSaving]  = useState(false);

  const SIZE = 20;
  const pid  = productId ? parseInt(productId, 10) : undefined;

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<Article>>(`/knowledge?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao carregar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [productId]);
  useEffect(() => { load(); },             [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit   = (item: Article) => {
    setForm({ title: item.title, category: item.category ?? "", content: item.content ?? "",
              status: item.status, created_by: item.created_by ?? "" });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, product_id: pid ?? null };
      if (modal === "create") await apiPost("/knowledge", body);
      else if (editing)       await apiPatch(`/knowledge/${editing.article_id}`, form);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir artigo e suas referências?")) return;
    try { await apiDelete(`/knowledge/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao excluir"); }
  };

  const openRefs = async (article: Article) => {
    setRefArticle(article); setRefType(REFERENCE_TYPES[0]); setRefExtId("");
    try {
      const refs = await apiGet<Reference[]>(`/knowledge/${article.article_id}/references`);
      setReferences(refs);
    } catch { setReferences([]); }
  };
  const closeRefs = () => { setRefArticle(null); setReferences([]); };

  const addReference = async () => {
    if (!refArticle || !refExtId.trim()) return;
    setRefSaving(true);
    try {
      await apiPost(`/knowledge/${refArticle.article_id}/references`, {
        reference_type: refType,
        reference_id_ext: parseInt(refExtId, 10),
      });
      const refs = await apiGet<Reference[]>(`/knowledge/${refArticle.article_id}/references`);
      setReferences(refs); setRefExtId("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setRefSaving(false); }
  };

  const removeReference = async (rid: number) => {
    if (!refArticle) return;
    try {
      await apiDelete(`/knowledge/${refArticle.article_id}/references/${rid}`);
      setReferences(r => r.filter(x => x.reference_id !== rid));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <ModuleLayout moduleIcon="◈" moduleName="KNOWLEDGE BASE" moduleAccent="BASE"
      selectedProductId={productId} onProductChange={handleProductChange}>

      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// BASE DE CONHECIMENTO //</span>
          <h1 className="mod-header__title">KNOWLEDGE <span>BASE</span></h1>
          <p className="mod-header__meta">{total} artigo(s) cadastrado(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO ARTIGO</button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div className="mod-table-wrap">
        {loading ? (
          <div className="mod-loading">CARREGANDO...</div>
        ) : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◈</div>
            <div className="mod-empty__title">BASE VAZIA</div>
            <div className="mod-empty__sub">Adicione frameworks, ADRs e artefatos de conhecimento</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>TÍTULO</th><th>CATEGORIA</th><th>STATUS</th>
                <th>AUTOR</th><th>ATUALIZADO</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.article_id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.content && (
                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                        {item.content.slice(0, 80)}{item.content.length > 80 ? "…" : ""}
                      </div>
                    )}
                  </td>
                  <td>{item.category ? <span className="badge badge--active">{item.category}</span> : "—"}</td>
                  <td>
                    <span style={{ fontSize: 10, letterSpacing: 1, color: statusColor(item.status),
                      border: `1px solid ${statusColor(item.status)}40`, padding: "2px 6px" }}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: "#7899b0" }}>{item.created_by || "—"}</td>
                  <td style={{ color: "#7899b0" }}>{new Date(item.updated_at).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => openRefs(item)} title="Referências cruzadas">REF</button>
                      <button className="btn-icon" onClick={() => openEdit(item)}>EDITAR</button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.article_id)}>DEL</button>
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

      {/* ── Article Modal ── */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// KNOWLEDGE //</span>
                <h3 className="mod-modal__title">{modal === "create" ? "NOVO" : "EDITAR"} <span>ARTIGO</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">TÍTULO <span>*</span></label>
                <input className="mod-input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Título do artigo" />
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">CATEGORIA</label>
                  <input className="mod-input" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="ADR, Framework, Prática..." />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">STATUS</label>
                  <select className="mod-select" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">AUTOR</label>
                <input className="mod-input" value={form.created_by}
                  onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                  placeholder="Nome do autor" />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">CONTEÚDO</label>
                <textarea className="mod-textarea" style={{ minHeight: 140 }} value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Descreva o framework, ADR, prática ou artefato..." />
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

      {/* ── References Panel ── */}
      {refArticle && (
        <div className="mod-overlay" onClick={closeRefs}>
          <div className="mod-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// GRAFO DE CONTEXTO //</span>
                <h3 className="mod-modal__title">REFERÊNCIAS <span>CRUZADAS</span></h3>
                <div style={{ fontSize: 10, color: "#7899b0", marginTop: 4, letterSpacing: 1 }}>
                  {refArticle.title}
                </div>
              </div>
              <button className="mod-modal__close" onClick={closeRefs}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row" style={{ alignItems: "flex-end", gap: 8 }}>
                <div className="mod-field" style={{ flex: 2 }}>
                  <label className="mod-field__label">TIPO</label>
                  <select className="mod-select" value={refType}
                    onChange={e => setRefType(e.target.value)}>
                    {REFERENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="mod-field" style={{ flex: 1 }}>
                  <label className="mod-field__label">ID</label>
                  <input className="mod-input" type="number" value={refExtId}
                    onChange={e => setRefExtId(e.target.value)} placeholder="Ex: 42" />
                </div>
                <button className="btn-save" style={{ padding: "8px 14px", whiteSpace: "nowrap" }}
                  onClick={addReference} disabled={refSaving || !refExtId.trim()}>
                  + ADD
                </button>
              </div>

              {references.length === 0 ? (
                <div style={{ color: "#7899b0", fontSize: 12, padding: "12px 0", textAlign: "center", letterSpacing: 1 }}>
                  NENHUMA REFERÊNCIA CADASTRADA
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {references.map(ref => (
                    <div key={ref.reference_id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "6px 10px", background: "rgba(0,20,40,0.6)",
                      border: "1px solid rgba(0,212,255,0.12)", fontSize: 11,
                    }}>
                      <span>
                        <span style={{ color: "#00d4ff", marginRight: 8, letterSpacing: 1 }}>
                          {ref.reference_type}
                        </span>
                        <span style={{ color: "#c8d8e8" }}>#{ref.reference_id_ext}</span>
                      </span>
                      <button className="btn-icon btn-icon--danger" style={{ padding: "2px 8px", fontSize: 10 }}
                        onClick={() => removeReference(ref.reference_id)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeRefs}>FECHAR</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
