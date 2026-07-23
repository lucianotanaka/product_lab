import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface StakeholderProduct {
  id:         number;
  product_id: number;
  role?:      string;
  influence:  number;
  interest:   number;
  is_active:  boolean;
  created_at: string;
  updated_at?: string;
}

interface Stakeholder {
  stakeholder_id:       number;
  full_name:            string;
  area?:                string;
  department?:          string;
  position_title?:      string;
  company?:             string;
  email?:               string;
  manager_name?:        string;
  stakeholder_type?:    string;
  relationship_status?: string;
  notes?:               string;
  is_active:            boolean;
  created_at:           string;
  updated_at:           string;
  products:             StakeholderProduct[];
}

const EMPTY = {
  full_name: "", area: "", department: "", position_title: "",
  company: "", email: "", notes: "", is_active: true,
};

const quadrant = (inf: number, int: number) => {
  if (inf >= 3 && int >= 3) return { label: "GERENCIE DE PERTO",   color: "#ff6b6b" };
  if (inf >= 3 && int < 3)  return { label: "MANTENHA SATISFEITO", color: "#ff9900" };
  if (inf < 3  && int >= 3) return { label: "MANTENHA INFORMADO",  color: "#00d4ff" };
  return                           { label: "MONITORE",            color: "#7899b0" };
};

export default function StakeholdersPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items,    setItems]   = useState<Stakeholder[]>([]);
  const [total,    setTotal]   = useState(0);
  const [page,     setPage]    = useState(1);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const [modal,    setModal]   = useState<"create" | "edit" | null>(null);
  const [form,     setForm]    = useState({ ...EMPTY });
  const [editing,  setEditing] = useState<Stakeholder | null>(null);
  const [saving,   setSaving]  = useState(false);

  // Product association panel
  const [assocStk,    setAssocStk]    = useState<Stakeholder | null>(null);
  const [assocProd,   setAssocProd]   = useState("");
  const [assocRole,   setAssocRole]   = useState("");
  const [assocInf,    setAssocInf]    = useState(3);
  const [assocInt,    setAssocInt]    = useState(3);
  const [assocSaving, setAssocSaving] = useState(false);
  const [products,    setProducts]    = useState<{ product_id: number; name: string }[]>([]);

  // Inline edit state for existing associations
  const [editingAssocId, setEditingAssocId] = useState<number | null>(null);
  const [editInf,        setEditInf]        = useState(3);
  const [editInt,        setEditInt]        = useState(3);
  const [editRole,       setEditRole]       = useState("");
  const [editSaving,     setEditSaving]     = useState(false);

  const SIZE = 20;
  const pid  = productId ? parseInt(productId, 10) : undefined;

  useEffect(() => {
    apiGet<{ total: number; items: { product_id: number; name: string }[] }>("/products?size=100")
      .then(r => setProducts(r.items)).catch(() => {});
  }, []);

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<Paginated<Stakeholder>>(`/stakeholders?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao carregar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };
  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit   = (item: Stakeholder) => {
    setForm({ full_name: item.full_name, area: item.area ?? "", department: item.department ?? "",
              position_title: item.position_title ?? "", company: item.company ?? "",
              email: item.email ?? "", notes: item.notes ?? "", is_active: item.is_active });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      if (modal === "create") await apiPost("/stakeholders", form);
      else if (editing)       await apiPatch(`/stakeholders/${editing.stakeholder_id}`, form);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir stakeholder?")) return;
    try { await apiDelete(`/stakeholders/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao excluir"); }
  };

  // ── Association helpers ─────────────────────────────────────────────────────

  const openAssoc = (s: Stakeholder) => {
    setAssocStk(s);
    setAssocProd(""); setAssocRole(""); setAssocInf(3); setAssocInt(3);
    setEditingAssocId(null);
  };
  const closeAssoc = () => { setAssocStk(null); setEditingAssocId(null); };

  const refreshAssocStk = async (stk: Stakeholder) => {
    const updated = await apiGet<Stakeholder>(`/stakeholders/${stk.stakeholder_id}`);
    setAssocStk(updated);
    setItems(prev => prev.map(s => s.stakeholder_id === updated.stakeholder_id ? updated : s));
    return updated;
  };

  const addAssoc = async () => {
    if (!assocStk || !assocProd) return;
    setAssocSaving(true);
    try {
      await apiPost(`/stakeholders/${assocStk.stakeholder_id}/products`, {
        product_id: parseInt(assocProd, 10), role: assocRole || null,
        influence: assocInf, interest: assocInt,
      });
      await refreshAssocStk(assocStk);
      setAssocProd(""); setAssocRole(""); setAssocInf(3); setAssocInt(3);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setAssocSaving(false); }
  };

  const startEditAssoc = (p: StakeholderProduct) => {
    setEditingAssocId(p.id);
    setEditInf(p.influence);
    setEditInt(p.interest);
    setEditRole(p.role ?? "");
  };

  const cancelEditAssoc = () => setEditingAssocId(null);

  const saveEditAssoc = async (p: StakeholderProduct) => {
    if (!assocStk) return;
    setEditSaving(true);
    try {
      await apiPatch(`/stakeholders/${assocStk.stakeholder_id}/products/${p.product_id}`, {
        influence: editInf,
        interest:  editInt,
        role:      editRole || null,
      });
      await refreshAssocStk(assocStk);
      setEditingAssocId(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setEditSaving(false); }
  };

  const toggleAssocActive = async (p: StakeholderProduct) => {
    if (!assocStk) return;
    try {
      await apiPatch(`/stakeholders/${assocStk.stakeholder_id}/products/${p.product_id}`, {
        is_active: !p.is_active,
      });
      await refreshAssocStk(assocStk);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const getQuadrant = (item: Stakeholder) => {
    if (pid) {
      const assoc = item.products.find(p => p.product_id === pid && p.is_active);
      if (assoc) return quadrant(assoc.influence, assoc.interest);
    }
    const first = item.products.find(p => p.is_active);
    return first ? quadrant(first.influence, first.interest) : quadrant(3, 3);
  };

  const productName = (id: number) => products.find(p => p.product_id === id)?.name ?? `#${id}`;

  const availableProducts = products.filter(
    p => !assocStk?.products.some(sp => sp.product_id === p.product_id && sp.is_active)
  );

  return (
    <ModuleLayout moduleIcon="◉" moduleName="STAKEHOLDERS MAP" moduleAccent="MAP"
      selectedProductId={productId} onProductChange={handleProductChange}>

      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// MAPA DE STAKEHOLDERS //</span>
          <h1 className="mod-header__title">STAKEHOLDERS <span>MAP</span></h1>
          <p className="mod-header__meta">{total} parte(s) interessada(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVO STAKEHOLDER</button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◉</div>
            <div className="mod-empty__title">SEM STAKEHOLDERS</div>
            <div className="mod-empty__sub">Cadastre as partes interessadas</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>NOME</th><th>CARGO</th><th>EMPRESA</th>
                <th>PRODUTOS</th><th>QUADRANTE</th><th>E-MAIL</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const q = getQuadrant(item);
                const activeProducts = item.products.filter(p => p.is_active);
                return (
                  <tr key={item.stakeholder_id}>
                    <td>
                      <strong>{item.full_name}</strong>
                      {item.area && (
                        <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{item.area}</div>
                      )}
                    </td>
                    <td style={{ color: "#7899b0" }}>{item.position_title || "—"}</td>
                    <td style={{ color: "#7899b0" }}>{item.company || "—"}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {activeProducts.length === 0 ? (
                          <span style={{ color: "#7899b0", fontSize: 10 }}>—</span>
                        ) : activeProducts.map(p => (
                          <span key={p.product_id} style={{
                            fontSize: 9, letterSpacing: 1, color: "#00d4ff",
                            border: "1px solid rgba(0,212,255,0.3)", padding: "1px 5px",
                          }}>
                            {productName(p.product_id)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 9, letterSpacing: 1, color: q.color,
                        border: `1px solid ${q.color}40`, padding: "2px 6px",
                      }}>
                        {q.label}
                      </span>
                    </td>
                    <td style={{ color: "#7899b0" }}>{item.email || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" onClick={() => openAssoc(item)} title="Gerenciar produtos">PROD</button>
                        <button className="btn-icon" onClick={() => openEdit(item)}>EDITAR</button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.stakeholder_id)}>DEL</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* ── Create / Edit Stakeholder Modal ── */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// STAKEHOLDER //</span>
                <h3 className="mod-modal__title">
                  {modal === "create" ? "NOVO" : "EDITAR"} <span>STAKEHOLDER</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">NOME COMPLETO <span>*</span></label>
                  <input className="mod-input" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nome completo" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">CARGO / TÍTULO</label>
                  <input className="mod-input" value={form.position_title}
                    onChange={e => setForm(f => ({ ...f, position_title: e.target.value }))} placeholder="CEO, PM..." />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">EMPRESA</label>
                  <input className="mod-input" value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nome da empresa" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">ÁREA</label>
                  <input className="mod-input" value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Tecnologia, Marketing..." />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">E-MAIL</label>
                <input className="mod-input" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">NOTAS</label>
                <textarea className="mod-textarea" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>CANCELAR</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.full_name.trim()}>
                {saving ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Associations Panel ── */}
      {assocStk && (
        <div className="mod-overlay" onClick={closeAssoc}>
          <div className="mod-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// PRODUTOS //</span>
                <h3 className="mod-modal__title">ASSOCIAR <span>PRODUTOS</span></h3>
                <div style={{ fontSize: 10, color: "#7899b0", marginTop: 4 }}>{assocStk.full_name}</div>
              </div>
              <button className="mod-modal__close" onClick={closeAssoc}>✕</button>
            </div>

            <div className="mod-modal__body">

              {/* ── Add new association ── */}
              <div className="mod-field-row" style={{ alignItems: "flex-end", gap: 8 }}>
                <div className="mod-field" style={{ flex: 2 }}>
                  <label className="mod-field__label">PRODUTO</label>
                  <select className="mod-select" value={assocProd} onChange={e => setAssocProd(e.target.value)}>
                    <option value="">— SELECIONE —</option>
                    {availableProducts.map(p => (
                      <option key={p.product_id} value={p.product_id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mod-field" style={{ flex: 1 }}>
                  <label className="mod-field__label">INF</label>
                  <select className="mod-select" value={assocInf} onChange={e => setAssocInf(Number(e.target.value))}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="mod-field" style={{ flex: 1 }}>
                  <label className="mod-field__label">INT</label>
                  <select className="mod-select" value={assocInt} onChange={e => setAssocInt(Number(e.target.value))}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button className="btn-save" style={{ padding: "8px 12px" }}
                  onClick={addAssoc} disabled={assocSaving || !assocProd}>
                  + ADD
                </button>
              </div>
              <div className="mod-field" style={{ marginTop: 4 }}>
                <label className="mod-field__label">PAPEL NESTE PRODUTO</label>
                <input className="mod-input" value={assocRole}
                  onChange={e => setAssocRole(e.target.value)} placeholder="Product Owner, Sponsor..." />
              </div>

              {/* ── Existing associations list ── */}
              {assocStk.products.length === 0 ? (
                <div style={{ color: "#7899b0", fontSize: 12, padding: "12px 0", textAlign: "center", letterSpacing: 1 }}>
                  SEM PRODUTOS ASSOCIADOS
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                  {assocStk.products.map(p => {
                    const q = quadrant(p.influence, p.interest);
                    const isEditing = editingAssocId === p.id;
                    const inactive = !p.is_active;

                    return (
                      <div key={p.id} style={{
                        padding: "8px 10px",
                        background: inactive ? "rgba(0,10,20,0.4)" : "rgba(0,20,40,0.6)",
                        border: `1px solid ${inactive ? "rgba(120,153,176,0.15)" : "rgba(0,212,255,0.15)"}`,
                        opacity: inactive ? 0.6 : 1,
                        fontSize: 11,
                      }}>
                        {/* Row header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isEditing ? 8 : 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ color: "#00d4ff" }}>{productName(p.product_id)}</span>
                            {inactive && (
                              <span style={{ fontSize: 9, letterSpacing: 1, color: "#7899b0",
                                border: "1px solid rgba(120,153,176,0.4)", padding: "1px 5px" }}>
                                INATIVO
                              </span>
                            )}
                            {!isEditing && (
                              <>
                                {p.role && <span style={{ color: "#7899b0" }}>{p.role}</span>}
                                <span style={{ color: q.color, fontSize: 9, letterSpacing: 1 }}>
                                  INF {p.influence} · INT {p.interest} — {q.label}
                                </span>
                              </>
                            )}
                          </span>
                          <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            {!inactive && !isEditing && (
                              <button className="btn-icon" style={{ padding: "2px 8px", fontSize: 10 }}
                                onClick={() => startEditAssoc(p)}>
                                EDITAR
                              </button>
                            )}
                            {isEditing && (
                              <>
                                <button className="btn-icon" style={{ padding: "2px 8px", fontSize: 10 }}
                                  onClick={cancelEditAssoc} disabled={editSaving}>
                                  CANCELAR
                                </button>
                                <button className="btn-save" style={{ padding: "2px 8px", fontSize: 10 }}
                                  onClick={() => saveEditAssoc(p)} disabled={editSaving}>
                                  {editSaving ? "..." : "SALVAR"}
                                </button>
                              </>
                            )}
                            <button
                              className={inactive ? "btn-save" : "btn-icon"}
                              style={{ padding: "2px 8px", fontSize: 10,
                                ...(inactive ? { background: "rgba(0,180,80,0.15)", borderColor: "rgba(0,180,80,0.4)", color: "#00c853" } : {}) }}
                              onClick={() => toggleAssocActive(p)}
                              title={inactive ? "Reativar associação" : "Inativar associação"}>
                              {inactive ? "ATIVAR" : "INATIVAR"}
                            </button>
                          </span>
                        </div>

                        {/* Inline edit form */}
                        {isEditing && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 4 }}>
                            <div className="mod-field" style={{ flex: 1 }}>
                              <label className="mod-field__label" style={{ fontSize: 9 }}>INF</label>
                              <select className="mod-select" value={editInf}
                                onChange={e => setEditInf(Number(e.target.value))} style={{ padding: "4px 6px" }}>
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div className="mod-field" style={{ flex: 1 }}>
                              <label className="mod-field__label" style={{ fontSize: 9 }}>INT</label>
                              <select className="mod-select" value={editInt}
                                onChange={e => setEditInt(Number(e.target.value))} style={{ padding: "4px 6px" }}>
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div className="mod-field" style={{ flex: 3 }}>
                              <label className="mod-field__label" style={{ fontSize: 9 }}>PAPEL NESTE PRODUTO</label>
                              <input className="mod-input" value={editRole}
                                onChange={e => setEditRole(e.target.value)}
                                placeholder="Product Owner, Sponsor..."
                                style={{ padding: "4px 8px" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeAssoc}>FECHAR</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
