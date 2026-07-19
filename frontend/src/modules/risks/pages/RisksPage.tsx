import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Risk { id: string; product_id: string; title: string; description?: string; probability: number; impact: number; risk_score: number; status: string; mitigation_plan?: string; created_at: string; }
const EMPTY = { title: "", description: "", probability: 1, impact: 1, risk_score: 1, status: "identified", mitigation_plan: "" };

export default function RisksPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<Risk[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [modal, setModal] = useState<"create"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY }); const [editing, setEditing] = useState<Risk|null>(null);
  const [saving, setSaving] = useState(false); const SIZE = 20;

  const load = async (p = page, pid = productId) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<Risk>>(`/risks?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: Risk) => { setForm({ title: item.title, description: item.description ?? "", probability: item.probability, impact: item.impact, risk_score: item.risk_score, status: item.status, mitigation_plan: item.mitigation_plan ?? "" }); setEditing(item); setModal("edit"); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const updateRisk = (field: "probability"|"impact", val: number) => {
    setForm(f => { const p = field==="probability"?val:f.probability; const i = field==="impact"?val:f.impact; return { ...f, [field]: val, risk_score: p * i }; });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") { setError("Selecione um produto"); return; }
    setSaving(true);
    try {
      const body = { ...form, probability: Number(form.probability), impact: Number(form.impact), risk_score: Number(form.probability) * Number(form.impact) };
      if (modal === "create") await apiPost("/risks", { ...body, product_id: productId });
      else if (editing) await apiPatch(`/risks/${editing.id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir risco?")) return;
    try { await apiDelete(`/risks/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const scoreClass = (s: number) => s >= 15 ? "risk-score--high" : s >= 6 ? "risk-score--medium" : "risk-score--low";
  const scoreLabel = (s: number) => s >= 15 ? "ALTO" : s >= 6 ? "MÉDIO" : "BAIXO";

  return (
    <ModuleLayout moduleIcon="△" moduleName="RISK MATRIX" moduleAccent="MATRIX" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// MATRIZ DE RISCOS //</span>
          <h1 className="mod-header__title">RISK <span>MATRIX</span></h1>
          <p className="mod-header__meta">{total} risco(s) mapeado(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO RISCO</button>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? (
          <div className="mod-empty"><div className="mod-empty__icon">△</div><div className="mod-empty__title">SEM RISCOS MAPEADOS</div><div className="mod-empty__sub">Mapeie riscos e planos de mitigação</div></div>
        ) : (
          <table className="mod-table">
            <thead><tr><th>TÍTULO</th><th>STATUS</th><th>PROB.</th><th>IMPACTO</th><th>SCORE</th><th>NÍVEL</th><th>MITIGAÇÃO</th><th></th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong>{item.description && <div style={{fontSize:10,color:"#7899b0",marginTop:2}}>{item.description.slice(0,60)}…</div>}</td>
                  <td><span className={`badge badge--${item.status}`}>{item.status.toUpperCase()}</span></td>
                  <td style={{textAlign:"center"}}><span className="score-chip">{item.probability}</span></td>
                  <td style={{textAlign:"center"}}><span className="score-chip">{item.impact}</span></td>
                  <td style={{textAlign:"center"}}><span className={`score-chip ${scoreClass(item.risk_score)}`}>{item.risk_score}</span></td>
                  <td><span className={`badge ${scoreClass(item.risk_score)}`}>{scoreLabel(item.risk_score)}</span></td>
                  <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#7899b0"}}>{item.mitigation_plan?.slice(0,60) || "—"}</td>
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
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// RISCO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVO":"EDITAR"} <span>RISCO</span></h3></div><button className="mod-modal__close" onClick={closeModal}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TÍTULO <span>*</span></label><input className="mod-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Título do risco" /></div>
              <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Descreva o risco..." /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">PROBABILIDADE (1–5)</label><input className="mod-input" type="number" min="1" max="5" value={form.probability} onChange={e => updateRisk("probability", Number(e.target.value))} /></div>
                <div className="mod-field"><label className="mod-field__label">IMPACTO (1–5)</label><input className="mod-input" type="number" min="1" max="5" value={form.impact} onChange={e => updateRisk("impact", Number(e.target.value))} /></div>
              </div>
              <div style={{padding:"4px 0 12px",fontSize:9,letterSpacing:2,color:"#00d4ff"}}>RISK SCORE: <span className={`score-chip ${scoreClass(form.probability*form.impact)}`}>{form.probability*form.impact}</span> — <span className={scoreClass(form.probability*form.impact)}>{scoreLabel(form.probability*form.impact)}</span></div>
              <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}><option value="identified">IDENTIFIED</option><option value="in_progress">IN PROGRESS</option><option value="mitigated">MITIGATED</option><option value="accepted">ACCEPTED</option><option value="closed">CLOSED</option></select></div>
              <div className="mod-field"><label className="mod-field__label">PLANO DE MITIGAÇÃO</label><textarea className="mod-textarea" value={form.mitigation_plan} onChange={e => setForm(f=>({...f,mitigation_plan:e.target.value}))} placeholder="Como mitigar ou responder a este risco..." /></div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={closeModal}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
