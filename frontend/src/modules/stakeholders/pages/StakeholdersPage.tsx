import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Stakeholder {
  stakeholder_id:       number;
  product_id?:          number;
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
  role?:                string;
  influence:            number;
  interest:             number;
  created_at:           string;
  updated_at:           string;
}

const EMPTY = {
  full_name: "", area: "", department: "", position_title: "",
  company: "", email: "", manager_name: "", stakeholder_type: "",
  relationship_status: "", notes: "", is_active: true,
  role: "", influence: 3, interest: 3,
};

const quadrant = (inf: number, int: number) => {
  if (inf >= 3 && int >= 3) return { label: "GERENCIE DE PERTO",   color: "#ff6b6b" };
  if (inf >= 3 && int < 3)  return { label: "MANTENHA SATISFEITO", color: "#ff9900" };
  if (inf < 3  && int >= 3) return { label: "MANTENHA INFORMADO",  color: "#00d4ff" };
  return                           { label: "MONITORE",            color: "#7899b0" };
};

export default function StakeholdersPage() {
  const [items,   setItems]   = useState<Stakeholder[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [modal,   setModal]   = useState<"create" | "edit" | null>(null);
  const [form,    setForm]    = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [saving,  setSaving]  = useState(false);
  const SIZE = 20;

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      const r = await apiGet<Paginated<Stakeholder>>(`/stakeholders?page=${p}&size=${SIZE}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: Stakeholder) => {
    setForm({
      full_name: item.full_name,
      area: item.area ?? "",
      department: item.department ?? "",
      position_title: item.position_title ?? "",
      company: item.company ?? "",
      email: item.email ?? "",
      manager_name: item.manager_name ?? "",
      stakeholder_type: item.stakeholder_type ?? "",
      relationship_status: item.relationship_status ?? "",
      notes: item.notes ?? "",
      is_active: item.is_active,
      role: item.role ?? "",
      influence: item.influence,
      interest: item.interest,
    });
    setEditing(item); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, influence: Number(form.influence), interest: Number(form.interest) };
      if (modal === "create") await apiPost("/stakeholders", body);
      else if (editing)       await apiPatch(`/stakeholders/${editing.stakeholder_id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir stakeholder?")) return;
    try { await apiDelete(`/stakeholders/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao excluir"); }
  };

  const ScaleBtn = ({ field }: { field: "influence" | "interest"; val: number }) => (
    <div className="influence-grid">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          className={`influence-btn ${form[field] === n ? "influence-btn--active" : ""}`}
          onClick={() => setForm(f => ({ ...f, [field]: n }))}>
          {n}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleLayout moduleIcon="◉" moduleName="STAKEHOLDERS MAP" moduleAccent="MAP" showProductSelector={false}>
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
        {loading ? (
          <div className="mod-loading">CARREGANDO...</div>
        ) : items.length === 0 ? (
          <div className="mod-empty">
            <div className="mod-empty__icon">◉</div>
            <div className="mod-empty__title">SEM STAKEHOLDERS</div>
            <div className="mod-empty__sub">Mapeie as partes interessadas</div>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>NOME</th><th>CARGO</th><th>EMPRESA</th>
                <th>INFLUÊNCIA</th><th>INTERESSE</th><th>QUADRANTE</th><th>E-MAIL</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const q = quadrant(item.influence, item.interest);
                return (
                  <tr key={item.stakeholder_id}>
                    <td>
                      <strong>{item.full_name}</strong>
                      {item.area && (
                        <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{item.area}</div>
                      )}
                    </td>
                    <td style={{ color: "#7899b0" }}>{item.position_title || item.role || "—"}</td>
                    <td style={{ color: "#7899b0" }}>{item.company || "—"}</td>
                    <td style={{ textAlign: "center" }}><span className="score-chip">{item.influence}/5</span></td>
                    <td style={{ textAlign: "center" }}><span className="score-chip">{item.interest}/5</span></td>
                    <td>
                      <span style={{ fontSize: 9, letterSpacing: 1, color: q.color, border: `1px solid ${q.color}40`, padding: "2px 6px" }}>
                        {q.label}
                      </span>
                    </td>
                    <td style={{ color: "#7899b0" }}>{item.email || "—"}</td>
                    <td>
                      <div className="row-actions">
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

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// STAKEHOLDER //</span>
                <h3 className="mod-modal__title">{modal === "create" ? "NOVO" : "EDITAR"} <span>STAKEHOLDER</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">NOME COMPLETO <span>*</span></label>
                  <input className="mod-input" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Nome completo" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">CARGO / TÍTULO</label>
                  <input className="mod-input" value={form.position_title}
                    onChange={e => setForm(f => ({ ...f, position_title: e.target.value }))}
                    placeholder="CEO, PM, Tech Lead..." />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">EMPRESA</label>
                  <input className="mod-input" value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Nome da empresa" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">ÁREA / DEPARTAMENTO</label>
                  <input className="mod-input" value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    placeholder="Tecnologia, Marketing..." />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">E-MAIL</label>
                <input className="mod-input" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com" />
              </div>
              <div className="mod-field"><label className="mod-field__label">INFLUÊNCIA (1–5)</label><ScaleBtn field="influence" val={form.influence} /></div>
              <div className="mod-field"><label className="mod-field__label">INTERESSE (1–5)</label><ScaleBtn field="interest" val={form.interest} /></div>
              {form.influence > 0 && form.interest > 0 && (() => {
                const q = quadrant(form.influence, form.interest);
                return (
                  <div style={{ padding: "4px 0 8px", fontSize: 9, letterSpacing: 2 }}>
                    <span style={{ color: q.color }}>● {q.label}</span>
                  </div>
                );
              })()}
              <div className="mod-field">
                <label className="mod-field__label">NOTAS</label>
                <textarea className="mod-textarea" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações, como se comunicar..." />
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
    </ModuleLayout>
  );
}
