import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Decision {
  id: string; product_id: string; title: string;
  context?: string; decision?: string; consequences?: string;
  status: string; tags: string[]; created_at: string;
}
const EMPTY = { title: "", context: "", decision: "", consequences: "", status: "proposed", tags: [] as string[] };

export default function DecisionsPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<Decision[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [modal, setModal] = useState<"create"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY }); const [editing, setEditing] = useState<Decision|null>(null);
  const [saving, setSaving] = useState(false); const SIZE = 20;

  const load = async (p = page, pid = productId) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<Decision>>(`/decisions?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: Decision) => { setForm({ title: item.title, context: item.context ?? "", decision: item.decision ?? "", consequences: item.consequences ?? "", status: item.status, tags: item.tags }); setEditing(item); setModal("edit"); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") { setError("Selecione um produto"); return; }
    setSaving(true);
    try {
      const tags = typeof form.tags === "string" ? (form.tags as unknown as string).split(",").map(t => t.trim()).filter(Boolean) : form.tags;
      if (modal === "create") await apiPost("/decisions", { ...form, tags, product_id: productId });
      else if (editing) await apiPatch(`/decisions/${editing.id}`, { ...form, tags });
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir decisão?")) return;
    try { await apiDelete(`/decisions/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <ModuleLayout moduleIcon="◎" moduleName="REGISTRO DE DECISIONS" moduleAccent="DECISIONS" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// MÓDULO DE DECISÕES //</span>
          <h1 className="mod-header__title">REGISTRO DE <span>DECISIONS</span></h1>
          <p className="mod-header__meta">{total} decisão(ões) registrada(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVA DECISÃO</button>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◎</div>
            <div className="mod-empty__title">NENHUMA DECISÃO</div>
            <div className="mod-empty__sub">{productId ? "Nenhuma decisão neste produto" : "Selecione um produto ou crie a primeira decisão"}</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead><tr><th>TÍTULO</th><th>STATUS</th><th>DECISÃO</th><th>TAGS</th><th>DATA</th><th></th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong>{item.context && <div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{item.context.slice(0,60)}…</div>}</td>
                  <td><span className={`badge badge--${item.status}`}>{item.status.toUpperCase()}</span></td>
                  <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.decision?.slice(0,80) || "—"}</td>
                  <td>{item.tags?.map(t => <span key={t} className="tag">{t}</span>)}</td>
                  <td style={{color:"#7899b0"}}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
                  <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(item)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>DEL</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > SIZE && <div className="mod-pagination"><span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} de {total}</span><div className="mod-pagination__btns"><button className="btn-page" disabled={page===1} onClick={() => setPage(p=>p-1)}>ANTERIOR</button><button className="btn-page" disabled={page*SIZE>=total} onClick={() => setPage(p=>p+1)}>PRÓXIMO</button></div></div>}
      </div>

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// DECISÃO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVA":"EDITAR"} <span>DECISÃO</span></h3></div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TÍTULO <span>*</span></label><input className="mod-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Título da decisão" /></div>
              <div className="mod-field"><label className="mod-field__label">CONTEXTO</label><textarea className="mod-textarea" value={form.context} onChange={e => setForm(f=>({...f,context:e.target.value}))} placeholder="Contexto e problema que motivou a decisão..." /></div>
              <div className="mod-field"><label className="mod-field__label">DECISÃO TOMADA</label><textarea className="mod-textarea" value={form.decision} onChange={e => setForm(f=>({...f,decision:e.target.value}))} placeholder="Qual foi a decisão e por quê..." /></div>
              <div className="mod-field"><label className="mod-field__label">CONSEQUÊNCIAS</label><textarea className="mod-textarea" value={form.consequences} onChange={e => setForm(f=>({...f,consequences:e.target.value}))} placeholder="Consequências esperadas e riscos..." /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}><option value="proposed">PROPOSED</option><option value="accepted">ACCEPTED</option><option value="closed">CLOSED</option><option value="deprecated">DEPRECATED</option></select></div>
                <div className="mod-field"><label className="mod-field__label">TAGS</label><input className="mod-input" value={Array.isArray(form.tags)?form.tags.join(", "):form.tags} onChange={e => setForm(f=>({...f,tags:e.target.value as unknown as string[]}))} placeholder="arch, ux, tech" /></div>
              </div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={closeModal}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
