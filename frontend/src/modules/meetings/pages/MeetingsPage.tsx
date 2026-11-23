import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/services/api";
import AttachmentsPanel from "../../../shared/components/AttachmentsPanel";
import RaciPanel from "../../../shared/components/RaciPanel";

interface Participant {
  id: string;
  meeting_id: string;
  stakeholder_id?: number;
  name: string;
  role?: string;
  attended: boolean;
}

interface ActionItem {
  id: string;
  meeting_id: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  status: string;
  notes?: string;
}

interface MLink {
  id: string;
  meeting_id: string;
  label: string;
  url: string;
  link_type: string;
}

interface MeetingRelation {
  id: string;
  meeting_id: string;
  entity_type: string;
  entity_id: string;
  relation_type: string;
  label?: string;
  notes?: string;
  created_at: string;
}

interface MeetingSession {
  id: string;
  meeting_id: string;
  title?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface MeetingTranscript {
  id: string;
  meeting_id: string;
  session_id?: string;
  title: string;
  content_text: string;
  language?: string;
  source_type: string;
  source_attachment_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface MeetingSummary {
  id: string;
  meeting_id: string;
  session_id?: string;
  transcript_id?: string;
  title: string;
  summary_type: string;
  content: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface Meeting {
  id: string;
  product_id?: number;
  title: string;
  meeting_type: string;
  meeting_date?: string;
  start_time?: string;
  duration_minutes?: number;
  location?: string;
  status: string;
  objective?: string;
  agenda?: string;
  decisions?: string;
  notes?: string;
  opportunity_id?: string;
  backlog_item_id?: string;
  roadmap_item_id?: string;
  primary_entity_type?: string;
  primary_entity_id?: string;
  primary_relation_note?: string;
  participants: Participant[];
  action_items: ActionItem[];
  links: MLink[];
  relations: MeetingRelation[];
  sessions: MeetingSession[];
  transcripts: MeetingTranscript[];
  summaries: MeetingSummary[];
  created_at: string;
  updated_at: string;
}

interface Stk {
  stakeholder_id: number;
  full_name: string;
  position_title?: string;
}

const MT = ["discovery", "review", "planning", "retrospective", "stakeholder", "requirements", "follow_up", "other"] as const;
const MS = ["scheduled", "in_progress", "completed", "cancelled"] as const;
const LT = ["document", "recording", "image", "other"] as const;
const TST = ["paste", "upload", "integration", "manual"] as const;
const SMT = ["minutes", "human", "ai", "executive", "bullets"] as const;
const ET = ["discovery_opportunity", "discovery_research", "roadmap_item", "backlog_item", "risk", "requirement", "decision", "process", "business_domain", "followup", "other"] as const;
const RT = ["primary", "discussed", "decided", "impacted", "created_from", "related"] as const;
const SC: Record<string, string> = { scheduled: "#7899b0", in_progress: "#00d4ff", completed: "#00ff88", cancelled: "#ff4466", pending: "#ff9900", done: "#00ff88" };
const sClr = (s: string) => SC[s] ?? "#7899b0";

function Bdg({ v }: { v: string }) {
  const c = sClr(v);
  return <span style={{ fontSize: 9, letterSpacing: 1, padding: "2px 7px", borderRadius: 2, border: `1px solid ${c}55`, color: c, background: `${c}12` }}>{v.toUpperCase().replace(/_/g, " ")}</span>;
}

function Fld({ lbl, children }: { lbl: string; children: React.ReactNode }) {
  return <div className="mod-field"><label className="mod-field__label">{lbl}</label>{children}</div>;
}

function sessionLabel(s?: MeetingSession | null) {
  if (!s) return "General";
  const date = s.session_date || "No date";
  const time = s.start_time ? ` ${s.start_time}` : "";
  return `${date}${time}${s.title ? ` — ${s.title}` : ""}`;
}

function pretty(v?: string | null) {
  if (!v) return "—";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MeetingModal({ m, onClose, onSaved, stks }: { m: Meeting; onClose: () => void; onSaved: (x: Meeting) => void; stks: Stk[] }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"info" | "agenda" | "relations" | "sessions" | "transcripts" | "minutes" | "actions" | "links" | "attachments" | "raci">("info");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: m.title,
    meeting_type: m.meeting_type,
    meeting_date: m.meeting_date ?? "",
    start_time: m.start_time ?? "",
    duration_minutes: m.duration_minutes?.toString() ?? "",
    location: m.location ?? "",
    status: m.status,
    objective: m.objective ?? "",
    agenda: m.agenda ?? "",
    decisions: m.decisions ?? "",
    notes: m.notes ?? "",
    primary_entity_type: m.primary_entity_type ?? "",
    primary_entity_id: m.primary_entity_id ?? "",
    primary_relation_note: m.primary_relation_note ?? "",
  });
  const [parts, setParts] = useState<Participant[]>(m.participants);
  const [sessions, setSessions] = useState<MeetingSession[]>(m.sessions);
  const [relations, setRelations] = useState<MeetingRelation[]>(m.relations ?? []);
  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>(m.transcripts);
  const [summaries, setSummaries] = useState<MeetingSummary[]>(m.summaries);
  const [newPid, setNewPid] = useState("");
  const [actions, setActions] = useState<ActionItem[]>(m.action_items);
  const [newA, setNewA] = useState({ description: "", assigned_to: "", due_date: "", status: "pending" });
  const [lnks, setLnks] = useState<MLink[]>(m.links);
  const [newL, setNewL] = useState({ label: "", url: "", link_type: "document" });
  const [newSession, setNewSession] = useState({ title: "", session_date: m.meeting_date ?? "", start_time: m.start_time ?? "", end_time: "", duration_minutes: "", location: m.location ?? "", status: m.status, notes: "" });
  const [newTranscript, setNewTranscript] = useState({ session_id: "", title: "", content_text: "", language: "", source_type: "paste" });
  const [newSummary, setNewSummary] = useState({ session_id: "", transcript_id: "", title: "", summary_type: "minutes", content: "" });
  const [newRelation, setNewRelation] = useState({ entity_type: "backlog_item", entity_id: "", relation_type: "related", label: "", notes: "" });

  const refreshMeeting = async () => {
    const updated = await apiGet<Meeting>(`/meetings/${m.id}`);
    setSessions(updated.sessions);
    setRelations(updated.relations ?? []);
    setTranscripts(updated.transcripts);
    setSummaries(updated.summaries);
    setParts(updated.participants);
    setActions(updated.action_items);
    setLnks(updated.links);
    setF((prev) => ({
      ...prev,
      primary_entity_type: updated.primary_entity_type ?? "",
      primary_entity_id: updated.primary_entity_id ?? "",
      primary_relation_note: updated.primary_relation_note ?? "",
    }));
    onSaved(updated);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...f,
        duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
        meeting_date: f.meeting_date || null,
        start_time: f.start_time || null,
        location: f.location || null,
        objective: f.objective || null,
        agenda: f.agenda || null,
        decisions: f.decisions || null,
        notes: f.notes || null,
        primary_entity_type: f.primary_entity_type || null,
        primary_entity_id: f.primary_entity_id || null,
        primary_relation_note: f.primary_relation_note || null,
      };
      const r = await apiPatch<Meeting>(`/meetings/${m.id}`, body);
      onSaved(r);
      setRelations(r.relations ?? []);
      setSessions(r.sessions);
      setTranscripts(r.transcripts);
      setSummaries(r.summaries);
    } finally {
      setSaving(false);
    }
  };

  const saveTA = (field: string, val: string) => {
    apiPatch<Meeting>(`/meetings/${m.id}`, { [field]: val || null }).then(onSaved).catch(() => {});
  };

  const addRelation = async () => {
    if (!newRelation.entity_id.trim()) return;
    await apiPost<MeetingRelation>(`/meetings/${m.id}/relations`, {
      ...newRelation,
      label: newRelation.label || null,
      notes: newRelation.notes || null,
    });
    setNewRelation({ entity_type: "backlog_item", entity_id: "", relation_type: "related", label: "", notes: "" });
    await refreshMeeting();
  };

  const delRelation = async (id: string) => {
    await apiDelete(`/meetings/relations/${id}`);
    await refreshMeeting();
  };

  const addPart = async () => {
    if (!newPid) return;
    const s = stks.find((x) => x.stakeholder_id === Number(newPid));
    if (!s) return;
    const p = await apiPost<Participant>(`/meetings/${m.id}/participants`, { stakeholder_id: s.stakeholder_id, name: s.full_name });
    setParts((prev) => [...prev, p]);
    setNewPid("");
  };

  const rmPart = async (p: Participant) => {
    await apiDelete(`/meetings/${m.id}/participants/${p.id}`);
    setParts((prev) => prev.filter((x) => x.id !== p.id));
  };

  const togAtt = async (p: Participant) => {
    await apiPatch(`/meetings/${m.id}/participants/${p.id}`, { attended: !p.attended });
    setParts((prev) => prev.map((x) => x.id === p.id ? { ...x, attended: !x.attended } : x));
  };

  const addAction = async () => {
    if (!newA.description.trim()) return;
    const a = await apiPost<ActionItem>(`/meetings/${m.id}/action-items`, { ...newA, due_date: newA.due_date || null, assigned_to: newA.assigned_to || null });
    setActions((prev) => [...prev, a]);
    setNewA({ description: "", assigned_to: "", due_date: "", status: "pending" });
  };

  const cycleA = async (a: ActionItem) => {
    const next = a.status === "pending" ? "in_progress" : a.status === "in_progress" ? "done" : "pending";
    await apiPatch(`/meetings/action-items/${a.id}`, { status: next });
    setActions((prev) => prev.map((x) => x.id === a.id ? { ...x, status: next } : x));
  };

  const delA = async (id: string) => {
    await apiDelete(`/meetings/action-items/${id}`);
    setActions((prev) => prev.filter((x) => x.id !== id));
  };

  const addLnk = async () => {
    if (!newL.label.trim() || !newL.url.trim()) return;
    const l = await apiPost<MLink>(`/meetings/${m.id}/links`, newL);
    setLnks((prev) => [...prev, l]);
    setNewL({ label: "", url: "", link_type: "document" });
  };

  const delL = async (id: string) => {
    await apiDelete(`/meetings/links/${id}`);
    setLnks((prev) => prev.filter((x) => x.id !== id));
  };

  const addSession = async () => {
    if (!newSession.session_date && !newSession.title.trim()) return;
    await apiPost<MeetingSession>(`/meetings/${m.id}/sessions`, {
      ...newSession,
      title: newSession.title || null,
      session_date: newSession.session_date || null,
      start_time: newSession.start_time || null,
      end_time: newSession.end_time || null,
      duration_minutes: newSession.duration_minutes ? Number(newSession.duration_minutes) : null,
      location: newSession.location || null,
      notes: newSession.notes || null,
    });
    setNewSession({ title: "", session_date: "", start_time: "", end_time: "", duration_minutes: "", location: "", status: "scheduled", notes: "" });
    await refreshMeeting();
  };

  const delSession = async (id: string) => {
    await apiDelete(`/meetings/${m.id}/sessions/${id}`);
    await refreshMeeting();
  };

  const addTranscript = async () => {
    if (!newTranscript.title.trim() || !newTranscript.content_text.trim()) return;
    await apiPost<MeetingTranscript>(`/meetings/${m.id}/transcripts`, {
      ...newTranscript,
      session_id: newTranscript.session_id || null,
      language: newTranscript.language || null,
    });
    setNewTranscript({ session_id: "", title: "", content_text: "", language: "", source_type: "paste" });
    await refreshMeeting();
  };

  const delTranscript = async (id: string) => {
    await apiDelete(`/meetings/transcripts/${id}`);
    await refreshMeeting();
  };

  const addSummary = async () => {
    if (!newSummary.title.trim() || !newSummary.content.trim()) return;
    await apiPost<MeetingSummary>(`/meetings/${m.id}/summaries`, {
      ...newSummary,
      session_id: newSummary.session_id || null,
      transcript_id: newSummary.transcript_id || null,
    });
    setNewSummary({ session_id: "", transcript_id: "", title: "", summary_type: "minutes", content: "" });
    await refreshMeeting();
  };

  const delSummary = async (id: string) => {
    await apiDelete(`/meetings/summaries/${id}`);
    await refreshMeeting();
  };

  const pendingCnt = actions.filter((a) => a.status === "pending").length;
  const availStks = stks.filter((s) => !parts.find((p) => p.stakeholder_id === s.stakeholder_id));

  const TABS = [
    { key: "info", lbl: "Info" },
    { key: "agenda", lbl: "Agenda" },
    { key: "relations", lbl: `Relations${relations.length > 0 ? ` (${relations.length})` : ""}` },
    { key: "sessions", lbl: `Sessions${sessions.length > 0 ? ` (${sessions.length})` : ""}` },
    { key: "transcripts", lbl: `Transcripts${transcripts.length > 0 ? ` (${transcripts.length})` : ""}` },
    { key: "minutes", lbl: `Minutes${summaries.length > 0 ? ` (${summaries.length})` : ""}` },
    { key: "actions", lbl: `Actions${pendingCnt > 0 ? ` (${pendingCnt})` : ""}` },
    { key: "links", lbl: `Links${lnks.length > 0 ? ` (${lnks.length})` : ""}` },
    { key: "attachments", lbl: "Attachments" },
    { key: "raci", lbl: "RACI" },
  ] as const;

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// MEETINGS //</span><h3 className="mod-modal__title">{f.title || m.title} <span><Bdg v={f.status} /></span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(0,212,255,0.1)", flexWrap: "wrap" }}>
          {TABS.map((tb) => <button key={tb.key} onClick={() => setTab(tb.key as typeof tab)} style={{ flex: "1 0 100px", padding: "8px 4px", background: tab === tb.key ? "rgba(0,212,255,0.1)" : "none", border: "none", borderBottom: tab === tb.key ? "2px solid #00d4ff" : "2px solid transparent", color: tab === tb.key ? "#00d4ff" : "#7899b0", fontFamily: "inherit", fontSize: 9, letterSpacing: 1, cursor: "pointer" }}>{tb.lbl.toUpperCase()}</button>)}
        </div>
        <div className="mod-modal__body" style={{ overflowY: "auto", maxHeight: "58vh" }}>
          {tab === "info" && <div>
            <Fld lbl={t("meetings.field_title")}><input className="mod-input" value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} /></Fld>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Fld lbl={t("meetings.field_type")}><select className="mod-select" value={f.meeting_type} onChange={(e) => setF((p) => ({ ...p, meeting_type: e.target.value }))}>{MT.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
              <Fld lbl={t("meetings.field_status")}><select className="mod-select" value={f.status} onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))}>{MS.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
              <Fld lbl={t("meetings.field_date")}><input className="mod-input" type="date" value={f.meeting_date} onChange={(e) => setF((p) => ({ ...p, meeting_date: e.target.value }))} /></Fld>
              <Fld lbl={t("meetings.field_time")}><input className="mod-input" type="time" value={f.start_time} onChange={(e) => setF((p) => ({ ...p, start_time: e.target.value }))} /></Fld>
              <Fld lbl={t("meetings.field_duration")}><input className="mod-input" type="number" min={0} value={f.duration_minutes} onChange={(e) => setF((p) => ({ ...p, duration_minutes: e.target.value }))} placeholder="min" /></Fld>
              <Fld lbl={t("meetings.field_location")}><input className="mod-input" value={f.location} onChange={(e) => setF((p) => ({ ...p, location: e.target.value }))} /></Fld>
            </div>
            <Fld lbl={t("meetings.field_objective")}><textarea className="mod-textarea" style={{ minHeight: 60 }} value={f.objective} onChange={(e) => setF((p) => ({ ...p, objective: e.target.value }))} /></Fld>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,212,255,0.1)" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0", marginBottom: 8 }}>PRIMARY ASSOCIATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Fld lbl="Entity type"><select className="mod-select" value={f.primary_entity_type} onChange={(e) => setF((p) => ({ ...p, primary_entity_type: e.target.value }))}>
                  <option value="">None</option>
                  {ET.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}
                </select></Fld>
                <Fld lbl="Entity ID"><input className="mod-input" value={f.primary_entity_id} onChange={(e) => setF((p) => ({ ...p, primary_entity_id: e.target.value }))} placeholder="record id" /></Fld>
              </div>
              <Fld lbl="Primary relation note"><input className="mod-input" value={f.primary_relation_note} onChange={(e) => setF((p) => ({ ...p, primary_relation_note: e.target.value }))} placeholder="context / why this meeting is linked" /></Fld>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,212,255,0.1)" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0", marginBottom: 8 }}>{t("meetings.participants_label").toUpperCase()}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {parts.map((p) => <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: p.attended ? "rgba(0,255,136,0.07)" : "rgba(120,153,176,0.07)", border: `1px solid ${p.attended ? "rgba(0,255,136,0.3)" : "rgba(120,153,176,0.3)"}`, fontSize: 10, color: "#c8dce8", borderRadius: 2 }}>
                  <button onClick={() => togAtt(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 9, color: p.attended ? "#00ff88" : "#7899b0", padding: 0 }}>{p.attended ? "✓" : "○"}</button>
                  {p.name}
                  <button onClick={() => rmPart(p)} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 10, padding: 0 }}>✕</button>
                </span>)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <select className="mod-select" style={{ flex: 1 }} value={newPid} onChange={(e) => setNewPid(e.target.value)}>
                  <option value="">— {t("meetings.participants_add")} —</option>
                  {availStks.map((s) => <option key={s.stakeholder_id} value={s.stakeholder_id}>{s.full_name}{s.position_title ? ` — ${s.position_title}` : ""}</option>)}
                </select>
                <button className="btn-add" style={{ fontSize: 9 }} onClick={addPart} disabled={!newPid}>+</button>
              </div>
            </div>
          </div>}

          {tab === "agenda" && <div>
            <textarea className="mod-textarea" style={{ minHeight: 220 }} value={f.agenda} onChange={(e) => setF((p) => ({ ...p, agenda: e.target.value }))} onBlur={(e) => saveTA("agenda", e.target.value)} placeholder={t("meetings.agenda_placeholder")} />
          </div>}

          {tab === "relations" && <div>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 8px" }}>
                <Fld lbl="Entity type"><select className="mod-select" value={newRelation.entity_type} onChange={(e) => setNewRelation((p) => ({ ...p, entity_type: e.target.value }))}>{ET.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
                <Fld lbl="Entity ID"><input className="mod-input" value={newRelation.entity_id} onChange={(e) => setNewRelation((p) => ({ ...p, entity_id: e.target.value }))} placeholder="record id" /></Fld>
                <Fld lbl="Relation type"><select className="mod-select" value={newRelation.relation_type} onChange={(e) => setNewRelation((p) => ({ ...p, relation_type: e.target.value }))}>{RT.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0 8px", alignItems: "end" }}>
                <Fld lbl="Label"><input className="mod-input" value={newRelation.label} onChange={(e) => setNewRelation((p) => ({ ...p, label: e.target.value }))} placeholder="short label" /></Fld>
                <Fld lbl="Notes"><input className="mod-input" value={newRelation.notes} onChange={(e) => setNewRelation((p) => ({ ...p, notes: e.target.value }))} placeholder="optional note" /></Fld>
                <button className="btn-add" style={{ fontSize: 9, marginTop: 20 }} onClick={addRelation}>+ RELATION</button>
              </div>
            </div>

            {relations.length === 0 && <div style={{ fontSize: 11, color: "#7899b0", textAlign: "center", padding: "16px 0" }}>No related records linked yet.</div>}
            {relations.map((r) => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 2 }}>
              <span style={{ fontSize: 9, padding: "1px 5px", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", background: "rgba(0,212,255,0.06)" }}>{pretty(r.relation_type)}</span>
              <span style={{ fontSize: 10, color: "#c8dce8", minWidth: 150 }}>{pretty(r.entity_type)}</span>
              <span style={{ fontSize: 10, color: "#7899b0", flex: 1 }}>{r.entity_id}</span>
              {r.label && <span style={{ fontSize: 10, color: "#c8dce8" }}>{r.label}</span>}
              <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => delRelation(r.id)}>DEL</button>
            </div>)}
          </div>}

          {tab === "sessions" && <div>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 0.8fr 0.7fr auto", gap: "0 8px", alignItems: "end" }}>
                <Fld lbl="Title"><input className="mod-input" value={newSession.title} onChange={(e) => setNewSession((p) => ({ ...p, title: e.target.value }))} placeholder="Session / Day 2 / Daily" /></Fld>
                <Fld lbl="Date"><input className="mod-input" type="date" value={newSession.session_date} onChange={(e) => setNewSession((p) => ({ ...p, session_date: e.target.value }))} /></Fld>
                <Fld lbl="Start"><input className="mod-input" type="time" value={newSession.start_time} onChange={(e) => setNewSession((p) => ({ ...p, start_time: e.target.value }))} /></Fld>
                <Fld lbl="End"><input className="mod-input" type="time" value={newSession.end_time} onChange={(e) => setNewSession((p) => ({ ...p, end_time: e.target.value }))} /></Fld>
                <Fld lbl="Status"><select className="mod-select" value={newSession.status} onChange={(e) => setNewSession((p) => ({ ...p, status: e.target.value }))}>{MS.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
                <button className="btn-add" style={{ fontSize: 9, marginTop: 20 }} onClick={addSession}>+ SESSION</button>
              </div>
            </div>
            {sessions.map((s) => <div key={s.id} style={{ marginBottom: 8, padding: "10px 12px", background: "rgba(0,0,0,0.15)", border: `1px solid ${sClr(s.status)}22`, borderLeft: `3px solid ${sClr(s.status)}`, borderRadius: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#c8dce8" }}>{sessionLabel(s)}</div>
                  <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2 }}>{s.location || "No location"}{s.duration_minutes ? ` • ${s.duration_minutes} min` : ""}</div>
                </div>
                <Bdg v={s.status} />
                <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => delSession(s.id)}>DEL</button>
              </div>
            </div>)}
          </div>}

          {tab === "transcripts" && <div>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 3 }}>
              <Fld lbl="Transcript title"><input className="mod-input" value={newTranscript.title} onChange={(e) => setNewTranscript((p) => ({ ...p, title: e.target.value }))} /></Fld>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.7fr", gap: "0 8px" }}>
                <Fld lbl="Session"><select className="mod-select" value={newTranscript.session_id} onChange={(e) => setNewTranscript((p) => ({ ...p, session_id: e.target.value }))}><option value="">General meeting</option>{sessions.map((s) => <option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}</select></Fld>
                <Fld lbl="Language"><input className="mod-input" value={newTranscript.language} onChange={(e) => setNewTranscript((p) => ({ ...p, language: e.target.value }))} placeholder="pt-BR" /></Fld>
                <Fld lbl="Source"><select className="mod-select" value={newTranscript.source_type} onChange={(e) => setNewTranscript((p) => ({ ...p, source_type: e.target.value }))}>{TST.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
              </div>
              <Fld lbl="Transcript text"><textarea className="mod-textarea" style={{ minHeight: 160 }} value={newTranscript.content_text} onChange={(e) => setNewTranscript((p) => ({ ...p, content_text: e.target.value }))} placeholder="Paste the full transcription text here..." /></Fld>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn-add" style={{ fontSize: 9 }} onClick={addTranscript}>+ TRANSCRIPT</button></div>
            </div>
            {transcripts.map((tr) => {
              const session = sessions.find((s) => s.id === tr.session_id);
              return <div key={tr.id} style={{ marginBottom: 10, padding: "10px 12px", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 2 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#c8dce8" }}>{tr.title}</div>
                    <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2 }}>{sessionLabel(session)} • {pretty(tr.source_type)}{tr.language ? ` • ${tr.language}` : ""}</div>
                  </div>
                  <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => delTranscript(tr.id)}>DEL</button>
                </div>
                <textarea className="mod-textarea" style={{ minHeight: 140 }} value={tr.content_text} onChange={(e) => setTranscripts((prev) => prev.map((x) => x.id === tr.id ? { ...x, content_text: e.target.value } : x))} onBlur={(e) => apiPatch<MeetingTranscript>(`/meetings/transcripts/${tr.id}`, { content_text: e.target.value }).then(refreshMeeting)} />
              </div>;
            })}
          </div>}

          {tab === "minutes" && <div>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 3 }}>
              <Fld lbl="Summary title"><input className="mod-input" value={newSummary.title} onChange={(e) => setNewSummary((p) => ({ ...p, title: e.target.value }))} /></Fld>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: "0 8px" }}>
                <Fld lbl="Session"><select className="mod-select" value={newSummary.session_id} onChange={(e) => setNewSummary((p) => ({ ...p, session_id: e.target.value }))}><option value="">General meeting</option>{sessions.map((s) => <option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}</select></Fld>
                <Fld lbl="Transcript"><select className="mod-select" value={newSummary.transcript_id} onChange={(e) => setNewSummary((p) => ({ ...p, transcript_id: e.target.value }))}><option value="">No transcript link</option>{transcripts.map((tr) => <option key={tr.id} value={tr.id}>{tr.title}</option>)}</select></Fld>
                <Fld lbl="Type"><select className="mod-select" value={newSummary.summary_type} onChange={(e) => setNewSummary((p) => ({ ...p, summary_type: e.target.value }))}>{SMT.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
              </div>
              <Fld lbl="Content"><textarea className="mod-textarea" style={{ minHeight: 120 }} value={newSummary.content} onChange={(e) => setNewSummary((p) => ({ ...p, content: e.target.value }))} /></Fld>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn-add" style={{ fontSize: 9 }} onClick={addSummary}>+ SUMMARY</button></div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0", marginBottom: 6 }}>MEETING DECISIONS</div>
              <textarea className="mod-textarea" style={{ minHeight: 90 }} value={f.decisions} onChange={(e) => setF((p) => ({ ...p, decisions: e.target.value }))} onBlur={(e) => saveTA("decisions", e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0", marginBottom: 6 }}>MEETING NOTES</div>
              <textarea className="mod-textarea" style={{ minHeight: 70 }} value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} onBlur={(e) => saveTA("notes", e.target.value)} />
            </div>

            {summaries.map((sm) => {
              const session = sessions.find((s) => s.id === sm.session_id);
              return <div key={sm.id} style={{ marginBottom: 10, padding: "10px 12px", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 2 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#c8dce8" }}>{sm.title}</div>
                    <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2 }}>{sessionLabel(session)} • {pretty(sm.summary_type)}</div>
                  </div>
                  <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => delSummary(sm.id)}>DEL</button>
                </div>
                <textarea className="mod-textarea" style={{ minHeight: 120 }} value={sm.content} onChange={(e) => setSummaries((prev) => prev.map((x) => x.id === sm.id ? { ...x, content: e.target.value } : x))} onBlur={(e) => apiPatch<MeetingSummary>(`/meetings/summaries/${sm.id}`, { content: e.target.value }).then(refreshMeeting)} />
              </div>;
            })}
          </div>}

          {tab === "actions" && <div>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0 8px", alignItems: "end" }}>
                <Fld lbl={t("meetings.action_description")}><input className="mod-input" value={newA.description} onChange={(e) => setNewA((p) => ({ ...p, description: e.target.value }))} /></Fld>
                <Fld lbl={t("meetings.action_assigned")}><input className="mod-input" style={{ width: 130 }} value={newA.assigned_to} onChange={(e) => setNewA((p) => ({ ...p, assigned_to: e.target.value }))} /></Fld>
                <Fld lbl={t("meetings.action_due")}><input className="mod-input" type="date" style={{ width: 130 }} value={newA.due_date} onChange={(e) => setNewA((p) => ({ ...p, due_date: e.target.value }))} /></Fld>
                <button className="btn-add" style={{ fontSize: 9, alignSelf: "flex-end", marginTop: 20 }} onClick={addAction}>+ {t("meetings.action_add")}</button>
              </div>
            </div>
            {actions.map((a) => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, background: "rgba(0,0,0,0.15)", border: `1px solid ${sClr(a.status)}22`, borderLeft: `3px solid ${sClr(a.status)}`, borderRadius: 2 }}>
              <button onClick={() => cycleA(a)} style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: `${sClr(a.status)}18`, border: `2px solid ${sClr(a.status)}`, color: sClr(a.status), fontSize: 9, cursor: "pointer" }}>{a.status === "done" ? "✓" : a.status === "in_progress" ? "→" : "○"}</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: a.status === "done" ? "#556677" : "#c8dce8", textDecoration: a.status === "done" ? "line-through" : "none" }}>{a.description}</div>
                <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2 }}>{a.assigned_to && `→ ${a.assigned_to}`}{a.due_date && ` 📅 ${a.due_date}`}</div>
              </div>
              <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => delA(a.id)}>DEL</button>
            </div>)}
          </div>}

          {tab === "attachments" && <div style={{ paddingTop: 4 }}><AttachmentsPanel entityType="meeting" entityId={m.id} /></div>}
          {tab === "raci" && <div style={{ paddingTop: 4 }}><RaciPanel objectType="MEETING" objectId={Number(m.id)} productId={m.product_id} /></div>}

          {tab === "links" && <div>
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: "0 8px", alignItems: "end" }}>
                <Fld lbl={t("meetings.link_label")}><input className="mod-input" value={newL.label} onChange={(e) => setNewL((p) => ({ ...p, label: e.target.value }))} /></Fld>
                <Fld lbl="URL"><input className="mod-input" value={newL.url} onChange={(e) => setNewL((p) => ({ ...p, url: e.target.value }))} /></Fld>
                <Fld lbl={t("meetings.link_type")}><select className="mod-select" value={newL.link_type} onChange={(e) => setNewL((p) => ({ ...p, link_type: e.target.value }))}>{LT.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
                <button className="btn-add" style={{ fontSize: 9, alignSelf: "flex-end", marginTop: 20 }} onClick={addLnk}>+</button>
              </div>
            </div>
            {lnks.map((l) => <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 2 }}>
              <span style={{ fontSize: 9, padding: "1px 5px", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", background: "rgba(0,212,255,0.06)" }}>{pretty(l.link_type)}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 11, color: "#00d4ff", textDecoration: "none" }}>{l.label}</a>
              <span style={{ fontSize: 9, color: "#556677", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.url}</span>
              <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => delL(l.id)}>DEL</button>
            </div>)}
          </div>}
        </div>
        <div className="mod-modal__footer">
          <button className="btn-cancel" onClick={onClose}>{t("meetings.btn_cancel")}</button>
          <button className="btn-save" onClick={save} disabled={saving}>{saving ? t("meetings.btn_saving") : t("meetings.btn_save")}</button>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dark = user?.user_theme !== "light";
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stks, setStks] = useState<Stk[]>([]);
  const [detail, setDetail] = useState<Meeting | null>(null);
  const [newModal, setNewModal] = useState(false);
  const [newF, setNewF] = useState({ title: "", meeting_type: "other", meeting_date: "", status: "scheduled", primary_entity_type: "", primary_entity_id: "" });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async (pid = productId) => {
    if (!pid) {
      setMeetings([]);
      return;
    }
    const q = `?product_id=${pid}${filterType ? `&meeting_type=${filterType}` : ""}${filterStatus ? `&status=${filterStatus}` : ""}`;
    setMeetings(await apiGet<Meeting[]>(`/meetings${q}`));
  }, [productId, filterType, filterStatus]);

  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => {
    const pid = productId;
    if (!pid) {
      setStks([]);
      return;
    }
    apiGet<{ items: Stk[] }>(`/stakeholders?product_id=${pid}&size=200`).then((r) => setStks(r.items ?? [])).catch(() => setStks([]));
  }, [productId]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };

  const createMeeting = async () => {
    if (!newF.title.trim()) return;
    setSaving(true);
    try {
      const m = await apiPost<Meeting>("/meetings", {
        ...newF,
        product_id: productId ? Number(productId) : null,
        meeting_date: newF.meeting_date || null,
        primary_entity_type: newF.primary_entity_type || null,
        primary_entity_id: newF.primary_entity_id || null,
      });
      setMeetings((prev) => [m, ...prev]);
      setNewModal(false);
      setNewF({ title: "", meeting_type: "other", meeting_date: "", status: "scheduled", primary_entity_type: "", primary_entity_id: "" });
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm(t("meetings.confirm_delete"))) return;
    await apiDelete(`/meetings/${id}`);
    setMeetings((prev) => prev.filter((x) => x.id !== id));
    if (detail?.id === id) setDetail(null);
  };

  const bdr = dark ? "#0d2535" : "#d0dde8";

  return (
    <ModuleLayout moduleIcon="◈" moduleName="MEETINGS" moduleAccent="MEETINGS" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("meetings.eyebrow")}</span>
          <h1 className="mod-header__title">{t("meetings.title")} <span>{t("meetings.title_accent")}</span></h1>
          {productId && <p className="mod-header__meta">{meetings.length} {t("meetings.meta_count")}</p>}
        </div>
        {productId && <button className="btn-add" onClick={() => setNewModal(true)}>{t("meetings.btn_new")}</button>}
      </div>

      {!productId && <div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("meetings.no_product")}</div></div>}

      {productId && <>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select className="mod-select" style={{ fontSize: 10, width: 180 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">{t("meetings.filter_all_types")}</option>
            {MT.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}
          </select>
          <select className="mod-select" style={{ fontSize: 10, width: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">{t("meetings.filter_all_statuses")}</option>
            {MS.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}
          </select>
        </div>

        {meetings.length === 0 && <div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("meetings.empty_title")}</div><div className="mod-empty__sub">{t("meetings.empty_sub")}</div></div>}

        <div className="mod-table-wrap" style={{ overflowX: "auto", borderColor: bdr }}>
          {meetings.length > 0 && <table className="mod-table">
            <thead><tr>
              <th>{t("meetings.col_title")}</th>
              <th style={{ width: 130 }}>{t("meetings.col_type")}</th>
              <th style={{ width: 110 }}>{t("meetings.col_date")}</th>
              <th style={{ width: 120, textAlign: "center" }}>Primary Link</th>
              <th style={{ width: 120, textAlign: "center" }}>{t("meetings.col_status")}</th>
              <th style={{ width: 90, textAlign: "center" }}>Relations</th>
              <th style={{ width: 90, textAlign: "center" }}>Sessions</th>
              <th style={{ width: 90, textAlign: "center" }}>Transcripts</th>
              <th style={{ width: 80, textAlign: "center" }}>{t("meetings.col_actions_count")}</th>
              <th style={{ width: 90, textAlign: "center" }}>{t("meetings.col_participants")}</th>
              <th style={{ width: 80 }}></th>
            </tr></thead>
            <tbody>
              {meetings.map((m) => {
                const sc = sClr(m.status);
                const pending = m.action_items.filter((a) => a.status === "pending").length;
                return <tr key={m.id} style={{ cursor: "pointer", borderLeft: `3px solid ${sc}` }} onClick={() => setDetail(m)}>
                  <td><strong style={{ fontSize: 12, color: "#c8dce8" }}>{m.title}</strong>{m.location && <div style={{ fontSize: 9, color: "#556677", marginTop: 1 }}>📍 {m.location}</div>}</td>
                  <td style={{ color: "#7899b0", fontSize: 10 }}>{pretty(m.meeting_type)}</td>
                  <td style={{ color: "#7899b0", fontSize: 10 }}>{m.meeting_date ?? <span style={{ color: "#334455" }}>—</span>}{m.start_time && <span style={{ marginLeft: 4, color: "#556677" }}>⏰ {m.start_time}</span>}</td>
                  <td style={{ textAlign: "center", color: "#7899b0", fontSize: 10 }}>{m.primary_entity_type ? pretty(m.primary_entity_type) : "—"}</td>
                  <td style={{ textAlign: "center" }}><Bdg v={m.status} /></td>
                  <td style={{ textAlign: "center", color: "#7899b0", fontSize: 11 }}>{m.relations?.length ?? 0}</td>
                  <td style={{ textAlign: "center", color: "#7899b0", fontSize: 11 }}>{m.sessions.length}</td>
                  <td style={{ textAlign: "center", color: "#7899b0", fontSize: 11 }}>{m.transcripts.length}</td>
                  <td style={{ textAlign: "center" }}>{pending > 0 ? <span style={{ color: "#ff9900", fontSize: 11, fontWeight: 700 }}>{pending}</span> : <span style={{ color: "#334455", fontSize: 11 }}>{m.action_items.length}</span>}</td>
                  <td style={{ textAlign: "center", color: "#7899b0", fontSize: 11 }}>{m.participants.length}</td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, padding: "1px 5px" }} onClick={() => deleteMeeting(m.id)}>DEL</button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>}
        </div>
      </>}

      {detail && <MeetingModal m={detail} onClose={() => setDetail(null)} onSaved={(updated) => { setDetail(updated); setMeetings((prev) => prev.map((x) => x.id === updated.id ? updated : x)); }} stks={stks} />}

      {newModal && (
        <div className="mod-overlay" onClick={() => setNewModal(false)}>
          <div className="mod-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// MEETINGS //</span><h3 className="mod-modal__title">{t("meetings.modal_new")} <span>{t("meetings.modal_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={() => setNewModal(false)}>✕</button></div>
            <div className="mod-modal__body">
              <Fld lbl={t("meetings.field_title")}><input className="mod-input" value={newF.title} onChange={(e) => setNewF((p) => ({ ...p, title: e.target.value }))} placeholder={t("meetings.placeholder_title")} /></Fld>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Fld lbl={t("meetings.field_type")}><select className="mod-select" value={newF.meeting_type} onChange={(e) => setNewF((p) => ({ ...p, meeting_type: e.target.value }))}>{MT.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}</select></Fld>
                <Fld lbl={t("meetings.field_date")}><input className="mod-input" type="date" value={newF.meeting_date} onChange={(e) => setNewF((p) => ({ ...p, meeting_date: e.target.value }))} /></Fld>
                <Fld lbl="Primary entity type"><select className="mod-select" value={newF.primary_entity_type} onChange={(e) => setNewF((p) => ({ ...p, primary_entity_type: e.target.value }))}>
                  <option value="">None</option>{ET.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}
                </select></Fld>
                <Fld lbl="Primary entity ID"><input className="mod-input" value={newF.primary_entity_id} onChange={(e) => setNewF((p) => ({ ...p, primary_entity_id: e.target.value }))} placeholder="record id" /></Fld>
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setNewModal(false)}>{t("meetings.btn_cancel")}</button>
              <button className="btn-save" onClick={createMeeting} disabled={saving || !newF.title.trim()}>{saving ? t("meetings.btn_saving") : t("meetings.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
