import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface Company { id: number; company_name: string; company_type: string; cnpj?: string; website?: string; country?: string; is_active: boolean; notes?: string; created_at: string; }
interface Member { id: number; user_id: number; company_id: number; role: string; created_at: string; }
interface CompanyArea { id: number; company_id: number; business_area_id: number; area_name: string; area_type: string; area_color?: string; level: number; notes?: string; is_active: boolean; display_order: number; created_at: string; }
interface BusinessArea { id: number; area_name: string; area_type: string; area_color?: string; is_active: boolean; display_order: number; }
interface Stakeholder { stakeholder_id: number; full_name: string; email?: string; position_title?: string; }
interface Leader { id: number; company_id: number; business_area_id: number; area_name: string; area_type: string; area_color?: string; stakeholder_id: number; stakeholder_name: string; stakeholder_email?: string; stakeholder_role?: string; leadership_level: string; reports_to_member_id?: number; reports_to_name?: string; is_current: boolean; is_active: boolean; started_at?: string; ended_at?: string; role_in_area?: string; }
const PSvg=()=><svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{display:"inline-block",verticalAlign:"middle",marginRight:3}}><circle cx="8" cy="5" r="3" fill="currentColor"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>;

interface OrgLeader { id: number; stakeholder_name: string; stakeholder_role?: string; leadership_level: string; started_at?: string; subordinates: OrgLeader[]; }
interface OrgNode { id: number; area_name: string; area_type: string; area_color?: string; level: number; leaders: OrgLeader[]; children: OrgNode[]; }

const EMPTY: Omit<Company, "id"|"created_at"> = { company_name: "", company_type: "CLIENT", cnpj: "", website: "", country: "", is_active: true, notes: "" };
const TYPE_COLOR: Record<string, string> = { CLIENT: "#00d4ff", INTERNAL: "#00ff88", PARTNER: "#ff9900" };
const AREA_TYPE_COLORS: Record<string, string> = { STRATEGIC: "#c084fc", OPERATIONAL: "#00d4ff", SUPPORT: "#00ff88", TECHNOLOGY: "#00e5cc", COMMERCIAL: "#ff9900" };
const SIZE = 20;

// ── Area-based Tree Diagram ───────────────────────────────────────────────────

const LINE = "rgba(0,212,255,0.35)";
const AREA_CARD_W = 180;
const GAP = 16;

function AreaCard({ node }: { node: OrgNode }) {
  const accent = node.area_color || AREA_TYPE_COLORS[node.area_type] || "#7899b0";
  return (
    <div style={{ width:AREA_CARD_W, background:"rgba(5,15,30,0.9)", border:`1px solid ${accent}55`, borderTop:`2px solid ${accent}`, borderRadius:6, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
      {/* Area header */}
      <div style={{ padding:"7px 10px", background:`${accent}12`, borderBottom:`1px solid ${accent}22` }}>
        <div style={{ fontSize:8, color:accent, letterSpacing:1, fontWeight:700 }}>{node.area_type}</div>
        <div style={{ fontSize:10, fontWeight:700, color:"#e0eaff", lineHeight:1.3, marginTop:1 }}>{node.area_name}</div>
      </div>
      {/* Leaders list */}
      <div style={{ padding:"6px 8px" }}>
        {node.leaders.length === 0
          ? <div style={{ fontSize:7, color:"#444", textAlign:"center" }}>sem líderes</div>
          : node.leaders.map(l => <LeaderRow key={l.id} leader={l}/>)
        }
      </div>
    </div>
  );
}

function findLeafLeader(l: OrgLeader): OrgLeader { return (!l.subordinates||l.subordinates.length===0)?l:findLeafLeader(l.subordinates[0]); }

function LeaderRow({ leader }: { leader: OrgLeader }) {
  const leaf = findLeafLeader(leader);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize:6, padding:"1px 3px", background:"#c084fc10", border:"1px solid #c084fc33", borderRadius:2, color:"#c084fc", flexShrink:0, letterSpacing:0.5 }}>{leaf.leadership_level}</span>
      <span style={{ fontSize:8, fontWeight:600, color:"#c8dce8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{leaf.stakeholder_name}</span>
    </div>
  );
}

function AreaTreeNode({ node }: { node: OrgNode }) {
  const [col, setCol] = useState(false);
  const hasC = node.children.length > 0 && !col;

  return (
    <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ position:"relative", display:"inline-block" }}>
        <AreaCard node={node}/>
        {node.children.length > 0 && (
          <button onClick={()=>setCol(v=>!v)}
            title={col?"Expandir":"Colapsar"}
            style={{ position:"absolute", bottom:-9, left:"50%", transform:"translateX(-50%)", background:"#060e1c", border:`1px solid ${LINE}`, borderRadius:"50%", width:18, height:18, cursor:"pointer", color:"#00d4ff", fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", zIndex:3 }}>
            {col?"▼":"▲"}
          </button>
        )}
      </div>

      {hasC && (
        <>
          <div style={{ width:1, height:16, background:LINE, marginTop:9 }}/>
          {node.children.length === 1 ? (
            <AreaTreeNode node={node.children[0]}/>
          ) : (
            <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center" }}>
              <div style={{ width:(AREA_CARD_W + GAP) * node.children.length - GAP, height:1, background:LINE }}/>
              <div style={{ display:"inline-flex", gap:GAP, alignItems:"flex-start" }}>
                {node.children.map(child => (
                  <div key={child.id} style={{ display:"inline-flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:1, height:16, background:LINE }}/>
                    <AreaTreeNode node={child}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UnifiedOrgChart({ orgChart }: { orgChart: OrgNode[] }) {
  if (orgChart.length === 0) return <div style={{ color:"#7899b0", fontSize:11 }}>Nenhuma área com líderes cadastrada.</div>;
  return (
    <div style={{ overflowX:"auto", paddingBottom:16, paddingTop:8 }}>
      <div style={{ display:"flex", justifyContent:"center", gap:GAP, minWidth:"max-content", paddingLeft:16, paddingRight:16 }}>
        {orgChart.map(r=><AreaTreeNode key={r.id} node={r}/>)}
      </div>
    </div>
  );
}


export default function CompaniesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create"|"edit"|null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Company|null>(null);
  const [saving, setSaving] = useState(false);
  // Areas/Leaders modal
  const [panelComp, setPanelComp] = useState<Company|null>(null);
  const [panelTab, setPanelTab] = useState<"members"|"areas"|"leaders"|"orgchart">("areas");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberUid, setMemberUid] = useState("");
  const [memberRole, setMemberRole] = useState("PM");
  const [addingMember, setAddingMember] = useState(false);
  const [companyAreas, setCompanyAreas] = useState<CompanyArea[]>([]);
  const [availableAreas, setAvailableAreas] = useState<BusinessArea[]>([]);
  const [selAreaId, setSelAreaId] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [orgChart, setOrgChart] = useState<OrgNode[]>([]);
  const [leaderForm, setLeaderForm] = useState({ business_area_id: "", stakeholder_id: "", leadership_level: "COORDINATOR", reports_to_member_id: "", started_at: "" });
  const [savingLeader, setSavingLeader] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = async (p = page) => {
    setLoading(true); setError("");
    try { const r = await apiGet<Paginated<Company>>(`/companies?page=${p}&size=${SIZE}`); setItems(r.items); setTotal(r.total); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : t("companies.err_load")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page]);

  const loadMembers = useCallback(async (c: Company) => {
    try { setMembers(await apiGet<Member[]>(`/companies/${c.id}/members`)); } catch { setMembers([]); }
  }, []);

  const loadAreas = useCallback(async (c: Company) => {
    try {
      const [assoc, avail] = await Promise.all([apiGet<CompanyArea[]>(`/companies/${c.id}/areas`), apiGet<BusinessArea[]>(`/business-areas/for-company/${c.id}`)]);
      setCompanyAreas(assoc); setAvailableAreas(avail);
    } catch { setCompanyAreas([]); setAvailableAreas([]); }
  }, []);

  const loadStakeholders = useCallback(async (c: Company) => {
    try { const r = await apiGet<{ items: Stakeholder[] }>(`/stakeholders?company_id=${c.id}&size=200`); setStakeholders(r.items ?? []); }
    catch { setStakeholders([]); }
  }, []);

  const loadLeaders = useCallback(async (c: Company) => {
    try {
      const [all, chart] = await Promise.all([apiGet<Leader[]>(`/companies/${c.id}/leaders`), apiGet<OrgNode[]>(`/companies/${c.id}/org-chart`)]);
      setLeaders(all); setOrgChart(chart);
    } catch { setLeaders([]); setOrgChart([]); }
  }, []);

  const openPanel = (c: Company, tab: "members"|"areas"|"leaders"|"orgchart" = "areas") => {
    setPanelComp(c); setPanelTab(tab); setSelAreaId(""); setShowHistory(false);
    loadMembers(c); loadAreas(c); loadStakeholders(c); loadLeaders(c);
  };

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (item: Company) => { setForm({ company_name: item.company_name, company_type: item.company_type, cnpj: item.cnpj??"", website: item.website??"", country: item.country??"", is_active: item.is_active, notes: item.notes??"" }); setEditing(item); setModal("edit"); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.company_name.trim()) return; setSaving(true);
    try {
      const body = { ...form, cnpj: form.cnpj||null, website: form.website||null, country: form.country||null, notes: form.notes||null };
      if (modal === "create") await apiPost("/companies", body);
      else if (editing) await apiPatch(`/companies/${editing.id}`, body);
      closeModal(); load(page);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("companies.err_save")); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("companies.confirm_delete"))) return;
    try { await apiDelete(`/companies/${id}`); load(page); if (panelComp?.id === id) setPanelComp(null); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : t("companies.err_delete")); }
  };

  const handleAddMember = async () => {
    if (!panelComp || !memberUid.trim()) return; setAddingMember(true);
    try { await apiPost(`/companies/${panelComp.id}/members`, { user_id: Number(memberUid), company_id: panelComp.id, role: memberRole }); setMemberUid(""); loadMembers(panelComp); }
    catch { /**/ } finally { setAddingMember(false); }
  };
  const handleRemoveMember = async (uid: number) => {
    if (!panelComp || !confirm(t("companies.confirm_remove_member"))) return;
    try { await apiDelete(`/companies/${panelComp.id}/members/${uid}`); loadMembers(panelComp); } catch { /**/ }
  };

  const handleAddArea = async () => {
    if (!panelComp || !selAreaId) return; setAddingArea(true);
    try {
      await apiPost(`/companies/${panelComp.id}/areas`, { business_area_id: Number(selAreaId) });
      setSelAreaId(""); loadAreas(panelComp);
    } catch { /**/ } finally { setAddingArea(false); }
  };
  const handleRemoveArea = async (areaId: number) => {
    if (!panelComp || !confirm(t("companies.confirm_remove_area"))) return;
    try { await apiDelete(`/companies/${panelComp.id}/areas/${areaId}`); loadAreas(panelComp); } catch { /**/ }
  };


  const handleAddLeader = async () => {
    if (!panelComp || !leaderForm.business_area_id || !leaderForm.stakeholder_id) return; setSavingLeader(true);
    try {
      await apiPost(`/companies/${panelComp.id}/area-members`, { business_area_id: Number(leaderForm.business_area_id), stakeholder_id: Number(leaderForm.stakeholder_id), leadership_level: leaderForm.leadership_level, reports_to_member_id: leaderForm.reports_to_member_id ? Number(leaderForm.reports_to_member_id) : null, started_at: leaderForm.started_at || null });
      setLeaderForm({ business_area_id: "", stakeholder_id: "", leadership_level: "COORDINATOR", reports_to_member_id: "", started_at: "" });
      loadLeaders(panelComp);
    } catch { /**/ } finally { setSavingLeader(false); }
  };

  const handleEndLeader = async (leaderId: number) => {
    if (!panelComp || !confirm(t("companies.leaders_end_confirm"))) return;
    const today = new Date().toISOString().split("T")[0];
    try { await apiPatch(`/companies/${panelComp.id}/leaders/${leaderId}`, { ended_at: today, is_current: false }); loadLeaders(panelComp); } catch { /**/ }
  };
  const handleDeleteLeader = async (leaderId: number) => {
    if (!panelComp || !confirm(t("companies.confirm_remove_leader"))) return;
    try { await apiDelete(`/companies/${panelComp.id}/leaders/${leaderId}`); loadLeaders(panelComp); } catch { /**/ }
  };

  const currentLeaders = leaders.filter(l => l.is_current);
  const histLeaders = leaders.filter(l => !l.is_current);

  return (
    <ModuleLayout moduleIcon="◈" moduleName={t("companies.title") + " " + t("companies.title_accent")} moduleAccent={t("companies.title_accent")} showProductSelector={false}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("companies.eyebrow")}</span>
          <h1 className="mod-header__title">{t("companies.title")} <span>{t("companies.title_accent")}</span></h1>
          <p className="mod-header__meta">{t("companies.meta", { count: total })}</p>
        </div>
        <button className="btn-add" onClick={openCreate}>{t("companies.btn_new")}</button>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}

      {/* Company table */}
      <div className="mod-table-wrap">
        {loading ? <div className="mod-loading">{t("companies.loading")}</div>
          : items.length === 0 ? (
            <div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{t("companies.empty_title")}</div><div className="mod-empty__sub">{t("companies.empty_sub")}</div></div>
          ) : (
            <table className="mod-table">
              <thead><tr><th>{t("companies.col_company")}</th><th>{t("companies.col_type")}</th><th>{t("companies.col_cnpj")}</th><th>{t("companies.col_status")}</th><th>{t("companies.col_created")}</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.company_name}</strong>{item.website && <div style={{ fontSize: 10, color: "#7899b0", marginTop: 2 }}>{item.website}</div>}</td>
                    <td><span style={{ fontSize: 9, color: TYPE_COLOR[item.company_type]??"#7899b0", border: `1px solid ${TYPE_COLOR[item.company_type]??"#7899b0"}44`, borderRadius: 3, padding: "1px 6px", letterSpacing: 1 }}>{item.company_type}</span></td>
                    <td style={{ color: "#7899b0" }}>{item.cnpj || "—"}</td>
                    <td><span className={`badge badge--${item.is_active ? "active" : "archived"}`}>{item.is_active ? t("companies.status_active") : t("companies.status_inactive")}</span></td>
                    <td style={{ color: "#7899b0" }}>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" style={{ color: "#c084fc", borderColor: "rgba(192,132,252,0.4)" }} onClick={() => openPanel(item, "areas")}>{t("companies.btn_areas")}</button>
                        <button className="btn-icon" onClick={() => openEdit(item)}>{t("companies.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(item.id)}>{t("companies.btn_del")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        {total > SIZE && (
          <div className="mod-pagination">
            <span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} de {total}</span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page===1} onClick={() => setPage(p=>p-1)}>{t("companies.btn_prev")}</button>
              <button className="btn-page" disabled={page*SIZE>=total} onClick={() => setPage(p=>p+1)}>{t("companies.btn_next")}</button>
            </div>
          </div>
        )}
      </div>

      {/* ── AREAS & LEADERS MODAL (full overlay) ── */}
      {panelComp && (
        <div className="mod-overlay" onClick={() => setPanelComp(null)}>
          <div className="mod-modal" style={{ maxWidth: 720, width: "95%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">{t("companies.panel_selected")}</span>
                <h3 className="mod-modal__title">{panelComp.company_name} <span>{t("companies.panel_title")}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={() => setPanelComp(null)}>✕</button>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, padding: "0 24px 12px", borderBottom: "1px solid rgba(0,212,255,0.12)", flexWrap: "wrap" }}>
              {(["members","areas","leaders","orgchart"] as const).map(tab => (
                <button key={tab} className={`btn-icon ${panelTab === tab ? "influence-btn--active" : ""}`} style={{ fontSize: 9, display:"flex", alignItems:"center", gap:3 }} onClick={() => setPanelTab(tab)}>
                  {tab==="members"&&<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" fill="currentColor"/><path d="M0 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.6"/><path d="M12 8c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6"/></svg>}
                  {tab==="areas"&&<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/></svg>}
                  {tab==="leaders"&&<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,11.5 3.5,15 5,9.5 1,6 6,6" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>}
                  {tab==="orgchart"&&<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="5" y="0" width="6" height="4" rx="1" fill="currentColor"/><rect x="0" y="10" width="6" height="4" rx="1" fill="currentColor"/><rect x="10" y="10" width="6" height="4" rx="1" fill="currentColor"/><line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.3"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.3"/><line x1="3" y1="8" x2="3" y2="10" stroke="currentColor" strokeWidth="1.3"/><line x1="13" y1="8" x2="13" y2="10" stroke="currentColor" strokeWidth="1.3"/></svg>}
                  {t(`companies.tab_${tab}`)}
                </button>
              ))}
            </div>
            <div className="mod-modal__body" style={{ flex: 1, overflowY: "auto" }}>

              {/* MEMBERS */}
              {panelTab === "members" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input className="mod-input" value={memberUid} onChange={e => setMemberUid(e.target.value)} placeholder={t("companies.members_id_placeholder")} style={{ width: 100 }} />
                    <select className="mod-select" value={memberRole} onChange={e => setMemberRole(e.target.value)} style={{ flex: 1 }}>
                      <option value="PM">PM</option><option value="VIEWER">VIEWER</option><option value="ADMIN">ADMIN</option>
                    </select>
                    <button className="btn-icon" onClick={handleAddMember} disabled={addingMember || !memberUid.trim()}>{addingMember ? "..." : "+ ADD"}</button>
                  </div>
                  {members.length === 0 ? <div style={{ color: "#7899b0", fontSize: 11 }}>{t("companies.members_empty")}</div> : members.map(m => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,212,255,0.08)", borderRadius: 4, marginBottom: 6 }}>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: "#e0eaff" }}>User #{m.user_id}</div><div style={{ fontSize: 9, color: "#00d4ff" }}>{m.role}</div></div>
                      <button className="btn-icon btn-icon--danger" style={{ fontSize: 9 }} onClick={() => handleRemoveMember(m.user_id)}>✕</button>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, fontSize: 9, color: "#555" }}>{t("companies.members_hint")}</div>
                </div>
              )}

              {/* AREAS */}
              {panelTab === "areas" && (
                <div>
                  <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 4 }}>
                    <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 8 }}>{t("companies.areas_assoc_title")}</div>
                    <div className="mod-field">
                      <label className="mod-field__label">ÁREA</label>
                      <select className="mod-select" value={selAreaId} onChange={e => setSelAreaId(e.target.value)}>
                        <option value="">{t("companies.areas_select")}</option>
                        {availableAreas.map(a => <option key={a.id} value={String(a.id)}>{a.area_name} ({a.area_type})</option>)}
                      </select>
                    </div>
                    <button className="btn-icon" style={{ marginTop: 8 }} onClick={handleAddArea} disabled={addingArea || !selAreaId}>{addingArea ? t("companies.areas_btn_assoc_ing") : t("companies.areas_btn_assoc")}</button>
                    {availableAreas.length === 0 && <div style={{ fontSize: 9, color: "#7899b0", marginTop: 6 }}>{t("companies.areas_catalog_empty")}</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 10 }}>{t("companies.areas_count", { count: companyAreas.length })}</div>
                  <div style={{ fontSize: 8, color: "#555", marginBottom: 12 }}>
                    💡 Para definir líderes por área, use a aba 🏆 {t("companies.tab_leaders")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {companyAreas.map(ca => {
                      const accent = ca.area_color || AREA_TYPE_COLORS[ca.area_type] || "#7899b0";
                      return (
                        <div key={ca.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#c8dce8" }}>{ca.area_name}</div>
                            <div style={{ fontSize: 8, color: accent, letterSpacing: 1, marginTop: 2 }}>{ca.area_type}</div>
                          </div>
                          <button className="btn-icon btn-icon--danger" style={{ fontSize: 8, flexShrink: 0 }} onClick={() => handleRemoveArea(ca.business_area_id)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LEADERS */}
              {panelTab === "leaders" && (
                <div>
                  <div style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 4 }}>
                    <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 8 }}>{t("companies.leaders_add_title")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      <div className="mod-field">
                        <label className="mod-field__label">ÁREA</label>
                        <select className="mod-select" value={leaderForm.business_area_id} onChange={e => setLeaderForm(p => ({ ...p, business_area_id: e.target.value }))}>
                          <option value="">{t("companies.leaders_area")}</option>
                          {companyAreas.map(ca => <option key={ca.business_area_id} value={String(ca.business_area_id)}>{ca.area_name}</option>)}
                        </select>
                      </div>
                      <div className="mod-field">
                        <label className="mod-field__label">STAKEHOLDER</label>
                        <select className="mod-select" value={leaderForm.stakeholder_id} onChange={e => setLeaderForm(p => ({ ...p, stakeholder_id: e.target.value }))}>
                          <option value="">{t("companies.leaders_stakeholder")}</option>
                          {stakeholders.map(s => <option key={s.stakeholder_id} value={String(s.stakeholder_id)}>{s.full_name}{s.position_title ? ` — ${s.position_title}` : ""}</option>)}
                        </select>
                      </div>
                      <div className="mod-field">
                        <label className="mod-field__label">NÍVEL</label>
                        <select className="mod-select" value={leaderForm.leadership_level} onChange={e => setLeaderForm(p => ({ ...p, leadership_level: e.target.value }))}>
                          {["DIRECTOR","MANAGER","COORDINATOR","SUPERVISOR","LEAD"].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="mod-field">
                        <label className="mod-field__label">INÍCIO</label>
                        <input className="mod-input" type="date" value={leaderForm.started_at} onChange={e => setLeaderForm(p => ({ ...p, started_at: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mod-field" style={{ gridColumn: "1 / -1" }}>
                      <label className="mod-field__label">RESPONDE PARA <span style={{ color: "#555", fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
                      <select className="mod-select" value={leaderForm.reports_to_member_id} onChange={e => setLeaderForm(p => ({ ...p, reports_to_member_id: e.target.value }))}>
                        <option value="">— Sem superior —</option>
          {currentLeaders.filter(l => String(l.stakeholder_id) !== leaderForm.stakeholder_id).map(l => (
                          <option key={l.id} value={String(l.id)}>{l.stakeholder_name} ({l.leadership_level || l.role_in_area}) — {l.area_name}</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn-icon" style={{ marginTop: 8 }} onClick={handleAddLeader} disabled={savingLeader || !leaderForm.business_area_id || !leaderForm.stakeholder_id}>
                      {savingLeader ? t("companies.leaders_btn_adding") : t("companies.leaders_btn_add")}
                    </button>
                  </div>

                  <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 10 }}>{t("companies.leaders_current", { count: currentLeaders.length })}</div>
                  {currentLeaders.length === 0 && <div style={{ color: "#7899b0", fontSize: 11, marginBottom: 12 }}>{t("companies.leaders_empty")}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: 12 }}>
                    {currentLeaders.map(l => {
                      const accent = l.area_color || AREA_TYPE_COLORS[l.area_type] || "#7899b0";
                      return (
                        <div key={l.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, borderRadius: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 9, color: accent, letterSpacing: 1 }}>{l.area_name}</div>
                              <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3 }}>
                                <span style={{ fontSize: 7, padding: "1px 5px", background: "#c084fc18", border: "1px solid #c084fc44", borderRadius: 2, color: "#c084fc" }}>{l.leadership_level}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#c8dce8" }}><PSvg/>{l.stakeholder_name}</span>
                              </div>
                              {(l.reports_to_name) && <div style={{ fontSize: 8, color: "#7899b0", marginTop: 2 }}>↑ {l.reports_to_name}</div>}
                              {l.started_at && <div style={{ fontSize: 8, color: "#555", marginTop: 1 }}>{t("companies.leaders_since")} {l.started_at}</div>}
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="btn-icon" style={{ fontSize: 8 }} title={t("companies.leaders_end_confirm")} onClick={() => handleEndLeader(l.id)}>{t("companies.leaders_end_btn")}</button>
                              <button className="btn-icon btn-icon--danger" style={{ fontSize: 8 }} onClick={() => handleDeleteLeader(l.id)}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {histLeaders.length > 0 && (
                    <div>
                      <button className="btn-icon" style={{ fontSize: 9, marginBottom: 8 }} onClick={() => setShowHistory(v => !v)}>
                        {showHistory ? t("companies.leaders_history_hide", { count: histLeaders.length }) : t("companies.leaders_history_show", { count: histLeaders.length })}
                      </button>
                      {showHistory && histLeaders.map(l => (
                        <div key={l.id} style={{ padding: "6px 10px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 4, marginBottom: 6, opacity: 0.6 }}>
                          <div style={{ fontSize: 9, color: "#7899b0" }}>{l.area_name} · {l.leadership_level}</div>
                          <div style={{ fontSize: 10, color: "#7899b0" }}><PSvg/>{l.stakeholder_name}</div>
                          <div style={{ fontSize: 7, color: "#555" }}>{l.started_at} → {l.ended_at}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ORG CHART — unified person-centric view */}
              {panelTab === "orgchart" && (
                <div>
                  <div style={{ fontSize: 10, color: "#7899b0", marginBottom: 4 }}>{t("companies.orgchart_title")}</div>
                  <div style={{ fontSize: 8, color: "#555", marginBottom: 12, letterSpacing: 1 }}>
                    cada pessoa aparece uma vez · badges = áreas onde atua · ▼ expandir/colapsar
                  </div>
                  {orgChart.length === 0
                    ? <div style={{ color: "#7899b0", fontSize: 11 }}>{t("companies.orgchart_empty")}</div>
                    : <UnifiedOrgChart orgChart={orgChart} />
                  }
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={() => setPanelComp(null)}>{t("companies.btn_close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Company Create/Edit Modal */}
      {modal && (
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: "95%" }}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// EMPRESA //</span><h3 className="mod-modal__title">{modal==="create"?t("companies.modal_new"):t("companies.modal_edit")} <span>{t("companies.modal_subtitle")}</span></h3></div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div className="mod-field"><label className="mod-field__label">{t("companies.field_name")}</label><input className="mod-input" value={form.company_name} onChange={e => setForm(f=>({...f,company_name:e.target.value}))} placeholder={t("companies.placeholder_name")}/></div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("companies.field_type")}</label><select className="mod-select" value={form.company_type} onChange={e => setForm(f=>({...f,company_type:e.target.value}))}><option value="CLIENT">CLIENT</option><option value="INTERNAL">INTERNAL</option><option value="PARTNER">PARTNER</option></select></div>
                <div className="mod-field"><label className="mod-field__label">{t("companies.field_cnpj")}</label><input className="mod-input" value={form.cnpj} onChange={e => setForm(f=>({...f,cnpj:e.target.value}))} placeholder={t("companies.placeholder_cnpj")}/></div>
              </div>
              <div className="mod-field-row">
                <div className="mod-field"><label className="mod-field__label">{t("companies.field_website")}</label><input className="mod-input" value={form.website} onChange={e => setForm(f=>({...f,website:e.target.value}))} placeholder={t("companies.placeholder_website")}/></div>
                <div className="mod-field"><label className="mod-field__label">{t("companies.field_country")}</label><input className="mod-input" value={form.country} onChange={e => setForm(f=>({...f,country:e.target.value}))} placeholder={t("companies.placeholder_country")}/></div>
              </div>
              <div className="mod-field"><label className="mod-field__label">{t("companies.field_notes")}</label><textarea className="mod-textarea" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder={t("companies.placeholder_notes")} rows={2}/></div>
              <div className="mod-field"><label className="mod-field__label" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={form.is_active} onChange={e => setForm(f=>({...f,is_active:e.target.checked}))}/><span>{t("companies.field_active")}</span></label></div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("companies.btn_cancel")}</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.company_name.trim()}>{saving ? t("companies.btn_saving") : t("companies.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
