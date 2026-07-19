import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface PrioritizationItem {
  id: string; product_id: string; title: string; description?: string;
  priority_method: string; reach: number; impact: number; confidence: number; effort: number;
  rice_score: number; moscow_value?: string; created_at: string;
}
const EMPTY = { title: "", description: "", priority_method: "RICE", reach: 0, impact: 0, confidence: 0, effort: 1, rice_score: 0, moscow_value: "" };

function riceScore(r: number, i: number, c: number, e: number) {
  return e > 0 ? Math.round((r * i * c) / e) : 0;
}

export default function PrioritizationPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<PrioritizationItem[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [modal, setModal] = useState<"create"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY }); const [editing, setEditing] = useState<PrioritizationItem|null>(null);
  const [saving, setSaving] = useState(false); const SIZE = 20;

  const load = async (p = page, pid = productId) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<PrioritizationItem>>(`/prioritization?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: PrioritizationItem) => {
    setForm({ title: item.title, description: item.description ?? "", priority_method: item.priority_method, reach: item.reach, impact: item.impact, confidence: item.confidence, effort: item.effort, rice_score: item.rice_score, moscow_value: item.moscow_value ?? "" });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const updateNum = (field: string, val: string) => {
    const n = parseFloat(val) || 0;
    setForm(f => {
      const updated = { ...f, [field]: n };
      if (["reach","impact","confidence","effort"].includes(field)) {
        updated.rice_score = riceScore(
          field==="reach"?n:updated.reach,
          field==="impact"?n:updated.impact,
          field==="confidence"?n:updated.confidence,
          field==="effort"?n:updated.effort
        );
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") { setError("Selecione um produto"); return; }
    setSaving(true);
    try {
      const body = { ...form, reach: Number(form.reach), impact: Number(form.impact), confidence: Number(form.confidence), effort: Number(form.effort), rice_score: Number(form.rice_score), moscow_value: form.moscow_value || null };
      if (modal === "create") await apiPost("/prioritization", { ...body, product_id: productId });
      else if (editing) await apiPatch(`/prioritization/${editing.id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir item?")) return;
    try { await apiDelete(`/prioritization/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const getRiskClass = (score: number) => score >= 100 ? "risk-score--high" : score >= 30 ? "risk-score--medium" : "risk-score--low";

  return (
    <ModuleLayout moduleIcon="◇" moduleName="PRIORITIZATION MATRIX" moduleAccent="MATRIX" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// PRIORIZAÇÃO DE FEATURES //</span>
          <h1 className="mod-header__title">PRIORITIZATION <span>MATRIX</span></h1>
          <p className="mod-header__meta">{total} item(ns) • RICE / ICE / MoSCoW</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO ITEM</button>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? (
          <div className="mod-empty"><div className="mod-empty__icon">◇</div><div className="mod-empty__title">MATRIZ VAZIA</div><div className="mod-empty__sub">Adicione features para priorizar</div></div>
        ) : (
          <table className="mod-table">
            <thead><tr><th>TÍTULO</th><th>MÉTODO</th><th>SCORE</th><th>R</th><th>I</th><th>C</th><th>E</th><th>MoSCoW</th><th></th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong>{item.description && <div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{item.description.slice(0,60)}…</div>}</td>
                  <td><span className={`badge badge--${item.priority_method}`}>{item.priority_method}</span></td>
                  <td><span className={`score-chip ${getRiskClass(item.rice_score)}`}>{item.rice_score}</span></td>
                  <td style={{color:"#7899b0"}}>{item.reach}</td>
                  <td style={{color:"#7899b0"}}>{item.impact}</td>
                  <td style={{color:"#7899b0"}}>{item.confidence}</td>
                  <td style={{color:"#7899b0"}}>{item.effort}</td>
                  <td>{item.moscow_value ? <span className="badge badge--MoSCoW">{item.moscow_value}</span> : "—"}</td>
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
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// PRIORIZAÇÃO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVO":"EDITAR"} <span>ITEM</span></h3></div><button className="mod-modal__close" onClick={closeModal}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TÍTULO <span>*</span></label><input className="mod-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Feature ou iniciativa" /></div>
              <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Descrição..." /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">MÉTODO</label><select className="mod-select" value={form.priority_method} onChange={e => setForm(f=>({...f,priority_method:e.target.value}))}><option value="RICE">RICE</option><option value="ICE">ICE</option><option value="MoSCoW">MoSCoW</option></select></div>
                <div className="mod-field"><label className="mod-field__label">MoSCoW</label><select className="mod-select" value={form.moscow_value} onChange={e => setForm(f=>({...f,moscow_value:e.target.value}))}><option value="">— N/A —</option><option value="must_have">MUST HAVE</option><option value="should_have">SHOULD HAVE</option><option value="could_have">COULD HAVE</option><option value="wont_have">WON'T HAVE</option></select></div>
              </div>
              <div style={{padding:"12px 0 4px",fontSize:9,letterSpacing:2,color:"#00d4ff"}}>RICE SCORE: <span className="score-chip">{riceScore(Number(form.reach),Number(form.impact),Number(form.confidence),Number(form.effort))}</span></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">REACH</label><input className="mod-input" type="number" min="0" value={form.reach} onChange={e => updateNum("reach",e.target.value)} /></div>
                <div className="mod-field"><label className="mod-field__label">IMPACT</label><input className="mod-input" type="number" min="0" value={form.impact} onChange={e => updateNum("impact",e.target.value)} /></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">CONFIDENCE (%)</label><input className="mod-input" type="number" min="0" max="100" value={form.confidence} onChange={e => updateNum("confidence",e.target.value)} /></div>
                <div className="mod-field"><label className="mod-field__label">EFFORT (semanas)</label><input className="mod-input" type="number" min="0.1" step="0.1" value={form.effort} onChange={e => updateNum("effort",e.target.value)} /></div>
              </div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={closeModal}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
