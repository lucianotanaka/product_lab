import type {
  AIAgentExecutionStatusResponse,
  AIAgentExecutionStep,
} from "../services/aiAgentExecution";

interface AIAgentExecutionStatusProps {
  execution: AIAgentExecutionStatusResponse | null;
  visible: boolean;
  title?: string;
}

const STATUS_ICON: Record<string, string> = {
  completed: "✓",
  running: "●",
  pending: "○",
  failed: "✕",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "#00ff88",
  running: "#00d4ff",
  pending: "#7899b0",
  failed: "#ff6b6b",
};

function getVisibleSteps(steps?: AIAgentExecutionStep[]) {
  return (steps ?? []).filter((step) => step.status !== "not_applicable");
}

function renderStepMessage(
  step: AIAgentExecutionStep,
  execution: AIAgentExecutionStatusResponse | null
) {
  if (
    step.key === "data" &&
    step.status === "running" &&
    execution?.api_progress &&
    execution.api_progress.total > 0
  ) {
    return `${step.message || step.label}... (${execution.api_progress.completed} de ${execution.api_progress.total})`;
  }
  if (step.status === "running") {
    return `${step.message || step.label}...`;
  }
  return step.message || step.label;
}

export default function AIAgentExecutionStatus({
  execution,
  visible,
  title = "AI AGENT EXECUTION",
}: AIAgentExecutionStatusProps) {
  if (!visible || !execution) return null;

  const steps = getVisibleSteps(execution.steps);
  const finalStatus =
    execution.status === "success"
      ? { label: "SUCCESS", icon: "✓", color: "#00ff88" }
      : execution.status === "fail"
      ? { label: "FAIL", icon: "✕", color: "#ff6b6b" }
      : null;

  return (
    <div
      style={{
        border: "1px solid rgba(0, 212, 255, 0.18)",
        background: "linear-gradient(180deg, rgba(5,12,20,0.96), rgba(3,8,14,0.92))",
        padding: 14,
        marginBottom: 14,
        boxShadow: "inset 0 1px 0 rgba(0,212,255,0.05)",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff", marginBottom: 8 }}>
        // {title} //
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {steps.map((step) => {
          const color = STATUS_COLOR[step.status] ?? "#7899b0";
          const icon = STATUS_ICON[step.status] ?? "○";
          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 12,
                color: "#d6e7f2",
              }}
            >
              <span style={{ color, width: 14, flexShrink: 0 }}>{icon}</span>
              <span style={{ lineHeight: 1.5 }}>{renderStepMessage(step, execution)}</span>
            </div>
          );
        })}

        {finalStatus ? (
          <div
            style={{
              marginTop: 6,
              paddingTop: 10,
              borderTop: "1px solid rgba(0,212,255,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              color: finalStatus.color,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            <span>{finalStatus.icon}</span>
            <span>{finalStatus.label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
