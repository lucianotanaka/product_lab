import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface VPCItem { id: string; product_id: string; type: string; content: string; priority: number; created_at: string; }
const EMPTY = { type: "job", content: "", priority: 3 };

const VPC_TYPES = [
  { value: "job", label: "JOB TO BE DONE", color: "#00d4ff" },
  { value: "pain", label: "PAIN", color: "#ff9900" },
  { value: "gain", label: "GAIN", color: "#00ff88" },
];

export default function VPCPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<VPCItem[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [modal, setModal] = useState<"create"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY }); const [editing, setEditing] = useState<VPCItem|null>(null);
  const [saving, setSaving] = useState(false); const [view, setView] = useState<"canvas"|"table">("canvas");
  const SIZE = 100;

  const load = async (p = page, pid = productId) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<VPCItem>>(`/vpc?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = (type = "job") => { setForm({ ...EMPTY, type }); setEditing(null); setModal("create"); };
  const openEdit = (item: VPCItem) => { setForm({ type: item.type, content: item.content, priority: item.priority }); setEditing(item); setModal("edit"); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.content.trim()) return;
    if (!productId && modal === "create") { setError("Selecione um produto"); return; }
    setSaving(true);
    try {
      const body = { ...form, priority: Number(form.priority) };
      if (modal === "create") await apiPost("/vpc", { ...body, product_id: productId });
      else if (editing) await apiPatch(`/vpc/${editing.id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir item?")) return;
    try { await apiDelete(`/vpc/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const byType = (type: string) => items.filter(i => i.type === type).sort((a,b) => b.priority - a.priority);

  return (
    <ModuleLayout moduleIcon="⬡" moduleName="VALUE PROPOSITION CANVAS" moduleAccent="CANVAS" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// PROPOSTA DE VALOR //</span>
          <h1 className="mod-header__title">VALUE PROPOSITION <span>CANVAS</span></h1>
          <p className="mod-header__meta">{total} item(ns) • Jobs / Pains / Gains</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className={`btn-icon ${view==="canvas"?"influence-btn--active":""}`} onClick={() => setView("canvas")}>CANVAS</button>
          <button className={`btn-icon ${view==="table"?"influence-btn--active":""}`} onClick={() => setView("table")}>TABELA</button>
          <button className="btn-add" onClick={() => openCreate()}>+ NOVO ITEM</button>
        </div>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}

      {view === "canvas" ? (
        loading ? <div className="mod-loading">CARREGANDO...</div> : (
          <div className="vpc-canvas">
            {VPC_TYPES.map(vt => (
              <div key={vt.value} className="vpc-column">
                <div className="vpc-column__title" style={{color:vt.color}}>
                  {vt.label} <span style={{opacity:0.5}}>({byType(vt.value).length})</span>
                  <button className="btn-icon" style={{float:"right",fontSize:9,padding:"2px 6px"}} onClick={() => openCreate(vt.value)}>+</button>
                </div>
                {byType(vt.value).length === 0
                  ? <div style={{color:"#7899b0",fontSize:10,textAlign:"center",padding:16,letterSpacing:1}}>VAZIO</div>
                  : byType(vt.value).map(item => (
                      <div key={item.id} className={`vpc-item vpc-item--${item.type}`} style={{cursor:"pointer"}} onClick={() => openEdit(item)}>
                        <div style={{fontSize:11,lineHeight:1.5}}>{item.content}</div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,color:"#7899b0"}}>
                          <span>P: {item.priority}</span>
                          <button className="btn-icon btn-icon--danger" style={{fontSize:9,padding:"1px 6px"}} onClick={e => { e.stopPropagation(); handleDelete(item.id); }}>DEL</button>
                        </div>
                      </div>
                    ))
                }
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="mod-table-wrap">
          {loading ? <div className="mod-loading">CARREGANDO...</div>
          : items.length === 0 ? (
            <div className="mod-empty"><div className="mod-empty__icon">⬡</div><div className="mod-empty__title">CANVAS VAZIO</div><div className="mod-empty__sub">Adicione jobs, pains e gains</div></div>
          ) : (
            <table className="mod-table">
              <thead><tr><th>TIPO</th><th>CONTEÚDO</th><th>PRIORIDADE</th><th>DATA</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><span className={`badge badge--${item.type}`}>{VPC_TYPES.find(t=>t.value===item.type)?.label || item.type}</span></td>
                    <td style={{maxWidth:400}}>{item.content}</td>
                    <td style={{textAlign:"center"}}><span className="score-chip">{item.priority}/5</span></td>
                    <td style={{color:"#7899b0"}}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
                    <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(item)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>DEL</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// VALUE CANVAS //</span><h3 className="mod-modal__title">{modal==="create"?"NOVO":"EDITAR"} <span>ITEM</span></h3></div><button className="mod-modal__close" onClick={closeModal}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">TIPO <span>*</span></label>
                  <select className="mod-select" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                    {VPC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="mod-field"><label className="mod-field__label">PRIORIDADE (1–5)</label>
                  <div className="influence-grid">
                    {[1,2,3,4,5].map(n => <button key={n} type="button" className={`influence-btn ${form.priority===n?"influence-btn--active":""}`} onClick={() => setForm(f=>({...f,priority:n}))}>{n}</button>)}
                  </div>
                </div>
              </div>
              <div className="mod-field"><label className="mod-field__label">CONTEÚDO <span>*</span></label><textarea className="mod-textarea" style={{minHeight:100}} value={form.content} onChange={e => setForm(f=>({...f,content:e.target.value}))} placeholder={form.type==="job"?"O que o cliente quer realizar...":form.type==="pain"?"Frustrações e obstáculos do cliente...":"Benefícios que o cliente espera..."} /></div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={closeModal}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.content.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
