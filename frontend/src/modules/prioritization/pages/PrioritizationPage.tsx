import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

type PrioritizationMethod = "RICE" | "ICE" | "MOSCOW" | "EISENHOWER" | "WSJF";
type PrioritizationTab = "QUARTER" | PrioritizationMethod;
type MoscowValue = "" | "must" | "should" | "could" | "wont";
type PrioritizationItemType =
  | "initiative"
  | "epic"
  | "feature"
  | "opportunity"
  | "hypothesis"
  | "experiment"
  | "quick_win"
  | "user_story"
  | "enabler"
  | "sprint_item"
  | "task"
  | "urgent_issue"
  | "action";

interface PrioritizationItem {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  item_type?: PrioritizationItemType;
  priority_method: PrioritizationMethod;
  reach?: number | null;
  impact?: number | null;
  confidence?: number | null;
  effort?: number | null;
  rice_score?: number | null;
  moscow_value?: MoscowValue | null;
  ease?: number | null;
  ice_score?: number | null;
  urgency?: number | null;
  importance?: number | null;
  eisenhower_score?: number | null;
  quadrant?: string | null;
  business_value?: number | null;
  time_criticality?: number | null;
  risk_reduction?: number | null;
  job_size?: number | null;
  wsjf_score?: number | null;
  created_at: string;
}

interface CompanyInfo {
  id: number;
  company_name: string;
  fiscal_year_start_month?: number;
  notes?: string | null;
}

interface ProductInfo {
  product_id: number;
  company_id?: number | null;
  name: string;
}

interface QuarterPrioritizationItem {
  id: string;
  company_id: number;
  product_id: string;
  roadmap_item_id: string;
  roadmap_title?: string | null;
  roadmap_item_type?: PrioritizationItemType | null;
  backlog_item_id?: number | null;
  backlog_item_type?: PrioritizationItemType | null;
  fiscal_year: number;
  quarter: string;
  priority_rank?: number | null;
  planning_status: string;
  business_value: number;
  strategic_alignment: number;
  urgency: number;
  dependency_readiness: number;
  delivery_risk: number;
  confidence: number;
  estimated_effort: number;
  planned_capacity_share?: number | null;
  quarter_score: number;
  decision_rationale?: string | null;
  notes?: string | null;
  fiscal_year_start_month: number;
  created_at: string;
  updated_at: string;
}

interface MethodOption {
  value: PrioritizationMethod;
  label: string;
}

interface TypeOption {
  value: PrioritizationItemType;
  labelKey: string;
}

interface MethodConfig {
  titleKey: string;
  summaryKey: string;
  bullets: string[];
  compatibility: PrioritizationItemType[];
}

interface MethodSummary {
  title: string;
  summary: string;
  bullets: string[];
  compatibility: { value: PrioritizationItemType; label: string }[];
}

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  sourceType?: PrioritizationItemType;
  matchTokens?: string[];
  groupLabel?: string;
  backlogItemId?: number;
  adoId?: string;
  wsjf?: {
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
    score: number;
  };
}

interface QuarterCandidate {
  roadmap_item_id: string;
  title: string;
  description: string | undefined;
  sourceType?: PrioritizationItemType;
}

interface WsjfOption {
  option_id: number;
  option_label: string;
  option_value?: string | null;
  score_value?: number | null;
  justification_template?: string | null;
  display_order: number;
}
interface WsjfQuestion {
  question_id: number;
  question_text: string;
  help_text?: string | null;
  question_type: string;
  display_order: number;
  options: WsjfOption[];
}
interface WsjfDimension {
  dimension_id: number;
  code: "business_value" | "time_criticality" | "risk_reduction" | "job_size";
  label: string;
  description?: string | null;
  display_order: number;
  is_required: boolean;
  questions: WsjfQuestion[];
}
interface WsjfTemplate {
  template_id: number;
  name: string;
  description?: string | null;
  scale_type: string;
  is_active: boolean;
  is_default: boolean;
  dimensions: WsjfDimension[];
}
interface WsjfAssessmentAnswer {
  answer_id: number;
  question_id: number;
  selected_option_id?: number | null;
  answer_text?: string | null;
  derived_dimension_code?: string | null;
  derived_score?: number | null;
  justification_snapshot?: string | null;
  created_at: string;
  updated_at: string;
}
interface WsjfAssessment {
  assessment_id: number;
  product_id?: number | null;
  backlog_item_id: number;
  template_id: number;
  status: string;
  business_value_score: number;
  time_criticality_score: number;
  risk_reduction_score: number;
  job_size_score: number;
  cost_of_delay: number;
  wsjf_score: number;
  summary_justification?: string | null;
  rationale_markdown?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  answers: WsjfAssessmentAnswer[];
}

const EMPTY = {
  title: "",
  description: "",
  item_type: "initiative" as PrioritizationItemType,
  priority_method: "RICE" as PrioritizationMethod,
  reach: 0,
  impact: 0,
  confidence: 0,
  effort: 1,
  rice_score: 0,
  moscow_value: "" as MoscowValue,
};

const TAB_ORDER: PrioritizationTab[] = ["QUARTER", "RICE", "ICE", "MOSCOW", "EISENHOWER", "WSJF"];
const METHOD_ORDER: PrioritizationMethod[] = ["RICE", "ICE", "MOSCOW", "EISENHOWER", "WSJF"];

const ITEM_TYPE_OPTIONS: TypeOption[] = [
  { value: "initiative", labelKey: "prioritization.item_types.initiative" },
  { value: "epic", labelKey: "prioritization.item_types.epic" },
  { value: "feature", labelKey: "prioritization.item_types.feature" },
  { value: "opportunity", labelKey: "prioritization.item_types.opportunity" },
  { value: "hypothesis", labelKey: "prioritization.item_types.hypothesis" },
  { value: "experiment", labelKey: "prioritization.item_types.experiment" },
  { value: "quick_win", labelKey: "prioritization.item_types.quick_win" },
  { value: "user_story", labelKey: "prioritization.item_types.user_story" },
  { value: "enabler", labelKey: "prioritization.item_types.enabler" },
  { value: "sprint_item", labelKey: "prioritization.item_types.sprint_item" },
  { value: "task", labelKey: "prioritization.item_types.task" },
  { value: "urgent_issue", labelKey: "prioritization.item_types.urgent_issue" },
  { value: "action", labelKey: "prioritization.item_types.action" },
];

const METHOD_CONFIG: Record<PrioritizationMethod, MethodConfig> = {
  RICE: {
    titleKey: "prioritization.methods.RICE.label",
    summaryKey: "prioritization.methods.RICE.summary",
    bullets: [
      "prioritization.methods.RICE.bullet1",
      "prioritization.methods.RICE.bullet2",
      "prioritization.methods.RICE.bullet3",
    ],
    compatibility: ["initiative", "epic", "feature", "opportunity"],
  },
  ICE: {
    titleKey: "prioritization.methods.ICE.label",
    summaryKey: "prioritization.methods.ICE.summary",
    bullets: [
      "prioritization.methods.ICE.bullet1",
      "prioritization.methods.ICE.bullet2",
      "prioritization.methods.ICE.bullet3",
    ],
    compatibility: ["hypothesis", "experiment", "quick_win"],
  },
  MOSCOW: {
    titleKey: "prioritization.methods.MOSCOW.label",
    summaryKey: "prioritization.methods.MOSCOW.summary",
    bullets: [
      "prioritization.methods.MOSCOW.bullet1",
      "prioritization.methods.MOSCOW.bullet2",
      "prioritization.methods.MOSCOW.bullet3",
    ],
    compatibility: ["user_story", "enabler", "sprint_item"],
  },
  EISENHOWER: {
    titleKey: "prioritization.methods.EISENHOWER.label",
    summaryKey: "prioritization.methods.EISENHOWER.summary",
    bullets: [
      "prioritization.methods.EISENHOWER.bullet1",
      "prioritization.methods.EISENHOWER.bullet2",
      "prioritization.methods.EISENHOWER.bullet3",
    ],
    compatibility: ["task", "urgent_issue", "action"],
  },
  WSJF: {
    titleKey: "prioritization.methods.WSJF.label",
    summaryKey: "prioritization.methods.WSJF.summary",
    bullets: [
      "prioritization.methods.WSJF.bullet1",
      "prioritization.methods.WSJF.bullet2",
      "prioritization.methods.WSJF.bullet3",
    ],
    compatibility: ["user_story", "enabler"],
  },
};

function scoreValue(method: PrioritizationMethod, r: number, i: number, c: number, e: number) {
  if (method === "RICE") return e > 0 ? Math.round((r * i * c) / e) : 0;
  if (method === "ICE") return Math.round(r * i * c);
  if (method === "EISENHOWER") return Math.round((r * 2) + (i * 2) + c - e);
  if (method === "WSJF") return e > 0 ? Number(((r + i + c) / e).toFixed(1)) : 0;
  return 0;
}

function normalizePrioritizationItemType(rawType?: string | null): PrioritizationItemType | null {
  if (!rawType) return null;

  const normalized = rawType
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, PrioritizationItemType> = {
    initiative: "initiative",
    epic: "epic",
    feature: "feature",
    opportunity: "opportunity",
    hypothesis: "hypothesis",
    experiment: "experiment",
    quick_win: "quick_win",
    quickwin: "quick_win",
    user_story: "user_story",
    userstory: "user_story",
    enabler: "enabler",
    sprint_item: "sprint_item",
    sprintitem: "sprint_item",
    task: "task",
    urgent_issue: "urgent_issue",
    urgentissue: "urgent_issue",
    action: "action",
  };

  return aliases[normalized] ?? null;
}

function inferBacklogItemType(source: {
  item_type?: string;
  item_type_name?: string;
  ado_work_item_type?: string;
  enabler_type?: string;
  title?: string;
  item_type_id?: number;
}): PrioritizationItemType | null {
  if (source.item_type_id === 1) return "epic";
  if (source.item_type_id === 2) return "feature";

  const enablerType = (source.enabler_type || "").trim().toLowerCase();
  const itemTypeName = (source.item_type_name || "").trim().toLowerCase();
  const adoType = (source.ado_work_item_type || "").trim().toLowerCase();
  const itemType = (source.item_type || "").trim().toLowerCase();
  const title = (source.title || "").trim().toLowerCase();
  const rawType = enablerType || itemTypeName || adoType || itemType || title;

  if (!rawType) return null;
  if (enablerType.includes("enabler")) return "enabler";
  if (itemTypeName.includes("user story") || itemTypeName === "user_story") return "user_story";
  if (adoType.includes("user story") || adoType === "user_story") return "user_story";
  if (itemType.includes("user_story")) return "user_story";
  if (itemTypeName.includes("enabler")) return "enabler";
  if (adoType.includes("enabler")) return "enabler";
  if (enablerType.includes("business") && (itemTypeName.includes("user story") || adoType.includes("user story"))) return "user_story";
  if (
    enablerType.includes("architectural")
    || enablerType.includes("compliance")
    || enablerType.includes("infrastructure")
    || enablerType.includes("security")
    || enablerType.includes("foundation")
  ) return "enabler";
  if (rawType.includes("task")) return "task";
  if (rawType.includes("bug")) return "urgent_issue";
  if (rawType.includes("feature")) return "feature";
  if (rawType.includes("epic")) return "epic";
  if (rawType.includes("opportunity")) return "opportunity";
  return normalizePrioritizationItemType(rawType);
}

export default function PrioritizationPage() {
  const { t } = useTranslation();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<PrioritizationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<PrioritizationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PrioritizationTab>("QUARTER");
  const [activeMethod, setActiveMethod] = useState<PrioritizationMethod>("RICE");
  const [selectOptions, setSelectOptions] = useState<Record<PrioritizationItemType, SelectOption[]>>({
    initiative: [],
    epic: [],
    feature: [],
    opportunity: [],
    hypothesis: [],
    experiment: [],
    quick_win: [],
    user_story: [],
    enabler: [],
    sprint_item: [],
    task: [],
    urgent_issue: [],
    action: [],
  });
  const [, setSprintMap] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [quarterItems, setQuarterItems] = useState<QuarterPrioritizationItem[]>([]);
  const [quarterLoading, setQuarterLoading] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(new Date().getFullYear());
  const [selectedQuarterCandidateId, setSelectedQuarterCandidateId] = useState("");
  const [moscowDropdownOpen, setMoscowDropdownOpen] = useState(false);
  const [moscowActiveGroup, setMoscowActiveGroup] = useState<string | null>(null);
  const [wsjfTemplate, setWsjfTemplate] = useState<WsjfTemplate | null>(null);
  const [wsjfLoading, setWsjfLoading] = useState(false);
  const [wsjfSaving, setWsjfSaving] = useState(false);
  const [wsjfAssessment, setWsjfAssessment] = useState<WsjfAssessment | null>(null);
  const [wsjfSummaryJustification, setWsjfSummaryJustification] = useState("");
  const [wsjfAnswers, setWsjfAnswers] = useState<Record<number, { optionId?: number; score: number; justification: string }>>({});
  const SIZE = 20;

  const methodOptions = useMemo<MethodOption[]>(
    () => [
      { value: "RICE", label: "RICE" },
      { value: "ICE", label: "ICE" },
      { value: "MOSCOW", label: "MoSCoW" },
      { value: "EISENHOWER", label: "Eisenhower" },
      { value: "WSJF", label: "WSJF" },
    ],
    [],
  );

  const quarterRoadmapLabelById = useMemo(() => {
    const labelMap = new Map<string, string>();
    quarterItems.forEach((item) => {
      const normalizedRoadmapId = String(item.roadmap_item_id || "").trim();
      const normalizedTitle = String(item.roadmap_title || "").trim().toLowerCase();
      if (normalizedRoadmapId && item.roadmap_title) {
        labelMap.set(normalizedRoadmapId, item.roadmap_title);
      }
      if (normalizedTitle && item.roadmap_title) {
        labelMap.set(normalizedTitle, item.roadmap_title);
      }
    });
    return labelMap;
  }, [quarterItems]);

  const backlogCandidatesByMethod = useMemo<Record<PrioritizationMethod, SelectOption[]>>(
    () => ({
      RICE: [...(selectOptions.initiative ?? []), ...(selectOptions.epic ?? []), ...(selectOptions.feature ?? []), ...(selectOptions.opportunity ?? [])],
      ICE: [...(selectOptions.hypothesis ?? []), ...(selectOptions.experiment ?? []), ...(selectOptions.quick_win ?? [])],
      MOSCOW: [...(selectOptions.user_story ?? []), ...(selectOptions.enabler ?? []), ...(selectOptions.sprint_item ?? [])],
      EISENHOWER: [...(selectOptions.task ?? []), ...(selectOptions.urgent_issue ?? []), ...(selectOptions.action ?? [])],
      WSJF: [...(selectOptions.user_story ?? []), ...(selectOptions.enabler ?? [])],
    }),
    [selectOptions],
  );

  const quarterTypeOptions = useMemo(
    () => [
      ...(selectOptions.initiative ?? []),
      ...(selectOptions.epic ?? []),
      ...(selectOptions.feature ?? []),
      ...(selectOptions.opportunity ?? []),
    ],
    [selectOptions],
  );

  const quarterTypeLabelById = useMemo(() => {
    const labelMap = new Map<string, string>();

    quarterTypeOptions.forEach((option) => {
      const normalizedType = normalizePrioritizationItemType(option.sourceType);
      if (!normalizedType) return;

      const ids = new Set<string>();
      ids.add(String(option.value || "").trim());
      (option.matchTokens ?? []).forEach((token) => ids.add(String(token || "").trim()));

      ids.forEach((id) => {
        if (!id) return;
        labelMap.set(id, t(`prioritization.item_types.${normalizedType}`));
      });
    });

    return labelMap;
  }, [quarterTypeOptions, t]);

  const quarterTitleTypeLabelMap = useMemo(() => {
    const labelMap = new Map<string, string>();

    quarterTypeOptions.forEach((option) => {
      const normalizedType = normalizePrioritizationItemType(option.sourceType);
      if (!normalizedType || !option.label) return;

      labelMap.set(option.label.trim().toLowerCase(), t(`prioritization.item_types.${normalizedType}`));
    });

    return labelMap;
  }, [quarterTypeOptions, t]);

  const resolveQuarterItemTypeLabel = (
    roadmapItemId?: string | null,
    roadmapTitle?: string | null,
    roadmapItemType?: PrioritizationItemType | null,
    backlogItemType?: PrioritizationItemType | null,
  ) => {
    const normalizedBacklogType = normalizePrioritizationItemType(backlogItemType);
    if (normalizedBacklogType === "epic" || normalizedBacklogType === "feature") {
      return t(`prioritization.item_types.${normalizedBacklogType}`);
    }

    const normalizedRoadmapType = normalizePrioritizationItemType(roadmapItemType);
    if (normalizedRoadmapType === "opportunity") {
      return t("prioritization.item_types.opportunity");
    }
    if (normalizedRoadmapType === "initiative") {
      return t("prioritization.item_types.initiative");
    }

    const normalizedCandidateRoadmapId = String(roadmapItemId || "").trim();
    if (normalizedCandidateRoadmapId) {
      const fromId = quarterTypeLabelById.get(normalizedCandidateRoadmapId);
      if (fromId) return fromId;
    }

    const normalizedTitle = String(roadmapTitle || "").trim().toLowerCase();
    if (normalizedTitle) {
      const fromTitle = quarterTitleTypeLabelMap.get(normalizedTitle);
      if (fromTitle) return fromTitle;
    }

    return t("prioritization.item_types.initiative");
  };

  const quarterCandidates = useMemo<QuarterCandidate[]>(() => {
    const plannedIds = new Set(
      quarterItems
        .filter((item) => item.fiscal_year === selectedFiscalYear && item.quarter === selectedQuarter)
        .map((item) => String(item.roadmap_item_id).trim()),
    );

    const seen = new Set<string>();

    const mappedOptions: Array<QuarterCandidate | null> = quarterTypeOptions.map((option) => {
      const normalizedType = normalizePrioritizationItemType(option.sourceType);

      if (normalizedType === "epic" || normalizedType === "feature") {
        const backlogKey = option.backlogItemId
          ? `backlog:${option.backlogItemId}`
          : `backlog-title:${option.label.trim().toLowerCase()}`;

        return {
          roadmap_item_id: backlogKey,
          title: option.label,
          description: option.description,
          sourceType: normalizedType,
        };
      }

      const roadmapId = String(option.matchTokens?.[0] || option.value || "").trim();
      if (!roadmapId) return null;

      return {
        roadmap_item_id: roadmapId,
        title: quarterRoadmapLabelById.get(roadmapId) || option.label,
        description: option.description,
        sourceType: normalizedType ?? undefined,
      };
    });

    return mappedOptions.filter((option): option is QuarterCandidate => {
      if (!option) return false;
      if (!option.roadmap_item_id) return false;
      if (plannedIds.has(option.roadmap_item_id)) return false;
      if (seen.has(option.roadmap_item_id)) return false;
      seen.add(option.roadmap_item_id);
      return true;
    });
  }, [quarterItems, quarterRoadmapLabelById, quarterTypeOptions, selectedFiscalYear, selectedQuarter]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === productInfo?.company_id) ?? null,
    [companies, productInfo],
  );

  const fiscalStartMonth = useMemo(() => {
    if (selectedCompany?.fiscal_year_start_month && selectedCompany.fiscal_year_start_month >= 1 && selectedCompany.fiscal_year_start_month <= 12) {
      return selectedCompany.fiscal_year_start_month;
    }
    return 1;
  }, [selectedCompany]);
  const quarterMonthRanges = useMemo(() => {
    const monthNames = [
      t("prioritization.month_jan"),
      t("prioritization.month_feb"),
      t("prioritization.month_mar"),
      t("prioritization.month_apr"),
      t("prioritization.month_may"),
      t("prioritization.month_jun"),
      t("prioritization.month_jul"),
      t("prioritization.month_aug"),
      t("prioritization.month_sep"),
      t("prioritization.month_oct"),
      t("prioritization.month_nov"),
      t("prioritization.month_dec"),
    ];

    return ["Q1", "Q2", "Q3", "Q4"].map((quarter, index) => {
      const start = (fiscalStartMonth - 1 + (index * 3)) % 12;
      const months = [
        monthNames[start],
        monthNames[(start + 1) % 12],
        monthNames[(start + 2) % 12],
      ];
      return { quarter, label: `${quarter} · ${months.join(" / ")}` };
    });
  }, [fiscalStartMonth, t]);

  const selectedQuarterItems = useMemo(
    () => quarterItems.filter((item) => item.fiscal_year === selectedFiscalYear && item.quarter === selectedQuarter),
    [quarterItems, selectedFiscalYear, selectedQuarter],
  );

  const selectedQuarterCandidate = useMemo(
    () => quarterCandidates.find((candidate) => candidate.roadmap_item_id === selectedQuarterCandidateId) ?? null,
    [quarterCandidates, selectedQuarterCandidateId],
  );

  const activeFiscalQuarter = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const fiscalOffset = (currentMonth - fiscalStartMonth + 12) % 12;
    const quarterIndex = Math.floor(fiscalOffset / 3);
    return ["Q1", "Q2", "Q3", "Q4"][quarterIndex] ?? "Q1";
  }, [fiscalStartMonth]);

  const quarterYearView = useMemo(() => {
    const byQuarter = new Map<string, QuarterPrioritizationItem[]>(
      ["Q1", "Q2", "Q3", "Q4"].map((quarter) => [quarter, []]),
    );

    quarterItems
      .filter((item) => item.fiscal_year === selectedFiscalYear)
      .forEach((item) => {
        const bucket = byQuarter.get(item.quarter) ?? [];
        bucket.push(item);
        byQuarter.set(item.quarter, bucket);
      });

    return quarterMonthRanges.map((range) => ({
      ...range,
      isSelected: range.quarter === selectedQuarter,
      isActive: range.quarter === activeFiscalQuarter,
      items: (byQuarter.get(range.quarter) ?? []).sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999)),
    }));
  }, [activeFiscalQuarter, quarterItems, quarterMonthRanges, selectedFiscalYear, selectedQuarter]);

  const selectedMethod = modal ? form.priority_method : activeMethod;
  const methodConfig = METHOD_CONFIG[selectedMethod];
  const compatibleTypeOptions = ITEM_TYPE_OPTIONS.filter((option) =>
    methodConfig.compatibility.includes(option.value),
  );

  const filteredItems = items.filter(
    (item) =>
      item.priority_method === activeMethod &&
      !!normalizePrioritizationItemType(item.item_type) &&
      METHOD_CONFIG[activeMethod].compatibility.includes(normalizePrioritizationItemType(item.item_type)!),
  );

  const activeMethodCandidateOptions = backlogCandidatesByMethod[activeMethod] ?? [];
  const activeMethodItemMap = new Map(filteredItems.map((item) => [item.title, item]));
  const activeMethodRows = activeMethodCandidateOptions.map((option) => {
    const persisted = activeMethodItemMap.get(option.value);
    const derivedType = option.sourceType ?? normalizePrioritizationItemType(option.matchTokens?.[0]) ?? undefined;
    return (
      persisted ?? {
        id: `candidate-${activeMethod}-${option.backlogItemId ?? option.value}`,
        product_id: productId,
        title: option.value,
        description: option.description,
        item_type: derivedType,
        priority_method: activeMethod,
        reach: activeMethod === "WSJF" ? option.wsjf?.businessValue ?? 0 : 0,
        impact: activeMethod === "WSJF" ? option.wsjf?.timeCriticality ?? 0 : 0,
        confidence: activeMethod === "WSJF" ? option.wsjf?.riskReduction ?? 0 : 0,
        effort: activeMethod === "WSJF" ? option.wsjf?.jobSize ?? 0 : 1,
        rice_score: activeMethod === "WSJF" ? option.wsjf?.score ?? 0 : 0,
        moscow_value: undefined,
        created_at: "",
      }
    );
  });
  const activeMethodTotal = activeMethodRows.length;
  const paginatedRows = activeMethodRows.slice((page - 1) * SIZE, page * SIZE);
  const showMethodTable = activeTab !== "QUARTER";
  const showMoscowColumn = activeMethod === "MOSCOW";

  const showMoscowField = selectedMethod === "MOSCOW";
  const isWsjfType = selectedMethod === "WSJF" && (form.item_type === "user_story" || form.item_type === "enabler");
  const showRiceFields = selectedMethod === "RICE";
  const showIceFields = selectedMethod === "ICE";
  const showEisenhowerFields = selectedMethod === "EISENHOWER";
  const computedScore = scoreValue(
    selectedMethod,
    Number(form.reach),
    Number(form.impact),
    Number(form.confidence),
    Number(form.effort),
  );

  const titleOptions = useMemo(() => {
    let rawOptions = (selectOptions[form.item_type] ?? []).filter(
      (option) => !option.sourceType || option.sourceType === form.item_type,
    );

    if (form.item_type === "enabler") {
      const fallbackFromAll = [
        ...(selectOptions.enabler ?? []),
        ...(selectOptions.sprint_item ?? []),
        ...(selectOptions.task ?? []),
      ].filter((option, index, arr) => {
        const tokens = option.matchTokens ?? [];
        const firstIndex = arr.findIndex((candidate) => candidate.value === option.value);
        return tokens.length > 0 && firstIndex === index;
      });

      if (fallbackFromAll.length > 0) {
        rawOptions = fallbackFromAll;
      }
    }

    const placeholder: SelectOption = {
      value: "",
      label: t("prioritization.placeholder_title"),
      groupLabel: "",
    };
    return [placeholder, ...rawOptions];
  }, [form.item_type, selectOptions, t]);

  const groupedTitleOptions = useMemo(() => {
    if (selectedMethod !== "MOSCOW" && selectedMethod !== "WSJF") return [];

    const groups = new Map<string, SelectOption[]>();
    titleOptions
      .filter((option) => option.value)
      .forEach((option) => {
        const label = option.groupLabel || t("prioritization.group_no_sprint");
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)?.push(option);
      });

    return Array.from(groups.entries()).map(([label, options]) => ({ label, options }));
  }, [selectedMethod, titleOptions, t]);

  const selectedTitleOption = useMemo(() => {
    return titleOptions.find((entry) => entry.value === form.title) ?? null;
  }, [form.title, titleOptions]);

  const selectedTitleLabel = useMemo(() => {
    return selectedTitleOption?.label || t("prioritization.placeholder_title");
  }, [selectedTitleOption, t]);

  const calcScoreFromWsjf = (businessValue: number, timeCriticality: number, riskReduction: number, jobSize: number) =>
    jobSize > 0 ? Number(((businessValue + timeCriticality + riskReduction) / jobSize).toFixed(1)) : 0;

  const wsjfDimensions = useMemo(() => {
    if (!wsjfTemplate) return [];
    return [...wsjfTemplate.dimensions].sort((a, b) => a.display_order - b.display_order);
  }, [wsjfTemplate]);

  const questionnaireScores = useMemo(() => {
    const scoreByDimension = {
      business_value: selectedTitleOption?.wsjf?.businessValue ?? 0,
      time_criticality: selectedTitleOption?.wsjf?.timeCriticality ?? 0,
      risk_reduction: selectedTitleOption?.wsjf?.riskReduction ?? 0,
      job_size: selectedTitleOption?.wsjf?.jobSize ?? 0,
    };

    wsjfDimensions.forEach((dimension) => {
      [...dimension.questions].sort((a, b) => a.display_order - b.display_order).forEach((question) => {
        const answer = wsjfAnswers[question.question_id];
        if (answer?.score) {
          scoreByDimension[dimension.code] = Math.max(scoreByDimension[dimension.code], answer.score);
        }
      });
    });

    return scoreByDimension;
  }, [selectedTitleOption, wsjfAnswers, wsjfDimensions]);

  const questionnaireScoreValue = useMemo(
    () =>
      calcScoreFromWsjf(
        questionnaireScores.business_value,
        questionnaireScores.time_criticality,
        questionnaireScores.risk_reduction,
        questionnaireScores.job_size,
      ),
    [questionnaireScores],
  );

  const methodSummary = useMemo<MethodSummary>(() => {
    if (activeTab === "QUARTER") {
      return {
        title: t("prioritization.quarter_title"),
        summary: t("prioritization.quarter_footer_summary"),
        bullets: [
          t("prioritization.quarter_footer_bullet1"),
          t("prioritization.quarter_footer_bullet2"),
          t("prioritization.quarter_footer_bullet3"),
        ],
        compatibility: [
          { value: "initiative", label: t("prioritization.item_types.initiative") },
          { value: "epic", label: t("prioritization.item_types.epic") },
          { value: "feature", label: t("prioritization.item_types.feature") },
        ],
      };
    }

    const config = METHOD_CONFIG[selectedMethod];
    return {
      title: t(config.titleKey),
      summary: t(config.summaryKey),
      bullets: config.bullets.map((bullet) => t(bullet)),
      compatibility: config.compatibility.map((typeValue) => {
        const option = ITEM_TYPE_OPTIONS.find((item) => item.value === typeValue);
        return {
          value: typeValue,
          label: option ? t(option.labelKey) : typeValue,
        };
      }),
    };
  }, [activeTab, selectedMethod, t]);

  const loadQuarterItems = async (pid = productId, fiscalYear = selectedFiscalYear, quarter = selectedQuarter) => {
    if (!pid) {
      setQuarterItems([]);
      return;
    }
    setQuarterLoading(true);
    try {
      const normalizedPid = String(pid).trim();
      const yearQuery = `?product_id=${encodeURIComponent(normalizedPid)}&fiscal_year=${fiscalYear}&page=1&size=200`;
      const yearResponse = await apiGet<Paginated<QuarterPrioritizationItem>>(`/prioritization/quarter/items${yearQuery}`);

      const normalizedYearItems = (yearResponse.items ?? []).filter((item) => String(item.product_id).trim() === normalizedPid);
      const matchingQuarterItems = normalizedYearItems.filter((item) => String(item.quarter).trim().toUpperCase() === String(quarter).trim().toUpperCase());

      if (matchingQuarterItems.length > 0 || normalizedYearItems.length > 0) {
        setQuarterItems(normalizedYearItems);
        return;
      }

      const fallbackQuery = `?product_id=${encodeURIComponent(normalizedPid)}&fiscal_year=${fiscalYear}&quarter=${encodeURIComponent(quarter)}&page=1&size=200`;
      const fallbackResponse = await apiGet<Paginated<QuarterPrioritizationItem>>(`/prioritization/quarter/items${fallbackQuery}`);
      const normalizedFallbackItems = (fallbackResponse.items ?? []).filter((item) => String(item.product_id).trim() === normalizedPid);
      setQuarterItems(normalizedFallbackItems);
    } catch (e) {
      console.error("Failed to load quarter items", e);
      setQuarterItems([]);
    } finally {
      setQuarterLoading(false);
    }
  };

  const persistQuarterRanks = async (itemsToRank: QuarterPrioritizationItem[]) => {
    const normalizedItems = [...itemsToRank]
      .sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999))
      .map((item, index) => ({
        ...item,
        priority_rank: index + 1,
      }));

    await Promise.all(
      normalizedItems.map((item) =>
        apiPatch(`/prioritization/quarter/items/${item.id}`, {
          company_id: item.company_id,
          product_id: item.product_id,
          roadmap_item_id: item.roadmap_item_id,
          fiscal_year: item.fiscal_year,
          quarter: item.quarter,
          priority_rank: item.priority_rank,
          planning_status: item.planning_status,
          business_value: item.business_value,
          strategic_alignment: item.strategic_alignment,
          urgency: item.urgency,
          dependency_readiness: item.dependency_readiness,
          delivery_risk: item.delivery_risk,
          confidence: item.confidence,
          estimated_effort: item.estimated_effort,
          planned_capacity_share: item.planned_capacity_share ?? null,
          quarter_score: item.quarter_score,
          decision_rationale: item.decision_rationale ?? null,
          notes: item.notes ?? null,
        }),
      ),
    );
  };

  const saveQuarterCandidate = async (candidate: QuarterCandidate, rank: number) => {
    if (!productId || !productInfo?.company_id || !candidate.roadmap_item_id) return;

    setQuarterLoading(true);
    setError("");

    try {
      const existing = quarterItems.find(
        (item) =>
          item.roadmap_item_id === candidate.roadmap_item_id
          && item.fiscal_year === selectedFiscalYear
          && item.quarter === selectedQuarter,
      );

      const payload = {
        company_id: productInfo.company_id,
        product_id: productId,
        roadmap_item_id: candidate.roadmap_item_id,
        fiscal_year: selectedFiscalYear,
        quarter: selectedQuarter,
        priority_rank: rank,
        planning_status: existing?.planning_status ?? "candidate",
        business_value: existing?.business_value ?? 0,
        strategic_alignment: existing?.strategic_alignment ?? 0,
        urgency: existing?.urgency ?? 0,
        dependency_readiness: existing?.dependency_readiness ?? 0,
        delivery_risk: existing?.delivery_risk ?? 0,
        confidence: existing?.confidence ?? 0,
        estimated_effort: existing?.estimated_effort ?? 0,
        planned_capacity_share: existing?.planned_capacity_share ?? null,
        quarter_score: existing?.quarter_score ?? 0,
        decision_rationale: existing?.decision_rationale ?? candidate.description ?? null,
        notes: existing?.notes ?? null,
      };

      if (existing) {
        await apiPatch(`/prioritization/quarter/items/${existing.id}`, payload);
      } else {
        await apiPost("/prioritization/quarter/items", payload);
      }

      await loadQuarterItems(productId, selectedFiscalYear, selectedQuarter);
      setSelectedQuarterCandidateId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("prioritization.err_generic"));
    } finally {
      setQuarterLoading(false);
    }
  };

  const moveQuarterItem = async (quarterCode: string, itemId: string, direction: "up" | "down") => {
    const quarterScopedItems = quarterItems
      .filter((item) => item.fiscal_year === selectedFiscalYear && item.quarter === quarterCode)
      .sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999));

    const currentIndex = quarterScopedItems.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= quarterScopedItems.length) return;

    const reorderedItems = [...quarterScopedItems];
    const [movedItem] = reorderedItems.splice(currentIndex, 1);
    reorderedItems.splice(targetIndex, 0, movedItem);

    setQuarterLoading(true);
    setError("");
    try {
      await persistQuarterRanks(reorderedItems);
      await loadQuarterItems(productId, selectedFiscalYear, selectedQuarter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("prioritization.err_generic"));
    } finally {
      setQuarterLoading(false);
    }
  };

  const removeQuarterItem = async (id: string) => {
    const itemToRemove = quarterItems.find((item) => item.id === id);
    if (!itemToRemove) return;

    setQuarterLoading(true);
    setError("");
    try {
      await apiDelete(`/prioritization/quarter/items/${id}`);
      const remainingItems = quarterItems
        .filter((item) => item.id !== id && item.fiscal_year === itemToRemove.fiscal_year && item.quarter === itemToRemove.quarter)
        .sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999));

      if (remainingItems.length > 0) {
        await persistQuarterRanks(remainingItems);
      }

      await loadQuarterItems(productId, selectedFiscalYear, selectedQuarter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("prioritization.err_generic"));
    } finally {
      setQuarterLoading(false);
    }
  };

  const load = async (p = page, pid = productId) => {
    setLoading(true);
    setError("");
    try {
      const qs = `${pid ? `?product_id=${pid}&page=${p}&size=${SIZE}` : `?page=${p}&size=${SIZE}`}`;
      const r = await apiGet<Paginated<PrioritizationItem>>(`/prioritization/${activeMethod}${qs}`);
      setItems(r.items);
      setTotal(r.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiGet<WsjfTemplate>("/wsjf/templates/default").then(setWsjfTemplate).catch(() => setWsjfTemplate(null));
  }, []);

  useEffect(() => {
    if (activeTab === "QUARTER") {
      loadQuarterItems(productId, selectedFiscalYear, selectedQuarter);
      return;
    }
    load(1, productId);
    setPage(1);
  }, [productId, activeMethod, activeTab, selectedFiscalYear, selectedQuarter]);

  useEffect(() => {
    if (!productId) {
      setProductInfo(null);
      setCompanies([]);
      return;
    }
    apiGet<ProductInfo>(`/products/${productId}`)
      .then((product) => {
        setProductInfo(product);
        if (product.company_id) {
          return apiGet<CompanyInfo>(`/companies/${product.company_id}`)
            .then((company) => setCompanies([company]))
            .catch(() => setCompanies([]));
        }
        setCompanies([]);
        return null;
      })
      .catch(() => {
        setProductInfo(null);
        setCompanies([]);
      });
  }, [productId]);

  useEffect(() => {
    const loadOptions = async () => {
      if (!productId) {
        setSelectOptions({
          initiative: [],
          epic: [],
          feature: [],
          opportunity: [],
          hypothesis: [],
          experiment: [],
          quick_win: [],
          user_story: [],
          enabler: [],
          sprint_item: [],
          task: [],
          urgent_issue: [],
          action: [],
        });
        return;
      }

      try {
        const [roadmapRes, backlogRes, discoveryRes, sprintsRes] = await Promise.all([
          apiGet<Paginated<{ id: number; title: string; description?: string }>>(
            `/roadmap?page=1&size=200&product_id=${productId}`,
          ).catch(() => ({ items: [], total: 0, page: 1, size: 200 })),
          apiGet<Paginated<{
            item_id: number;
            title: string;
            description?: string;
            ado_id?: string;
            sprint_id?: number;
            start_sprint_id?: number;
            end_sprint_id?: number;
            item_type_id?: number;
            item_type?: string;
            item_type_name?: string;
            ado_work_item_type?: string;
            enabler_type?: string;
            wsjf_business_value?: number;
            wsjf_time_criticality?: number;
            wsjf_risk_reduction?: number;
            wsjf_job_size?: number;
            wsjf_score?: number;
          }>>(`/backlog?product_id=${productId}&size=500&page=1`).catch(() => ({
            items: [],
            total: 0,
            page: 1,
            size: 500,
          })),
          apiGet<{ items: { id: string; title: string; description?: string }[] } | { id: string; title: string; description?: string }[]>(
            `/opportunities/opportunities?product_id=${productId}`,
          ).catch(() => ({ items: [] })),
          apiGet<{ sprint_id: number; name: string }[]>(`/backlog/sprints?product_id=${productId}`).catch(() => []),
        ]);

        const discoveryItems = Array.isArray(discoveryRes) ? discoveryRes : (discoveryRes.items ?? []);
        const nextSprintMap = Object.fromEntries(
          (sprintsRes ?? []).map((sprint) => [String(sprint.sprint_id), sprint.name]),
        );
        setSprintMap(nextSprintMap);

        const roadmapOptions: SelectOption[] = (roadmapRes.items ?? []).map((item) => {
          const roadmapId = String(item.id);
          return {
            value: roadmapId,
            label: item.title,
            description: item.description,
            sourceType: "initiative",
            matchTokens: [roadmapId],
          };
        });

        const formatBacklogLabel = (item: {
          title: string;
          ado_id?: string;
          wsjf_score?: number;
        }) =>
          item.ado_id ? `${item.title} [ADO ${item.ado_id}]${item.wsjf_score ? ` · WSJF ${item.wsjf_score}` : ""}` : item.title;

        const resolveSprintGroupLabel = (item: {
          sprint_id?: number;
          start_sprint_id?: number;
          end_sprint_id?: number;
        }) => {
          const sprintKey = String(item.sprint_id ?? item.start_sprint_id ?? item.end_sprint_id ?? "");
          return sprintKey ? (nextSprintMap[sprintKey] ?? `${t("prioritization.group_sprint")} ${sprintKey}`) : t("prioritization.group_no_sprint");
        };

        const backlogItems = backlogRes.items ?? [];

        const quarterBacklogTypes = new Set<PrioritizationItemType>(["epic", "feature"]);
        const quarterBacklogOptions: SelectOption[] = backlogItems
          .filter((item) => {
            const inferredType = inferBacklogItemType(item);
            return !!inferredType && quarterBacklogTypes.has(inferredType);
          })
          .map((item) => {
            const inferredType = inferBacklogItemType(item) ?? "feature";
            return {
              value: item.title,
              label: item.title,
              description: item.description,
              sourceType: inferredType,
              backlogItemId: item.item_id,
              matchTokens: [
                item.item_id ? `backlog:${item.item_id}` : "",
                `backlog-title:${item.title.trim().toLowerCase()}`,
                String(item.item_type_id ?? ""),
                (item.item_type || "").toUpperCase(),
                (item.item_type_name || "").toUpperCase(),
                (item.ado_work_item_type || "").toUpperCase(),
                (item.enabler_type || "").toUpperCase(),
              ].filter(Boolean),
            };
          });

        const roadmapTitleSet = new Set(
          roadmapOptions.map((item) => item.label.trim().toLowerCase()).filter(Boolean),
        );

        const discoveryOptions: SelectOption[] = discoveryItems
          .filter((item) => !roadmapTitleSet.has(item.title.trim().toLowerCase()))
          .map((item) => ({
            value: `opportunity:${item.id}`,
            label: item.title,
            description: item.description,
            sourceType: "opportunity",
            matchTokens: [`opportunity:${item.id}`],
          }));

        const hypothesisOptions: SelectOption[] = [];
        const experimentOptions: SelectOption[] = [];

        const toWsjfSnapshot = (item: {
          wsjf_business_value?: number;
          wsjf_time_criticality?: number;
          wsjf_risk_reduction?: number;
          wsjf_job_size?: number;
          wsjf_score?: number;
        }) => ({
          businessValue: item.wsjf_business_value ?? 0,
          timeCriticality: item.wsjf_time_criticality ?? 0,
          riskReduction: item.wsjf_risk_reduction ?? 0,
          jobSize: item.wsjf_job_size ?? 0,
          score: item.wsjf_score ?? 0,
        });

        const userStories = backlogItems.filter((item) => inferBacklogItemType(item) === "user_story");
        const enablers = backlogItems.filter((item) => inferBacklogItemType(item) === "enabler");
        const sprintItems = backlogItems.filter((item) => inferBacklogItemType(item) === "sprint_item");
        const genericTasks = backlogItems.filter((item) => {
          const inferredType = inferBacklogItemType(item);
          return inferredType === "task" || inferredType === "urgent_issue";
        });

        setSelectOptions({
          initiative: roadmapOptions,
          epic: quarterBacklogOptions.filter((item) => item.sourceType === "epic"),
          feature: quarterBacklogOptions.filter((item) => item.sourceType === "feature"),
          opportunity: discoveryOptions,
          hypothesis: hypothesisOptions,
          experiment: experimentOptions,
          quick_win: [],
          user_story: userStories.map((item) => ({
            value: item.title,
            label: formatBacklogLabel(item),
            description: item.description,
            sourceType: "user_story",
            backlogItemId: item.item_id,
            adoId: item.ado_id,
            wsjf: toWsjfSnapshot(item),
            groupLabel: resolveSprintGroupLabel(item),
            matchTokens: [
              (item.item_type || "").toUpperCase(),
              (item.item_type_name || "").toUpperCase(),
              (item.ado_work_item_type || "").toUpperCase(),
              (item.enabler_type || "").toUpperCase(),
            ].filter(Boolean),
          })),
          enabler: enablers.map((item) => ({
            value: item.title,
            label: formatBacklogLabel(item),
            description: item.description,
            sourceType: "enabler",
            backlogItemId: item.item_id,
            adoId: item.ado_id,
            wsjf: toWsjfSnapshot(item),
            groupLabel: resolveSprintGroupLabel(item),
            matchTokens: [
              (item.item_type || "").toUpperCase(),
              (item.item_type_name || "").toUpperCase(),
              (item.ado_work_item_type || "").toUpperCase(),
              (item.enabler_type || "").toUpperCase(),
            ].filter(Boolean),
          })),
          sprint_item: sprintItems.map((item) => ({
            value: item.title,
            label: item.title,
            description: item.description,
            sourceType: "sprint_item",
            groupLabel: resolveSprintGroupLabel(item),
            matchTokens: [
              (item.item_type || "").toUpperCase(),
              (item.item_type_name || "").toUpperCase(),
              (item.ado_work_item_type || "").toUpperCase(),
              (item.enabler_type || "").toUpperCase(),
            ].filter(Boolean),
          })),
          task: genericTasks.map((item) => ({
            value: item.title,
            label: item.title,
            description: item.description,
            sourceType: "task",
            matchTokens: [
              (item.item_type || "").toUpperCase(),
              (item.item_type_name || "").toUpperCase(),
              (item.ado_work_item_type || "").toUpperCase(),
              (item.enabler_type || "").toUpperCase(),
            ].filter(Boolean),
          })),
          urgent_issue: genericTasks.map((item) => ({
            value: item.title,
            label: item.title,
            description: item.description,
            sourceType: "urgent_issue",
            matchTokens: [
              (item.item_type || "").toUpperCase(),
              (item.item_type_name || "").toUpperCase(),
              (item.ado_work_item_type || "").toUpperCase(),
              (item.enabler_type || "").toUpperCase(),
            ].filter(Boolean),
          })),
          action: discoveryOptions.map((item) => ({ ...item, sourceType: "action", matchTokens: [] })),
        });
      } catch {
        setSelectOptions({
          initiative: [],
          epic: [],
          feature: [],
          opportunity: [],
          hypothesis: [],
          experiment: [],
          quick_win: [],
          user_story: [],
          enabler: [],
          sprint_item: [],
          task: [],
          urgent_issue: [],
          action: [],
        });
      }
    };

    loadOptions();
  }, [productId, t]);

  useEffect(() => {
    if (activeTab !== "QUARTER") {
      load();
    }
  }, [page, activeTab]);

  useEffect(() => {
    if (!selectedQuarterCandidateId) return;
    const stillExists = quarterCandidates.some((candidate) => candidate.roadmap_item_id === selectedQuarterCandidateId);
    if (!stillExists) {
      setSelectedQuarterCandidateId("");
    }
  }, [quarterCandidates, selectedQuarterCandidateId]);

  const ensureCompatibleType = (method: PrioritizationMethod, currentType?: PrioritizationItemType) => {
    const allowed = METHOD_CONFIG[method].compatibility;
    if (currentType && allowed.includes(currentType)) return currentType;
    return allowed[0];
  };

  const handleProductChange = (id: string) => {
    localStorage.setItem("pl_product", id);
    setProductId(id);
  };

  const loadWsjfAssessment = (backlogItemId?: number) => {
    if (!backlogItemId) {
      setWsjfAssessment(null);
      setWsjfSummaryJustification("");
      setWsjfAnswers({});
      return;
    }

    setWsjfLoading(true);
    apiGet<WsjfAssessment | null>(`/wsjf/backlog/${backlogItemId}`)
      .then((result) => {
        setWsjfAssessment(result ?? null);
        if (result) {
          setWsjfSummaryJustification(result.summary_justification ?? "");
          const mappedAnswers: Record<number, { optionId?: number; score: number; justification: string }> = {};
          result.answers.forEach((answer) => {
            mappedAnswers[answer.question_id] = {
              optionId: answer.selected_option_id ?? undefined,
              score: answer.derived_score ?? 0,
              justification: answer.justification_snapshot ?? "",
            };
          });
          setWsjfAnswers(mappedAnswers);
        } else {
          setWsjfSummaryJustification("");
          setWsjfAnswers({});
        }
      })
      .catch(() => {
        setWsjfAssessment(null);
        setWsjfSummaryJustification("");
        setWsjfAnswers({});
      })
      .finally(() => setWsjfLoading(false));
  };

  const openCreate = () => {
    setForm({
      ...EMPTY,
      priority_method: activeMethod,
      item_type: ensureCompatibleType(activeMethod, EMPTY.item_type),
    });
    setEditing(null);
    setMoscowDropdownOpen(false);
    setMoscowActiveGroup(null);
    setWsjfAssessment(null);
    setWsjfSummaryJustification("");
    setWsjfAnswers({});
    setModal("create");
  };

  const openEdit = (item: PrioritizationItem) => {
    const normalizedMethod = item.priority_method;
    const nextType = ensureCompatibleType(normalizedMethod, item.item_type);
    setForm({
      title: item.title,
      description: item.description ?? "",
      item_type: nextType,
      priority_method: normalizedMethod,
      reach: item.reach ?? 0,
      impact: item.impact ?? 0,
      confidence: item.confidence ?? 0,
      effort: item.effort ?? 1,
      rice_score: item.rice_score ?? 0,
      moscow_value: item.moscow_value ?? "",
    });
    setEditing(item);
    setMoscowDropdownOpen(false);
    setMoscowActiveGroup(null);
    const option = (selectOptions[nextType] ?? []).find((entry) => entry.value === item.title);
    loadWsjfAssessment(option?.backlogItemId);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setMoscowDropdownOpen(false);
    setMoscowActiveGroup(null);
    setWsjfAssessment(null);
    setWsjfSummaryJustification("");
    setWsjfAnswers({});
  };

  const updateNum = (field: "reach" | "impact" | "confidence" | "effort", val: string) => {
    const n = parseFloat(val) || 0;
    setForm((f) => {
      const updated = { ...f, [field]: n };
      updated.rice_score = scoreValue(
        updated.priority_method,
        field === "reach" ? n : updated.reach,
        field === "impact" ? n : updated.impact,
        field === "confidence" ? n : updated.confidence,
        field === "effort" ? n : updated.effort,
      );
      return updated;
    });
  };

  const updateMethod = (method: PrioritizationMethod) => {
    setForm((f) => {
      const nextType = ensureCompatibleType(method, f.item_type);
      const next = {
        ...f,
        priority_method: method,
        item_type: nextType,
        title: "",
        moscow_value: method === "MOSCOW" ? f.moscow_value : "",
      };
      next.rice_score = scoreValue(
        next.priority_method,
        next.reach,
        next.impact,
        next.confidence,
        next.effort,
      );
      return next;
    });
  };

  const handleSaveWsjfAssessment = async () => {
    if (!selectedTitleOption?.backlogItemId || !wsjfTemplate) return;

    const answersPayload = wsjfDimensions
      .flatMap((dimension) =>
        [...dimension.questions].sort((a, b) => a.display_order - b.display_order).map((question) => {
          const answer = wsjfAnswers[question.question_id];
          if (!answer?.optionId || !answer.score) return null;
          return {
            question_id: question.question_id,
            selected_option_id: answer.optionId,
            answer_text: null,
            derived_dimension_code: dimension.code,
            derived_score: answer.score,
            justification_snapshot: answer.justification,
          };
        }),
      )
      .filter(Boolean);

    if (!answersPayload.length) {
      setError(t("prioritization.wsjf_questionnaire_required"));
      return;
    }

    setWsjfSaving(true);
    setError("");
    try {
      const assessment = await apiPost<WsjfAssessment>(`/wsjf/backlog/${selectedTitleOption.backlogItemId}`, {
        template_id: wsjfTemplate.template_id,
        status: "final",
        created_by: "Product Lab",
        summary_justification: wsjfSummaryJustification || null,
        rationale_markdown: wsjfSummaryJustification || null,
        answers: answersPayload,
      });
      setWsjfAssessment(assessment);
      await loadWsjfAssessment(selectedTitleOption.backlogItemId);
      await load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("prioritization.err_generic"));
    } finally {
      setWsjfSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!productId && modal === "create") {
      setError("Selecione um produto");
      return;
    }
    setSaving(true);
    try {
      const normalizedScore = scoreValue(
        form.priority_method,
        Number(form.reach),
        Number(form.impact),
        Number(form.confidence),
        Number(form.effort),
      );
      const body = {
        ...form,
        item_type: ensureCompatibleType(form.priority_method, form.item_type),
        reach: Number(form.reach),
        impact: Number(form.impact),
        confidence: Number(form.confidence),
        effort: Number(form.effort),
        rice_score: normalizedScore,
        ice_score: form.priority_method === "ICE" ? Math.round(Number(form.impact) * Number(form.confidence) * Number(form.effort || 1)) : undefined,
        ease: form.priority_method === "ICE" ? Number(form.effort) : undefined,
        urgency: form.priority_method === "EISENHOWER" ? Number(form.reach) : undefined,
        importance: form.priority_method === "EISENHOWER" ? Number(form.impact) : undefined,
        eisenhower_score: form.priority_method === "EISENHOWER" ? normalizedScore : undefined,
        business_value: form.priority_method === "WSJF" ? Number(form.reach) : undefined,
        time_criticality: form.priority_method === "WSJF" ? Number(form.impact) : undefined,
        risk_reduction: form.priority_method === "WSJF" ? Number(form.confidence) : undefined,
        job_size: form.priority_method === "WSJF" ? Number(form.effort) : undefined,
        wsjf_score: form.priority_method === "WSJF" ? normalizedScore : undefined,
        moscow_value: form.priority_method === "MOSCOW" ? form.moscow_value || null : null,
      };
      if (modal === "create") await apiPost(`/prioritization/${form.priority_method}`, { ...body, product_id: productId });
      else if (editing) await apiPatch(`/prioritization/${editing.priority_method}/${editing.id}`, body);
      closeModal();
      load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("prioritization.err_generic"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("prioritization.confirm_delete"))) return;
    try {
      const item = items.find((entry) => entry.id === id);
      const method = item?.priority_method ?? activeMethod;
      await apiDelete(`/prioritization/${method}/${id}`);
      load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("prioritization.err_generic"));
    }
  };

  const getRiskClass = (score: number) =>
    score >= 100 ? "risk-score--high" : score >= 30 ? "risk-score--medium" : "risk-score--low";

  return (
    <ModuleLayout
      moduleIcon="◇"
      moduleName={t("prioritization.module_name")}
      moduleAccent={t("prioritization.module_accent")}
      selectedProductId={productId}
      onProductChange={handleProductChange}
    >
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("prioritization.eyebrow")}</span>
          <h1 className="mod-header__title">
            {t("prioritization.title")} <span>{t("prioritization.title_accent")}</span>
          </h1>
          <p className="mod-header__meta">{t("prioritization.meta", { count: total })}</p>
        </div>
        {activeTab !== "QUARTER" ? (
          <button className="btn-add" onClick={openCreate}>
            {t("prioritization.btn_new")}
          </button>
        ) : null}
      </div>

      <div className="mod-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: 16, border: "1px solid rgba(0,212,255,0.18)" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {TAB_ORDER.map((tab) => {
              const isQuarter = tab === "QUARTER";
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  className={`btn-page ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab);
                    if (!isQuarter) setActiveMethod(tab);
                    setPage(1);
                  }}
                  style={{
                    minWidth: 110,
                    borderColor: isActive ? "#00d4ff" : undefined,
                    color: isActive ? "#00d4ff" : undefined,
                  }}
                >
                  {isQuarter ? t("prioritization.tab_quarter") : t(`prioritization.methods.${tab}.label`)}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: "#9bb2c6", marginBottom: 4 }}>
            {t("prioritization.tab_active_label")}{" "}
            <strong style={{ color: "#f6e7c1" }}>
              {activeTab === "QUARTER" ? t("prioritization.tab_quarter") : t(`prioritization.methods.${activeMethod}.label`)}
            </strong>
          </div>
          <div style={{ fontSize: 10, color: "#7899b0" }}>
            {activeTab === "QUARTER"
              ? t("prioritization.tab_scope_quarter")
              : t("prioritization.tab_scope_count", { count: activeMethodTotal })}
          </div>
        </div>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      {activeTab === "QUARTER" ? (
        <>
          <div className="mod-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: 16, border: "1px solid rgba(192,132,252,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#c084fc", marginBottom: 6 }}>
                    {t("prioritization.quarter_eyebrow")}
                  </div>
                  <div style={{ fontSize: 16, color: "#f6e7c1", letterSpacing: 1.5 }}>
                    {t("prioritization.quarter_title")}
                  </div>
                  <div style={{ fontSize: 10, color: "#7899b0", marginTop: 4 }}>
                    {t("prioritization.quarter_hint")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select className="mod-select" value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}>
                    {[selectedFiscalYear - 1, selectedFiscalYear, selectedFiscalYear + 1, selectedFiscalYear + 2].map((year) => (
                      <option key={year} value={year}>
                        FY {year}
                      </option>
                    ))}
                  </select>
                  <select className="mod-select" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}>
                    {quarterMonthRanges.map((item) => (
                      <option key={item.quarter} value={item.quarter}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 10, color: "#9bb2c6" }}>
                  {t("prioritization.quarter_fiscal_start", {
                    company: selectedCompany?.company_name ?? "—",
                    month: quarterMonthRanges[0]?.label.split("·")[1]?.trim() ?? "—",
                  })}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid rgba(0,212,255,0.2)",
                    padding: "6px 10px",
                    color: "#00d4ff",
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                >
                  <span>{selectedQuarter}</span>
                  <span style={{ color: "#7899b0" }}>•</span>
                  <span>{selectedQuarterItems.length} planned</span>
                </div>
              </div>

              {quarterLoading ? (
                <div className="mod-loading">{t("prioritization.loading")}</div>
              ) : (
                <div
                  style={{
                    border: "1px solid rgba(0,212,255,0.14)",
                    background: "rgba(0,212,255,0.03)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 10, color: "#c084fc", marginBottom: 8 }}>
                    {t("prioritization.quarter_candidates")}
                  </div>

                  <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 10 }}>
                    Select an initiative and place it directly into the highlighted quarter.
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <select
                      className="mod-select"
                      value={selectedQuarterCandidateId}
                      onChange={(e) => setSelectedQuarterCandidateId(e.target.value)}
                      style={{ minHeight: 44 }}
                    >
                      <option value="">{quarterCandidates.length === 0 ? t("prioritization.quarter_empty") : "Select candidate"}</option>
                      {quarterCandidates.map((candidate) => {
                        const typeLabel = candidate.sourceType
                          ? t(`prioritization.item_types.${candidate.sourceType}`)
                          : resolveQuarterItemTypeLabel(candidate.roadmap_item_id, candidate.title, "initiative", null);

                        return (
                          <option key={candidate.roadmap_item_id} value={candidate.roadmap_item_id}>
                            {typeLabel} - {candidate.title}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => {
                        if (!selectedQuarterCandidate) return;
                        saveQuarterCandidate(selectedQuarterCandidate, selectedQuarterItems.length + 1);
                      }}
                      disabled={quarterLoading || !selectedQuarterCandidate}
                      style={{ minWidth: 180, height: 44 }}
                    >
                      {t("prioritization.quarter_btn_add")}
                    </button>
                  </div>

                  {selectedQuarterCandidate?.description && (
                    <div style={{ fontSize: 10, color: "#7899b0", marginTop: 10 }}>
                      {selectedQuarterCandidate.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mod-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: 16, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#c084fc", marginBottom: 8 }}>
                    {t("prioritization.quarter_year_eyebrow")}
                  </div>
                  <div style={{ fontSize: 18, color: "#f6e7c1", letterSpacing: 1.5 }}>
                    {t("prioritization.quarter_year_title", { year: selectedFiscalYear })}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#7899b0", maxWidth: 320, textAlign: "right" }}>
                  Use the quarter board as the main planning view. The selected quarter stays highlighted for faster decisions.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                {quarterYearView.map((quarter) => (
                  <div
                    key={quarter.quarter}
                    style={{
                      border: quarter.isSelected
                        ? "1px solid rgba(0,212,255,0.55)"
                        : quarter.isActive
                          ? "1px solid rgba(192,132,252,0.45)"
                          : "1px solid rgba(255,255,255,0.08)",
                      padding: 12,
                      minHeight: 220,
                      background: quarter.isSelected
                        ? "rgba(0,212,255,0.05)"
                        : quarter.isActive
                          ? "rgba(192,132,252,0.04)"
                          : "rgba(255,255,255,0.01)",
                      boxShadow: quarter.isSelected
                        ? "0 0 0 1px rgba(0,212,255,0.12) inset"
                        : quarter.isActive
                          ? "0 0 0 1px rgba(192,132,252,0.08) inset"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: quarter.isSelected ? "#00d4ff" : "#c084fc",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{quarter.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {quarter.isActive && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "#c084fc",
                              border: "1px solid rgba(192,132,252,0.35)",
                              padding: "3px 6px",
                              letterSpacing: 1,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                        {quarter.isSelected && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "#00d4ff",
                              border: "1px solid rgba(0,212,255,0.3)",
                              padding: "3px 6px",
                              letterSpacing: 1,
                            }}
                          >
                            SELECTED
                          </span>
                        )}
                      </div>
                    </div>
                    {quarter.items.length === 0 ? (
                      <div style={{ fontSize: 10, color: "#7899b0" }}>{t("prioritization.quarter_year_empty")}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {quarter.items.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            style={{
                              border: quarter.isSelected
                                ? "1px solid rgba(0,212,255,0.18)"
                                : quarter.isActive
                                  ? "1px solid rgba(192,132,252,0.16)"
                                  : "1px solid rgba(255,255,255,0.06)",
                              padding: 10,
                              background: "rgba(4,12,24,0.55)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#f6e7c1", marginBottom: 6 }}>
                                  {resolveQuarterItemTypeLabel(
                                    item.roadmap_item_id,
                                    item.roadmap_title,
                                    item.roadmap_item_type,
                                    item.backlog_item_type,
                                  )} - {item.roadmap_title || item.roadmap_item_id}
                                </div>
                                <div style={{ fontSize: 9, color: "#7899b0", letterSpacing: 0.6 }}>
                                  {t("prioritization.quarter_rank")}: {item.priority_rank ?? "—"}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  style={{ padding: "4px 8px", fontSize: 9, minWidth: 34, opacity: itemIndex === 0 ? 0.45 : 1 }}
                                  onClick={() => moveQuarterItem(quarter.quarter, item.id, "up")}
                                  disabled={itemIndex === 0 || quarterLoading}
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  style={{ padding: "4px 8px", fontSize: 9, minWidth: 34, opacity: itemIndex === quarter.items.length - 1 ? 0.45 : 1 }}
                                  onClick={() => moveQuarterItem(quarter.quarter, item.id, "down")}
                                  disabled={itemIndex === quarter.items.length - 1 || quarterLoading}
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--danger"
                                  style={{ padding: "4px 8px", fontSize: 9, minWidth: 44 }}
                                  onClick={() => removeQuarterItem(item.id)}
                                  disabled={quarterLoading}
                                >
                                  {t("prioritization.btn_del")}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mod-table-wrap">
          {loading ? (
            <div className="mod-loading">{t("prioritization.loading")}</div>
          ) : activeMethodRows.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">◇</div>
              <div className="mod-empty__title">{t("prioritization.empty_title")}</div>
              <div className="mod-empty__sub">{t("prioritization.empty_sub_method")}</div>
            </div>
          ) : (
            <table className="mod-table">
              <thead>
                <tr>
                  <th>{t("prioritization.col_title")}</th>
                  <th>{t("prioritization.col_item_type")}</th>
                  <th>{t("prioritization.col_method")}</th>
                  <th>{t("prioritization.col_score")}</th>
                  <th>{activeMethod === "WSJF" ? "BV" : activeMethod === "EISENHOWER" ? "U" : activeMethod === "ICE" ? "I" : "R"}</th>
                  <th>{activeMethod === "WSJF" ? "TC" : activeMethod === "EISENHOWER" ? "I" : activeMethod === "ICE" ? "C" : "I"}</th>
                  <th>{activeMethod === "WSJF" ? "RR/OE" : activeMethod === "RICE" ? "C" : activeMethod === "EISENHOWER" ? "C" : "E"}</th>
                  <th>{activeMethod === "WSJF" ? "JS" : activeMethod === "RICE" ? "E" : activeMethod === "ICE" ? "—" : "—"}</th>
                  {showMoscowColumn && <th>{t("prioritization.col_moscow")}</th>}
                  {activeMethod === "EISENHOWER" && <th>Quadrant</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.description && (
                        <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                          {item.description.slice(0, 60)}…
                        </div>
                      )}
                    </td>
                    <td style={{ color: "#7899b0" }}>
                      {(() => {
                        const normalizedType = normalizePrioritizationItemType(item.item_type);
                        return normalizedType ? t(`prioritization.item_types.${normalizedType}`) : "—";
                      })()}
                    </td>
                    <td>
                      <span className={`badge badge--${item.priority_method}`}>
                        {t(`prioritization.methods.${item.priority_method}.label`)}
                      </span>
                    </td>
                    <td>
                      <span className={`score-chip ${getRiskClass(
                        Number(
                          item.rice_score
                          ?? item.ice_score
                          ?? item.eisenhower_score
                          ?? item.wsjf_score
                          ?? 0,
                        ),
                      )}`}>
                        {Math.round(
                          Number(
                            item.rice_score
                            ?? item.ice_score
                            ?? item.eisenhower_score
                            ?? item.wsjf_score
                            ?? 0,
                          ),
                        )}
                      </span>
                    </td>
                    <td style={{ color: "#7899b0" }}>
                      {activeMethod === "WSJF" ? (item.business_value ?? "—") : activeMethod === "EISENHOWER" ? (item.urgency ?? "—") : (item.reach ?? "—")}
                    </td>
                    <td style={{ color: "#7899b0" }}>
                      {activeMethod === "WSJF" ? (item.time_criticality ?? "—") : activeMethod === "EISENHOWER" ? (item.importance ?? "—") : (item.impact ?? "—")}
                    </td>
                    <td style={{ color: "#7899b0" }}>
                      {activeMethod === "WSJF" ? (item.risk_reduction ?? "—") : activeMethod === "ICE" ? (item.confidence ?? "—") : activeMethod === "RICE" ? (item.confidence ?? "—") : "—"}
                    </td>
                    <td style={{ color: "#7899b0" }}>
                      {activeMethod === "WSJF" ? (item.job_size ?? "—") : activeMethod === "ICE" ? (item.ease ?? "—") : activeMethod === "RICE" ? (item.effort ?? "—") : "—"}
                    </td>
                    {showMoscowColumn && (
                      <td>
                        {item.moscow_value ? (
                          <span className="badge badge--MoSCoW">
                            {t(`prioritization.moscow_values.${item.moscow_value}`)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    {activeMethod === "EISENHOWER" && <td style={{ color: "#7899b0" }}>{item.quadrant ?? "—"}</td>}
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" onClick={() => openEdit(item)}>
                          {t("prioritization.btn_edit")}
                        </button>
                        {!item.id.startsWith("candidate-") && (
                          <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>
                            {t("prioritization.btn_del")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeMethodTotal > SIZE && (
            <div className="mod-pagination">
              <span>
                {activeMethodTotal === 0 ? 0 : (page - 1) * SIZE + 1}–{Math.min(page * SIZE, activeMethodTotal)} {t("prioritization.pagination_of")}{" "}
                {activeMethodTotal}
              </span>
              <div className="mod-pagination__btns">
                <button className="btn-page" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  {t("prioritization.btn_prev")}
                </button>
                <button
                  className="btn-page"
                  disabled={page * SIZE >= activeMethodTotal}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("prioritization.btn_next")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mod-card" style={{ marginTop: 16 }}>
        <div style={{ padding: 14, border: "1px solid rgba(0,212,255,0.12)", background: "rgba(0,212,255,0.015)" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 6 }}>
            {t("prioritization.footer_eyebrow")}
          </div>
          <div style={{ fontSize: 14, color: "#f6e7c1", letterSpacing: 1.2, marginBottom: 6 }}>
            {methodSummary.title}
          </div>
          <p style={{ margin: "0 0 8px", color: "#9bb2c6", fontSize: 10, lineHeight: 1.5 }}>
            {methodSummary.summary}
          </p>
          <div style={{ fontSize: 10, color: "#00d4ff", marginBottom: 6 }}>
            {t("prioritization.compatibility_title")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {methodSummary.compatibility.map((typeItem) => (
              <span key={typeItem.value} className="badge" style={{ borderColor: "#00d4ff", color: "#00d4ff" }}>
                {typeItem.label}
              </span>
            ))}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#7899b0", fontSize: 10, lineHeight: 1.6 }}>
            {methodSummary.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">{t("prioritization.modal_eyebrow")}</span>
                <h3 className="mod-modal__title">
                  {modal === "create" ? t("prioritization.modal_new") : t("prioritization.modal_edit")}{" "}
                  <span>{t("prioritization.modal_subtitle")}</span>
                </h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("prioritization.field_method")}</label>
                  <select
                    className="mod-select"
                    value={form.priority_method}
                    onChange={(e) => updateMethod(e.target.value as PrioritizationMethod)}
                  >
                    {methodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("prioritization.field_item_type")}</label>
                  <select
                    className="mod-select"
                    value={form.item_type}
                    onChange={(e) => {
                      const nextType = e.target.value as PrioritizationItemType;
                      setForm((f) => ({
                        ...f,
                        item_type: nextType,
                        title: "",
                      }));
                      setWsjfAssessment(null);
                      setWsjfSummaryJustification("");
                      setWsjfAnswers({});
                    }}
                  >
                    {compatibleTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, color: "#7899b0", marginTop: 6 }}>
                    {t("prioritization.compatibility_hint")}
                  </div>
                </div>
              </div>

              <div className="mod-field" style={{ position: "relative" }}>
                <label className="mod-field__label">
                  {t("prioritization.field_title")} <span>*</span>
                </label>
                {selectedMethod === "MOSCOW" || selectedMethod === "WSJF" ? (
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="mod-select"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minHeight: 40,
                      }}
                      onClick={() => {
                        setMoscowDropdownOpen((open) => !open);
                        if (!moscowDropdownOpen) setMoscowActiveGroup(null);
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedTitleLabel}
                      </span>
                      <span style={{ marginLeft: 8 }}>{moscowDropdownOpen ? "▴" : "▾"}</span>
                    </button>

                    {moscowDropdownOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          zIndex: 30,
                          background: "#08111f",
                          border: "1px solid rgba(0,212,255,0.25)",
                          maxHeight: 320,
                          overflowY: "auto",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                        }}
                      >
                        {moscowActiveGroup ? (
                          <>
                            <button
                              type="button"
                              style={{
                                width: "100%",
                                background: "rgba(0,212,255,0.08)",
                                color: "#00d4ff",
                                border: "none",
                                borderBottom: "1px solid rgba(0,212,255,0.18)",
                                textAlign: "left",
                                padding: "10px 12px",
                                cursor: "pointer",
                                fontSize: 10,
                                letterSpacing: 1,
                              }}
                              onClick={() => setMoscowActiveGroup(null)}
                            >
                              ← {moscowActiveGroup}
                            </button>
                            {(groupedTitleOptions.find((group) => group.label === moscowActiveGroup)?.options ?? []).map((option) => (
                              <button
                                key={`${form.item_type}-${moscowActiveGroup}-${option.value}`}
                                type="button"
                                style={{
                                  width: "100%",
                                  background: form.title === option.value ? "rgba(255,255,255,0.08)" : "transparent",
                                  color: "#d8e6f5",
                                  border: "none",
                                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                                  textAlign: "left",
                                  padding: "10px 14px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  lineHeight: 1.4,
                                }}
                                onClick={() => {
                                  setForm((f) => ({ ...f, title: option.value }));
                                  setMoscowDropdownOpen(false);
                                  setMoscowActiveGroup(null);
                                  loadWsjfAssessment(option.backlogItemId);
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              style={{
                                width: "100%",
                                background: "transparent",
                                color: "#7899b0",
                                border: "none",
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                                textAlign: "left",
                                padding: "10px 12px",
                                cursor: "pointer",
                                fontSize: 10,
                              }}
                              onClick={() => {
                                setForm((f) => ({ ...f, title: "" }));
                                setMoscowDropdownOpen(false);
                              }}
                            >
                              {t("prioritization.placeholder_title")}
                            </button>
                            {groupedTitleOptions.map((group) => (
                              <button
                                key={group.label}
                                type="button"
                                style={{
                                  width: "100%",
                                  background: "transparent",
                                  color: "#f6e7c1",
                                  border: "none",
                                  borderBottom: "1px solid rgba(0,212,255,0.08)",
                                  textAlign: "left",
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                                onClick={() => setMoscowActiveGroup(group.label)}
                              >
                                <span>{group.label}</span>
                                <span style={{ color: "#7899b0", fontSize: 10 }}>{group.options.length} ▸</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    className="mod-select"
                    value={form.title}
                    onChange={(e) => {
                      const option = titleOptions.find((entry) => entry.value === e.target.value);
                      setForm((f) => ({ ...f, title: e.target.value }));
                      loadWsjfAssessment(option?.backlogItemId);
                    }}
                  >
                    {titleOptions.map((option) => (
                      <option key={`${form.item_type}-${option.value || "placeholder"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mod-field">
                <label className="mod-field__label">{t("prioritization.field_description")}</label>
                <textarea
                  className="mod-textarea"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("prioritization.placeholder_description")}
                />
              </div>

              {showMoscowField && (
                <div className="mod-field">
                  <label className="mod-field__label">{t("prioritization.field_moscow")}</label>
                  <select
                    className="mod-select"
                    value={form.moscow_value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        moscow_value: e.target.value as MoscowValue,
                      }))
                    }
                  >
                    <option value="">{t("prioritization.select_moscow_none")}</option>
                    <option value="must">{t("prioritization.moscow_values.must")}</option>
                    <option value="should">{t("prioritization.moscow_values.should")}</option>
                    <option value="could">{t("prioritization.moscow_values.could")}</option>
                    <option value="wont">{t("prioritization.moscow_values.wont")}</option>
                  </select>
                </div>
              )}

              {isWsjfType && (
                <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 12, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff" }}>
                      {t("prioritization.wsjf_heading")}
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ fontSize: 10, padding: "6px 10px" }}
                      onClick={handleSaveWsjfAssessment}
                      disabled={wsjfSaving || wsjfLoading || !wsjfTemplate || !selectedTitleOption?.backlogItemId}
                    >
                      {wsjfSaving ? t("prioritization.btn_saving") : t("prioritization.wsjf_btn_apply_questionnaire")}
                    </button>
                  </div>

                  {selectedTitleOption?.adoId && (
                    <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 10 }}>
                      {t("prioritization.wsjf_ado_hint", { adoId: selectedTitleOption.adoId })}
                    </div>
                  )}

                  {wsjfTemplate ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      {wsjfDimensions.map((dimension) => (
                        <div key={dimension.dimension_id} style={{ border: "1px solid rgba(0,212,255,0.12)", padding: 12, borderRadius: 4 }}>
                          <div style={{ fontSize: 11, color: "#f6e7c1", letterSpacing: 1, marginBottom: 6 }}>{dimension.label}</div>
                          {dimension.description && (
                            <div style={{ fontSize: 10, color: "#7899b0", lineHeight: 1.5, marginBottom: 10 }}>{dimension.description}</div>
                          )}
                          {[...dimension.questions].sort((a, b) => a.display_order - b.display_order).map((question) => {
                            const answer = wsjfAnswers[question.question_id];
                            return (
                              <div key={question.question_id} style={{ marginBottom: 12 }}>
                                <label className="mod-field__label" style={{ fontSize: 10 }}>{question.question_text}</label>
                                {question.help_text && <div style={{ fontSize: 10, color: "#7899b0", margin: "4px 0 8px" }}>{question.help_text}</div>}
                                <select
                                  className="mod-select"
                                  value={answer?.optionId ?? ""}
                                  onChange={(e) => {
                                    const selectedOption = question.options.find((option) => option.option_id === parseInt(e.target.value, 10));
                                    setWsjfAnswers((prev) => ({
                                      ...prev,
                                      [question.question_id]: selectedOption ? {
                                        optionId: selectedOption.option_id,
                                        score: selectedOption.score_value ?? 0,
                                        justification: selectedOption.justification_template ?? "",
                                      } : { optionId: undefined, score: 0, justification: "" },
                                    }));
                                  }}
                                >
                                  <option value="">{t("prioritization.wsjf_select_option")}</option>
                                  {question.options.map((option) => (
                                    <option key={option.option_id} value={option.option_id}>
                                      {option.option_label} {option.score_value ? `(${option.score_value})` : ""}
                                    </option>
                                  ))}
                                </select>
                                <textarea
                                  className="mod-textarea"
                                  style={{ marginTop: 8, minHeight: 88 }}
                                  value={answer?.justification ?? ""}
                                  onChange={(e) =>
                                    setWsjfAnswers((prev) => ({
                                      ...prev,
                                      [question.question_id]: {
                                        optionId: prev[question.question_id]?.optionId,
                                        score: prev[question.question_id]?.score ?? 0,
                                        justification: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={t("prioritization.wsjf_placeholder_justification")}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      <div className="mod-field">
                        <label className="mod-field__label">{t("prioritization.wsjf_summary_justification")}</label>
                        <textarea
                          className="mod-textarea"
                          value={wsjfSummaryJustification}
                          onChange={(e) => setWsjfSummaryJustification(e.target.value)}
                          placeholder={t("prioritization.wsjf_placeholder_summary")}
                        />
                      </div>

                      <div className="mod-field-row">
                        <div className="mod-field">
                          <label className="mod-field__label">{t("prioritization.wsjf_business_value")}</label>
                          <input className="mod-input" readOnly value={questionnaireScores.business_value} />
                        </div>
                        <div className="mod-field">
                          <label className="mod-field__label">{t("prioritization.wsjf_time_criticality")}</label>
                          <input className="mod-input" readOnly value={questionnaireScores.time_criticality} />
                        </div>
                      </div>
                      <div className="mod-field-row">
                        <div className="mod-field">
                          <label className="mod-field__label">{t("prioritization.wsjf_risk_reduction")}</label>
                          <input className="mod-input" readOnly value={questionnaireScores.risk_reduction} />
                        </div>
                        <div className="mod-field">
                          <label className="mod-field__label">{t("prioritization.wsjf_job_size")}</label>
                          <input className="mod-input" readOnly value={questionnaireScores.job_size} />
                        </div>
                      </div>

                      <div style={{ fontSize: 11, letterSpacing: 1, marginTop: 6 }}>
                        {t("prioritization.wsjf_score_label")} <span style={{ color: "#00d4ff", fontWeight: 700, fontSize: 16 }}>{questionnaireScoreValue}</span>
                      </div>

                      {wsjfAssessment && (
                        <div style={{ fontSize: 10, color: "#7899b0", lineHeight: 1.6, borderTop: "1px dashed rgba(0,212,255,0.15)", paddingTop: 10 }}>
                          <div>{t("prioritization.wsjf_last_assessment")}: {new Date(wsjfAssessment.updated_at).toLocaleString()}</div>
                          <div>{t("prioritization.wsjf_cost_of_delay")}: {wsjfAssessment.cost_of_delay}</div>
                          <div>{t("prioritization.wsjf_score_label")} {wsjfAssessment.wsjf_score}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "#7899b0" }}>{t("prioritization.loading")}</div>
                  )}
                </div>
              )}

              {showRiceFields && (
                <>
                  <div style={{ padding: "12px 0 4px", fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>
                    {t("prioritization.score_label", {
                      method: t(`prioritization.methods.${selectedMethod}.label`),
                    })}{" "}
                    <span className="score-chip">{computedScore}</span>
                  </div>
                  <div className="mod-field-row">
                    <div className="mod-field">
                      <label className="mod-field__label">{t("prioritization.field_reach")}</label>
                      <input className="mod-input" type="number" min="0" value={form.reach} onChange={(e) => updateNum("reach", e.target.value)} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("prioritization.field_impact")}</label>
                      <input className="mod-input" type="number" min="0" value={form.impact} onChange={(e) => updateNum("impact", e.target.value)} />
                    </div>
                  </div>
                  <div className="mod-field-row">
                    <div className="mod-field">
                      <label className="mod-field__label">{t("prioritization.field_confidence")}</label>
                      <input className="mod-input" type="number" min="0" max="100" value={form.confidence} onChange={(e) => updateNum("confidence", e.target.value)} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("prioritization.field_effort")}</label>
                      <input className="mod-input" type="number" min="0.1" step="0.1" value={form.effort} onChange={(e) => updateNum("effort", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {showIceFields && (
                <>
                  <div style={{ padding: "12px 0 4px", fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>
                    ICE SCORE <span className="score-chip">{Math.round(Number(form.impact) * Number(form.confidence) * Number(form.effort || 1))}</span>
                  </div>
                  <div className="mod-field-row">
                    <div className="mod-field">
                      <label className="mod-field__label">{t("prioritization.field_impact")}</label>
                      <input className="mod-input" type="number" min="0" value={form.impact} onChange={(e) => updateNum("impact", e.target.value)} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("prioritization.field_confidence")}</label>
                      <input className="mod-input" type="number" min="0" max="100" value={form.confidence} onChange={(e) => updateNum("confidence", e.target.value)} />
                    </div>
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">Ease</label>
                    <input className="mod-input" type="number" min="0" value={form.effort} onChange={(e) => updateNum("effort", e.target.value)} />
                  </div>
                </>
              )}

              {showEisenhowerFields && (
                <>
                  <div style={{ padding: "12px 0 4px", fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>
                    EISENHOWER SCORE <span className="score-chip">{computedScore}</span>
                  </div>
                  <div className="mod-field-row">
                    <div className="mod-field">
                      <label className="mod-field__label">Urgency</label>
                      <input className="mod-input" type="number" min="0" value={form.reach} onChange={(e) => updateNum("reach", e.target.value)} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">Importance</label>
                      <input className="mod-input" type="number" min="0" value={form.impact} onChange={(e) => updateNum("impact", e.target.value)} />
                    </div>
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("prioritization.field_confidence")}</label>
                    <input className="mod-input" type="number" min="0" max="100" value={form.confidence} onChange={(e) => updateNum("confidence", e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>
                {t("prioritization.btn_cancel")}
              </button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? t("prioritization.btn_saving") : t("prioritization.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
