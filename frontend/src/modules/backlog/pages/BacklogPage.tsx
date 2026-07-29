import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface ItemType { item_type_id: number; name: string; display_order: number; is_active: boolean; }
interface Note { note_id: number; item_id: number; author: string; content: string; created_at: string; }
interface Stakeholder { stakeholder_id: number; full_name: string; }
interface TeamMemberProduct { id: number; member_id: number; product_id: number; role?: string; start_date?: string; end_date?: string; is_active: boolean; }
interface TeamMember { member_id: number; full_name: string; email?: string; resource_type: string; department?: string; company?: string; is_active: boolean; products?: TeamMemberProduct[]; }
interface Sprint {
  sprint_id: number; product_id: number; name: string; goal?: string;
  start_date?: string; end_date?: string; status: string;
  capacity?: number; velocity?: number; created_at: string; updated_at: string;
}
interface BacklogItem {
  item_id: number; product_id?: number; feature_id?: number; sprint_id?: number;
  start_sprint_id?: number; end_sprint_id?: number;
  requester_stakeholder_id?: number; assigned_to_member_id?: number;
  ado_id?: string; item_type_id?: number; title: string; description?: string;
  current_status: string; business_value?: string; acceptance_criteria?: string;
  definition_of_done?: string; business_rules?: string;
  story_points?: number; priority: number;
  wsjf_business_value: number; wsjf_time_criticality: number;
  wsjf_risk_reduction: number; wsjf_job_size: number; wsjf_score: number;
  created_at: string; updated_at: string; completed_at?: string;
}

const FIB = [1, 2, 3, 5, 8, 13, 20];
const calcWsjf = (bv: number, tc: number, rr: number, js: number): number =>
  js > 0 ? parseFloat(((bv + tc + rr) / js).toFixed(1)) : 0;
const wsjfLabel = (score: number, t: (k: string) => string) => {
  if (score >= 20) return { text: t("backlog.wsjf_critical"), color: "#ff6b6b" };
  if (score >= 10) return { text: t("backlog.wsjf_high"), color: "#ff9900" };
  if (score >= 5)  return { text: t("backlog.wsjf_medium"), color: "#00d4ff" };
  return { text: t("backlog.wsjf_low"), color: "#7899b0" };
};
const EMPTY = {
  title: "", description: "", item_type_id: "", current_status: "open",
  ado_id: "", story_points: "", priority: "3", sprint_id: "",
  requester_stakeholder_id: "", assigned_to_member_id: "",
  business_value: "", acceptance_criteria: "", definition_of_done: "", business_rules: "",
  wsjf_business_value: "1", wsjf_time_criticality: "1", wsjf_risk_reduction: "1", wsjf_job_size: "1",
};
const EMPTY_SPRINT = { name: "", goal: "", start_date: "", end_date: "", status: "planned", capacity: "", velocity: "" };
const LINK_TYPES: Record<string, string> = {
  "parent_of": "is parent of", "child_of": "is child of",
  "predecessor_of": "predecessor of", "successor_of": "successor of",
  "blocks": "blocks", "blocked_by": "is blocked by",
  "relates_to": "relates to", "duplicates": "duplicates", "cloned_from": "cloned from",
};

const TEAM_ROLES = [
  "Developer","Frontend Developer","Backend Developer","Full-Stack Developer",
  "Tech Lead","Team Lead",
  "QA Engineer","DevOps / SRE",
  "UX Designer","UI Designer",
  "Business Analyst","Data Analyst","Data Scientist","BI Developer",
  "AI Engineer","ML Engineer","LLM Engineer","MLOps Engineer","Prompt Engineer",
  "Scrum Master","Product Owner","Architect","Project Manager",
];
const STATUSES = ["open", "in_progress", "done", "blocked", "cancelled"];
const SPRINT_STATUSES = ["planned", "active", "completed", "cancelled"];
const SC: Record<string, string> = { open: "#00d4ff", in_progress: "#ff9900", done: "#00ff88", blocked: "#ff6b6b", cancelled: "#7899b0" };
const sc = (s: string) => SC[s] ?? "#7899b0";
const SPRINT_SC: Record<string, string> = { planned: "#7899b0", active: "#00d4ff", completed: "#00ff88", cancelled: "#ff6b6b" };
const ssc = (s: string) => SPRINT_SC[s] ?? "#7899b0";
const DIM = "#7899b0";

export default function BacklogPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"items" | "sprints" | "team" | "network">("items");
  const [netLinks, setNetLinks] = useState<{link_id:number;source_id:number;target_id:number;link_type:string}[]>([]);
  const [netLoading, setNetLoading] = useState(false);
  const [netFilterSprints, setNetFilterSprints] = useState<string[]>([]);
  const [netFilterOpen, setNetFilterOpen] = useState(false);
  const [allProductItems, setAllProductItems] = useState<BacklogItem[]>([]);
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<BacklogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [filterSprintId, setFilterSprintId] = useState("");
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [productStakeholders, setProductStakeholders] = useState<Stakeholder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintLoading, setSprintLoading] = useState(false);
  const [sprintError, setSprintError] = useState("");
  const [sprintModal, setSprintModal] = useState<"create" | "edit" | null>(null);
  const [sprintForm, setSprintForm] = useState({ ...EMPTY_SPRINT });
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [savingSprint, setSavingSprint] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  // — Item links —
  const [links, setLinks] = useState<{link_id:number;source_id:number;target_id:number;link_type:string;target_title?:string}[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [newLinkType, setNewLinkType] = useState("relates_to");
  const [newLinkTarget, setNewLinkTarget] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  // — Inline notes panel (row click) —
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [inlineNotes, setInlineNotes] = useState<Note[]>([]);
  const [loadingInlineNotes, setLoadingInlineNotes] = useState(false);
  const [inlineNoteContent, setInlineNoteContent] = useState("");
  const [savingInlineNote, setSavingInlineNote] = useState(false);
  // — Team member CRUD —
  const EMPTY_MEMBER = { full_name: "", email: "", resource_type: "internal", department: "", company: "", role: "", start_date: "", end_date: "" };
  const [teamModal, setTeamModal] = useState<"create" | "edit" | null>(null);
  const [teamModalMode, setTeamModalMode] = useState<"new" | "link">("new");
  const [teamForm, setTeamForm] = useState({ ...EMPTY_MEMBER });
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [linkMemberId, setLinkMemberId] = useState("");
  const [linkRole, setLinkRole] = useState("");
  const [linkStartDate, setLinkStartDate] = useState("");
  const [linkEndDate, setLinkEndDate] = useState("");

  const { user } = useAuth();

  const SIZE = 20;
  const pid = productId ? parseInt(productId, 10) : undefined;

  useEffect(() => { apiGet<ItemType[]>("/backlog/types/list").then(setItemTypes).catch(() => {}); }, []);

  useEffect(() => {
    if (pid) {
      apiGet<{ items: Stakeholder[] }>(`/stakeholders?product_id=${pid}&size=200`)
        .then(r => setProductStakeholders(r.items))
        .catch(() => setProductStakeholders([]));
    } else { setProductStakeholders([]); }
  }, [pid]);

  const loadTeamMembers = () => {
    if (pid) { apiGet<TeamMember[]>(`/team-members/by-product/${pid}`).then(setTeamMembers).catch(() => setTeamMembers([])); }
    else { setTeamMembers([]); }
  };
  useEffect(() => { loadTeamMembers(); }, [pid]);

  const loadSprints = () => {
    if (!pid) { setSprints([]); return; }
    setSprintLoading(true); setSprintError("");
    apiGet<Sprint[]>(`/backlog/sprints?product_id=${pid}`)
      .then(setSprints)
      .catch(e => setSprintError(e instanceof Error ? e.message : t("backlog.spr_err_load")))
      .finally(() => setSprintLoading(false));
  };
  useEffect(() => { loadSprints(); }, [pid]);

  const loadNotes = (itemId: number) => {
    setLoadingNotes(true);
    apiGet<Note[]>(`/backlog/${itemId}/notes`).then(setNotes).catch(() => setNotes([])).finally(() => setLoadingNotes(false));
  };
  const handleAddNote = async (itemId: number) => {
    if (!noteContent.trim()) return;
    const author = user?.user_full_name ?? "—";
    setSavingNote(true);
    try { await apiPost(`/backlog/${itemId}/notes`, { author, content: noteContent.trim() }); setNoteContent(""); loadNotes(itemId); }
    catch { /* ignore */ } finally { setSavingNote(false); }
  };
  const handleDeleteNote = async (itemId: number, noteId: number) => {
    if (!confirm(t("backlog.note_confirm_delete"))) return;
    try { await apiDelete(`/backlog/${itemId}/notes/${noteId}`); loadNotes(itemId); } catch { /* ignore */ }
  };

  const loadAllProductItems = () => {
    if (!pid) return;
    apiGet<{items: BacklogItem[]; total: number}>(`/backlog?product_id=${pid}&size=200&page=1`)
      .then(r => setAllProductItems(r.items ?? [])).catch(() => setAllProductItems([]));
  };

  const loadLinks = (itemId: number) => {
    setLoadingLinks(true);
    apiGet<{link_id:number;source_id:number;target_id:number;link_type:string;target_title?:string}[]>(`/backlog/${itemId}/links`)
      .then(setLinks).catch(() => setLinks([])).finally(() => setLoadingLinks(false));
  };
  const handleAddLink = async (itemId: number) => {
    if (!newLinkTarget) return;
    setSavingLink(true);
    try { await apiPost(`/backlog/${itemId}/links`, { target_id: parseInt(newLinkTarget, 10), link_type: newLinkType }); setNewLinkTarget(""); loadLinks(itemId); }
    catch { /* ignore */ } finally { setSavingLink(false); }
  };
  const handleDeleteLink = async (itemId: number, linkId: number) => {
    if (!confirm(t("backlog.link_confirm_delete"))) return;
    try { await apiDelete(`/backlog/${itemId}/links/${linkId}`); loadLinks(itemId); } catch { /* ignore */ }
  };

  const loadInlineNotes = (itemId: number) => {
    setLoadingInlineNotes(true);
    apiGet<Note[]>(`/backlog/${itemId}/notes`).then(setInlineNotes).catch(() => setInlineNotes([])).finally(() => setLoadingInlineNotes(false));
  };
  const handleSelectRow = (item: BacklogItem) => {
    if (selectedItem?.item_id === item.item_id) { setSelectedItem(null); setInlineNotes([]); return; }
    setSelectedItem(item); setInlineNoteContent(""); loadInlineNotes(item.item_id);
  };
  const handleAddInlineNote = async (itemId: number) => {
    if (!inlineNoteContent.trim()) return;
    const author = user?.user_full_name ?? "—";
    setSavingInlineNote(true);
    try { await apiPost(`/backlog/${itemId}/notes`, { author, content: inlineNoteContent.trim() }); setInlineNoteContent(""); loadInlineNotes(itemId); }
    catch { /* ignore */ } finally { setSavingInlineNote(false); }
  };
  const handleDeleteInlineNote = async (itemId: number, noteId: number) => {
    if (!confirm(t("backlog.note_confirm_delete"))) return;
    try { await apiDelete(`/backlog/${itemId}/notes/${noteId}`); loadInlineNotes(itemId); } catch { /* ignore */ }
  };

  const loadAllMembers = () => {
    apiGet<Paginated<TeamMember>>("/team-members?size=200")
      .then(r => { setAllMembers(r.items ?? []); })
      .catch((e: unknown) => {
        setTeamError(`Erro ao carregar membros: ${e instanceof Error ? e.message : "desconhecido"}`);
        setAllMembers([]);
      });
  };
  const openCreateMember = () => {
    setTeamForm({ ...EMPTY_MEMBER }); setEditingMember(null); setTeamError("");
    setTeamModalMode("new"); setLinkMemberId(""); setLinkRole(""); setLinkStartDate(""); setLinkEndDate("");
    loadAllMembers();
    setTeamModal("create");
  };
  const openEditMember = (m: TeamMember) => {
    const assoc = m.products?.find(p => p.product_id === pid);
    setTeamForm({ full_name: m.full_name, email: m.email ?? "", resource_type: m.resource_type, department: m.department ?? "", company: m.company ?? "", role: assoc?.role ?? "", start_date: assoc?.start_date ? assoc.start_date.slice(0, 10) : "", end_date: assoc?.end_date ? assoc.end_date.slice(0, 10) : "" });
    setEditingMember(m); setTeamError(""); setTeamModal("edit");
  };
  const closeTeamModal = () => { setTeamModal(null); setEditingMember(null); };
  const handleLinkMember = async () => {
    if (!linkMemberId || !pid) return;
    setSavingTeam(true); setTeamError("");
    try {
      await apiPost(`/team-members/${linkMemberId}/products`, { product_id: pid, role: linkRole || null, start_date: linkStartDate || null, end_date: linkEndDate || null });
      closeTeamModal(); loadTeamMembers();
    } catch (e: unknown) { setTeamError(e instanceof Error ? e.message : t("backlog.team_err_save")); }
    finally { setSavingTeam(false); }
  };
  const handleSaveMember = async () => {
    if (!teamForm.full_name.trim() || !pid) return;
    setSavingTeam(true); setTeamError("");
    try {
      const md = { full_name: teamForm.full_name.trim(), email: teamForm.email || null, resource_type: teamForm.resource_type, department: teamForm.department || null, company: teamForm.company || null };
      const ad = { role: teamForm.role || null, start_date: teamForm.start_date || null, end_date: teamForm.end_date || null };
      if (teamModal === "create") { const m = await apiPost<TeamMember>("/team-members", md); await apiPost(`/team-members/${m.member_id}/products`, { product_id: pid, ...ad }); }
      else if (editingMember) { await apiPatch(`/team-members/${editingMember.member_id}`, md); await apiPatch(`/team-members/${editingMember.member_id}/products/${pid}`, ad); }
      closeTeamModal(); loadTeamMembers();
    } catch (e: unknown) { setTeamError(e instanceof Error ? e.message : t("backlog.team_err_save")); }
    finally { setSavingTeam(false); }
  };
  const handleRemoveMember = async (memberId: number) => {
    if (!confirm(t("backlog.team_confirm_remove")) || !pid) return;
    try { await apiDelete(`/team-members/${memberId}/products/${pid}`); loadTeamMembers(); } catch { /* ignore */ }
  };

  const typeLabel     = (id?: number) => itemTypes.find(x => x.item_type_id === id)?.name ?? "—";
  const sprintName    = (id?: number) => sprints.find(s => s.sprint_id === id)?.name ?? "—";
  const requesterName = (id?: number) => productStakeholders.find(s => s.stakeholder_id === id)?.full_name ?? "—";
  const assignedName  = (id?: number) => teamMembers.find(m => m.member_id === id)?.full_name ?? "—";

  const load = async (p = page) => {
    setLoading(true); setError("");
    try {
      let qs = `page=${p}&size=${SIZE}`;
      if (pid)                         qs += `&product_id=${pid}`;
      if (filterStatus)                qs += `&current_status=${filterStatus}`;
      if (filterTypeId)                qs += `&item_type_id=${filterTypeId}`;
      if (filterSprintId === "none")   qs += `&no_sprint=true`;
      else if (filterSprintId)         qs += `&sprint_id=${filterSprintId}`;
      const r = await apiGet<Paginated<BacklogItem>>(`/backlog?${qs}`);
      setItems(r.items); setTotal(r.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("backlog.err_load")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(1); setPage(1); }, [productId, filterStatus, filterTypeId, filterSprintId]);
  useEffect(() => { load(); }, [page]);

  const handleProductChange = (id: string) => { localStorage.setItem("pl_product", id); setProductId(id); };

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setNotes([]); setModal("create"); };
  const openEdit = (item: BacklogItem) => {
    setForm({
      title: item.title,
      description: item.description ?? "",
      item_type_id: item.item_type_id ? String(item.item_type_id) : "",
      current_status: item.current_status,
      ado_id: item.ado_id ?? "",
      story_points: String(item.story_points ?? ""),
      priority: String(item.priority),
      sprint_id: item.sprint_id ? String(item.sprint_id) : "",
      requester_stakeholder_id: item.requester_stakeholder_id ? String(item.requester_stakeholder_id) : "",
      assigned_to_member_id: item.assigned_to_member_id ? String(item.assigned_to_member_id) : "",
      business_value: item.business_value ?? "",
      acceptance_criteria: item.acceptance_criteria ?? "",
      definition_of_done: item.definition_of_done ?? "",
      business_rules: item.business_rules ?? "",
      wsjf_business_value: String(item.wsjf_business_value ?? 1),
      wsjf_time_criticality: String(item.wsjf_time_criticality ?? 1),
      wsjf_risk_reduction: String(item.wsjf_risk_reduction ?? 1),
      wsjf_job_size: String(item.wsjf_job_size ?? 1),
    });
    setEditing(item); setModal("edit"); loadNotes(item.item_id); loadLinks(item.item_id); setNewLinkType("relates_to"); setNewLinkTarget(""); loadAllProductItems();
  };
  const closeModal = () => { setModal(null); setEditing(null); };
  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const wBv = parseInt(form.wsjf_business_value, 10) || 1;
      const wTc = parseInt(form.wsjf_time_criticality, 10) || 1;
      const wRr = parseInt(form.wsjf_risk_reduction, 10) || 1;
      const wJs = parseInt(form.wsjf_job_size, 10) || 1;
      const body = {
        ...form,
        product_id: pid ?? null,
        item_type_id: form.item_type_id ? parseInt(form.item_type_id, 10) : null,
        story_points: form.story_points ? parseInt(form.story_points, 10) : null,
        priority: parseInt(form.priority, 10),
        sprint_id: form.sprint_id ? parseInt(form.sprint_id, 10) : null,
        start_sprint_id: (form as Record<string,string>).start_sprint_id ? parseInt((form as Record<string,string>).start_sprint_id, 10) : null,
        end_sprint_id: (() => {
          const endVal = (form as Record<string,string>).end_sprint_id;
          const startVal = (form as Record<string,string>).start_sprint_id;
          // If end is empty, default to start (= 1 sprint duration)
          const resolved = endVal || startVal || "";
          return resolved ? parseInt(resolved, 10) : null;
        })(),
        requester_stakeholder_id: form.requester_stakeholder_id ? parseInt(form.requester_stakeholder_id, 10) : null,
        assigned_to_member_id: form.assigned_to_member_id ? parseInt(form.assigned_to_member_id, 10) : null,
        wsjf_business_value: wBv, wsjf_time_criticality: wTc,
        wsjf_risk_reduction: wRr, wsjf_job_size: wJs,
        wsjf_score: calcWsjf(wBv, wTc, wRr, wJs),
      };
      if (modal === "create") await apiPost("/backlog", body);
      else if (editing) await apiPatch(`/backlog/${editing.item_id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("backlog.err_save")); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(t("backlog.confirm_delete"))) return;
    try { await apiDelete(`/backlog/${id}`); load(page); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : t("backlog.err_delete")); }
  };

  const openCreateSprint = () => { setSprintForm({ ...EMPTY_SPRINT }); setEditingSprint(null); setSprintModal("create"); };
  const openEditSprint = (s: Sprint) => {
    setSprintForm({
      name: s.name, goal: s.goal ?? "", status: s.status,
      start_date: s.start_date ? s.start_date.slice(0, 10) : "",
      end_date: s.end_date ? s.end_date.slice(0, 10) : "",
      capacity: s.capacity != null ? String(s.capacity) : "",
      velocity: s.velocity != null ? String(s.velocity) : "",
    });
    setEditingSprint(s); setSprintModal("edit");
  };
  const closeSprintModal = () => { setSprintModal(null); setEditingSprint(null); };
  const handleSaveSprint = async () => {
    if (!sprintForm.name.trim() || !pid) return;
    setSavingSprint(true);
    try {
      const body = {
        product_id: pid, name: sprintForm.name.trim(),
        goal: sprintForm.goal || null,
        start_date: sprintForm.start_date || null, end_date: sprintForm.end_date || null,
        status: sprintForm.status,
        capacity: sprintForm.capacity ? parseInt(sprintForm.capacity, 10) : null,
        velocity: sprintForm.velocity ? parseInt(sprintForm.velocity, 10) : null,
      };
      if (sprintModal === "create") await apiPost("/backlog/sprints", body);
      else if (editingSprint) await apiPatch(`/backlog/sprints/${editingSprint.sprint_id}`, body);
      closeSprintModal(); loadSprints();
    } catch (e: unknown) { setSprintError(e instanceof Error ? e.message : t("backlog.spr_err_save")); }
    finally { setSavingSprint(false); }
  };
  const handleDeleteSprint = async (id: number) => {
    if (!confirm(t("backlog.spr_confirm_delete"))) return;
    try { await apiDelete(`/backlog/sprints/${id}`); loadSprints(); }
    catch (e: unknown) { setSprintError(e instanceof Error ? e.message : t("backlog.spr_err_delete")); }
  };

  const tabStyle = (active: boolean) => ({
    padding: "8px 20px", fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: "pointer",
    border: "none", background: "transparent",
    color: active ? "#00d4ff" : DIM,
    borderBottom: active ? "2px solid #00d4ff" : "2px solid transparent",
    transition: "all .2s",
  } as React.CSSProperties);

  return (
    <ModuleLayout moduleIcon="◫" moduleName={t("backlog.module_name")} moduleAccent={t("backlog.module_accent")}
      selectedProductId={productId} onProductChange={handleProductChange}>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,212,255,0.15)", marginBottom: 20 }}>
        <button style={tabStyle(activeTab === "items")} onClick={() => setActiveTab("items")}>{t("backlog.tab_items")}</button>
        <button style={tabStyle(activeTab === "sprints")} onClick={() => setActiveTab("sprints")}>{t("backlog.tab_sprints")}</button>
        <button style={tabStyle(activeTab === "team")} onClick={() => setActiveTab("team")}>{t("backlog.tab_team")}</button>
        <button style={tabStyle(activeTab === "network")} onClick={() => {
          setActiveTab("network");
          if (pid) {
            setNetLoading(true);
            apiGet<{link_id:number;source_id:number;target_id:number;link_type:string}[]>(`/backlog/links/by-product?product_id=${pid}`)
              .then(setNetLinks).catch(()=>setNetLinks([])).finally(()=>setNetLoading(false));
          }
        }}>{t("backlog.tab_network")}</button>
      </div>

      {activeTab === "items" && (<>
        <div className="mod-header">
          <div className="mod-header__left">
            <span className="mod-header__eyebrow">{t("backlog.eyebrow")}</span>
            <h1 className="mod-header__title">{t("backlog.title")} <span>{t("backlog.title_accent")}</span></h1>
            <p className="mod-header__meta">{t("backlog.meta", { count: total })}</p>
          </div>
          <button className="btn-add" onClick={openCreate}>{t("backlog.btn_new")}</button>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <select className="mod-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">{t("backlog.filter_status")}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select className="mod-select" style={{ width: 160 }} value={filterTypeId} onChange={e => setFilterTypeId(e.target.value)}>
            <option value="">{t("backlog.filter_type")}</option>
            {itemTypes.map(tp => <option key={tp.item_type_id} value={tp.item_type_id}>{tp.name.toUpperCase()}</option>)}
          </select>
          <select className="mod-select" style={{ width: 180 }} value={filterSprintId} onChange={e => setFilterSprintId(e.target.value)}>
            <option value="">{t("backlog.filter_sprint")}</option>
            <option value="none">{t("backlog.filter_sprint_none")}</option>
            {sprints.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.name}</option>)}
          </select>
        </div>
        {error && <div className="mod-error">⚠ {error}</div>}
        <div className="mod-table-wrap">
          {loading ? <div className="mod-loading">{t("backlog.loading")}</div>
          : items.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">◫</div>
              <div className="mod-empty__title">{t("backlog.empty_title")}</div>
              <div className="mod-empty__sub">{t("backlog.empty_sub")}</div>
            </div>
          ) : (
            <table className="mod-table">
              <thead><tr>
                <th>{t("backlog.col_title")}</th><th>{t("backlog.col_type")}</th>
                <th>{t("backlog.col_status")}</th><th>{t("backlog.col_wsjf")}</th>
                <th>{t("backlog.col_sp")}</th><th>{t("backlog.col_sprint")}</th>
                <th>{t("backlog.col_requester")}</th><th>{t("backlog.col_assigned")}</th><th>{t("backlog.col_ado")}</th><th></th>
              </tr></thead>
              <tbody>
                {items.map(item => {
                  const lbl = wsjfLabel(item.wsjf_score, t);
                  const color = sc(item.current_status);
                  return (
                    <tr key={item.item_id}
                      style={{ cursor: "pointer", background: selectedItem?.item_id === item.item_id ? "rgba(0,212,255,0.06)" : undefined }}
                      onClick={() => handleSelectRow(item)}>
                      <td>
                        <strong>{item.title}</strong>
                        {item.description && <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{item.description.slice(0, 70)}{item.description.length > 70 ? "…" : ""}</div>}
                      </td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color: "#00e5cc", border: "1px solid rgba(0,229,204,0.3)", padding: "2px 6px" }}>{typeLabel(item.item_type_id).toUpperCase()}</span></td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color, border: `1px solid ${color}40`, padding: "2px 6px" }}>{item.current_status.replace("_", " ").toUpperCase()}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: lbl.color }}>{item.wsjf_score}</div>
                        <div style={{ fontSize: 8, letterSpacing: 1, color: lbl.color }}>{lbl.text}</div>
                      </td>
                      <td style={{ textAlign: "center", color: "#c8d8e8" }}>{item.story_points ?? "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{item.sprint_id ? sprintName(item.sprint_id) : "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{item.requester_stakeholder_id ? requesterName(item.requester_stakeholder_id) : "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{item.assigned_to_member_id ? assignedName(item.assigned_to_member_id) : "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{item.ado_id || "—"}</td>
                      <td><div className="row-actions">
                        <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(item); }}>{t("backlog.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={e => { e.stopPropagation(); handleDelete(item.item_id); }}>{t("backlog.btn_del")}</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {total > SIZE && (
            <div className="mod-pagination">
              <span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} {t("backlog.pagination_of")} {total}</span>
              <div className="mod-pagination__btns">
                <button className="btn-page" disabled={page===1} onClick={() => setPage(p=>p-1)}>{t("backlog.btn_prev")}</button>
                <button className="btn-page" disabled={page*SIZE>=total} onClick={() => setPage(p=>p+1)}>{t("backlog.btn_next")}</button>
              </div>
            </div>
          )}
        </div>

        {selectedItem && (
          <div style={{ marginTop: 16, border: "1px solid rgba(0,212,255,0.2)", borderRadius: 4, padding: "14px 16px", background: "rgba(0,212,255,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff" }}>{t("backlog.notes_heading")}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#c8d8e8", marginTop: 2 }}>{selectedItem.title}</div>
              </div>
              <button className="mod-modal__close" onClick={() => { setSelectedItem(null); setInlineNotes([]); }}>✕</button>
            </div>
            {loadingInlineNotes ? <div style={{ color: DIM, fontSize: 11 }}>{t("backlog.loading")}</div> : (<>
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                {inlineNotes.length === 0
                  ? <div style={{ color: DIM, fontSize: 11, fontStyle: "italic" }}>{t("backlog.notes_empty")}</div>
                  : inlineNotes.map(n => (
                    <div key={n.note_id} style={{ borderBottom: "1px solid rgba(0,212,255,0.08)", paddingBottom: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: "#00d4ff", fontWeight: 700, marginBottom: 2 }}>{n.author}</div>
                          <div style={{ fontSize: 12, color: "#c8d8e8", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.content}</div>
                          <div style={{ fontSize: 9, color: DIM, marginTop: 3 }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                        <button className="btn-icon btn-icon--danger" style={{ fontSize: 9, padding: "2px 6px", marginLeft: 8, flexShrink: 0 }}
                          onClick={e => { e.stopPropagation(); handleDeleteInlineNote(selectedItem.item_id, n.note_id); }}>✕</button>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea className="mod-textarea" style={{ flex: 1, fontSize: 11, minHeight: 50, resize: "vertical" }}
                  value={inlineNoteContent} onChange={e => setInlineNoteContent(e.target.value)}
                  placeholder={t("backlog.note_content_placeholder")}
                  onClick={e => e.stopPropagation()} />
                <button className="btn-save" style={{ fontSize: 10, padding: "6px 12px", whiteSpace: "nowrap" }}
                  onClick={e => { e.stopPropagation(); handleAddInlineNote(selectedItem.item_id); }}
                  disabled={savingInlineNote || !inlineNoteContent.trim()}>
                  {savingInlineNote ? "..." : t("backlog.note_btn_add")}
                </button>
              </div>
            </>)}
          </div>
        )}
      </>)}

      {activeTab === "network" && (() => {
        const NW = 200; const NH = 66; const CGAP = 130; const RGAP = 16; const PAD = 20;
        const BAND_HDR = 20; const BAND_PAD = 16;
        const SPRINT_COLORS = ["#00d4ff22","#ff990022","#00ff8822","#ff6b6b22","#9b59b622","#00e5cc22","#f39c1222"];
        const SPRINT_BORDER = ["#00d4ff55","#ff990055","#00ff8855","#ff6b6b55","#9b59b655","#00e5cc55","#f39c1255"];

        // Multi-select filter
        const filterActive = netFilterSprints.length > 0;
        const allItems = !filterActive ? items : items.filter(i => {
          const fids = netFilterSprints.map(s => parseInt(s, 10));
          if (fids.includes(0) && !i.sprint_id) return true; // "no sprint" option
          if (i.sprint_id && fids.includes(i.sprint_id)) return true;
          if (i.start_sprint_id && fids.includes(i.start_sprint_id)) return true;
          if (i.end_sprint_id && fids.includes(i.end_sprint_id)) return true;
          if (i.start_sprint_id && i.end_sprint_id && i.start_sprint_id !== i.end_sprint_id) {
            const sids = sprints.map(s => s.sprint_id);
            const si = sids.indexOf(i.start_sprint_id);
            const ei = sids.indexOf(i.end_sprint_id);
            if (si >= 0 && ei >= 0 && fids.some(fid => { const fi = sids.indexOf(fid); return fi >= si && fi <= ei; })) return true;
          }
          return false;
        });
        if (!pid) return <div className="mod-error">⚠ {t("backlog.team_no_product")}</div>;
        if (netLoading) return <div className="mod-loading">{t("backlog.loading")}</div>;
        if (allItems.length === 0) return <div className="mod-empty"><div className="mod-empty__icon">⬡</div><div className="mod-empty__title">{t("backlog.empty_title")}</div></div>;

        // Dependency link types (define forward direction for layout)
        const fwdTypes = new Set(["predecessor_of","parent_of","blocks"]);
        // Build forward edges (source→target = "target depends on source")
        const edges: {s:number;t:number;type:string}[] = [];
        netLinks.forEach(l => {
          if (fwdTypes.has(l.link_type)) edges.push({s:l.source_id, t:l.target_id, type:l.link_type});
          else edges.push({s:l.source_id, t:l.target_id, type:l.link_type});
        });

        // Global topological level assignment
        const level: Record<number, number> = {};
        allItems.forEach(i => { level[i.item_id] = 0; });
        const orderLinks = netLinks.filter(l => fwdTypes.has(l.link_type));
        for (let iter = 0; iter < allItems.length; iter++) {
          orderLinks.forEach(l => {
            if (level[l.source_id] !== undefined && level[l.target_id] !== undefined) {
              if (level[l.target_id] <= level[l.source_id]) level[l.target_id] = level[l.source_id] + 1;
            }
          });
        }

        // Sprint-band layout: group items by sprint, stack bands vertically
        const bandOrder: string[] = [];
        sprints.forEach(s => { if (allItems.some(i => i.sprint_id === s.sprint_id)) bandOrder.push(String(s.sprint_id)); });
        if (allItems.some(i => !i.sprint_id)) bandOrder.push("__none__");

        const pos: Record<number, {x:number;y:number}> = {};
        const bandRects: {key:string; x:number; y:number; w:number; h:number; colorIdx:number}[] = [];
        let currentBandY = PAD;
        const maxLevelGlobal = allItems.reduce((m, i) => Math.max(m, level[i.item_id] ?? 0), 0);
        const canvasW = PAD * 2 + (maxLevelGlobal + 1) * (NW + CGAP) - CGAP + 60;

        bandOrder.forEach((bandKey, bandColorIdx) => {
          const bandItems = allItems.filter(i => (i.sprint_id ? String(i.sprint_id) : "__none__") === bandKey);
          if (bandItems.length === 0) return;
          // Group by topological level within this band
          const lvGroups: Record<number, BacklogItem[]> = {};
          bandItems.forEach(item => {
            const lv = level[item.item_id] ?? 0;
            if (!lvGroups[lv]) lvGroups[lv] = [];
            lvGroups[lv].push(item);
          });
          const maxRowsInBand = Math.max(...Object.values(lvGroups).map(g => g.length), 0);
          const bandH = BAND_HDR + maxRowsInBand * (NH + RGAP) + BAND_PAD;

          bandRects.push({ key: bandKey, x: PAD - 8, y: currentBandY, w: canvasW - PAD * 2 + 16, h: bandH, colorIdx: bandColorIdx });

          Object.entries(lvGroups).forEach(([lv, lvItems]) => {
            lvItems.forEach((item, rowIdx) => {
              pos[item.item_id] = {
                x: PAD + parseInt(lv) * (NW + CGAP),
                y: currentBandY + BAND_HDR + rowIdx * (NH + RGAP)
              };
            });
          });
          currentBandY += bandH + 8;
        });
        const canvasH = currentBandY + PAD;

        const arrowColor = (type: string) => {
          if (type === "predecessor_of" || type === "successor_of") return "#ff9900";
          if (type === "parent_of" || type === "child_of") return "#00d4ff";
          if (type === "blocks" || type === "blocked_by") return "#ff6b6b";
          return "#7899b0";
        };

        // Multi-select UI: label for button
        const filterLabel = netFilterSprints.length === 0
          ? t("backlog.filter_sprint")
          : netFilterSprints.map(sid => sid === "0" ? "—" : (sprints.find(s => String(s.sprint_id) === sid)?.name ?? sid)).join(", ");

        return (
          <div onClick={() => setNetFilterOpen(false)}>
            <div style={{ marginBottom: 14 }}>
              <span className="mod-header__eyebrow">{t("backlog.net_eyebrow")}</span>
              <h1 className="mod-header__title" style={{ margin: "4px 0 2px" }}>{t("backlog.net_title")} <span>{t("backlog.net_accent")}</span></h1>
              {/* Multi-select sprint filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, position: "relative" }} onClick={e => e.stopPropagation()}>
                <div style={{ position: "relative" }}>
                  <button className="mod-select" style={{ width: 240, fontSize: 10, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => setNetFilterOpen(o => !o)}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{filterLabel}</span>
                    <span style={{ marginLeft: 6, fontSize: 8, flexShrink: 0 }}>▾</span>
                  </button>
                  {netFilterOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#0d1e36", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 4, minWidth: 240, padding: "6px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                      {/* Clear all */}
                      <div style={{ padding: "4px 12px", borderBottom: "1px solid rgba(0,212,255,0.1)", marginBottom: 4 }}>
                        <button style={{ fontSize: 9, color: "#00d4ff", background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}
                          onClick={() => { setNetFilterSprints([]); setNetFilterOpen(false); }}>
                          ✕ {t("backlog.filter_sprint")} (ALL)
                        </button>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", cursor: "pointer", fontSize: 10, color: DIM }}>
                        <input type="checkbox" checked={netFilterSprints.includes("0")}
                          onChange={e => setNetFilterSprints(prev => e.target.checked ? [...prev, "0"] : prev.filter(s => s !== "0"))} />
                        {t("backlog.filter_sprint_none")}
                      </label>
                      {sprints.map(s => (
                        <label key={s.sprint_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", cursor: "pointer", fontSize: 10, color: "#c8d8e8" }}>
                          <input type="checkbox" checked={netFilterSprints.includes(String(s.sprint_id))}
                            onChange={e => setNetFilterSprints(prev => e.target.checked ? [...prev, String(s.sprint_id)] : prev.filter(x => x !== String(s.sprint_id)))} />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {netFilterSprints.length > 0 && <span style={{ fontSize: 9, color: "#00d4ff" }}>{netFilterSprints.length} {t("backlog.filter_sprint").toLowerCase()}</span>}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 9, color: DIM, marginTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 20, height: 2, background: "#ff9900", display: "inline-block" }}></span>{t("backlog.net_legend_pred")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 20, height: 2, background: "#00d4ff", display: "inline-block" }}></span>{t("backlog.net_legend_parent")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 20, height: 2, background: "#ff6b6b", display: "inline-block" }}></span>{t("backlog.net_legend_blocks")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 20, height: 2, background: "#7899b0", display: "inline-block" }}></span>{t("backlog.net_legend_relates")}</span>
              </div>
            </div>
            <div style={{ overflowX: "auto", overflowY: "auto", background: "rgba(0,0,0,0.2)", borderRadius: 6, border: "1px solid rgba(0,212,255,0.1)", padding: 4 }}>
              <svg width={canvasW} height={canvasH} style={{ display: "block" }}>
                <defs>
                  {["#ff9900","#00d4ff","#ff6b6b","#7899b0"].map(c => (
                    <marker key={c} id={`arr-${c.slice(1)}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill={c} />
                    </marker>
                  ))}
                </defs>
                {/* Sprint band backgrounds */}
                {bandRects.map((band, idx) => {
                  const color = SPRINT_COLORS[idx % SPRINT_COLORS.length];
                  const border = SPRINT_BORDER[idx % SPRINT_BORDER.length];
                  const spr = band.key !== "__none__" ? sprints.find(s => String(s.sprint_id) === band.key) : null;
                  return (
                    <g key={band.key}>
                      <rect x={band.x} y={band.y} width={band.w} height={band.h} rx={6} ry={6} fill={color} stroke={border} strokeWidth="1" />
                      <text x={band.x + 8} y={band.y + 14} fontSize="9" fill={border} fontFamily="monospace" letterSpacing="1" fontWeight="700">
                        {spr ? spr.name.toUpperCase() : "— NO SPRINT —"}
                      </text>
                    </g>
                  );
                })}
                {/* Arrows */}
                {netLinks.map(l => {
                  const sp = pos[l.source_id]; const tp = pos[l.target_id];
                  if (!sp || !tp) return null;
                  const color = arrowColor(l.link_type);
                  const x1 = sp.x + NW; const y1 = sp.y + NH / 2;
                  const x2 = tp.x; const y2 = tp.y + NH / 2;
                  const cx1 = x1 + Math.abs(x2 - x1) * 0.4; const cy1 = y1;
                  const cx2 = x2 - Math.abs(x2 - x1) * 0.4; const cy2 = y2;
                  const isDashed = l.link_type === "relates_to" || l.link_type === "duplicates" || l.link_type === "cloned_from";
                  return (
                    <g key={l.link_id}>
                      <path d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
                        fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"
                        strokeDasharray={isDashed ? "4,3" : undefined}
                        markerEnd={`url(#arr-${color.slice(1)})`} />
                    </g>
                  );
                })}
                {/* Nodes */}
                {allItems.map(item => {
                  const p = pos[item.item_id]; if (!p) return null;
                  const color = sc(item.current_status);
                  const typeName = typeLabel(item.item_type_id);
                  const sprStart = sprints.find(s => s.sprint_id === (item.start_sprint_id ?? item.sprint_id));
                  const sprEnd = (item.end_sprint_id && item.end_sprint_id !== (item.start_sprint_id ?? item.sprint_id))
                    ? sprints.find(s => s.sprint_id === item.end_sprint_id) : null;
                  return (
                    <g key={item.item_id} style={{ cursor: "pointer" }} onClick={() => openEdit(item)}>
                      <rect x={p.x} y={p.y} width={NW} height={NH} rx={4} ry={4} fill="#0a1628" stroke={color} strokeWidth="1.5" />
                      <rect x={p.x} y={p.y} width={4} height={NH} rx={2} ry={2} fill={color} />
                      {typeName && <text x={p.x + 12} y={p.y + 13} fontSize="8" fill={color} fontFamily="monospace" letterSpacing="1">{typeName.toUpperCase()}</text>}
                      <foreignObject x={p.x + 10} y={p.y + 17} width={NW - 18} height={32}>
                        <div style={{ fontSize: 11, color: "#e0eaf4", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{item.title}</div>
                      </foreignObject>
                      <text x={p.x + 10} y={p.y + NH - 7} fontSize="8" fill={DIM} fontFamily="monospace">
                        {item.current_status.replace("_"," ").toUpperCase()}{item.story_points ? ` · ${item.story_points}sp` : ""}
                      </text>
                      {sprStart && (
                        <text x={p.x + NW - 6} y={p.y + 12} fontSize="7"
                          fill={sprEnd ? "#ff9900cc" : color + "cc"} fontFamily="monospace" textAnchor="end" letterSpacing="0.5">
                          {sprEnd ? `⚡${sprStart.name.slice(0,7)}→${sprEnd.name.slice(0,5)}` : `⚡${sprStart.name.slice(0,10)}`}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ fontSize: 9, color: DIM, marginTop: 8 }}>💡 {t("backlog.net_hint")}</div>
          </div>
        );
      })()}

      {activeTab === "team" && (<>
        <div className="mod-header">
          <div className="mod-header__left">
            <span className="mod-header__eyebrow">{t("backlog.team_eyebrow")}</span>
            <h1 className="mod-header__title">{t("backlog.team_title")} <span>{t("backlog.team_accent")}</span></h1>
            <p className="mod-header__meta">{t("backlog.team_meta", { count: teamMembers.length })}</p>
          </div>
          {pid && <button className="btn-add" onClick={openCreateMember}>{t("backlog.team_btn_new")}</button>}
        </div>
        {!pid && <div className="mod-error">⚠ {t("backlog.team_no_product")}</div>}
        {teamError && <div className="mod-error">⚠ {teamError}</div>}
        <div className="mod-table-wrap">
          {teamMembers.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">👥</div>
              <div className="mod-empty__title">{t("backlog.team_empty_title")}</div>
              <div className="mod-empty__sub">{t("backlog.team_empty_sub")}</div>
              {pid && (
                <div style={{ marginTop: 12, fontSize: 10, color: "#00d4ff", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 4, padding: "8px 14px", maxWidth: 400, lineHeight: 1.6 }}>
                  💡 {t("backlog.team_empty_hint")}
                </div>
              )}
            </div>
          ) : (
            <table className="mod-table">
              <thead><tr>
                <th>{t("backlog.team_col_name")}</th><th>{t("backlog.team_col_role")}</th>
                <th>{t("backlog.team_col_type")}</th><th>{t("backlog.team_col_dept")}</th>
                <th>{t("backlog.spr_col_dates")}</th><th></th>
              </tr></thead>
              <tbody>
                {teamMembers.map(m => {
                  const assoc = m.products?.find(p => p.product_id === pid);
                  return (
                    <tr key={m.member_id}>
                      <td><strong>{m.full_name}</strong>{m.email && <div style={{ fontSize: 10, color: DIM, marginTop: 1 }}>{m.email}</div>}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{assoc?.role || "—"}</td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color: "#00e5cc", border: "1px solid rgba(0,229,204,0.3)", padding: "2px 6px" }}>{m.resource_type.toUpperCase()}</span></td>
                      <td style={{ color: DIM, fontSize: 11 }}>{m.department || "—"}</td>
                      <td style={{ color: DIM, fontSize: 11 }}>{assoc?.start_date ? assoc.start_date.slice(0,10) : "—"}{assoc?.start_date && assoc?.end_date ? " → " : ""}{assoc?.end_date ? assoc.end_date.slice(0,10) : ""}</td>
                      <td><div className="row-actions">
                        <button className="btn-icon" onClick={() => openEditMember(m)}>{t("backlog.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleRemoveMember(m.member_id)}>{t("backlog.team_btn_remove")}</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>)}

      {activeTab === "sprints" && (<>
        <div className="mod-header">
          <div className="mod-header__left">
            <span className="mod-header__eyebrow">{t("backlog.spr_eyebrow")}</span>
            <h1 className="mod-header__title">{t("backlog.spr_title")} <span>{t("backlog.spr_accent")}</span></h1>
            <p className="mod-header__meta">{t("backlog.spr_meta", { count: sprints.length })}</p>
          </div>
          {pid && <button className="btn-add" onClick={openCreateSprint}>{t("backlog.spr_btn_new")}</button>}
        </div>
        {!pid && <div className="mod-error">⚠ {t("backlog.spr_no_product")}</div>}
        {sprintError && <div className="mod-error">⚠ {sprintError}</div>}
        <div className="mod-table-wrap">
          {sprintLoading ? <div className="mod-loading">{t("backlog.loading")}</div>
          : sprints.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty__icon">⚡</div>
              <div className="mod-empty__title">{t("backlog.spr_empty_title")}</div>
              <div className="mod-empty__sub">{t("backlog.spr_empty_sub")}</div>
            </div>
          ) : (
            <table className="mod-table">
              <thead><tr>
                <th>{t("backlog.spr_col_name")}</th><th>{t("backlog.spr_col_status")}</th>
                <th>{t("backlog.spr_col_dates")}</th><th>{t("backlog.spr_col_capacity")}</th>
                <th>{t("backlog.spr_col_velocity")}</th><th></th>
              </tr></thead>
              <tbody>
                {sprints.map(s => {
                  const color = ssc(s.status);
                  const pct = s.capacity && s.velocity ? Math.round((s.velocity/s.capacity)*100) : null;
                  return (
                    <tr key={s.sprint_id}>
                      <td><strong>{s.name}</strong>{s.goal && <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{s.goal.slice(0,80)}{s.goal.length>80?"…":""}</div>}</td>
                      <td><span style={{ fontSize: 10, letterSpacing: 1, color, border: `1px solid ${color}40`, padding: "2px 6px" }}>{s.status.toUpperCase()}</span></td>
                      <td style={{ color: DIM, fontSize: 11 }}>{s.start_date ? s.start_date.slice(0,10) : "—"}{s.start_date && s.end_date ? " → " : ""}{s.end_date ? s.end_date.slice(0,10) : ""}</td>
                      <td style={{ textAlign: "center", color: "#c8d8e8" }}>{s.capacity ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ color: "#c8d8e8" }}>{s.velocity ?? "—"}</div>
                        {pct !== null && <div style={{ fontSize: 9, color: pct >= 80 ? "#00ff88" : pct >= 50 ? "#ff9900" : "#ff6b6b" }}>{pct}%</div>}
                      </td>
                      <td><div className="row-actions">
                        <button className="btn-icon" onClick={() => openEditSprint(s)}>{t("backlog.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteSprint(s.sprint_id)}>{t("backlog.btn_del")}</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>)}

      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// BACKLOG //</span>
                <h3 className="mod-modal__title">{modal==="create"?t("backlog.modal_new"):t("backlog.modal_edit")} <span>{t("backlog.modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_title")} <span>*</span></label>
                <input className="mod-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder={t("backlog.placeholder_title")} />
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_type")}</label>
                  <select className="mod-select" value={form.item_type_id} onChange={e => setForm(f=>({...f,item_type_id:e.target.value}))}>
                    <option value="">{t("backlog.select_type")}</option>
                    {itemTypes.map(tp=><option key={tp.item_type_id} value={tp.item_type_id}>{tp.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_status")}</label>
                  <select className="mod-select" value={form.current_status} onChange={e => setForm(f=>({...f,current_status:e.target.value}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s.replace("_"," ").toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_priority")}</label>
                  <select className="mod-select" value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))}>
                    {[1,2,3,4,5].map(p=><option key={p} value={p}>{p} — {["CRITICAL","HIGH","MEDIUM","LOW","MINIMAL"][p-1]}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_story_points")}</label>
                  <input className="mod-input" type="number" min="0" value={form.story_points} onChange={e => setForm(f=>({...f,story_points:e.target.value}))} placeholder={t("backlog.placeholder_sp")} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field" style={{ flex: "0 0 50%" }}>
                  <label className="mod-field__label">{t("backlog.field_ado_id")}</label>
                  <input className="mod-input" value={form.ado_id} onChange={e => setForm(f=>({...f,ado_id:e.target.value}))} placeholder={t("backlog.placeholder_ado")} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_start_sprint")}</label>
                  <select className="mod-select" value={(form as Record<string,string>).start_sprint_id ?? form.sprint_id} onChange={e => { const v=e.target.value; setForm(f=>({...f, sprint_id:v, start_sprint_id:v})); }}>
                    <option value="">{t("backlog.select_sprint_none")}</option>
                    {sprints.map(s=><option key={s.sprint_id} value={s.sprint_id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_end_sprint")}</label>
                  <select className="mod-select" value={(form as Record<string,string>).end_sprint_id ?? ""} onChange={e => setForm(f=>({...f,end_sprint_id:e.target.value}))}>
                    <option value="">{t("backlog.select_sprint_none")}</option>
                    {sprints.map(s=><option key={s.sprint_id} value={s.sprint_id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_requester")}</label>
                  <select className="mod-select" value={form.requester_stakeholder_id} onChange={e => setForm(f=>({...f,requester_stakeholder_id:e.target.value}))}>
                    <option value="">{t("backlog.select_requester_none")}</option>
                    {productStakeholders.map(s=><option key={s.stakeholder_id} value={s.stakeholder_id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.field_assigned_to")}</label>
                  <select className="mod-select" value={form.assigned_to_member_id} onChange={e => setForm(f=>({...f,assigned_to_member_id:e.target.value}))}>
                    <option value="">{t("backlog.select_assigned_none")}</option>
                    {teamMembers.map(m=><option key={m.member_id} value={m.member_id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_description")}</label>
                <textarea className="mod-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder={t("backlog.placeholder_description")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_acceptance")}</label>
                <textarea className="mod-textarea" value={form.acceptance_criteria} onChange={e => setForm(f=>({...f,acceptance_criteria:e.target.value}))} placeholder={t("backlog.placeholder_acceptance")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_dod")}</label>
                <textarea className="mod-textarea" value={form.definition_of_done} onChange={e => setForm(f=>({...f,definition_of_done:e.target.value}))} placeholder={t("backlog.placeholder_dod")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_business_value")}</label>
                <textarea className="mod-textarea" value={form.business_value} onChange={e => setForm(f=>({...f,business_value:e.target.value}))} placeholder={t("backlog.placeholder_business_value")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.field_business_rules")}</label>
                <textarea className="mod-textarea" value={(form as Record<string,string>).business_rules ?? ""} onChange={e => setForm(f=>({...f,business_rules:e.target.value}))} placeholder={t("backlog.placeholder_business_rules")} />
              </div>
              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>{t("backlog.wsjf_heading")}</div>
                <div className="mod-field-row">
                  {([
                    { key: "wsjf_business_value",   label: t("backlog.wsjf_business_value") },
                    { key: "wsjf_time_criticality", label: t("backlog.wsjf_time_criticality") },
                    { key: "wsjf_risk_reduction",   label: t("backlog.wsjf_risk_reduction") },
                    { key: "wsjf_job_size",         label: t("backlog.wsjf_job_size") },
                  ] as { key: string; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="mod-field">
                      <label className="mod-field__label" style={{ fontSize: 9 }}>{label}</label>
                      <select className="mod-select" value={(form as Record<string,string>)[key]}
                        onChange={e => setForm(f=>({...f,[key]:e.target.value}))}>
                        {FIB.map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {(() => {
                  const score = calcWsjf(parseInt(form.wsjf_business_value,10)||1,parseInt(form.wsjf_time_criticality,10)||1,parseInt(form.wsjf_risk_reduction,10)||1,parseInt(form.wsjf_job_size,10)||1);
                  const lbl = wsjfLabel(score, t);
                  return (
                    <div style={{ fontSize: 11, letterSpacing: 1, marginTop: 6 }}>
                      {t("backlog.wsjf_score_label")} <span style={{ color: lbl.color, fontWeight: 700, fontSize: 16 }}>{score}</span>
                      <span style={{ color: lbl.color, marginLeft: 8, fontSize: 9 }}>— {lbl.text}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            {modal === "edit" && editing && (<>
              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>{t("backlog.links_heading")}</div>
                {loadingLinks ? <div style={{ color: DIM, fontSize: 11 }}>{t("backlog.loading")}</div> : (<>
                  <div style={{ maxHeight: 140, overflowY: "auto", marginBottom: 8 }}>
                    {links.length === 0
                      ? <div style={{ color: DIM, fontSize: 11, fontStyle: "italic" }}>{t("backlog.links_empty")}</div>
                      : links.map(lnk => (
                        <div key={lnk.link_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, borderBottom: "1px solid rgba(0,212,255,0.06)", paddingBottom: 5 }}>
                          <span style={{ fontSize: 9, color: "#ff9900", background: "rgba(255,153,0,0.1)", padding: "2px 5px", borderRadius: 2, whiteSpace: "nowrap" }}>
                            {LINK_TYPES[lnk.link_type] ?? lnk.link_type}
                          </span>
                          <span style={{ fontSize: 11, color: "#c8d8e8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lnk.target_title ?? `Item #${lnk.target_id}`}
                          </span>
                          <button className="btn-icon btn-icon--danger" style={{ fontSize: 9, padding: "2px 6px", flexShrink: 0 }}
                            onClick={() => handleDeleteLink(editing.item_id, lnk.link_id)}>✕</button>
                        </div>
                      ))
                    }
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select className="mod-select" style={{ flex: "0 0 155px", fontSize: 10 }} value={newLinkType} onChange={e => setNewLinkType(e.target.value)}>
                      {Object.entries(LINK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select className="mod-select" style={{ flex: 1, fontSize: 10 }} value={newLinkTarget} onChange={e => setNewLinkTarget(e.target.value)}>
                      <option value="">— {t("backlog.link_select_item")} —</option>
                      {(allProductItems.length > 0 ? allProductItems : items).filter(i => i.item_id !== editing.item_id).map(i => (
                        <option key={i.item_id} value={i.item_id}>[{typeLabel(i.item_type_id)}] {i.title.slice(0, 44)}{i.title.length > 44 ? "…" : ""}</option>
                      ))}
                    </select>
                    <button className="btn-save" style={{ fontSize: 10, padding: "6px 10px", whiteSpace: "nowrap" }}
                      onClick={() => handleAddLink(editing.item_id)} disabled={savingLink || !newLinkTarget}>
                      {savingLink ? "..." : t("backlog.link_btn_add")}
                    </button>
                  </div>
                </>)}
              </div>
              <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#00d4ff", marginBottom: 10 }}>{t("backlog.notes_heading")}</div>
                {loadingNotes ? <div style={{ color: DIM, fontSize: 11 }}>{t("backlog.loading")}</div> : (
                  <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
                    {notes.length === 0
                      ? <div style={{ color: DIM, fontSize: 11, fontStyle: "italic" }}>{t("backlog.notes_empty")}</div>
                      : notes.map(n => (
                        <div key={n.note_id} style={{ borderBottom: "1px solid rgba(0,212,255,0.08)", paddingBottom: 8, marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: "#00d4ff", fontWeight: 700, marginBottom: 2 }}>{n.author}</div>
                              <div style={{ fontSize: 12, color: "#c8d8e8", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.content}</div>
                              <div style={{ fontSize: 9, color: DIM, marginTop: 3 }}>{new Date(n.created_at).toLocaleString()}</div>
                            </div>
                            <button className="btn-icon btn-icon--danger" style={{ fontSize: 9, padding: "2px 6px", marginLeft: 8, flexShrink: 0 }}
                              onClick={() => handleDeleteNote(editing.item_id, n.note_id)}>✕</button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
                <div className="mod-field">
                  <label className="mod-field__label" style={{ fontSize: 9 }}>{t("backlog.note_content")}</label>
                  <textarea className="mod-textarea" style={{ fontSize: 11, minHeight: 60 }} value={noteContent}
                    onChange={e => setNoteContent(e.target.value)} placeholder={t("backlog.note_content_placeholder")} />
                </div>
                <button className="btn-save" style={{ marginTop: 6, fontSize: 10, padding: "6px 14px" }}
                  onClick={() => handleAddNote(editing.item_id)}
                  disabled={savingNote || !noteContent.trim()}>
                  {savingNote ? t("backlog.btn_saving") : t("backlog.note_btn_add")}
                </button>
              </div>
            </>)}
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("backlog.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSave} disabled={saving||!form.title.trim()}>
                {saving ? t("backlog.btn_saving") : t("backlog.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {sprintModal && (
        <div className="mod-overlay" onClick={closeSprintModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// SPRINTS //</span>
                <h3 className="mod-modal__title">{sprintModal==="create"?t("backlog.spr_modal_new"):t("backlog.spr_modal_edit")} <span>{t("backlog.spr_modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeSprintModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.spr_field_name")} <span>*</span></label>
                <input className="mod-input" value={sprintForm.name} onChange={e => setSprintForm(f=>({...f,name:e.target.value}))} placeholder={t("backlog.spr_placeholder_name")} />
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.spr_field_status")}</label>
                <select className="mod-select" value={sprintForm.status} onChange={e => setSprintForm(f=>({...f,status:e.target.value}))}>
                  {SPRINT_STATUSES.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_start")}</label>
                  <input className="mod-input" type="date" value={sprintForm.start_date}
                    onChange={e => setSprintForm(f=>({...f,start_date:e.target.value}))}
                    onClick={e => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }}
                    style={{ colorScheme: "dark", cursor: "pointer" }} />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_end")}</label>
                  <input className="mod-input" type="date" value={sprintForm.end_date}
                    onChange={e => setSprintForm(f=>({...f,end_date:e.target.value}))}
                    onClick={e => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }}
                    style={{ colorScheme: "dark", cursor: "pointer" }} />
                </div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_capacity")}</label>
                  <input className="mod-input" type="number" min="0" value={sprintForm.capacity} onChange={e => setSprintForm(f=>({...f,capacity:e.target.value}))} placeholder="Ex: 40" />
                </div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.spr_field_velocity")}</label>
                  <input className="mod-input" type="number" min="0" value={sprintForm.velocity} onChange={e => setSprintForm(f=>({...f,velocity:e.target.value}))} placeholder="Ex: 36" />
                </div>
              </div>
              <div className="mod-field">
                <label className="mod-field__label">{t("backlog.spr_field_goal")}</label>
                <textarea className="mod-textarea" value={sprintForm.goal} onChange={e => setSprintForm(f=>({...f,goal:e.target.value}))} placeholder={t("backlog.spr_placeholder_goal")} />
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeSprintModal}>{t("backlog.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSaveSprint} disabled={savingSprint||!sprintForm.name.trim()}>
                {savingSprint ? t("backlog.btn_saving") : t("backlog.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
      {teamModal && (
        <div className="mod-overlay" onClick={closeTeamModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// TEAM //</span>
                <h3 className="mod-modal__title">{teamModal==="create"?t("backlog.team_modal_new"):t("backlog.team_modal_edit")} <span>{t("backlog.team_modal_subtitle")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={closeTeamModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              {/* ── Mode toggle (only on CREATE) ── */}
              {teamModal === "create" && (
                <div style={{ display: "flex", gap: 0, marginBottom: 14, border: "1px solid rgba(0,212,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
                  {(["new","link"] as const).map(mode => (
                    <button key={mode} style={{ flex: 1, padding: "7px 0", fontSize: 10, letterSpacing: 2, fontWeight: 700, cursor: "pointer", border: "none", background: teamModalMode === mode ? "rgba(0,212,255,0.15)" : "transparent", color: teamModalMode === mode ? "#00d4ff" : DIM, transition: "all .2s" }}
                      onClick={() => { setTeamModalMode(mode); if (mode === "link") loadAllMembers(); }}>
                      {mode === "new" ? t("backlog.team_mode_new") : t("backlog.team_mode_link")}
                    </button>
                  ))}
                </div>
              )}

              {/* ── LINK EXISTING MODE ── */}
              {teamModal === "create" && teamModalMode === "link" ? (<>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 10, lineHeight: 1.5 }}>{t("backlog.team_link_hint")}</div>
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.team_link_select")} <span>*</span></label>
                  <select className="mod-select" value={linkMemberId} onChange={e => setLinkMemberId(e.target.value)}>
                    <option value="">— {t("backlog.team_link_placeholder")} —</option>
                    {allMembers.filter(m => !teamMembers.some(tm => tm.member_id === m.member_id)).map(m => (
                      <option key={m.member_id} value={m.member_id}>{m.full_name}{m.department ? ` (${m.department})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 8 }}>{t("backlog.team_product_section")}</div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("backlog.team_col_role")}</label>
                    <select className="mod-select" value={linkRole} onChange={e => setLinkRole(e.target.value)}>
                      <option value="">— {t("backlog.team_select_role")} —</option>
                      {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="mod-field-row" style={{ marginTop: 6 }}>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("backlog.spr_field_start")}</label>
                      <input className="mod-input" type="date" value={linkStartDate} onChange={e => setLinkStartDate(e.target.value)} onClick={e => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }} style={{ colorScheme: "dark", cursor: "pointer" }} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("backlog.spr_field_end")}</label>
                      <input className="mod-input" type="date" value={linkEndDate} onChange={e => setLinkEndDate(e.target.value)} onClick={e => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }} style={{ colorScheme: "dark", cursor: "pointer" }} />
                    </div>
                  </div>
                </div>
              </>) : (<>
                {/* ── NEW MEMBER / EDIT MODE ── */}
                <div className="mod-field">
                  <label className="mod-field__label">{t("backlog.team_field_name")} <span>*</span></label>
                  <input className="mod-input" value={teamForm.full_name} onChange={e => setTeamForm(f=>({...f,full_name:e.target.value}))} placeholder={t("backlog.team_placeholder_name")} />
                </div>
                <div className="mod-field-row">
                  <div className="mod-field">
                    <label className="mod-field__label">{t("backlog.team_field_email")}</label>
                    <input className="mod-input" type="email" value={teamForm.email} onChange={e => setTeamForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com" />
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("backlog.team_field_type")}</label>
                    <select className="mod-select" value={teamForm.resource_type} onChange={e => setTeamForm(f=>({...f,resource_type:e.target.value}))}>
                      <option value="internal">{t("backlog.team_type_internal")}</option>
                      <option value="outsourced">{t("backlog.team_type_outsourced")}</option>
                      <option value="consultant">{t("backlog.team_type_consultant")}</option>
                    </select>
                  </div>
                </div>
                <div className="mod-field-row">
                  <div className="mod-field">
                    <label className="mod-field__label">{t("backlog.team_field_dept")}</label>
                    <input className="mod-input" value={teamForm.department} onChange={e => setTeamForm(f=>({...f,department:e.target.value}))} placeholder={t("backlog.team_placeholder_dept")} />
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("backlog.team_field_company")}</label>
                    <input className="mod-input" value={teamForm.company} onChange={e => setTeamForm(f=>({...f,company:e.target.value}))} placeholder={t("backlog.team_placeholder_company")} />
                  </div>
                </div>
                <div style={{ borderTop: "1px solid rgba(0,212,255,0.15)", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#00d4ff", marginBottom: 4 }}>{t("backlog.team_product_section")}</div>
                  <div style={{ fontSize: 10, color: DIM, marginBottom: 8 }}>{t("backlog.team_product_hint")}</div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("backlog.team_col_role")}</label>
                    <select className="mod-select" value={teamForm.role} onChange={e => setTeamForm(f=>({...f,role:e.target.value}))}>
                      <option value="">— {t("backlog.team_select_role")} —</option>
                      {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="mod-field-row" style={{ marginTop: 6 }}>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("backlog.spr_field_start")}</label>
                      <input className="mod-input" type="date" value={teamForm.start_date} onChange={e => setTeamForm(f=>({...f,start_date:e.target.value}))} onClick={e => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }} style={{ colorScheme: "dark", cursor: "pointer" }} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("backlog.spr_field_end")}</label>
                      <input className="mod-input" type="date" value={teamForm.end_date} onChange={e => setTeamForm(f=>({...f,end_date:e.target.value}))} onClick={e => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }} style={{ colorScheme: "dark", cursor: "pointer" }} />
                    </div>
                  </div>
                </div>
              </>)}
              {teamError && <div className="mod-error" style={{ marginTop: 8 }}>⚠ {teamError}</div>}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeTeamModal}>{t("backlog.btn_cancel")}</button>
              <button className="btn-save"
                onClick={teamModalMode === "link" ? handleLinkMember : handleSaveMember}
                disabled={savingTeam || (teamModalMode === "link" ? !linkMemberId : !teamForm.full_name.trim())}>
                {savingTeam ? t("backlog.btn_saving") : t("backlog.btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
