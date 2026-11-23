import { useEffect, useState, useCallback, memo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  MarkerType,
  Panel,
  Position,
  Handle,
  type NodeProps,
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import RaciPanel from "../../../shared/components/RaciPanel";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Proc {
  id: number;
  process_scope: "PRODUCT" | "GLOBAL";
  product_id: number | null;
  process_name: string;
  process_description: string | null;
  process_version: string;
  process_type: string;
  process_status: string;
  process_owner: string | null;
  process_trigger: string | null;
  process_outcome: string | null;
  business_area_id: number | null;
  is_macro: boolean;
}
interface PNode {
  id: number;
  process_id: number;
  node_type: string;
  node_title: string;
  node_description: string | null;
  node_subtitle: string | null;
  node_icon: string | null;
  role_name: string | null;
  system_name: string | null;
  duration_minutes: number | null;
  is_manual: boolean;
  is_bottleneck: boolean;
  x_position: number;
  y_position: number;
  width?: number | null;
  height?: number | null;
  display_order?: number | null;
  business_area_id: number | null;
  group_id: number | null;
  child_process_id: number | null;
}
interface PEdge {
  id: number;
  process_id: number;
  source_node_id: number;
  target_node_id: number;
  edge_label: string | null;
  edge_type: string;
  source_handle?: "top" | "right" | "bottom" | "left" | null;
  target_handle?: "top" | "right" | "bottom" | "left" | null;
}
interface PGroup {
  id: number;
  process_id: number;
  group_name: string;
  group_type: string;
  parent_group_id: number | null;
  display_order: number;
}
interface PTool {
  id: number;
  process_id: number;
  tool_name: string;
  tool_description: string | null;
  tool_icon: string | null;
  display_order: number;
}
interface BArea {
  id: number;
  product_id?: number | null;
  area_name: string;
  area_description: string | null;
  area_color: string | null;
  display_order: number;
  is_active: boolean;
}
interface GraphData {
  nodes: PNode[];
  edges: PEdge[];
  groups: PGroup[];
  tools: PTool[];
  business_areas: BArea[];
}
interface AIConnectionOption {
  id: string;
  name: string;
  provider: string;
  scope: string;
  product_id?: number | null;
  company_id?: number | null;
  is_active: boolean;
}
interface AIProcessGenerateResponse {
  created: boolean;
  process_id: number | null;
  process_name: string | null;
  sql_preview: string;
  summary: string;
  draft: {
    process?: { process_description?: string | null };
    business_areas?: Array<{ area_name: string }>;
    nodes?: Array<{ node_type: string; node_title: string }>;
    edges?: Array<{ edge_type: string; edge_label?: string | null }>;
    tools?: Array<{ tool_name: string }>;
  };
  warnings: string[];
  connection?: {
    id: string;
    name: string;
    provider: string;
    scope: string;
  } | null;
}

const PROC_SCOPES = ["PRODUCT", "GLOBAL"] as const,
  PROC_TYPES = ["AS_IS", "TO_BE"],
  PROC_STATUS = ["DRAFT", "VALIDATED", "APPROVED", "ARCHIVED"],
  NODE_TYPES_L = ["START", "ACTIVITY", "DECISION", "END", "SUBPROCESS", "SYSTEM", "WAIT", "HANDOFF"],
  EDGE_TYPES_L = ["SEQUENCE", "CONDITIONAL", "DEFAULT", "EXCEPTION"],
  GROUP_TYPES_L = ["PHASE", "SUB_FLOW", "CONTAINER"];

const EMPTY_P = {
  process_scope: "PRODUCT",
  process_name: "",
  process_description: "",
  process_version: "1.0",
  process_type: "AS_IS",
  process_status: "DRAFT",
  process_owner: "",
  process_trigger: "",
  process_outcome: "",
  business_area_id: "",
  is_macro: false,
};
const EMPTY_N = {
  node_type: "ACTIVITY",
  node_title: "",
  node_description: "",
  node_subtitle: "",
  node_icon: "",
  role_name: "",
  system_name: "",
  duration_minutes: "",
  width: "",
  height: "",
  is_manual: false,
  is_bottleneck: false,
  business_area_id: "",
  group_id: "",
  child_process_id: "",
};
const EMPTY_G = { group_name: "", group_type: "PHASE", parent_group_id: "", display_order: 0 };
const EMPTY_T = { tool_name: "", tool_description: "", tool_icon: "", display_order: 0 };

const NC: Record<string, string> = {
  START: "#00ff88",
  END: "#ff4444",
  DECISION: "#ff9900",
  ACTIVITY: "#00d4ff",
  SUBPROCESS: "#c084fc",
  SYSTEM: "#00e5cc",
  WAIT: "#7899b0",
  HANDOFF: "#ffcc44",
};
const NI: Record<string, string> = {
  START: "▶",
  END: "⏹",
  DECISION: "◆",
  ACTIVITY: "▣",
  SUBPROCESS: "⬡",
  SYSTEM: "⚙",
  WAIT: "⏳",
  HANDOFF: "↔",
};
const IM: Record<string, string> = {
  cloud: "☁",
  handshake: "🤝",
  clipboard: "📋",
  gear: "⚙",
  truck: "🚚",
  dollar: "💰",
  chart: "📊",
  people: "👥",
  document: "📄",
  warehouse: "🏭",
  factory: "🏗",
  invoice: "🧾",
  box: "📦",
  computer: "💻",
  phone: "📱",
  email: "✉",
  check: "✅",
  star: "⭐",
  flag: "🚩",
  lock: "🔒",
  search: "⌕",
  gavel: "⚖",
  target: "◉",
  gate: "⛩",
  define: "✳",
};
const LC = ["#1a3a5c", "#1a4a3a", "#3a2a1a", "#3a1a3a", "#1a2a4a", "#4a3a1a"];
const ROW_LABEL_WIDTH = 180;
const GRID_HEADER_HEIGHT = 64;
const LH = 1200,
  BASE_COL_SPACING = 300,
  BASE_ROW_SPACING = 210;

const getIcon = (ic: string | null, nt: string) => (ic ? (IM[ic] ?? ic) : (NI[nt] ?? "◈"));
const getLaneColor = (c: string | null, i: number) => c ?? LC[i % LC.length];
const statusColor = (s: string) =>
  s === "APPROVED" ? "#00ff88" : s === "VALIDATED" ? "#00d4ff" : s === "ARCHIVED" ? "#555" : "#ff9900";
const typeColor = (t: string) => (t === "AS_IS" ? "#00d4ff" : "#c084fc");
const edgeColor = (t: string) =>
  t === "CONDITIONAL" ? "#ff9900" : t === "EXCEPTION" ? "#ff4444" : t === "DEFAULT" ? "#9bb0c8" : "#00d4ff";
const edgeDash = (t: string) => (t === "EXCEPTION" ? "8 4" : t === "DEFAULT" ? "4 4" : undefined);

const nodeBaseCardStyle = (color: string) => ({
  background: "rgba(6,10,20,0.96)",
  border: `1.5px solid ${color}66`,
  color: "#e0eaff",
  boxShadow: `0 0 18px ${color}20`,
});

const quickTemplates = [
  {
    title: "Jornada Opportunity",
    prompt:
      "Crie um fluxo executivo da macroárea Opportunities com etapas Capture, Assess, Discover, Evaluate, Decide, Promotion Gate e Define, incluindo decisões sim/não e caminhos alternativos.",
  },
  {
    title: "Discovery",
    prompt:
      "Crie um processo de discovery de produto com captação de problema, pesquisa, síntese de insights, hipóteses, experimentos e decisão de seguir ou encerrar.",
  },
  {
    title: "Aprovação",
    prompt:
      "Crie um fluxo de aprovação com etapas de solicitação, análise, decisão, rework quando necessário, aprovação final e comunicação do resultado.",
  },
];

const NodeCardContent = ({ raw }: { raw: PNode }) => {
  const ic = getIcon(raw.node_icon, raw.node_type);
  return (
    <div style={{ textAlign: "center", padding: "8px 10px", minWidth: 90, maxWidth: 200 }}>
      <div style={{ fontSize: raw.node_type === "DECISION" ? 18 : 20, lineHeight: 1.2, marginBottom: 2 }}>{ic}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "#e0eaff", lineHeight: 1.3 }}>
        {raw.node_title}
      </div>
      {raw.node_subtitle && (
        <div style={{ fontSize: 8, color: "#9bb0c8", marginTop: 2, fontStyle: "italic" }}>{raw.node_subtitle}</div>
      )}
      {!raw.node_subtitle && raw.role_name && (
        <div style={{ fontSize: 8, color: "#7899b0", marginTop: 1 }}>{raw.role_name}</div>
      )}
      {raw.is_bottleneck && <div style={{ fontSize: 8, color: "#ff4444", marginTop: 2 }}>⚠ GARGALO</div>}
      {raw.is_manual && <div style={{ fontSize: 8, color: "#ff9900", marginTop: 1 }}>MANUAL</div>}
      {raw.child_process_id && (
        <div style={{ fontSize: 9, color: "#00ff88", marginTop: 3, letterSpacing: 1 }}>⬇ DRILL DOWN</div>
      )}
    </div>
  );
};

const FlowNode = memo(({ data }: NodeProps) => {
  const raw = (data as { raw: PNode }).raw;
  const color = NC[raw.node_type] ?? "#00d4ff";
  const isDecision = raw.node_type === "DECISION";
  const width = Number(raw.width ?? (isDecision ? 170 : 190));
  const height = Number(raw.height ?? (isDecision ? 170 : 104));

  if (isDecision) {
    return (
      <div style={{ width, height, position: "relative" }}>
        <Handle type="target" id="top" position={Position.Top} style={{ background: color, border: "none", width: 8, height: 8, top: 6 }} />
        <Handle type="source" id="top" position={Position.Top} style={{ background: color, border: "none", width: 8, height: 8, top: 6, opacity: 0 }} />
        <Handle type="target" id="bottom" position={Position.Bottom} style={{ background: color, border: "none", width: 8, height: 8, bottom: 6 }} />
        <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: color, border: "none", width: 8, height: 8, bottom: 6 }} />
        <Handle type="target" id="left" position={Position.Left} style={{ background: color, border: "none", width: 8, height: 8, left: 6 }} />
        <Handle type="source" id="left" position={Position.Left} style={{ background: color, border: "none", width: 8, height: 8, left: 6, opacity: 0 }} />
        <Handle type="target" id="right" position={Position.Right} style={{ background: color, border: "none", width: 8, height: 8, right: 6 }} />
        <Handle type="source" id="right" position={Position.Right} style={{ background: color, border: "none", width: 8, height: 8, right: 6 }} />
        <div
          style={{
            position: "absolute",
            inset: 14,
            transform: "rotate(45deg)",
            borderRadius: 8,
            ...nodeBaseCardStyle(color),
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{ transform: "scale(0.92)", maxWidth: 126 }}>
            <NodeCardContent raw={raw} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minWidth: Number(raw.width ?? 170),
        minHeight: Number(raw.height ?? (raw.node_type === "START" || raw.node_type === "END" ? 78 : 92)),
        borderRadius: raw.node_type === "START" || raw.node_type === "END" ? 28 : raw.node_type === "SUBPROCESS" ? 18 : 10,
        ...nodeBaseCardStyle(color),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Handle type="target" id="top" position={Position.Top} style={{ background: color, border: "none", width: 8, height: 8, top: 0 }} />
      <Handle type="source" id="top" position={Position.Top} style={{ background: color, border: "none", width: 8, height: 8, top: 0, opacity: 0 }} />
      <Handle type="target" id="bottom" position={Position.Bottom} style={{ background: color, border: "none", width: 8, height: 8, bottom: 0 }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ background: color, border: "none", width: 8, height: 8, bottom: 0 }} />
      <Handle type="target" id="left" position={Position.Left} style={{ background: color, border: "none", width: 8, height: 8, left: 0 }} />
      <Handle type="source" id="left" position={Position.Left} style={{ background: color, border: "none", width: 8, height: 8, left: 0, opacity: 0 }} />
      <Handle type="target" id="right" position={Position.Right} style={{ background: color, border: "none", width: 8, height: 8, right: 0 }} />
      <Handle type="source" id="right" position={Position.Right} style={{ background: color, border: "none", width: 8, height: 8, right: 0 }} />
      <NodeCardContent raw={raw} />
    </div>
  );
});
FlowNode.displayName = "FlowNode";

const ExecutiveEdge = memo((props: EdgeProps) => {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 20,
    offset: 24,
  });
  const raw = (props.data as { raw?: PEdge } | undefined)?.raw;
  const color = edgeColor(raw?.edge_type ?? "SEQUENCE");
  const dash = edgeDash(raw?.edge_type ?? "SEQUENCE");

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: color,
          strokeWidth: raw?.edge_type === "CONDITIONAL" ? 2.4 : 2,
          strokeDasharray: dash,
          filter: `drop-shadow(0 0 6px ${color}55)`,
        }}
      />
      {props.label && (
        <foreignObject x={labelX - 55} y={labelY - 16} width={110} height={32}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              fontSize: 10,
              fontWeight: 700,
              color,
              background: "rgba(6,10,20,0.94)",
              border: `1px solid ${color}44`,
              borderRadius: 999,
              padding: "0 8px",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {props.label}
          </div>
        </foreignObject>
      )}
    </>
  );
});
ExecutiveEdge.displayName = "ExecutiveEdge";

function buildRFNodes(
  pnodes: PNode[],
  areas: BArea[],
  groups: PGroup[],
  columnSpacing: number,
  rowSpacing: number,
  dark: boolean
): Node[] {
  const sortedAreas = [...areas].sort((a, b) => a.display_order - b.display_order);
  const sortedGroups = [...groups].sort((a, b) => a.display_order - b.display_order);
  const am = new Map(sortedAreas.map((a) => [a.id, a]));
  const rowHeaderBg = dark ? "rgba(6,10,20,0.9)" : "rgba(255,255,255,0.96)";
  const rowHeaderBorder = dark ? "rgba(0,212,255,0.16)" : "rgba(0,136,170,0.14)";
  const columnHeaderBg = dark ? "rgba(6,10,20,0.92)" : "rgba(255,255,255,0.98)";
  const columnHeaderBorder = dark ? "rgba(0,212,255,0.18)" : "rgba(0,136,170,0.16)";
  const columnNames =
    pnodes.length > 0
      ? Array.from(
          new Set(
            pnodes.map((n) => {
              const colIndex = Math.max(0, Math.round((Number(n.x_position ?? 36) - 36) / BASE_COL_SPACING));
              return colIndex;
            })
          )
        ).sort((a, b) => a - b)
      : [0, 1, 2, 3];

  const columnNodes: Node[] = columnNames.map((colIndex) => ({
    id: `stage-col-${colIndex}`,
    type: "group",
    position: { x: ROW_LABEL_WIDTH + colIndex * columnSpacing, y: 0 },
    style: {
      width: columnSpacing - 18,
      height: GRID_HEADER_HEIGHT - 8,
      background: columnHeaderBg,
      border: `1px solid ${columnHeaderBorder}`,
      borderRadius: 10,
      boxShadow: dark ? "0 10px 20px rgba(0,0,0,0.16)" : "0 10px 22px rgba(128,160,190,0.12)",
      zIndex: 0,
    },
    data: {
      label: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: dark ? "#bfe7ff" : "#2b5a72",
            userSelect: "none",
          }}
        >
          ETAPA {colIndex + 1}
        </div>
      ),
    },
    draggable: false,
    selectable: false,
  }));

  const laneNodes: Node[] = sortedAreas.map((a, i) => ({
    id: `lane-${a.id}`,
    type: "group",
    position: { x: ROW_LABEL_WIDTH, y: GRID_HEADER_HEIGHT + i * rowSpacing },
    style: {
      width: Math.max(columnNames.length, 1) * columnSpacing,
      height: rowSpacing - 18,
      background: dark
        ? `linear-gradient(90deg, ${getLaneColor(a.area_color, i)}10 0%, rgba(6,10,20,0.16) 100%)`
        : `linear-gradient(90deg, ${getLaneColor(a.area_color, i)}10 0%, rgba(255,255,255,0.9) 100%)`,
      border: `1.5px solid ${dark ? `${getLaneColor(a.area_color, i)}44` : `${getLaneColor(a.area_color, i)}22`}`,
      borderRadius: 14,
      zIndex: 0,
      boxShadow: dark
        ? `inset 0 0 0 1px ${getLaneColor(a.area_color, i)}18`
        : `inset 0 0 0 1px rgba(255,255,255,0.65)`,
    },
    data: {
      label: (
        <div
          style={{
            position: "absolute",
            left: -ROW_LABEL_WIDTH + 8,
            top: 0,
            width: ROW_LABEL_WIDTH - 20,
            height: rowSpacing - 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 14px",
            background: rowHeaderBg,
            border: `1px solid ${rowHeaderBorder}`,
            borderRadius: 12,
            color: dark ? "#fff" : "#1a2a3a",
            fontWeight: 800,
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            userSelect: "none",
            boxShadow: dark ? "0 8px 18px rgba(0,0,0,0.16)" : "0 8px 18px rgba(128,160,190,0.12)",
          }}
        >
          <span style={{ color: getLaneColor(a.area_color, i), marginRight: 8 }}>■</span>
          {a.area_name}
        </div>
      ),
      raw: a,
    },
    draggable: false,
    selectable: false,
  }));

  const groupColor = (type: string) =>
    type === "SUB_FLOW" ? "#c084fc" : type === "CONTAINER" ? "#00ff88" : "#00d4ff";

  const groupNodes: Node[] = sortedGroups.map((g) => {
    const parentGroup = g.parent_group_id ? sortedGroups.find((item) => item.id === g.parent_group_id) : null;
    const parentId = parentGroup ? `group-${parentGroup.id}` : undefined;

    return {
      id: `group-${g.id}`,
      type: "group",
      parentId,
      extent: parentId ? ("parent" as const) : undefined,
      position: { x: ROW_LABEL_WIDTH + 40, y: GRID_HEADER_HEIGHT + 40 + g.display_order * 220 },
      style: {
        width: Math.max(420, Math.max(columnNames.length, 1) * columnSpacing - 80),
        minHeight: 180,
        background:
          g.group_type === "SUB_FLOW"
            ? "rgba(192,132,252,0.025)"
            : g.group_type === "CONTAINER"
              ? "rgba(0,255,136,0.02)"
              : "rgba(0,212,255,0.02)",
        border: `1px dashed ${groupColor(g.group_type)}22`,
        borderRadius: 16,
        zIndex: 1,
        boxShadow: "none",
        pointerEvents: "none",
      },
      data: {
        label: (
          <div
            style={{
              position: "absolute",
              top: -12,
              left: 14,
              background: "#060a14",
              padding: "2px 10px",
              color: groupColor(g.group_type),
              fontSize: 9,
              letterSpacing: 2,
              fontWeight: 800,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.05)",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {g.group_name}
          </div>
        ),
        raw: g,
      },
      draggable: false,
      selectable: false,
    };
  });

  const processNodes: Node[] = pnodes.map((n) => {
    const area = n.business_area_id ? am.get(n.business_area_id) : undefined;
    const pid = area ? `lane-${area.id}` : undefined;
    const colIndex = Math.max(0, Math.round((Number(n.x_position ?? 36) - 36) / BASE_COL_SPACING));
    const rowIndex = area ? sortedAreas.findIndex((item) => item.id === area.id) : Math.max(0, Math.round((Number(n.y_position ?? 56) - 56) / BASE_ROW_SPACING));
    const withinColumnOffset = 26;
    const withinRowOffset = 18;
    const pos = pid
      ? {
          x: colIndex * columnSpacing + withinColumnOffset,
          y: withinRowOffset,
        }
      : {
          x: ROW_LABEL_WIDTH + colIndex * columnSpacing + withinColumnOffset,
          y: GRID_HEADER_HEIGHT + rowIndex * rowSpacing + withinRowOffset,
        };
    return {
      id: String(n.id),
      type: "flowNode",
      parentId: pid,
      extent: pid ? undefined : undefined,
      position: pos,
      data: { raw: n },
      style: { zIndex: 10 },
    };
  });

  return [...columnNodes, ...laneNodes, ...groupNodes, ...processNodes];
}

function buildRFEdges(pedges: PEdge[], pnodes: PNode[]): Edge[] {
  const nodeMap = new Map(pnodes.map((n) => [n.id, n]));

  const resolveHandles = (sourceNode?: PNode, targetNode?: PNode) => {
    if (!sourceNode || !targetNode) {
      return { sourceHandle: undefined, targetHandle: undefined };
    }

    const dx = Number(targetNode.x_position ?? 0) - Number(sourceNode.x_position ?? 0);
    const dy = Number(targetNode.y_position ?? 0) - Number(sourceNode.y_position ?? 0);

    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        sourceHandle: dx >= 0 ? "right" : "left",
        targetHandle: dx >= 0 ? "left" : "right",
      };
    }

    return {
      sourceHandle: dy >= 0 ? "bottom" : "top",
      targetHandle: dy >= 0 ? "top" : "bottom",
    };
  };

  return pedges.map((e) => {
    const sourceNode = nodeMap.get(e.source_node_id);
    const targetNode = nodeMap.get(e.target_node_id);
    const handles = resolveHandles(sourceNode, targetNode);

    return {
      id: String(e.id),
      source: String(e.source_node_id),
      target: String(e.target_node_id),
      sourceHandle: e.source_handle ?? handles.sourceHandle,
      targetHandle: e.target_handle ?? handles.targetHandle,
      label: e.edge_label ?? undefined,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor(e.edge_type), width: 18, height: 18 },
      style: { stroke: edgeColor(e.edge_type) },
      labelStyle: { fill: "#7899b0", fontSize: 9 },
      data: { raw: e },
      zIndex: 20,
      type: "executive",
    };
  });
}

const NF = (l: string, ch: React.ReactNode) => (
  <div className="mod-field">
    <label className="mod-field__label">{l}</label>
    {ch}
  </div>
);

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      style={{
        minWidth: 120,
        padding: "10px 12px",
        border: `1px solid ${accent}33`,
        background: "rgba(6,10,20,0.82)",
        borderRadius: 6,
      }}
    >
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: "#7899b0", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function FlowViewportManager({ triggerKey, expanded }: { triggerKey: string; expanded: boolean }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: expanded ? 0.08 : 0.16, duration: 500, minZoom: 0.35, maxZoom: 1.2 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [fitView, triggerKey, expanded]);

  return null;
}

export default function ProcessMappingPage() {
  const { user } = useAuth();
  const dark = user?.user_theme !== "light";
  const [pid, setPid] = useState(localStorage.getItem("pl_product") ?? "");
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [selProc, setSelProc] = useState<Proc | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [allAreas, setAllAreas] = useState<BArea[]>([]);
  const [sideTab, setSideTab] = useState<"processes" | "areas" | "groups" | "tools">("processes");
  const [processDrawerOpen, setProcessDrawerOpen] = useState(false);
  const [expandedCanvas, setExpandedCanvas] = useState(false);
  const [fitTick, setFitTick] = useState(0);
  const [columnDensity, setColumnDensity] = useState<"compact" | "normal" | "expanded">("normal");
  const [rowDensity, setRowDensity] = useState<"compact" | "normal" | "expanded">("normal");
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);

  const [procModal, setProcModal] = useState<"create" | "edit" | null>(null);
  const [procForm, setProcForm] = useState({ ...EMPTY_P });
  const [savingProc, setSavingProc] = useState(false);

  const [addNodeType, setAddNodeType] = useState("ACTIVITY");
  const [nodeModal, setNodeModal] = useState<"add" | "edit" | null>(null);
  const [nodeForm, setNodeForm] = useState({ ...EMPTY_N });
  const [editingNode, setEditingNode] = useState<PNode | null>(null);
  const [savingNode, setSavingNode] = useState(false);

  const [edgeModal, setEdgeModal] = useState(false);
  const [pendingConn, setPendingConn] = useState<Connection | null>(null);
  const [editingEdge, setEditingEdge] = useState<PEdge | null>(null);
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeType, setEdgeType] = useState("SEQUENCE");
  const [edgeSourceHandle, setEdgeSourceHandle] = useState("AUTO");
  const [edgeTargetHandle, setEdgeTargetHandle] = useState("AUTO");
  const [savingEdge, setSavingEdge] = useState(false);

  const [groupModal, setGroupModal] = useState<"add" | "edit" | null>(null);
  const [groupForm, setGroupForm] = useState({ ...EMPTY_G });
  const [editingGroup, setEditingGroup] = useState<PGroup | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);

  const [toolModal, setToolModal] = useState<"add" | "edit" | null>(null);
  const [toolForm, setToolForm] = useState({ ...EMPTY_T });
  const [editingTool, setEditingTool] = useState<PTool | null>(null);
  const [savingTool, setSavingTool] = useState(false);

  const EMPTY_A = { area_name: "", area_description: "", area_color: "", display_order: 0, is_active: true };
  const [areaModal, setAreaModal] = useState<"add" | "edit" | null>(null);
  const [areaForm, setAreaForm] = useState({ ...EMPTY_A });
  const [editingArea, setEditingArea] = useState<BArea | null>(null);
  const [savingArea, setSavingArea] = useState(false);

  const [aiModal, setAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiConnections, setAiConnections] = useState<AIConnectionOption[]>([]);
  const [selectedAiConnectionId, setSelectedAiConnectionId] = useState("");
  const [loadingAiConnections, setLoadingAiConnections] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIProcessGenerateResponse | null>(null);

  const nodeTypes = { flowNode: FlowNode };
  const edgeTypes = { executive: ExecutiveEdge };

  const normalizeHandleForForm = (value?: string | null) => value ?? "AUTO";
  const toHandlePayload = (value: string) => (value === "AUTO" ? null : value);
  const columnSpacing =
    columnDensity === "compact" ? Math.max(220, BASE_COL_SPACING - 70) : columnDensity === "expanded" ? BASE_COL_SPACING + 90 : BASE_COL_SPACING;
  const rowSpacing =
    rowDensity === "compact" ? Math.max(150, BASE_ROW_SPACING - 50) : rowDensity === "expanded" ? BASE_ROW_SPACING + 70 : BASE_ROW_SPACING;
  const currentLaneHeight = Math.max(
    LH,
    Math.max((graphData?.business_areas?.length ?? 0) * rowSpacing + GRID_HEADER_HEIGHT + 120, (graphData?.nodes ?? []).reduce((acc, node) => Math.max(acc, Number(node.y_position ?? 0) + Number(node.height ?? 120)), 0) + GRID_HEADER_HEIGHT + 160)
  );

  const loadAreas = async () => {
    try {
      const r = await apiGet<BArea[]>("/business-areas");
      setAllAreas(r);
    } catch {
      /**/
    }
  };

  const loadAiConnections = async () => {
    setLoadingAiConnections(true);
    try {
      const query = pid ? `?product_id=${encodeURIComponent(pid)}` : "";
      const r = await apiGet<AIConnectionOption[]>(`/integrations/ai/connections${query}`);
      setAiConnections(r);
      if (r.length === 1) setSelectedAiConnectionId(r[0].id);
      else if (!r.find((x) => x.id === selectedAiConnectionId)) setSelectedAiConnectionId("");
    } catch {
      setAiConnections([]);
      setSelectedAiConnectionId("");
    } finally {
      setLoadingAiConnections(false);
    }
  };

  const saveArea = async () => {
    if (!areaForm.area_name.trim()) return;
    setSavingArea(true);
    try {
      const body = {
        area_name: areaForm.area_name,
        area_description: areaForm.area_description || null,
        area_color: areaForm.area_color || null,
        display_order: Number(areaForm.display_order),
        is_active: areaForm.is_active,
      };
      if (areaModal === "add") {
        await apiPost("/business-areas", body);
      } else if (editingArea) {
        await apiPatch(`/business-areas/${editingArea.id}`, body);
      }
      setAreaModal(null);
      loadAreas();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingArea(false);
    }
  };

  const deleteArea = async (id: number) => {
    if (!confirm("Excluir área? Processos e nós vinculados perderão a referência.")) return;
    try {
      await apiDelete(`/business-areas/${id}`);
      loadAreas();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    }
  };

  const loadProcesses = async (id = pid) => {
    setLoading(true);
    setErr("");
    try {
      if (id) {
        const r = await apiGet<Paginated<Proc>>(`/processes?size=100&process_scope=PRODUCT&product_id=${id}`);
        setProcesses(r.items);
      } else {
        const [globalRes, productRes] = await Promise.all([
          apiGet<Paginated<Proc>>("/processes?size=100&process_scope=GLOBAL"),
          apiGet<Paginated<Proc>>("/processes?size=100&process_scope=PRODUCT"),
        ]);
        setProcesses([...globalRes.items, ...productRes.items]);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const loadGraph = async (proc: Proc) => {
    setGraphLoading(true);
    try {
      const g = await apiGet<GraphData>(`/processes/${proc.id}/graph`);
      setGraphData(g);
      setRfNodes(buildRFNodes(g.nodes, g.business_areas, g.groups, columnSpacing, rowSpacing, dark));
      setRfEdges(buildRFEdges(g.edges, g.nodes));
    } catch {
      setRfNodes([]);
      setRfEdges([]);
      setGraphData(null);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses(pid);
    loadAreas();
    loadAiConnections();
    setSelProc(null);
    setRfNodes([]);
    setRfEdges([]);
    setGraphData(null);
  }, [pid, setRfEdges, setRfNodes]);

  useEffect(() => {
    if (!expandedCanvas && !selProc) {
      setSideTab("processes");
      setProcessDrawerOpen(true);
      return;
    }
    if (selProc) {
      setProcessDrawerOpen(false);
    }
  }, [expandedCanvas, selProc, processes.length]);

  const changePid = (id: string) => {
    localStorage.setItem("pl_product", id);
    setPid(id);
  };
  const [breadcrumb, setBreadcrumb] = useState<Proc[]>([]);

  const drillDown = async (childId: number) => {
    try {
      const c = await apiGet<Proc>(`/processes/${childId}`);
      setBreadcrumb((bc) => [...bc, selProc!]);
      setSelProc(c);
      loadGraph(c);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Subprocesso não encontrado");
    }
  };
  const breadcrumbBack = (idx: number) => {
    const t = breadcrumb[idx];
    setBreadcrumb((bc) => bc.slice(0, idx));
    setSelProc(t);
    loadGraph(t);
  };
  const selectProcess = (p: Proc) => {
    setBreadcrumb([]);
    setSelProc(p);
    loadGraph(p);
    setSideTab("processes");
  };

  const openCreateProc = () => {
    setProcForm({ ...EMPTY_P, process_scope: pid ? "PRODUCT" : "GLOBAL" });
    setProcModal("create");
  };
  const openEditProc = (p: Proc) => {
    setProcForm({
      process_scope: p.process_scope,
      process_name: p.process_name,
      process_description: p.process_description ?? "",
      process_version: p.process_version,
      process_type: p.process_type,
      process_status: p.process_status,
      process_owner: p.process_owner ?? "",
      process_trigger: p.process_trigger ?? "",
      process_outcome: p.process_outcome ?? "",
      business_area_id: p.business_area_id ? String(p.business_area_id) : "",
      is_macro: p.is_macro,
    });
    setProcModal("edit");
  };
  const saveProc = async () => {
    if (!procForm.process_name.trim()) return;
    setSavingProc(true);
    try {
      const body = {
        ...procForm,
        product_id: procForm.process_scope === "GLOBAL" ? null : pid ? Number(pid) : null,
        business_area_id: procForm.business_area_id ? Number(procForm.business_area_id) : null,
      };
      if (procModal === "create") {
        const c = await apiPost<Proc>("/processes", body);
        await loadProcesses(pid);
        selectProcess(c);
      } else if (selProc) {
        await apiPatch(`/processes/${selProc.id}`, body);
        await loadProcesses(pid);
      }
      setProcModal(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingProc(false);
    }
  };
  const deleteProc = async () => {
    if (!selProc || !confirm(`Excluir "${selProc.process_name}"?`)) return;
    try {
      await apiDelete(`/processes/${selProc.id}`);
      setSelProc(null);
      setRfNodes([]);
      setRfEdges([]);
      setGraphData(null);
      loadProcesses(pid);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    }
  };

  const openAddNode = () => {
    setNodeForm({ ...EMPTY_N, node_type: addNodeType });
    setEditingNode(null);
    setNodeModal("add");
  };
  const saveNode = async () => {
    if (!selProc || !nodeForm.node_title.trim()) return;
    setSavingNode(true);
    try {
      const base = {
        node_type: nodeForm.node_type,
        node_title: nodeForm.node_title,
        node_description: nodeForm.node_description || null,
        node_subtitle: nodeForm.node_subtitle || null,
        node_icon: nodeForm.node_icon || null,
        role_name: nodeForm.role_name || null,
        system_name: nodeForm.system_name || null,
        duration_minutes: nodeForm.duration_minutes ? Number(nodeForm.duration_minutes) : null,
        width: nodeForm.width ? Number(nodeForm.width) : null,
        height: nodeForm.height ? Number(nodeForm.height) : null,
        is_manual: nodeForm.is_manual,
        is_bottleneck: nodeForm.is_bottleneck,
        business_area_id: nodeForm.business_area_id ? Number(nodeForm.business_area_id) : null,
        group_id: nodeForm.group_id ? Number(nodeForm.group_id) : null,
        child_process_id: nodeForm.child_process_id ? Number(nodeForm.child_process_id) : null,
      };
      if (nodeModal === "add") {
        await apiPost(`/processes/${selProc.id}/nodes`, {
          ...base,
          x_position: rfNodes.filter((n) => !n.id.startsWith("lane-") && !n.id.startsWith("group-")).length * 190,
          y_position: 96,
        });
      } else if (editingNode) {
        await apiPatch(`/processes/${selProc.id}/nodes/${editingNode.id}`, base);
      }
      setNodeModal(null);
      loadGraph(selProc);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingNode(false);
    }
  };
  const deleteNode = async (nid: number) => {
    if (!selProc || !confirm("Excluir nó?")) return;
    try {
      await apiDelete(`/processes/${selProc.id}/nodes/${nid}`);
      loadGraph(selProc);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    }
  };

  const runFitView = useCallback(() => {
    setFitTick((v) => v + 1);
  }, []);

  const autoLayout = async () => {
    if (!selProc || !graphData) return;

    const areas = [...graphData.business_areas].sort((a, b) => a.display_order - b.display_order);
    const nodes = [...graphData.nodes];
    const edges = [...graphData.edges];

    const areaIndex = new Map<number, number>();
    areas.forEach((a, idx) => areaIndex.set(a.id, idx));

    const incomingCount = new Map<number, number>();
    const outgoing = new Map<number, number[]>();
    const parents = new Map<number, number[]>();

    nodes.forEach((n) => {
      incomingCount.set(n.id, 0);
      outgoing.set(n.id, []);
      parents.set(n.id, []);
    });

    edges.forEach((e) => {
      incomingCount.set(e.target_node_id, (incomingCount.get(e.target_node_id) ?? 0) + 1);
      outgoing.set(e.source_node_id, [...(outgoing.get(e.source_node_id) ?? []), e.target_node_id]);
      parents.set(e.target_node_id, [...(parents.get(e.target_node_id) ?? []), e.source_node_id]);
    });

    const roots = nodes
      .filter((n) => (incomingCount.get(n.id) ?? 0) === 0)
      .sort((a, b) => (a.display_order ?? a.id) - (b.display_order ?? b.id));

    const levelMap = new Map<number, number>();
    const queue: number[] = roots.map((n) => n.id);
    roots.forEach((n) => levelMap.set(n.id, 0));

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentLevel = levelMap.get(currentId) ?? 0;

      for (const nextId of outgoing.get(currentId) ?? []) {
        const nextLevel = currentLevel + 1;
        const prevLevel = levelMap.get(nextId);
        if (prevLevel === undefined || nextLevel > prevLevel) {
          levelMap.set(nextId, nextLevel);
          queue.push(nextId);
        }
      }
    }

    nodes.forEach((n) => {
      if (!levelMap.has(n.id)) levelMap.set(n.id, 0);
    });

    const maxLevel = Math.max(...Array.from(levelMap.values()), 0);
    const laneRows = new Map<number, number[]>();

    areas.forEach((a) => {
      laneRows.set(a.id, Array.from({ length: maxLevel + 3 }, () => 0));
    });

    const sortedNodes = [...nodes].sort((a, b) => {
      const levelDiff = (levelMap.get(a.id) ?? 0) - (levelMap.get(b.id) ?? 0);
      if (levelDiff !== 0) return levelDiff;
      const laneA = a.business_area_id ? areaIndex.get(a.business_area_id) ?? 999 : 999;
      const laneB = b.business_area_id ? areaIndex.get(b.business_area_id) ?? 999 : 999;
      if (laneA !== laneB) return laneA - laneB;
      return (a.display_order ?? a.id) - (b.display_order ?? b.id);
    });

    const horizontalSpacing = columnSpacing;
    const verticalSpacing = rowSpacing;
    const startX = 36;
    const startY = 56;
    const fallbackLaneId = areas[0]?.id ?? null;

    try {
        const updates: Promise<unknown>[] = [];
        const placedRows = new Map<number, number>();

        sortedNodes.forEach((node) => {
          const laneId = node.business_area_id ?? fallbackLaneId;
          if (!laneId) return;

          const level = levelMap.get(node.id) ?? 0;
          const laneRowState = laneRows.get(laneId) ?? [];
          const parentIds = parents.get(node.id) ?? [];

          let preferredRow = 0;
          if (parentIds.length > 0) {
            const parentRows = parentIds
              .map((pid) => placedRows.get(pid))
              .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
            if (parentRows.length > 0) {
              preferredRow = Math.round(parentRows.reduce((sum, value) => sum + value, 0) / parentRows.length);
            }
          }

          let row = Math.max(0, preferredRow);
          while ((laneRowState[row] ?? 0) > 0) row += 1;
          laneRowState[row] = 1;
          laneRows.set(laneId, laneRowState);
          placedRows.set(node.id, row);

          updates.push(
            apiPatch(`/processes/${selProc.id}/nodes/${node.id}`, {
              business_area_id: node.business_area_id ?? fallbackLaneId,
              x_position: startX + level * horizontalSpacing,
              y_position: startY + row * verticalSpacing,
            })
          );
        });

      await Promise.all(updates);

      setTimeout(() => {
        loadGraph(selProc);
        runFitView();
      }, 250);
    } catch {
      /**/
    }
  };

  const relayoutByDensity = async (nextColumnDensity: "compact" | "normal" | "expanded", nextRowDensity: "compact" | "normal" | "expanded") => {
    if (!selProc || !graphData) return;

    const nextColumnSpacing =
      nextColumnDensity === "compact"
        ? Math.max(220, BASE_COL_SPACING - 70)
        : nextColumnDensity === "expanded"
          ? BASE_COL_SPACING + 90
          : BASE_COL_SPACING;

    const nextRowSpacing =
      nextRowDensity === "compact"
        ? Math.max(150, BASE_ROW_SPACING - 50)
        : nextRowDensity === "expanded"
          ? BASE_ROW_SPACING + 70
          : BASE_ROW_SPACING;

    try {
      await Promise.all(
        graphData.nodes.map((node) => {
          const currentX = Number(node.x_position ?? 36);
          const currentY = Number(node.y_position ?? 56);
          const colIndex = Math.max(0, Math.round((currentX - 36) / columnSpacing));
          const rowIndex = Math.max(0, Math.round((currentY - 56) / rowSpacing));

          return apiPatch(`/processes/${selProc.id}/nodes/${node.id}`, {
            x_position: 36 + colIndex * nextColumnSpacing,
            y_position: 56 + rowIndex * nextRowSpacing,
          });
        })
      );

      setColumnDensity(nextColumnDensity);
      setRowDensity(nextRowDensity);
      setTimeout(() => {
        loadGraph(selProc);
        runFitView();
      }, 120);
    } catch {
      /**/
    }
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      changes.forEach(async (ch) => {
        if (ch.type === "position" && !ch.dragging && selProc && ch.position) {
          const nid = Number(ch.id);
          if (!isNaN(nid)) {
            const movedNode = rfNodes.find((node) => node.id === ch.id);
            const laneParentId = typeof movedNode?.parentId === "string" && movedNode.parentId.startsWith("lane-") ? movedNode.parentId : null;
            const laneAreaId = laneParentId ? Number(laneParentId.replace("lane-", "")) : null;
            const absoluteX = ROW_LABEL_WIDTH + (ch.position.x ?? 0);
            const colIndex = Math.max(0, Math.round((absoluteX - ROW_LABEL_WIDTH - 26) / columnSpacing));
            const columnX = 36 + colIndex * columnSpacing;
            const rowIndex =
              laneAreaId && graphData?.business_areas
                ? [...graphData.business_areas].sort((a, b) => a.display_order - b.display_order).findIndex((area) => area.id === laneAreaId)
                : 0;
            const boundedY = 56 + Math.max(0, rowIndex) * rowSpacing;
            try {
              await apiPatch(`/processes/${selProc.id}/nodes/${nid}`, {
                business_area_id: laneAreaId || null,
                x_position: columnX,
                y_position: boundedY,
              });
              setTimeout(() => loadGraph(selProc), 80);
            } catch {
              /**/
            }
          }
        }
      });
    },
    [selProc, onNodesChange, columnSpacing, currentLaneHeight, rfNodes, graphData]
  );

  const handleConnect = useCallback((conn: Connection) => {
    setPendingConn(conn);
    setEditingEdge(null);
    setEdgeLabel("");
    setEdgeType("SEQUENCE");
    setEdgeSourceHandle(normalizeHandleForForm(conn.sourceHandle));
    setEdgeTargetHandle(normalizeHandleForForm(conn.targetHandle));
    setEdgeModal(true);
  }, []);
  const saveEdge = async () => {
    if (!selProc) return;
    setSavingEdge(true);
    try {
      if (editingEdge) {
        await apiPatch(`/processes/${selProc.id}/edges/${editingEdge.id}`, {
          edge_label: edgeLabel || null,
          edge_type: edgeType,
          source_handle: toHandlePayload(edgeSourceHandle),
          target_handle: toHandlePayload(edgeTargetHandle),
        });
      } else if (pendingConn) {
        await apiPost(`/processes/${selProc.id}/edges`, {
          source_node_id: Number(pendingConn.source),
          target_node_id: Number(pendingConn.target),
          edge_label: edgeLabel || null,
          edge_type: edgeType,
          source_handle: toHandlePayload(edgeSourceHandle),
          target_handle: toHandlePayload(edgeTargetHandle),
        });
      }
      setEdgeModal(false);
      setPendingConn(null);
      setEditingEdge(null);
      loadGraph(selProc);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingEdge(false);
    }
  };
  const deleteEdge = async (eid: number) => {
    if (!selProc || !confirm("Remover conexão?")) return;
    try {
      await apiDelete(`/processes/${selProc.id}/edges/${eid}`);
      loadGraph(selProc);
    } catch {
      /**/
    }
  };

  const saveGroup = async () => {
    if (!selProc || !groupForm.group_name.trim()) return;
    setSavingGroup(true);
    try {
      const body = {
        group_name: groupForm.group_name,
        group_type: groupForm.group_type,
        parent_group_id: groupForm.parent_group_id ? Number(groupForm.parent_group_id) : null,
        display_order: Number(groupForm.display_order),
      };
      if (groupModal === "add") {
        await apiPost(`/processes/${selProc.id}/groups`, body);
      } else if (editingGroup) {
        await apiPatch(`/processes/${selProc.id}/groups/${editingGroup.id}`, body);
      }
      setGroupModal(null);
      loadGraph(selProc);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingGroup(false);
    }
  };
  const deleteGroup = async (gid: number) => {
    if (!selProc || !confirm("Excluir grupo?")) return;
    try {
      await apiDelete(`/processes/${selProc.id}/groups/${gid}`);
      loadGraph(selProc);
    } catch {
      /**/
    }
  };

  const saveTool = async () => {
    if (!selProc || !toolForm.tool_name.trim()) return;
    setSavingTool(true);
    try {
      const body = {
        tool_name: toolForm.tool_name,
        tool_description: toolForm.tool_description || null,
        tool_icon: toolForm.tool_icon || null,
        display_order: Number(toolForm.display_order),
      };
      if (toolModal === "add") {
        await apiPost(`/processes/${selProc.id}/tools`, body);
      } else if (editingTool) {
        await apiPatch(`/processes/${selProc.id}/tools/${editingTool.id}`, body);
      }
      setToolModal(null);
      loadGraph(selProc);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingTool(false);
    }
  };
  const deleteTool = async (tid: number) => {
    if (!selProc || !confirm("Remover ferramenta?")) return;
    try {
      await apiDelete(`/processes/${selProc.id}/tools/${tid}`);
      loadGraph(selProc);
    } catch {
      /**/
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setErr("");
    try {
      const response = await apiPost<AIProcessGenerateResponse>("/processes/ai/generate", {
        message: aiPrompt,
        product_id: pid ? Number(pid) : null,
        process_scope: pid ? "PRODUCT" : "GLOBAL",
        process_type: "TO_BE",
        process_status: "DRAFT",
        connection_id: selectedAiConnectionId || null,
        create_in_db: true,
      });
      setAiResult(response);
      await loadProcesses(pid);
      if (response.process_id) {
        const created = await apiGet<Proc>(`/processes/${response.process_id}`);
        selectProcess(created);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao gerar com IA");
    } finally {
      setAiGenerating(false);
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith("lane-") || node.id.startsWith("group-")) return;
    const raw = (node.data as { raw: PNode }).raw;
    setNodeForm({
      node_type: raw.node_type,
      node_title: raw.node_title,
      node_description: raw.node_description ?? "",
      node_subtitle: raw.node_subtitle ?? "",
      node_icon: raw.node_icon ?? "",
      role_name: raw.role_name ?? "",
      system_name: raw.system_name ?? "",
      duration_minutes: raw.duration_minutes ? String(raw.duration_minutes) : "",
      width: raw.width ? String(raw.width) : "",
      height: raw.height ? String(raw.height) : "",
      is_manual: raw.is_manual,
      is_bottleneck: raw.is_bottleneck,
      business_area_id: raw.business_area_id ? String(raw.business_area_id) : "",
      group_id: raw.group_id ? String(raw.group_id) : "",
      child_process_id: raw.child_process_id ? String(raw.child_process_id) : "",
    });
    setEditingNode(raw);
    setNodeModal("edit");
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("lane-") || node.id.startsWith("group-")) return;
      const raw = (node.data as { raw: PNode }).raw;
      if (raw.child_process_id) drillDown(raw.child_process_id);
    },
    [selProc, breadcrumb]
  );
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const raw = (edge.data as { raw: PEdge }).raw;
    setPendingConn(null);
    setEditingEdge(raw);
    setEdgeLabel(raw.edge_label ?? "");
    setEdgeType(raw.edge_type);
    setEdgeSourceHandle(normalizeHandleForForm(raw.source_handle));
    setEdgeTargetHandle(normalizeHandleForForm(raw.target_handle));
    setEdgeModal(true);
  }, []);

  const tools = Array.isArray(graphData?.tools) ? graphData!.tools : [];
  const groups = Array.isArray(graphData?.groups) ? graphData!.groups : [];
  const safeAreas = Array.isArray(allAreas) ? allAreas : [];
  const canvasHeight = expandedCanvas ? "calc(100vh - 110px)" : "calc(100vh - 280px)";
  const panelBg = dark ? "rgba(6,10,20,0.9)" : "rgba(255,255,255,0.92)";
  const panelBorder = dark ? "rgba(0,212,255,0.15)" : "rgba(0,136,170,0.18)";
  const canvasBg = dark
    ? "radial-gradient(circle at top, rgba(0,212,255,0.08) 0%, rgba(6,10,20,0.98) 38%, #060a14 100%)"
    : "linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%)";
  const minimapBg = dark ? "rgba(6,10,20,0.9)" : "rgba(255,255,255,0.95)";
  const helperTextColor = dark ? "#7899b0" : "#4f6475";
  const helperPanelBg = dark ? "rgba(6,10,20,0.86)" : "rgba(255,255,255,0.96)";
  const helperPanelBorder = dark ? "rgba(0,212,255,0.12)" : "rgba(0,136,170,0.16)";
  const toolbarButtonStyle: React.CSSProperties = {
    fontSize: 10,
    padding: "6px 10px",
    letterSpacing: 0.8,
  };

  return (
    <ModuleLayout moduleIcon="⬡" moduleName="PROCESS" moduleAccent="MAPPING" selectedProductId={pid} onProductChange={changePid}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// PROCESS MAPPING //</span>
          <h1 className="mod-header__title">
            PROCESS <span>MAPPING</span>
          </h1>
          <p className="mod-header__meta">
            Editor visual + assistente IA para construir fluxogramas de forma intuitiva e no-code.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn-icon"
            onClick={() => {
              setSideTab("processes");
              setProcessDrawerOpen(true);
            }}
          >
            PROCESSOS
          </button>
          <button className="btn-icon" onClick={() => { setAiModal(true); setAiResult(null); }}>
            ✦ GERAR COM IA
          </button>
          <button className="btn-icon" onClick={autoLayout} disabled={!selProc || !graphData}>
            AUTO LAYOUT
          </button>
          <button className="btn-add" onClick={openCreateProc}>
            + NOVO PROCESSO
          </button>
        </div>
      </div>
      {err && <div className="mod-error">⚠ {err}</div>}

      {!selProc && !expandedCanvas && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 10,
            padding: 12,
            border: "1px solid rgba(0,212,255,0.12)",
            background: "rgba(0,212,255,0.035)",
            borderRadius: 6,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 10, color: "#7899b0", letterSpacing: 1.2, minWidth: 180 }}>COMECE MAIS RÁPIDO</div>
          {quickTemplates.map((tpl) => (
            <button
              key={tpl.title}
              className="btn-icon"
              onClick={() => {
                setAiModal(true);
                setAiPrompt(tpl.prompt);
                setAiResult(null);
              }}
            >
              {tpl.title}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, height: canvasHeight, minHeight: expandedCanvas ? 720 : 560 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
          {!selProc ? (
            <div className="mod-empty" style={{ flex: 1 }}>
              <div className="mod-empty__icon">⬡</div>
              <div className="mod-empty__title">SELECIONE UM PROCESSO OU GERE COM IA</div>
              <div className="mod-empty__sub">Você pode começar do zero, usar um template ou descrever o fluxo em linguagem natural.</div>
            </div>
          ) : (
            <>
              {breadcrumb.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    background: "rgba(0,255,136,0.05)",
                    border: "1px solid rgba(0,255,136,0.2)",
                    borderRadius: "4px 4px 0 0",
                    fontSize: 9,
                    flexWrap: "wrap",
                  }}
                >
                  {breadcrumb.map((b, i) => (
                    <span key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={() => breadcrumbBack(i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#00d4ff",
                          cursor: "pointer",
                          fontSize: 9,
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {b.process_name}
                      </button>
                      <span style={{ color: "#444" }}>⟩</span>
                    </span>
                  ))}
                  <span style={{ color: "#00ff88", fontWeight: 700 }}>{selProc.process_name}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "10px 12px",
                  background: panelBg,
                  border: `1px solid ${panelBorder}`,
                  borderRadius: breadcrumb.length > 0 ? "0" : "4px 4px 0 0",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 9, color: "#00d4ff", letterSpacing: 2 }}>
                      {selProc.process_scope} · {selProc.process_type} · {selProc.process_status}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#e0eaff" }}>{selProc.process_name}</span>
                      {selProc.is_macro && (
                        <span
                          style={{
                            fontSize: 8,
                            background: "rgba(0,212,255,0.15)",
                            color: "#00d4ff",
                            border: "1px solid rgba(0,212,255,0.3)",
                            borderRadius: 999,
                            padding: "2px 8px",
                            letterSpacing: 1.1,
                          }}
                        >
                          MACRO
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button className="btn-icon" style={toolbarButtonStyle} onClick={() => openEditProc(selProc)}>
                      EDITAR
                    </button>
                    <button className="btn-icon btn-icon--danger" style={toolbarButtonStyle} onClick={deleteProc}>
                      DEL
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="mod-select" style={{ fontSize: 9, minWidth: 180 }} value={addNodeType} onChange={(e) => setAddNodeType(e.target.value)}>
                    {NODE_TYPES_L.map((t) => (
                      <option key={t} value={t}>
                        {NI[t]} {t}
                      </option>
                    ))}
                  </select>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={openAddNode}>
                    + NÓ
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={runFitView}>
                    ENQUADRAR
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={autoLayout} disabled={!selProc || !graphData}>
                    AUTO LAYOUT
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={() => relayoutByDensity(columnDensity === "compact" ? "compact" : columnDensity === "expanded" ? "normal" : "compact", rowDensity)}>
                    − LARGURA COL.
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={() => relayoutByDensity(columnDensity === "compact" ? "normal" : columnDensity === "normal" ? "expanded" : "expanded", rowDensity)}>
                    + LARGURA COL.
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={() => relayoutByDensity(columnDensity, rowDensity === "compact" ? "compact" : rowDensity === "expanded" ? "normal" : "compact")}>
                    − ALTURA LIN.
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={() => relayoutByDensity(columnDensity, rowDensity === "compact" ? "normal" : rowDensity === "normal" ? "expanded" : "expanded")}>
                    + ALTURA LIN.
                  </button>
                  <button className="btn-icon" style={toolbarButtonStyle} onClick={() => setExpandedCanvas((v) => !v)}>
                    {expandedCanvas ? "FECHAR FOCO" : "EXPANDIR FLUXO"}
                  </button>
                </div>
              </div>

              <div
                ref={flowWrapperRef}
                style={{
                  flex: 1,
                  position: "relative",
                  background: canvasBg,
                  border: `1px solid ${panelBorder}`,
                  borderTop: "none",
                  borderRadius: tools.length > 0 && !expandedCanvas ? "0" : "0 0 4px 4px",
                  minHeight: expandedCanvas ? 720 : undefined,
                }}
              >
                {graphLoading && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%,-50%)",
                      color: "#00d4ff",
                      fontSize: 11,
                      letterSpacing: 2,
                      zIndex: 10,
                    }}
                  >
                    CARREGANDO...
                  </div>
                )}
                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={handleConnect}
                  onNodeClick={onNodeClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onEdgeClick={onEdgeClick}
                  fitView
                  style={{ background: "transparent" }}
                  deleteKeyCode={null}
                  minZoom={0.25}
                  maxZoom={1.8}
                  defaultEdgeOptions={{ type: "executive" }}
                >
                  <FlowViewportManager triggerKey={`${selProc?.id ?? "none"}-${fitTick}-${rfNodes.length}-${rfEdges.length}`} expanded={expandedCanvas} />
                  <Background color={dark ? "#102034" : "#bfd3e2"} gap={28} size={1} />
                  <Controls style={{ background: panelBg, border: `1px solid ${dark ? "rgba(0,212,255,0.2)" : "rgba(0,136,170,0.2)"}` }} />
                  <MiniMap
                    style={{ background: minimapBg, border: `1px solid ${panelBorder}` }}
                    nodeColor={(n) => {
                      const raw = (n.data as { raw?: PNode }).raw;
                      return NC[raw?.node_type ?? ""] ?? "#00d4ff";
                    }}
                  />
                  <Panel
                    position="top-right"
                    style={{
                      fontSize: 9,
                      color: helperTextColor,
                      background: helperPanelBg,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${helperPanelBorder}`,
                    }}
                  >
                    <div>EDITAR NÓ: clique simples</div>
                    <div>DRILL DOWN: duplo clique</div>
                    <div>CONECTAR: arraste de porta</div>
                    <div>MOVER: arraste o nó</div>
                    <div>DEL ARESTA: clique na seta</div>
                    <div>COLUNAS: − / + LARGURA COL.</div>
                    <div>LINHAS: − / + ALTURA LIN.</div>
                  </Panel>
                </ReactFlow>
              </div>

              {tools.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "8px 16px",
                    background: "rgba(0,212,255,0.06)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 8, color: "#00d4ff", letterSpacing: 2, fontWeight: 700, flexShrink: 0 }}>CRITICAL SYSTEMS & TOOLS</span>
                  {tools.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        background: "rgba(6,10,20,0.7)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        borderRadius: 4,
                      }}
                    >
                      {t.tool_icon && <span style={{ fontSize: 14 }}>{IM[t.tool_icon] ?? t.tool_icon}</span>}
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#e0eaff", letterSpacing: 0.5 }}>{t.tool_name}</div>
                        {t.tool_description && <div style={{ fontSize: 7, color: "#7899b0" }}>{t.tool_description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {processDrawerOpen && !expandedCanvas && (
        <div className="mod-overlay" onClick={() => setProcessDrawerOpen(false)}>
          <div
            className="mod-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360, width: "92%", marginLeft: "auto", marginRight: 20, height: "calc(100vh - 60px)", overflow: "auto" }}
          >
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// PROCESS SWITCHER //</span>
                <h3 className="mod-modal__title">
                  PROCESSOS <span>E CONTEXTO</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setProcessDrawerOpen(false)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                {(["processes", "areas", "groups", "tools"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSideTab(t)}
                    style={{
                      fontSize: 8,
                      padding: "4px 7px",
                      letterSpacing: 1,
                      background: sideTab === t ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${sideTab === t ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
                      borderRadius: 4,
                      color: sideTab === t ? "#00d4ff" : "#7899b0",
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {t === "processes" ? "PROC" : t === "areas" ? "ÁREAS" : t === "groups" ? "GRUPOS" : "TOOLS"}
                  </button>
                ))}
              </div>

              {sideTab === "processes" && (
                <>
                  <div style={{ fontSize: 9, color: "#7899b0", letterSpacing: 2, marginBottom: 6 }}>
                    // {pid ? "PROCESSOS DO PRODUTO" : "TODOS OS PROCESSOS"} //
                  </div>
                  {loading ? (
                    <div className="mod-loading" style={{ fontSize: 10 }}>
                      CARREGANDO...
                    </div>
                  ) : processes.length === 0 ? (
                    <div style={{ color: "#7899b0", fontSize: 10, padding: "8px 0" }}>Nenhum processo.</div>
                  ) : (
                    processes.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          selectProcess(p);
                          setProcessDrawerOpen(false);
                        }}
                        style={{
                          padding: "8px 10px",
                          background: selProc?.id === p.id ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${selProc?.id === p.id ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.1)"}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          marginBottom: 6,
                          transition: "all .15s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: p.process_scope === "GLOBAL" ? "#00ff88" : typeColor(p.process_type), letterSpacing: 1 }}>
                            {p.process_scope === "GLOBAL" ? "GLOBAL" : p.process_type}
                          </span>
                          <span style={{ fontSize: 8, color: statusColor(p.process_status) }}>{p.process_status}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#e0eaff", letterSpacing: 0.5 }}>{p.process_name}</span>
                          {p.is_macro && (
                            <span
                              style={{
                                fontSize: 7,
                                background: "rgba(0,212,255,0.15)",
                                color: "#00d4ff",
                                border: "1px solid rgba(0,212,255,0.3)",
                                borderRadius: 3,
                                padding: "1px 4px",
                                letterSpacing: 1,
                              }}
                            >
                              MACRO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2 }}>
                          v{p.process_version}
                          {p.process_owner ? ` · ${p.process_owner}` : ""}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {sideTab === "areas" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: "#7899b0", letterSpacing: 2 }}>// ÁREAS //</span>
                    <button
                      className="btn-icon"
                      style={{ fontSize: 8 }}
                      onClick={() => {
                        setAreaForm({ ...EMPTY_A });
                        setEditingArea(null);
                        setAreaModal("add");
                      }}
                    >
                      + Área
                    </button>
                  </div>
                  {safeAreas.length === 0 ? (
                    <div style={{ color: "#7899b0", fontSize: 10 }}>Nenhuma área cadastrada.</div>
                  ) : (
                    safeAreas.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(0,212,255,0.1)",
                          borderRadius: 4,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 2,
                                background: a.area_color || "#555",
                                flexShrink: 0,
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                            />
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#e0eaff" }}>{a.area_name}</span>
                          </div>
                          <div style={{ display: "flex", gap: 3 }}>
                            <button
                              className="btn-icon"
                              style={{ fontSize: 7, padding: "1px 4px" }}
                              onClick={() => {
                                setAreaForm({
                                  area_name: a.area_name,
                                  area_description: a.area_description ?? "",
                                  area_color: a.area_color ?? "",
                                  display_order: a.display_order,
                                  is_active: a.is_active,
                                });
                                setEditingArea(a);
                                setAreaModal("edit");
                              }}
                            >
                              ED
                            </button>
                            <button className="btn-icon btn-icon--danger" style={{ fontSize: 7, padding: "1px 4px" }} onClick={() => deleteArea(a.id)}>
                              ✕
                            </button>
                          </div>
                        </div>
                        {a.area_description && <div style={{ fontSize: 8, color: "#7899b0", marginTop: 2 }}>{a.area_description}</div>}
                        <div style={{ fontSize: 7, color: "#555", marginTop: 1 }}>
                          ordem {a.display_order} · {a.is_active ? "ativa" : "inativa"}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {sideTab === "groups" && selProc && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: "#7899b0", letterSpacing: 2 }}>// GRUPOS //</span>
                    <button
                      className="btn-icon"
                      style={{ fontSize: 8 }}
                      onClick={() => {
                        setGroupForm({ ...EMPTY_G });
                        setEditingGroup(null);
                        setGroupModal("add");
                      }}
                    >
                      + Grupo
                    </button>
                  </div>
                  {groups.length === 0 ? (
                    <div style={{ color: "#7899b0", fontSize: 10 }}>Nenhum grupo.</div>
                  ) : (
                    groups.map((g) => (
                      <div
                        key={g.id}
                        style={{
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(0,212,255,0.1)",
                          borderRadius: 4,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#e0eaff" }}>{g.group_name}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className="btn-icon"
                              style={{ fontSize: 7, padding: "1px 4px" }}
                              onClick={() => {
                                setGroupForm({
                                  group_name: g.group_name,
                                  group_type: g.group_type,
                                  parent_group_id: g.parent_group_id ? String(g.parent_group_id) : "",
                                  display_order: g.display_order,
                                });
                                setEditingGroup(g);
                                setGroupModal("edit");
                              }}
                            >
                              ED
                            </button>
                            <button className="btn-icon btn-icon--danger" style={{ fontSize: 7, padding: "1px 4px" }} onClick={() => deleteGroup(g.id)}>
                              ✕
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: 8, color: "#7899b0", marginTop: 1 }}>
                          {g.group_type}
                          {g.parent_group_id ? ` · filho de #${g.parent_group_id}` : ""}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {sideTab === "tools" && selProc && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: "#7899b0", letterSpacing: 2 }}>// FERRAMENTAS //</span>
                    <button
                      className="btn-icon"
                      style={{ fontSize: 8 }}
                      onClick={() => {
                        setToolForm({ ...EMPTY_T });
                        setEditingTool(null);
                        setToolModal("add");
                      }}
                    >
                      + Tool
                    </button>
                  </div>
                  {tools.length === 0 ? (
                    <div style={{ color: "#7899b0", fontSize: 10 }}>Nenhuma ferramenta.</div>
                  ) : (
                    tools.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(0,212,255,0.1)",
                          borderRadius: 4,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#e0eaff" }}>
                            {t.tool_icon ? `${IM[t.tool_icon] ?? t.tool_icon} ` : ""}
                            {t.tool_name}
                          </span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className="btn-icon"
                              style={{ fontSize: 7, padding: "1px 4px" }}
                              onClick={() => {
                                setToolForm({
                                  tool_name: t.tool_name,
                                  tool_description: t.tool_description ?? "",
                                  tool_icon: t.tool_icon ?? "",
                                  display_order: t.display_order,
                                });
                                setEditingTool(t);
                                setToolModal("edit");
                              }}
                            >
                              ED
                            </button>
                            <button className="btn-icon btn-icon--danger" style={{ fontSize: 7, padding: "1px 4px" }} onClick={() => deleteTool(t.id)}>
                              ✕
                            </button>
                          </div>
                        </div>
                        {t.tool_description && <div style={{ fontSize: 8, color: "#7899b0", marginTop: 1 }}>{t.tool_description}</div>}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {procModal && (
        <div className="mod-overlay" onClick={() => setProcModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, width: "95%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// PROCESSO //</span>
                <h3 className="mod-modal__title">
                  {procModal === "create" ? "NOVO" : "EDITAR"} <span>PROCESSO</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setProcModal(null)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              {NF("NOME *", <input className="mod-input" value={procForm.process_name} onChange={(e) => setProcForm((f) => ({ ...f, process_name: e.target.value }))} placeholder="Nome do processo" />)}
              {NF("DESCRIÇÃO", <textarea className="mod-textarea" value={procForm.process_description ?? ""} onChange={(e) => setProcForm((f) => ({ ...f, process_description: e.target.value }))} rows={2} />)}
              <div className="mod-field-row">
                {NF("ESCOPO", <select className="mod-select" value={procForm.process_scope} onChange={(e) => setProcForm((f) => ({ ...f, process_scope: e.target.value }))}>{PROC_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}</select>)}
                {NF("TIPO", <select className="mod-select" value={procForm.process_type} onChange={(e) => setProcForm((f) => ({ ...f, process_type: e.target.value }))}>{PROC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
                {NF("STATUS", <select className="mod-select" value={procForm.process_status} onChange={(e) => setProcForm((f) => ({ ...f, process_status: e.target.value }))}>{PROC_STATUS.map((s) => <option key={s}>{s}</option>)}</select>)}
                {NF("VERSÃO", <input className="mod-input" value={procForm.process_version} onChange={(e) => setProcForm((f) => ({ ...f, process_version: e.target.value }))} />)}
              </div>
              {NF("ÁREA DE NEGÓCIO", <select className="mod-select" value={procForm.business_area_id} onChange={(e) => setProcForm((f) => ({ ...f, business_area_id: e.target.value }))}><option value="">—</option>{safeAreas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}</select>)}
              {NF("RESPONSÁVEL", <input className="mod-input" value={procForm.process_owner ?? ""} onChange={(e) => setProcForm((f) => ({ ...f, process_owner: e.target.value }))} />)}
              {NF("GATILHO", <input className="mod-input" value={procForm.process_trigger ?? ""} onChange={(e) => setProcForm((f) => ({ ...f, process_trigger: e.target.value }))} />)}
              {NF("RESULTADO ESPERADO", <input className="mod-input" value={procForm.process_outcome ?? ""} onChange={(e) => setProcForm((f) => ({ ...f, process_outcome: e.target.value }))} />)}
              <div className="mod-field">
                <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={procForm.is_macro} onChange={(e) => setProcForm((f) => ({ ...f, is_macro: e.target.checked }))} />
                  <span>
                    PROCESSO MACRO <span style={{ color: "#7899b0", fontWeight: 400 }}>(visão end-to-end que agrega múltiplos subprocessos)</span>
                  </span>
                </label>
              </div>
            </div>
            {procModal === "edit" && selProc && (
              <div style={{ padding: "0 16px 8px" }}>
                <RaciPanel objectType="PROCESS" objectId={selProc.id} productId={pid} />
              </div>
            )}
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setProcModal(null)}>
                CANCELAR
              </button>
              <button className="btn-save" onClick={saveProc} disabled={savingProc || !procForm.process_name.trim()}>
                {savingProc ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aiModal && (
        <div className="mod-overlay" onClick={() => setAiModal(false)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 980, width: "96%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// AI PROCESS DESIGN //</span>
                <h3 className="mod-modal__title">
                  GERAR <span>PROCESSO COM IA</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setAiModal(false)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9bb0c8", marginBottom: 10, lineHeight: 1.6 }}>
                  Descreva o fluxo em linguagem natural. A IA transforma o texto em estrutura de processo, gera o SQL preview e cria diretamente no banco via API.
                </div>
                {NF(
                  "CONEXÃO IA",
                  <select className="mod-select" value={selectedAiConnectionId} onChange={(e) => setSelectedAiConnectionId(e.target.value)} disabled={loadingAiConnections || aiConnections.length === 0}>
                    <option value="">
                      {loadingAiConnections
                        ? "CARREGANDO..."
                        : aiConnections.length > 1
                          ? "SELECIONE UMA CONEXÃO"
                          : aiConnections.length === 1
                            ? "AUTO-SELECIONADA"
                            : "SEM CONEXÃO IA"}
                    </option>
                    {aiConnections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.provider} · {c.scope}
                      </option>
                    ))}
                  </select>
                )}
                {NF(
                  "DESCREVA O PROCESSO",
                  <textarea
                    className="mod-textarea"
                    rows={14}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ex: Crie um fluxo Opportunity Journey com etapas Capture, Assess, Discover, Evaluate, Decide, Promotion Gate e Define. Use swimlanes por área, decisões sim/não, ícones, resultados alternativos e um loop de retorno para discovery quando necessário."
                  />
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {quickTemplates.map((tpl) => (
                    <button key={tpl.title} className="btn-icon" onClick={() => setAiPrompt(tpl.prompt)}>
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(0,212,255,0.12)",
                  background: "rgba(0,212,255,0.03)",
                  borderRadius: 6,
                  padding: 12,
                  minHeight: 380,
                  overflow: "auto",
                }}
              >
                <div style={{ fontSize: 10, color: "#00d4ff", letterSpacing: 2, marginBottom: 10 }}>// RESULTADO DA IA //</div>
                {!aiResult ? (
                  <div style={{ fontSize: 11, color: "#7899b0", lineHeight: 1.6 }}>
                    A resposta mostrará resumo, warnings, SQL preview e estatísticas do fluxo criado.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e0eaff" }}>{aiResult.process_name || "Processo gerado"}</div>
                    <div style={{ fontSize: 11, color: "#9bb0c8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{aiResult.summary}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <StatCard label="NÓS" value={aiResult.draft?.nodes?.length ?? 0} accent="#00ff88" />
                      <StatCard label="ARESTAS" value={aiResult.draft?.edges?.length ?? 0} accent="#ffcc44" />
                      <StatCard label="ÁREAS" value={aiResult.draft?.business_areas?.length ?? 0} accent="#c084fc" />
                    </div>
                    {aiResult.warnings?.length > 0 && (
                      <div style={{ padding: 10, border: "1px solid rgba(255,153,0,0.25)", background: "rgba(255,153,0,0.05)", borderRadius: 4 }}>
                        <div style={{ fontSize: 10, color: "#ff9900", marginBottom: 6 }}>WARNINGS</div>
                        {aiResult.warnings.map((w, idx) => (
                          <div key={idx} style={{ fontSize: 10, color: "#d6e7f2", marginBottom: 4 }}>
                            • {w}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#7899b0", marginTop: 4 }}>SQL PREVIEW</div>
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        fontSize: 10,
                        lineHeight: 1.5,
                        color: "#bfe7ff",
                        background: "rgba(6,10,20,0.8)",
                        border: "1px solid rgba(0,212,255,0.15)",
                        padding: 10,
                        borderRadius: 4,
                      }}
                    >
                      {aiResult.sql_preview}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setAiModal(false)}>
                FECHAR
              </button>
              <button
                className="btn-save"
                onClick={generateWithAI}
                disabled={aiGenerating || !aiPrompt.trim() || aiConnections.length === 0 || (aiConnections.length > 1 && !selectedAiConnectionId)}
              >
                {aiGenerating ? "GERANDO..." : "GERAR E CRIAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {nodeModal && (
        <div className="mod-overlay" onClick={() => setNodeModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, width: "95%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// NÓ //</span>
                <h3 className="mod-modal__title">
                  {nodeModal === "add" ? "NOVO" : "EDITAR"} <span>NÓ</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setNodeModal(null)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                {NF("TIPO", <select className="mod-select" value={nodeForm.node_type} onChange={(e) => setNodeForm((f) => ({ ...f, node_type: e.target.value }))} disabled={nodeModal === "edit"}>{NODE_TYPES_L.map((t) => <option key={t} value={t}>{NI[t]} {t}</option>)}</select>)}
                {NF("TÍTULO *", <input className="mod-input" value={nodeForm.node_title} onChange={(e) => setNodeForm((f) => ({ ...f, node_title: e.target.value }))} placeholder="Título do nó" />)}
              </div>
              {NF("SUBTÍTULO", <input className="mod-input" value={nodeForm.node_subtitle} onChange={(e) => setNodeForm((f) => ({ ...f, node_subtitle: e.target.value }))} placeholder="Texto secundário sob o título" />)}
              {NF("ÍCONE", <input className="mod-input" value={nodeForm.node_icon} onChange={(e) => setNodeForm((f) => ({ ...f, node_icon: e.target.value }))} placeholder="Ex: search, clipboard, chart, gavel, gate…" />)}
              {NF("DESCRIÇÃO", <textarea className="mod-textarea" value={nodeForm.node_description} onChange={(e) => setNodeForm((f) => ({ ...f, node_description: e.target.value }))} rows={2} />)}
              <div className="mod-field-row">
                {NF("PAPEL / EQUIPE", <input className="mod-input" value={nodeForm.role_name} onChange={(e) => setNodeForm((f) => ({ ...f, role_name: e.target.value }))} placeholder="Ex: Inside Sales" />)}
                {NF("SISTEMA", <input className="mod-input" value={nodeForm.system_name} onChange={(e) => setNodeForm((f) => ({ ...f, system_name: e.target.value }))} placeholder="Ex: SAP, Oracle" />)}
              </div>
              <div className="mod-field-row">
                {NF("ÁREA DE NEGÓCIO", <select className="mod-select" value={nodeForm.business_area_id} onChange={(e) => setNodeForm((f) => ({ ...f, business_area_id: e.target.value }))}><option value="">—</option>{safeAreas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}</select>)}
                {NF("GRUPO", <select className="mod-select" value={nodeForm.group_id} onChange={(e) => setNodeForm((f) => ({ ...f, group_id: e.target.value }))}><option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}</select>)}
              </div>
              {NF("⬇ SUBPROCESSO (drill down)", <select className="mod-select" value={nodeForm.child_process_id} onChange={(e) => setNodeForm((f) => ({ ...f, child_process_id: e.target.value }))}><option value="">— nenhum —</option>{processes.filter((p) => p.id !== selProc?.id).map((p) => <option key={p.id} value={p.id}>{p.process_name}</option>)}</select>)}
              <div className="mod-field-row">
                {NF("DURAÇÃO (min)", <input className="mod-input" type="number" min="0" value={nodeForm.duration_minutes} onChange={(e) => setNodeForm((f) => ({ ...f, duration_minutes: e.target.value }))} />)}
                {NF("LARGURA", <input className="mod-input" type="number" min="80" value={nodeForm.width} onChange={(e) => setNodeForm((f) => ({ ...f, width: e.target.value }))} placeholder="auto" />)}
                {NF("ALTURA", <input className="mod-input" type="number" min="60" value={nodeForm.height} onChange={(e) => setNodeForm((f) => ({ ...f, height: e.target.value }))} placeholder="auto" />)}
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={nodeForm.is_manual} onChange={(e) => setNodeForm((f) => ({ ...f, is_manual: e.target.checked }))} /> MANUAL
                  </label>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={nodeForm.is_bottleneck} onChange={(e) => setNodeForm((f) => ({ ...f, is_bottleneck: e.target.checked }))} /> <span style={{ color: "#ff9900" }}>⚠ GARGALO</span>
                  </label>
                </div>
              </div>
              {nodeModal === "edit" && editingNode && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,68,68,0.2)" }}>
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => {
                      setNodeModal(null);
                      deleteNode(editingNode.id);
                    }}
                  >
                    EXCLUIR NÓ
                  </button>
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setNodeModal(null)}>
                CANCELAR
              </button>
              <button className="btn-save" onClick={saveNode} disabled={savingNode || !nodeForm.node_title.trim()}>
                {savingNode ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {areaModal && (
        <div className="mod-overlay" onClick={() => setAreaModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "95%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// ÁREA DE NEGÓCIO //</span>
                <h3 className="mod-modal__title">
                  {areaModal === "add" ? "NOVA" : "EDITAR"} <span>ÁREA</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setAreaModal(null)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              {NF("NOME *", <input className="mod-input" value={areaForm.area_name} onChange={(e) => setAreaForm((f) => ({ ...f, area_name: e.target.value }))} placeholder="Ex: COMERCIAL, PRODUCT, FINANCEIRO" />)}
              {NF("DESCRIÇÃO", <input className="mod-input" value={areaForm.area_description} onChange={(e) => setAreaForm((f) => ({ ...f, area_description: e.target.value }))} placeholder="Descrição da área de negócio" />)}
              <div className="mod-field-row">
                {NF(
                  "COR DA SWIMLANE",
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="color"
                      value={areaForm.area_color || "#1a3a5c"}
                      onChange={(e) => setAreaForm((f) => ({ ...f, area_color: e.target.value }))}
                      style={{ width: 36, height: 28, border: "1px solid rgba(0,212,255,0.3)", borderRadius: 4, background: "none", cursor: "pointer", padding: 2 }}
                    />
                    <input className="mod-input" value={areaForm.area_color} onChange={(e) => setAreaForm((f) => ({ ...f, area_color: e.target.value }))} placeholder="#1a3a5c" style={{ flex: 1 }} />
                  </div>
                )}
                {NF("ORDEM", <input className="mod-input" type="number" min="0" value={areaForm.display_order} onChange={(e) => setAreaForm((f) => ({ ...f, display_order: Number(e.target.value) }))} />)}
              </div>
              <div className="mod-field">
                <label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={areaForm.is_active} onChange={(e) => setAreaForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  <span>ÁREA ATIVA</span>
                </label>
              </div>
              {areaModal === "edit" && editingArea && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,68,68,0.2)" }}>
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => {
                      setAreaModal(null);
                      deleteArea(editingArea.id);
                    }}
                  >
                    EXCLUIR ÁREA
                  </button>
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setAreaModal(null)}>
                CANCELAR
              </button>
              <button className="btn-save" onClick={saveArea} disabled={savingArea || !areaForm.area_name.trim()}>
                {savingArea ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {edgeModal && (
        <div className="mod-overlay" onClick={() => setEdgeModal(false)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "95%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// CONEXÃO //</span>
                <h3 className="mod-modal__title">
                  NOVA <span>CONEXÃO</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setEdgeModal(false)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              {NF("TIPO", <select className="mod-select" value={edgeType} onChange={(e) => setEdgeType(e.target.value)}>{EDGE_TYPES_L.map((t) => <option key={t}>{t}</option>)}</select>)}
              {NF("RÓTULO", <input className="mod-input" value={edgeLabel} onChange={(e) => setEdgeLabel(e.target.value)} placeholder="Ex: Sim / Não / Aprovado" />)}
              <div className="mod-field-row">
                {NF("SAÍDA DA ORIGEM", <select className="mod-select" value={edgeSourceHandle} onChange={(e) => setEdgeSourceHandle(e.target.value)}><option value="AUTO">AUTOMÁTICO</option><option value="top">TOPO</option><option value="right">DIREITA</option><option value="bottom">BASE</option><option value="left">ESQUERDA</option></select>)}
                {NF("ENTRADA DO DESTINO", <select className="mod-select" value={edgeTargetHandle} onChange={(e) => setEdgeTargetHandle(e.target.value)}><option value="AUTO">AUTOMÁTICO</option><option value="top">TOPO</option><option value="right">DIREITA</option><option value="bottom">BASE</option><option value="left">ESQUERDA</option></select>)}
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => { setEdgeModal(false); setEditingEdge(null); setPendingConn(null); }}>
                CANCELAR
              </button>
              {editingEdge && (
                <button className="btn-icon btn-icon--danger" onClick={() => { setEdgeModal(false); deleteEdge(editingEdge.id); }}>
                  EXCLUIR
                </button>
              )}
              <button className="btn-save" onClick={saveEdge} disabled={savingEdge}>
                {savingEdge ? "SALVANDO..." : editingEdge ? "SALVAR ⟩" : "CONECTAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {groupModal && (
        <div className="mod-overlay" onClick={() => setGroupModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "95%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// GRUPO //</span>
                <h3 className="mod-modal__title">
                  {groupModal === "add" ? "NOVO" : "EDITAR"} <span>GRUPO</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setGroupModal(null)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              {NF("NOME *", <input className="mod-input" value={groupForm.group_name} onChange={(e) => setGroupForm((f) => ({ ...f, group_name: e.target.value }))} placeholder="Ex: FASE 1, GOVERNANÇA" />)}
              {NF("TIPO", <select className="mod-select" value={groupForm.group_type} onChange={(e) => setGroupForm((f) => ({ ...f, group_type: e.target.value }))}>{GROUP_TYPES_L.map((t) => <option key={t}>{t}</option>)}</select>)}
              {NF("GRUPO PAI", <select className="mod-select" value={groupForm.parent_group_id} onChange={(e) => setGroupForm((f) => ({ ...f, parent_group_id: e.target.value }))}><option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}</select>)}
              {NF("ORDEM", <input className="mod-input" type="number" min="0" value={groupForm.display_order} onChange={(e) => setGroupForm((f) => ({ ...f, display_order: Number(e.target.value) }))} />)}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setGroupModal(null)}>
                CANCELAR
              </button>
              <button className="btn-save" onClick={saveGroup} disabled={savingGroup || !groupForm.group_name.trim()}>
                {savingGroup ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toolModal && (
        <div className="mod-overlay" onClick={() => setToolModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "95%" }}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// FERRAMENTA //</span>
                <h3 className="mod-modal__title">
                  {toolModal === "add" ? "NOVA" : "EDITAR"} <span>FERRAMENTA</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={() => setToolModal(null)}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              {NF("NOME *", <input className="mod-input" value={toolForm.tool_name} onChange={(e) => setToolForm((f) => ({ ...f, tool_name: e.target.value }))} placeholder="Ex: ORACLE CLOUD" />)}
              {NF("DESCRIÇÃO", <input className="mod-input" value={toolForm.tool_description} onChange={(e) => setToolForm((f) => ({ ...f, tool_description: e.target.value }))} placeholder="Ex: Gestão ERP: SO/PO/AR" />)}
              {NF("ÍCONE", <input className="mod-input" value={toolForm.tool_icon} onChange={(e) => setToolForm((f) => ({ ...f, tool_icon: e.target.value }))} placeholder="Ex: cloud, gear, document…" />)}
              {NF("ORDEM", <input className="mod-input" type="number" min="0" value={toolForm.display_order} onChange={(e) => setToolForm((f) => ({ ...f, display_order: Number(e.target.value) }))} />)}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setToolModal(null)}>
                CANCELAR
              </button>
              <button className="btn-save" onClick={saveTool} disabled={savingTool || !toolForm.tool_name.trim()}>
                {savingTool ? "SALVANDO..." : "SALVAR ⟩"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
