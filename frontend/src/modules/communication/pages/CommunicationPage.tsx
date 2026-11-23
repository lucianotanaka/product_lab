import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/services/api";

interface CommType { communication_type_id: number; name: string; description?: string; default_format?: string; is_active: boolean; }
interface Template { communication_template_id: number; communication_type_id: number; name: string; description?: string; general_prompt?: string; default_language: string; default_tone?: string; default_detail_level?: string; is_active: boolean; }
interface TplSection { template_section_id: number; communication_template_id: number; section_key: string; title: string; description?: string; generation_prompt?: string; display_order: number; is_required: boolean; target_length?: number; is_active: boolean; }
interface TemplateSampleView { communication_template_id: number; template_name: string; report_kind?: string; format: string; sample_payload: Record<string, unknown>; sample_html: string; }
interface ReportScopeOption { id: string; title: string; item_type?: string; executive_status?: string; }
interface ReportScopeResponse { report_kind: string; export_formats: string[]; opportunities: ReportScopeOption[]; roadmap_items: ReportScopeOption[]; }
interface CommunicationSchedule {
  communication_schedule_id: number;
  communication_id: number;
  recurrence_type: string;
  recurrence_interval: number;
  reference_event?: string;
  publication_offset_days: number;
  day_of_week?: number;
  day_of_month?: number;
  execution_time?: string;
  timezone: string;
  cron_expression?: string;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
}
interface Communication {
  communication_id: number;
  product_id: number;
  communication_type_id: number;
  communication_template_id?: number;
  name: string;
  description?: string;
  objective: string;
  trigger_type: string;
  default_language?: string;
  default_tone?: string;
  default_detail_level?: string;
  report_kind?: string;
  report_scope?: {
    opportunity_ids?: string[];
    roadmap_item_ids?: string[];
    include_epics?: boolean;
    include_features?: boolean;
    include_only_attention?: boolean;
    include_completed?: boolean;
    group_by?: string;
    period_label?: string;
  };
  supported_export_formats?: string[];
  status: string;
  is_active: boolean;
}
interface CommunicationLink {
  communication_link_id: number;
  communication_id: number;
  entity_type: string;
  entity_id: string;
  link_role: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  entity_title?: string;
}
interface CommunicationAudience {
  communication_audience_id: number;
  communication_id: number;
  audience_id: number;
  is_primary: boolean;
  custom_language?: string;
  custom_tone?: string;
  custom_detail_level?: string;
  created_at: string;
  audience_name?: string;
  audience_type?: string;
}
interface Audience { audience_id: number; product_id?: number; name: string; description?: string; audience_type: string; preferred_language?: string; preferred_tone?: string; preferred_detail_level?: string; is_active: boolean; }
interface Publication {
  publication_id: number;
  communication_id: number;
  reference_label?: string;
  title: string;
  subtitle?: string;
  status: string;
  editorial_summary?: string;
  rendered_html?: string;
  export_payload?: Record<string, unknown>;
  version_number: number;
  reference_start_date?: string;
  reference_end_date?: string;
  planned_publication_date?: string;
  published_at?: string;
  owner_name?: string;
  occurrence_kind?: string;
  operational_status?: string;
  due_at?: string;
  occurred_at?: string;
  followup_id?: string;
  meeting_id?: string;
  outcome_summary?: string;
  next_occurrence_date?: string;
  source_reason?: string;
  is_followup_generated?: boolean;
}
interface Section { section_id: number; publication_id: number; template_section_id?: number; section_key: string; title: string; subtitle?: string; current_content?: string; display_order: number; status: string; is_ai_generated: boolean; }
interface PubAudience { publication_audience_id: number; publication_id: number; audience_id: number; is_primary: boolean; custom_language?: string; custom_tone?: string; }
interface AgentExec { agent_execution_id: number; section_id: number; provider?: string; model_name?: string; status: string; generated_content?: string; input_tokens?: number; output_tokens?: number; total_tokens?: number; estimated_cost?: number; execution_time_ms?: number; error_message?: string; created_at: string; }
interface Review { publication_review_id: number; publication_id: number; action: string; comments?: string; performed_by?: number; performed_at: string; }
interface Version { publication_version_id: number; publication_id: number; version_number: number; version_label?: string; change_reason?: string; created_at: string; }
interface Presentation {
  presentation_id: number;
  publication_id: number;
  publication_version_id?: number;
  meeting_id?: string;
  presentation_date: string;
  presented_at?: string;
  presented_by?: number;
  context_label?: string;
  audience_label?: string;
  notes?: string;
  presentation_mode: string;
  status: string;
  created_at: string;
  updated_at: string;
  version_label?: string;
  version_number?: number;
}

const TRIGGER_TYPES = ["MANUAL", "SCHEDULED", "EVENT"];
const TONE_OPTIONS = ["", "Executive", "Strategic", "Operational", "Technical", "Informative", "Analytical", "Inspirational", "Formal", "Friendly", "Neutral"];
const LANG_OPTIONS = ["pt-BR", "en-US", "es-ES"];
const COMM_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];
const PUB_STATUSES = ["DRAFT", "GENERATING", "GENERATED", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "CANCELLED"];
const OCCURRENCE_KINDS = ["SCHEDULED", "EVENT", "MANUAL", "FOLLOW_UP", "ESCALATION"];
const OPERATIONAL_STATUSES = ["PLANNED", "DUE", "IN_PREPARATION", "READY", "PRESENTED", "CANCELLED", "OVERDUE"];
const SEC_STATUSES = ["DRAFT", "GENERATING", "GENERATED", "REVIEWED", "APPROVED", "PUBLISHED"];
const REVIEW_ACTIONS = ["SUBMITTED_FOR_REVIEW", "REVIEWED", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"];
const REPORT_KINDS = ["", "ROADMAP_EXECUTIVE_REPORT"];
const EXPORT_OPTIONS = ["HTML", "PDF", "PPT"];
const RECURRENCE_TYPES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "EVENT", "CRON"];
const WEEKDAY_OPTIONS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const SC: Record<string, string> = {
  DRAFT: "#7899b0", ACTIVE: "#00ff88", INACTIVE: "#ff9900", ARCHIVED: "#555",
  GENERATING: "#c084fc", GENERATED: "#00e5cc", IN_REVIEW: "#ff9900",
  APPROVED: "#00ff88", PUBLISHED: "#00d4ff", CANCELLED: "#ff6b6b", REVIEWED: "#00e5cc",
  RUNNING: "#c084fc", COMPLETED: "#00ff88", FAILED: "#ff6b6b", PENDING: "#7899b0",
  PLANNED: "#7899b0", DUE: "#f59e0b", IN_PREPARATION: "#00d4ff", READY: "#00e5cc",
  PRESENTED: "#00ff88", OVERDUE: "#ff6b6b",
};
const Badge = ({ s }: { s: string }) => <span className="badge" style={{ borderColor: SC[s] ?? "#555", color: SC[s] ?? "#555" }}>{s}</span>;
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtDT = (d?: string) => d ? new Date(d).toLocaleString("pt-BR") : "—";

function MultiSelectList({
  label, options, selected, onToggle, helper,
}: {
  label: string;
  options: ReportScopeOption[];
  selected: string[];
  onToggle: (id: string) => void;
  helper?: string;
}) {
  return (
    <div className="mod-field">
      <label className="mod-field__label">{label}</label>
      {helper && <div style={{ color: "#7899b0", fontSize: 10, marginBottom: 6 }}>{helper}</div>}
      <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid rgba(0,212,255,0.18)", padding: 10, background: "rgba(2,12,24,0.35)" }}>
        {options.length === 0 ? <div style={{ color: "#7899b0", fontSize: 11 }}>Nenhuma opção disponível.</div> : options.map(option => (
          <label key={option.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <input type="checkbox" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
            <span style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "#d6f3ff", fontSize: 11 }}>{option.title}</span>
              {(option.item_type || option.executive_status) && (
                <span style={{ color: "#7899b0", fontSize: 9 }}>{[option.item_type, option.executive_status].filter(Boolean).join(" • ")}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ExportPayloadModal({ title, content, onClose }: { title: string; content: unknown; onClose: () => void }) {
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 960, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// EXPORT //</span><h3 className="mod-modal__title">{title}</h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          <pre style={{ whiteSpace: "pre-wrap", color: "#d6f3ff", fontSize: 11, margin: 0 }}>{typeof content === "string" ? content : JSON.stringify(content, null, 2)}</pre>
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}

function ExecutionsModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const [items, setItems] = useState<AgentExec[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    apiGet<AgentExec[]>(`/communication/sections/${section.section_id}/executions`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [section.section_id]);
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 900, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// HISTÓRICO IA //</span><h3 className="mod-modal__title">{section.title} <span>— EXECUÇÕES</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM EXECUÇÕES</div></div> : (
            <table className="mod-table">
              <thead><tr><th>DATA</th><th>MODELO</th><th>STATUS</th><th>TOKENS</th><th>CUSTO</th><th>TEMPO</th><th>CONTEÚDO</th></tr></thead>
              <tbody>{items.map(e => (
                <tr key={e.agent_execution_id}>
                  <td style={{ fontSize: 10, color: "#7899b0" }}>{fmtDT(e.created_at)}</td>
                  <td style={{ fontSize: 10 }}>{e.provider}/{e.model_name}</td>
                  <td><Badge s={e.status} /></td>
                  <td style={{ fontSize: 10, color: "#7899b0" }}>{e.total_tokens ?? "-"}</td>
                  <td style={{ fontSize: 10, color: "#7899b0" }}>{e.estimated_cost ? `$${e.estimated_cost}` : "-"}</td>
                  <td style={{ fontSize: 10, color: "#7899b0" }}>{e.execution_time_ms ? `${e.execution_time_ms}ms` : "-"}</td>
                  <td style={{ maxWidth: 200, fontSize: 10, color: "#7899b0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.status === "FAILED" ? <span style={{ color: "#ff6b6b" }}>{e.error_message}</span> : (e.generated_content?.slice(0, 80) ?? "-")}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}

function SectionsModal({ pub, onClose }: { pub: Publication; onClose: () => void }) {
  const [items, setItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [sel, setSel] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [reviewAction, setReviewAction] = useState("SUBMITTED_FOR_REVIEW");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [execModal, setExecModal] = useState<Section | null>(null);
  const [extraCtx, setExtraCtx] = useState("");
  const EMPTY = { section_key: "", title: "", subtitle: "", current_content: "", display_order: items.length, status: "DRAFT" };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try { const r = await apiGet<Section[]>(`/communication/publications/${pub.publication_id}/sections`); setItems(r); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [pub.publication_id]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.section_key.trim()) return;
    setSaving(true);
    try {
      if (modal === "create") await apiPost(`/communication/publications/${pub.publication_id}/sections`, form);
      else if (sel) await apiPatch(`/communication/sections/${sel.section_id}`, form);
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir seção?")) return;
    try { await apiDelete(`/communication/sections/${id}`); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const handleGenerate = async (s: Section) => {
    setGenerating(s.section_id);
    try { await apiPost(`/communication/sections/${s.section_id}/generate`, { extra_context: extraCtx || null }); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setGenerating(null); }
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    for (const s of items) {
      try { await apiPost(`/communication/sections/${s.section_id}/generate`, { extra_context: extraCtx || null }); } catch { }
    }
    setGeneratingAll(false);
    load();
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try { await apiPost(`/communication/publications/${pub.publication_id}/reviews`, { action: reviewAction, comments: reviewComment || null }); setReviewComment(""); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setSubmittingReview(false); }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 960, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// PUBLICAÇÃO: {pub.reference_label ?? `#${pub.publication_id}`} //</span><h3 className="mod-modal__title">{pub.title} <span>— SEÇÕES</span></h3></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Badge s={pub.status} /><button className="mod-modal__close" onClick={onClose}>✕</button></div>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4 }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0" }}>REVISÃO:</span>
            <select className="mod-select" style={{ flex: 1, fontSize: 11 }} value={reviewAction} onChange={e => setReviewAction(e.target.value)}>{REVIEW_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}</select>
            <input className="mod-input" style={{ flex: 2, fontSize: 11 }} value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Comentário (opcional)" />
            <button className="btn-save" onClick={submitReview} disabled={submittingReview}>{submittingReview ? "..." : "REGISTRAR ⟩"}</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 4 }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: "#c084fc" }}>🤖 IA:</span>
            <input className="mod-input" style={{ flex: 3, fontSize: 11 }} value={extraCtx} onChange={e => setExtraCtx(e.target.value)} placeholder="Contexto adicional para a IA (opcional)" />
            <button className="btn-save" style={{ background: "rgba(192,132,252,0.15)", borderColor: "rgba(192,132,252,0.5)", color: "#c084fc" }} onClick={handleGenerateAll} disabled={generatingAll || items.length === 0}>{generatingAll ? "GERANDO..." : "GERAR TODAS ⟩"}</button>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}><button className="btn-add" onClick={() => { setForm({ ...EMPTY, display_order: items.length }); setSel(null); setModal("create"); }}>+ NOVA SEÇÃO</button></div>
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">SEM SEÇÕES</div></div> : (
            <table className="mod-table">
              <thead><tr><th>#</th><th>KEY</th><th>TÍTULO</th><th>STATUS</th><th>IA</th><th></th></tr></thead>
              <tbody>{items.map(s => (
                <tr key={s.section_id}>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{s.display_order}</td>
                  <td><span className="badge badge--info" style={{ fontSize: 9 }}>{s.section_key}</span></td>
                  <td><strong>{s.title}</strong>{s.current_content && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{s.current_content.slice(0, 60)}…</div>}</td>
                  <td><Badge s={s.status} /></td>
                  <td style={{ color: s.is_ai_generated ? "#c084fc" : "#555", fontSize: 11 }}>{s.is_ai_generated ? "SIM" : "—"}</td>
                  <td><div className="row-actions">
                    <button className="btn-icon" style={{ color: "#c084fc", borderColor: "rgba(192,132,252,0.4)" }} onClick={() => handleGenerate(s)} disabled={generating === s.section_id}>{generating === s.section_id ? "..." : "🤖 GERAR"}</button>
                    <button className="btn-icon" onClick={() => setExecModal(s)}>HIST.</button>
                    <button className="btn-icon" onClick={() => { setForm({ section_key: s.section_key, title: s.title, subtitle: s.subtitle ?? "", current_content: s.current_content ?? "", display_order: s.display_order, status: s.status }); setSel(s); setModal("edit"); }}>EDITAR</button>
                    <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(s.section_id)}>DEL</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
      {modal && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// SEÇÃO //</span><h3 className="mod-modal__title">{modal === "create" ? "NOVA" : "EDITAR"} <span>SEÇÃO</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">SECTION KEY *</label><input className="mod-input" value={form.section_key} onChange={e => setForm(f => ({ ...f, section_key: e.target.value.toUpperCase().replace(/ /g, "_") }))} /></div>
                <div className="mod-field"><label className="mod-field__label">ORDEM</label><input className="mod-input" type="number" min="0" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">SUBTÍTULO</label><input className="mod-input" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">CONTEÚDO</label><textarea className="mod-textarea" rows={6} value={form.current_content} onChange={e => setForm(f => ({ ...f, current_content: e.target.value }))} /></div>
              {modal === "edit" && <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{SEC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim() || !form.section_key.trim()}>{saving ? "SALVANDO..." : "SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
      {execModal && <ExecutionsModal section={execModal} onClose={() => setExecModal(null)} />}
    </div>
  );
}

function VersionsModal({ pub, onClose }: { pub: Publication; onClose: () => void }) {
  const [items, setItems] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = () => { setLoading(true); apiGet<Version[]>(`/communication/publications/${pub.publication_id}/versions`).then(setItems).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [pub.publication_id]);
  const snap = async () => { setSaving(true); try { await apiPost(`/communication/publications/${pub.publication_id}/versions`, {}); load(); } catch { } finally { setSaving(false); } };
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 700, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// VERSÕES //</span><h3 className="mod-modal__title">{pub.title} <span>— HISTÓRICO</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div>
        <div className="mod-modal__body">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}><button className="btn-add" onClick={snap} disabled={saving}>{saving ? "..." : "+ SNAPSHOT"}</button></div>
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">SEM VERSÕES</div></div> : (
            <table className="mod-table"><thead><tr><th>VERSÃO</th><th>DATA</th><th>MOTIVO</th></tr></thead>
              <tbody>{items.map(v => <tr key={v.publication_version_id}><td><strong>{v.version_label ?? `v${v.version_number}`}</strong></td><td style={{ fontSize: 10, color: "#7899b0" }}>{fmtDT(v.created_at)}</td><td style={{ fontSize: 10, color: "#7899b0" }}>{v.change_reason ?? "-"}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}

function ReviewsHistoryModal({ pub, onClose }: { pub: Publication; onClose: () => void }) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setLoading(true); apiGet<Review[]>(`/communication/publications/${pub.publication_id}/reviews`).then(setItems).catch(() => {}).finally(() => setLoading(false)); }, [pub.publication_id]);
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 700, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// REVISÕES //</span><h3 className="mod-modal__title">{pub.title} <span>— HISTÓRICO</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div>
        <div className="mod-modal__body">
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM REVISÕES</div></div> : (
            <table className="mod-table"><thead><tr><th>DATA</th><th>AÇÃO</th><th>COMENTÁRIO</th></tr></thead>
              <tbody>{items.map(r => <tr key={r.publication_review_id}><td style={{ fontSize: 10, color: "#7899b0" }}>{fmtDT(r.performed_at)}</td><td><Badge s={r.action} /></td><td style={{ fontSize: 10, color: "#7899b0" }}>{r.comments ?? "-"}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}

function PresentationHistoryModal({ pub, onClose }: { pub: Publication; onClose: () => void }) {
  const [items, setItems] = useState<Presentation[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [sel, setSel] = useState<Presentation | null>(null);
  const EMPTY = {
    publication_version_id: "",
    meeting_id: "",
    presentation_date: "",
    presented_at: "",
    context_label: "",
    audience_label: "",
    notes: "",
    presentation_mode: "LIVE",
    status: "COMPLETED",
  };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try {
      const [presentations, publicationVersions] = await Promise.all([
        apiGet<Presentation[]>(`/communication/publications/${pub.publication_id}/presentations`),
        apiGet<Version[]>(`/communication/publications/${pub.publication_id}/versions`),
      ]);
      setItems(presentations);
      setVersions(publicationVersions);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [pub.publication_id]);

  const handleSave = async () => {
    if (!form.presentation_date) return;
    setSaving(true);
    try {
      const body = {
        publication_version_id: form.publication_version_id ? Number(form.publication_version_id) : null,
        meeting_id: form.meeting_id || null,
        presentation_date: form.presentation_date,
        presented_at: form.presented_at || null,
        context_label: form.context_label || null,
        audience_label: form.audience_label || null,
        notes: form.notes || null,
        presentation_mode: form.presentation_mode,
        status: form.status,
      };
      if (modal === "create") await apiPost(`/communication/publications/${pub.publication_id}/presentations`, body);
      else if (sel) await apiPatch(`/communication/presentations/${sel.presentation_id}`, body);
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (presentationId: number) => {
    if (!confirm("Excluir apresentação?")) return;
    try {
      await apiDelete(`/communication/presentations/${presentationId}`);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 980, width: "96vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// APRESENTAÇÕES //</span><h3 className="mod-modal__title">{pub.title} <span>— HISTÓRICO</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ color: "#7899b0", fontSize: 10 }}>Registre em qual data este relatório foi apresentado e qual versão foi utilizada.</div>
            <button className="btn-add" onClick={() => { setForm({ ...EMPTY, presentation_date: new Date().toISOString().slice(0, 10) }); setSel(null); setModal("create"); }}>+ NOVA APRESENTAÇÃO</button>
          </div>
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">▣</div><div className="mod-empty__title">SEM APRESENTAÇÕES</div></div> : (
            <table className="mod-table">
              <thead><tr><th>DATA</th><th>VERSÃO</th><th>CONTEXTO</th><th>PÚBLICO</th><th>MODO</th><th>STATUS</th><th></th></tr></thead>
              <tbody>{items.map(p => (
                <tr key={p.presentation_id}>
                  <td><strong>{fmtDate(p.presentation_date)}</strong>{p.presented_at && <div style={{ fontSize: 10, color: "#7899b0" }}>{fmtDT(p.presented_at)}</div>}</td>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{p.version_label ?? (p.version_number ? `v${p.version_number}` : "—")}</td>
                  <td><strong>{p.context_label ?? "—"}</strong>{p.meeting_id && <div style={{ fontSize: 10, color: "#7899b0" }}>Meeting: {p.meeting_id}</div>}</td>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{p.audience_label ?? "—"}</td>
                  <td><span className="badge badge--info">{p.presentation_mode}</span></td>
                  <td><Badge s={p.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" onClick={() => {
                        setForm({
                          publication_version_id: p.publication_version_id ? String(p.publication_version_id) : "",
                          meeting_id: p.meeting_id ?? "",
                          presentation_date: p.presentation_date ?? "",
                          presented_at: p.presented_at ? new Date(p.presented_at).toISOString().slice(0, 16) : "",
                          context_label: p.context_label ?? "",
                          audience_label: p.audience_label ?? "",
                          notes: p.notes ?? "",
                          presentation_mode: p.presentation_mode,
                          status: p.status,
                        });
                        setSel(p);
                        setModal("edit");
                      }}>EDITAR</button>
                      <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(p.presentation_id)}>DEL</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>

      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" style={{ maxWidth: 760, width: "95vw" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// APRESENTAÇÃO //</span><h3 className="mod-modal__title">{modal === "create" ? "NOVA" : "EDITAR"} <span>APRESENTAÇÃO</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">DATA *</label><input className="mod-input" type="date" value={form.presentation_date} onChange={e => setForm(f => ({ ...f, presentation_date: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">DATA/HORA</label><input className="mod-input" type="datetime-local" value={form.presented_at} onChange={e => setForm(f => ({ ...f, presented_at: e.target.value }))} /></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">VERSÃO APRESENTADA</label><select className="mod-select" value={form.publication_version_id} onChange={e => setForm(f => ({ ...f, publication_version_id: e.target.value }))}><option value="">— Sem vínculo —</option>{versions.map(v => <option key={v.publication_version_id} value={v.publication_version_id}>{v.version_label ?? `v${v.version_number}`}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">MEETING ID</label><input className="mod-input" value={form.meeting_id} onChange={e => setForm(f => ({ ...f, meeting_id: e.target.value }))} placeholder="Opcional" /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">CONTEXTO</label><input className="mod-input" value={form.context_label} onChange={e => setForm(f => ({ ...f, context_label: e.target.value }))} placeholder="Ex: Reunião com Danilo" /></div>
              <div className="mod-field"><label className="mod-field__label">PÚBLICO</label><input className="mod-input" value={form.audience_label} onChange={e => setForm(f => ({ ...f, audience_label: e.target.value }))} placeholder="Ex: Diretoria / Steering Committee" /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">MODO</label><select className="mod-select" value={form.presentation_mode} onChange={e => setForm(f => ({ ...f, presentation_mode: e.target.value }))}>{["LIVE", "HTML", "PDF", "PPT", "OTHER"].map(mode => <option key={mode} value={mode}>{mode}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{["PLANNED", "COMPLETED", "CANCELLED"].map(status => <option key={status} value={status}>{status}</option>)}</select></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">OBSERVAÇÕES</label><textarea className="mod-textarea" rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.presentation_date}>{saving ? "SALVANDO..." : "SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicationAudiencesModal({ pub, productId, onClose }: { pub: Publication; productId: string; onClose: () => void }) {
  const [linked, setLinked] = useState<PubAudience[]>([]);
  const [available, setAvail] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(false);
  const [selId, setSelId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const loadLinked = async () => { const r = await apiGet<PubAudience[]>(`/communication/publications/${pub.publication_id}/audiences`); setLinked(r); };
  const loadAvail = async () => { const qs = productId ? `?product_id=${productId}` : ""; const r = await apiGet<{ items: Audience[] }>(`/communication/audiences${qs}`); setAvail(r.items); };
  useEffect(() => { setLoading(true); Promise.all([loadLinked(), loadAvail()]).finally(() => setLoading(false)); }, [pub.publication_id, productId]);
  const linkedIds = new Set(linked.map(l => l.audience_id));
  const handleAdd = async () => {
    if (!selId) return;
    setAdding(true);
    try { await apiPost(`/communication/publications/${pub.publication_id}/audiences`, { audience_id: Number(selId), is_primary: isPrimary }); setSelId(""); setIsPrimary(false); await loadLinked(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setAdding(false); }
  };
  const handleRemove = async (aid: number) => {
    try { await apiDelete(`/communication/publications/${pub.publication_id}/audiences/${aid}`); await loadLinked(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 640, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// AUDIÊNCIAS //</span><h3 className="mod-modal__title">{pub.title} <span>— PÚBLICO</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          {loading ? <div className="mod-loading">CARREGANDO...</div> : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4 }}>
                <select className="mod-select" style={{ flex: 3, fontSize: 11 }} value={selId} onChange={e => setSelId(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {available.filter(a => !linkedIds.has(a.audience_id)).map(a => <option key={a.audience_id} value={a.audience_id}>{a.name} ({a.audience_type})</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, letterSpacing: 1, color: "#7899b0", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />PRIMÁRIA
                </label>
                <button className="btn-save" onClick={handleAdd} disabled={adding || !selId}>{adding ? "..." : "ADICIONAR ⟩"}</button>
              </div>
              {linked.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM AUDIÊNCIAS VINCULADAS</div></div> : (
                <table className="mod-table"><thead><tr><th>AUDIÊNCIA</th><th>TIPO</th><th>PRIMÁRIA</th><th></th></tr></thead>
                  <tbody>{linked.map(la => {
                    const aud = available.find(a => a.audience_id === la.audience_id);
                    return (
                      <tr key={la.publication_audience_id}>
                        <td><strong>{aud?.name ?? `#${la.audience_id}`}</strong></td>
                        <td><span className="badge badge--info">{aud?.audience_type ?? "—"}</span></td>
                        <td style={{ textAlign: "center" }}>{la.is_primary ? <span style={{ color: "#00ff88" }}>★</span> : "—"}</td>
                        <td><button className="btn-icon btn-icon--danger" onClick={() => handleRemove(la.audience_id)}>REMOVER</button></td>
                      </tr>
                    );
                  })}</tbody>
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

function CommunicationAudiencesModal({ communication, productId, onClose }: { communication: Communication; productId: string; onClose: () => void }) {
  const [linked, setLinked] = useState<CommunicationAudience[]>([]);
  const [available, setAvailable] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selId, setSelId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const qs = productId ? `?product_id=${productId}` : "";
      const [linkedRows, audiences] = await Promise.all([
        apiGet<CommunicationAudience[]>(`/communication/${communication.communication_id}/audiences`),
        apiGet<{ items: Audience[] }>(`/communication/audiences${qs}`),
      ]);
      setLinked(linkedRows);
      setAvailable(audiences.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [communication.communication_id, productId]);

  const linkedIds = new Set(linked.map(item => item.audience_id));

  const handleAdd = async () => {
    if (!selId) return;
    setAdding(true);
    try {
      await apiPost(`/communication/${communication.communication_id}/audiences`, {
        audience_id: Number(selId),
        is_primary: isPrimary,
      });
      setSelId("");
      setIsPrimary(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (audienceId: number) => {
    try {
      await apiDelete(`/communication/${communication.communication_id}/audiences/${audienceId}`);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 760, width: "95vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// AUDIENCES //</span><h3 className="mod-modal__title">{communication.name} <span>— PÚBLICO PADRÃO</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          {loading ? <div className="mod-loading">CARREGANDO...</div> : (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4 }}>
                <select className="mod-select" style={{ flex: 3, fontSize: 11 }} value={selId} onChange={e => setSelId(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {available.filter(a => !linkedIds.has(a.audience_id)).map(a => <option key={a.audience_id} value={a.audience_id}>{a.name} ({a.audience_type})</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, letterSpacing: 1, color: "#7899b0", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />PRIMÁRIA
                </label>
                <button className="btn-save" onClick={handleAdd} disabled={adding || !selId}>{adding ? "..." : "ADICIONAR ⟩"}</button>
              </div>

              {linked.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">SEM AUDIENCES VINCULADAS</div></div> : (
                <table className="mod-table">
                  <thead><tr><th>AUDIENCE</th><th>TIPO</th><th>PRIMÁRIA</th><th></th></tr></thead>
                  <tbody>{linked.map(item => (
                    <tr key={item.communication_audience_id}>
                      <td><strong>{item.audience_name ?? `#${item.audience_id}`}</strong></td>
                      <td><span className="badge badge--info">{item.audience_type ?? "—"}</span></td>
                      <td style={{ textAlign: "center" }}>{item.is_primary ? <span style={{ color: "#00ff88" }}>★</span> : "—"}</td>
                      <td><button className="btn-icon btn-icon--danger" onClick={() => handleRemove(item.audience_id)}>REMOVER</button></td>
                    </tr>
                  ))}</tbody>
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

function CommunicationLinksModal({ communication, productId, onClose }: { communication: Communication; productId: string; onClose: () => void }) {
  const [items, setItems] = useState<CommunicationLink[]>([]);
  const [scopeOptions, setScopeOptions] = useState<ReportScopeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const EMPTY = { entity_type: "OPPORTUNITY", entity_id: "", link_role: "RELATED", is_primary: false, notes: "" };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try {
      const [links, scopes] = await Promise.all([
        apiGet<CommunicationLink[]>(`/communication/${communication.communication_id}/links`),
        productId ? apiGet<ReportScopeResponse>(`/communication/report-scopes/roadmap?product_id=${productId}`) : Promise.resolve(null),
      ]);
      setItems(links);
      setScopeOptions(scopes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [communication.communication_id, productId]);

  const entityOptions = form.entity_type === "ROADMAP_ITEM"
    ? (scopeOptions?.roadmap_items ?? [])
    : (scopeOptions?.opportunities ?? []);

  const handleSave = async () => {
    if (!form.entity_id) return;
    setSaving(true);
    try {
      await apiPost(`/communication/${communication.communication_id}/links`, {
        entity_type: form.entity_type,
        entity_id: form.entity_id,
        link_role: form.link_role,
        is_primary: form.is_primary,
        notes: form.notes || null,
      });
      setForm({ ...EMPTY, entity_type: form.entity_type });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (linkId: number) => {
    if (!confirm("Excluir vínculo?")) return;
    try {
      await apiDelete(`/communication/links/${linkId}`);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  const handlePromote = async (link: CommunicationLink) => {
    try {
      await apiPatch(`/communication/links/${link.communication_link_id}`, { is_primary: true });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 920, width: "96vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// VÍNCULOS //</span><h3 className="mod-modal__title">{communication.name} <span>— CONTEXTO DE NEGÓCIO</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          <div style={{ display: "grid", gap: 10, marginBottom: 14, padding: "10px 12px", border: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.04)", borderRadius: 4 }}>
            <div className="mod-field-row">
              <div className="mod-field">
                <label className="mod-field__label">TIPO</label>
                <select className="mod-select" value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value, entity_id: "" }))}>
                  <option value="OPPORTUNITY">OPPORTUNITY</option>
                  <option value="ROADMAP_ITEM">ROADMAP ITEM</option>
                </select>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">PAPEL</label>
                <select className="mod-select" value={form.link_role} onChange={e => setForm(f => ({ ...f, link_role: e.target.value }))}>
                  {["PRIMARY", "RELATED", "SOURCE", "TARGET"].map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            </div>
            <div className="mod-field">
              <label className="mod-field__label">ENTIDADE</label>
              <select className="mod-select" value={form.entity_id} onChange={e => setForm(f => ({ ...f, entity_id: e.target.value }))}>
                <option value="">— Selecione —</option>
                {entityOptions.map(option => <option key={`${form.entity_type}-${option.id}`} value={option.id}>{option.title}</option>)}
              </select>
            </div>
            <div className="mod-field">
              <label className="mod-field__label">OBSERVAÇÕES</label>
              <input className="mod-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={form.is_primary} onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))} />
              Marcar como vínculo principal
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.entity_id}>{saving ? "SALVANDO..." : "ADICIONAR VÍNCULO ⟩"}</button>
            </div>
          </div>

          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">SEM VÍNCULOS</div></div> : (
            <table className="mod-table">
              <thead><tr><th>TIPO</th><th>ENTIDADE</th><th>PAPEL</th><th>PRINCIPAL</th><th>OBS.</th><th></th></tr></thead>
              <tbody>{items.map(link => (
                <tr key={link.communication_link_id}>
                  <td><span className="badge badge--info">{link.entity_type}</span></td>
                  <td><strong>{link.entity_title ?? link.entity_id}</strong><div style={{ fontSize: 10, color: "#7899b0" }}>{link.entity_id}</div></td>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{link.link_role}</td>
                  <td style={{ textAlign: "center" }}>{link.is_primary ? <span style={{ color: "#00ff88" }}>★</span> : <button className="btn-icon" onClick={() => handlePromote(link)}>TORNAR</button>}</td>
                  <td style={{ color: "#7899b0", fontSize: 11 }}>{link.notes ?? "—"}</td>
                  <td><button className="btn-icon btn-icon--danger" onClick={() => handleRemove(link.communication_link_id)}>DEL</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>
    </div>
  );
}

function SchedulePanel({
  communicationId,
  triggerType,
}: {
  communicationId?: number;
  triggerType: string;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const EMPTY = {
    recurrence_type: "WEEKLY",
    recurrence_interval: 1,
    reference_event: "",
    publication_offset_days: 0,
    day_of_week: "1",
    day_of_month: "",
    execution_time: "09:00",
    timezone: "America/Sao_Paulo",
    cron_expression: "",
    starts_at: "",
    ends_at: "",
    is_active: true,
  };
  const [form, setForm] = useState({ ...EMPTY });
  const [hasSchedule, setHasSchedule] = useState(false);

  useEffect(() => {
    if (!communicationId) {
      setLoaded(true);
      setHasSchedule(false);
      setForm({ ...EMPTY });
      return;
    }
    setLoading(true);
    apiGet<CommunicationSchedule | null>(`/communication/${communicationId}/schedule`)
      .then(schedule => {
        if (schedule) {
          setHasSchedule(true);
          setForm({
            recurrence_type: schedule.recurrence_type ?? "WEEKLY",
            recurrence_interval: schedule.recurrence_interval ?? 1,
            reference_event: schedule.reference_event ?? "",
            publication_offset_days: schedule.publication_offset_days ?? 0,
            day_of_week: schedule.day_of_week !== undefined && schedule.day_of_week !== null ? String(schedule.day_of_week) : "1",
            day_of_month: schedule.day_of_month !== undefined && schedule.day_of_month !== null ? String(schedule.day_of_month) : "",
            execution_time: schedule.execution_time ?? "09:00",
            timezone: schedule.timezone ?? "America/Sao_Paulo",
            cron_expression: schedule.cron_expression ?? "",
            starts_at: schedule.starts_at ?? "",
            ends_at: schedule.ends_at ?? "",
            is_active: schedule.is_active ?? true,
          });
        } else {
          setHasSchedule(false);
          setForm({ ...EMPTY });
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [communicationId]);

  const showWeekday = ["WEEKLY"].includes(form.recurrence_type);
  const showMonthday = ["MONTHLY", "QUARTERLY", "YEARLY"].includes(form.recurrence_type);
  const showReferenceEvent = form.recurrence_type === "EVENT";
  const showCron = form.recurrence_type === "CRON";

  const handleSave = async () => {
    if (!communicationId) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        recurrence_type: form.recurrence_type,
        recurrence_interval: Number(form.recurrence_interval) || 1,
        reference_event: showReferenceEvent ? (form.reference_event || null) : null,
        publication_offset_days: Number(form.publication_offset_days) || 0,
        day_of_week: showWeekday ? Number(form.day_of_week) : null,
        day_of_month: showMonthday && form.day_of_month ? Number(form.day_of_month) : null,
        execution_time: showCron ? null : (form.execution_time || null),
        timezone: form.timezone || "America/Sao_Paulo",
        cron_expression: showCron ? (form.cron_expression || null) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active,
      };
      if (hasSchedule) await apiPatch(`/communication/${communicationId}/schedule`, body);
      else await apiPost(`/communication/${communicationId}/schedule`, body);
      setHasSchedule(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!communicationId || !hasSchedule || !confirm("Remover agendamento desta communication?")) return;
    setDeleting(true);
    setError("");
    try {
      await apiDelete(`/communication/${communicationId}/schedule`);
      setHasSchedule(false);
      setForm({ ...EMPTY });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", margin: "16px 0 12px", paddingTop: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>◉ FREQUÊNCIA / AGENDAMENTO</div>
      <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4, color: "#7899b0", fontSize: 10 }}>
        Defina quando esta communication deve ocorrer. O agendamento orienta a criação futura das ocorrências/publications e permite gerar follow-ups com contexto operacional.
      </div>
      {!communicationId && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, color: "#f59e0b", fontSize: 10 }}>
          Salve a communication primeiro para registrar o agendamento operacional.
        </div>
      )}
      {triggerType !== "SCHEDULED" && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 4, color: "#c084fc", fontSize: 10 }}>
          O trigger atual está como <strong>{triggerType}</strong>. Para uma rotina recorrente, o recomendado é usar <strong>SCHEDULED</strong>.
        </div>
      )}
      {error && <div className="mod-error">⚠ {error}</div>}
      {loading && !loaded ? <div className="mod-loading">CARREGANDO AGENDAMENTO...</div> : (
        <>
          <div className="mod-field-row">
            <div className="mod-field">
              <label className="mod-field__label">RECORRÊNCIA</label>
              <select className="mod-select" value={form.recurrence_type} onChange={e => setForm(f => ({ ...f, recurrence_type: e.target.value }))}>
                {RECURRENCE_TYPES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="mod-field">
              <label className="mod-field__label">INTERVALO</label>
              <input className="mod-input" type="number" min="1" value={form.recurrence_interval} onChange={e => setForm(f => ({ ...f, recurrence_interval: Number(e.target.value) || 1 }))} />
            </div>
          </div>

          <div className="mod-field-row">
            <div className="mod-field">
              <label className="mod-field__label">OFFSET DA PUBLICAÇÃO (dias)</label>
              <input className="mod-input" type="number" value={form.publication_offset_days} onChange={e => setForm(f => ({ ...f, publication_offset_days: Number(e.target.value) || 0 }))} />
            </div>
            <div className="mod-field">
              <label className="mod-field__label">TIMEZONE</label>
              <input className="mod-input" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} />
            </div>
          </div>

          {(showWeekday || showMonthday) && (
            <div className="mod-field-row">
              {showWeekday && (
                <div className="mod-field">
                  <label className="mod-field__label">DIA DA SEMANA</label>
                  <select className="mod-select" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                    {WEEKDAY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              )}
              {showMonthday && (
                <div className="mod-field">
                  <label className="mod-field__label">DIA DO MÊS</label>
                  <input className="mod-input" type="number" min="1" max="31" value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} />
                </div>
              )}
            </div>
          )}

          <div className="mod-field-row">
            {!showCron && (
              <div className="mod-field">
                <label className="mod-field__label">HORÁRIO</label>
                <input className="mod-input" type="time" value={form.execution_time} onChange={e => setForm(f => ({ ...f, execution_time: e.target.value }))} />
              </div>
            )}
            {showReferenceEvent && (
              <div className="mod-field">
                <label className="mod-field__label">EVENTO DE REFERÊNCIA</label>
                <input className="mod-input" value={form.reference_event} onChange={e => setForm(f => ({ ...f, reference_event: e.target.value }))} placeholder="Ex: fechamento mensal, steering committee" />
              </div>
            )}
            {showCron && (
              <div className="mod-field">
                <label className="mod-field__label">CRON</label>
                <input className="mod-input" value={form.cron_expression} onChange={e => setForm(f => ({ ...f, cron_expression: e.target.value }))} placeholder="0 9 * * 1" />
              </div>
            )}
          </div>

          <div className="mod-field-row">
            <div className="mod-field">
              <label className="mod-field__label">INÍCIO DA VIGÊNCIA</label>
              <input className="mod-input" type="date" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div className="mod-field">
              <label className="mod-field__label">FIM DA VIGÊNCIA</label>
              <input className="mod-input" type="date" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>

          <div className="mod-field-row">
            <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Agendamento ativo
            </label>
          </div>

          <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(2,12,24,0.35)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, color: "#7899b0", fontSize: 10 }}>
            <strong style={{ color: "#d6f3ff" }}>Regra operacional:</strong> este schedule define a cadência da communication; as ocorrências/publications representam execuções concretas dessa rotina; quando houver data planejada, o sistema pode gerar follow-up automaticamente.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn-cancel" onClick={handleDelete} disabled={!communicationId || !hasSchedule || deleting}>{deleting ? "REMOVENDO..." : "REMOVER AGENDAMENTO"}</button>
            <button className="btn-save" onClick={handleSave} disabled={!communicationId || saving}>{saving ? "SALVANDO..." : hasSchedule ? "ATUALIZAR AGENDAMENTO ⟩" : "SALVAR AGENDAMENTO ⟩"}</button>
          </div>
        </>
      )}
    </div>
  );
}

function PublicationsModal({ communication, onClose }: { communication: Communication; onClose: () => void }) {
  const [items, setItems] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "sections" | "audiences" | "versions" | "reviews" | "presentations" | null>(null);
  const [sel, setSel] = useState<Publication | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ title: string; content: unknown } | null>(null);
  const EMPTY = {
    title: "",
    subtitle: "",
    reference_label: "",
    editorial_summary: "",
    reference_start_date: "",
    reference_end_date: "",
    planned_publication_date: "",
    status: "DRAFT",
    owner_name: "",
    occurrence_kind: "SCHEDULED",
    operational_status: "PLANNED",
    due_at: "",
    next_occurrence_date: "",
    source_reason: "",
    outcome_summary: "",
    meeting_id: "",
  };
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    try { const r = await apiGet<{ total: number; items: Publication[] }>(`/communication/${communication.communication_id}/publications?size=50`); setItems(r.items); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [communication.communication_id]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const clean = (v: string) => v || null;
      const body = {
        title: form.title,
        subtitle: clean(form.subtitle),
        reference_label: clean(form.reference_label),
        editorial_summary: clean(form.editorial_summary),
        reference_start_date: clean(form.reference_start_date),
        reference_end_date: clean(form.reference_end_date),
        planned_publication_date: clean(form.planned_publication_date),
        status: form.status,
        communication_id: communication.communication_id,
        auto_generate_from_scope: Boolean(communication.report_kind),
        owner_name: clean(form.owner_name),
        occurrence_kind: form.occurrence_kind,
        operational_status: form.operational_status,
        due_at: clean(form.due_at),
        next_occurrence_date: clean(form.next_occurrence_date),
        source_reason: clean(form.source_reason),
        outcome_summary: clean(form.outcome_summary),
        meeting_id: clean(form.meeting_id),
      };
      if (modal === "create") await apiPost(`/communication/${communication.communication_id}/publications`, body);
      else if (sel) await apiPatch(`/communication/publications/${sel.publication_id}`, body);
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir publicação?")) return;
    try { await apiDelete(`/communication/publications/${id}`); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const handleSync = async (p: Publication) => {
    try { await apiPost(`/communication/publications/${p.publication_id}/sync-report`, {}); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
  };

  const handleExport = async (p: Publication, format: string) => {
    try {
      const result = await apiGet<{ content: unknown }>(`/communication/publications/${p.publication_id}/export/${format}`);
      setPreview({ title: `${p.title} — ${format}`, content: result.content });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 1180, width: "97vw" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// PUBLICAÇÕES //</span><h3 className="mod-modal__title">{communication.name} <span>— OCORRÊNCIAS</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">
          {error && <div className="mod-error">⚠ {error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ color: "#7899b0", fontSize: 10 }}>{communication.report_kind ? `Report prebuilt: ${communication.report_kind}` : "Publication mode editorial/manual"}</div>
              <div style={{ color: "#7899b0", fontSize: 10 }}>Cada publicação preserva o snapshot salvo do relatório, permitindo consultar depois exatamente os dados, o conteúdo e os resultados daquele momento.</div>
            </div>
            <button className="btn-add" onClick={() => { setForm({ ...EMPTY }); setSel(null); setModal("create"); }}>+ NOVA PUBLICAÇÃO</button>
          </div>
          {loading ? <div className="mod-loading">CARREGANDO...</div> : items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">SEM OCORRÊNCIAS</div></div> : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map(p => (
                <div key={p.publication_id} style={{ border: "1px solid rgba(0,212,255,0.14)", borderRadius: 8, background: "rgba(2,12,24,0.28)", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 16 }}>{p.title}</strong>
                        <Badge s={p.operational_status ?? "PLANNED"} />
                        <span className="badge badge--info">{p.occurrence_kind ?? "—"}</span>
                      </div>
                      {p.subtitle && <div style={{ fontSize: 11, color: "#7899b0" }}>{p.subtitle}</div>}
                      {p.reference_label && <div style={{ fontSize: 10, color: "#7899b0" }}>Ref: {p.reference_label}</div>}
                    </div>
                    <div style={{ color: "#7899b0", fontSize: 11 }}>v{p.version_number}</div>
                  </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
                      <div><div style={{ color: "#7899b0", fontSize: 9, letterSpacing: 1 }}>RESPONSÁVEL</div><div style={{ color: "#d6f3ff", fontSize: 11 }}>{p.owner_name ?? "—"}</div></div>
                      <div><div style={{ color: "#7899b0", fontSize: 9, letterSpacing: 1 }}>DATA PLANEJADA</div><div style={{ color: "#d6f3ff", fontSize: 11 }}>{fmtDate(p.planned_publication_date)}</div></div>
                      <div><div style={{ color: "#7899b0", fontSize: 9, letterSpacing: 1 }}>DUE</div><div style={{ color: "#d6f3ff", fontSize: 11 }}>{fmtDT(p.due_at)}</div></div>
                      <div><div style={{ color: "#7899b0", fontSize: 9, letterSpacing: 1 }}>PERÍODO DE REFERÊNCIA</div><div style={{ color: "#d6f3ff", fontSize: 11 }}>{[fmtDate(p.reference_start_date), fmtDate(p.reference_end_date)].join(" → ")}</div></div>
                    </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {communication.report_kind && <button className="btn-icon" onClick={() => handleSync(p)}>SYNC</button>}
                    <button className="btn-icon" onClick={() => { setSel(p); setModal("audiences"); }}>PÚBLICO</button>
                    <button className="btn-icon" onClick={() => { setSel(p); setModal("sections"); }}>CONTEÚDO</button>
                    <button className="btn-icon" onClick={() => { setSel(p); setModal("reviews"); }}>REVISÕES</button>
                    <button className="btn-icon" onClick={() => { setSel(p); setModal("versions"); }}>VERSÕES</button>
                    <button className="btn-icon" onClick={() => { setSel(p); setModal("presentations"); }}>APRESENTAÇÕES</button>
                    {(communication.supported_export_formats ?? []).map(format => (
                      <button key={format} className="btn-icon" onClick={() => handleExport(p, format)}>{format}</button>
                    ))}
                    <button className="btn-icon" onClick={() => {
                      setForm({
                        title: p.title,
                        subtitle: p.subtitle ?? "",
                        reference_label: p.reference_label ?? "",
                        editorial_summary: p.editorial_summary ?? "",
                        reference_start_date: p.reference_start_date ?? "",
                        reference_end_date: p.reference_end_date ?? "",
                        planned_publication_date: p.planned_publication_date ?? "",
                        status: p.status,
                        owner_name: p.owner_name ?? "",
                        occurrence_kind: p.occurrence_kind ?? "SCHEDULED",
                        operational_status: p.operational_status ?? "PLANNED",
                        due_at: p.due_at ? new Date(p.due_at).toISOString().slice(0, 16) : "",
                        next_occurrence_date: p.next_occurrence_date ?? "",
                        source_reason: p.source_reason ?? "",
                        outcome_summary: p.outcome_summary ?? "",
                        meeting_id: p.meeting_id ?? "",
                      });
                      setSel(p);
                      setModal("edit");
                    }}>EDITAR</button>
                    <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(p.publication_id)}>DEL</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>FECHAR</button></div>
      </div>

      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" style={{ maxWidth: 900, width: "95vw" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// PUBLICAÇÃO //</span><h3 className="mod-modal__title">{modal === "create" ? "NOVA" : "EDITAR"} <span>PUBLICAÇÃO</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4, color: "#7899b0", fontSize: 10 }}>
                Registre aqui a publicação do relatório. Ao salvar, esta publicação passa a representar um snapshot persistido do conteúdo e dos dados daquele momento, garantindo consulta histórica consistente.
              </div>

              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>◉ IDENTIFICAÇÃO</div>
                <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">SUBTÍTULO</label><input className="mod-input" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">REFERÊNCIA</label><input className="mod-input" value={form.reference_label} onChange={e => setForm(f => ({ ...f, reference_label: e.target.value }))} /></div>
              </div>

              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>◉ EXECUÇÃO OPERACIONAL</div>
                <div className="mod-field-row">
                  <div className="mod-field"><label className="mod-field__label">RESPONSÁVEL</label><input className="mod-input" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Quem prepara ou apresenta esta ocorrência" /></div>
                  <div className="mod-field"><label className="mod-field__label">MEETING ID (opcional)</label><input className="mod-input" value={form.meeting_id} onChange={e => setForm(f => ({ ...f, meeting_id: e.target.value }))} placeholder="Vínculo opcional com reunião" /></div>
                </div>
                <div className="mod-field-row">
                  <div className="mod-field"><label className="mod-field__label">TIPO DE OCORRÊNCIA</label><select className="mod-select" value={form.occurrence_kind} onChange={e => setForm(f => ({ ...f, occurrence_kind: e.target.value }))}>{OCCURRENCE_KINDS.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></div>
                  <div className="mod-field"><label className="mod-field__label">STATUS OPERACIONAL</label><select className="mod-select" value={form.operational_status} onChange={e => setForm(f => ({ ...f, operational_status: e.target.value }))}>{OPERATIONAL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></div>
                </div>
                <div className="mod-field"><label className="mod-field__label">MOTIVO / CONTEXTO</label><input className="mod-input" value={form.source_reason} onChange={e => setForm(f => ({ ...f, source_reason: e.target.value }))} placeholder="Ex: comitê mensal, reunião com diretoria, follow-up de risco" /></div>
                <div className="mod-field-row">
                  <div className="mod-field"><label className="mod-field__label">DATA PLANEJADA</label><input className="mod-input" type="date" value={form.planned_publication_date} onChange={e => setForm(f => ({ ...f, planned_publication_date: e.target.value }))} /></div>
                  <div className="mod-field"><label className="mod-field__label">DUE AT</label><input className="mod-input" type="datetime-local" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} /></div>
                </div>
                <div className="mod-field-row">
                  <div className="mod-field"><label className="mod-field__label">INÍCIO DA REFERÊNCIA</label><input className="mod-input" type="date" value={form.reference_start_date} onChange={e => setForm(f => ({ ...f, reference_start_date: e.target.value }))} /></div>
                  <div className="mod-field"><label className="mod-field__label">FIM DA REFERÊNCIA</label><input className="mod-input" type="date" value={form.reference_end_date} onChange={e => setForm(f => ({ ...f, reference_end_date: e.target.value }))} /></div>
                </div>
                <div className="mod-field-row">
                  <div className="mod-field"><label className="mod-field__label">PRÓXIMA OCORRÊNCIA</label><input className="mod-input" type="date" value={form.next_occurrence_date} onChange={e => setForm(f => ({ ...f, next_occurrence_date: e.target.value }))} /></div>
                  <div className="mod-field">
                    <label className="mod-field__label">FOLLOW-UP</label>
                    <div style={{ minHeight: 38, display: "flex", alignItems: "center", padding: "0 12px", border: "1px solid rgba(0,212,255,0.18)", background: "rgba(2,12,24,0.35)", color: "#7899b0" }}>
                      Snapshot histórico garantido ao salvar a publicação.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>◉ CONTEÚDO E RESULTADO</div>
                <div className="mod-field"><label className="mod-field__label">SUMÁRIO EDITORIAL</label><textarea className="mod-textarea" rows={3} value={form.editorial_summary} onChange={e => setForm(f => ({ ...f, editorial_summary: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">OUTCOME</label><textarea className="mod-textarea" rows={3} value={form.outcome_summary} onChange={e => setForm(f => ({ ...f, outcome_summary: e.target.value }))} placeholder="Resultados, decisões, próximos passos" /></div>
              </div>

              {modal === "edit" && <div className="mod-field"><label className="mod-field__label">STATUS DO DOCUMENTO</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{PUB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? "SALVANDO..." : "SALVAR ⟩"}</button></div>
          </div>
        </div>
      )}
      {modal === "sections" && sel && <SectionsModal pub={sel} onClose={() => setModal(null)} />}
      {modal === "audiences" && sel && <PublicationAudiencesModal pub={sel} productId={String(communication.product_id)} onClose={() => setModal(null)} />}
      {modal === "reviews" && sel && <ReviewsHistoryModal pub={sel} onClose={() => setModal(null)} />}
      {modal === "versions" && sel && <VersionsModal pub={sel} onClose={() => setModal(null)} />}
      {modal === "presentations" && sel && <PresentationHistoryModal pub={sel} onClose={() => setModal(null)} />}
      {preview && <ExportPayloadModal title={preview.title} content={preview.content} onClose={() => setPreview(null)} />}
    </div>
  );
}

function TypesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CommType[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [sel, setSel] = useState<CommType | null>(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = { name: "", description: "", default_format: "" };
  const [form, setForm] = useState({ ...EMPTY });
  const load = () => apiGet<CommType[]>("/communication/types?only_active=false").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { if (modal === "create") await apiPost("/communication/types", form); else if (sel) await apiPatch(`/communication/types/${sel.communication_type_id}`, form); setModal(null); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };
  return (
    <div>
      <div className="mod-header">
        <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.types_eyebrow")}</span><h1 className="mod-header__title">{t("communication.types_title")}</h1><p className="mod-header__meta">{t("communication.types_meta", { count: items.length })}</p></div>
        <button className="btn-add" onClick={() => { setForm({ ...EMPTY }); setSel(null); setModal("create"); }}>{t("communication.types_btn_new")}</button>
      </div>
      {items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("communication.types_empty")}</div></div> : (
        <table className="mod-table"><thead><tr><th>{t("communication.types_col_name")}</th><th>{t("communication.types_col_format")}</th><th>{t("communication.types_col_active")}</th><th></th></tr></thead>
          <tbody>{items.map(ct => (
            <tr key={ct.communication_type_id}>
              <td><strong>{ct.name}</strong>{ct.description && <div style={{ fontSize: 10, color: "#7899b0" }}>{ct.description.slice(0, 60)}</div>}</td>
              <td style={{ color: "#7899b0" }}>{ct.default_format ?? "—"}</td>
              <td><Badge s={ct.is_active ? "ACTIVE" : "INACTIVE"} /></td>
              <td><div className="row-actions">
                <button className="btn-icon" onClick={() => { setForm({ name: ct.name, description: ct.description ?? "", default_format: ct.default_format ?? "" }); setSel(ct); setModal("edit"); }}>{t("communication.types_modal_edit")}</button>
                <button className="btn-icon btn-icon--danger" onClick={async () => { if (!confirm(t("communication.confirm_deactivate"))) return; await apiDelete(`/communication/types/${ct.communication_type_id}`); load(); }}>{t("communication.types_btn_deactivate")}</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {modal && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// {t("communication.types_modal_subtitle").toUpperCase()} //</span><h3 className="mod-modal__title">{modal === "create" ? t("communication.types_modal_new") : t("communication.types_modal_edit")} <span>{t("communication.types_modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">{t("communication.types_form_name")}</label><input className="mod-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.types_form_description")}</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.types_form_format")}</label><input className="mod-input" value={form.default_format} onChange={e => setForm(f => ({ ...f, default_format: e.target.value }))} /></div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>{t("communication.btn_cancel")}</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? t("communication.btn_saving") : t("communication.btn_save")}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesTab({ commTypes }: { commTypes: CommType[] }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Template[]>([]);
  const [tplSections, setTplSections] = useState<TplSection[]>([]);
  const [selTpl, setSelTpl] = useState<Template | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "sections" | null>(null);
  const [sel, setSel] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [sampleView, setSampleView] = useState<TemplateSampleView | null>(null);
  const EMPTY = { communication_type_id: commTypes[0]?.communication_type_id ?? 0, name: "", description: "", general_prompt: "", default_language: "pt-BR", default_tone: "", default_detail_level: "" };
  const [form, setForm] = useState({ ...EMPTY });
  const SECEMPTY = { section_key: "", title: "", description: "", generation_prompt: "", display_order: 0, is_required: true, target_length: "" };
  const [secForm, setSecForm] = useState({ ...SECEMPTY });
  const [secSel, setSecSel] = useState<TplSection | null>(null);
  const [secModal, setSecModal] = useState<"create" | "edit" | null>(null);
  const [secSaving, setSecSaving] = useState(false);

  const load = () => apiGet<{ items: Template[] }>("/communication/templates?size=100").then(r => setItems(r.items)).catch(() => {});
  const loadSections = (id: number) => apiGet<TplSection[]>(`/communication/templates/${id}/sections`).then(setTplSections).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, communication_type_id: Number(form.communication_type_id), default_tone: form.default_tone || null, default_detail_level: form.default_detail_level || null, general_prompt: form.general_prompt || null };
      if (modal === "create") await apiPost("/communication/templates", body); else if (sel) await apiPatch(`/communication/templates/${sel.communication_template_id}`, body);
      setModal(null); load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  const handleSaveSection = async () => {
    if (!secForm.title.trim() || !secForm.section_key.trim() || !selTpl) return;
    setSecSaving(true);
    try {
      const body = { ...secForm, display_order: Number(secForm.display_order), target_length: secForm.target_length ? Number(secForm.target_length) : null, generation_prompt: secForm.generation_prompt || null };
      if (secModal === "create") await apiPost(`/communication/templates/${selTpl.communication_template_id}/sections`, body);
      else if (secSel) await apiPatch(`/communication/template-sections/${secSel.template_section_id}`, body);
      setSecModal(null); loadSections(selTpl.communication_template_id);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erro");
    } finally { setSecSaving(false); }
  };

  const openSampleView = async (tpl: Template) => {
    try {
      const result = await apiGet<TemplateSampleView>(`/communication/templates/${tpl.communication_template_id}/sample-view`);
      setSampleView(result);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div>
      <div className="mod-header">
        <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.tpl_eyebrow")}</span><h1 className="mod-header__title">{t("communication.tpl_title")}</h1><p className="mod-header__meta">{t("communication.tpl_meta", { count: items.length })}</p></div>
        <button className="btn-add" onClick={() => { setForm({ ...EMPTY, communication_type_id: commTypes[0]?.communication_type_id ?? 0 }); setSel(null); setModal("create"); }}>{t("communication.tpl_btn_new")}</button>
      </div>
      {items.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◧</div><div className="mod-empty__title">{t("communication.tpl_empty")}</div><div className="mod-empty__sub">{t("communication.tpl_empty_sub")}</div></div> : (
        <table className="mod-table"><thead><tr><th>{t("communication.tpl_col_name")}</th><th>{t("communication.tpl_col_type")}</th><th>{t("communication.tpl_col_language")}</th><th>{t("communication.tpl_col_tone")}</th><th></th></tr></thead>
          <tbody>{items.map(tpl => (
            <tr key={tpl.communication_template_id}>
              <td><strong>{tpl.name}</strong>{tpl.description && <div style={{ fontSize: 10, color: "#7899b0" }}>{tpl.description.slice(0, 50)}</div>}</td>
              <td style={{ fontSize: 10, color: "#7899b0" }}>{commTypes.find(c => c.communication_type_id === tpl.communication_type_id)?.name ?? "—"}</td>
              <td style={{ color: "#7899b0" }}>{tpl.default_language}</td>
              <td style={{ color: "#7899b0" }}>{tpl.default_tone ?? "—"}</td>
              <td><div className="row-actions">
                <button className="btn-icon" onClick={() => openSampleView(tpl)}>PREVIEW</button>
                <button className="btn-icon" onClick={() => { setSelTpl(tpl); loadSections(tpl.communication_template_id); setModal("sections"); }}>{t("communication.tpl_btn_sections")}</button>
                <button className="btn-icon" onClick={() => { setForm({ communication_type_id: tpl.communication_type_id, name: tpl.name, description: tpl.description ?? "", general_prompt: tpl.general_prompt ?? "", default_language: tpl.default_language, default_tone: tpl.default_tone ?? "", default_detail_level: tpl.default_detail_level ?? "" }); setSel(tpl); setModal("edit"); }}>{t("communication.tpl_btn_edit")}</button>
                <button className="btn-icon btn-icon--danger" onClick={async () => { if (!confirm(t("communication.confirm_delete"))) return; await apiDelete(`/communication/templates/${tpl.communication_template_id}`); load(); }}>{t("communication.tpl_btn_del")}</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// {t("communication.tpl_modal_subtitle").toUpperCase()} //</span><h3 className="mod-modal__title">{modal === "create" ? t("communication.tpl_modal_new") : t("communication.tpl_modal_edit")} <span>{t("communication.tpl_modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_name")}</label><input className="mod-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_type")}</label><select className="mod-select" value={form.communication_type_id} onChange={e => setForm(f => ({ ...f, communication_type_id: Number(e.target.value) }))}>{commTypes.map(ct => <option key={ct.communication_type_id} value={ct.communication_type_id}>{ct.name}</option>)}</select></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_description")}</label><textarea className="mod-textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_general_prompt")}</label><textarea className="mod-textarea" rows={4} value={form.general_prompt} onChange={e => setForm(f => ({ ...f, general_prompt: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_language")}</label><select className="mod-select" value={form.default_language} onChange={e => setForm(f => ({ ...f, default_language: e.target.value }))}>{LANG_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">{t("communication.tpl_form_tone")}</label><select className="mod-select" value={form.default_tone} onChange={e => setForm(f => ({ ...f, default_tone: e.target.value }))}>{TONE_OPTIONS.map(tone => <option key={tone} value={tone}>{tone || t("communication.select_none")}</option>)}</select></div>
              </div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>{t("communication.btn_cancel")}</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? t("communication.btn_saving") : t("communication.btn_save")}</button></div>
          </div>
        </div>
      )}
      {modal === "sections" && selTpl && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" style={{ maxWidth: 900, width: "95vw" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// SEÇÕES DO TEMPLATE //</span><h3 className="mod-modal__title">{selTpl.name}</h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              {selTpl.general_prompt && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 4, fontSize: 10, color: "#c084fc" }}>🤖 PROMPT GERAL: {selTpl.general_prompt.slice(0, 150)}…</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}><button className="btn-add" onClick={() => { setSecForm({ ...SECEMPTY, display_order: tplSections.length }); setSecSel(null); setSecModal("create"); }}>+ NOVA SEÇÃO</button></div>
              {tplSections.length === 0 ? <div className="mod-empty"><div className="mod-empty__icon">◫</div><div className="mod-empty__title">SEM SEÇÕES</div></div> : (
                <table className="mod-table"><thead><tr><th>#</th><th>KEY</th><th>TÍTULO</th><th>OBRIG.</th><th>PROMPT IA</th><th></th></tr></thead>
                  <tbody>{tplSections.map(s => (
                    <tr key={s.template_section_id}>
                      <td style={{ color: "#7899b0", fontSize: 11 }}>{s.display_order}</td>
                      <td><span className="badge badge--info" style={{ fontSize: 9 }}>{s.section_key}</span></td>
                      <td><strong>{s.title}</strong>{s.description && <div style={{ fontSize: 10, color: "#7899b0" }}>{s.description.slice(0, 50)}</div>}</td>
                      <td style={{ textAlign: "center" }}>{s.is_required ? <span style={{ color: "#00ff88" }}>✓</span> : "—"}</td>
                      <td style={{ fontSize: 10, color: "#c084fc", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.generation_prompt ? `🤖 ${s.generation_prompt.slice(0, 60)}…` : "—"}</td>
                      <td><div className="row-actions">
                        <button className="btn-icon" onClick={() => { setSecForm({ section_key: s.section_key, title: s.title, description: s.description ?? "", generation_prompt: s.generation_prompt ?? "", display_order: s.display_order, is_required: s.is_required, target_length: s.target_length ? String(s.target_length) : "" }); setSecSel(s); setSecModal("edit"); }}>EDITAR</button>
                        <button className="btn-icon btn-icon--danger" onClick={async () => { if (!confirm("Excluir?")) return; await apiDelete(`/communication/template-sections/${s.template_section_id}`); loadSections(selTpl.communication_template_id); }}>DEL</button>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>FECHAR</button></div>
            {secModal && (
              <div className="mod-overlay" onClick={() => setSecModal(null)}>
                <div className="mod-modal" onClick={e => e.stopPropagation()}>
                  <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// SEÇÃO //</span><h3 className="mod-modal__title">{secModal === "create" ? "NOVA" : "EDITAR"} <span>SEÇÃO</span></h3></div><button className="mod-modal__close" onClick={() => setSecModal(null)}>✕</button></div>
                  <div className="mod-modal__body">
                    <div className="mod-field-row">
                      <div className="mod-field"><label className="mod-field__label">KEY *</label><input className="mod-input" value={secForm.section_key} onChange={e => setSecForm(f => ({ ...f, section_key: e.target.value.toUpperCase().replace(/ /g, "_") }))} /></div>
                      <div className="mod-field"><label className="mod-field__label">ORDEM</label><input className="mod-input" type="number" value={secForm.display_order} onChange={e => setSecForm(f => ({ ...f, display_order: Number(e.target.value) }))} /></div>
                    </div>
                    <div className="mod-field"><label className="mod-field__label">TÍTULO *</label><input className="mod-input" value={secForm.title} onChange={e => setSecForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" rows={2} value={secForm.description} onChange={e => setSecForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div className="mod-field"><label className="mod-field__label">🤖 PROMPT DA SEÇÃO</label><textarea className="mod-textarea" rows={3} value={secForm.generation_prompt} onChange={e => setSecForm(f => ({ ...f, generation_prompt: e.target.value }))} /></div>
                    <div className="mod-field-row">
                      <div className="mod-field"><label className="mod-field__label">TAMANHO (palavras)</label><input className="mod-input" type="number" value={secForm.target_length} onChange={e => setSecForm(f => ({ ...f, target_length: e.target.value }))} /></div>
                      <div className="mod-field"><label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}><input type="checkbox" checked={secForm.is_required} onChange={e => setSecForm(f => ({ ...f, is_required: e.target.checked }))} /> OBRIGATÓRIA</label></div>
                    </div>
                  </div>
                  <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setSecModal(null)}>CANCELAR</button><button className="btn-save" onClick={handleSaveSection} disabled={secSaving || !secForm.title.trim() || !secForm.section_key.trim()}>{secSaving ? "..." : "SALVAR ⟩"}</button></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sampleView && (
        <div className="mod-overlay" onClick={() => setSampleView(null)}>
          <div className="mod-modal" style={{ maxWidth: 1100, width: "96vw" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// TEMPLATE PREVIEW //</span>
                <h3 className="mod-modal__title">{sampleView.template_name} <span>{sampleView.report_kind ?? "SAMPLE VIEW"}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={() => setSampleView(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ padding: "8px 12px", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 4, background: "rgba(0,212,255,0.04)", color: "#7899b0", fontSize: 11 }}>
                  Visualização mockada do layout do report para demonstração do template.
                </div>
                <div style={{ border: "1px solid rgba(0,212,255,0.18)", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                  <iframe title={sampleView.template_name} srcDoc={sampleView.sample_html} style={{ width: "100%", height: 500, border: 0, background: "#fff" }} />
                </div>
                <details style={{ border: "1px solid rgba(0,212,255,0.18)", borderRadius: 6, padding: 12, background: "rgba(2,12,24,0.35)" }}>
                  <summary style={{ cursor: "pointer", color: "#00d4ff", fontSize: 11, letterSpacing: 1 }}>VER PAYLOAD MOCKADO</summary>
                  <pre style={{ whiteSpace: "pre-wrap", color: "#d6f3ff", fontSize: 11, marginTop: 10 }}>{JSON.stringify(sampleView.sample_payload, null, 2)}</pre>
                </details>
              </div>
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setSampleView(null)}>FECHAR</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunicationsTab({ productId, commTypes, templates }: { productId: string; commTypes: CommType[]; templates: Template[] }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Communication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | "publications" | "links" | "audiences" | null>(null);
  const [sel, setSel] = useState<Communication | null>(null);
  const [saving, setSaving] = useState(false);
  const [scopeOptions, setScopeOptions] = useState<ReportScopeResponse | null>(null);
  const [scopeLoading, setScopeLoading] = useState(false);
  const SIZE = 20;

  const EMPTY = {
    name: "", description: "", objective: "", trigger_type: "MANUAL", communication_type_id: commTypes[0]?.communication_type_id ?? 0,
    communication_template_id: "", default_language: "pt-BR", default_tone: "", default_detail_level: "", status: "DRAFT",
    report_kind: "", opportunity_ids: [] as string[], roadmap_item_ids: [] as string[], include_epics: true, include_features: true,
    include_only_attention: false, include_completed: true, group_by: "epic_features", period_label: "", supported_export_formats: ["HTML", "PDF", "PPT"] as string[],
  };
  const [form, setForm] = useState({ ...EMPTY });

  const load = (p = page, pid = productId) => {
    apiGet<{ total: number; items: Communication[] }>(`/communication?page=${p}&size=${SIZE}${pid ? `&product_id=${pid}` : ""}`)
      .then(r => { setItems(r.items); setTotal(r.total); })
      .catch(() => {});
  };

  useEffect(() => { load(1, productId); setPage(1); }, [productId]);
  useEffect(() => { load(); }, [page]);

  useEffect(() => {
    if (!productId || form.report_kind !== "ROADMAP_EXECUTIVE_REPORT") return;
    setScopeLoading(true);
    apiGet<ReportScopeResponse>(`/communication/report-scopes/roadmap?product_id=${productId}`)
      .then(setScopeOptions)
      .catch(() => setScopeOptions(null))
      .finally(() => setScopeLoading(false));
  }, [productId, form.report_kind]);

  const toggleSelection = (field: "opportunity_ids" | "roadmap_item_ids", id: string) => {
    setForm(current => ({
      ...current,
      [field]: current[field].includes(id) ? current[field].filter(value => value !== id) : [...current[field], id],
    }));
  };

  const toggleExport = (format: string) => {
    setForm(current => ({
      ...current,
      supported_export_formats: current.supported_export_formats.includes(format)
        ? current.supported_export_formats.filter(value => value !== format)
        : [...current.supported_export_formats, format],
    }));
  };

  const selectedSummary = useMemo(() => {
    if (form.report_kind !== "ROADMAP_EXECUTIVE_REPORT") return null;
    return `${form.roadmap_item_ids.length} iniciativa(s) • ${form.opportunity_ids.length} oportunidade(s) • formatos: ${form.supported_export_formats.join(", ")}`;
  }, [form]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.objective.trim()) return;
    setSaving(true);
    try {
      const report_scope = form.report_kind ? {
        opportunity_ids: form.opportunity_ids,
        roadmap_item_ids: form.roadmap_item_ids,
        include_epics: form.include_epics,
        include_features: form.include_features,
        include_only_attention: form.include_only_attention,
        include_completed: form.include_completed,
        group_by: form.group_by || null,
        period_label: form.period_label || null,
      } : null;
      const body = {
        name: form.name,
        description: form.description || null,
        objective: form.objective,
        trigger_type: form.trigger_type,
        communication_type_id: Number(form.communication_type_id),
        communication_template_id: form.communication_template_id ? Number(form.communication_template_id) : null,
        product_id: Number(productId) || undefined,
        default_language: form.default_language,
        default_tone: form.default_tone || null,
        default_detail_level: form.default_detail_level || null,
        report_kind: form.report_kind || null,
        report_scope,
        supported_export_formats: form.report_kind ? form.supported_export_formats : [],
        status: form.status,
      };
      if (modal === "create") await apiPost("/communication", body);
      else if (sel) await apiPatch(`/communication/${sel.communication_id}`, body);
      setModal(null);
      load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  const openCreate = () => {
    setForm({ ...EMPTY, communication_type_id: commTypes[0]?.communication_type_id ?? 0 });
    setSel(null);
    setModal("create");
  };

  const openEdit = (c: Communication) => {
    setForm({
      name: c.name,
      description: c.description ?? "",
      objective: c.objective,
      trigger_type: c.trigger_type,
      communication_type_id: c.communication_type_id,
      communication_template_id: c.communication_template_id ? String(c.communication_template_id) : "",
      default_language: c.default_language ?? "pt-BR",
      default_tone: c.default_tone ?? "",
      default_detail_level: c.default_detail_level ?? "",
      status: c.status,
      report_kind: c.report_kind ?? "",
      opportunity_ids: c.report_scope?.opportunity_ids ?? [],
      roadmap_item_ids: c.report_scope?.roadmap_item_ids ?? [],
      include_epics: c.report_scope?.include_epics ?? true,
      include_features: c.report_scope?.include_features ?? true,
      include_only_attention: c.report_scope?.include_only_attention ?? false,
      include_completed: c.report_scope?.include_completed ?? true,
      group_by: c.report_scope?.group_by ?? "epic_features",
      period_label: c.report_scope?.period_label ?? "",
      supported_export_formats: c.supported_export_formats?.length ? c.supported_export_formats : ["HTML", "PDF", "PPT"],
    });
    setSel(c);
    setModal("edit");
  };

  return (
    <div>
      <div className="mod-header">
        <div className="mod-header__left"><span className="mod-header__eyebrow">{t("communication.comm_eyebrow")}</span><h1 className="mod-header__title">{t("communication.comm_title")}</h1><p className="mod-header__meta">{t("communication.comm_meta", { count: total })}</p></div>
        <button className="btn-add" onClick={openCreate} disabled={!productId}>{t("communication.comm_btn_new")}</button>
      </div>
      {!productId && <div className="mod-error">{t("communication.comm_no_product")}</div>}
      {items.length === 0 && productId ? <div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("communication.comm_empty")}</div></div> : (
        <table className="mod-table">
          <thead><tr><th>{t("communication.comm_col_name")}</th><th>{t("communication.comm_col_type")}</th><th>REPORT</th><th>{t("communication.comm_col_trigger")}</th><th>{t("communication.comm_col_language")}</th><th>{t("communication.comm_col_status")}</th><th></th></tr></thead>
          <tbody>{items.map(c => (
            <tr key={c.communication_id}>
              <td><strong>{c.name}</strong>{c.description && <div style={{ fontSize: 10, color: "#7899b0" }}>{c.description.slice(0, 60)}</div>}</td>
              <td style={{ fontSize: 10, color: "#7899b0" }}>{commTypes.find(t => t.communication_type_id === c.communication_type_id)?.name ?? "—"}</td>
              <td style={{ fontSize: 10, color: c.report_kind ? "#00d4ff" : "#7899b0" }}>{c.report_kind ?? "EDITORIAL"}</td>
              <td><span className="badge badge--info">{c.trigger_type}</span></td>
              <td style={{ color: "#7899b0" }}>{c.default_language ?? "—"}</td>
              <td><Badge s={c.status} /></td>
              <td><div className="row-actions">
                <button className="btn-icon" onClick={() => { setSel(c); setModal("links"); }}>VÍNCULOS</button>
                <button className="btn-icon" onClick={() => { setSel(c); setModal("audiences"); }}>AUDIENCES</button>
                <button className="btn-icon" onClick={() => { setSel(c); setModal("publications"); }}>PUBLICAÇÕES</button>
                <button className="btn-icon" onClick={() => openEdit(c)}>{t("communication.comm_btn_edit")}</button>
                <button className="btn-icon btn-icon--danger" onClick={async () => { if (!confirm(t("communication.confirm_delete"))) return; await apiDelete(`/communication/${c.communication_id}`); load(page); }}>{t("communication.comm_btn_del")}</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {total > SIZE && <div className="mod-pagination"><span>{(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} de {total}</span><div className="mod-pagination__btns"><button className="btn-page" disabled={page === 1} onClick={() => setPage(p => p - 1)}>ANTERIOR</button><button className="btn-page" disabled={page * SIZE >= total} onClick={() => setPage(p => p + 1)}>PRÓXIMO</button></div></div>}

      {(modal === "create" || modal === "edit") && (
        <div className="mod-overlay" onClick={() => setModal(null)}>
          <div className="mod-modal" style={{ maxWidth: 960, width: "95vw" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// {t("communication.comm_modal_subtitle").toUpperCase()} //</span><h3 className="mod-modal__title">{modal === "create" ? t("communication.comm_modal_new") : t("communication.comm_modal_edit")} <span>{t("communication.comm_modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={() => setModal(null)}>✕</button></div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_name")}</label><input className="mod-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_objective")}</label><textarea className="mod-textarea" value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_description")}</label><textarea className="mod-textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_type")}</label><select className="mod-select" value={form.communication_type_id} onChange={e => setForm(f => ({ ...f, communication_type_id: Number(e.target.value) }))}>{commTypes.map(t => <option key={t.communication_type_id} value={t.communication_type_id}>{t.name}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_template")}</label><select className="mod-select" value={form.communication_template_id} onChange={e => setForm(f => ({ ...f, communication_template_id: e.target.value }))}><option value="">{t("communication.comm_form_no_template")}</option>{templates.map(t => <option key={t.communication_template_id} value={t.communication_template_id}>{t.name}</option>)}</select></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_trigger")}</label><select className="mod-select" value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}>{TRIGGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_language")}</label><select className="mod-select" value={form.default_language} onChange={e => setForm(f => ({ ...f, default_language: e.target.value }))}>{LANG_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_tone")}</label><select className="mod-select" value={form.default_tone} onChange={e => setForm(f => ({ ...f, default_tone: e.target.value }))}>{TONE_OPTIONS.map(tone => <option key={tone} value={tone}>{tone || t("communication.select_none")}</option>)}</select></div>

              <SchedulePanel communicationId={sel?.communication_id} triggerType={form.trigger_type} />

              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", margin: "16px 0 12px", paddingTop: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>◉ REPORT CONFIGURATION</div>
                <div className="mod-field-row">
                  <div className="mod-field"><label className="mod-field__label">REPORT KIND</label><select className="mod-select" value={form.report_kind} onChange={e => setForm(f => ({ ...f, report_kind: e.target.value, opportunity_ids: [], roadmap_item_ids: [] }))}>{REPORT_KINDS.map(kind => <option key={kind || "none"} value={kind}>{kind || "— None —"}</option>)}</select></div>
                  <div className="mod-field"><label className="mod-field__label">GROUP BY</label><select className="mod-select" value={form.group_by} onChange={e => setForm(f => ({ ...f, group_by: e.target.value }))} disabled={form.report_kind !== "ROADMAP_EXECUTIVE_REPORT"}><option value="epic_features">Epic {" > "} Features</option><option value="roadmap_items">Roadmap Items</option></select></div>
                </div>
                <div className="mod-field"><label className="mod-field__label">PERÍODO / LABEL</label><input className="mod-input" value={form.period_label} onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))} placeholder="Ex: Atualização executiva — Out/2026" disabled={form.report_kind !== "ROADMAP_EXECUTIVE_REPORT"} /></div>
                {form.report_kind === "ROADMAP_EXECUTIVE_REPORT" && (
                  <>
                    {scopeLoading ? <div className="mod-loading">CARREGANDO ESCOPO...</div> : (
                      <>
                        <MultiSelectList label="OPORTUNIDADES" options={scopeOptions?.opportunities ?? []} selected={form.opportunity_ids} onToggle={(id) => toggleSelection("opportunity_ids", id)} helper="Selecione quais oportunidades discovery devem constar." />
                        <MultiSelectList label="INICIATIVAS DO ROADMAP" options={scopeOptions?.roadmap_items ?? []} selected={form.roadmap_item_ids} onToggle={(id) => toggleSelection("roadmap_item_ids", id)} helper="Selecione quais iniciativas/epics do roadmap entram no report." />
                        <div className="mod-field-row">
                          <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={form.include_epics} onChange={e => setForm(f => ({ ...f, include_epics: e.target.checked }))} /> Incluir Epics</label>
                          <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={form.include_features} onChange={e => setForm(f => ({ ...f, include_features: e.target.checked }))} /> Incluir Features</label>
                        </div>
                        <div className="mod-field-row">
                          <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={form.include_only_attention} onChange={e => setForm(f => ({ ...f, include_only_attention: e.target.checked }))} /> Somente itens em atenção</label>
                          <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={form.include_completed} onChange={e => setForm(f => ({ ...f, include_completed: e.target.checked }))} /> Incluir concluídos</label>
                        </div>
                        <div className="mod-field">
                          <label className="mod-field__label">EXPORT FORMATS</label>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {EXPORT_OPTIONS.map(format => (
                              <label key={format} style={{ display: "flex", gap: 6, alignItems: "center", color: "#d6f3ff", fontSize: 11 }}>
                                <input type="checkbox" checked={form.supported_export_formats.includes(format)} onChange={() => toggleExport(format)} />
                                {format}
                              </label>
                            ))}
                          </div>
                        </div>
                        {selectedSummary && <div style={{ color: "#7899b0", fontSize: 10 }}>{selectedSummary}</div>}
                      </>
                    )}
                  </>
                )}
              </div>

              {modal === "edit" && <div className="mod-field"><label className="mod-field__label">{t("communication.comm_form_status")}</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{COMM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>}
            </div>
            <div className="mod-modal__footer"><button className="btn-cancel" onClick={() => setModal(null)}>{t("communication.btn_cancel")}</button><button className="btn-save" onClick={handleSave} disabled={saving || !form.name.trim() || !form.objective.trim()}>{saving ? t("communication.btn_saving") : t("communication.btn_save")}</button></div>
          </div>
        </div>
      )}
      {modal === "links" && sel && <CommunicationLinksModal communication={sel} productId={productId} onClose={() => setModal(null)} />}
      {modal === "audiences" && sel && <CommunicationAudiencesModal communication={sel} productId={productId} onClose={() => setModal(null)} />}
      {modal === "publications" && sel && <PublicationsModal communication={sel} onClose={() => setModal(null)} />}
    </div>
  );
}

export default function CommunicationPage() {
  const { t } = useTranslation();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [tab, setTab] = useState<"communications" | "templates" | "types">("communications");
  const [commTypes, setCommTypes] = useState<CommType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    apiGet<CommType[]>("/communication/types").then(setCommTypes).catch(() => {});
    apiGet<{ items: Template[] }>("/communication/templates?size=100").then(r => setTemplates(r.items)).catch(() => {});
  }, []);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };

  const tabs = [
    { key: "communications", label: "COMMUNICATIONS" },
    { key: "templates", label: "TEMPLATES" },
    { key: "types", label: "TYPES" },
  ] as const;

  const tabStyle = (current: string): React.CSSProperties => ({
    padding: "6px 16px",
    fontSize: 9,
    letterSpacing: 3,
    cursor: "pointer",
    background: tab === current ? "rgba(0,212,255,0.12)" : "transparent",
    border: `1px solid ${tab === current ? "rgba(0,212,255,0.5)" : "rgba(0,212,255,0.15)"}`,
    color: tab === current ? "#00d4ff" : "#7899b0",
    borderRadius: 2,
  });

  return (
    <ModuleLayout moduleIcon="◈" moduleName={t("communication.module_name")} moduleAccent={t("communication.module_name")} selectedProductId={productId} onProductChange={handleProductChange}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, padding: "0 0 12px 0", borderBottom: "1px solid rgba(0,212,255,0.1)", flexWrap: "wrap" }}>
        {tabs.map(item => <button key={item.key} style={tabStyle(item.key)} onClick={() => setTab(item.key)}>{item.label}</button>)}
      </div>
      {tab === "communications" && <CommunicationsTab productId={productId} commTypes={commTypes} templates={templates} />}
      {tab === "templates" && <TemplatesTab commTypes={commTypes} />}
      {tab === "types" && <TypesTab />}
    </ModuleLayout>
  );
}
