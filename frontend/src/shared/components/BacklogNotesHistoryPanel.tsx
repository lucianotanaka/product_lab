import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../services/api";

export interface BacklogNoteHistoryEntry {
  author?: string | null;
  timestamp?: string | null;
  content: string;
}

export interface BacklogNote {
  note_id: number;
  item_id: number;
  author: string;
  content: string;
  note_type?: string;
  status?: string;
  followup_id?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  last_updated_by?: string | null;
  history_entries?: BacklogNoteHistoryEntry[];
}

interface BacklogNotesHistoryPanelProps {
  backlogItemId: number;
  currentUserName: string;
  title?: string;
  compact?: boolean;
}

const NOTE_TYPES = [
  "information",
  "blocker",
  "issue",
  "decision",
  "risk",
  "follow_up",
  "status_update",
];

const NOTE_STATUSES = ["open", "in_progress", "done", "cancelled"];
const FOLLOWUP_ACTION_TYPES = [
  "schedule_meeting",
  "request_info",
  "send_material",
  "review_answer",
  "validate",
  "escalate",
  "send_email",
  "update_stakeholder",
  "other",
];
const FOLLOWUP_ENTITY_LABELS: Record<string, string> = {
  backlog_item: "Backlog",
};
const FOLLOWUP_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  done: "Done",
  cancelled: "Cancelled",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  information: "INFORMATION",
  blocker: "BLOCKER",
  issue: "ISSUE",
  decision: "DECISION",
  risk: "RISK",
  follow_up: "FOLLOW-UP",
  status_update: "STATUS UPDATE",
};

const NOTE_STATUS_LABELS: Record<string, string> = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  done: "DONE",
  cancelled: "CANCELLED",
};

const noteTypeColor = (noteType?: string) => {
  switch (noteType) {
    case "blocker": return "#ff6b6b";
    case "issue": return "#ff9900";
    case "decision": return "#00d4ff";
    case "risk": return "#ff4d8d";
    case "follow_up": return "#ffd166";
    case "status_update": return "#7bdff2";
    default: return "#8fa8ba";
  }
};

const noteStatusColor = (status?: string) => {
  switch (status) {
    case "done": return "#00ff88";
    case "in_progress": return "#ffb703";
    case "cancelled": return "#9aa7b4";
    default: return "#00d4ff";
  }
};

const TIMESTAMP_PATTERN = /\[(\d{1,2}-[A-Za-zÀ-ÿ]{3}-\d{4}\s+\d{1,2}:\d{2})\]\s*/g;

const splitLegacyHistoryEntries = (value?: string, fallbackAuthor?: string | null): BacklogNoteHistoryEntry[] => {
  if (!value) return [];
  const normalized = value.replace(/\r/g, "").trim();
  if (!normalized) return [];

  const matches = Array.from(normalized.matchAll(TIMESTAMP_PATTERN));
  if (matches.length === 0) {
    return [{ author: fallbackAuthor, content: normalized }];
  }

  const entries: BacklogNoteHistoryEntry[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const start = (current.index ?? 0) + current[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? normalized.length) : normalized.length;
    const content = normalized.slice(start, end).trim();
    if (content) {
      entries.push({
        author: i === 0 ? fallbackAuthor : undefined,
        timestamp: current[1],
        content,
      });
    }
  }

  return entries;
};

const extractLatestEntryText = (value?: string) => {
  const entries = splitLegacyHistoryEntries(value);
  return entries[0]?.content ?? "";
};

const formatHistoryMeta = (note: BacklogNote) => {
  const createdBy = note.created_by || note.author || "—";
  const updatedBy = note.last_updated_by || note.author || "—";
  return createdBy === updatedBy
    ? `CRIADO E ÚLTIMA ATUALIZAÇÃO POR ${updatedBy}`
    : `CRIADO POR ${createdBy} • ÚLTIMA ATUALIZAÇÃO POR ${updatedBy}`;
};

const formatCompactTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return "";
  const match = timestamp.match(/^(\d{1,2})-([A-Za-zÀ-ÿ]{3})-(\d{4})\s+(\d{1,2}:\d{2})$/);
  if (!match) return timestamp;
  const [, day, month, year, time] = match;
  return `${day.padStart(2, "0")}/${month.toLowerCase()}/${year.slice(-2)} · ${time}`;
};

export default function BacklogNotesHistoryPanel({
  backlogItemId,
  currentUserName,
  title = "NOTES & HISTORY",
  compact = false,
}: BacklogNotesHistoryPanelProps) {
  const [notes, setNotes] = useState<BacklogNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("information");
  const [noteStatus, setNoteStatus] = useState("open");
  const [createFollowup, setCreateFollowup] = useState(false);
  const [followupActionType, setFollowupActionType] = useState("other");
  const [followupStatus, setFollowupStatus] = useState("pending");
  const [followupAssignedTo, setFollowupAssignedTo] = useState(currentUserName || "");
  const [followupDueDate, setFollowupDueDate] = useState("");
  const [followupNotes, setFollowupNotes] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const latestNoteContent = extractLatestEntryText(notes[0]?.content);
  const followupContextLabel = FOLLOWUP_ENTITY_LABELS.backlog_item;

  const loadNotes = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<BacklogNote[]>(`/backlog/${backlogItemId}/notes`);
      setNotes(data);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar notas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNotes([]);
    setLoaded(false);
    setError("");
    setExpandedNotes({});
    resetForm();
    void loadNotes();
  }, [backlogItemId]);

  useEffect(() => {
    if (createFollowup) {
      setFollowupAssignedTo(currentUserName || "");
      setFollowupNotes(content.trim() || latestNoteContent);
    }
  }, [createFollowup, currentUserName, content, latestNoteContent]);

  const resetForm = () => {
    setContent("");
    setNoteType("information");
    setNoteStatus("open");
    setCreateFollowup(false);
    setFollowupActionType("other");
    setFollowupStatus("pending");
    setFollowupAssignedTo(currentUserName || "");
    setFollowupDueDate("");
    setFollowupNotes("");
    setEditingNoteId(null);
  };

  const startAppend = (note: BacklogNote) => {
    setEditingNoteId(note.note_id);
    setNoteType(note.note_type ?? "information");
    setNoteStatus(note.status ?? "open");
    setCreateFollowup(Boolean(note.followup_id));
    setFollowupActionType("other");
    setFollowupStatus("pending");
    setFollowupAssignedTo(currentUserName || "");
    setFollowupDueDate("");
    setFollowupNotes(extractLatestEntryText(note.content));
    setContent("");
  };

  const cancelAppend = () => {
    resetForm();
  };

  const saveNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiPost(`/backlog/${backlogItemId}/notes`, {
        author: currentUserName || "—",
        content: content.trim(),
        note_type: noteType,
        status: noteStatus,
        parent_note_id: editingNoteId,
        create_followup: createFollowup,
        followup_action_type: createFollowup ? followupActionType : null,
        followup_status: createFollowup ? followupStatus : null,
        followup_entity_type: createFollowup ? "backlog_item" : null,
        followup_assigned_to: createFollowup ? (followupAssignedTo.trim() || currentUserName || null) : null,
        followup_due_date: createFollowup ? (followupDueDate || null) : null,
        followup_notes: createFollowup ? ((followupNotes.trim() || content.trim() || latestNoteContent || "").trim() || null) : null,
      });
      resetForm();
      await loadNotes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar nota");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid rgba(0,212,255,0.18)",
        padding: compact ? 10 : 12,
        background: "rgba(2,12,24,0.2)",
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff", marginBottom: 6 }}>{title}</div>
      </div>

      {loading && <div style={{ color: "#7899b0", fontSize: 11 }}>CARREGANDO HISTÓRICO...</div>}
      {error && <div className="mod-error">⚠ {error}</div>}

      {loaded && (
        <>
          <div style={{ display: "grid", gap: 8, maxHeight: compact ? 240 : 320, overflowY: "auto" }}>
            {notes.length === 0 ? (
              <div style={{ color: "#7899b0", fontSize: 11 }}>
                SEM REGISTROS DE NOTES & HISTORY PARA ESTE ITEM.
              </div>
            ) : (
              notes.map(note => {
                const historyEntries = note.history_entries && note.history_entries.length > 0
                  ? note.history_entries
                  : splitLegacyHistoryEntries(note.content, note.author);
                const isExpanded = expandedNotes[note.note_id] ?? false;
                const visibleEntries = isExpanded ? historyEntries : historyEntries.slice(0, 1);

                return (
                <div
                  key={note.note_id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)",
                    padding: 10,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#d6f3ff", fontSize: 11, fontWeight: 700 }}>
                        {note.last_updated_by || note.author}
                      </div>
                      <div style={{ color: "#7899b0", fontSize: 9, marginTop: 3 }}>
                        {formatHistoryMeta(note)}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        <span style={{ border: `1px solid ${noteTypeColor(note.note_type)}55`, color: noteTypeColor(note.note_type), padding: "2px 6px", fontSize: 9 }}>
                          {NOTE_TYPE_LABELS[note.note_type ?? "information"] ?? (note.note_type ?? "INFORMATION").toUpperCase()}
                        </span>
                        <span style={{ border: `1px solid ${noteStatusColor(note.status)}55`, color: noteStatusColor(note.status), padding: "2px 6px", fontSize: 9 }}>
                          {NOTE_STATUS_LABELS[note.status ?? "open"] ?? (note.status ?? "OPEN").toUpperCase()}
                        </span>
                        {note.followup_id && (
                          <span style={{ border: "1px solid rgba(255,209,102,0.45)", color: "#ffd166", padding: "2px 6px", fontSize: 9 }}>
                            FOLLOW-UP GERADO
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {historyEntries.length > 1 && (
                        <button
                          className="btn-icon"
                          type="button"
                          onClick={() => {
                            setExpandedNotes(prev => ({ ...prev, [note.note_id]: !isExpanded }));
                          }}
                        >
                          {isExpanded ? "OCULTAR EVENTOS" : `VER ${historyEntries.length - 1} EVENTO(S)`}
                        </button>
                      )}
                      <button className="btn-icon" type="button" onClick={() => { startAppend(note); }}>
                        ATUALIZAR
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12, position: "relative", paddingLeft: 16 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 5,
                        top: 4,
                        bottom: 4,
                        width: 1,
                        background: "rgba(0,212,255,0.18)",
                      }}
                    />
                    {visibleEntries.map((entry, index) => (
                      <div
                        key={`${note.note_id}-${isExpanded ? index : `latest-${index}`}`}
                        style={{
                          position: "relative",
                          padding: "2px 0 10px 14px",
                          display: "grid",
                          gap: 6,
                          borderBottom: index < visibleEntries.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: -15,
                            top: 14,
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: index === 0 ? "#00d4ff" : "#0b2236",
                            border: "1px solid rgba(0,212,255,0.65)",
                            boxShadow: index === 0 ? "0 0 8px rgba(0,212,255,0.45)" : "none",
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ color: "#9fc4d8", fontSize: 10, fontWeight: 600 }}>
                            {entry.author || note.last_updated_by || note.author}
                          </div>
                          <div style={{ color: "#7899b0", fontSize: 9, letterSpacing: 0.2 }}>
                            {entry.timestamp ? formatCompactTimestamp(entry.timestamp) : "SEM DATA"}
                          </div>
                        </div>
                        <div style={{ color: "#d6f3ff", fontSize: 11, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          {entry.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
            )}
          </div>

          <div style={{ display: "grid", gap: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
            {editingNoteId && (
              <div style={{ border: "1px solid rgba(0,212,255,0.18)", background: "rgba(0,212,255,0.05)", padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ color: "#c8d8e8", fontSize: 11 }}>
                  Atualizando o mesmo registro de histórico #{editingNoteId}. A nova interação será adicionada no topo do conteúdo existente.
                </div>
                <button className="btn-icon" type="button" onClick={cancelAppend}>
                  CANCELAR ATUALIZAÇÃO
                </button>
              </div>
            )}
            <div className="mod-field-row" style={{ marginBottom: 0 }}>
              <div className="mod-field">
                <label className="mod-field__label">TIPO</label>
                <select className="mod-select" value={noteType} onChange={e => setNoteType(e.target.value)}>
                  {NOTE_TYPES.map(type => (
                    <option key={type} value={type}>
                      {(NOTE_TYPE_LABELS[type] ?? type).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">STATUS</label>
                <select className="mod-select" value={noteStatus} onChange={e => setNoteStatus(e.target.value)}>
                  {NOTE_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {(NOTE_STATUS_LABELS[status] ?? status).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mod-field" style={{ marginBottom: 0 }}>
              <label className="mod-field__label">REGISTRO</label>
              <textarea
                className="mod-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={editingNoteId ? "Descreva a nova interação para adicionar ao histórico existente..." : "Ex.: bloqueio com fornecedor, decisão tomada, risco identificado, próximo passo..."}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#d6f3ff", fontSize: 11 }}>
              <input type="checkbox" checked={createFollowup} onChange={e => setCreateFollowup(e.target.checked)} />
              GERAR FOLLOW-UP PARA ACOMPANHAMENTO
            </label>

            {createFollowup && (
              <div style={{ display: "grid", gap: 10, border: "1px solid rgba(255,209,102,0.18)", padding: 10, background: "rgba(255,209,102,0.04)" }}>
                <div className="mod-field-row" style={{ marginBottom: 0 }}>
                  <div className="mod-field">
                    <label className="mod-field__label">ACTION TYPE</label>
                    <select className="mod-select" value={followupActionType} onChange={e => setFollowupActionType(e.target.value)}>
                      {FOLLOWUP_ACTION_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type === "other" ? "Other" : type.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">STATUS</label>
                    <select className="mod-select" value={followupStatus} onChange={e => setFollowupStatus(e.target.value)}>
                      {Object.entries(FOLLOWUP_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mod-field" style={{ marginBottom: 0 }}>
                  <label className="mod-field__label">MÓDULO / CONTEXTO</label>
                  <input className="mod-input" value={followupContextLabel} readOnly />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">DESCRIPTION *</label>
                  <textarea
                    className="mod-textarea"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={editingNoteId ? "Descreva a nova interação para adicionar ao histórico existente..." : "Describe the follow-up action..."}
                  />
                </div>
                <div className="mod-field-row" style={{ marginBottom: 0 }}>
                  <div className="mod-field">
                    <label className="mod-field__label">ASSIGNED TO</label>
                    <input className="mod-input" value={followupAssignedTo} onChange={e => setFollowupAssignedTo(e.target.value)} />
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">DUE DATE</label>
                    <input className="mod-input" type="date" value={followupDueDate} onChange={e => setFollowupDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="mod-field" style={{ marginBottom: 0 }}>
                  <label className="mod-field__label">NOTES</label>
                  <input className="mod-input" value={followupNotes} onChange={e => setFollowupNotes(e.target.value)} placeholder="Additional notes..." />
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-save" type="button" onClick={() => { void saveNote(); }} disabled={saving || !content.trim()}>
                {saving
                  ? "SALVANDO..."
                  : editingNoteId
                    ? createFollowup
                      ? "ATUALIZAR HISTÓRICO E GERAR FOLLOW-UP"
                      : "ATUALIZAR HISTÓRICO"
                    : createFollowup
                      ? "SALVAR HISTÓRICO E GERAR FOLLOW-UP"
                      : "ADICIONAR AO HISTÓRICO"}
              </button>
            </div>
          </div>
        </>
      )}

      {!loading && loaded && (
        <div style={{ color: notes.length > 0 ? "#00ff88" : "#7899b0", fontSize: 10, letterSpacing: 0.8 }}>
          {notes.length > 0
            ? `${notes.length} REGISTRO(S) ENCONTRADO(S) EM NOTES & HISTORY`
            : "0 REGISTROS EM NOTES & HISTORY"}
        </div>
      )}
    </div>
  );
}
