import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useProduct } from "../../../contexts/ProductContext";
import { apiGet, ApiError } from "../../../shared/services/api";
import AIAgentExecutionStatus from "../../../shared/components/ai_agent_execution_status";
import {
  createAIAgentRequestId,
  sendAIAgentPrompt,
  subscribeAIAgentExecutionStatus,
  type AIAgentExecutionStatusResponse,
  type AIAgentExecutionSubscription,
} from "../../../shared/services/aiAgentExecution";

interface AIConnectionOption {
  id: string;
  name: string;
  provider: string;
  scope: string;
  product_id?: number | null;
  company_id?: number | null;
  is_active: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: string;
}

const MODULE_OPTIONS = [
  { value: "", label: "ALL MODULES" },
  { value: "discovery", label: "DISCOVERY" },
  { value: "vpc", label: "VPC" },
  { value: "process_mapping", label: "PROCESS MAPPING" },
  { value: "requirements", label: "REQUIREMENTS" },
  { value: "decisions", label: "DECISIONS" },
  { value: "knowledge", label: "KNOWLEDGE" },
  { value: "business_domains", label: "BUSINESS DOMAINS" },
  { value: "roadmap", label: "ROADMAP" },
  { value: "backlog", label: "BACKLOG" },
  { value: "prioritization", label: "PRIORITIZATION" },
  { value: "meetings", label: "MEETINGS" },
  { value: "communication", label: "COMMUNICATION" },
  { value: "stakeholders", label: "STAKEHOLDERS" },
  { value: "risks", label: "RISKS" },
  { value: "raci", label: "RACI" },
  { value: "followups", label: "FOLLOWUPS" },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIAgentPage() {
  const location = useLocation();
  const { productId: contextProductId, productName: contextProductName, setProduct, products } = useProduct();
  const [productId, setProductId] = useState(contextProductId || localStorage.getItem("pl_product") || "");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [connections, setConnections] = useState<AIConnectionOption[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [autoPromptSent, setAutoPromptSent] = useState(false);
  const [executionVisible, setExecutionVisible] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<AIAgentExecutionStatusResponse | null>(null);
  const executionSubscriptionRef = useRef<AIAgentExecutionSubscription | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "system",
      content:
        "AI Agent ready. Ask about any Product Lab module. The agent will use the active AI connection for the current scope.",
    },
  ]);

  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId]
  );

  useEffect(() => {
    if (contextProductId && contextProductId !== productId) {
      setProductId(contextProductId);
    }
  }, [contextProductId, productId]);

  useEffect(() => {
    const loadConnections = async () => {
      setLoadingConnections(true);
      setError("");
      try {
        const query = productId ? `?product_id=${encodeURIComponent(productId)}` : "";
        const data = await apiGet<AIConnectionOption[]>(`/integrations/ai/connections${query}`);
        setConnections(data);
        if (data.length === 1) {
          setSelectedConnectionId(data[0].id);
        } else if (!data.find((item) => item.id === selectedConnectionId)) {
          setSelectedConnectionId("");
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load AI connections.";
        setError(msg);
        setConnections([]);
        setSelectedConnectionId("");
      } finally {
        setLoadingConnections(false);
      }
    };

    loadConnections();
  }, [productId, selectedConnectionId]);

  useEffect(() => {
    return () => {
      executionSubscriptionRef.current?.stop();
    };
  }, []);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      meta: moduleName ? `MODULE: ${moduleName.toUpperCase()}` : "GLOBAL CONTEXT",
    };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setError("");

    try {
      const requestId = createAIAgentRequestId();
      setExecutionVisible(true);
      setExecutionStatus({
        request_id: requestId,
        status: "running",
        message: "Enviando solicitação",
        steps: [
          {
            key: "received",
            label: "Pergunta recebida",
            status: "running",
            message: "Enviando solicitação",
          },
        ],
      });

      const { response, requestId: resolvedRequestId } = await sendAIAgentPrompt({
        message: trimmed,
        product_id: productId ? Number(productId) : null,
        product_name:
          contextProductName ||
          products.find((item) => String(item.product_id) === productId)?.name ||
          null,
        module: moduleName || null,
        submodule: null,
        entity_type: null,
        entity_id: null,
        resource_type: null,
        resource_id: null,
        opportunity_id: null,
        research_id: null,
        canvas_id: null,
        process_id: null,
        sprint_id: null,
        stakeholder_id: null,
        meeting_id: null,
        transcript_id: null,
        connection_id: selectedConnectionId || null,
        context: context.trim() || null,
        request_id: requestId,
      });

      executionSubscriptionRef.current?.stop();
      executionSubscriptionRef.current = subscribeAIAgentExecutionStatus(
        {
          requestId: resolvedRequestId,
          connectionId: response.connection?.id || selectedConnectionId || null,
          productId: productId ? Number(productId) : null,
          intervalMs: 800,
        },
        {
          onUpdate: setExecutionStatus,
          onError: () => undefined,
          onComplete: setExecutionStatus,
        }
      );

      if (response.requires_selection) {
        const returnedConnections = (response.connections ?? []).map((connection) => ({
          ...connection,
          is_active: true,
        }));
        setConnections(returnedConnections);
        setSelectedConnectionId("");
      setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "system",
            content:
              response.message ||
              "Multiple active AI connections found. Select which model/agent you want to use and send the question again.",
          },
        ]);
        return;
      }

      const connectionMeta = response.connection
        ? `${response.connection.name} · ${response.connection.provider} · ${response.connection.scope}`
        : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: response.answer || "No response returned by the AI connection.",
          meta: connectionMeta,
        },
      ]);
      setMessage("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to send message to AI Agent.";
      setError(msg);
      setExecutionStatus((prev) => ({
        request_id: prev?.request_id || createAIAgentRequestId(),
        status: "fail",
        message: "Falha na execução",
        steps: prev?.steps ?? [],
      }));
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "system",
          content: `ERROR: ${msg}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const navState = location.state as {
      initialPrompt?: string;
      initialModule?: string;
      initialContext?: string;
      initialConnectionId?: string;
    } | null;

    if (!navState) return;
    if (navState.initialModule && navState.initialModule !== moduleName) {
      setModuleName(navState.initialModule);
    }
    if (navState.initialContext && navState.initialContext !== context) {
      setContext(navState.initialContext);
    }
    if (navState.initialConnectionId && navState.initialConnectionId !== selectedConnectionId) {
      setSelectedConnectionId(navState.initialConnectionId);
    }

    if (
      navState.initialPrompt &&
      !autoPromptSent &&
      !loadingConnections &&
      connections.length > 0 &&
      (connections.length === 1 || selectedConnectionId)
    ) {
      setMessage(navState.initialPrompt);
      setAutoPromptSent(true);
      void sendPrompt(navState.initialPrompt);
    }
  }, [location.state, autoPromptSent, loadingConnections, connections, selectedConnectionId, moduleName, context]);

  const handleProductChange = (id: string) => {
    const selected = products.find((item) => String(item.product_id) === id);
    localStorage.setItem("pl_product", id);
    setProduct(id, selected?.name ?? "");
    setProductId(id);
  };

  const sendMessage = async () => {
    await sendPrompt(message);
  };

  return (
    <ModuleLayout
      moduleIcon="◉"
      moduleName="AI AGENT"
      moduleAccent="AGENT"
      selectedProductId={productId}
      onProductChange={handleProductChange}
    >
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// INTELLIGENT ASSISTANT //</span>
          <h1 className="mod-header__title">
            AI <span>AGENT</span>
          </h1>
          <p className="mod-header__meta">
            Chat with the active AI connection about all Product Lab modules.
          </p>
        </div>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}
      <AIAgentExecutionStatus
        execution={executionStatus}
        visible={executionVisible}
        title="AI AGENT EXECUTION STATUS"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px minmax(0, 1fr)",
          gap: 18,
          alignItems: "stretch",
          height: "calc(100vh - 180px)",
          minHeight: 720,
        }}
      >
        <aside
          style={{
            border: "1px solid rgba(13,37,53,0.95)",
            background: "linear-gradient(180deg, rgba(5,12,20,0.96), rgba(3,8,14,0.92))",
            padding: 16,
            minHeight: 0,
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxShadow: "inset 0 1px 0 rgba(0,212,255,0.05)",
          }}
        >
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff", marginBottom: 8 }}>
              // AGENT CONTROL //
            </div>
            <div style={{ fontSize: 18, color: "#d7f5ff", fontWeight: 600, marginBottom: 6 }}>
              Product Lab AI
            </div>
            <div style={{ fontSize: 11, color: "#6f90a6", lineHeight: 1.5 }}>
              Choose the active connection, define module scope and optionally add extra context.
            </div>
          </div>

          <button
            className="btn-icon"
            onClick={() =>
              setMessages([
                {
                  id: makeId(),
                  role: "system",
                  content:
                    "AI Agent ready. Ask about any Product Lab module. The agent will use the active AI connection for the current scope.",
                },
              ])
            }
            style={{ alignSelf: "flex-start" }}
          >
            CLEAR CHAT
          </button>

          <div className="mod-field">
            <label className="mod-field__label">ACTIVE AI CONNECTION</label>
            <select
              className="mod-select"
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              disabled={loadingConnections || connections.length === 0}
            >
              <option value="">
                {loadingConnections
                  ? "LOADING CONNECTIONS..."
                  : connections.length > 1
                  ? "SELECT AN AI MODEL / AGENT"
                  : connections.length === 1
                  ? "AUTO-SELECTED ACTIVE CONNECTION"
                  : "NO ACTIVE AI CONNECTION"}
              </option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} · {connection.provider} · {connection.scope}
                </option>
              ))}
            </select>
          </div>

          <div className="mod-field">
            <label className="mod-field__label">MODULE CONTEXT</label>
            <select
              className="mod-select"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            >
              {MODULE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: 12,
              border: "1px solid rgba(0,212,255,0.12)",
              background: "rgba(0,212,255,0.035)",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0", marginBottom: 6 }}>
              CURRENT RESOLUTION
            </div>
            <div style={{ fontSize: 11, color: selectedConnection ? "#c8dce8" : "#556677", lineHeight: 1.5 }}>
              {selectedConnection
                ? `${selectedConnection.name} (${selectedConnection.provider} / ${selectedConnection.scope})`
                : connections.length > 1
                ? "Multiple active connections detected. User selection required."
                : connections.length === 1
                ? "Single active connection available."
                : "No active AI connection found for the current scope."}
            </div>
          </div>

          <div className="mod-field" style={{ marginBottom: 0 }}>
            <label className="mod-field__label">EXTRA CONTEXT</label>
            <textarea
              className="mod-textarea"
              style={{ minHeight: 170 }}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional context for the AI Agent..."
            />
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: 12,
              border: "1px solid rgba(0,255,136,0.14)",
              background: "rgba(0,255,136,0.035)",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#00ff88", marginBottom: 6 }}>
              ACTIVE SCOPE
            </div>
            <div style={{ fontSize: 11, color: "#c8dce8", lineHeight: 1.5 }}>
              Product: {contextProductName || products.find((item) => String(item.product_id) === productId)?.name || "GLOBAL"}
              <br />
              Module: {moduleName || "ALL MODULES"}
            </div>
          </div>
        </aside>

        <section
          style={{
            border: "1px solid rgba(13,37,53,0.95)",
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "linear-gradient(180deg, rgba(4,10,18,0.98), rgba(2,6,12,0.96))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid rgba(13,37,53,0.95)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff" }}>// AI CHAT //</div>
              <div style={{ fontSize: 16, color: "#d7f5ff", marginTop: 6, fontWeight: 600 }}>
                ChatGPT-like workspace for Product Lab
              </div>
              <div style={{ fontSize: 11, color: "#6f90a6", marginTop: 4 }}>
                Product-aware assistant for all Product Lab modules
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                color: selectedConnection ? "#00ff88" : "#7899b0",
                border: `1px solid ${selectedConnection ? "rgba(0,255,136,0.25)" : "rgba(120,153,176,0.2)"}`,
                background: selectedConnection ? "rgba(0,255,136,0.06)" : "rgba(120,153,176,0.06)",
                padding: "8px 10px",
                whiteSpace: "nowrap",
              }}
            >
              {selectedConnection ? `LIVE · ${selectedConnection.name}` : "WAITING CONNECTION"}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {messages.map((item) => {
              const isUser = item.role === "user";
              const isAssistant = item.role === "assistant";
              const accent = isUser ? "#00d4ff" : isAssistant ? "#00ff88" : "#9bb5c8";
              const alignSelf = isUser ? "flex-end" : "flex-start";
              const maxWidth = isUser ? "78%" : "92%";
              const background = isUser
                ? "linear-gradient(180deg, rgba(0,212,255,0.14), rgba(0,212,255,0.07))"
                : isAssistant
                ? "linear-gradient(180deg, rgba(10,18,28,0.96), rgba(7,14,22,0.96))"
                : "linear-gradient(180deg, rgba(120,153,176,0.08), rgba(120,153,176,0.04))";

              return (
                <div
                  key={item.id}
                  style={{
                    alignSelf,
                    width: "100%",
                    maxWidth,
                    border: `1px solid ${accent}22`,
                    background,
                    padding: "14px 16px",
                    boxShadow: isAssistant ? "0 8px 24px rgba(0,0,0,0.16)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: accent,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${accent}33`,
                        color: accent,
                        fontSize: 10,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {isUser ? "U" : isAssistant ? "AI" : "SYS"}
                    </span>
                    <span>{item.role.toUpperCase()}</span>
                    {item.meta ? <span style={{ color: "#6f90a6" }}>· {item.meta}</span> : null}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#d6e7f2", lineHeight: 1.75 }}>
                    {item.content}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              padding: 18,
              borderTop: "1px solid rgba(13,37,53,0.95)",
              background: "rgba(2,8,14,0.96)",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(0,212,255,0.18)",
                background: "rgba(0,0,0,0.18)",
                padding: 12,
              }}
            >
              <textarea
                className="mod-textarea"
                style={{
                  minHeight: 120,
                  marginBottom: 12,
                  border: "none",
                  background: "transparent",
                  boxShadow: "none",
                  padding: 0,
                  resize: "vertical",
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Product Lab AI..."
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 10, color: "#7899b0", lineHeight: 1.5 }}>
                  {selectedConnection
                    ? `Using ${selectedConnection.name}`
                    : connections.length > 1
                    ? "Select which active AI model/agent should answer"
                    : connections.length === 1
                    ? "Single active connection available"
                    : "No AI connection available"}
                </div>
                <button
                  className="btn-save"
                  onClick={sendMessage}
                  disabled={
                    sending ||
                    !message.trim() ||
                    connections.length === 0 ||
                    (connections.length > 1 && !selectedConnectionId)
                  }
                >
                  {sending ? "SENDING..." : "SEND ⟩"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
}
