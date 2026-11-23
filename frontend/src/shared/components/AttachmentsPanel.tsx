import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttachmentMeta {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by?: string;
  created_at: string;
}

interface AttachmentWithData extends AttachmentMeta {
  data_base64: string;
}

interface Props {
  entityType: string;   // e.g. 'meeting' | 'backlog_item' | 'discovery_research'
  entityId: string;
  apiBase?: string;     // defaults to /api/v1 via env
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "text/plain": "📝",
  "text/csv": "📊",
  "image/png": "🖼",
  "image/jpeg": "🖼",
  "image/gif": "🖼",
  "image/webp": "🖼",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/msword": "📝",
  "application/json": "📋",
};

const mimeIcon = (mime: string) => MIME_ICON[mime] ?? "📎";

function isViewable(mime: string): boolean {
  return (
    mime === "application/pdf" ||
    mime.startsWith("image/") ||
    mime === "text/plain" ||
    mime === "text/csv"
  );
}

// ─── Inline Viewer ────────────────────────────────────────────────────────────
function AttachmentViewer({ att, onClose }: { att: AttachmentWithData; onClose: () => void }) {
  const { t } = useTranslation();
  const dataUrl = `data:${att.mime_type};base64,${att.data_base64}`;

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth: 900, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="mod-modal__header">
          <div>
            <span className="mod-modal__eyebrow">// ANEXO //</span>
            <h3 className="mod-modal__title">{att.file_name} <span style={{ fontSize: 11, color: "#7899b0" }}>{formatBytes(att.file_size)}</span></h3>
          </div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: "8px 16px", overflowY: "auto", maxHeight: "75vh" }}>
          {att.mime_type === "application/pdf" && (
            <iframe
              src={dataUrl}
              title={att.file_name}
              style={{ width: "100%", height: "70vh", border: "none", borderRadius: 3 }}
            />
          )}
          {att.mime_type.startsWith("image/") && (
            <img
              src={dataUrl}
              alt={att.file_name}
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", margin: "0 auto" }}
            />
          )}
          {att.mime_type === "text/plain" && (
            <pre style={{ fontSize: 11, color: "#c8dce8", lineHeight: 1.6, whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 3, maxHeight: "65vh", overflowY: "auto" }}>
              {atob(att.data_base64)}
            </pre>
          )}
          {att.mime_type === "text/csv" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ fontSize: 10, borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  {atob(att.data_base64).split("\n").slice(0, 200).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
                      {row.split(",").map((cell, j) => (
                        <td key={j} style={{ padding: "3px 8px", color: i === 0 ? "#00d4ff" : "#c8dce8", fontWeight: i === 0 ? 700 : 400 }}>
                          {cell.replace(/^"|"$/g, "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isViewable(att.mime_type) && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#7899b0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{mimeIcon(att.mime_type)}</div>
              <div style={{ fontSize: 12 }}>{t("attachments.no_preview")}</div>
              <div style={{ fontSize: 10, color: "#556677", marginTop: 4 }}>{att.mime_type}</div>
            </div>
          )}
        </div>
        <div className="mod-modal__footer">
          <button className="btn-cancel" onClick={onClose}>{t("attachments.btn_close")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AttachmentsPanel({ entityType, entityId }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<AttachmentMeta[]>([]);
  const [viewing, setViewing] = useState<AttachmentWithData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const token = typeof window !== "undefined" ? localStorage.getItem("pl_token") ?? document.cookie.match(/pl_token=([^;]+)/)?.[1] : "";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/attachments?entity_type=${entityType}&entity_id=${entityId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) setItems(await res.json());
    } catch {/**/}
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("entity_type", entityType);
      form.append("entity_id", entityId);
      form.append("file", file);
      const res = await fetch(`${BASE}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const created: AttachmentMeta = await res.json();
      setItems(prev => [...prev, created]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("attachments.err_upload"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openViewer = async (id: string) => {
    setLoadingId(id); setError("");
    try {
      const res = await fetch(`${BASE}/attachments/${id}/data`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AttachmentWithData = await res.json();
      setViewing(data);
    } catch {
      setError(t("attachments.err_load"));
    } finally {
      setLoadingId(null);
    }
  };

  const deleteAttachment = async (id: string) => {
    if (!confirm(t("attachments.confirm_delete"))) return;
    try {
      await fetch(`${BASE}/attachments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      setItems(prev => prev.filter(x => x.id !== id));
    } catch {/**/}
  };

  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 3 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>📎 {t("attachments.title")} {items.length > 0 && `(${items.length})`}</span>
        <button
          className="btn-add"
          style={{ fontSize: 9, padding: "2px 8px" }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? t("attachments.uploading") : t("attachments.btn_upload")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.json"
          onChange={handleFileChange}
        />
      </div>

      {error && <div style={{ fontSize: 10, color: "#ff6b6b", marginBottom: 8 }}>⚠ {error}</div>}

      {items.length === 0 && !uploading && (
        <div style={{ fontSize: 10, color: "#7899b0", textAlign: "center", padding: "8px 0" }}>{t("attachments.empty")}</div>
      )}

      {/* File list */}
      {items.map(a => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 2 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{mimeIcon(a.mime_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#c8dce8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.file_name}</div>
            <div style={{ fontSize: 9, color: "#7899b0", marginTop: 1 }}>
              {formatBytes(a.file_size)}
              {a.uploaded_by && ` · ${a.uploaded_by}`}
              {` · ${new Date(a.created_at).toLocaleDateString("pt-BR")}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {isViewable(a.mime_type) && (
              <button
                className="btn-icon"
                style={{ fontSize: 8, padding: "1px 6px", color: "#00d4ff", borderColor: "rgba(0,212,255,0.3)" }}
                onClick={() => openViewer(a.id)}
                disabled={loadingId === a.id}
              >
                {loadingId === a.id ? "..." : t("attachments.btn_view")}
              </button>
            )}
            <a
              href={`${BASE}/attachments/${a.id}/raw`}
              download={a.file_name}
              className="btn-icon"
              style={{ fontSize: 8, padding: "1px 6px", textDecoration: "none", color: "#7899b0" }}
            >
              ⬇
            </a>
            <button
              className="btn-icon btn-icon--danger"
              style={{ fontSize: 8, padding: "1px 5px" }}
              onClick={() => deleteAttachment(a.id)}
            >
              DEL
            </button>
          </div>
        </div>
      ))}

      {/* Inline viewer modal */}
      {viewing && <AttachmentViewer att={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
