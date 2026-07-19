import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommType { communication_type_id: number; name: string; description?: string; is_active: boolean; }
interface Communication { communication_id: number; product_id: number; communication_type_id: number; name: string; description?: string; objective: string; trigger_type: string; default_language?: string; default_tone?: string; status: string; is_active: boolean; }
interface Audience { audience_id: number; product_id?: number; name: string; description?: string; audience_type: string; preferred_language?: string; preferred_tone?: string; is_active: boolean; }
interface Publication { publication_id: number; communication_id: number; reference_label?: string; title: string; subtitle?: string; status: string; editorial_summary?: string; version_number: number; reference_start_date?: string; reference_end_date?: string; planned_publication_date?: string; published_at?: string; }
interface Section { section_id: number; publication_id: number; section_key: string; title: string; subtitle?: string; current_content?: string; display_order: number; status: string; is_ai_generated: boolean; }
interface PubAudience { publication_audience_id: number; publication_id: number; audience_id: number; is_primary: boolean; custom_language?: string; custom_tone?: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_TYPES  = ["MANUAL", "SCHEDULED", "EVENT"];
const TONE_OPTIONS   = ["", "Executive", "Strategic", "Operational", "Technical", "Informative", "Analytical", "Inspirational", "Formal", "Friendly", "Neutral"];
const TONE_DESC: Record<string, string> = {
  Executive:     "Comunicação para executivos",
  Strategic:     "Comunicação estratégica",
  Operational:   "Comunicação operacional",
  Technical:     "Comunicação técnica",
  Informative:   "Comunicação informativa",
  Analytical:    "Comunicação analítica",
  Inspirational: "Comunicação inspiradora",
  Formal:        "Comunicação formal",
  Friendly:      "Comunicação leve e amigável",
  Neutral:       "Comunicação neutra",
};
const LANG_OPTIONS   = ["pt-BR", "en-US", "es-ES"];
const COMM_STATUSES  = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];
const PUB_STATUSES   = ["DRAFT", "GENERATING", "GENERATED", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "CANCELLED"];
const SEC_STATUSES   = ["DRAFT", "GENERATING", "GENERATED", "REVIEWED", "APPROVED", "PUBLISHED"];
const AUD_TYPES      = ["PERSON", "GROUP", "BUSINESS_AREA", "ROLE", "COMMUNITY", "EXTERNAL"];
const REVIEW_ACTIONS = ["SUBMITTED_FOR_REVIEW", "REVIEWED", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"];

const STATUS_COLOR: Record<string, string> = {
  DRAFT:"#7899b0", ACTIVE:"#00ff88", INACTIVE:"#ff9900", ARCHIVED:"#555",
  GENERATING:"#c084fc", GENERATED:"#00e5cc", IN_REVIEW:"#ff9900",
  APPROVED:"#00ff88", PUBLISHED:"#00d4ff", CANCELLED:"#ff6b6b",
  REVIEWED:"#00e5cc",
};

function Badge({ s }: { s: string }) {
  return <span className="badge" style={{ borderColor: STATUS_COLOR[s] ?? "#555", color: STATUS_COLOR[s] ?? "#555" }}>{s}</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLICATION AUDIENCES MODAL
// ══════════════════════════════════════════════════════════════════════════════

function PublicationAudiencesModal({ pub, productId, onClose }: { pub: Publication; productId: string; onClose: () => void }) {
  const [linked, setLinked]     = useState<PubAudience[]>([]);
  const [available, setAvail]   = useState<Audience[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [selId, setSelId]       = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [adding, setAdding]     = useState(false);

  const loadLinked = async () => {
    try { const r = await apiGet<PubAudience[]>(`/communication/publications/${pub.publication_id}/audiences`); setLinked(r); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const loadAvail = async () => {
    try {
      const qs = productId ? `?product_id=${productId}` : "";
      const r = await apiGet<{ items: Audience[] }>(`/communication/audiences${qs}`);
      setAvail(r.items);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLinked(), loadAvail()]).finally(() => setLoading(false));
  }, []);

  const linkedIds = new Set(linked.map(l => l.audience_id));
  const unlinked  = available.filter(a => !linkedIds.has(a.audience_id));

  const handleAdd = async () => {
    if (!selId) return;
    setAdding(true);
    try {
      await apiPost(`/communication/publications/${pub.publication_id}/audiences`, { audience_id: Number(selId), is_primary: isPrimary });
      setSelId(""); setIsPrimary(false); await loadLinked();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (audienceId: number) => {
    try { await apiDelete(`/communication/publications/${pub.publication_id}/audiences/${audienceId}`); await loadLinked(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 640, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div>
            <span className="mod-modal__eyebrow">// AUDIÊNCIAS DA PUBLICAÇÃO //</span>
            <h3 className="mod-modal__title">{pub.reference_label ?? pub.title} <span>— PÚBLICO</span></h3>
          </div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          {loading ? <div className="mod-loading">CARREGANDO...</div> : (
            <>
              {/* Add audience bar */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4 }}>
                <select className="mod-select" style={{ flex: 3, fontSize: 11 }} value={selId} onChange={e => setSelId(e.target.value)}>
                  <option value="">— Selecione uma audiência —</option>
                  {unlinked.map(a => <option key={a.audience_id} value={a.audience_id}>{a.name} ({a.audience_type})</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, letterSpacing: 1, color: "#7899b0", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
                  PRIMÁRIA
                </label>
                <button className="btn-save" style={{ whiteSpace: "nowrap" }} onClick={handleAdd} disabled={adding || !selId}>{adding ? "..." : "ADICIONAR ⟩"}</button>
              </div>

              {/* Linked audiences */}
              {linked.length === 0 ? (
                <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM AUDIÊNCIAS VINCULADAS</div><div className="mod-empty__sub">Selecione audiências acima para vincular a esta publicação</div></div>
              ) : (
                <table className="mod-table">
                  <thead><tr><th>AUDIÊNCIA</th><th>TIPO</th><th>PRIMÁRIA</th><th></th></tr></thead>
                  <tbody>
                    {linked.map(la => {
                      const aud = available.find(a => a.audience_id === la.audience_id);
                      return (
                        <tr key={la.publication_audience_id}>
                          <td><strong>{aud?.name ?? `#${la.audience_id}`}</strong></td>
                          <td><span className="badge badge--info">{aud?.audience_type ?? "—"}</span></td>
                          <td style={{ textAlign: "center" }}>{la.is_primary ? <span style={{ color: "#00ff88" }}>★</span> : "—"}</td>
                          <td><button className="btn-icon btn-icon--danger" onClick={() => handleRemove(la.audience_id)}>REMOVER</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// SECTIONS MODAL
// ══════════════════════════════════════════════════════════════════════════════

function SectionsModal({ pub, onClose }: { pub: Publication; onClose: () => void }) {
  const [items, setItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [sel, setSel] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewAction, setReviewAction] = useState("SUBMITTED_FOR_REVIEW");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const EMPTY = { section_key: "", title: "", subtitle: "", current_content: "", display_order: items.length, status: "DRAFT" };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try { const r = await apiGet<Section[]>(`/communication/publications/${pub.publication_id}/sections`); setItems(r); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY, display_order: items.length }); setSel(null); setModal("create"); };
  const openEdit = (s: Section) => { setForm({ section_key: s.section_key, title: s.title, subtitle: s.subtitle ?? "", current_content: s.current_content ?? "", display_order: s.display_order, status: s.status }); setSel(s); setModal("edit"); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.section_key.trim()) return;
    setSaving(true);
    try {
      if (modal === "create") await apiPost(`/communication/publications/${pub.publication_id}/sections`, form);
      else if (sel) await apiPatch(`/communication/sections/${sel.section_id}`, form);
      setModal(null); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir seção?")) return;
    try { await apiDelete(`/communication/sections/${id}`); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      await apiPost(`/communication/publications/${pub.publication_id}/reviews`, { action: reviewAction, comments: reviewComment || null });
      setReviewComment(""); alert(`Ação "${reviewAction}" registrada com sucesso.`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSubmittingReview(false); }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 900, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div>
            <span className="mod-modal__eyebrow">// PUBLICAÇÃO: {pub.reference_label ?? `#${pub.publication_id}`} //</span>
            <h3 className="mod-modal__title">{pub.title} <span>— SEÇÕES</span></h3>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge s={pub.status} />
            <button className="mod-modal__close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}

          {/* Review bar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4 }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0" }}>AÇÃO DE REVISÃO:</span>
            <select className="mod-select" style={{ flex: 1, fontSize: 11 }} value={reviewAction} onChange={e => setReviewAction(e.target.value)}>
              {REVIEW_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input className="mod-input" style={{ flex: 2, fontSize: 11 }} value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Comentário (opcional)" />
            <button className="btn-save" style={{ whiteSpace: "nowrap" }} onClick={submitReview} disabled={submittingReview}>{submittingReview ? "..." : "REGISTRAR ⟩"}</button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="btn-add" onClick={openCreate}>+ NOVA SEÇÃO</button>
          </div>

          {loading ? <div className="mod-loading">CARREGANDO...</div>
          : items.length === 0 ? (
            <div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">SEM SEÇÕES</div><div className="mod-empty__sub">Adicione seções de conteúdo a esta publicação</div></div>
          ) : (
            <table className="mod-table">
              <thead><tr><th>#</th><th>KEY</th><th>TÍTULO</th><th>STATUS</th><th>IA</th><th></th></tr></thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.section_id}>
                    <td style={{ color: "#7899b0", fontSize: 11 }}>{s.display_order}</td>
                    <td><span className="badge badge--info" style={{ fontSize: 9 }}>{s.section_key}</span></td>
                    <td><strong>{s.title}</strong>{s.current_content && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{s.current_content.slice(0, 80)}{s.current_content.length > 80 ? "…" : ""}</div>}</td>
                    <td><Badge s={s.status} /></td>
                    <td style={{ color: s.is_ai_generated ? "#c084fc" : "#555", fontSize: 11 }}>{s.is_ai_generated ? "SIM" : "—"}</td>
                    <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(s)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={() => handleDelete(s.section_id)}>DEL</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mod-modal__footer">
          <button className="btn-cancel" onClick={onClose}>FECHAR</button>
        </div>
      </div>

      {/* Section create/edit sub-modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// SEÇÃO //</span><h3 className="mod-modal__title">{modal === "create" ? "NOVA" : "EDITAR"} <span>SEÇÃO</span></h3></div>
              <button className="mod-modal__close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">SECTION KEY *</label><input className="mod-input" value={form.section_key} onChange={e => setForm(f => ({ ...f, section_key: e.target.value.toUpperCase().replace(/ /g, "_") }))} placeholder="Ex: EDITORIAL" /></div>
                <div className="mod-field"><label className="mod-field__label">ORDEM</label><input className="mod-input" type="number" min="0" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da seção" /></div>
              <div className="mod-field"><label className="mod-field__label">SUBTÍTULO</label><input className="mod-input" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">CONTEÚDO</label><textarea className="mod-textarea" rows={6} value={form.current_content} onChange={e => setForm(f => ({ ...f, current_content: e.target.value }))} placeholder="Conteúdo da seção..." /></div>
              {modal === "edit" && (
                <div className="mod-field"><label className="mod-field__label">STATUS</label>
                  <select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {SEC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim() || !form.section_key.trim()}>{saving ? "SALVANDO..." : "SALVAR ⟩"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLICATIONS MODAL
// ══════════════════════════════════════════════════════════════════════════════

function PublicationsModal({ communication, onClose }: { communication: Communication; onClose: () => void }) {
  const [items, setItems]   = useState<Publication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [modal, setModal]   = useState<"create" | "edit" | "sections" | "audiences" | null>(null);
  const [sel, setSel]       = useState<Publication | null>(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = { title: "", subtitle: "", reference_label: "", editorial_summary: "", reference_start_date: "", reference_end_date: "", planned_publication_date: "", status: "DRAFT" };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ total: number; items: Publication[] }>(`/communication/${communication.communication_id}/publications?size=50`);
      setItems(r.items);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY }); setSel(null); setModal("create"); };
  const openEdit = (p: Publication) => { setForm({ title: p.title, subtitle: p.subtitle ?? "", reference_label: p.reference_label ?? "", editorial_summary: p.editorial_summary ?? "", reference_start_date: p.reference_start_date ?? "", reference_end_date: p.reference_end_date ?? "", planned_publication_date: p.planned_publication_date ?? "", status: p.status }); setSel(p); setModal("edit"); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const clean = (v: string) => v || null;
      const body = { title: form.title, subtitle: clean(form.subtitle), reference_label: clean(form.reference_label), editorial_summary: clean(form.editorial_summary), reference_start_date: clean(form.reference_start_date), reference_end_date: clean(form.reference_end_date), planned_publication_date: clean(form.planned_publication_date), status: form.status, communication_id: communication.communication_id };
      if (modal === "create") await apiPost(`/communication/${communication.communication_id}/publications`, body);
      else if (sel) await apiPatch(`/communication/publications/${sel.publication_id}`, body);
      setModal(null); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir publicação?")) return;
    try { await apiDelete(`/communication/publications/${id}`); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 900, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// PUBLICAÇÕES //</span><h3 className="mod-modal__title">{communication.name} <span>— EDIÇÕES</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}><button className="btn-add" onClick={openCreate}>+ NOVA PUBLICAÇÃO</button></div>
          {loading ? <div className="mod-loading">CARREGANDO...</div>
          : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">SEM PUBLICAÇÕES</div><div className="mod-empty__sub">Crie a primeira edição desta comunicação</div></div>
          : (
            <table className="mod-table">
              <thead><tr><th>TÍTULO</th><th>REFERÊNCIA</th><th>STATUS</th><th>VER.</th><th>PUBLICADO</th><th></th></tr></thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.publication_id}>
                    <td><strong>{p.title}</strong>{p.subtitle && <div style={{ fontSize: 10, color: "#7899b0" }}>{p.subtitle}</div>}</td>
                    <td style={{ color: "#7899b0", fontSize: 11 }}>{p.reference_label ?? "—"}</td>
                    <td><Badge s={p.status} /></td>
                    <td style={{ textAlign: "center", color: "#7899b0" }}>v{p.version_number}</td>
                    <td style={{ color: "#7899b0", fontSize: 11 }}>{p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td><div className="row-actions"><button className="btn-icon" onClick={() => { setSel(p); setModal("audiences"); }}>PÚBLICO</button><button className="btn-icon" onClick={() => { setSel(p); setModal("sections"); }}>SEÇÕES</button><button className="btn-icon" onClick={() => openEdit(p)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={() => handleDelete(p.publication_id)}>DEL</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>

      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// PUBLICAÇÃO //</span><h3 className="mod-modal__title">{modal === "create" ? "NOVA" : "EDITAR"} <span>PUBLICAÇÃO</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: BA Magazine — Issue 001" /></div>
              <div className="mod-field"><label className="mod-field__label">SUBTÍTULO</label><input className="mod-input" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">REFERÊNCIA (Issue/Sprint/Mês)</label><input className="mod-input" value={form.reference_label} onChange={e => setForm(f => ({ ...f, reference_label: e.target.value }))} placeholder="Ex: Issue 001, Sprint 12, July 2026" /></div>
              <div className="mod-field"><label className="mod-field__label">SUMÁRIO EDITORIAL</label><textarea className="mod-textarea" value={form.editorial_summary} onChange={e => setForm(f => ({ ...f, editorial_summary: e.target.value }))} placeholder="Resumo desta edição..." /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">INÍCIO DO PERÍODO</label><input className="mod-input" type="date" value={form.reference_start_date} onChange={e => setForm(f => ({ ...f, reference_start_date: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">FIM DO PERÍODO</label><input className="mod-input" type="date" value={form.reference_end_date} onChange={e => setForm(f => ({ ...f, reference_end_date: e.target.value }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">DATA PLANEJADA DE PUBLICAÇÃO</label><input className="mod-input" type="date" value={form.planned_publication_date} onChange={e => setForm(f => ({ ...f, planned_publication_date: e.target.value }))} /></div>
              {modal === "edit" && <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{PUB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? "SALVANDO..." : "SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}

      {modal === "sections"   && sel && <SectionsModal pub={sel} onClose={() => setModal(null)} />}
      {modal === "audiences"  && sel && <PublicationAudiencesModal pub={sel} productId={String(communication.product_id)} onClose={() => setModal(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: AUDIENCES
// ══════════════════════════════════════════════════════════════════════════════

function AudiencesTab({ productId }: { productId: string }) {
  const [items, setItems]   = useState<Audience[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [modal, setModal]   = useState<"create" | "edit" | null>(null);
  const [sel, setSel]       = useState<Audience | null>(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = { name: "", description: "", audience_type: "GROUP", preferred_language: "pt-BR", preferred_tone: "" };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try {
      const qs = productId ? `?product_id=${productId}` : "";
      const r = await apiGet<{ total: number; items: Audience[] }>(`/communication/audiences${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [productId]);

  const openCreate = () => { setForm({ ...EMPTY }); setSel(null); setModal("create"); };
  const openEdit = (a: Audience) => { setForm({ name: a.name, description: a.description ?? "", audience_type: a.audience_type, preferred_language: a.preferred_language ?? "pt-BR", preferred_tone: a.preferred_tone ?? "" }); setSel(a); setModal("edit"); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, product_id: productId ? Number(productId) : null, preferred_tone: form.preferred_tone || null };
      if (modal === "create") await apiPost("/communication/audiences", body);
      else if (sel) await apiPatch(`/communication/audiences/${sel.audience_id}`, body);
      setModal(null); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir audiência?")) return;
    try { await apiDelete(`/communication/audiences/${id}`); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// PÚBLICOS-ALVO //</span>
          <h1 className="mod-header__title">AUDIENCES <span></span></h1>
          <p className="mod-header__meta">{total} audiência(s) cadastrada(s)</p>
        </div>
        <button className="btn-add" onClick={openCreate}>+ NOVA AUDIÊNCIA</button>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM AUDIÊNCIAS</div><div className="mod-empty__sub">Cadastre os públicos-alvo das comunicações</div></div>
        : (
          <table className="mod-table">
            <thead><tr><th>NOME</th><th>TIPO</th><th>IDIOMA</th><th>TOM</th><th></th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.audience_id}>
                  <td><strong>{a.name}</strong>{a.description && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{a.description.slice(0, 60)}</div>}</td>
                  <td><span className="badge badge--info">{a.audience_type}</span></td>
                  <td style={{ color: "#7899b0" }}>{a.preferred_language ?? "—"}</td>
                  <td style={{ color: "#7899b0" }}>{a.preferred_tone ?? "—"}</td>
                  <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(a)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={() => handleDelete(a.audience_id)}>DEL</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// AUDIÊNCIA //</span><h3 className="mod-modal__title">{modal === "create" ? "NOVA" : "EDITAR"} <span>AUDIÊNCIA</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">NOME *</label><input className="mod-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Executive Leadership" /></div>
              <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">TIPO</label><select className="mod-select" value={form.audience_type} onChange={e => setForm(f => ({ ...f, audience_type: e.target.value }))}>{AUD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">IDIOMA</label><select className="mod-select" value={form.preferred_language} onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}>{LANG_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">TOM PREFERENCIAL</label><select className="mod-select" value={form.preferred_tone} onChange={e => setForm(f => ({ ...f, preferred_tone: e.target.value }))}>{TONE_OPTIONS.map(t => <option key={t} value={t}>{t || "— Selecione —"}</option>)}</select>{form.preferred_tone && TONE_DESC[form.preferred_tone] && <span style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:3,display:"block"}}>{TONE_DESC[form.preferred_tone]}</span>}</div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "SALVANDO..." : "SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: COMMUNICATIONS (wraps CommunicationsTab + audiences)
// ══════════════════════════════════════════════════════════════════════════════

function CommunicationsTab({ productId, commTypes }: { productId: string; commTypes: CommType[] }) {
  const [items, setItems]   = useState<Communication[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [modal, setModal]   = useState<"create" | "edit" | "publications" | null>(null);
  const [sel, setSel]       = useState<Communication | null>(null);
  const [saving, setSaving] = useState(false);
  const SIZE = 20;
  const EMPTY = { name: "", description: "", objective: "", trigger_type: "MANUAL", communication_type_id: commTypes[0]?.communication_type_id ?? 0, default_language: "pt-BR", default_tone: "", status: "DRAFT" };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async (p = page, pid = productId) => {
    setLoading(true); setError("");
    try {
      const qs = `page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`;
      const r = await apiGet<{ total: number; items: Communication[] }>(`/communication?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  const openCreate = () => { setForm({ ...EMPTY, communication_type_id: commTypes[0]?.communication_type_id ?? 0 }); setSel(null); setModal("create"); };
  const openEdit = (c: Communication) => { setForm({ name: c.name, description: c.description ?? "", objective: c.objective, trigger_type: c.trigger_type, communication_type_id: c.communication_type_id, default_language: c.default_language ?? "pt-BR", default_tone: c.default_tone ?? "", status: c.status }); setSel(c); setModal("edit"); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.objective.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, communication_type_id: Number(form.communication_type_id), product_id: Number(productId) || undefined };
      if (modal === "create") await apiPost("/communication", body);
      else if (sel) await apiPatch(`/communication/${sel.communication_id}`, body);
      setModal(null); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir comunicação?")) return;
    try { await apiDelete(`/communication/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// ESTRATÉGIAS DE COMUNICAÇÃO //</span>
          <h1 className="mod-header__title">COMMUNICATIONS <span></span></h1>
          <p className="mod-header__meta">{total} comunicação(ões)</p>
        </div>
        <button className="btn-add" onClick={openCreate} disabled={!productId}>+ NOVA COMUNICAÇÃO</button>
      </div>
      {!productId && <div className="mod-error">⚠ Selecione um produto para gerenciar comunicações</div>}
      {error && <div className="mod-error">⚠ {error}</div>}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">CARREGANDO...</div>
        : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">SEM COMUNICAÇÕES</div><div className="mod-empty__sub">Cadastre estratégias de comunicação para este produto</div></div>
        : (
          <table className="mod-table">
            <thead><tr><th>NOME</th><th>TIPO</th><th>TRIGGER</th><th>IDIOMA</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.communication_id}>
                  <td><strong>{c.name}</strong>{c.description && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{c.description.slice(0, 60)}</div>}</td>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{commTypes.find(t => t.communication_type_id === c.communication_type_id)?.name ?? "—"}</td>
                  <td><span className="badge badge--info">{c.trigger_type}</span></td>
                  <td style={{ color: "#7899b0" }}>{c.default_language ?? "—"}</td>
                  <td><Badge s={c.status} /></td>
                  <td><div className="row-actions"><button className="btn-icon" onClick={() => { setSel(c); setModal("publications"); }}>PUBLICAÇÕES</button><button className="btn-icon" onClick={() => openEdit(c)}>EDITAR</button><button className="btn-icon btn-icon--danger" onClick={() => handleDelete(c.communication_id)}>DEL</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > SIZE && <div className="mod-pagination"><span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} de {total}</span><div className="mod-pagination__btns"><button className="btn-page" disabled={page===1} onClick={()=>setPage(p=>p-1)}>ANTERIOR</button><button className="btn-page" disabled={page*SIZE>=total} onClick={()=>setPage(p=>p+1)}>PRÓXIMO</button></div></div>}
      </div>
      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// COMUNICAÇÃO //</span><h3 className="mod-modal__title">{modal==="create"?"NOVA":"EDITAR"} <span>COMUNICAÇÃO</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">NOME *</label><input className="mod-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: BA Magazine" /></div>
              <div className="mod-field"><label className="mod-field__label">OBJETIVO *</label><textarea className="mod-textarea" value={form.objective} onChange={e => setForm(f=>({...f,objective:e.target.value}))} placeholder="Descreva o objetivo..." /></div>
              <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">TIPO</label><select className="mod-select" value={form.communication_type_id} onChange={e => setForm(f=>({...f,communication_type_id:Number(e.target.value)}))}>{commTypes.map(t=><option key={t.communication_type_id} value={t.communication_type_id}>{t.name}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">TRIGGER</label><select className="mod-select" value={form.trigger_type} onChange={e => setForm(f=>({...f,trigger_type:e.target.value}))}>{TRIGGER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">IDIOMA</label><select className="mod-select" value={form.default_language} onChange={e => setForm(f=>({...f,default_language:e.target.value}))}>{LANG_OPTIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">TOM</label><select className="mod-select" value={form.default_tone} onChange={e => setForm(f=>({...f,default_tone:e.target.value}))}>{TONE_OPTIONS.map(t=><option key={t} value={t}>{t || "— Selecione —"}</option>)}</select>{form.default_tone && TONE_DESC[form.default_tone] && <span style={{fontSize:9,color:"#7899b0",letterSpacing:1,marginTop:3,display:"block"}}>{TONE_DESC[form.default_tone]}</span>}</div>
              </div>
              {modal==="edit" && <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>{COMM_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving||!form.name.trim()||!form.objective.trim()}>{saving?"SALVANDO...":"SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
      {modal==="publications" && sel && <PublicationsModal communication={sel} onClose={() => setModal(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function CommunicationPage() {
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [tab, setTab] = useState<"communications" | "audiences">("communications");
  const [commTypes, setCommTypes] = useState<CommType[]>([]);

  useEffect(() => {
    apiGet<CommType[]>("/communication/types").then(setCommTypes).catch(() => {});
  }, []);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: "6px 16px", fontSize: 9, letterSpacing: 3, cursor: "pointer",
    background: tab === t ? "rgba(0,212,255,0.12)" : "transparent",
    border: `1px solid ${tab === t ? "rgba(0,212,255,0.5)" : "rgba(0,212,255,0.15)"}`,
    color: tab === t ? "#00d4ff" : "#7899b0",
    borderRadius: 2,
  });

  return (
    <ModuleLayout moduleIcon="◈" moduleName="COMUNICAÇÃO" moduleAccent="COMUNICAÇÃO" selectedProductId={productId} onProductChange={handleProductChange}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, padding: "0 0 12px 0", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
        <button style={tabStyle("communications")} onClick={() => setTab("communications")}>COMMUNICATIONS</button>
        <button style={tabStyle("audiences")} onClick={() => setTab("audiences")}>AUDIENCES</button>
      </div>
      {tab === "communications" && <CommunicationsTab productId={productId} commTypes={commTypes} />}
      {tab === "audiences"      && <AudiencesTab productId={productId} />}
    </ModuleLayout>
  );
}
