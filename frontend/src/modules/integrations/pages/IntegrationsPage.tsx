import { useEffect, useState } from "react";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";

interface FieldSchema { field_key:string; field_label:string; field_type:string; is_secret:boolean; is_required:boolean; options?:{value:string;label:string}[]|null; hint?:string; placeholder?:string; sort_order:number; }
interface Connection { id:string; name:string; description?:string; provider:string; scope:string; company_id?:number; product_id?:number; params:Record<string,string>; has_secrets:boolean; is_active:boolean; last_sync_at?:string; last_error?:string; created_at:string; updated_at:string; }
interface AxetFlowsDiscoveryResult { runtime_available:boolean; running:boolean; healthy?:boolean|null; container_id?:string|null; image?:string|null; internal_port:number; host_port?:number|null; resolved_url?:string|null; status:string; error?:string|null; last_checked?:string|null; }
interface SyncLog { id:string; connection_id:string; operation_type:string; status:string; started_at:string; finished_at?:string; items_created:number; items_updated:number; items_skipped:number; error_message?:string; details?:Record<string,number>; }

// ── AI Analyze types ──────────────────────────────────────────────────────────
interface AnalyzeOpportunity { title:string; description?:string; source?:string; business_impact?:string; confidence?:string; }
interface AnalyzeRequirement { title:string; description?:string; type?:string; priority?:string; acceptance_criteria?:string; }
interface AnalyzeRisk        { title:string; description?:string; category?:string; probability?:string; impact?:string; mitigation_suggestion?:string; }
interface AnalyzeBacklog     { title:string; description?:string; type?:string; priority?:number; acceptance_criteria?:string; story_points_estimate?:number; }
interface AnalyzeDecision    { title:string; description?:string; decision_type?:string; status?:string; rationale?:string; impact?:string; }
interface AnalyzeFollowup    { title:string; description?:string; responsible_hint?:string; due_date_hint?:string; priority?:string; }
interface AnalyzeStakeholder { name:string; role?:string; organization?:string; influence?:string; interest?:string; notes?:string; }
interface AnalyzeInsight     { title:string; description?:string; category?:string; }
interface AnalyzeResult {
  opportunities: AnalyzeOpportunity[];
  requirements:  AnalyzeRequirement[];
  risks:         AnalyzeRisk[];
  backlog:       AnalyzeBacklog[];
  decisions:     AnalyzeDecision[];
  followups:     AnalyzeFollowup[];
  stakeholders:  AnalyzeStakeholder[];
  insights:      AnalyzeInsight[];
}

interface DiffItem { ado_id:string; title:string; item_type:string; ado_state:string; mapped_status:string; story_points?:number; action:string; item_id?:number; current_status?:string; diffs?:Record<string,{pl:string;ado:string}>; }
interface DiffSprint { ado_path:string; name:string; start_date?:string; end_date?:string; mapped_status:string; action:string; sprint_id?:number; diffs?:Record<string,{pl:string;ado:string}>; }
interface PreviewResult {
  summary: { items_new:number; items_modified:number; items_equal:number; items_orphan:number; sprints_new:number; sprints_modified:number; sprints_equal:number; };
  items: { new:DiffItem[]; modified:DiffItem[]; equal:DiffItem[]; orphan:DiffItem[]; };
  sprints: { new:DiffSprint[]; modified:DiffSprint[]; equal:DiffSprint[]; };
}

interface DiagnosticsResult {
  connection: {
    id: string;
    name: string;
    product_id?: number;
    params: {
      org_url?: string;
      project?: string;
      area_path?: string;
      sync_types?: string[];
      sync_all_types?: boolean;
    };
  };
  query: {
    wiql: string;
    requested_types: string[];
  };
  ado: {
    total_work_items_returned: number;
    raw_work_item_types: Record<string, number>;
    resolved_work_item_types: Record<string, number>;
    enabler_types: Record<string, number>;
    total_iterations_returned: number;
    iteration_names_sample: string[];
    missing_optional_fields: string[];
    sample_items: {
      ado_id: string;
      title: string;
      raw_work_item_type: string;
      resolved_work_item_type: string;
      enabler_type?: string | null;
      state: string;
      iteration_path: string;
    }[];
  };
  preview: {
    summary: PreviewResult["summary"];
    item_types_visible_in_preview: Record<string, number>;
    sprint_names_new: string[];
    sprint_names_modified: string[];
  };
}

const PROVIDER_LABELS: Record<string,string> = { azure_devops:"ADO", openai:"OpenAI", anthropic:"Anthropic", azure_openai:"Azure OpenAI", axet_flows:"aXet Flows LLM", jira:"Jira", github:"GitHub", gitlab:"GitLab", slack:"Slack", teams:"Teams", webhook:"Webhook", custom:"Custom" };
const PROVIDER_COLORS: Record<string,string> = { azure_devops:"#0078D4", openai:"#00a67e", anthropic:"#c084fc", azure_openai:"#0078D4", axet_flows:"#c084fc", jira:"#2684FF", github:"#c8dce8", gitlab:"#FC6D26", slack:"#4A154B", teams:"#5059C9", webhook:"#00d4ff", custom:"#7899b0" };
const PROVIDER_ICONS: Record<string,string> = { azure_devops:"◈", openai:"◎", anthropic:"◇", azure_openai:"◈", axet_flows:"◉", jira:"⬡", github:"◉", gitlab:"◈", slack:"◈", teams:"⬢", webhook:"⟳", custom:"⚙" };
const SCOPE_COLORS: Record<string,string> = { global:"#00ff88", company:"#00d4ff", product:"#ff9900" };
const STATUS_COLORS: Record<string,string> = { completed:"#00ff88", running:"#00d4ff", failed:"#ff4466", partial:"#ff9900" };
const ADO_CONTROLLED_SYNC_TYPES = "Epic,Feature,User Story";

function ProviderBadge({ provider }:{ provider:string }) {
  const color = PROVIDER_COLORS[provider] || "#7899b0";
  const label = PROVIDER_LABELS[provider] || provider;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9, padding:"2px 6px", borderRadius:2, border:`1px solid ${color}44`, color, background:`${color}12`, fontFamily:"var(--font-mono,monospace)", letterSpacing:1 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }} />
      {label}
    </span>
  );
}

const fmtDate = (s?: string) => {
  if (!s) return "—";
  const utc = (s.includes("Z") || s.includes("+")) ? s : s.replace(" ", "T") + "Z";
  return new Date(utc).toLocaleString("pt-BR");
};

function Fld({ lbl, children }:{ lbl:string; children:React.ReactNode }) {
  return <div className="mod-field"><label className="mod-field__label">{lbl}</label>{children}</div>;
}

const AXET_FLOWS_MAIN_FIELDS = new Set<string>(["endpoint_mode", "scheme", "host", "port", "ask_path"]);
const AXET_FLOWS_ADVANCED_FIELDS = new Set(["timeout_seconds", "verify_tls", "request_question_field", "request_context_field", "response_answer_field", "status_path", "mode"]);

export default function IntegrationsPage() {
  useAuth();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [providers, setProviders] = useState<Record<string, FieldSchema[]>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [modal, setModal] = useState<"new"|"edit"|"logs"|"preview"|"analyze"|"diagnostics"|null>(null);
  const [selected, setSelected] = useState<Connection|null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [preview, setPreview] = useState<PreviewResult|null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult|null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [testResult, setTestResult] = useState<{ok:boolean;message:string}|null>(null);
  const [applyResult, setApplyResult] = useState<{status?:string;created?:number;updated?:number;message?:string}|null>(null);
  const [showAdvancedAxet, setShowAdvancedAxet] = useState(false);
  const [axetDiscovery, setAxetDiscovery] = useState<AxetFlowsDiscoveryResult | null>(null);
  const [axetDiscoveryLoading, setAxetDiscoveryLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSyncConnectionId, setActiveSyncConnectionId] = useState<string|null>(null);
  const [runningConnectionIds, setRunningConnectionIds] = useState<Set<string>>(new Set());
  const [refreshingAxetConnectionId, setRefreshingAxetConnectionId] = useState<string|null>(null);
  const [selItems, setSelItems] = useState<Set<string>>(new Set());
  const [selSprints, setSelSprints] = useState<Set<string>>(new Set());
  const [viewFilters, setViewFilters] = useState<Set<string>>(new Set());
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());

  // Analyze state
  const [analyzeText, setAnalyzeText]       = useState("");
  const [analyzeContext, setAnalyzeContext] = useState("");
  const [analyzing, setAnalyzing]           = useState(false);
  const [analyzeResult, setAnalyzeResult]   = useState<AnalyzeResult|null>(null);
  const [analyzeError, setAnalyzeError]     = useState("");
  const [analyzeTab, setAnalyzeTab]         = useState<keyof AnalyzeResult>("opportunities");

  const [form, setForm] = useState({
    name:"", description:"", provider:"azure_devops", scope:"product",
    company_id:"", product_id: productId,
    params:{} as Record<string,string>,
    secrets:{} as Record<string,string>,
    is_active: true,
  });

  useEffect(() => {
    apiGet<Record<string,FieldSchema[]>>("/integrations/providers").then(setProviders).catch(()=>{});
  }, []);

  const loadConnections = (pid = productId) => {
    setLoadingConnections(true);
    const qs = pid ? `?product_id=${pid}` : "";
    apiGet<Connection[]>(`/integrations/connections${qs}`).then(list => {
      apiGet<Connection[]>("/integrations/connections?scope=global").then(globals => {
        const ids = new Set(list.map(c=>c.id));
        setConnections([...list, ...globals.filter(g=>!ids.has(g.id))]);
      }).catch(()=>setConnections(list))
        .finally(() => setLoadingConnections(false));
    }).catch(()=>{
      setConnections([]);
      setLoadingConnections(false);
    });
  };

  useEffect(() => {
    const adoConns = connections.filter(c => c.provider === "azure_devops");
    if (!adoConns.length) return;
    let cancelled = false;
    Promise.all(adoConns.map(async c => {
      try {
        const rows = await apiGet<SyncLog[]>(`/integrations/connections/${c.id}/logs?limit=1`);
        return rows[0]?.status === "running" ? c.id : null;
      } catch { return null; }
    })).then(results => {
      if (cancelled) return;
      const running = new Set(results.filter(Boolean) as string[]);
      setRunningConnectionIds(running);
      if (running.size > 0) setActiveSyncConnectionId(prev => prev ?? [...running][0]);
    });
    return () => { cancelled = true; };
  }, [connections.length]);

  useEffect(() => { loadConnections(); }, [productId]);

  const handleProductChange = (id:string) => { localStorage.setItem("pl_product",id); setProductId(id); };

  const loadAxetDiscovery = async (connectionId?: string) => {
    setAxetDiscoveryLoading(true);
    try {
      const qs = connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : "";
      const data = await apiGet<AxetFlowsDiscoveryResult>(`/integrations/axet-flows/discovery${qs}`);
      setAxetDiscovery(data);
      setForm(p => {
        const nextParams = { ...p.params };
        if (data.host_port != null) nextParams.port = String(data.host_port);
        if (data.resolved_url) nextParams.resolved_url = data.resolved_url;
        else delete nextParams.resolved_url;
        return { ...p, params: nextParams };
      });
    } catch {
      setAxetDiscovery(null);
    } finally {
      setAxetDiscoveryLoading(false);
    }
  };

  const refreshAxetRuntime = async (connection?: Connection) => {
    const id = connection?.id || selected?.id;
    if (!id) {
      await loadAxetDiscovery();
      return;
    }

    if (connection) setRefreshingAxetConnectionId(id);
    else setAxetDiscoveryLoading(true);

    try {
      const result = await apiPost<{ ok: boolean; message: string; connection: Connection; discovery: AxetFlowsDiscoveryResult }>(
        `/integrations/connections/${id}/refresh`,
        {},
      );
      if (!connection) {
        setAxetDiscovery(result.discovery);
        setSelected(result.connection);
        setForm(p => ({ ...p, params: { ...result.connection.params } }));
      }
      setConnections(prev => prev.map(conn => conn.id === result.connection.id ? result.connection : conn));
    } catch {
      if (!connection) setAxetDiscovery(null);
    } finally {
      if (connection) setRefreshingAxetConnectionId(null);
      else setAxetDiscoveryLoading(false);
    }
  };

  const openNew = () => {
    setForm({
      name:"",
      description:"",
      provider:"azure_devops",
      scope:"product",
      company_id:"",
      product_id:productId,
      params:{ sync_types: ADO_CONTROLLED_SYNC_TYPES, sync_all_types: "false", endpoint_mode: "auto_discovery" },
      secrets:{},
      is_active:true
    });
    setShowAdvancedAxet(false);
    setAxetDiscovery(null);
    setTestResult(null); setError(""); setSelected(null); setModal("new");
  };

  const openEdit = (c:Connection) => {
    setSelected(c);
    const normalizedParams = { ...c.params };
    if (c.provider === "azure_devops") {
      normalizedParams.sync_types = normalizedParams.sync_types || ADO_CONTROLLED_SYNC_TYPES;
      normalizedParams.sync_all_types = normalizedParams.sync_all_types || "false";
    }
    if (c.provider === "axet_flows") {
      normalizedParams.endpoint_mode = normalizedParams.endpoint_mode || "auto_discovery";
    }
    setForm({
      name:c.name,
      description:c.description??"",
      provider:c.provider,
      scope:c.scope,
      company_id:c.company_id?String(c.company_id):"",
      product_id:c.product_id?String(c.product_id):productId,
      params: normalizedParams,
      secrets:{},
      is_active:c.is_active
    });
    setShowAdvancedAxet(false);
    setAxetDiscovery(null);
    setTestResult(null); setError(""); setModal("edit");
  };

  const loadLogs = async (connectionId: string) => {
    try { setLogs(await apiGet<SyncLog[]>(`/integrations/connections/${connectionId}/logs`)); }
    catch { setLogs([]); }
  };

  const openAnalyze = (c:Connection) => {
    setSelected(c);
    setAnalyzeText(""); setAnalyzeContext(""); setAnalyzeResult(null); setAnalyzeError("");
    setAnalyzeTab("opportunities");
    setModal("analyze");
  };

  const runAnalyze = async () => {
    if (!selected || !analyzeText.trim()) return;
    setAnalyzing(true); setAnalyzeResult(null); setAnalyzeError("");
    try {
      const r = await apiPost<AnalyzeResult>(`/integrations/connections/${selected.id}/analyze`, {
        text: analyzeText,
        context: analyzeContext.trim() || null,
      });
      setAnalyzeResult(r);
      const keys: (keyof AnalyzeResult)[] = ["opportunities","requirements","risks","backlog","decisions","followups","stakeholders","insights"];
      const first = keys.find(k => r[k]?.length > 0);
      if (first) setAnalyzeTab(first);
    } catch(e:any) { setAnalyzeError(e?.message || e?.detail || "Erro ao chamar a IA"); }
    finally { setAnalyzing(false); }
  };

  const openLogs = async (c:Connection) => {
    setSelected(c); await loadLogs(c.id); setModal("logs");
  };

  const openDiagnostics = async (c:Connection) => {
    setSelected(c); setDiagnosing(true); setDiagnostics(null); setError("");
    try {
      const result = await apiGet<DiagnosticsResult>(`/integrations/connections/${c.id}/sync/diagnostics`);
      setDiagnostics(result);
      setModal("diagnostics");
    } catch(e:any) { setError(e?.message || e?.detail || "Erro ao executar diagnóstico ADO"); }
    finally { setDiagnosing(false); }
  };

  const openPreview = async (c:Connection) => {
    setSelected(c); setPreviewing(true); setPreview(null); setError("");
    setSelItems(new Set()); setSelSprints(new Set()); setApplyResult(null); setViewFilters(new Set()); setTypeFilters(new Set());
    try {
      const result = await apiPost<PreviewResult>(`/integrations/connections/${c.id}/sync/preview`, {});
      setPreview(result);
      const autoItems = new Set([...result.items.new.map(i=>i.ado_id), ...result.items.modified.map(i=>i.ado_id)]);
      const autoSprints = new Set([...result.sprints.new.map(s=>s.ado_path), ...result.sprints.modified.map(s=>s.ado_path)]);
      setSelItems(autoItems); setSelSprints(autoSprints);
      setModal("preview");
    } catch(e:any) { setError(e?.message || e?.detail || "Erro ao buscar preview do ADO"); }
    finally { setPreviewing(false); }
  };

  const applySelected = async () => {
    if (!selected) return;
    setApplying(true); setApplyResult(null);
    try {
      const r = await apiPost<{status?:string;log_id?:string;message?:string}>(
        `/integrations/connections/${selected.id}/sync/apply`,
        { item_ado_ids: [...selItems], sprint_ado_paths: [...selSprints] }
      );
      setApplyResult({ status: r.status, message: r.message });
      if (r.log_id) {
        setActiveSyncConnectionId(selected.id);
        setRunningConnectionIds(prev => new Set(prev).add(selected.id));
      }
      loadConnections();
    } catch(e:any) { setError(e?.message || e?.detail || "Erro ao aplicar sync"); }
    finally { setApplying(false); }
  };

  useEffect(() => {
    if ((modal === "new" || modal === "edit") && form.provider === "axet_flows") {
      loadAxetDiscovery(selected?.id);
    }
  }, [modal, form.provider, selected?.id, form.params.endpoint_mode]);

  const currentFields = (providers[form.provider] || []).sort((a,b)=>a.sort_order-b.sort_order);
  const isAxetFlowsProvider = form.provider === "axet_flows";
  const axetEndpointMode = form.params.endpoint_mode || "auto_discovery";
  const isAxetAutoDiscoveryMode = isAxetFlowsProvider && axetEndpointMode !== "fixed_port";

  const visibleFields = isAxetFlowsProvider
    ? currentFields.filter(f => AXET_FLOWS_MAIN_FIELDS.has(f.field_key))
    : currentFields;

  const advancedAxetFields = isAxetFlowsProvider
    ? currentFields.filter(f => AXET_FLOWS_ADVANCED_FIELDS.has(f.field_key))
    : [];

  const persistedResolvedUrl = form.params.resolved_url || form.params.port
    ? `${form.params.scheme || "http"}://${form.params.host || "localhost"}${form.params.port ? `:${form.params.port}` : ""}${(form.params.ask_path || "/pergunta").startsWith("/") ? (form.params.ask_path || "/pergunta") : `/${form.params.ask_path || "pergunta"}`}`
    : "";

  const isAxetRuntimeAvailableNow = axetDiscovery?.status === "available" || axetDiscovery?.status === "starting" || axetDiscovery?.status === "running" || axetDiscovery?.status === "port_not_resolved" || axetDiscovery?.status === "fixed_port";
  const shouldShowResolvedNow = Boolean(axetDiscovery?.resolved_url && (isAxetAutoDiscoveryMode ? isAxetRuntimeAvailableNow : true));
  const shouldShowLastKnown = Boolean(!shouldShowResolvedNow && persistedResolvedUrl);

  const setField = (key:string, val:string, isSecret:boolean) => {
    if (isSecret) setForm(p=>({...p, secrets:{...p.secrets,[key]:val}}));
    else          setForm(p=>({...p, params:{...p.params,[key]:val}}));
  };
  const getFieldVal = (key:string, isSecret:boolean) =>
    isSecret ? (form.secrets[key]??""): (form.params[key]??"");

  const save = async () => {
    setSaving(true); setError("");
    try {
      const normalizedParams = { ...form.params };
      if (form.provider === "azure_devops") {
        if (!String(normalizedParams.sync_types || "").trim()) {
          normalizedParams.sync_types = ADO_CONTROLLED_SYNC_TYPES;
        }
        if (normalizedParams.sync_all_types === undefined || normalizedParams.sync_all_types === null || normalizedParams.sync_all_types === "") {
          normalizedParams.sync_all_types = "false";
        }
      }
      const body = {
        name: form.name, description: form.description||null,
        provider: form.provider, scope: form.scope,
        company_id: form.company_id ? Number(form.company_id) : null,
        product_id: form.product_id ? Number(form.product_id) : null,
        params: normalizedParams, secrets: form.secrets, is_active: form.is_active,
      };
      if (modal === "new") {
        const created = await apiPost<Connection>("/integrations/connections", body);
        setSelected(created);
      } else if (selected) {
        await apiPatch(`/integrations/connections/${selected.id}`, body);
      }
      loadConnections(); setModal(null);
    } catch(e:any) { setError(e?.message || e?.detail || "Erro ao salvar"); } finally { setSaving(false); }
  };

  const testConn = async () => {
    const id = selected?.id;
    if (!id) { setTestResult({ok:false,message:"Salve a conexão primeiro"}); return; }
    setTesting(true); setTestResult(null);
    try {
      const r = await apiPost<{ok:boolean;message:string}>(`/integrations/connections/${id}/test`,{});
      setTestResult(r);
      if (selected?.provider === "axet_flows") {
        loadAxetDiscovery();
      }
    } catch(e:any) { setTestResult({ok:false, message:e?.message || e?.detail || "Erro ao testar conexão"}); }
    finally { setTesting(false); }
  };

  const deleteConn = async (c:Connection) => {
    if (!confirm(`Excluir conexão "${c.name}"?`)) return;
    try { await apiDelete(`/integrations/connections/${c.id}`); loadConnections(); } catch {}
  };

  useEffect(() => {
    if (!activeSyncConnectionId) return;
    const poll = async () => {
      try {
        const rows = await apiGet<SyncLog[]>(`/integrations/connections/${activeSyncConnectionId}/logs`);
        const latest = rows[0];
        if (!latest) return;
        if (selected?.id === activeSyncConnectionId && modal === "logs") setLogs(rows);
        if (latest.status !== "running") {
          setApplyResult({
            status: latest.status,
            created: latest.items_created,
            updated: latest.items_updated,
            message: latest.error_message || (latest.status === "completed" ? "Apply complete" : "Apply finished with errors"),
          });
          setActiveSyncConnectionId(null);
          setRunningConnectionIds(prev => { const n = new Set(prev); n.delete(activeSyncConnectionId!); return n; });
          loadConnections();
        }
      } catch { /* ignore */ }
    };
    poll();
    const timer = window.setInterval(poll, 3000);
    return () => window.clearInterval(timer);
  }, [activeSyncConnectionId, modal, selected?.id]);

  const toggleItem = (ado_id:string) => {
    setSelItems(prev => { const n = new Set(prev); n.has(ado_id) ? n.delete(ado_id) : n.add(ado_id); return n; });
  };
  const toggleSprint = (path:string) => {
    setSelSprints(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; });
  };

  const previewTypeOptions = preview
    ? Array.from(new Set([
        ...preview.items.new.map(i => i.item_type),
        ...preview.items.modified.map(i => i.item_type),
        ...preview.items.equal.map(i => i.item_type),
        ...preview.items.orphan.map(i => i.item_type),
      ].filter(Boolean))).sort((a, b) => a.localeCompare(b))
    : [];

  const visibleNewItems = preview
    ? preview.items.new.filter(i => typeFilters.size === 0 || typeFilters.has(i.item_type))
    : [];
  const visibleModifiedItems = preview
    ? preview.items.modified.filter(i => typeFilters.size === 0 || typeFilters.has(i.item_type))
    : [];
  const visibleEqualItems = preview
    ? preview.items.equal.filter(i => typeFilters.size === 0 || typeFilters.has(i.item_type))
    : [];
  const visibleOrphanItems = preview
    ? preview.items.orphan.filter(i => typeFilters.size === 0 || typeFilters.has(i.item_type))
    : [];

  const visibleNewSprints = preview ? preview.sprints.new : [];
  const visibleModifiedSprints = preview ? preview.sprints.modified : [];

  const selectedVisibleNewItems = visibleNewItems.filter(i => selItems.has(i.ado_id));
  const selectedVisibleModifiedItems = visibleModifiedItems.filter(i => selItems.has(i.ado_id));
  const selectedVisibleNewSprints = visibleNewSprints.filter(s => selSprints.has(s.ado_path));
  const selectedVisibleModifiedSprints = visibleModifiedSprints.filter(s => selSprints.has(s.ado_path));

  const selectedVisibleItemCount = selectedVisibleNewItems.length + selectedVisibleModifiedItems.length;
  const selectedVisibleSprintCount = selectedVisibleNewSprints.length + selectedVisibleModifiedSprints.length;
  const selectedTypeLabels = previewTypeOptions.filter(type => typeFilters.has(type));

  const toggleCategory = (category: "new_items"|"modified_items"|"new_sprints"|"mod_sprints") => {
    if (!preview) return;
    if (category === "new_items") {
      const ids = visibleNewItems.map(i => i.ado_id);
      const allSel = ids.length > 0 && ids.every(id => selItems.has(id));
      setSelItems(prev => { const n = new Set(prev); if (allSel) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id)); return n; });
    } else if (category === "modified_items") {
      const ids = visibleModifiedItems.map(i => i.ado_id);
      const allSel = ids.length > 0 && ids.every(id => selItems.has(id));
      setSelItems(prev => { const n = new Set(prev); if (allSel) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id)); return n; });
    } else if (category === "new_sprints") {
      const paths = preview.sprints.new.map(s => s.ado_path);
      const allSel = paths.length > 0 && paths.every(p => selSprints.has(p));
      setSelSprints(prev => { const n = new Set(prev); if (allSel) paths.forEach(p => n.delete(p)); else paths.forEach(p => n.add(p)); return n; });
    } else {
      const paths = preview.sprints.modified.map(s => s.ado_path);
      const allSel = paths.length > 0 && paths.every(p => selSprints.has(p));
      setSelSprints(prev => { const n = new Set(prev); if (allSel) paths.forEach(p => n.delete(p)); else paths.forEach(p => n.add(p)); return n; });
    }
  };

  const getCategorySelState = (category: "new_items"|"modified_items"|"new_sprints"|"mod_sprints"): "all"|"partial"|"none" => {
    if (!preview) return "none";
    let ids: string[] = [];
    let sel: string[] = [];
    if (category === "new_items")      { ids = visibleNewItems.map(i => i.ado_id);      sel = ids.filter(id => selItems.has(id)); }
    else if (category === "modified_items") { ids = visibleModifiedItems.map(i => i.ado_id); sel = ids.filter(id => selItems.has(id)); }
    else if (category === "new_sprints")    { ids = preview.sprints.new.map(s => s.ado_path); sel = ids.filter(p => selSprints.has(p)); }
    else                               { ids = preview.sprints.modified.map(s => s.ado_path); sel = ids.filter(p => selSprints.has(p)); }
    if (ids.length === 0) return "none";
    if (sel.length === ids.length) return "all";
    if (sel.length > 0) return "partial";
    return "none";
  };

  const toggleViewFilter = (cat: string) => {
    setViewFilters(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  };

  const toggleTypeFilter = (itemType: string) => {
    setTypeFilters(prev => { const n = new Set(prev); n.has(itemType) ? n.delete(itemType) : n.add(itemType); return n; });
  };

  const BADGE_DEFS = preview ? [
    { lbl:"NEW ITEMS",   val:visibleNewItems.length,       col:"#00ff88", cat:"new_items"       as const, selectable:true  },
    { lbl:"MODIFIED",    val:visibleModifiedItems.length,  col:"#ff9900", cat:"modified_items"  as const, selectable:true  },
    { lbl:"EQUAL",       val:visibleEqualItems.length,     col:"#445566", cat:null,              selectable:false },
    { lbl:"ORPHAN",      val:visibleOrphanItems.length,    col:"#ff4466", cat:null,              selectable:false },
    { lbl:"NEW SPRINTS", val:visibleNewSprints.length,     col:"#00d4ff", cat:"new_sprints"     as const, selectable:true  },
    { lbl:"MOD SPRINTS", val:visibleModifiedSprints.length,col:"#ff9900", cat:"mod_sprints"     as const, selectable:true  },
  ] : [];

  return (
    <ModuleLayout moduleIcon="⚡" moduleName="INTEGRATIONS HUB" moduleAccent="HUB" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">// INTEGRATIONS //</span>
          <h1 className="mod-header__title">INTEGRATIONS <span>HUB</span></h1>
          <p className="mod-header__meta">{connections.length} connection(s) configured</p>
        </div>
        <button className="btn-add" onClick={openNew}>+ NEW CONNECTION</button>
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      {loadingConnections ? (
        <div className="mod-empty" style={{ minHeight: 320 }}>
          <div
            style={{
              width: 54,
              height: 54,
              border: "3px solid rgba(0,212,255,0.14)",
              borderTop: "3px solid #00d4ff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 18px",
            }}
          />
          <div className="mod-empty__title" style={{ color: "#00d4ff" }}>Loading integrations…</div>
          <div className="mod-empty__sub">Fetching configured connections and scopes</div>
        </div>
      ) : connections.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">⚡</div>
          <div className="mod-empty__title">No integrations yet</div>
          <div className="mod-empty__sub">Connect ADO, OpenAI, Jira and more to power your workflow</div>
        </div>
      ) : (
        <div className="mod-table-wrap" style={{ overflowX:"auto" }}>
          <table className="mod-table">
            <thead><tr>
              <th>CONNECTION</th><th style={{width:130}}>PROVIDER</th>
              <th style={{width:80,textAlign:"center"}}>SCOPE</th>
              <th style={{width:90,textAlign:"center"}}>STATUS</th>
              <th style={{width:150}}>LAST SYNC</th>
              <th style={{width:200,textAlign:"center"}}>ACTIONS</th>
            </tr></thead>
            <tbody>
              {connections.map(c => {
                const sc = c.is_active ? "#00ff88" : "#7899b0";
                const sc2 = SCOPE_COLORS[c.scope] || "#7899b0";
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{fontWeight:600,color:"#c8dce8",fontSize:12,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:PROVIDER_COLORS[c.provider]||"#7899b0",fontSize:10}}>{PROVIDER_ICONS[c.provider]||"◈"}</span>
                        {c.name}
                      </div>
                      {c.description && <div style={{fontSize:10,color:"#7899b0"}}>{c.description.substring(0,70)}</div>}
                      {c.last_error && <div style={{fontSize:9,color:"#ff4466",marginTop:2}}>⚠ {c.last_error.substring(0,80)}</div>}
                    </td>
                    <td><ProviderBadge provider={c.provider} /></td>
                    <td style={{textAlign:"center"}}>
                      <span style={{fontSize:9,padding:"1px 6px",borderRadius:2,border:`1px solid ${sc2}44`,color:sc2,background:`${sc2}0d`}}>{c.scope.toUpperCase()}</span>
                    </td>
                    <td style={{textAlign:"center"}}>
                      <span style={{fontSize:9,padding:"1px 6px",borderRadius:2,border:`1px solid ${sc}44`,color:sc,background:`${sc}0d`}}>{c.is_active?"ACTIVE":"INACTIVE"}</span>
                    </td>
                    <td style={{fontSize:9,color:"#7899b0"}}>{fmtDate(c.last_sync_at)}</td>
                    <td style={{textAlign:"center"}}>
                      <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                        <button className="btn-icon" style={{fontSize:9,padding:"1px 6px"}} onClick={()=>openEdit(c)}>EDIT</button>
                        {c.provider==="azure_devops" && (
                          <>
                            <button className="btn-icon"
                              style={{fontSize:9,padding:"1px 6px",color:"#fbbf24",borderColor:"rgba(251,191,36,0.3)"}}
                              disabled={diagnosing}
                              title="Executar diagnóstico ADO: tipos enxergados, WIQL, preview e sprints"
                              onClick={()=>openDiagnostics(c)}>
                              {diagnosing && selected?.id===c.id ? "◈ T-SHOOT…" : "◈ T-SHOOT"}
                            </button>
                            <button className="btn-icon"
                              style={{fontSize:9,padding:"1px 6px",
                                color: runningConnectionIds.has(c.id)?"#7899b0":"#00e5cc",
                                borderColor: runningConnectionIds.has(c.id)?"rgba(120,153,176,0.3)":"rgba(0,229,204,0.3)",
                                cursor: runningConnectionIds.has(c.id)?"not-allowed":"pointer"}}
                              disabled={previewing || runningConnectionIds.has(c.id)}
                              title={runningConnectionIds.has(c.id)?"Sync in progress — please wait":"Preview & apply changes from ADO"}
                              onClick={()=>openPreview(c)}>
                              {runningConnectionIds.has(c.id)?"⟳ RUNNING…":"⟳ SYNC"}
                            </button>
                          </>
                        )}
                        {c.provider==="axet_flows" && (
                          <button className="btn-icon"
                            style={{fontSize:9,padding:"1px 6px",color:"#c084fc",borderColor:"rgba(192,132,252,0.3)"}}
                            title="Atualizar porta e URL resolvidas do aXet Flows"
                            onClick={()=>refreshAxetRuntime(c)}
                            disabled={refreshingAxetConnectionId === c.id}>
                            {refreshingAxetConnectionId === c.id ? "⟳ SYNCING..." : "⟳ SYNC PORT"}
                          </button>
                        )}
                        {(c.provider==="openai"||c.provider==="azure_openai"||c.provider==="axet_flows") && (
                          <button className="btn-icon"
                            style={{fontSize:9,padding:"1px 6px",color:"#c084fc",borderColor:"rgba(192,132,252,0.3)"}}
                            title="Analisar texto com IA — extrair oportunidades, requisitos, riscos e mais"
                            onClick={()=>openAnalyze(c)}>
                            ◎ ANALYZE
                          </button>
                        )}
                        <button className="btn-icon" style={{fontSize:9,padding:"1px 6px"}} onClick={()=>openLogs(c)}>LOGS</button>
                        <button className="btn-icon btn-icon--danger" style={{fontSize:9,padding:"1px 6px"}} onClick={()=>deleteConn(c)}>DEL</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(modal==="new"||modal==="edit") && (
        <div className="mod-overlay">
          <div className="mod-modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// INTEGRATIONS //</span>
                <h3 className="mod-modal__title">{modal==="new"?"NEW":"EDIT"} <span>CONNECTION</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{overflowY:"auto",maxHeight:"72vh"}}>
              {error && <div className="mod-error" style={{marginBottom:12}}>⚠ {error}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <Fld lbl="NAME *"><input className="mod-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></Fld>
                <Fld lbl="PROVIDER *">
                  <select className="mod-select" value={form.provider} onChange={e=>setForm(p=>({...p,provider:e.target.value,params:{},secrets:{}}))}>
                    {Object.keys(providers).sort().map(p=>(<option key={p} value={p}>{PROVIDER_LABELS[p]||p}</option>))}
                  </select>
                  {form.provider === "axet_flows" && (
                    <div style={{fontSize:9,color:"#c084fc",marginTop:6,fontStyle:"italic"}}>
                      Esta conexão usa o endpoint HTTP do <strong style={{color:"#c8dce8"}}>LLM do aXet Flows</strong>, não a API direta da OpenAI.
                    </div>
                  )}
                </Fld>
                <Fld lbl="SCOPE">
                  <select className="mod-select" value={form.scope} onChange={e=>setForm(p=>({...p,scope:e.target.value}))}>
                    <option value="global">GLOBAL — all products</option>
                    <option value="company">COMPANY</option>
                    <option value="product">PRODUCT</option>
                  </select>
                </Fld>
                {form.scope==="product" && <Fld lbl="PRODUCT ID"><input className="mod-input" value={form.product_id} onChange={e=>setForm(p=>({...p,product_id:e.target.value}))} /></Fld>}
                {form.scope==="company" && <Fld lbl="COMPANY ID"><input className="mod-input" value={form.company_id} onChange={e=>setForm(p=>({...p,company_id:e.target.value}))} /></Fld>}
              </div>
              <Fld lbl="DESCRIPTION"><input className="mod-input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></Fld>
              {(visibleFields.length > 0 || isAxetFlowsProvider) && (
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(0,212,255,0.1)"}}>
                  <div style={{fontSize:9,color:"#7899b0",letterSpacing:2,marginBottom:12}}>// {form.provider.toUpperCase()} CONFIGURATION //</div>
                  {form.provider === "azure_devops" && (
                    <div style={{marginBottom:12,padding:"10px 12px",border:"1px solid rgba(0,229,204,0.18)",background:"rgba(0,229,204,0.05)"}}>
                      <div style={{fontSize:9,color:"#00e5cc",letterSpacing:1,marginBottom:4}}>// CONTROLLED SYNC DEFAULT //</div>
                      <div style={{fontSize:10,color:"#7899b0",lineHeight:1.6}}>
                        This connection is configured to sync the controlled ADO backlog set:
                        <strong style={{color:"#c8dce8"}}> Epic, Feature, User Story</strong>.
                      </div>
                    </div>
                  )}
                  {form.provider === "axet_flows" && (
                    <div style={{marginBottom:12,padding:"10px 12px",border:"1px solid rgba(192,132,252,0.18)",background:"rgba(192,132,252,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:6}}>
                        <div style={{fontSize:9,color:"#c084fc",letterSpacing:1}}>// AXET FLOWS LLM GATEWAY //</div>
                      </div>
                      <div style={{fontSize:10,color:"#7899b0",lineHeight:1.6}}>
                        <div><strong style={{color:"#c8dce8"}}>AI Agent contextual do Product Lab via aXet Flows.</strong></div>
                        <div style={{marginTop:4}}>
                          {isAxetAutoDiscoveryMode ? (
                            <>
                              A porta é <strong style={{color:"#c8dce8"}}>descoberta automaticamente</strong> pelo Product Lab ao listar, abrir, testar e agora também via ação explícita de sync.
                            </>
                          ) : (
                            <>
                              Esta conexão usa <strong style={{color:"#c8dce8"}}>porta fixa configurada manualmente</strong>, sem processo de descoberta automática.
                            </>
                          )}
                        </div>
                        <div style={{marginTop:4,fontSize:9,color:"#9f7aea"}}>
                          Status:{" "}
                          <span style={{color:"#7899b0"}}>
                            {axetDiscoveryLoading ? "detecting runtime..." : axetDiscovery?.status || "unknown"}
                          </span>
                        </div>
                        {shouldShowResolvedNow && (
                          <div style={{marginTop:6,color:"#c084fc",fontFamily:"var(--font-mono,monospace)"}}>
                            Resolved URL: {axetDiscovery?.resolved_url}
                          </div>
                        )}
                        {axetDiscovery?.host_port && isAxetRuntimeAvailableNow && isAxetAutoDiscoveryMode && (
                          <div style={{marginTop:4,fontSize:9,color:"#7899b0"}}>
                            Host Port: <span style={{color:"#c8dce8"}}>{axetDiscovery.host_port}</span>
                          </div>
                        )}
                        {shouldShowLastKnown && (
                          <>
                            <div style={{marginTop:6,fontSize:9,color:"#7899b0"}}>
                              Last known URL:
                            </div>
                            <div style={{color:"#c084fc",fontFamily:"var(--font-mono,monospace)"}}>
                              {persistedResolvedUrl}
                            </div>
                            {form.params.port && (
                              <div style={{marginTop:4,fontSize:9,color:"#7899b0"}}>
                                Last known port: <span style={{color:"#c8dce8"}}>{form.params.port}</span>
                              </div>
                            )}
                          </>
                        )}
                        {!isAxetRuntimeAvailableNow && axetDiscovery?.status === "docker_sdk_unavailable" && (
                          <div style={{marginTop:6,fontSize:9,color:"#ff9900"}}>
                            Discovery unavailable in this backend environment.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {visibleFields
                    .filter(f => {
                      if (!isAxetFlowsProvider) return true;
                      if (isAxetAutoDiscoveryMode && f.field_key === "port") return false;
                      return true;
                    })
                    .map(f => (
                    <div key={f.field_key} className="mod-field">
                      <label className="mod-field__label">{`${f.field_label}${f.is_required?" *":""}`}{f.is_secret&&<span style={{fontSize:8,color:"#ff9900",marginLeft:6,border:"1px solid rgba(255,153,0,0.4)",padding:"1px 5px",borderRadius:2}}>⬡ SECRET</span>}</label>
                      {f.hint && <div style={{fontSize:9,color:"#556677",marginBottom:4,fontStyle:"italic"}}>{f.hint}</div>}
                      {f.field_type==="select" ? (
                        <select className="mod-select" value={getFieldVal(f.field_key,f.is_secret)} onChange={e=>setField(f.field_key,e.target.value,f.is_secret)}>
                          <option value="">— select —</option>
                          {(f.options||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : f.field_type==="boolean" ? (
                        <select className="mod-select" value={getFieldVal(f.field_key,f.is_secret)||"false"} onChange={e=>setField(f.field_key,e.target.value,f.is_secret)}>
                          <option value="true">Yes</option><option value="false">No</option>
                        </select>
                      ) : (
                        <input className="mod-input" type={f.field_type==="password"?"password":f.field_type==="number"?"number":"text"} value={getFieldVal(f.field_key,f.is_secret)} placeholder={f.placeholder||""} onChange={e=>setField(f.field_key,e.target.value,f.is_secret)} />
                      )}
                    </div>
                  ))}
                  {isAxetFlowsProvider && (
                    <div className="mod-field">
                      <label className="mod-field__label">CONNECTION MODE</label>
                      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:6}}>
                        <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,color:"#c8dce8"}}>
                          <input
                            type="radio"
                            name="axet_endpoint_mode"
                            checked={axetEndpointMode === "auto_discovery"}
                            onChange={()=>setField("endpoint_mode", "auto_discovery", false)}
                          />
                          <span>Auto-discovery</span>
                        </label>
                        <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:11,color:"#c8dce8"}}>
                          <input
                            type="radio"
                            name="axet_endpoint_mode"
                            checked={axetEndpointMode === "fixed_port"}
                            onChange={()=>setField("endpoint_mode", "fixed_port", false)}
                          />
                          <span>Fixed port</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {isAxetFlowsProvider && isAxetAutoDiscoveryMode && (
                    <div className="mod-field">
                      <label className="mod-field__label">AXET FLOWS PORT</label>
                      <input
                        className="mod-input"
                        type="text"
                        value={isAxetRuntimeAvailableNow && axetDiscovery?.host_port ? String(axetDiscovery.host_port) : ""}
                        placeholder={
                          axetDiscoveryLoading
                            ? "Detecting..."
                            : shouldShowLastKnown && form.params.port
                              ? `Last known: ${form.params.port}`
                              : "Automatically detected"
                        }
                        readOnly
                        disabled
                      />
                    </div>
                  )}
                </div>
              )}
              {isAxetFlowsProvider && advancedAxetFields.length > 0 && (
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid rgba(192,132,252,0.12)"}}>
                  <button
                    type="button"
                    onClick={()=>setShowAdvancedAxet(v=>!v)}
                    style={{
                      fontSize:10,
                      color:"#c084fc",
                      background:"transparent",
                      border:"none",
                      padding:0,
                      cursor:"pointer",
                      letterSpacing:1,
                      fontFamily:"var(--font-mono,monospace)"
                    }}
                  >
                    {showAdvancedAxet ? "Advanced ▴" : "Advanced ▾"}
                  </button>
                  {showAdvancedAxet && (
                    <div style={{marginTop:12}}>
                      {advancedAxetFields.map(f => (
                        <div key={f.field_key} className="mod-field">
                          <label className="mod-field__label">{f.field_label}{f.is_required?" *":""}</label>
                          {f.hint && <div style={{fontSize:9,color:"#556677",marginBottom:4,fontStyle:"italic"}}>{f.hint}</div>}
                          {f.field_type==="select" ? (
                            <select className="mod-select" value={getFieldVal(f.field_key,f.is_secret)} onChange={e=>setField(f.field_key,e.target.value,f.is_secret)}>
                              <option value="">— select —</option>
                              {(f.options||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : f.field_type==="boolean" ? (
                            <select className="mod-select" value={getFieldVal(f.field_key,f.is_secret)||"false"} onChange={e=>setField(f.field_key,e.target.value,f.is_secret)}>
                              <option value="true">Yes</option><option value="false">No</option>
                            </select>
                          ) : (
                            <input className="mod-input" type={f.field_type==="password"?"password":f.field_type==="number"?"number":"text"} value={getFieldVal(f.field_key,f.is_secret)} placeholder={f.placeholder||""} onChange={e=>setField(f.field_key,e.target.value,f.is_secret)} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {testResult && (
                <div style={{padding:"8px 12px",marginTop:8,background:testResult.ok?"rgba(0,255,136,0.06)":"rgba(255,68,102,0.06)",border:`1px solid ${testResult.ok?"rgba(0,255,136,0.3)":"rgba(255,68,102,0.3)"}`,fontSize:11,color:testResult.ok?"#00ff88":"#ff4466"}}>
                  {testResult.ok?"✓":"✕"} {testResult.message}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} id="ic_active" />
                <label htmlFor="ic_active" style={{fontSize:10,color:"#7899b0",cursor:"pointer"}}>ACTIVE</label>
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-icon" style={{marginRight:"auto"}} disabled={testing || axetDiscoveryLoading} onClick={testConn}>{testing?"TESTING...":"⟳ TEST CONNECTION"}</button>
              <button className="btn-cancel" onClick={()=>setModal(null)}>CANCEL</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving?"SAVING...":"SAVE ⟩"}</button>
            </div>
          </div>
        </div>
      )}

      {modal==="preview" && selected && preview && (
        <div className="mod-overlay" onClick={()=>{ if (!applying) setModal(null); }}>
          <div className="mod-modal" style={{maxWidth:860}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// ADO SYNC PREVIEW //</span>
                <h3 className="mod-modal__title">REVIEW CHANGES <span>{selected.name}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>{ if (!applying) setModal(null); }} disabled={applying} style={{opacity:applying?0.4:1}}>✕</button>
            </div>
            <div className="mod-modal__body" style={{overflowY:"auto",maxHeight:"68vh",position:"relative"}}>

              {applying && (
                <div style={{position:"absolute",inset:0,zIndex:10,background:"rgba(8,16,28,0.88)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,backdropFilter:"blur(2px)"}}>
                  <div style={{width:48,height:48,border:"3px solid rgba(0,212,255,0.15)",borderTop:"3px solid #00d4ff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
                  <div style={{fontSize:11,color:"#00d4ff",letterSpacing:2,fontFamily:"var(--font-mono,monospace)"}}>SYNCING WITH AZURE DEVOPS</div>
                  <div style={{fontSize:9,color:"#445566",letterSpacing:1}}>{selItems.size} item(s) · {selSprints.size} sprint(s) · please wait…</div>
                </div>
              )}

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:9,color:"#445566",letterSpacing:1}}>
                  {viewFilters.size > 0 ? `// FILTERING: ${[...viewFilters].join(", ").toUpperCase()} //` : "// CLICK BADGE TO FILTER VIEW · CTRL+CLICK TO SELECT ALL //"}
                </span>
                {viewFilters.size > 0 && (
                  <button onClick={()=>setViewFilters(new Set())}
                    style={{fontSize:8,padding:"2px 8px",border:"1px solid rgba(0,212,255,0.3)",color:"#00d4ff",background:"rgba(0,212,255,0.06)",borderRadius:2,cursor:"pointer",letterSpacing:1,fontFamily:"var(--font-mono,monospace)"}}>
                    ✕ SHOW ALL
                  </button>
                )}
              </div>

              {previewTypeOptions.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:9,color:"#7899b0",letterSpacing:1}}>
                      {typeFilters.size > 0
                        ? `// TYPES SELECTED: ${selectedTypeLabels.join(" + ").toUpperCase()} //`
                        : "// FILTER BY TYPE //"}
                    </span>
                    {typeFilters.size > 0 && (
                      <button
                        onClick={()=>setTypeFilters(new Set())}
                        style={{fontSize:8,padding:"2px 8px",border:"1px solid rgba(0,229,204,0.3)",color:"#00e5cc",background:"rgba(0,229,204,0.06)",borderRadius:2,cursor:"pointer",letterSpacing:1,fontFamily:"var(--font-mono,monospace)"}}
                      >
                        ✕ CLEAR TYPES
                      </button>
                    )}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {previewTypeOptions.map(type => {
                      const active = typeFilters.has(type);
                      const count = (
                        preview.items.new.filter(i => i.item_type === type).length +
                        preview.items.modified.filter(i => i.item_type === type).length +
                        preview.items.equal.filter(i => i.item_type === type).length +
                        preview.items.orphan.filter(i => i.item_type === type).length
                      );
                      return (
                        <button
                          key={type}
                          onClick={()=>toggleTypeFilter(type)}
                          style={{
                            fontSize:9,
                            padding:"4px 10px",
                            border:`1px solid ${active ? "#00e5cc" : "rgba(120,153,176,0.3)"}`,
                            color:active ? "#00e5cc" : "#7899b0",
                            background:active ? "rgba(0,229,204,0.12)" : "rgba(120,153,176,0.05)",
                            borderRadius:2,
                            letterSpacing:1,
                            cursor:"pointer",
                            fontFamily:"var(--font-mono,monospace)",
                            display:"inline-flex",
                            alignItems:"center",
                            gap:6,
                          }}
                        >
                          <span style={{width:7,height:7,borderRadius:1,border:`1px solid ${active ? "#00e5cc" : "#556677"}`,background:active ? "#00e5cc" : "transparent",display:"inline-block"}} />
                          {type.toUpperCase()} <strong>{count}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {BADGE_DEFS.map(({ lbl, val, col, cat, selectable }) => {
                  const state = selectable && cat ? getCategorySelState(cat) : "none";
                  const isAll = state === "all";
                  const isPart = state === "partial";
                  const canClick = selectable && val > 0;
                  const isFiltered = cat !== null && viewFilters.has(cat);
                  const anyFilter = viewFilters.size > 0;
                  return (
                    <button key={lbl}
                      onClick={(e) => {
                        if (!canClick || !cat) return;
                        if (e.ctrlKey || e.metaKey) {
                          toggleCategory(cat);
                        } else {
                          const willActivate = !viewFilters.has(cat);
                          toggleViewFilter(cat);
                          if (willActivate) {
                            const selState = getCategorySelState(cat);
                            if (selState === "none") toggleCategory(cat);
                          }
                        }
                      }}
                      disabled={!canClick}
                      title={!selectable ? undefined : val===0 ? `No ${lbl.toLowerCase()}` :
                        `Click: filter view to ${lbl.toLowerCase()} · Ctrl+click: toggle selection`}
                      style={{
                        fontSize:9, padding:"4px 10px",
                        border: isFiltered ? `1px solid ${col}` : anyFilter ? `1px solid ${col}22` : `1px solid ${isAll?col:isPart?col+"99":col+"44"}`,
                        color: isFiltered ? col : anyFilter ? col+"44" : isAll?col:isPart?col+"cc":selectable&&val>0?col+"99":col+"55",
                        background: isFiltered ? `${col}22` : anyFilter ? `${col}04` : isAll?`${col}22`:isPart?`${col}12`:`${col}08`,
                        borderRadius:2, letterSpacing:1,
                        cursor: canClick?"pointer":"default",
                        fontFamily:"var(--font-mono,monospace)",
                        transition:"all 0.15s", outline:"none",
                        display:"inline-flex", alignItems:"center", gap:5,
                        boxShadow: isFiltered ? `0 0 6px ${col}44` : "none",
                        opacity: anyFilter && !isFiltered && !selectable ? 0.4 : 1,
                      }}>
                      {isFiltered && <span style={{fontSize:8}}>▶</span>}
                      {!isFiltered && selectable && val > 0 && (
                        <span style={{width:7,height:7,borderRadius:1,border:`1px solid ${isAll?col:col+"66"}`,background:isAll?col:isPart?`${col}55`:"transparent",flexShrink:0,display:"inline-block"}} />
                      )}
                      {lbl}: <strong>{val}</strong>
                    </button>
                  );
                })}
              </div>

              {visibleNewItems.length > 0 && (viewFilters.size===0 || viewFilters.has("new_items")) && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#00ff88",letterSpacing:2,marginBottom:6}}>// NEW ITEMS — will be created //</div>
                  <table className="mod-table">
                    <thead><tr><th style={{width:28}}>✓</th><th>TITLE</th><th style={{width:90}}>TYPE</th><th style={{width:90}}>ADO STATE</th><th style={{width:60}}>SP</th></tr></thead>
                    <tbody>{visibleNewItems.map(i=>(
                      <tr key={i.ado_id}>
                        <td><input type="checkbox" checked={selItems.has(i.ado_id)} onChange={()=>toggleItem(i.ado_id)} /></td>
                        <td style={{fontSize:11}}>{i.title}</td>
                        <td style={{fontSize:9,color:"#7899b0"}}>{i.item_type}</td>
                        <td style={{fontSize:9,color:"#00ff88"}}>{i.ado_state}</td>
                        <td style={{fontSize:10,textAlign:"center"}}>{i.story_points??"-"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {visibleModifiedItems.length > 0 && (viewFilters.size===0 || viewFilters.has("modified_items")) && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#ff9900",letterSpacing:2,marginBottom:6}}>// MODIFIED ITEMS — will be updated //</div>
                  <table className="mod-table">
                    <thead><tr><th style={{width:28}}>✓</th><th>TITLE</th><th>CHANGES</th></tr></thead>
                    <tbody>{visibleModifiedItems.map(i=>(
                      <tr key={i.ado_id}>
                        <td><input type="checkbox" checked={selItems.has(i.ado_id)} onChange={()=>toggleItem(i.ado_id)} /></td>
                        <td style={{fontSize:11}}>{i.title}</td>
                        <td style={{fontSize:9}}>{Object.entries(i.diffs||{}).map(([field,diff])=>(
                          <div key={field} style={{marginBottom:2}}><span style={{color:"#7899b0"}}>{field}:</span> <span style={{color:"#ff4466",textDecoration:"line-through"}}>{diff.pl??"-"}</span>{" → "}<span style={{color:"#00ff88"}}>{diff.ado??"-"}</span></div>
                        ))}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {visibleOrphanItems.length > 0 && viewFilters.size===0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#ff4466",letterSpacing:2,marginBottom:6}}>// ORPHAN ITEMS — in Product Lab but NOT in ADO //</div>
                  <table className="mod-table">
                    <thead><tr><th>TITLE</th><th style={{width:110}}>STATUS</th><th style={{width:80}}>ADO ID</th></tr></thead>
                    <tbody>{visibleOrphanItems.map(i=>(
                      <tr key={i.ado_id}>
                        <td style={{fontSize:11}}>{i.title}</td>
                        <td style={{fontSize:9,color:"#7899b0"}}>{i.current_status}</td>
                        <td style={{fontSize:9,color:"#ff4466"}}>{i.ado_id}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {preview.sprints.new.length > 0 && (viewFilters.size===0 || viewFilters.has("new_sprints")) && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:6}}>// NEW SPRINTS — will be created //</div>
                  <table className="mod-table">
                    <thead><tr><th style={{width:28}}>✓</th><th>NAME</th><th style={{width:110}}>START</th><th style={{width:110}}>END</th><th style={{width:90}}>STATUS</th></tr></thead>
                    <tbody>{preview.sprints.new.map(s=>(
                      <tr key={s.ado_path}>
                        <td><input type="checkbox" checked={selSprints.has(s.ado_path)} onChange={()=>toggleSprint(s.ado_path)} /></td>
                        <td style={{fontSize:11}}>{s.name}</td>
                        <td style={{fontSize:9,color:"#7899b0"}}>{s.start_date||"-"}</td>
                        <td style={{fontSize:9,color:"#7899b0"}}>{s.end_date||"-"}</td>
                        <td style={{fontSize:9,color:"#00d4ff"}}>{s.mapped_status}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {preview.sprints.modified.length > 0 && (viewFilters.size===0 || viewFilters.has("mod_sprints")) && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:9,color:"#ff9900",letterSpacing:2,marginBottom:6}}>// MODIFIED SPRINTS — will be updated //</div>
                  <table className="mod-table">
                    <thead><tr><th style={{width:28}}>✓</th><th>NAME</th><th>CHANGES</th></tr></thead>
                    <tbody>{preview.sprints.modified.map(s=>(
                      <tr key={s.ado_path}>
                        <td><input type="checkbox" checked={selSprints.has(s.ado_path)} onChange={()=>toggleSprint(s.ado_path)} /></td>
                        <td style={{fontSize:11}}>{s.name}</td>
                        <td style={{fontSize:9}}>{Object.entries(s.diffs||{}).map(([field,diff])=>(
                          <div key={field} style={{marginBottom:2}}><span style={{color:"#7899b0"}}>{field}:</span> <span style={{color:"#ff4466",textDecoration:"line-through"}}>{diff.pl??"-"}</span>{" → "}<span style={{color:"#00ff88"}}>{diff.ado??"-"}</span></div>
                        ))}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

            </div>

            <div className="mod-modal__footer" style={{flexDirection:"column",gap:0,alignItems:"stretch",padding:0}}>
              {applying && (
                <div style={{height:3,background:"rgba(0,212,255,0.1)",overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,#00d4ff 50%,transparent 100%)",backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite linear"}} />
                </div>
              )}
              {applyResult && !applying && (
                <div style={{padding:"10px 14px",fontSize:11,borderBottom:"1px solid rgba(0,212,255,0.08)",color:applyResult.status==="running"?"#00d4ff":applyResult.status==="failed"?"#ff4466":"#00ff88",background:applyResult.status==="running"?"rgba(0,212,255,0.07)":applyResult.status==="failed"?"rgba(255,68,102,0.07)":"rgba(0,255,136,0.07)",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{applyResult.status==="running"?"⟳":applyResult.status==="failed"?"✕":"✓"}</span>
                  <div>
                    <div style={{fontWeight:600,marginBottom:2}}>
                      {applyResult.status==="running"?"Sync running in background…":applyResult.status==="failed"?"Sync failed":("Sync complete — "+applyResult.created+" created · "+applyResult.updated+" updated")}
                    </div>
                    {applyResult.message && <div style={{fontSize:9,opacity:0.7}}>{applyResult.message}</div>}
                  </div>
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",padding:"10px 14px",gap:8}}>
                <span style={{fontSize:9,color:"#445566",marginRight:"auto"}}>
                  {typeFilters.size > 0
                    ? `${selectedVisibleItemCount} filtered item(s) · ${selectedVisibleSprintCount} sprint(s) selected`
                    : `${selItems.size} item(s) · ${selSprints.size} sprint(s) selected`}
                </span>
                <button className="btn-cancel" onClick={()=>setModal(null)} disabled={applying}>CANCEL</button>
                <button className="btn-save" onClick={applySelected} disabled={applying||(selItems.size===0&&selSprints.size===0)}>
                  {applying ? (
                    <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                      <span style={{width:10,height:10,border:"1.5px solid rgba(0,212,255,0.3)",borderTop:"1.5px solid #00d4ff",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}} />
                      APPLYING…
                    </span>
                  ) : typeFilters.size > 0
                    ? `APPLY ${selectedVisibleItemCount} ITEMS + ${selectedVisibleSprintCount} SPRINTS ⟩`
                    : `APPLY SELECTED (${selItems.size + selSprints.size}) ⟩`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal==="analyze" && selected && (
        <div className="mod-overlay" onClick={()=>{ if(!analyzing) setModal(null); }}>
          <div className="mod-modal" style={{maxWidth:900}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">{selected.provider==="axet_flows" ? "// AXET FLOWS LLM //" : "// AI ANALYZE //"}</span>
                <h3 className="mod-modal__title">{selected.provider==="axet_flows" ? "AXET FLOWS ANALYZE" : "ANALYZE TEXT"} <span style={{color:"#c084fc"}}>{selected.name}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>{ if(!analyzing) setModal(null); }} disabled={analyzing} style={{opacity:analyzing?0.4:1}}>✕</button>
            </div>
            <div className="mod-modal__body" style={{overflowY:"auto",maxHeight:"76vh"}}>

              {!analyzeResult && (
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                    <Fld lbl="CONTEXTO (opcional)">
                      <input className="mod-input" placeholder="ex: reunião de discovery, transcrição entrevista, e-mail cliente…"
                        value={analyzeContext} onChange={e=>setAnalyzeContext(e.target.value)} disabled={analyzing} />
                    </Fld>
                    <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4}}>
                      <div style={{fontSize:9,color:"#556677",fontStyle:"italic",lineHeight:1.5}}>
                        {selected.provider==="axet_flows" ? (
                          <>O Product Lab enviará este conteúdo para o <strong style={{color:"#c8dce8"}}>Flow do aXet Flows</strong> configurado nesta conexão.<br/>O Flow deverá usar o node LLM e devolver JSON compatível com o Analyze.</>
                        ) : (
                          <>Cole abaixo transcrições, e-mails, notas de reunião ou qualquer texto.<br/>A IA irá extrair oportunidades, requisitos, riscos, backlog e mais.</>
                        )}
                      </div>
                    </div>
                  </div>
                  <Fld lbl="TEXTO PARA ANÁLISE *">
                    <textarea className="mod-input" rows={12}
                      style={{resize:"vertical",fontFamily:"var(--font-mono,monospace)",fontSize:11,lineHeight:1.6}}
                      placeholder="Cole aqui a transcrição, e-mail, ata de reunião, feedback de usuário…"
                      value={analyzeText} onChange={e=>setAnalyzeText(e.target.value)} disabled={analyzing} />
                  </Fld>
                  {analyzeError && <div className="mod-error" style={{marginTop:8}}>⚠ {analyzeError}</div>}
                </div>
              )}

              {analyzeResult && (() => {
                const TABS: { key: keyof AnalyzeResult; label:string; color:string; icon:string }[] = [
                  { key:"opportunities", label:"OPORTUNIDADES", color:"#00ff88",  icon:"◈" },
                  { key:"requirements",  label:"REQUISITOS",    color:"#00d4ff",  icon:"◎" },
                  { key:"risks",         label:"RISCOS",        color:"#ff4466",  icon:"⚠" },
                  { key:"backlog",       label:"BACKLOG",       color:"#ff9900",  icon:"▣" },
                  { key:"decisions",     label:"DECISÕES",      color:"#c084fc",  icon:"⬡" },
                  { key:"followups",     label:"FOLLOW-UPS",    color:"#00e5cc",  icon:"→" },
                  { key:"stakeholders",  label:"STAKEHOLDERS",  color:"#7899b0",  icon:"◉" },
                  { key:"insights",      label:"INSIGHTS",      color:"#fbbf24",  icon:"✦" },
                ];
                const activeItems = analyzeResult[analyzeTab] as unknown as Record<string,string>[];
                const totalFound = TABS.reduce((s,t) => s + (analyzeResult[t.key]?.length||0), 0);
                return (
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{fontSize:9,color:"#00ff88",letterSpacing:2}}>
                        ✓ ANÁLISE CONCLUÍDA — {totalFound} item(s) extraídos
                      </div>
                      <button onClick={()=>{ setAnalyzeResult(null); setAnalyzeError(""); }}
                        style={{fontSize:9,padding:"2px 10px",border:"1px solid rgba(192,132,252,0.3)",color:"#c084fc",background:"rgba(192,132,252,0.06)",borderRadius:2,cursor:"pointer",letterSpacing:1,fontFamily:"var(--font-mono,monospace)"}}>
                        ◈ NOVO TEXTO
                      </button>
                    </div>

                    <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16,borderBottom:"1px solid rgba(0,212,255,0.1)",paddingBottom:8}}>
                      {TABS.map(t => {
                        const count = analyzeResult[t.key]?.length || 0;
                        const isActive = analyzeTab === t.key;
                        return (
                          <button key={t.key} onClick={()=>setAnalyzeTab(t.key)}
                            style={{
                              fontSize:9, padding:"3px 10px", borderRadius:2,
                              border: isActive ? `1px solid ${t.color}` : `1px solid ${t.color}33`,
                              color: isActive ? t.color : count > 0 ? `${t.color}99` : "#334455",
                              background: isActive ? `${t.color}18` : "transparent",
                              cursor:"pointer", letterSpacing:1, fontFamily:"var(--font-mono,monospace)",
                              display:"inline-flex", alignItems:"center", gap:5,
                            }}>
                            <span>{t.icon}</span> {t.label}
                            {count > 0 && <span style={{background:`${t.color}33`,color:t.color,padding:"0 4px",borderRadius:1,fontSize:9,fontWeight:700}}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {activeItems.length === 0 ? (
                      <div style={{fontSize:11,color:"#445566",textAlign:"center",padding:"24px 0",fontStyle:"italic"}}>
                        Nenhum item encontrado nesta categoria
                      </div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {activeItems.map((item, idx) => {
                          const tabDef = TABS.find(t=>t.key===analyzeTab)!;
                          const entries = Object.entries(item).filter(([,v])=>v!=null && v!=="");
                          const titleEntry = entries.find(([k])=>k==="title"||k==="name");
                          const descEntry  = entries.find(([k])=>k==="description");
                          const rest = entries.filter(([k])=>k!=="title"&&k!=="name"&&k!=="description");
                          return (
                            <div key={idx} style={{border:`1px solid ${tabDef.color}22`,borderLeft:`3px solid ${tabDef.color}`,background:`${tabDef.color}06`,padding:"10px 14px",borderRadius:"0 3px 3px 0"}}>
                              {titleEntry && (
                                <div style={{fontWeight:700,color:"#c8dce8",fontSize:12,marginBottom:4}}>
                                  <span style={{color:tabDef.color,marginRight:6}}>{tabDef.icon}</span>
                                  {String(titleEntry[1])}
                                </div>
                              )}
                              {descEntry && (
                                <div style={{fontSize:11,color:"#8899aa",marginBottom:6,lineHeight:1.5}}>
                                  {String(descEntry[1])}
                                </div>
                              )}
                              {rest.length > 0 && (
                                <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",marginTop:4}}>
                                  {rest.map(([k,v]) => (
                                    <span key={k} style={{fontSize:9,color:"#556677",letterSpacing:0.5}}>
                                      <span style={{color:"#7899b0",fontFamily:"var(--font-mono,monospace)"}}>{k.replace(/_/g," ").toUpperCase()}:</span>{" "}
                                      <span style={{color:tabDef.color+"cc"}}>{String(v)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
            <div className="mod-modal__footer">
              {!analyzeResult && (
                <>
                  <button className="btn-cancel" onClick={()=>{ if(!analyzing) setModal(null); }} disabled={analyzing}>CANCEL</button>
                  <button className="btn-save" onClick={runAnalyze} disabled={analyzing||!analyzeText.trim()}>
                    {analyzing ? (
                      <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                        <span style={{width:10,height:10,border:"1.5px solid rgba(192,132,252,0.3)",borderTop:"1.5px solid #c084fc",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}} />
                        ANALYZING…
                      </span>
                    ) : selected.provider==="axet_flows" ? "◉ SEND TO AXET FLOWS ⟩" : "◎ ANALYZE ⟩"}
                  </button>
                </>
              )}
              {analyzeResult && (
                <button className="btn-cancel" onClick={()=>setModal(null)}>CLOSE</button>
              )}
            </div>
          </div>
        </div>
      )}

      {modal==="diagnostics" && selected && diagnostics && (
        <div className="mod-overlay" onClick={()=>setModal(null)}>
          <div className="mod-modal" style={{maxWidth:980}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// ADO TROUBLESHOOT //</span>
                <h3 className="mod-modal__title">SYNC DIAGNOSTICS <span>{selected.name}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{overflowY:"auto",maxHeight:"72vh"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{border:"1px solid rgba(0,212,255,0.12)",padding:12,background:"rgba(0,212,255,0.04)"}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:8}}>// CONNECTION //</div>
                  <div style={{fontSize:10,color:"#7899b0",lineHeight:1.8}}>
                    <div><strong style={{color:"#c8dce8"}}>PROJECT:</strong> {diagnostics.connection.params.project || "—"}</div>
                    <div><strong style={{color:"#c8dce8"}}>AREA PATH:</strong> {diagnostics.connection.params.area_path || "—"}</div>
                    <div><strong style={{color:"#c8dce8"}}>SYNC TYPES:</strong> {diagnostics.connection.params.sync_types?.join(", ") || "—"}</div>
                    <div><strong style={{color:"#c8dce8"}}>SYNC ALL TYPES:</strong> {diagnostics.connection.params.sync_all_types ? "TRUE" : "FALSE"}</div>
                  </div>
                </div>
                <div style={{border:"1px solid rgba(255,191,36,0.12)",padding:12,background:"rgba(255,191,36,0.04)"}}>
                  <div style={{fontSize:9,color:"#fbbf24",letterSpacing:2,marginBottom:8}}>// QUICK READ //</div>
                  <div style={{fontSize:10,color:"#7899b0",lineHeight:1.8}}>
                    <div><strong style={{color:"#c8dce8"}}>ADO ITEMS:</strong> {diagnostics.ado.total_work_items_returned}</div>
                    <div><strong style={{color:"#c8dce8"}}>ADO SPRINTS:</strong> {diagnostics.ado.total_iterations_returned}</div>
                    <div><strong style={{color:"#c8dce8"}}>PREVIEW TYPES:</strong> {Object.keys(diagnostics.preview.item_types_visible_in_preview).join(", ") || "—"}</div>
                    <div><strong style={{color:"#c8dce8"}}>PREVIEW NEW SPRINTS:</strong> {diagnostics.preview.summary.sprints_new}</div>
                  </div>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:6}}>// WIQL USED BY PRODUCT LAB //</div>
                <pre style={{margin:0,padding:"12px 14px",background:"rgba(8,16,28,0.7)",border:"1px solid rgba(0,212,255,0.12)",color:"#c8dce8",fontSize:10,whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"var(--font-mono,monospace)"}}>
                  {diagnostics.query.wiql}
                </pre>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <div style={{border:"1px solid rgba(0,255,136,0.12)",padding:12,background:"rgba(0,255,136,0.04)"}}>
                  <div style={{fontSize:9,color:"#00ff88",letterSpacing:2,marginBottom:8}}>// RAW WORK ITEM TYPES FROM ADO //</div>
                  {Object.keys(diagnostics.ado.raw_work_item_types).length === 0 ? (
                    <div style={{fontSize:10,color:"#556677"}}>No work item types returned.</div>
                  ) : Object.entries(diagnostics.ado.raw_work_item_types).map(([type, count]) => (
                    <div key={type} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#7899b0",padding:"2px 0"}}>
                      <span style={{color:"#c8dce8"}}>{type}</span><strong style={{color:"#00ff88"}}>{count}</strong>
                    </div>
                  ))}
                </div>
                <div style={{border:"1px solid rgba(0,229,204,0.12)",padding:12,background:"rgba(0,229,204,0.04)"}}>
                  <div style={{fontSize:9,color:"#00e5cc",letterSpacing:2,marginBottom:8}}>// TYPES VISIBLE IN PREVIEW //</div>
                  {Object.keys(diagnostics.preview.item_types_visible_in_preview).length === 0 ? (
                    <div style={{fontSize:10,color:"#556677"}}>No item types visible in preview.</div>
                  ) : Object.entries(diagnostics.preview.item_types_visible_in_preview).map(([type, count]) => (
                    <div key={type} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#7899b0",padding:"2px 0"}}>
                      <span style={{color:"#c8dce8"}}>{type}</span><strong style={{color:"#00e5cc"}}>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {diagnostics.ado.missing_optional_fields.length > 0 && (
                <div style={{marginBottom:16,border:"1px solid rgba(255,68,102,0.12)",padding:12,background:"rgba(255,68,102,0.04)"}}>
                  <div style={{fontSize:9,color:"#ff4466",letterSpacing:2,marginBottom:8}}>// OPTIONAL ADO FIELDS NOT FOUND //</div>
                  <div style={{fontSize:10,color:"#c8dce8"}}>{diagnostics.ado.missing_optional_fields.join(", ")}</div>
                </div>
              )}

              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:"#ff9900",letterSpacing:2,marginBottom:6}}>// SAMPLE ITEMS SEEN BY PRODUCT LAB //</div>
                <table className="mod-table">
                  <thead><tr><th style={{width:70}}>ADO ID</th><th>TITLE</th><th style={{width:120}}>RAW TYPE</th><th style={{width:120}}>RESOLVED</th><th style={{width:90}}>STATE</th></tr></thead>
                  <tbody>
                    {diagnostics.ado.sample_items.map(item => (
                      <tr key={item.ado_id}>
                        <td style={{fontSize:9,color:"#7899b0"}}>{item.ado_id}</td>
                        <td style={{fontSize:10,color:"#c8dce8"}}>{item.title}</td>
                        <td style={{fontSize:9,color:"#ff9900"}}>{item.raw_work_item_type || "—"}</td>
                        <td style={{fontSize:9,color:"#00e5cc"}}>{item.resolved_work_item_type || "—"}</td>
                        <td style={{fontSize:9,color:"#00ff88"}}>{item.state || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{border:"1px solid rgba(0,212,255,0.12)",padding:12,background:"rgba(0,212,255,0.04)"}}>
                  <div style={{fontSize:9,color:"#00d4ff",letterSpacing:2,marginBottom:8}}>// NEW SPRINTS IN PREVIEW //</div>
                  <div style={{fontSize:10,color:"#7899b0",lineHeight:1.8}}>
                    {diagnostics.preview.sprint_names_new.length > 0 ? diagnostics.preview.sprint_names_new.map(name => (
                      <div key={name} style={{color:"#c8dce8"}}>{name}</div>
                    )) : <div style={{color:"#556677"}}>No new sprints detected.</div>}
                  </div>
                </div>
                <div style={{border:"1px solid rgba(255,153,0,0.12)",padding:12,background:"rgba(255,153,0,0.04)"}}>
                  <div style={{fontSize:9,color:"#ff9900",letterSpacing:2,marginBottom:8}}>// MODIFIED SPRINTS IN PREVIEW //</div>
                  <div style={{fontSize:10,color:"#7899b0",lineHeight:1.8}}>
                    {diagnostics.preview.sprint_names_modified.length > 0 ? diagnostics.preview.sprint_names_modified.map(name => (
                      <div key={name} style={{color:"#c8dce8"}}>{name}</div>
                    )) : <div style={{color:"#556677"}}>No modified sprints detected.</div>}
                  </div>
                </div>
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-icon" style={{marginRight:"auto",color:"#fbbf24",borderColor:"rgba(251,191,36,0.3)"}} onClick={()=>openDiagnostics(selected)}>
                ◈ RUN AGAIN
              </button>
              <button className="btn-cancel" onClick={()=>setModal(null)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {modal==="logs" && selected && (
        <div className="mod-overlay" onClick={()=>setModal(null)}>
          <div className="mod-modal" style={{maxWidth:780}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// INTEGRATIONS //</span>
                <h3 className="mod-modal__title">SYNC LOGS <span>{selected.name}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{overflowY:"auto",maxHeight:"60vh"}}>
              {logs.length===0 ? (
                <div style={{fontSize:11,color:"#7899b0",textAlign:"center",padding:"20px 0"}}>No sync logs yet</div>
              ) : (
                <table className="mod-table">
                  <thead><tr>
                    <th style={{width:110}}>OPERATION</th>
                    <th style={{width:90}}>STATUS</th>
                    <th>STARTED</th>
                    <th style={{width:70}}>DURATION</th>
                    <th style={{width:60,textAlign:"center"}}>CREATED</th>
                    <th style={{width:60,textAlign:"center"}}>UPDATED</th>
                    <th>RESULT / ERROR</th>
                  </tr></thead>
                  <tbody>
                    {logs.map(l => {
                      const sc = STATUS_COLORS[l.status] || "#7899b0";
                      const isRunning = l.status === "running";
                      const opLabel = l.operation_type === "apply" ? "APPLY" : "FULL SYNC";
                      const opColor = l.operation_type === "apply" ? "#00e5cc" : "#7899b0";
                      let duration = "—";
                      if (l.finished_at) {
                        const ms = new Date((l.finished_at.includes("Z")||l.finished_at.includes("+"))?l.finished_at:l.finished_at+"Z").getTime() - new Date((l.started_at.includes("Z")||l.started_at.includes("+"))?l.started_at:l.started_at+"Z").getTime();
                        const secs = Math.round(ms/1000);
                        duration = secs >= 60 ? `${Math.floor(secs/60)}m ${secs%60}s` : `${secs}s`;
                      } else if (isRunning) { duration = "running…"; }
                      const resultText = l.status==="completed" ? `+${l.items_created} created · ~${l.items_updated} updated${l.details?.sprints_created?` · +${l.details.sprints_created} sprints`:""}` : l.error_message?.substring(0,70)||"—";
                      return (
                        <tr key={l.id} style={{opacity:isRunning?0.85:1}}>
                          <td><span style={{fontSize:9,padding:"1px 6px",borderRadius:2,border:`1px solid ${opColor}44`,color:opColor,background:`${opColor}0d`,letterSpacing:1}}>{opLabel}</span></td>
                          <td><span style={{fontSize:9,padding:"1px 6px",borderRadius:2,border:`1px solid ${sc}44`,color:sc,background:`${sc}0d`,display:"inline-flex",alignItems:"center",gap:4}}>
                            {isRunning && <span style={{width:5,height:5,borderRadius:"50%",background:"#00d4ff",display:"inline-block",animation:"pulse 1s infinite"}} />}
                            {l.status.toUpperCase()}
                          </span></td>
                          <td style={{fontSize:10,color:"#7899b0"}}>{fmtDate(l.started_at)}</td>
                          <td style={{fontSize:9,color:isRunning?"#00d4ff":"#7899b0"}}>{duration}</td>
                          <td style={{textAlign:"center",fontSize:11,color:"#00ff88"}}>{l.status==="completed"?l.items_created:"—"}</td>
                          <td style={{textAlign:"center",fontSize:11,color:"#00d4ff"}}>{l.status==="completed"?l.items_updated:"—"}</td>
                          <td
                            style={{
                              fontSize:9,
                              color:l.status==="failed"?"#ff4466":l.status==="completed"?"#556677":"#7899b0",
                              maxWidth:280,
                              whiteSpace:"normal",
                              wordBreak:"break-word",
                              lineHeight:1.5,
                              verticalAlign:"top"
                            }}
                            title={l.error_message || resultText}
                          >
                            {resultText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-icon" style={{marginRight:"auto"}} onClick={()=>loadLogs(selected.id)}>⟳ REFRESH</button>
              <button className="btn-cancel" onClick={()=>setModal(null)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

    </ModuleLayout>
  );
}
