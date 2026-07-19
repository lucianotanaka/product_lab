import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface ItemType { item_type_id: number; name: string; display_order: number; is_active: boolean; }
interface RoadmapItem { id: string; product_id: string; title: string; description?: string; item_type_id?: number; type?: string; status: string; start_date?: string; end_date?: string; quarter?: string; created_at: string; }
const EMPTY = { title: "", description: "", item_type_id: "", status: "planned", start_date: "", end_date: "", quarter: "" };

export default function RoadmapPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<RoadmapItem[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [modal, setModal] = useState<"create"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY }); const [editing, setEditing] = useState<RoadmapItem|null>(null);
  const [saving, setSaving] = useState(false);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const SIZE = 20;
  const typeLabel = (id?: number) => itemTypes.find(t => t.item_type_id === id)?.name ?? "—";
  useEffect(() => { apiGet<ItemType[]>("/backlog/types/list").then(setItemTypes).catch(() => {}); }, []);

  const load = async (p = page, pid = productId) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<RoadmapItem>>(`/roadmap?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: RoadmapItem) => {
    setForm({ title: item.title, description: item.description ?? "", item_type_id: item.item_type_id ? String(item.item_type_id) : "", status: item.status, start_date: item.start_date ? item.start_date.slice(0,10) : "", end_date: item.end_date ? item.end_date.slice(0,10) : "", quarter: item.quarter ?? "" });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") { setError("Selecione um produto"); return; }
    setSaving(true);
    try {
      const body = { ...form, item_type_id: form.item_type_id ? parseInt(form.item_type_id, 10) : null, start_date: form.start_date || null, end_date: form.end_date || null, quarter: form.quarter || null };
      if (modal === "create") await apiPost("/roadmap", { ...body, product_id: productId });
      else if (editing) await apiPatch(`/roadmap/${editing.id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir item do roadmap?")) return;
    try { await apiDelete(`/roadmap/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  return (
    <ModuleLayout moduleIcon="⬢" moduleName="PRODUCT ROADMAP" moduleAccent="ROADMAP" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// PLANEJAMENTO ESTRATÉGICO //</span>
          <h1 className="mod-header__title">PRODUCT <span>ROADMAP</span></h1>
          <p className="mod-header__meta">{total} iniciativa(s) planejada(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVA INICIATIVA</button>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? (
          <div className="mod-empty"><div className="mod-empty__icon">⬢</div><div className="mod-empty__title">ROADMAP VAZIO</div><div className="mod-empty__sub">Adicione features, epics e marcos</div></div>
        ) : (
          <table className="mod-table">
            <thead><tr><th>TÍTULO</th><th>TIPO</th><th>STATUS</th><th>QUARTER</th><th>INÍCIO</th><th>FIM</th><th></th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong>{item.description && <div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{item.description.slice(0,60)}…</div>}</td>
                  <td><span style={{fontSize:10,letterSpacing:1,color:"#00e5cc",border:"1px solid rgba(0,229,204,0.3)",padding:"2px 6px"}}>{typeLabel(item.item_type_id).toUpperCase()}</span></td>
                  <td><span className={`badge badge--${item.status}`}>{item.status.toUpperCase()}</span></td>
                  <td><span className="roadmap-quarter">{item.quarter || "—"}</span></td>
                  <td style={{color:"#7899b0",whiteSpace:"nowrap"}}>{fmt(item.start_date)}</td>
                  <td style={{color:"#7899b0",whiteSpace:"nowrap"}}>{fmt(item.end_date)}</td>
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
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// ROADMAP //</span><h3 className="mod-modal__title">{modal==="create"?"NOVA":"EDITAR"} <span>INICIATIVA</span></h3></div><button className="mod-modal__close" onClick={closeModal}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TÍTULO <span>*</span></label><input className="mod-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Nome da iniciativa" /></div>
              <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Descrição..." /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">TIPO</label><select className="mod-select" value={form.item_type_id} onChange={e => setForm(f=>({...f,item_type_id:e.target.value}))}><option value="">— SELECIONE —</option>{itemTypes.map(t=><option key={t.item_type_id} value={t.item_type_id}>{t.name.toUpperCase()}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}><option value="planned">PLANNED</option><option value="in_progress">IN PROGRESS</option><option value="completed">COMPLETED</option><option value="cancelled">CANCELLED</option></select></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">QUARTER</label><input className="mod-input" value={form.quarter} onChange={e => setForm(f=>({...f,quarter:e.target.value}))} placeholder="Q1 2026" /></div>
                <div className="mod-field"><label className="mod-field__label">DATA INÍCIO</label><input className="mod-input" type="date" value={form.start_date} onChange={e => setForm(f=>({...f,start_date:e.target.value}))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">DATA FIM</label><input className="mod-input" type="date" value={form.end_date} onChange={e => setForm(f=>({...f,end_date:e.target.value}))} /></div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={closeModal}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
