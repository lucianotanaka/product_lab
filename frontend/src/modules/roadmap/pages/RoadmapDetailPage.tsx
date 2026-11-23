import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import RaciPanel from "../../../shared/components/RaciPanel";
import BacklogNotesHistoryPanel from "../../../shared/components/BacklogNotesHistoryPanel";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../../shared/services/api";

const INITIATIVE_TYPES = [
  "strategic_initiative",
  "business_initiative",
  "technical_initiative",
  "enabling_initiative",
  "improvement_initiative",
  "compliance_initiative",
  "research_initiative",
  "operational_initiative",
] as const;

const INITIATIVE_TYPE_LABELS: Record<(typeof INITIATIVE_TYPES)[number], string> = {
  strategic_initiative: "Strategic Initiative",
  business_initiative: "Business Initiative",
  technical_initiative: "Technical Initiative",
  enabling_initiative: "Enabling Initiative",
  improvement_initiative: "Improvement Initiative",
  compliance_initiative: "Compliance Initiative",
  research_initiative: "Research Initiative",
  operational_initiative: "Operational Initiative",
};

interface RoadmapBacklogItem {
  item_id: number;
  title: string;
  current_status: string;
  item_type_id?: number;
  item_type_name?: string;
  ado_id?: string;
  assigned_to_member_id?: number;
  assigned_to_name?: string;
  start_sprint_id?: number;
  start_sprint_name?: string;
  start_sprint_date?: string;
  end_sprint_id?: number;
  end_sprint_name?: string;
  end_sprint_date?: string;
  dependency_summary?: string[];
  executive_summary?: string;
  executive_next_step?: string;
  attention_flag?: boolean;
  attention_reason?: string;
  executive_updated_at?: string;
  executive_updated_by?: string;
  display_order?: number;
}
interface EligibleRoadmapBacklogRaciItem extends RoadmapBacklogItem { raciScopeLabel: string; }
interface RoadmapItem {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  item_type_id?: number;
  type?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  quarter?: string;
  executive_status?: string;
  executive_summary?: string;
  executive_risk_dependency?: string;
  executive_next_step?: string;
  executive_owner_name?: string;
  owner_member_id?: number;
  sponsor_stakeholder_id?: number;
  primary_company_area_id?: number;
  attention_flag?: boolean;
  attention_reason?: string;
  executive_updated_at?: string;
  executive_updated_by?: string;
  created_at: string;
  backlog_items?: RoadmapBacklogItem[];
}
interface ProjectCharter { id: string; business_case_id?: string; opportunity_id?: string; roadmap_item_id?: string; product_id: number; project_name: string; project_purpose?: string; business_objective?: string; objectives?: string; scope_in?: string; scope_out?: string; success_criteria?: string; high_level_requirements?: string; major_deliverables?: string; high_level_timeline?: string; budget_summary?: string; risks_summary?: string; assumptions_constraints?: string; sponsor_name?: string; project_manager_name?: string; status: string; }
interface RoadmapRequirement { id: number; requirement_code: string; requirement_title: string; requirement_description: string; requirement_type: string; requirement_source?: string; priority: string; lifecycle_status: string; fulfillment_status: string; requirement_owner?: string; }
interface DeliveryBacklogLink { requirement_id:number; backlog_item_id:number; title:string; current_status:string; item_type_id?:number|null; item_type_name?:string|null; coverage_type:string; notes?:string|null; }

const EMPTY_CHARTER = { project_name: "", project_purpose: "", business_objective: "", objectives: "", scope_in: "", scope_out: "", success_criteria: "", high_level_requirements: "", major_deliverables: "", high_level_timeline: "", budget_summary: "", risks_summary: "", assumptions_constraints: "", sponsor_name: "", project_manager_name: "", status: "draft" };
const EMPTY_REQUIREMENT_FORM = { requirement_code: "", requirement_title: "", requirement_description: "", requirement_type: "FUNCTIONAL", priority: "MEDIUM", lifecycle_status: "DRAFT", fulfillment_status: "NOT_STARTED", acceptance_definition: "", requirement_owner: "" };
const EMPTY_FORM = {
  title: "",
  description: "",
  type: "",
  status: "planned",
  start_date: "",
  end_date: "",
  quarter: "",
  executive_status: "not_started",
  executive_summary: "",
  executive_risk_dependency: "",
  executive_next_step: "",
  executive_owner_name: "",
  owner_member_id: "",
  sponsor_stakeholder_id: "",
  primary_company_area_id: "",
  attention_flag: false,
  attention_reason: "",
  executive_updated_by: "",
};

type TabKey = "overview" | "backlog" | "charter" | "requirements" | "raci";
const CURRENT_USER_NAME = "PM";

export default function RoadmapDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<RoadmapItem | null>(null);
  const [backlogOptions, setBacklogOptions] = useState<RoadmapBacklogItem[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<number[]>([]);
  const [charterForm, setCharterForm] = useState({ ...EMPTY_CHARTER });
  const [requirements, setRequirements] = useState<RoadmapRequirement[]>([]);
  const [lastCreatedRequirementId, setLastCreatedRequirementId] = useState<number | null>(null);
  const [requirementForm, setRequirementForm] = useState({ ...EMPTY_REQUIREMENT_FORM });
  const [deliveryBacklogByRequirement, setDeliveryBacklogByRequirement] = useState<Record<number, DeliveryBacklogLink[]>>({});
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [savingOverview, setSavingOverview] = useState(false);
  const [savingBacklog, setSavingBacklog] = useState(false);
  const [savingRequirement, setSavingRequirement] = useState(false);
  const [savingCharter, setSavingCharter] = useState(false);
  const [charterOk, setCharterOk] = useState(false);
  const [backlogQuery, setBacklogQuery] = useState("");
  const [backlogTypeFilter, setBacklogTypeFilter] = useState("");
  const [backlogStatusFilter, setBacklogStatusFilter] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showBacklogPicker, setShowBacklogPicker] = useState(false);
  const [expandedBacklogItemId, setExpandedBacklogItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadItem = async () => {
    setLoading(true);
    setError("");
    try {
      const roadmapItem = await apiGet<RoadmapItem>(`/roadmap/${id}`);
      setItem(roadmapItem);
      const mappedItems = roadmapItem.backlog_items ?? [];
      const derivedStartDate = mappedItems
        .map(backlogItem => backlogItem.start_sprint_date)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? "";
      const derivedEndDate = mappedItems
        .map(backlogItem => backlogItem.end_sprint_date)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? "";
      setForm({
        title: roadmapItem.title,
        description: roadmapItem.description ?? "",
        type: roadmapItem.type ?? "",
        status: roadmapItem.status,
        start_date: derivedStartDate ? derivedStartDate.slice(0, 10) : "",
        end_date: derivedEndDate ? derivedEndDate.slice(0, 10) : "",
        quarter: roadmapItem.quarter ?? "",
        executive_status: roadmapItem.executive_status ?? "not_started",
        executive_summary: roadmapItem.executive_summary ?? "",
        executive_risk_dependency: roadmapItem.executive_risk_dependency ?? "",
        executive_next_step: roadmapItem.executive_next_step ?? "",
        executive_owner_name: roadmapItem.executive_owner_name ?? "",
        owner_member_id: roadmapItem.owner_member_id ? String(roadmapItem.owner_member_id) : "",
        sponsor_stakeholder_id: roadmapItem.sponsor_stakeholder_id ? String(roadmapItem.sponsor_stakeholder_id) : "",
        primary_company_area_id: roadmapItem.primary_company_area_id ? String(roadmapItem.primary_company_area_id) : "",
        attention_flag: Boolean(roadmapItem.attention_flag),
        attention_reason: roadmapItem.attention_reason ?? "",
        executive_updated_by: roadmapItem.executive_updated_by ?? "",
      });
      const mappedIds = mappedItems.map(backlogItem => backlogItem.item_id);
      setSelectedBacklogIds(mappedIds);
      setExpandedBacklogItemId(mappedIds[0] ?? null);
      setCharterForm({
        ...EMPTY_CHARTER,
        project_name: roadmapItem.title,
      });
      try {
        const charter = await apiGet<ProjectCharter | null>(`/discovery/roadmap/${roadmapItem.id}/project-charter`);
        if (charter) {
          setCharterForm({
            project_name: charter.project_name ?? roadmapItem.title,
            project_purpose: charter.project_purpose ?? "",
            business_objective: charter.business_objective ?? "",
            objectives: charter.objectives ?? "",
            scope_in: charter.scope_in ?? "",
            scope_out: charter.scope_out ?? "",
            success_criteria: charter.success_criteria ?? "",
            high_level_requirements: charter.high_level_requirements ?? "",
            major_deliverables: charter.major_deliverables ?? "",
            high_level_timeline: charter.high_level_timeline ?? "",
            budget_summary: charter.budget_summary ?? "",
            risks_summary: charter.risks_summary ?? "",
            assumptions_constraints: charter.assumptions_constraints ?? "",
            sponsor_name: charter.sponsor_name ?? "",
            project_manager_name: charter.project_manager_name ?? "",
            status: charter.status ?? "draft",
          });
        }
      } catch {
        /**/
      }
      try {
        const reqs = await apiGet<RoadmapRequirement[]>(`/roadmap/${roadmapItem.id}/requirements`);
        setRequirements(reqs);
        setLastCreatedRequirementId(reqs[0]?.id ?? null);
        const deliveryEntries = await Promise.all(
          reqs.map(async req => {
            try {
              const links = await apiGet<DeliveryBacklogLink[]>(`/requirements/${req.id}/delivery-backlog`);
              return [req.id, links] as const;
            } catch {
              return [req.id, []] as const;
            }
          })
        );
        setDeliveryBacklogByRequirement(Object.fromEntries(deliveryEntries));
      } catch {
        setRequirements([]);
        setLastCreatedRequirementId(null);
        setDeliveryBacklogByRequirement({});
      }

      if (roadmapItem.product_id) {
        setLoadingBacklog(true);
        try {
          const options = await apiGet<RoadmapBacklogItem[]>(`/roadmap/backlog-options?product_id=${roadmapItem.product_id}`);
          setBacklogOptions(options);
        } finally {
          setLoadingBacklog(false);
        }
      } else {
        setBacklogOptions([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) loadItem(); }, [id]);

  useEffect(() => {
    if (!item) return;
    const prefix = {
      BUSINESS: "BR",
      FUNCTIONAL: "FR",
      NON_FUNCTIONAL: "NFR",
      DATA: "DR",
      INTEGRATION: "IR",
      SECURITY: "SR",
      COMPLIANCE: "CR",
      UX: "UXR",
    }[requirementForm.requirement_type] ?? "REQ";
    setRequirementForm(current => {
      const codeLooksAuto = !current.requirement_code || /^([A-Z]+)-\d+$/.test(current.requirement_code);
      if (!codeLooksAuto) return current;
      return {
        ...current,
        requirement_code: `${prefix}-${String(requirements.length + 1).padStart(3, "0")}`,
        requirement_title: current.requirement_title || item.title,
        requirement_owner: current.requirement_owner || form.executive_owner_name || "",
      };
    });
  }, [item, requirementForm.requirement_type, requirements.length, form.executive_owner_name]);

  const typeLabel = (type?: string) => type ? (INITIATIVE_TYPE_LABELS[type as keyof typeof INITIATIVE_TYPE_LABELS] ?? type.replaceAll("_", " ")) : "—";
  const selectedBacklog = useMemo(
    () => {
      const mappedItems = item?.backlog_items ?? [];
      const mappedById = new Map(mappedItems.map(backlogItem => [backlogItem.item_id, backlogItem]));
      const optionById = new Map(backlogOptions.map(option => [option.item_id, option]));

      return selectedBacklogIds
        .map(itemId => {
          const mappedItem = mappedById.get(itemId);
          const optionItem = optionById.get(itemId);
          return {
            ...(optionItem ?? {}),
            ...(mappedItem ?? {}),
            item_id: itemId,
            title: mappedItem?.title ?? optionItem?.title ?? `#${itemId}`,
            current_status: mappedItem?.current_status ?? optionItem?.current_status ?? "",
          } as RoadmapBacklogItem;
        })
        .filter(backlogItem => Boolean(backlogItem.current_status || backlogItem.title))
        .sort((a, b) => (a.display_order ?? 999999) - (b.display_order ?? 999999) || a.item_id - b.item_id);
    },
    [item?.backlog_items, backlogOptions, selectedBacklogIds]
  );

  useEffect(() => {
    if (!selectedBacklog.length) {
      setExpandedBacklogItemId(null);
      return;
    }
    if (expandedBacklogItemId == null || !selectedBacklog.some(entry => entry.item_id === expandedBacklogItemId)) {
      setExpandedBacklogItemId(selectedBacklog[0].item_id);
    }
  }, [selectedBacklog, expandedBacklogItemId]);

  const filteredBacklogOptions = useMemo(() => {
    const query = backlogQuery.trim().toLowerCase();
    return backlogOptions.filter(option => {
      if (showSelectedOnly && !selectedBacklogIds.includes(option.item_id)) return false;
      if (backlogTypeFilter && (option.item_type_name ?? "") !== backlogTypeFilter) return false;
      if (backlogStatusFilter && option.current_status !== backlogStatusFilter) return false;
      if (!query) return true;
      const haystack = `${option.item_id} ${option.title} ${option.item_type_name ?? ""} ${option.current_status}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [backlogOptions, selectedBacklogIds, backlogQuery, backlogTypeFilter, backlogStatusFilter, showSelectedOnly]);

  const backlogTypeOptions = useMemo(
    () => Array.from(new Set(backlogOptions.map(option => option.item_type_name ?? "SEM TIPO"))),
    [backlogOptions]
  );

  const backlogStatusOptions = useMemo(
    () => Array.from(new Set(backlogOptions.map(option => option.current_status))),
    [backlogOptions]
  );

  const selectedBacklogSet = useMemo(
    () => new Set(selectedBacklogIds),
    [selectedBacklogIds]
  );

  const availableBacklogOptions = useMemo(
    () => filteredBacklogOptions.filter(option => !selectedBacklogSet.has(option.item_id)),
    [filteredBacklogOptions, selectedBacklogSet]
  );

  const eligibleBacklogItemsForRaci = useMemo<EligibleRoadmapBacklogRaciItem[]>(
    () => selectedBacklog
      .filter(item => {
        const normalizedType = (item.item_type_name ?? "").trim().toLowerCase();
        return normalizedType === "epic" || normalizedType === "feature";
      })
      .map(item => ({
        ...item,
        raciScopeLabel: `${(item.item_type_name ?? "ITEM").toUpperCase()} • #${item.item_id}`,
      })),
    [selectedBacklog]
  );

  const [selectedRaciBacklogItemId, setSelectedRaciBacklogItemId] = useState<number | "">("");

  useEffect(() => {
    if (eligibleBacklogItemsForRaci.length === 0) {
      setSelectedRaciBacklogItemId("");
      return;
    }
    setSelectedRaciBacklogItemId(current => {
      if (current !== "" && eligibleBacklogItemsForRaci.some(item => item.item_id === current)) {
        return current;
      }
      return eligibleBacklogItemsForRaci[0].item_id;
    });
  }, [eligibleBacklogItemsForRaci]);

  const selectedRaciBacklogItem = useMemo(
    () => eligibleBacklogItemsForRaci.find(item => item.item_id === selectedRaciBacklogItemId) ?? null,
    [eligibleBacklogItemsForRaci, selectedRaciBacklogItemId]
  );

  const toggleBacklogItem = (itemId: number) => {
    setSelectedBacklogIds(current =>
      current.includes(itemId) ? current.filter(idValue => idValue !== itemId) : [...current, itemId]
    );
  };

  const updateSelectedBacklogExecutiveField = (
    itemId: number,
    field: keyof RoadmapBacklogItem,
    value: string | boolean | number | undefined
  ) => {
    setItem(current => {
      if (!current) return current;
      return {
        ...current,
        backlog_items: (current.backlog_items ?? []).map(backlogItem => (
          backlogItem.item_id === itemId ? { ...backlogItem, [field]: value } : backlogItem
        )),
      };
    });

    setBacklogOptions(current => current.map(option => (
      option.item_id === itemId ? { ...option, [field]: value } : option
    )));
  };

  const saveOverview = async () => {
    if (!item || !form.title.trim()) return;
    setSavingOverview(true);
    setError("");
    try {
      const derivedStartDate = selectedBacklog
        .map(backlogItem => backlogItem.start_sprint_date)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null;
      const derivedEndDate = [...selectedBacklog]
        .map(backlogItem => backlogItem.end_sprint_date)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      await apiPatch(`/roadmap/${item.id}`, {
        title: form.title,
        description: form.description || null,
        type: form.type || null,
        item_type_id: null,
        status: form.status,
        start_date: derivedStartDate,
        end_date: derivedEndDate,
        quarter: form.quarter || null,
        executive_status: form.executive_status || "not_started",
        executive_summary: form.executive_summary || null,
        executive_risk_dependency: form.executive_risk_dependency || null,
        executive_next_step: form.executive_next_step || null,
        executive_owner_name: form.executive_owner_name || null,
        owner_member_id: form.owner_member_id ? Number(form.owner_member_id) : null,
        sponsor_stakeholder_id: form.sponsor_stakeholder_id ? Number(form.sponsor_stakeholder_id) : null,
        primary_company_area_id: form.primary_company_area_id ? Number(form.primary_company_area_id) : null,
        attention_flag: form.attention_flag,
        attention_reason: form.attention_reason || null,
        executive_updated_by: form.executive_updated_by || null,
        executive_updated_at: new Date().toISOString(),
      });
      await loadItem();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingOverview(false);
    }
  };

  const saveBacklog = async () => {
    if (!item) return;
    setSavingBacklog(true);
    setError("");
    try {
      await apiPut(`/roadmap/${item.id}/backlog-links`, { backlog_item_ids: selectedBacklogIds });
      await loadItem();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingBacklog(false);
    }
  };

  const saveRequirement = async () => {
    if (!item || !requirementForm.requirement_code.trim() || !requirementForm.requirement_title.trim() || !requirementForm.requirement_description.trim()) return;
    setSavingRequirement(true);
    setError("");
    try {
      const created = await apiPost<RoadmapRequirement>(`/roadmap/${item.id}/requirements`, requirementForm);
      setLastCreatedRequirementId(created.id);
      const reqs = await apiGet<RoadmapRequirement[]>(`/roadmap/${item.id}/requirements`);
      setRequirements(reqs);
      setRequirementForm({
        ...EMPTY_REQUIREMENT_FORM,
        requirement_code: "",
        requirement_title: item.title,
        requirement_description: charterForm.high_level_requirements || item.description || "",
        requirement_owner: form.executive_owner_name || "",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingRequirement(false);
    }
  };

  const saveCharter = async () => {
    if (!item || !charterForm.project_name.trim()) return;
    setSavingCharter(true);
    setError("");
    try {
      await apiPut(`/discovery/roadmap/${item.id}/project-charter`, {
        ...charterForm,
        business_case_id: null,
      });
      setCharterOk(true);
      setTimeout(() => setCharterOk(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingCharter(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm("Excluir iniciativa?")) return;
    try {
      await apiDelete(`/roadmap/${item.id}`);
      navigate("/modules/roadmap");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <ModuleLayout moduleIcon="⬢" moduleName="ROADMAP" moduleAccent="ROADMAP" selectedProductId={item?.product_id ?? ""}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// INICIATIVA //</span>
          <h1 className="mod-header__title">{loading ? "CARREGANDO..." : item?.title ?? "INICIATIVA"}</h1>
          {!loading && item && (
            <p className="mod-header__meta">
              {typeLabel(item.type).toUpperCase()} • {item.status.toUpperCase()} • {item.backlog_items?.length ?? 0} item(ns) de backlog
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-cancel" onClick={() => navigate("/modules/roadmap")}>VOLTAR</button>
          <button className="btn-icon btn-icon--danger" onClick={handleDelete} disabled={!item}>EXCLUIR</button>
        </div>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}
      {loading || !item ? (
        <div className="mod-table-wrap"><div className="mod-loading">CARREGANDO INICIATIVA...</div></div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {[
              { key: "overview", label: "RESUMO" },
              { key: "backlog", label: "BACKLOG" },
              { key: "charter", label: "PROJECT CHARTER" },
              { key: "requirements", label: "REQUIREMENTS" },
              { key: "raci", label: "RACI" },
            ].map(tab => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "btn-save" : "btn-cancel"}
                onClick={() => setActiveTab(tab.key as TabKey)}
                style={{ minWidth: 160 }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="mod-table-wrap" style={{ padding: 16 }}>
              <div className="mod-field"><label className="mod-field__label">TÍTULO <span>*</span></label><input className="mod-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">DESCRIÇÃO</label><textarea className="mod-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">TIPO</label><select className="mod-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option value="">— SELECIONE —</option>{INITIATIVE_TYPES.map(type => <option key={type} value={type}>{(INITIATIVE_TYPE_LABELS[type] ?? type).toUpperCase()}</option>)}</select></div>
                <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="planned">PLANNED</option><option value="in_progress">IN PROGRESS</option><option value="done">DONE</option><option value="cancelled">CANCELLED</option></select></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">QUARTER</label><input className="mod-input" value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))} /></div>
                <div className="mod-field">
                  <label className="mod-field__label">DATA INÍCIO</label>
                  <input className="mod-input" type="date" value={form.start_date} disabled />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">DATA FIM</label>
                <input className="mod-input" type="date" value={form.end_date} disabled />
              </div>

              <div style={{ marginTop: 18, marginBottom: 10, fontSize: 10, letterSpacing: 1, color: "#00d4ff" }}>INPUTS EXECUTIVOS DA INICIATIVA</div>
              <div className="mod-field">
                <label className="mod-field__label">STATUS EXECUTIVO</label>
                <select className="mod-select" value={form.executive_status} onChange={e => setForm(f => ({ ...f, executive_status: e.target.value }))}>
                  <option value="not_started">NOT STARTED</option>
                  <option value="on_track">ON TRACK</option>
                  <option value="attention">ATTENTION</option>
                  <option value="blocked">BLOCKED</option>
                  <option value="waiting_owner">WAITING OWNER</option>
                  <option value="completed">COMPLETED</option>
                </select>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">OWNER</label>
                  <input className="mod-input" value={form.executive_owner_name} onChange={e => setForm(f => ({ ...f, executive_owner_name: e.target.value }))} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">OWNER MEMBER ID</label>
                  <input className="mod-input" type="number" value={form.owner_member_id} onChange={e => setForm(f => ({ ...f, owner_member_id: e.target.value }))} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">SPONSOR STAKEHOLDER ID</label>
                  <input className="mod-input" type="number" value={form.sponsor_stakeholder_id} onChange={e => setForm(f => ({ ...f, sponsor_stakeholder_id: e.target.value }))} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">ÁREA PRINCIPAL (COMPANY AREA ID)</label>
                  <input className="mod-input" type="number" value={form.primary_company_area_id} onChange={e => setForm(f => ({ ...f, primary_company_area_id: e.target.value }))} />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">RESUMO EXECUTIVO</label>
                <textarea className="mod-textarea" value={form.executive_summary} onChange={e => setForm(f => ({ ...f, executive_summary: e.target.value }))} />
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">RISCO / DEPENDÊNCIA</label>
                  <textarea className="mod-textarea" value={form.executive_risk_dependency} onChange={e => setForm(f => ({ ...f, executive_risk_dependency: e.target.value }))} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">PRÓXIMO PASSO</label>
                  <textarea className="mod-textarea" value={form.executive_next_step} onChange={e => setForm(f => ({ ...f, executive_next_step: e.target.value }))} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">ATUALIZADO POR</label>
                  <input className="mod-input" value={form.executive_updated_by} onChange={e => setForm(f => ({ ...f, executive_updated_by: e.target.value }))} />
                </div>
                <div className="mod-field" style={{ justifyContent: "flex-end", display: "flex", alignItems: "flex-end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#d6f3ff", fontSize: 11 }}>
                    <input type="checkbox" checked={form.attention_flag} onChange={e => setForm(f => ({ ...f, attention_flag: e.target.checked }))} />
                    MARCAR COMO PONTO DE ATENÇÃO
                  </label>
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">MOTIVO DE ATENÇÃO</label>
                <textarea className="mod-textarea" value={form.attention_reason} onChange={e => setForm(f => ({ ...f, attention_reason: e.target.value }))} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn-save" onClick={saveOverview} disabled={savingOverview || !form.title.trim()}>{savingOverview ? "SALVANDO..." : "SALVAR RESUMO"}</button>
              </div>
            </div>
          )}

          {activeTab === "backlog" && (
            <div className="mod-table-wrap" style={{ padding: 16 }}>
              <div className="mod-field">
                <label className="mod-field__label">MAPEAMENTO DE ITENS DO BACKLOG</label>

                <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: "#7899b0", fontSize: 11 }}>
                      {selectedBacklogIds.length} mapeado(s) • {availableBacklogOptions.length} disponível(is)
                    </span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        className="btn-icon"
                        type="button"
                        onClick={() => setShowBacklogPicker(current => !current)}
                      >
                        {showBacklogPicker ? "OCULTAR ITENS DISPONÍVEIS" : "NOVO MAPEAMENTO"}
                      </button>
                    </div>
                  </div>

                  {showBacklogPicker && (
                    <div style={{ display: "grid", gap: 10 }}>
                      <input
                        className="mod-input"
                        value={backlogQuery}
                        onChange={e => setBacklogQuery(e.target.value)}
                        placeholder="Buscar por ID, título, tipo ou status..."
                      />
                      <div className="mod-field-row" style={{ marginBottom: 0 }}>
                        <div className="mod-field">
                          <label className="mod-field__label">FILTRAR POR TIPO</label>
                          <select className="mod-select" value={backlogTypeFilter} onChange={e => setBacklogTypeFilter(e.target.value)}>
                            <option value="">TODOS</option>
                            {backlogTypeOptions.map(typeName => (
                              <option key={typeName} value={typeName}>{typeName.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mod-field">
                          <label className="mod-field__label">FILTRAR POR STATUS</label>
                          <select className="mod-select" value={backlogStatusFilter} onChange={e => setBacklogStatusFilter(e.target.value)}>
                            <option value="">TODOS</option>
                            {backlogStatusOptions.map(statusValue => (
                              <option key={statusValue} value={statusValue}>{statusValue.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#d6f3ff", fontSize: 11 }}>
                          <input type="checkbox" checked={showSelectedOnly} onChange={() => setShowSelectedOnly(v => !v)} />
                          Mostrar apenas itens selecionados
                        </label>
                        <button
                          className="btn-icon"
                          type="button"
                          onClick={() => {
                            setBacklogQuery("");
                            setBacklogTypeFilter("");
                            setBacklogStatusFilter("");
                            setShowSelectedOnly(false);
                          }}
                        >
                          LIMPAR FILTROS
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff" }}>ITENS MAPEADOS À INICIATIVA</div>
                      {selectedBacklog.length > 0 && (
                        <button className="btn-icon btn-icon--danger" type="button" onClick={() => setSelectedBacklogIds([])}>
                          LIMPAR SELEÇÃO
                        </button>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ border: "1px solid rgba(0,212,255,0.18)", background: "rgba(2,12,24,0.35)", maxHeight: 560, overflowY: "auto" }}>
                        {selectedBacklog.length === 0 ? (
                          <div style={{ color: "#7899b0", fontSize: 11, padding: 12 }}>Nenhum item associado.</div>
                        ) : (
                          selectedBacklog.map((backlogItem, index) => {
                            const isExpanded = expandedBacklogItemId === backlogItem.item_id;
                            return (
                              <div
                                key={backlogItem.item_id}
                                style={{
                                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                                  background: isExpanded ? "rgba(0,212,255,0.08)" : "transparent",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedBacklogItemId(isExpanded ? null : backlogItem.item_id)}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    border: "none",
                                    background: "transparent",
                                    color: "#d6f3ff",
                                    padding: 12,
                                    cursor: "pointer",
                                    display: "grid",
                                    gap: 6,
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        #{backlogItem.item_id} — {backlogItem.title}
                                      </div>
                                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                                        {(backlogItem.item_type_name ?? "SEM TIPO").toUpperCase()} • {backlogItem.current_status.toUpperCase()}
                                      </div>
                                      <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                                        Status do backlog: {backlogItem.current_status.toUpperCase()}
                                      </div>
                                      {backlogItem.assigned_to_name && (
                                        <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>
                                          Responsável: {backlogItem.assigned_to_name}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 10, color: isExpanded ? "#00d4ff" : "#7899b0" }}>
                                      {isExpanded ? "OCULTAR" : "ABRIR"}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {backlogItem.attention_flag && (
                                      <span style={{ border: "1px solid rgba(255,106,106,0.45)", color: "#ff9f9f", padding: "2px 6px", fontSize: 9 }}>
                                        ATENÇÃO
                                      </span>
                                    )}
                                    {(backlogItem.start_sprint_date || backlogItem.end_sprint_date) && (
                                      <span style={{ border: "1px solid rgba(0,212,255,0.35)", color: "#9fe7ff", padding: "2px 6px", fontSize: 9 }}>
                                        {`JANELA: ${backlogItem.start_sprint_date ? backlogItem.start_sprint_date.slice(0, 10) : "—"} → ${backlogItem.end_sprint_date ? backlogItem.end_sprint_date.slice(0, 10) : "—"}`}
                                      </span>
                                    )}
                                    <span style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#7899b0", padding: "2px 6px", fontSize: 9 }}>
                                      ORDEM {backlogItem.display_order ?? index}
                                    </span>
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div style={{ padding: "0 12px 12px 12px", display: "grid", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                                      <div>
                                        <div style={{ color: "#d6f3ff", fontSize: 13 }}>#{backlogItem.item_id} — {backlogItem.title}</div>
                                        <div style={{ color: "#7899b0", fontSize: 10, marginTop: 4 }}>
                                          {(backlogItem.item_type_name ?? "SEM TIPO").toUpperCase()} • {backlogItem.current_status.toUpperCase()}
                                          {backlogItem.ado_id ? ` • ADO ID: ${backlogItem.ado_id}` : ""}
                                        </div>
                                      </div>
                                      <button className="btn-icon btn-icon--danger" type="button" onClick={() => toggleBacklogItem(backlogItem.item_id)}>
                                        REMOVER
                                      </button>
                                    </div>

                                    <div style={{ display: "grid", gap: 8, border: "1px solid rgba(255,255,255,0.05)", padding: 10 }}>
                                      <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff" }}>DADOS ORIGINADOS DO BACKLOG</div>
                                      <div style={{ color: "#d6f3ff", fontSize: 11 }}>
                                        <strong>DESCRIPTION:</strong>
                                      </div>
                                      <div style={{ color: "#7899b0", fontSize: 11, whiteSpace: "pre-wrap" }}>
                                        {(backlogItem as RoadmapBacklogItem & { description?: string }).description?.trim() || "Sem descrição cadastrada no backlog."}
                                      </div>
                                      <div style={{ color: "#d6f3ff", fontSize: 11 }}>
                                        <strong>ASSIGNED TO:</strong> {backlogItem.assigned_to_name ?? "— NÃO ATRIBUÍDO —"}
                                      </div>
                                      <div style={{ color: "#d6f3ff", fontSize: 11 }}>
                                        <strong>SPRINT START:</strong> {backlogItem.start_sprint_name ?? "— SEM SPRINT —"}
                                        {backlogItem.start_sprint_date ? ` (${backlogItem.start_sprint_date.slice(0, 10)})` : ""}
                                      </div>
                                      <div style={{ color: "#d6f3ff", fontSize: 11 }}>
                                        <strong>SPRINT END:</strong> {backlogItem.end_sprint_name ?? "— SEM SPRINT —"}
                                        {backlogItem.end_sprint_date ? ` (${backlogItem.end_sprint_date.slice(0, 10)})` : ""}
                                      </div>
                                      <div style={{ color: "#d6f3ff", fontSize: 11 }}>
                                        <strong>STATUS:</strong> {backlogItem.current_status.toUpperCase()}
                                      </div>
                                      <div style={{ color: "#d6f3ff", fontSize: 11 }}>
                                        <strong>DEPENDÊNCIAS / LINKS:</strong>
                                      </div>
                                      <div style={{ display: "grid", gap: 6 }}>
                                        {(backlogItem.dependency_summary ?? []).length === 0 ? (
                                          <div style={{ color: "#7899b0", fontSize: 11 }}>Nenhum link/dependência mapeado no backlog.</div>
                                        ) : (
                                          backlogItem.dependency_summary?.map((entry, idx) => (
                                            <div key={`${backlogItem.item_id}-dep-${idx}`} style={{ color: "#7899b0", fontSize: 11 }}>
                                              • {entry}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                      <div style={{ color: "#7899b0", fontSize: 10 }}>
                                        Para registrar risco formal, usar o módulo RISKS. Para dependência, usar os links do item no BACKLOG.
                                      </div>
                                    </div>

                                    <div className="mod-field">
                                      <label className="mod-field__label">ORDEM</label>
                                      <input
                                        className="mod-input"
                                        type="number"
                                        value={backlogItem.display_order ?? 0}
                                        onChange={e => updateSelectedBacklogExecutiveField(backlogItem.item_id, "display_order", Number(e.target.value))}
                                      />
                                    </div>

                                    <BacklogNotesHistoryPanel
                                      backlogItemId={backlogItem.item_id}
                                      currentUserName={CURRENT_USER_NAME}
                                      title="NOTES & HISTORY COMPARTILHADO"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {showBacklogPicker && (
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff", marginBottom: 8 }}>ITENS DISPONÍVEIS PARA MAPEAR</div>
                      <div style={{ border: "1px solid rgba(0,212,255,0.2)", padding: 10, maxHeight: 360, overflowY: "auto", background: "rgba(2,12,24,0.45)" }}>
                        {loadingBacklog ? <div style={{ color: "#7899b0", fontSize: 11 }}>CARREGANDO ITENS...</div> : backlogOptions.length === 0 ? (
                          <div style={{ color: "#7899b0", fontSize: 11 }}>Nenhum item de backlog disponível para o produto selecionado.</div>
                        ) : availableBacklogOptions.length === 0 ? (
                          <div style={{ color: "#7899b0", fontSize: 11 }}>Nenhum item disponível com os filtros informados.</div>
                        ) : (
                          availableBacklogOptions.map(option => (
                            <label key={option.item_id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <input type="checkbox" checked={selectedBacklogIds.includes(option.item_id)} onChange={() => toggleBacklogItem(option.item_id)} />
                              <span style={{ display: "grid", gap: 4, width: "100%" }}>
                                <span style={{ color: "#d6f3ff", fontSize: 12 }}>#{option.item_id} — {option.title}</span>
                                <span style={{ color: "#7899b0", fontSize: 10 }}>
                                  {(option.item_type_name ?? "SEM TIPO").toUpperCase()} • {option.current_status.toUpperCase()}
                                  {option.ado_id ? ` • ADO ID: ${option.ado_id}` : ""}
                                  {option.assigned_to_name ? ` • RESPONSÁVEL: ${option.assigned_to_name}` : ""}
                                </span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn-cancel" onClick={saveBacklog} disabled={savingBacklog}>{savingBacklog ? "SALVANDO..." : "SALVAR MAPEAMENTO"}</button>
              </div>
            </div>
          )}

          {activeTab === "charter" && (
            <div className="mod-table-wrap" style={{ padding: 16 }}>
              <div className="mod-field"><label className="mod-field__label">NOME DO PROJETO</label><input className="mod-input" value={charterForm.project_name} onChange={e => setCharterForm(f => ({ ...f, project_name: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">PROPÓSITO DO PROJETO</label><textarea className="mod-textarea" value={charterForm.project_purpose} onChange={e => setCharterForm(f => ({ ...f, project_purpose: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">OBJETIVO DE NEGÓCIO</label><textarea className="mod-textarea" value={charterForm.business_objective} onChange={e => setCharterForm(f => ({ ...f, business_objective: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">OBJETIVOS</label><textarea className="mod-textarea" value={charterForm.objectives} onChange={e => setCharterForm(f => ({ ...f, objectives: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">ESCOPO IN</label><textarea className="mod-textarea" value={charterForm.scope_in} onChange={e => setCharterForm(f => ({ ...f, scope_in: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">ESCOPO OUT</label><textarea className="mod-textarea" value={charterForm.scope_out} onChange={e => setCharterForm(f => ({ ...f, scope_out: e.target.value }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">CRITÉRIOS DE SUCESSO</label><textarea className="mod-textarea" value={charterForm.success_criteria} onChange={e => setCharterForm(f => ({ ...f, success_criteria: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">REQUISITOS DE ALTO NÍVEL</label><textarea className="mod-textarea" value={charterForm.high_level_requirements} onChange={e => setCharterForm(f => ({ ...f, high_level_requirements: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">PRINCIPAIS ENTREGÁVEIS</label><textarea className="mod-textarea" value={charterForm.major_deliverables} onChange={e => setCharterForm(f => ({ ...f, major_deliverables: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">CRONOGRAMA MACRO</label><textarea className="mod-textarea" value={charterForm.high_level_timeline} onChange={e => setCharterForm(f => ({ ...f, high_level_timeline: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">ORÇAMENTO</label><textarea className="mod-textarea" value={charterForm.budget_summary} onChange={e => setCharterForm(f => ({ ...f, budget_summary: e.target.value }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">RISCOS</label><textarea className="mod-textarea" value={charterForm.risks_summary} onChange={e => setCharterForm(f => ({ ...f, risks_summary: e.target.value }))} /></div>
              <div className="mod-field"><label className="mod-field__label">PREMISSAS E RESTRIÇÕES</label><textarea className="mod-textarea" value={charterForm.assumptions_constraints} onChange={e => setCharterForm(f => ({ ...f, assumptions_constraints: e.target.value }))} /></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">SPONSOR</label><input className="mod-input" value={charterForm.sponsor_name} onChange={e => setCharterForm(f => ({ ...f, sponsor_name: e.target.value }))} /></div>
                <div className="mod-field"><label className="mod-field__label">PROJECT MANAGER</label><input className="mod-input" value={charterForm.project_manager_name} onChange={e => setCharterForm(f => ({ ...f, project_manager_name: e.target.value }))} /></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">STATUS</label><select className="mod-select" value={charterForm.status} onChange={e => setCharterForm(f => ({ ...f, status: e.target.value }))}><option value="draft">DRAFT</option><option value="approved">APPROVED</option><option value="in_execution">IN EXECUTION</option><option value="on_hold">ON HOLD</option><option value="closed">CLOSED</option></select></div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 6 }}>
                {charterOk && <span style={{ fontSize: 10, color: "#00ff88" }}>✓</span>}
                <button className="btn-save" onClick={saveCharter} disabled={savingCharter || !charterForm.project_name.trim()}>{savingCharter ? "SALVANDO..." : "SALVAR PROJECT CHARTER"}</button>
              </div>
            </div>
          )}

          {activeTab === "requirements" && (
            <div className="mod-table-wrap" style={{ padding: 16, display: "grid", gap: 16 }}>
              <div style={{ color: "#7899b0", fontSize: 11, lineHeight: 1.6, padding: "10px 12px", border: "1px solid rgba(0,212,255,0.12)", background: "rgba(0,212,255,0.03)" }}>
                Transição de DEFINE: requisitos derivados desta iniciativa do roadmap.
                Cada requirement pode seguir para DELIVERY via vínculos explícitos com itens de backlog no módulo Requirements.
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff" }}>REQUISITOS VINCULADOS À INICIATIVA</div>
                <div style={{ border: "1px solid rgba(0,212,255,0.18)", background: "rgba(2,12,24,0.35)" }}>
                  {requirements.length === 0 ? (
                    <div style={{ color: "#7899b0", fontSize: 11, padding: 12 }}>Nenhum requisito gerado a partir desta iniciativa.</div>
                  ) : (
                    requirements.map(req => (
                      <div key={req.id} style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ color: "#d6f3ff", fontSize: 12 }}>{req.requirement_code} — {req.requirement_title}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ color: "#7899b0", fontSize: 10 }}>{req.requirement_type} • {req.priority} • {req.lifecycle_status}</div>
                            <button className="btn-icon" type="button" onClick={() => navigate(`/modules/requirements?highlight=${req.id}`)}>ABRIR</button>
                          </div>
                        </div>
                        <div style={{ color: "#7899b0", fontSize: 11, whiteSpace: "pre-wrap" }}>{req.requirement_description}</div>
                        {req.requirement_owner && <div style={{ color: "#7899b0", fontSize: 10 }}>Owner: {req.requirement_owner}</div>}
                        {(deliveryBacklogByRequirement[req.id] ?? []).length > 0 && (
                          <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                            <div style={{ color: "#00d4ff", fontSize: 9, letterSpacing: 1 }}>DELIVERY LINKS</div>
                            {(deliveryBacklogByRequirement[req.id] ?? []).map(link => (
                              <div key={`${req.id}-${link.backlog_item_id}`} style={{ color: "#9fe7ff", fontSize: 10 }}>
                                #{link.backlog_item_id} — {link.title} [{link.current_status}]
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff" }}>NOVO REQUIREMENT A PARTIR DA INICIATIVA</div>
                <div style={{ color: "#7899b0", fontSize: 11, lineHeight: 1.6, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  Sugestão de insumo para DEFINE: use os campos de <strong>Requisitos de Alto Nível</strong>, <strong>Critérios de Sucesso</strong> e <strong>Principais Entregáveis</strong> do Project Charter para estruturar os requirements.
                  O Product Lab já suporta o próximo gate operacional no módulo Requirements: requirement validado/aprovado → delivery backlog.
                </div>
                <div className="mod-field-row">
                  <div className="mod-field">
                    <label className="mod-field__label">CÓDIGO</label>
                    <input className="mod-input" value={requirementForm.requirement_code} onChange={e => setRequirementForm(f => ({ ...f, requirement_code: e.target.value }))} />
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">OWNER</label>
                    <input className="mod-input" value={requirementForm.requirement_owner} onChange={e => setRequirementForm(f => ({ ...f, requirement_owner: e.target.value }))} />
                  </div>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">TÍTULO</label>
                  <input className="mod-input" value={requirementForm.requirement_title} onChange={e => setRequirementForm(f => ({ ...f, requirement_title: e.target.value }))} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">DESCRIÇÃO</label>
                  <textarea className="mod-textarea" value={requirementForm.requirement_description} onChange={e => setRequirementForm(f => ({ ...f, requirement_description: e.target.value }))} />
                </div>
                <div className="mod-field-row">
                  <div className="mod-field">
                    <label className="mod-field__label">INSUMO DO CHARTER · REQUISITOS DE ALTO NÍVEL</label>
                    <textarea className="mod-textarea" value={charterForm.high_level_requirements} onChange={e => setCharterForm(f => ({ ...f, high_level_requirements: e.target.value }))} />
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">INSUMO DO CHARTER · CRITÉRIOS DE SUCESSO</label>
                    <textarea className="mod-textarea" value={charterForm.success_criteria} onChange={e => setCharterForm(f => ({ ...f, success_criteria: e.target.value }))} />
                  </div>
                </div>
                <div className="mod-field-row">
                  <div className="mod-field">
                    <label className="mod-field__label">TIPO</label>
                    <select className="mod-select" value={requirementForm.requirement_type} onChange={e => setRequirementForm(f => ({ ...f, requirement_type: e.target.value }))}>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="FUNCTIONAL">FUNCTIONAL</option>
                      <option value="NON_FUNCTIONAL">NON FUNCTIONAL</option>
                      <option value="DATA">DATA</option>
                      <option value="INTEGRATION">INTEGRATION</option>
                      <option value="SECURITY">SECURITY</option>
                      <option value="COMPLIANCE">COMPLIANCE</option>
                      <option value="UX">UX</option>
                    </select>
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">PRIORIDADE</label>
                    <select className="mod-select" value={requirementForm.priority} onChange={e => setRequirementForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">ACCEPTANCE DEFINITION</label>
                  <textarea className="mod-textarea" value={requirementForm.acceptance_definition} onChange={e => setRequirementForm(f => ({ ...f, acceptance_definition: e.target.value }))} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-icon"
                      type="button"
                      onClick={() => setRequirementForm(f => ({
                        ...f,
                        requirement_description: [
                          f.requirement_description,
                          charterForm.high_level_requirements ? `High-level requirements:\n${charterForm.high_level_requirements}` : "",
                          charterForm.success_criteria ? `\nSuccess criteria:\n${charterForm.success_criteria}` : "",
                          charterForm.major_deliverables ? `\nMajor deliverables:\n${charterForm.major_deliverables}` : "",
                        ].filter(Boolean).join("\n\n"),
                      }))}
                    >
                      IMPORTAR DO CHARTER
                    </button>
                    {lastCreatedRequirementId && (
                      <button className="btn-icon" type="button" onClick={() => navigate(`/modules/requirements?highlight=${lastCreatedRequirementId}`)}>
                        IR PARA ÚLTIMO REQUIREMENT
                      </button>
                    )}
                  </div>
                  <button className="btn-save" onClick={saveRequirement} disabled={savingRequirement || !requirementForm.requirement_code.trim() || !requirementForm.requirement_title.trim() || !requirementForm.requirement_description.trim()}>
                    {savingRequirement ? "SALVANDO..." : "CRIAR REQUIREMENT"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "raci" && (
            <div className="mod-table-wrap" style={{ padding: 16, display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff", marginBottom: 8 }}>NÍVEL 1 · RACI DA INICIATIVA</div>
                <div style={{ color: "#7899b0", fontSize: 11, marginBottom: 10 }}>
                  Governança macro da iniciativa no roadmap.
                </div>
                <RaciPanel objectType="ROADMAP" objectId={Number(item.id)} productId={item.product_id} />
              </div>

              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#00d4ff", marginBottom: 8 }}>NÍVEL 2 · RACI POR ITEM DE BACKLOG MAPEADO</div>
                <div style={{ color: "#7899b0", fontSize: 11, marginBottom: 10 }}>
                  Disponível somente para itens mapeados do tipo EPIC ou FEATURE.
                </div>

                {eligibleBacklogItemsForRaci.length === 0 ? (
                  <div style={{ border: "1px solid rgba(0,212,255,0.18)", padding: 12, color: "#7899b0", fontSize: 11, background: "rgba(2,12,24,0.35)" }}>
                    Nenhum item elegível. Para configurar RACI por frente, associe à iniciativa itens de backlog do tipo EPIC ou FEATURE.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div className="mod-field" style={{ marginBottom: 0 }}>
                      <label className="mod-field__label">ITEM DE BACKLOG</label>
                      <select
                        className="mod-select"
                        value={selectedRaciBacklogItemId}
                        onChange={e => setSelectedRaciBacklogItemId(e.target.value ? Number(e.target.value) : "")}
                      >
                        {eligibleBacklogItemsForRaci.map(backlogItem => (
                          <option key={backlogItem.item_id} value={backlogItem.item_id}>
                            #{backlogItem.item_id} — {backlogItem.title} ({(backlogItem.item_type_name ?? "ITEM").toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedRaciBacklogItem && (
                      <div style={{ border: "1px solid rgba(0,212,255,0.18)", padding: 12, background: "rgba(2,12,24,0.2)" }}>
                        <div style={{ color: "#d6f3ff", fontSize: 12, marginBottom: 4 }}>
                          #{selectedRaciBacklogItem.item_id} — {selectedRaciBacklogItem.title}
                        </div>
                        <div style={{ color: "#7899b0", fontSize: 10, marginBottom: 10 }}>
                          {(selectedRaciBacklogItem.item_type_name ?? "ITEM").toUpperCase()} • {selectedRaciBacklogItem.current_status.toUpperCase()}
                          {selectedRaciBacklogItem.ado_id ? ` • ADO ID: ${selectedRaciBacklogItem.ado_id}` : ""}
                        </div>
                        <RaciPanel objectType="BACKLOG" objectId={selectedRaciBacklogItem.item_id} productId={item.product_id} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
