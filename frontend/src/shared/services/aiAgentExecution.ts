import { apiGet, apiPost, ApiError } from "./api";

export type AIAgentExecutionStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "not_applicable";

export interface AIAgentExecutionStep {
  key: string;
  label: string;
  status: AIAgentExecutionStepStatus;
  message?: string;
}

export interface AIAgentExecutionApiProgress {
  completed: number;
  total: number;
}

export interface AIAgentExecutionStatusResponse {
  error?: boolean;
  request_id: string;
  status: "running" | "success" | "fail" | string;
  stage?: string;
  message?: string;
  steps?: AIAgentExecutionStep[];
  api_progress?: AIAgentExecutionApiProgress;
}

export interface AIAgentConnectionInfo {
  id: string;
  name: string;
  provider: string;
  scope: string;
}

export interface AIAgentChatResponse {
  requires_selection: boolean;
  message?: string;
  answer?: string;
  raw?: unknown;
  module?: string | null;
  product_id?: number | null;
  request_id?: string;
  connection?: AIAgentConnectionInfo;
  connections?: AIAgentConnectionInfo[];
}

export interface AIAgentPromptPayload {
  message: string;
  product_id?: number | null;
  product_name?: string | null;
  company_id?: number | null;
  module?: string | null;
  submodule?: string | null;
  connection_id?: string | null;
  context?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  opportunity_id?: number | null;
  research_id?: number | null;
  canvas_id?: number | null;
  process_id?: number | null;
  sprint_id?: number | null;
  stakeholder_id?: number | null;
  meeting_id?: number | null;
  transcript_id?: number | null;
  request_id: string;
}

export interface AIAgentExecutionResult {
  requestId: string;
  response: AIAgentChatResponse;
}

export interface AIAgentExecutionSubscription {
  stop: () => void;
}

export function createAIAgentRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function sendAIAgentPrompt(
  payload: AIAgentPromptPayload
): Promise<AIAgentExecutionResult> {
  const response = await apiPost<AIAgentChatResponse>("/integrations/ai/chat", payload);
  return {
    requestId: response.request_id || payload.request_id,
    response,
  };
}

export async function getAIAgentExecutionStatus(params: {
  requestId: string;
  connectionId?: string | null;
  productId?: number | null;
  companyId?: number | null;
}): Promise<AIAgentExecutionStatusResponse> {
  const query = new URLSearchParams();
  if (params.connectionId) query.set("connection_id", params.connectionId);
  if (params.productId != null) query.set("product_id", String(params.productId));
  if (params.companyId != null) query.set("company_id", String(params.companyId));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiGet<AIAgentExecutionStatusResponse>(
    `/integrations/ai/status/${encodeURIComponent(params.requestId)}${suffix}`
  );
}

export function subscribeAIAgentExecutionStatus(
  params: {
    requestId: string;
    connectionId?: string | null;
    productId?: number | null;
    companyId?: number | null;
    intervalMs?: number;
  },
  handlers: {
    onUpdate: (status: AIAgentExecutionStatusResponse) => void;
    onError?: (error: unknown) => void;
    onComplete?: (status: AIAgentExecutionStatusResponse) => void;
  }
): AIAgentExecutionSubscription {
  let stopped = false;
  let timer: number | null = null;
  let inFlight = false;

  const poll = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const status = await getAIAgentExecutionStatus(params);
      if (stopped) return;
      handlers.onUpdate(status);
      if (status.status === "success" || status.status === "fail") {
        stopped = true;
        handlers.onComplete?.(status);
        return;
      }
    } catch (error) {
      if (stopped) return;
      handlers.onError?.(error);
      if (error instanceof ApiError) {
        // Allow UI to stop loading when main request fails or polling endpoint fails critically.
      }
    } finally {
      inFlight = false;
      if (!stopped) {
        timer = window.setTimeout(poll, params.intervalMs ?? 800);
      }
    }
  };

  void poll();

  return {
    stop() {
      stopped = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    },
  };
}
