import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "../../../shared/services/api";

interface OppArea { id:string; opportunity_id:string; area_id:number; area_name?:string; impact_type:string; is_primary:boolean; notes?:string; }
interface ProblemAffectedArea { id:string; problem_statement_id:string; area_id:number; area_name?:string; impact_type:string; description?:string; }
interface OppSource { id:string; opportunity_id:string; source_type:string; source_system?:string; external_reference?:string; external_url?:string; requester_name?:string; sponsor_name?:string; original_context?:string; received_at?:string; is_primary:boolean; }
interface OppAssessmentSummary { id:string; assessment_type:string; recommendation?:string; assessed_by?:string; assessed_at?:string; created_at:string; }
interface OppAssessment {
  id:string; opportunity_id:string; assessment_type:string;
  problem_clarity:string; evidence_strength:string; business_impact:string;
  expected_outcome_clarity:string; potential_business_value:string; strategic_alignment:string;
  urgency:string; business_uncertainty:string; solution_uncertainty:string; initial_viability:string;
  recommendation?:string; rationale?:string; assessed_by?:string; assessed_at?:string; created_at:string; updated_at:string;
}
interface OppDecision {
  id:string; product_id:string; title:string; context?:string; decision?:string; consequences?:string;
  status:string; tags:string[]; discovery_opportunity_id?:string|null; business_case_id?:string|null;
  decided_by?:string|null; decision_date?:string|null; created_at:string; updated_at:string;
}
interface ProjectCharter { id:string; business_case_id?:string|null; opportunity_id?:string|null; roadmap_item_id?:string|null; product_id:number; project_name:string; project_purpose?:string; business_objective?:string; objectives?:string; scope_in?:string; scope_out?:string; success_criteria?:string; high_level_requirements?:string; major_deliverables?:string; high_level_timeline?:string; budget_summary?:string; risks_summary?:string; assumptions_constraints?:string; sponsor_name?:string; project_manager_name?:string; status:string; }
interface ForwardToRoadmapResult { opportunity_id:string; roadmap_item_id:string; roadmap_title:string; opportunity_status:string; journey_stage:string; lifecycle_status:string; }
interface Opp { id:string; product_id:number; title:string; description?:string; origin?:string; impacted_area_id?:number; impacted_area_name?:string; impacted_areas?:OppArea[]; responsible_stakeholder_id?:number; responsible_name?:string; identified_at?:string; status:string; journey_stage?:string; lifecycle_status?:string; priority:number; primary_source?:OppSource|null; latest_assessment?:OppAssessmentSummary|null; created_at:string; updated_at:string; }
interface BizArea { id:number; area_name:string; area_type:string; }
interface OppStakeholder { stakeholder_id:number; full_name:string; position_title?:string; }
interface JTBD { id:string; product_id:number; opportunity_id?:string; description:string; job_type:string; priority:number; frequency?:string; context?:string; expected_result?:string; impacted_area_id?:number; impacted_area_name?:string; }
interface ResearchTemplate { id:string; research_type:string; name:string; description?:string; objective?:string; when_to_use?:string; opening_script?:string; }
interface Research { id:string; opportunity_id:string; research_type:string; participants?:string; research_date?:string; questions?:string; findings?:string; evidence?:string; source?:string; reliability:string; session_status:string; }
interface Insight { id:string; opportunity_id:string; insight:string; affected_audience?:string; impact:string; observed_frequency?:string; confidence:string; product_implication?:string; }
interface Assumption { id:string; opportunity_id:string; hypothesis:string; assumption_type:string; impact:string; uncertainty_level:string; existing_evidence?:string; validation_method?:string; status:string; }
interface SolutionIdea { id:string; opportunity_id:string; idea:string; description?:string; related_problem?:string; expected_benefit?:string; estimated_complexity:string; risks?:string; dependencies?:string; status:string; }
interface Experiment { id:string; opportunity_id:string; method:string; assumption_id?:string; participants?:string; success_criteria?:string; result?:string; evidence?:string; conclusion?:string; next_action?:string; status:string; }
interface Metric { id:string; opportunity_id:string; metric:string; metric_type:string; baseline?:string; target?:string; data_source?:string; measurement_frequency?:string; responsible?:string; }
interface BusinessCase { id:string; opportunity_id:string; product_id:number; title:string; executive_summary?:string; problem_statement?:string; current_scenario?:string; proposed_solution?:string; expected_benefits?:string; strategic_alignment?:string; financial_impact?:string; estimated_cost?:string; estimated_effort?:string; risks_summary?:string; dependencies_summary?:string; assumptions?:string; constraints?:string; go_no_go_recommendation?:string; status:string; }

const ORIGIN_KEYS = ["customer_feedback","internal_analysis","market_research","stakeholder_request","support_tickets","competitive_analysis","data_analysis","team_suggestion","regulatory_compliance","user_interview","nps_survey","other"] as const;

const SC: Record<string,string> = {
  identified:"#7899b0",
  under_investigation:"#00d4ff",
  validated:"#00ff88",
  paused:"#ff9900",
  discarded:"#ff4466",
  forwarded_to_roadmap:"#c084fc",
  capture:"#7899b0",
  assess:"#8b5cf6",
  discover:"#00d4ff",
  evaluate:"#f59e0b",
  decide:"#00ff88",
  active:"#00d4ff",
  on_hold:"#ff9900",
  closed:"#7899b0",
  discovery_required:"#00d4ff",
  ready_for_evaluation:"#00ff88",
  more_information_required:"#f59e0b",
  hold:"#ff9900",
  merge:"#8b5cf6",
  do_not_pursue:"#ff4466",
  unvalidated:"#7899b0",
  in_progress:"#00d4ff",
  invalidated:"#ff4466",
  planned:"#7899b0",
  completed:"#00ff88",
  cancelled:"#ff4466",
  idea:"#7899b0",
  under_evaluation:"#00d4ff",
  selected:"#00ff88",
  proposed:"#7899b0",
  accepted:"#00ff88",
  deprecated:"#ff9900",
  superseded:"#c084fc",
  primary:"#00d4ff"
};
const sClr = (s:string) => SC[s] ?? "#7899b0";
const statusColor = (s:string) => ({ identified:"#7899b0", under_investigation:"#00d4ff", validated:"#00ff88", paused:"#ff9900", discarded:"#ff4466", forwarded_to_roadmap:"#c084fc", active:"#00d4ff", on_hold:"#ff9900", closed:"#7899b0", capture:"#7899b0", assess:"#8b5cf6", discover:"#00d4ff", evaluate:"#f59e0b", decide:"#00ff88" }[s] ?? "#7899b0");

function Badge({ v }:{ v:string }) { const c=sClr(v); return <span style={{ fontSize:9, letterSpacing:1, padding:"2px 7px", borderRadius:2, border:`1px solid ${c}55`, color:c, background:`${c}12` }}>{v.toUpperCase().replace(/_/g," ")}</span>; }
function Fld({ lbl, children, help }:{ lbl:string; children:React.ReactNode; help?:string }) { return <div className="mod-field"><label className="mod-field__label">{lbl}</label>{help&&<div style={{ fontSize:10, color:"#7899b0", margin:"-2px 0 6px" }}>{help}</div>}{children}</div>; }
function FldView({ lbl, val }:{ lbl:string; val?:string }) { return <div style={{ borderBottom:"1px solid #0d2535", paddingBottom:8, marginBottom:8 }}><div style={{ fontSize:9, color:"#7899b0", letterSpacing:1, marginBottom:3 }}>{lbl}</div><div style={{ fontSize:12, color:val?"#c8dce8":"#334455" }}>{val||"—"}</div></div>; }
function EmptyItem({ text }:{ text:string }) { return <div style={{ fontSize:11, color:"#7899b0", textAlign:"center", padding:"20px 0" }}>{text}</div>; }
function ItemCard({ title, sub, badge, onEdit, onDel }:{ title:string; sub?:string; badge?:string; onEdit:()=>void; onDel:()=>void }) {
  const { t } = useTranslation();
  return <div className="vpc-card" style={{ marginBottom:8 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}><div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:600, color:"#c8dce8" }}>{title}</div>{sub&&<div style={{ fontSize:10, color:"#7899b0", marginTop:2 }}>{sub}</div>}{badge&&<div style={{ marginTop:4 }}><Badge v={badge} /></div>}</div><div style={{ display:"flex", gap:4 }}><button className="btn-icon" style={{ fontSize:9, padding:"1px 6px" }} onClick={onEdit}>{t("discovery.btn_edit")}</button><button className="btn-icon btn-icon--danger" style={{ fontSize:9, padding:"1px 6px" }} onClick={onDel}>{t("discovery.btn_del")}</button></div></div></div>;
}
function SecHdr({ eyebrow, onAdd, addLbl }:{ eyebrow:string; onAdd?:()=>void; addLbl?:string }) { return <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><span className="mod-header__eyebrow" style={{ fontSize:10 }}>{eyebrow}</span>{onAdd&&<button className="btn-add" style={{ fontSize:10 }} onClick={onAdd}>{addLbl}</button>}</div>; }
function ModalShell({ title, sub, onClose, onSave, saving, children }:{ title:string; sub:string; onClose:()=>void; onSave:()=>void; saving:boolean; children:React.ReactNode }) {
  const { t }=useTranslation();
  return <div className="mod-overlay" onClick={onClose}><div className="mod-modal" style={{ maxWidth:620 }} onClick={e=>e.stopPropagation()}><div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// OPPORTUNITIES //</span><h3 className="mod-modal__title">{title} <span>{sub}</span></h3></div><button className="mod-modal__close" onClick={onClose}>✕</button></div><div className="mod-modal__body">{children}</div><div className="mod-modal__footer"><button className="btn-cancel" onClick={onClose}>{t("discovery.btn_cancel")}</button><button className="btn-save" onClick={onSave} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.btn_save")}</button></div></div></div>;
}
function StageSection({ title, subtitle, children }:{ title:string; subtitle:string; children:React.ReactNode }) {
  return (
    <section style={{ border:"1px solid rgba(0,212,255,0.12)", background:"rgba(0,212,255,0.02)", padding:16, borderRadius:3 }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, color:"#00d4ff", letterSpacing:2, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:11, color:"#7899b0", lineHeight:1.5 }}>{subtitle}</div>
      </div>
      {children}
    </section>
  );
}
function SummaryCard({ label, value, tone }:{ label:string; value:string; tone?:string }) {
  return <div style={{ border:"1px solid rgba(0,212,255,0.12)", padding:"10px 12px", background:"rgba(0,212,255,0.03)" }}><div style={{ fontSize:9, color:"#7899b0", letterSpacing:1, marginBottom:4 }}>{label}</div><div style={{ fontSize:11, color:tone||"#c8dce8" }}>{value}</div></div>;
}

function useList<T extends { id:string }>(url:string) {
  const [items, setItems] = useState<T[]>([]);
  const load = useCallback(async()=>{ try{ setItems(await apiGet<T[]>(url)); }catch{/***/} },[url]);
  useEffect(()=>{ load(); },[load]);
  const remove = async(id:string, delUrl:string)=>{ if(!confirm("Excluir este registro?"))return; try{ await apiDelete(delUrl); setItems(p=>p.filter(i=>i.id!==id)); }catch{/***/} };
  return { items, reload:load, remove };
}

type JourneyStage = "capture" | "assess" | "discover" | "evaluate" | "decide";
type ViewStage = JourneyStage | "promotion_gate";
type TabStatus = "empty" | "partial" | "complete";

const JOURNEY_STAGES: JourneyStage[] = ["capture","assess","discover","evaluate","decide"];
const VIEW_STAGES: ViewStage[] = [...JOURNEY_STAGES, "promotion_gate"];
const JOURNEY_STAGE_TO_VIEW: Record<JourneyStage, ViewStage> = {
  capture:"capture",
  assess:"assess",
  discover:"discover",
  evaluate:"evaluate",
  decide:"decide",
};

function normalizeJourneyStage(stage?:string): JourneyStage {
  if (stage === "assess" || stage === "discover" || stage === "evaluate" || stage === "decide") return stage;
  return "capture";
}
function stageIndex(stage: JourneyStage) {
  return JOURNEY_STAGES.indexOf(stage);
}
function deriveReadiness(opp?:Opp|null) {
  return opp?.latest_assessment?.recommendation || "not_assessed";
}
function formatStageLabel(t:(k:string, opts?:any)=>string, stage:ViewStage) {
  if (stage === "promotion_gate") return t("discovery.promotion_gate_label");
  return t(`discovery.journey_${stage}`, { defaultValue: stage.toUpperCase() });
}
function getTabIndicatorColor(status?:TabStatus) {
  if (status === "complete") return "#00ff88";
  if (status === "partial") return "#ff9900";
  return "rgba(0,212,255,0.15)";
}

function OppDetailModal({ opp, initialMode, onClose, onSaved, bizAreas, oppStakeholders }:{
  opp:Opp; initialMode:"view"|"edit"; onClose:()=>void; onSaved:(o:Opp)=>void;
  bizAreas:BizArea[]; oppStakeholders:OppStakeholder[];
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"view"|"edit">(initialMode);
  const [form, setForm] = useState({ title:opp.title, description:opp.description??"", origin:opp.origin??"", impacted_area_id:opp.impacted_area_id?String(opp.impacted_area_id):"", responsible_stakeholder_id:opp.responsible_stakeholder_id?String(opp.responsible_stakeholder_id):"", identified_at:opp.identified_at??"", status:opp.status, priority:opp.priority });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setErr("");
    const body = { ...form, identified_at:form.identified_at||null, description:form.description||null, origin:form.origin||null, impacted_area_id:form.impacted_area_id?Number(form.impacted_area_id):null, responsible_stakeholder_id:form.responsible_stakeholder_id?Number(form.responsible_stakeholder_id):null };
    try {
      const updated = await apiPatch<Opp>(`/opportunities/opportunities/${opp.id}`, body);
      onSaved(updated); onClose();
    } catch {
      setErr(t("discovery.err_save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth:780 }} onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header">
          <div>
            <span className="mod-modal__eyebrow">// OPPORTUNITIES //</span>
            <h3 className="mod-modal__title">
              {mode==="view" ? t("discovery.modal_view_opp","OPPORTUNITY") : t("discovery.modal_edit_opp")} <span>{t("discovery.modal_opp_subtitle")}</span>
            </h3>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {mode==="view" && <button className="btn-icon" style={{ fontSize:9 }} onClick={e=>{ e.stopPropagation(); setMode("edit"); }}>{t("discovery.btn_edit")}</button>}
            <button className="mod-modal__close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mod-modal__body" style={{ overflowY:"auto", maxHeight:"70vh" }}>
          {err && <div className="mod-error" style={{ marginBottom:12 }}>⚠ {err}</div>}
          {mode === "view" ? (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <h2 style={{ fontSize:18, fontWeight:700, color:"#00d4ff", margin:0, flex:1 }}>{opp.title}</h2>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:16 }}>
                  <Badge v={opp.status} />
                  <span style={{ fontSize:11, color:"#7899b0", fontWeight:700 }}>P{opp.priority}</span>
                </div>
              </div>
              {opp.description && <div style={{ fontSize:12, color:"#7899b0", lineHeight:1.6, marginBottom:20, padding:"10px 14px", background:"rgba(0,212,255,0.03)", border:"1px solid rgba(0,212,255,0.1)", borderRadius:3 }}>{opp.description}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                <FldView lbl={t("discovery.field_origin")} val={opp.origin ? t(`discovery.origin_${opp.origin}`, {defaultValue:opp.origin}) : undefined} />
                <FldView lbl={t("discovery.field_impacted_area")} val={opp.impacted_area_name} />
                <FldView lbl={t("discovery.field_responsible")} val={opp.responsible_name} />
                <FldView lbl={t("discovery.field_identified_at")} val={opp.identified_at} />
              </div>
            </div>
          ) : (
            <div>
              <Fld lbl={t("discovery.field_title")}><input className="mod-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></Fld>
              <Fld lbl={t("discovery.field_description")}><textarea className="mod-textarea" style={{ minHeight:64 }} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></Fld>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                <Fld lbl={t("discovery.field_origin")}><select className="mod-select" value={form.origin} onChange={e=>setForm(p=>({...p,origin:e.target.value}))}><option value="">—</option>{ORIGIN_KEYS.map(k=><option key={k} value={k}>{t(`discovery.origin_${k}`)}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_impacted_area")}><select className="mod-select" value={form.impacted_area_id} onChange={e=>setForm(p=>({...p,impacted_area_id:e.target.value}))}><option value="">—</option>{bizAreas.map(a=><option key={a.id} value={a.id}>{a.area_name}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_responsible")}><select className="mod-select" value={form.responsible_stakeholder_id} onChange={e=>setForm(p=>({...p,responsible_stakeholder_id:e.target.value}))}><option value="">—</option>{oppStakeholders.map(s=><option key={s.stakeholder_id} value={s.stakeholder_id}>{s.full_name}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_identified_at")}><input className="mod-input" type="date" value={form.identified_at} onChange={e=>setForm(p=>({...p,identified_at:e.target.value}))} /></Fld>
                <Fld lbl={t("discovery.field_status")}><select className="mod-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>{["identified","under_investigation","validated","paused","discarded","forwarded_to_roadmap"].map(v=><option key={v} value={v}>{t(`discovery.opp_status_${v}`)}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_priority")}><div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${form.priority===n?"influence-btn--active":""}`} onClick={()=>setForm(p=>({...p,priority:n}))}>{n}</button>)}</div></Fld>
              </div>
            </div>
          )}
        </div>
        <div className="mod-modal__footer">
          <button className="btn-cancel" onClick={onClose}>{t("discovery.btn_cancel")}</button>
          {mode==="view"
            ? <button className="btn-save" onClick={()=>setMode("edit")}>{t("discovery.btn_edit")} →</button>
            : <button className="btn-save" onClick={save} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.btn_save")}</button>
          }
        </div>
      </div>
    </div>
  );
}

function TabProblem({ oppId, impactedAreaName, bizAreas }:{ oppId:string; impactedAreaName?:string; bizAreas:BizArea[] }) {
  const { t }=useTranslation();
  const [form, setForm]=useState({ observed_problem:"", who_is_affected:"", current_impact:"", available_evidence:"", consequence_of_inaction:"" });
  const [saving, setSaving]=useState(false); const [ok, setOk]=useState(false);
  const [affectedAreas, setAffectedAreas]=useState<ProblemAffectedArea[]>([]);

  useEffect(()=>{
    apiGet<{id:string;observed_problem?:string;who_is_affected?:string;current_impact?:string;available_evidence?:string;consequence_of_inaction?:string;affected_areas?:ProblemAffectedArea[]}|null>(`/discovery/opportunities/${oppId}/problem-statement`).then(r=>{
      if(r) {
        setForm({ observed_problem:r.observed_problem??"", who_is_affected:r.who_is_affected??"", current_impact:r.current_impact??"", available_evidence:r.available_evidence??"", consequence_of_inaction:r.consequence_of_inaction??"" });
        setAffectedAreas(r.affected_areas??[]);
      } else {
        setForm(p=>({ ...p, who_is_affected:impactedAreaName??"" }));
      }
    }).catch(()=>{});
  },[oppId, impactedAreaName]);

  const save=async()=>{ setSaving(true); try{ await apiPut(`/discovery/opportunities/${oppId}/problem-statement`,form); setOk(true); setTimeout(()=>setOk(false),2000); }catch{/***/}finally{setSaving(false);} };

  const addAffectedArea=async(areaId:number, impactType="direct")=>{
    if(affectedAreas.find(a=>a.area_id===areaId)) return;
    try{ const r=await apiPost<ProblemAffectedArea>(`/discovery/opportunities/${oppId}/problem-statement/affected-areas`,{area_id:areaId,impact_type:impactType}); setAffectedAreas(p=>[...p,r]); }catch{/**/}
  };
  const removeAffectedArea=async(id:string)=>{
    try{ await apiDelete(`/discovery/problem-affected-areas/${id}`); setAffectedAreas(p=>p.filter(a=>a.id!==id)); }catch{/**/}
  };
  const toggleImpactType=async(a:ProblemAffectedArea)=>{
    const next=a.impact_type==="direct"?"indirect":"direct";
    try{ await apiPatch(`/discovery/problem-affected-areas/${a.id}`,{impact_type:next}); setAffectedAreas(p=>p.map(x=>x.id===a.id?{...x,impact_type:next}:x)); }catch{/**/}
  };
  const availableAreas=bizAreas.filter(a=>!affectedAreas.find(x=>x.area_id===a.id));
  const FIELDS:[keyof typeof form,string,string][]=[["observed_problem",t("discovery.problem_observed"),t("discovery.problem_placeholder_observed")],["who_is_affected",t("discovery.problem_who"),t("discovery.problem_placeholder_who")],["current_impact",t("discovery.problem_impact"),t("discovery.problem_placeholder_impact")],["available_evidence",t("discovery.problem_evidence"),t("discovery.problem_placeholder_evidence")],["consequence_of_inaction",t("discovery.problem_consequence"),t("discovery.problem_placeholder_consequence")]];

  return <div><SecHdr eyebrow={t("discovery.problem_eyebrow")} />{FIELDS.map(([k,lbl,ph])=>k==="who_is_affected"?<div key={k} className="mod-field"><label className="mod-field__label">{lbl}</label>{affectedAreas.length>0&&<div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>{affectedAreas.map(a=><span key={a.id} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", background:a.impact_type==="direct"?"rgba(0,212,255,0.1)":"rgba(255,153,0,0.1)", border:`1px solid ${a.impact_type==="direct"?"rgba(0,212,255,0.3)":"rgba(255,153,0,0.3)"}`, fontSize:10, color:"#c8dce8" }}><button onClick={()=>toggleImpactType(a)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:8, color:a.impact_type==="direct"?"#00d4ff":"#ff9900", padding:0 }}>{a.impact_type==="direct"?"D":"I"}</button>{a.area_name||String(a.area_id)}<button onClick={()=>removeAffectedArea(a.id)} style={{ background:"none", border:"none", color:"#ff6b6b", cursor:"pointer", fontSize:10, padding:0, lineHeight:1 }}>✕</button></span>)}</div>}<select className="mod-select" style={{ marginBottom:4 }} value="" onChange={e=>{ if(e.target.value) addAffectedArea(Number(e.target.value)); e.target.value=""; }}><option value="">{t("discovery.problem_area_add_select")}</option>{availableAreas.map(a=><option key={a.id} value={a.id}>{a.area_name}</option>)}</select><textarea className="mod-textarea" style={{ minHeight:80 }} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} /></div>:<Fld key={k} lbl={lbl}><textarea className="mod-textarea" style={{ minHeight:80 }} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} /></Fld>)}<div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center", marginTop:8 }}>{ok&&<span style={{ fontSize:10, color:"#00ff88" }}>✓</span>}<button className="btn-save" onClick={save} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.problem_btn_save")}</button></div></div>;
}

function TabJTBD({ oppId, productId }: { oppId:string; productId:string }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<JTBD>(`/discovery/opportunities/${oppId}/jtbd`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null); const [edit,setEdit]=useState<JTBD|null>(null);
  const [f,setF]=useState({ description:"", job_type:"principal", priority:3, frequency:"", context:"", expected_result:"", impacted_area_id:"" }); const [saving,setSaving]=useState(false);
  const openNew=()=>{ setF({ description:"", job_type:"principal", priority:3, frequency:"", context:"", expected_result:"", impacted_area_id:"" }); setEdit(null); setModal("new"); };
  const openEdit=(j:JTBD)=>{ setF({ description:j.description, job_type:j.job_type, priority:j.priority, frequency:j.frequency??"", context:j.context??"", expected_result:j.expected_result??"", impacted_area_id:(j as any).impacted_area_id?String((j as any).impacted_area_id):"" }); setEdit(j); setModal("edit"); };
  const save=async()=>{ setSaving(true); try{ const data={...f,product_id:Number(productId),impacted_area_id:f.impacted_area_id?Number(f.impacted_area_id):null}; if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/jtbd`,data); else if(edit) await apiPatch(`/discovery/jtbd/${edit.id}`,{...f,impacted_area_id:f.impacted_area_id?Number(f.impacted_area_id):null}); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.jtbd_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_jtbd")} />{items.length===0?<EmptyItem text={t("discovery.jtbd_empty")} />:items.map(j=><ItemCard key={j.id} title={j.description} sub={`${j.job_type} · P${j.priority}`} onEdit={()=>openEdit(j)} onDel={()=>remove(j.id,`/discovery/jtbd/${j.id}`)} />)}{modal&&<ModalShell title={modal==="new"?t("discovery.modal_new_jtbd"):t("discovery.modal_edit_jtbd")} sub={t("discovery.modal_jtbd_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><Fld lbl={t("discovery.jtbd_field_description")}><textarea className="mod-textarea" style={{ minHeight:100 }} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} /></Fld><Fld lbl={t("discovery.jtbd_field_type")}><select className="mod-select" value={f.job_type} onChange={e=>setF(p=>({...p,job_type:e.target.value}))}><option value="principal">{t("discovery.jtbd_type_principal")}</option><option value="secondary">{t("discovery.jtbd_type_secondary")}</option></select></Fld><Fld lbl={t("discovery.jtbd_field_priority")}><div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${f.priority===n?"influence-btn--active":""}`} onClick={()=>setF(p=>({...p,priority:n}))}>{n}</button>)}</div></Fld></ModalShell>}</div>;
}

function TabResearch({ oppId, oppStakeholders }:{ oppId:string; oppStakeholders:OppStakeholder[] }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<Research>(`/discovery/opportunities/${oppId}/research`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null);
  const [edit,setEdit]=useState<Research|null>(null);
  const [f,setF]=useState({ research_type:"interview", template_id:"", participants:"", research_date:"", findings:"", reliability:"medium", session_status:"planned" });
  const [saving,setSaving]=useState(false);
  const [templates,setTemplates]=useState<ResearchTemplate[]>([]);
  const [filteredTemplates,setFilteredTemplates]=useState<ResearchTemplate[]>([]);
  const TYPES=["interview","meeting","observation","survey","quantitative","feedback","document","evidence"];

  useEffect(()=>{ apiGet<ResearchTemplate[]>("/discovery/research-templates").then(setTemplates).catch(()=>{}); },[]);
  useEffect(()=>{ const filtered=templates.filter(tp=>!f.research_type||tp.research_type===f.research_type); setFilteredTemplates(filtered); if(f.template_id&&!filtered.find(tp=>tp.id===f.template_id)) setF(p=>({...p,template_id:""})); },[f.research_type,templates]);

  const selectedParticipants = f.participants ? f.participants.split(", ").filter(Boolean) : [];
  const addParticipant=(name:string)=>{ if(!name||selectedParticipants.includes(name)) return; const next=[...selectedParticipants,name]; setF(p=>({...p,participants:next.join(", ")})); };
  const removeParticipant=(name:string)=>{ const next=selectedParticipants.filter(n=>n!==name); setF(p=>({...p,participants:next.join(", ")})); };
  const availableParticipants=oppStakeholders.filter(s=>!selectedParticipants.includes(s.full_name));

  const openNew=()=>{ setF({ research_type:"interview", template_id:"", participants:"", research_date:"", findings:"", reliability:"medium", session_status:"planned" }); setEdit(null); setModal("new"); };
  const openEdit=(r:Research)=>{ setF({ research_type:r.research_type, template_id:"", participants:r.participants??"", research_date:r.research_date??"", findings:r.findings??"", reliability:r.reliability, session_status:r.session_status??"planned" }); setEdit(r); setModal("edit"); };

  const save=async()=>{ setSaving(true); try{ const data:Record<string,unknown>={ ...f, template_id: f.template_id || null }; if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/research`,data); else if(edit) await apiPatch(`/discovery/research/${edit.id}`,data); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };

  return <div><SecHdr eyebrow={t("discovery.research_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_research")} />{items.length===0?<EmptyItem text={t("discovery.research_empty")} />:items.map(r=><ItemCard key={r.id} title={t(`discovery.research_type_${r.research_type}`)} sub={r.participants} badge={r.session_status} onEdit={()=>openEdit(r)} onDel={()=>remove(r.id,`/discovery/research/${r.id}`)} />)}{(modal==="new"||modal==="edit")&&<ModalShell title={modal==="new"?t("discovery.modal_new_research"):t("discovery.modal_edit_research")} sub={t("discovery.modal_research_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}><Fld lbl={t("discovery.research_field_type")}><select className="mod-select" value={f.research_type} onChange={e=>setF(p=>({...p,research_type:e.target.value}))}>{TYPES.map(v=><option key={v} value={v}>{t(`discovery.research_type_${v}`)}</option>)}</select></Fld><Fld lbl={t("discovery.research_template_label")}><select className="mod-select" value={f.template_id} onChange={e=>setF(p=>({...p,template_id:e.target.value}))}><option value="">— Sem template (texto livre) —</option>{filteredTemplates.map(tp=><option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></Fld></div><div className="mod-field"><label className="mod-field__label">{t("discovery.research_field_participants")}</label>{selectedParticipants.length>0&&<div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>{selectedParticipants.map(name=><span key={name} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", background:"rgba(0,212,255,0.1)", border:"1px solid rgba(0,212,255,0.3)", fontSize:10, color:"#c8dce8" }}>{name}<button onClick={()=>removeParticipant(name)} style={{ background:"none", border:"none", color:"#ff6b6b", cursor:"pointer", fontSize:10, padding:0, lineHeight:1 }}>✕</button></span>)}</div>}<select className="mod-select" value="" onChange={e=>{ addParticipant(e.target.value); e.target.value=""; }}><option value="">{t("discovery.research_participants_select")}</option>{availableParticipants.map(s=><option key={s.stakeholder_id} value={s.full_name}>{s.full_name}</option>)}</select></div><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}><Fld lbl={t("discovery.research_field_date")}><input className="mod-input" type="date" value={f.research_date} onChange={e=>setF(p=>({...p,research_date:e.target.value}))} /></Fld><Fld lbl={t("discovery.research_field_reliability")}><select className="mod-select" value={f.reliability} onChange={e=>setF(p=>({...p,reliability:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.reliability_${v}`)}</option>)}</select></Fld></div><Fld lbl={t("discovery.research_field_findings")}><textarea className="mod-textarea" value={f.findings} onChange={e=>setF(p=>({...p,findings:e.target.value}))} /></Fld><Fld lbl={t("discovery.research_field_session_status")}><select className="mod-select" value={f.session_status} onChange={e=>setF(p=>({...p,session_status:e.target.value}))}>{["planned","in_progress","completed","cancelled"].map(v=><option key={v} value={v}>{t(`discovery.research_session_status_${v}`)}</option>)}</select></Fld></ModalShell>}</div>;
}

function TabInsights({ oppId }:{ oppId:string }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<Insight>(`/discovery/opportunities/${oppId}/insights`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null); const [edit,setEdit]=useState<Insight|null>(null);
  const [f,setF]=useState({ insight:"", affected_audience:"", impact:"medium", confidence:"medium" }); const [saving,setSaving]=useState(false);
  const openNew=()=>{ setF({ insight:"", affected_audience:"", impact:"medium", confidence:"medium" }); setEdit(null); setModal("new"); };
  const openEdit=(i:Insight)=>{ setF({ insight:i.insight, affected_audience:i.affected_audience??"", impact:i.impact, confidence:i.confidence }); setEdit(i); setModal("edit"); };
  const save=async()=>{ setSaving(true); try{ if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/insights`,f); else if(edit) await apiPatch(`/discovery/insights/${edit.id}`,f); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.insights_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_insight")} />{items.length===0?<EmptyItem text={t("discovery.insights_empty")} />:items.map(i=><ItemCard key={i.id} title={i.insight} sub={i.affected_audience} badge={i.impact} onEdit={()=>openEdit(i)} onDel={()=>remove(i.id,`/discovery/insights/${i.id}`)} />)}{modal&&<ModalShell title={modal==="new"?t("discovery.modal_new_insight"):t("discovery.modal_edit_insight")} sub={t("discovery.modal_insight_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><Fld lbl={t("discovery.insight_field_insight")}><textarea className="mod-textarea" style={{ minHeight:100 }} value={f.insight} onChange={e=>setF(p=>({...p,insight:e.target.value}))} /></Fld><Fld lbl={t("discovery.insight_field_audience")}><input className="mod-input" value={f.affected_audience} onChange={e=>setF(p=>({...p,affected_audience:e.target.value}))} /></Fld><Fld lbl={t("discovery.insight_field_impact")}><select className="mod-select" value={f.impact} onChange={e=>setF(p=>({...p,impact:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.impact_${v}`)}</option>)}</select></Fld><Fld lbl={t("discovery.insight_field_confidence")}><select className="mod-select" value={f.confidence} onChange={e=>setF(p=>({...p,confidence:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.confidence_${v}`)}</option>)}</select></Fld></ModalShell>}</div>;
}

function TabAssumptions({ oppId }:{ oppId:string }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<Assumption>(`/discovery/opportunities/${oppId}/assumptions`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null); const [edit,setEdit]=useState<Assumption|null>(null);
  const [f,setF]=useState({ hypothesis:"", assumption_type:"desirability", impact:"medium", uncertainty_level:"high", status:"unvalidated" }); const [saving,setSaving]=useState(false);
  const ATYPES=["desirability","viability","usability","value","data","technology","process"];
  const openNew=()=>{ setF({ hypothesis:"", assumption_type:"desirability", impact:"medium", uncertainty_level:"high", status:"unvalidated" }); setEdit(null); setModal("new"); };
  const openEdit=(a:Assumption)=>{ setF({ hypothesis:a.hypothesis, assumption_type:a.assumption_type, impact:a.impact, uncertainty_level:a.uncertainty_level, status:a.status }); setEdit(a); setModal("edit"); };
  const save=async()=>{ setSaving(true); try{ if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/assumptions`,f); else if(edit) await apiPatch(`/discovery/assumptions/${edit.id}`,f); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.assumptions_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_assumption")} />{items.length===0?<EmptyItem text={t("discovery.assumptions_empty")} />:items.map(a=><ItemCard key={a.id} title={a.hypothesis} sub={`${t(`discovery.assumption_type_${a.assumption_type}`)} · ${t(`discovery.uncertainty_${a.uncertainty_level}`)}`} badge={a.status} onEdit={()=>openEdit(a)} onDel={()=>remove(a.id,`/discovery/assumptions/${a.id}`)} />)}{modal&&<ModalShell title={modal==="new"?t("discovery.modal_new_assumption"):t("discovery.modal_edit_assumption")} sub={t("discovery.modal_assumption_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><Fld lbl={t("discovery.assumption_field_hypothesis")}><textarea className="mod-textarea" style={{ minHeight:100 }} value={f.hypothesis} onChange={e=>setF(p=>({...p,hypothesis:e.target.value}))} /></Fld><Fld lbl={t("discovery.assumption_field_type")}><select className="mod-select" value={f.assumption_type} onChange={e=>setF(p=>({...p,assumption_type:e.target.value}))}>{ATYPES.map(v=><option key={v} value={v}>{t(`discovery.assumption_type_${v}`)}</option>)}</select></Fld><Fld lbl={t("discovery.assumption_field_status")}><select className="mod-select" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{["unvalidated","in_progress","validated","invalidated"].map(v=><option key={v} value={v}>{t(`discovery.assumption_status_${v}`)}</option>)}</select></Fld></ModalShell>}</div>;
}

function TabSolutions({ oppId }:{ oppId:string }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<SolutionIdea>(`/discovery/opportunities/${oppId}/solution-ideas`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null); const [edit,setEdit]=useState<SolutionIdea|null>(null);
  const [f,setF]=useState({ idea:"", description:"", related_problem:"", expected_benefit:"", estimated_complexity:"medium", risks:"", dependencies:"", status:"idea" }); const [saving,setSaving]=useState(false);
  const openNew=()=>{ setF({ idea:"", description:"", related_problem:"", expected_benefit:"", estimated_complexity:"medium", risks:"", dependencies:"", status:"idea" }); setEdit(null); setModal("new"); };
  const openEdit=(s:SolutionIdea)=>{ setF({ idea:s.idea, description:s.description??"", related_problem:s.related_problem??"", expected_benefit:s.expected_benefit??"", estimated_complexity:s.estimated_complexity, risks:s.risks??"", dependencies:s.dependencies??"", status:s.status }); setEdit(s); setModal("edit"); };
  const save=async()=>{ setSaving(true); try{ if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/solution-ideas`,f); else if(edit) await apiPatch(`/discovery/solution-ideas/${edit.id}`,f); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.solutions_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_solution")} />{items.length===0?<EmptyItem text={t("discovery.solutions_empty")} />:items.map(s=><ItemCard key={s.id} title={s.idea} sub={s.description?.substring(0,60)} badge={s.status} onEdit={()=>openEdit(s)} onDel={()=>remove(s.id,`/discovery/solution-ideas/${s.id}`)} />)}{modal&&<ModalShell title={modal==="new"?t("discovery.modal_new_solution"):t("discovery.modal_edit_solution")} sub={t("discovery.modal_solution_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><Fld lbl={t("discovery.solution_field_idea")}><input className="mod-input" value={f.idea} onChange={e=>setF(p=>({...p,idea:e.target.value}))} /></Fld><Fld lbl={t("discovery.solution_field_description")}><textarea className="mod-textarea" value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} /></Fld></ModalShell>}</div>;
}

function TabExperiments({ oppId }:{ oppId:string }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<Experiment>(`/discovery/opportunities/${oppId}/experiments`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null); const [edit,setEdit]=useState<Experiment|null>(null);
  const [f,setF]=useState({ method:"prototype", participants:"", success_criteria:"", result:"", evidence:"", conclusion:"", next_action:"", status:"planned" }); const [saving,setSaving]=useState(false);
  const METHODS=["prototype","interview","usability_test","mvp","pilot","data_analysis","ab_test","technical_validation"];
  const openNew=()=>{ setF({ method:"prototype", participants:"", success_criteria:"", result:"", evidence:"", conclusion:"", next_action:"", status:"planned" }); setEdit(null); setModal("new"); };
  const openEdit=(e:Experiment)=>{ setF({ method:e.method, participants:e.participants??"", success_criteria:e.success_criteria??"", result:e.result??"", evidence:e.evidence??"", conclusion:e.conclusion??"", next_action:e.next_action??"", status:e.status }); setEdit(e); setModal("edit"); };
  const save=async()=>{ setSaving(true); try{ if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/experiments`,f); else if(edit) await apiPatch(`/discovery/experiments/${edit.id}`,f); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.experiments_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_experiment")} />{items.length===0?<EmptyItem text={t("discovery.experiments_empty")} />:items.map(e=><ItemCard key={e.id} title={t(`discovery.experiment_method_${e.method}`)} sub={e.success_criteria?.substring(0,60)} badge={e.status} onEdit={()=>openEdit(e)} onDel={()=>remove(e.id,`/discovery/experiments/${e.id}`)} />)}{modal&&<ModalShell title={modal==="new"?t("discovery.modal_new_experiment"):t("discovery.modal_edit_experiment")} sub={t("discovery.modal_experiment_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><Fld lbl={t("discovery.experiment_field_method")}><select className="mod-select" value={f.method} onChange={e=>setF(p=>({...p,method:e.target.value}))}>{METHODS.map(v=><option key={v} value={v}>{t(`discovery.experiment_method_${v}`)}</option>)}</select></Fld></ModalShell>}</div>;
}

function TabMetrics({ oppId }:{ oppId:string }) {
  const { t }=useTranslation(); const { items,reload,remove }=useList<Metric>(`/discovery/opportunities/${oppId}/success-metrics`);
  const [modal,setModal]=useState<"new"|"edit"|null>(null); const [edit,setEdit]=useState<Metric|null>(null);
  const [f,setF]=useState({ metric:"", metric_type:"adoption", baseline:"", target:"", data_source:"", measurement_frequency:"", responsible:"" }); const [saving,setSaving]=useState(false);
  const openNew=()=>{ setF({ metric:"", metric_type:"adoption", baseline:"", target:"", data_source:"", measurement_frequency:"", responsible:"" }); setEdit(null); setModal("new"); };
  const openEdit=(m:Metric)=>{ setF({ metric:m.metric, metric_type:m.metric_type, baseline:m.baseline??"", target:m.target??"", data_source:m.data_source??"", measurement_frequency:m.measurement_frequency??"", responsible:m.responsible??"" }); setEdit(m); setModal("edit"); };
  const save=async()=>{ setSaving(true); try{ if(modal==="new") await apiPost(`/discovery/opportunities/${oppId}/success-metrics`,f); else if(edit) await apiPatch(`/discovery/success-metrics/${edit.id}`,f); setModal(null); reload(); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.metrics_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_metric")} />{items.length===0?<EmptyItem text={t("discovery.metrics_empty")} />:items.map(m=><ItemCard key={m.id} title={m.metric} sub={`${t(`discovery.metric_type_${m.metric_type}`)} | ${m.baseline??"-"} → ${m.target??"-"}`} badge={m.metric_type} onEdit={()=>openEdit(m)} onDel={()=>remove(m.id,`/discovery/success-metrics/${m.id}`)} />)}{modal&&<ModalShell title={modal==="new"?t("discovery.modal_new_metric"):t("discovery.modal_edit_metric")} sub={t("discovery.modal_metric_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}><Fld lbl={t("discovery.metric_field_metric")}><input className="mod-input" value={f.metric} onChange={e=>setF(p=>({...p,metric:e.target.value}))} /></Fld></ModalShell>}</div>;
}

function TabBusinessCase({ oppId, oppTitle, decisionsCount, onSaved }:{ oppId:string; oppTitle:string; decisionsCount:number; onSaved?:(bc:BusinessCase)=>void }) {
  const { t } = useTranslation();
  const [form,setForm]=useState({ title:"", executive_summary:"", problem_statement:"", current_scenario:"", proposed_solution:"", expected_benefits:"", strategic_alignment:"", financial_impact:"", estimated_cost:"", estimated_effort:"", risks_summary:"", dependencies_summary:"", assumptions:"", constraints:"", go_no_go_recommendation:"", status:"draft" });
  const [saving,setSaving]=useState(false); const [ok,setOk]=useState(false);
  useEffect(()=>{ apiGet<BusinessCase | null>(`/discovery/opportunities/${oppId}/business-case`).then(r=>{ if(r) setForm({ title:r.title??"", executive_summary:r.executive_summary??"", problem_statement:r.problem_statement??"", current_scenario:r.current_scenario??"", proposed_solution:r.proposed_solution??"", expected_benefits:r.expected_benefits??"", strategic_alignment:r.strategic_alignment??"", financial_impact:r.financial_impact??"", estimated_cost:r.estimated_cost??"", estimated_effort:r.estimated_effort??"", risks_summary:r.risks_summary??"", dependencies_summary:r.dependencies_summary??"", assumptions:r.assumptions??"", constraints:r.constraints??"", go_no_go_recommendation:r.go_no_go_recommendation??"", status:r.status??"draft" }); else setForm(p=>({...p,title:`${t("discovery.business_case_default_title")} — ${oppTitle}`})); }).catch(()=>{}); },[oppId,oppTitle,t]);
  const save=async()=>{ setSaving(true); try{ const saved=await apiPut<BusinessCase>(`/discovery/opportunities/${oppId}/business-case`,form); onSaved?.(saved); setOk(true); setTimeout(()=>setOk(false),2000); }catch{/**/}finally{setSaving(false);} };
  return <div><SecHdr eyebrow={t("discovery.business_case_eyebrow")} /><div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:10, marginBottom:14 }}><SummaryCard label={t("discovery.business_case_latest_assessment_label")} value={t("discovery.business_case_latest_assessment_value")} /><SummaryCard label={t("discovery.business_case_summary_label")} value={form.status?.toUpperCase?.() || "DRAFT"} /><SummaryCard label={t("discovery.business_case_decisions_label")} value={String(decisionsCount)} /></div><Fld lbl={t("discovery.business_case_field_title")}><input className="mod-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></Fld><Fld lbl={t("discovery.business_case_field_executive_summary")}><textarea className="mod-textarea" style={{ minHeight:70 }} value={form.executive_summary} onChange={e=>setForm(p=>({...p,executive_summary:e.target.value}))} /></Fld><Fld lbl={t("discovery.business_case_field_status")}><select className="mod-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="draft">{t("discovery.business_case_status_draft")}</option><option value="in_review">{t("discovery.business_case_status_in_review")}</option><option value="approved">{t("discovery.business_case_status_approved")}</option><option value="rejected">{t("discovery.business_case_status_rejected")}</option></select></Fld><div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center", marginTop:8 }}>{ok&&<span style={{ fontSize:10, color:"#00ff88" }}>✓</span>}<button className="btn-save" onClick={save} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.business_case_btn_save")}</button></div></div>;
}

function AssessmentDimension({ title, fields, values, onChange }:{ title:string; fields:{key:keyof OppAssessment | string; label:string; help?:string}[]; values:any; onChange:(field:string, value:string)=>void }) {
  const { t } = useTranslation();
  const LEVELS = ["unknown","low","medium","high"];
  return (
    <div style={{ border:"1px solid rgba(0,212,255,0.12)", padding:12, background:"rgba(0,212,255,0.02)", marginBottom:12 }}>
      <div style={{ fontSize:10, color:"#00d4ff", letterSpacing:2, marginBottom:10 }}>{title}</div>
      {fields.map(field=>(
        <Fld key={field.key} lbl={field.label} help={field.help}>
          <select className="mod-select" value={values[field.key]} onChange={e=>onChange(String(field.key), e.target.value)}>
            {LEVELS.map(v=><option key={v} value={v}>{t(`discovery.assessment_level_${v}`, { defaultValue:v })}</option>)}
          </select>
        </Fld>
      ))}
    </div>
  );
}

function TabAssess({ oppId, assessments, sources, onReload }:{ oppId:string; assessments:OppAssessment[]; sources:OppSource[]; onReload:()=>Promise<void>|void }) {
  const { t } = useTranslation();

  const EMPTY_ASSESSMENT = {
    assessment_type:"initial",
    problem_clarity:"unknown",
    evidence_strength:"unknown",
    business_impact:"unknown",
    expected_outcome_clarity:"unknown",
    potential_business_value:"unknown",
    strategic_alignment:"unknown",
    urgency:"unknown",
    business_uncertainty:"unknown",
    solution_uncertainty:"unknown",
    initial_viability:"unknown",
    recommendation:"",
    rationale:"",
    assessed_by:"",
    assessed_at:"",
  };
  const EMPTY_SOURCE = {
    source_type:"other",
    source_system:"",
    external_reference:"",
    external_url:"",
    requester_name:"",
    sponsor_name:"",
    received_at:"",
    original_context:"",
    is_primary:false,
  };

  const [assessmentModal,setAssessmentModal]=useState<"new"|"edit"|null>(null);
  const [editingAssessment,setEditingAssessment]=useState<OppAssessment|null>(null);
  const [assessmentForm,setAssessmentForm]=useState({...EMPTY_ASSESSMENT});
  const [sourceModal,setSourceModal]=useState<"new"|"edit"|null>(null);
  const [editingSource,setEditingSource]=useState<OppSource|null>(null);
  const [sourceForm,setSourceForm]=useState({...EMPTY_SOURCE});
  const [savingAssessment,setSavingAssessment]=useState(false);
  const [savingSource,setSavingSource]=useState(false);

  const ASSESS_TYPES = ["initial","post_discovery_review","reassessment"];
  const RECOMMENDATIONS = ["discovery_required","ready_for_evaluation","more_information_required","hold","merge","do_not_pursue"];
  const SOURCE_TYPES = ["stakeholder_request","customer_feedback","data_analysis","market_research","consultant_discovery","external_demand_system","workshop","regulatory_requirement","internal_analysis","other"];

  const openNewAssessment=()=>{ setEditingAssessment(null); setAssessmentForm({...EMPTY_ASSESSMENT}); setAssessmentModal("new"); };
  const openEditAssessment=(a:OppAssessment)=>{ setEditingAssessment(a); setAssessmentForm({
    assessment_type:a.assessment_type,
    problem_clarity:a.problem_clarity,
    evidence_strength:a.evidence_strength,
    business_impact:a.business_impact,
    expected_outcome_clarity:a.expected_outcome_clarity,
    potential_business_value:a.potential_business_value,
    strategic_alignment:a.strategic_alignment,
    urgency:a.urgency,
    business_uncertainty:a.business_uncertainty,
    solution_uncertainty:a.solution_uncertainty,
    initial_viability:a.initial_viability,
    recommendation:a.recommendation??"",
    rationale:a.rationale??"",
    assessed_by:a.assessed_by??"",
    assessed_at:a.assessed_at??"",
  }); setAssessmentModal("edit"); };

  const saveAssessment=async()=>{
    setSavingAssessment(true);
    try{
      const payload = {
        ...assessmentForm,
        recommendation: assessmentForm.recommendation || null,
        rationale: assessmentForm.rationale || null,
        assessed_by: assessmentForm.assessed_by || null,
        assessed_at: assessmentForm.assessed_at || null,
      };
      if(assessmentModal==="new") await apiPost(`/opportunities/opportunities/${oppId}/assessments`, payload);
      else if(editingAssessment) await apiPatch(`/opportunities/opportunity-assessments/${editingAssessment.id}`, payload);
      setAssessmentModal(null);
      await onReload();
    }catch{/**/}finally{setSavingAssessment(false);}
  };

  const deleteAssessment=async(id:string)=>{
    if(!confirm(t("discovery.confirm_delete"))) return;
    try{ await apiDelete(`/opportunities/opportunity-assessments/${id}`); await onReload(); }catch{/**/}
  };

  const openNewSource=()=>{ setEditingSource(null); setSourceForm({...EMPTY_SOURCE}); setSourceModal("new"); };
  const openEditSource=(s:OppSource)=>{ setEditingSource(s); setSourceForm({
    source_type:s.source_type,
    source_system:s.source_system??"",
    external_reference:s.external_reference??"",
    external_url:s.external_url??"",
    requester_name:s.requester_name??"",
    sponsor_name:s.sponsor_name??"",
    received_at:s.received_at??"",
    original_context:s.original_context??"",
    is_primary:s.is_primary,
  }); setSourceModal("edit"); };

  const saveSource=async()=>{
    setSavingSource(true);
    try{
      const payload = {
        ...sourceForm,
        source_system: sourceForm.source_system || null,
        external_reference: sourceForm.external_reference || null,
        external_url: sourceForm.external_url || null,
        requester_name: sourceForm.requester_name || null,
        sponsor_name: sourceForm.sponsor_name || null,
        received_at: sourceForm.received_at || null,
        original_context: sourceForm.original_context || null,
      };
      if(sourceModal==="new") await apiPost(`/opportunities/opportunities/${oppId}/sources`, payload);
      else if(editingSource) await apiPatch(`/opportunities/opportunity-sources/${editingSource.id}`, payload);
      setSourceModal(null);
      await onReload();
    }catch{/**/}finally{setSavingSource(false);}
  };

  const deleteSource=async(id:string)=>{
    if(!confirm(t("discovery.confirm_delete"))) return;
    try{ await apiDelete(`/opportunities/opportunity-sources/${id}`); await onReload(); }catch{/**/}
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <StageSection title={t("discovery.assess_sources_title")} subtitle={t("discovery.assess_sources_subtitle")}>
        <SecHdr eyebrow={t("discovery.sources_title")} onAdd={openNewSource} addLbl={t("discovery.sources_btn_new")} />
        {sources.length===0 ? <EmptyItem text={t("discovery.sources_empty")} /> : sources.map(s=>(
          <ItemCard
            key={s.id}
            title={t(`discovery.source_type_${s.source_type}`, { defaultValue:s.source_type })}
            sub={`${s.source_system || "—"}${s.external_reference ? ` · ${s.external_reference}` : ""}`}
            badge={s.is_primary ? "primary" : undefined}
            onEdit={()=>openEditSource(s)}
            onDel={()=>deleteSource(s.id)}
          />
        ))}
      </StageSection>

      <StageSection title={t("discovery.assess_assessments_title")} subtitle={t("discovery.assess_assessments_subtitle")}>
        <SecHdr eyebrow={t("discovery.assessment_title")} onAdd={openNewAssessment} addLbl={t("discovery.assessment_btn_new")} />
        {assessments.length===0 ? <EmptyItem text={t("discovery.assessment_empty")} /> : assessments.map(a=>(
          <ItemCard
            key={a.id}
            title={t(`discovery.assessment_type_${a.assessment_type}`, { defaultValue:a.assessment_type })}
            sub={`${a.assessed_by || "—"}${a.assessed_at ? ` · ${a.assessed_at}` : ""}`}
            badge={a.recommendation}
            onEdit={()=>openEditAssessment(a)}
            onDel={()=>deleteAssessment(a.id)}
          />
        ))}
      </StageSection>

      {assessmentModal && <ModalShell title={assessmentModal==="new"?t("discovery.assessment_btn_new"):t("discovery.btn_edit")} sub={t("discovery.assessment_title")} onClose={()=>setAssessmentModal(null)} onSave={saveAssessment} saving={savingAssessment}>
        <Fld lbl={t("discovery.assessment_field_type")}><select className="mod-select" value={assessmentForm.assessment_type} onChange={e=>setAssessmentForm(p=>({...p,assessment_type:e.target.value}))}>{ASSESS_TYPES.map(v=><option key={v} value={v}>{t(`discovery.assessment_type_${v}`, { defaultValue:v })}</option>)}</select></Fld>

        <AssessmentDimension
          title={t("discovery.assessment_group_problem_evidence")}
          values={assessmentForm}
          onChange={(field, value)=>setAssessmentForm(p=>({...p,[field]:value}))}
          fields={[
            { key:"problem_clarity", label:t("discovery.assessment_field_problem_clarity") },
            { key:"evidence_strength", label:t("discovery.assessment_field_evidence_strength") },
            { key:"business_impact", label:t("discovery.assessment_field_business_impact") },
          ]}
        />

        <AssessmentDimension
          title={t("discovery.assessment_group_value_direction")}
          values={assessmentForm}
          onChange={(field, value)=>setAssessmentForm(p=>({...p,[field]:value}))}
          fields={[
            { key:"expected_outcome_clarity", label:t("discovery.assessment_field_expected_outcome_clarity") },
            { key:"potential_business_value", label:t("discovery.assessment_field_potential_business_value") },
            { key:"strategic_alignment", label:t("discovery.assessment_field_strategic_alignment") },
            { key:"urgency", label:t("discovery.assessment_field_urgency") },
          ]}
        />

        <AssessmentDimension
          title={t("discovery.assessment_group_uncertainty_feasibility")}
          values={assessmentForm}
          onChange={(field, value)=>setAssessmentForm(p=>({...p,[field]:value}))}
          fields={[
            { key:"business_uncertainty", label:t("discovery.assessment_field_business_uncertainty") },
            { key:"solution_uncertainty", label:t("discovery.assessment_field_solution_uncertainty") },
            { key:"initial_viability", label:t("discovery.assessment_field_initial_viability") },
          ]}
        />

        <div style={{ border:"1px solid rgba(0,212,255,0.12)", padding:12, background:"rgba(0,212,255,0.02)", marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#00d4ff", letterSpacing:2, marginBottom:10 }}>{t("discovery.assessment_group_recommendation")}</div>
          <Fld lbl={t("discovery.assessment_field_recommendation")}><select className="mod-select" value={assessmentForm.recommendation} onChange={e=>setAssessmentForm(p=>({...p,recommendation:e.target.value}))}><option value="">—</option>{RECOMMENDATIONS.map(v=><option key={v} value={v}>{t(`discovery.assessment_recommendation_${v}`, { defaultValue:v })}</option>)}</select></Fld>
          <Fld lbl={t("discovery.assessment_field_rationale")}><textarea className="mod-textarea" value={assessmentForm.rationale} onChange={e=>setAssessmentForm(p=>({...p,rationale:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.assessment_field_assessed_by")}><input className="mod-input" value={assessmentForm.assessed_by} onChange={e=>setAssessmentForm(p=>({...p,assessed_by:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.assessment_field_assessed_at")}><input className="mod-input" type="datetime-local" value={assessmentForm.assessed_at} onChange={e=>setAssessmentForm(p=>({...p,assessed_at:e.target.value}))} /></Fld>
        </div>
      </ModalShell>}

      {sourceModal && <ModalShell title={sourceModal==="new"?t("discovery.sources_btn_new"):t("discovery.btn_edit")} sub={t("discovery.sources_title")} onClose={()=>setSourceModal(null)} onSave={saveSource} saving={savingSource}>
        <Fld lbl={t("discovery.source_field_type")}><select className="mod-select" value={sourceForm.source_type} onChange={e=>setSourceForm(p=>({...p,source_type:e.target.value}))}>{SOURCE_TYPES.map(v=><option key={v} value={v}>{t(`discovery.source_type_${v}`, { defaultValue:v })}</option>)}</select></Fld>
        <Fld lbl={t("discovery.source_field_system")}><input className="mod-input" value={sourceForm.source_system} onChange={e=>setSourceForm(p=>({...p,source_system:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_external_reference")}><input className="mod-input" value={sourceForm.external_reference} onChange={e=>setSourceForm(p=>({...p,external_reference:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_external_url")}><input className="mod-input" value={sourceForm.external_url} onChange={e=>setSourceForm(p=>({...p,external_url:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_requester_name")}><input className="mod-input" value={sourceForm.requester_name} onChange={e=>setSourceForm(p=>({...p,requester_name:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_sponsor_name")}><input className="mod-input" value={sourceForm.sponsor_name} onChange={e=>setSourceForm(p=>({...p,sponsor_name:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_received_at")}><input className="mod-input" type="datetime-local" value={sourceForm.received_at} onChange={e=>setSourceForm(p=>({...p,received_at:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_context")}><textarea className="mod-textarea" value={sourceForm.original_context} onChange={e=>setSourceForm(p=>({...p,original_context:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.source_field_is_primary")}><input type="checkbox" checked={sourceForm.is_primary} onChange={e=>setSourceForm(p=>({...p,is_primary:e.target.checked}))} /></Fld>
      </ModalShell>}
    </div>
  );
}

function TabPromotionGate({ oppId, productId, businessCase, onLinkedToRoadmap, onCharterLoaded }:{ oppId:string; productId:string; businessCase?:BusinessCase|null; onLinkedToRoadmap?:(result:ForwardToRoadmapResult)=>Promise<void>|void; onCharterLoaded?:(charter:ProjectCharter|null)=>void }) {
  const { t } = useTranslation();
  const [charter, setCharter] = useState<ProjectCharter | null>(null);
  const [saving, setSaving] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const load = useCallback(async()=>{
    try{
      const loaded = await apiGet<ProjectCharter | null>(`/discovery/opportunities/${oppId}/project-charter`);
      setCharter(loaded);
      onCharterLoaded?.(loaded);
    }catch{
      setCharter(null);
      onCharterLoaded?.(null);
    }
  },[oppId,onCharterLoaded]);

  useEffect(()=>{ load(); },[load]);

  const createStarterCharter = async()=>{
    setSaving(true);
    try{
      await apiPut(`/discovery/opportunities/${oppId}/project-charter`, {
        business_case_id: businessCase?.id ?? null,
        roadmap_item_id: null,
        project_name: businessCase?.title || "Project Charter",
        project_purpose: businessCase?.executive_summary || "",
        business_objective: businessCase?.expected_benefits || "",
        objectives: "",
        scope_in: businessCase?.proposed_solution || "",
        scope_out: "",
        success_criteria: "",
        high_level_requirements: "",
        major_deliverables: "",
        high_level_timeline: "",
        budget_summary: businessCase?.estimated_cost || "",
        risks_summary: businessCase?.risks_summary || "",
        assumptions_constraints: [businessCase?.assumptions, businessCase?.constraints].filter(Boolean).join("\n\n"),
        sponsor_name: "",
        project_manager_name: "",
        status: "draft",
      });
      await load();
    }catch{/**/}finally{setSaving(false);}
  };

  const forward = async()=>{
    setForwarding(true);
    try{
      const result = await apiPost<ForwardToRoadmapResult>(`/discovery/opportunities/${oppId}/forward-to-roadmap`, {});
      await onLinkedToRoadmap?.(result);
      await load();
    }catch{/**/}finally{setForwarding(false);}
  };

  return (
    <div>
      <SecHdr eyebrow={t("discovery.promotion_gate_label")} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:10, marginBottom:14 }}>
        <SummaryCard label={t("discovery.promotion_gate_business_case")} value={businessCase ? t("discovery.promotion_gate_ready") : t("discovery.promotion_gate_required")} tone={businessCase ? "#c8dce8" : "#ff9900"} />
        <SummaryCard label={t("discovery.promotion_gate_project_charter")} value={charter ? (charter.status?.toUpperCase?.() || "DRAFT") : t("discovery.promotion_gate_missing")} tone={charter ? "#c8dce8" : "#ff9900"} />
        <SummaryCard label={t("discovery.promotion_gate_roadmap_trace")} value={charter?.roadmap_item_id ? t("discovery.promotion_gate_linked") : t("discovery.promotion_gate_not_linked")} tone={charter?.roadmap_item_id ? "#00ff88" : "#7899b0"} />
      </div>

      <div style={{ color:"#7899b0", fontSize:11, lineHeight:1.6, marginBottom:12, padding:"10px 12px", border:"1px solid rgba(0,212,255,0.12)", background:"rgba(0,212,255,0.03)" }}>
        {t("discovery.promotion_gate_description")}
      </div>

      {!charter && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <button className="btn-save" onClick={createStarterCharter} disabled={saving || !businessCase}>
            {saving ? t("discovery.promotion_gate_creating") : t("discovery.promotion_gate_create_charter")}
          </button>
        </div>
      )}

      {charter && (
        <div style={{ border:"1px solid rgba(0,212,255,0.12)", padding:"12px 14px", background:"rgba(0,212,255,0.02)", marginBottom:12 }}>
          <div style={{ fontSize:12, color:"#c8dce8", fontWeight:600, marginBottom:8 }}>{charter.project_name}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
            <FldView lbl={t("discovery.promotion_gate_charter_status")} val={charter.status} />
            <FldView lbl={t("discovery.promotion_gate_charter_roadmap_item")} val={charter.roadmap_item_id || "—"} />
            <FldView lbl={t("discovery.promotion_gate_charter_purpose")} val={charter.project_purpose} />
            <FldView lbl={t("discovery.promotion_gate_charter_objective")} val={charter.business_objective} />
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ fontSize:10, color:"#7899b0" }}>Product {productId} • Opportunity {oppId}</div>
        <button className="btn-save" onClick={forward} disabled={forwarding || !businessCase || !charter || !!charter.roadmap_item_id}>
          {forwarding ? t("discovery.promotion_gate_forwarding") : charter?.roadmap_item_id ? t("discovery.promotion_gate_already_linked") : t("discovery.promotion_gate_promote")}
        </button>
      </div>
    </div>
  );
}

function TabDecide({ oppId, businessCase, onDecisionSaved }:{ oppId:string; businessCase?:BusinessCase|null; onDecisionSaved?:()=>Promise<void>|void }) {
  const { t } = useTranslation();
  const [decisions, setDecisions] = useState<OppDecision[]>([]);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [editing, setEditing] = useState<OppDecision|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:"",
    context:"",
    decision:"",
    consequences:"",
    status:"proposed",
    business_case_id:"",
    decided_by:"",
    decision_date:"",
  });

  const load = useCallback(async()=>{
    try{
      setDecisions(await apiGet<OppDecision[]>(`/opportunities/opportunities/${oppId}/decisions`));
    }catch{
      setDecisions([]);
    }
  },[oppId]);

  useEffect(()=>{ load(); },[load]);

  const openNew = ()=>{
    setEditing(null);
    setForm({
      title: businessCase ? `Decision — ${businessCase.title}` : "",
      context:"",
      decision:"",
      consequences:"",
      status:"proposed",
      business_case_id: businessCase?.id ?? "",
      decided_by:"",
      decision_date:"",
    });
    setModal("new");
  };

  const openEdit = (d:OppDecision)=>{
    setEditing(d);
    setForm({
      title:d.title,
      context:d.context ?? "",
      decision:d.decision ?? "",
      consequences:d.consequences ?? "",
      status:d.status,
      business_case_id:d.business_case_id ?? "",
      decided_by:d.decided_by ?? "",
      decision_date:d.decision_date ?? "",
    });
    setModal("edit");
  };

  const save = async()=>{
    setSaving(true);
    try{
      const payload = {
        ...form,
        business_case_id: form.business_case_id || null,
        context: form.context || null,
        decision: form.decision || null,
        consequences: form.consequences || null,
        decided_by: form.decided_by || null,
        decision_date: form.decision_date || null,
      };
      if(modal==="new") await apiPost(`/opportunities/opportunities/${oppId}/decisions`, payload);
      else if(editing) await apiPatch(`/opportunities/opportunity-decisions/${editing.id}`, payload);
      setModal(null);
      await load();
      await onDecisionSaved?.();
    }catch{/**/}finally{setSaving(false);}
  };

  const remove = async(id:string)=>{
    if(!confirm(t("discovery.confirm_delete"))) return;
    try{ await apiDelete(`/opportunities/opportunity-decisions/${id}`); await load(); await onDecisionSaved?.(); }catch{/**/}
  };

  return (
    <div>
      <SecHdr eyebrow={t("discovery.decide_title")} onAdd={openNew} addLbl={t("discovery.decide_btn_new")} />
      <div style={{ color:"#7899b0", fontSize:11, lineHeight:1.6, marginBottom:12, padding:"10px 12px", border:"1px solid rgba(0,212,255,0.12)", background:"rgba(0,212,255,0.03)" }}>
        {t("discovery.decide_subtitle")}
      </div>
      {decisions.length===0 ? <EmptyItem text={t("discovery.decide_empty")} /> : decisions.map(d=>(
        <ItemCard
          key={d.id}
          title={d.title}
          sub={`${d.decided_by || "—"}${d.decision_date ? ` · ${d.decision_date}` : ""}`}
          badge={d.status}
          onEdit={()=>openEdit(d)}
          onDel={()=>remove(d.id)}
        />
      ))}
      {modal && <ModalShell title={modal==="new"?t("discovery.decide_modal_new"):t("discovery.decide_modal_edit")} sub={t("discovery.decide_title")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
        <Fld lbl={t("discovery.decide_field_title")}><input className="mod-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.decide_field_context")}><textarea className="mod-textarea" value={form.context} onChange={e=>setForm(p=>({...p,context:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.decide_field_decision")}><textarea className="mod-textarea" value={form.decision} onChange={e=>setForm(p=>({...p,decision:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.decide_field_consequences")}><textarea className="mod-textarea" value={form.consequences} onChange={e=>setForm(p=>({...p,consequences:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.decide_field_status")}><select className="mod-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="proposed">{t("discovery.decide_status_proposed")}</option><option value="accepted">{t("discovery.decide_status_accepted")}</option><option value="deprecated">{t("discovery.decide_status_deprecated")}</option><option value="superseded">{t("discovery.decide_status_superseded")}</option></select></Fld>
        <Fld lbl={t("discovery.decide_field_business_case")}><select className="mod-select" value={form.business_case_id} onChange={e=>setForm(p=>({...p,business_case_id:e.target.value}))}><option value="">—</option>{businessCase && <option value={businessCase.id}>{businessCase.title}</option>}</select></Fld>
        <Fld lbl={t("discovery.decide_field_decided_by")}><input className="mod-input" value={form.decided_by} onChange={e=>setForm(p=>({...p,decided_by:e.target.value}))} /></Fld>
        <Fld lbl={t("discovery.decide_field_decision_date")}><input className="mod-input" type="datetime-local" value={form.decision_date} onChange={e=>setForm(p=>({...p,decision_date:e.target.value}))} /></Fld>
      </ModalShell>}
    </div>
  );
}

export default function DiscoveryPage() {
  const { t }=useTranslation();
  const navigate = useNavigate();
  const { id: routeOppId } = useParams();
  const { user }=useAuth();
  const dark=user?.user_theme!=="light";
  const [productId, setProductId]=useState(localStorage.getItem("pl_product")??"");
  const [opps, setOpps]=useState<Opp[]>([]);
  const [bizAreas, setBizAreas]=useState<BizArea[]>([]);
  const [oppStakeholders, setOppStakeholders]=useState<OppStakeholder[]>([]);
  const [selectedOpp, setSelectedOpp]=useState<Opp|null>(null);
  const [viewStage, setViewStage]=useState<ViewStage>("capture");
  const [savedBusinessCase, setSavedBusinessCase]=useState<BusinessCase|null>(null);
  const [forwarding, setForwarding]=useState(false);
  const [sources, setSources] = useState<OppSource[]>([]);
  const [assessments, setAssessments] = useState<OppAssessment[]>([]);
  const [decisionCount, setDecisionCount] = useState(0);
  const [tabHasContent, setTabHasContent]=useState<Partial<Record<ViewStage,TabStatus>>>({});
  const [hintOpen, setHintOpen]=useState(false);
  const [oppModal, setOppModal]=useState<"new"|null>(null);
  const [detailModal, setDetailModal]=useState<{opp:Opp;mode:"view"|"edit"}|null>(null);
  const [error, setError]=useState("");
  const [saving, setSaving]=useState(false);
  const [oppPage, setOppPage]=useState(1);
  const oppPageSize = 8;
  const [oppForm, setOppForm]=useState({ title:"", description:"", origin:"", impacted_area_id:"", responsible_stakeholder_id:"", identified_at:"", status:"identified", priority:3 });

  const currentStage = normalizeJourneyStage(selectedOpp?.journey_stage);
  const readiness = deriveReadiness(selectedOpp);
  const totalOppPages = Math.max(1, Math.ceil(opps.length / oppPageSize));
  const pagedOpps = opps.slice((oppPage - 1) * oppPageSize, oppPage * oppPageSize);
  useEffect(()=>{ if(selectedOpp) loadStageCounts(selectedOpp.id); },[selectedOpp?.id]);
  const reloadAssessData = useCallback(async()=>{
    if(!selectedOpp){ setSources([]); setAssessments([]); return; }
    try{
      const [srcs, ass, decs] = await Promise.all([
        apiGet<OppSource[]>(`/opportunities/opportunities/${selectedOpp.id}/sources`).catch(()=>[]),
        apiGet<OppAssessment[]>(`/opportunities/opportunities/${selectedOpp.id}/assessments`).catch(()=>[]),
        apiGet<OppDecision[]>(`/opportunities/opportunities/${selectedOpp.id}/decisions`).catch(()=>[]),
      ]);
      setSources(srcs);
      setAssessments(ass);
      setDecisionCount(decs.length);
    }catch{
      setSources([]);
      setAssessments([]);
      setDecisionCount(0);
    }
  },[selectedOpp?.id]);

  useEffect(()=>{
    reloadAssessData();
  },[reloadAssessData]);

  useEffect(()=>{
    if(!selectedOpp)return;
    const k=`opportunities_hint_${viewStage}_${selectedOpp.id}`;
    setHintOpen(localStorage.getItem(k)!=="1");
  },[viewStage, selectedOpp?.id]);

  useEffect(()=>{
    if (selectedOpp) {
      setViewStage(JOURNEY_STAGE_TO_VIEW[normalizeJourneyStage(selectedOpp.journey_stage)]);
    }
  },[selectedOpp?.id]);

  useEffect(()=>{
    if(!routeOppId || opps.length===0) return;
    const match = opps.find(o=>o.id===routeOppId);
    if(match) setSelectedOpp(match);
  },[routeOppId, opps]);

  useEffect(()=>{
    if (!selectedOpp) {
      setSavedBusinessCase(null);
    }
  },[selectedOpp?.id]);

  const handleHintDismiss=()=>{ if(!selectedOpp)return; const k=`opportunities_hint_${viewStage}_${selectedOpp.id}`; localStorage.setItem(k,"1"); setHintOpen(false); };

  const loadStageCounts=useCallback(async(oppId:string)=>{
    try {
      const [jtbd,research,insights,assumptions,solutions,experiments,metrics,vpc,problem,businessCase,projectCharter,decisions]=await Promise.allSettled([
        apiGet<unknown[]>(`/discovery/opportunities/${oppId}/jtbd`), apiGet<unknown[]>(`/discovery/opportunities/${oppId}/research`),
        apiGet<unknown[]>(`/discovery/opportunities/${oppId}/insights`), apiGet<unknown[]>(`/discovery/opportunities/${oppId}/assumptions`),
        apiGet<unknown[]>(`/discovery/opportunities/${oppId}/solution-ideas`), apiGet<unknown[]>(`/discovery/opportunities/${oppId}/experiments`),
        apiGet<unknown[]>(`/discovery/opportunities/${oppId}/success-metrics`), apiGet<unknown[]>(`/vpc/canvas?opportunity_id=${oppId}`),
        apiGet<Record<string,string>|null>(`/discovery/opportunities/${oppId}/problem-statement`),
        apiGet<BusinessCase | null>(`/discovery/opportunities/${oppId}/business-case`),
        apiGet<ProjectCharter | null>(`/discovery/opportunities/${oppId}/project-charter`),
        apiGet<OppDecision[]>(`/opportunities/opportunities/${oppId}/decisions`),
      ]);
      const hi=(r:PromiseSettledResult<unknown[]>):TabStatus=>r.status==="fulfilled"&&Array.isArray(r.value)&&r.value.length>0?"complete":"empty";
      let pStatus:TabStatus="empty";
      if(problem.status==="fulfilled"&&problem.value!==null){
        const TEXT_KEYS=["observed_problem","who_is_affected","current_impact","available_evidence","consequence_of_inaction"];
        const ps=problem.value as Record<string,unknown>;
        const filled=TEXT_KEYS.filter(k=>typeof ps[k]==="string"&&(ps[k] as string).trim().length>0).length;
        pStatus=filled===0?"empty":filled>=TEXT_KEYS.length?"complete":"partial";
      }
      const discoverParts = [pStatus, hi(jtbd), hi(research), hi(insights), hi(assumptions), hi(solutions), hi(experiments), hi(metrics), hi(vpc as PromiseSettledResult<unknown[]>)];
      const completeCount = discoverParts.filter(x=>x==="complete").length;
      const partialCount = discoverParts.filter(x=>x==="partial").length;
      const discoverStatus:TabStatus = completeCount>0 ? (partialCount>0 || completeCount<discoverParts.length ? "partial" : "complete") : partialCount>0 ? "partial" : "empty";
      setTabHasContent({
        capture:"complete",
        assess: assessments.length>0 || sources.length>0 ? "complete" : "empty",
        discover: discoverStatus,
        evaluate: businessCase.status==="fulfilled"&&businessCase.value ? "complete" : "empty",
        decide: decisions.status==="fulfilled"&&decisions.value.length>0 ? "complete" : "empty",
        promotion_gate: projectCharter.status==="fulfilled"&&projectCharter.value ? "partial" : "empty",
      });
      if (businessCase.status==="fulfilled") setSavedBusinessCase(businessCase.value ?? null);
    } catch{/***/}
  },[assessments.length, sources.length]);

  const loadOpps=useCallback(async(pid=productId)=>{
    if(!pid){setOpps([]);return;}
    try{
      setError("");
      const loaded = await apiGet<Opp[]>(`/opportunities/opportunities?product_id=${pid}`);
      setOpps(loaded);
      setOppPage(1);
    }catch(e){
      const msg = e instanceof Error ? e.message : t("discovery.err_load");
      setError(msg || t("discovery.err_load"));
      setOpps([]);
      setOppPage(1);
    }
  },[productId,t]);
  useEffect(()=>{ loadOpps(); },[loadOpps]);

  useEffect(()=>{ apiGet<{total:number;items:BizArea[]}>("/business-areas?active_only=true&size=200").then(r=>setBizAreas(r.items??[])).catch(()=>setBizAreas([])); },[]);
  useEffect(()=>{ const pid=productId; if(!pid){setOppStakeholders([]);return;} apiGet<{items:OppStakeholder[]}>(`/stakeholders?product_id=${pid}&size=200`).then(r=>setOppStakeholders(r.items??[])).catch(()=>setOppStakeholders([])); },[productId]);

  const handleProductChange=(id:string)=>{ localStorage.setItem("pl_product",id); setProductId(id); setSelectedOpp(null); setOppPage(1); };
  const openNewOpp=()=>{ setError(""); setOppForm({ title:"", description:"", origin:"", impacted_area_id:"", responsible_stakeholder_id:"", identified_at:"", status:"identified", priority:3 }); setOppModal("new"); };
  const saveNewOpp=async()=>{
    if(!oppForm.title.trim())return; setSaving(true);
    const body={ ...oppForm, identified_at:oppForm.identified_at||null, description:oppForm.description||null, origin:oppForm.origin||null, impacted_area_id:oppForm.impacted_area_id?Number(oppForm.impacted_area_id):null, responsible_stakeholder_id:oppForm.responsible_stakeholder_id?Number(oppForm.responsible_stakeholder_id):null };
    try{ const created=await apiPost<Opp>("/opportunities/opportunities",{...body,product_id:Number(productId)}); await loadOpps(); setSelectedOpp(created); setViewStage("capture"); setOppModal(null); }
    catch{ setError(t("discovery.err_save")); }finally{ setSaving(false); }
  };
  const bdr=dark?"#0d2535":"#d0dde8";

  const forwardToRoadmap=async()=>{
    if(!selectedOpp) return;
    setForwarding(true);
    try{
      const result = await apiPost<{ roadmap_item_id:string; roadmap_title:string; opportunity_status:string; journey_stage:string; lifecycle_status:string }>(`/discovery/opportunities/${selectedOpp.id}/forward-to-roadmap`,{});
      const updated = {
        ...selectedOpp,
        status: result.opportunity_status,
        journey_stage: result.journey_stage,
        lifecycle_status: result.lifecycle_status,
      };
      setSelectedOpp(updated);
      setOpps(prev=>prev.map(o=>o.id===updated.id?updated:o));
      setViewStage("promotion_gate");
      await loadStageCounts(selectedOpp.id);
    }catch(e){
      const msg = e instanceof Error ? e.message : t("discovery.err_save");
      setError(msg || t("discovery.err_save"));
    }finally{
      setForwarding(false);
    }
  };

  const renderStageContent = () => {
    if (!selectedOpp) return null;

    if (viewStage === "capture") {
      return (
        <StageSection title={t("discovery.capture_title")} subtitle={t("discovery.capture_subtitle")}>
          <div style={{ marginBottom:16, padding:"16px 20px", background:"rgba(0,212,255,0.03)", border:"1px solid rgba(0,212,255,0.12)", borderLeft:`3px solid ${statusColor(selectedOpp.status)}`, borderRadius:3 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <h2 style={{ fontSize:16, fontWeight:700, color:"#00d4ff", margin:0, lineHeight:1.3 }}>{selectedOpp.title}</h2>
                {selectedOpp.description&&<p style={{ fontSize:12, color:"#7899b0", marginTop:6, lineHeight:1.5, marginBottom:0 }}>{selectedOpp.description}</p>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:16, flexShrink:0 }}>
                <span style={{ fontSize:11, color:"#7899b0", fontWeight:700 }}>P{selectedOpp.priority}</span>
                {selectedOpp.status!=="forwarded_to_roadmap" && <button className="btn-save" style={{ fontSize:10, padding:"4px 8px" }} onClick={forwardToRoadmap} disabled={forwarding}>{forwarding?t("discovery.promotion_gate_forwarding_short"):t("discovery.quick_forward_to_roadmap")}</button>}
                <button className="btn-icon" style={{ fontSize:10, padding:"4px 7px", display:"flex", alignItems:"center" }} title={t("discovery.btn_edit")} onClick={()=>setDetailModal({opp:selectedOpp,mode:"edit"})}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg>
                </button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px 24px" }}>
              {[
                [t("discovery.capture_source_label"), selectedOpp.primary_source?.source_type?.replace(/_/g," ") || (selectedOpp.origin ? t(`discovery.origin_${selectedOpp.origin}`,{defaultValue:selectedOpp.origin}) : undefined)],
                [t("discovery.capture_journey_stage_label"), formatStageLabel(t, currentStage)],
                [t("discovery.capture_lifecycle_label"), selectedOpp.lifecycle_status?.replace(/_/g," ").toUpperCase()],
                [t("discovery.capture_readiness_label"), readiness.replace(/_/g," ").toUpperCase()],
                [t("discovery.field_impacted_area"), selectedOpp.impacted_area_name],
                [t("discovery.field_responsible"), selectedOpp.responsible_name],
                [t("discovery.field_identified_at"), selectedOpp.identified_at],
              ].map(([lbl,val])=>(
                <div key={lbl as string}>
                  <div style={{ fontSize:8, color:"#7899b0", letterSpacing:1, marginBottom:3 }}>{lbl}</div>
                  <div style={{ fontSize:11, color:val?"#c8dce8":"#334455" }}>{(val as string)||"—"}</div>
                </div>
              ))}
            </div>
          </div>
        </StageSection>
      );
    }

    if (viewStage === "assess") {
      return <StageSection title={t("discovery.assess_title")} subtitle={t("discovery.assess_subtitle")}><TabAssess oppId={selectedOpp.id} assessments={assessments} sources={sources} onReload={reloadAssessData} /></StageSection>;
    }

    if (viewStage === "discover") {
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <StageSection title={t("discovery.group_understand")} subtitle={t("discovery.group_understand_subtitle")}>
            <TabProblem oppId={selectedOpp.id} impactedAreaName={selectedOpp.impacted_area_name} bizAreas={bizAreas} />
            <div style={{ marginTop:16 }}><TabJTBD oppId={selectedOpp.id} productId={productId} /></div>
            <div style={{ marginTop:16, padding:"10px 12px", border:`1px solid ${bdr}`, background:"rgba(0,212,255,0.02)" }}>
              <div style={{ fontSize:11, color:"#7899b0" }}>{t("discovery.discover_process_mapping_hint")}</div>
            </div>
          </StageSection>

          <StageSection title={t("discovery.group_learn")} subtitle={t("discovery.group_learn_subtitle")}>
            <TabResearch oppId={selectedOpp.id} oppStakeholders={oppStakeholders} />
            <div style={{ marginTop:16 }}><TabInsights oppId={selectedOpp.id} /></div>
            <div style={{ marginTop:16 }}><TabAssumptions oppId={selectedOpp.id} /></div>
          </StageSection>

          <StageSection title={t("discovery.group_explore")} subtitle={t("discovery.group_explore_subtitle")}>
            <div style={{ marginBottom:16, padding:"10px 12px", border:`1px solid ${bdr}`, background:"rgba(0,212,255,0.02)" }}>
              <div style={{ fontSize:11, color:"#7899b0" }}>{t("discovery.discover_vpc_hint")}</div>
            </div>
            <TabSolutions oppId={selectedOpp.id} />
          </StageSection>

          <StageSection title={t("discovery.group_validate")} subtitle={t("discovery.group_validate_subtitle")}>
            <TabExperiments oppId={selectedOpp.id} />
            <div style={{ marginTop:16 }}><TabMetrics oppId={selectedOpp.id} /></div>
          </StageSection>
        </div>
      );
    }

    if (viewStage === "evaluate") {
      return <StageSection title={t("discovery.evaluate_title")} subtitle={t("discovery.evaluate_subtitle")}><TabBusinessCase oppId={selectedOpp.id} oppTitle={selectedOpp.title} decisionsCount={decisionCount} onSaved={setSavedBusinessCase} /></StageSection>;
    }

    if (viewStage === "decide") {
      return <StageSection title={t("discovery.decide_title")} subtitle={t("discovery.decide_stage_subtitle")}><TabDecide oppId={selectedOpp.id} businessCase={savedBusinessCase} onDecisionSaved={async()=>{ await reloadAssessData(); await loadStageCounts(selectedOpp.id); }} /></StageSection>;
    }

    return <StageSection title={t("discovery.promotion_gate_label")} subtitle={t("discovery.promotion_gate_stage_subtitle")}><TabPromotionGate oppId={selectedOpp.id} productId={productId} businessCase={savedBusinessCase} onLinkedToRoadmap={async(result)=>{ const updated={...selectedOpp,status:result.opportunity_status,journey_stage:result.journey_stage,lifecycle_status:result.lifecycle_status}; setSelectedOpp(updated); setOpps(prev=>prev.map(o=>o.id===updated.id?updated:o)); await loadStageCounts(selectedOpp.id); }} /></StageSection>;
  };

  if (routeOppId && selectedOpp) {
    return (
      <ModuleLayout moduleIcon="◎" moduleName="OPPORTUNITIES" moduleAccent="OPPORTUNITIES" selectedProductId={productId} onProductChange={handleProductChange}>
        <div className="mod-header">
          <div className="mod-header__left">
            <span className="mod-header__eyebrow">{t("discovery.eyebrow")}</span>
            <h1 className="mod-header__title">{t("discovery.opportunity_journey_title")}</h1>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginTop:6 }}>
              <p className="mod-header__meta" style={{ margin:0 }}>{selectedOpp.title}</p>
              <span style={{ fontSize:9, letterSpacing:1, padding:"2px 7px", borderRadius:2, border:`1px solid ${statusColor(selectedOpp.status)}44`, color:statusColor(selectedOpp.status), background:`${statusColor(selectedOpp.status)}0d` }}>
                {selectedOpp.status.replace(/_/g," ").toUpperCase()}
              </span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-cancel" title="Voltar para Opportunities" onClick={()=>navigate("/modules/discovery")}>← OPPORTUNITIES</button>
            <button className="btn-add" onClick={()=>setDetailModal({opp:selectedOpp,mode:"edit"})}>{t("discovery.btn_edit")}</button>
          </div>
        </div>

        <div style={{ marginBottom:12, padding:"12px 14px", border:`1px solid ${bdr}`, background:"rgba(0,212,255,0.03)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#7899b0", letterSpacing:2 }}>{t("discovery.opportunity_journey_title")}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <Badge v={currentStage} />
              <span style={{ fontSize:10, color:"#7899b0" }}>{t("discovery.current_stage_label")}: {formatStageLabel(t, currentStage)}</span>
              <span style={{ fontSize:10, color:"#7899b0" }}>{t("discovery.viewing_stage_label")}: {formatStageLabel(t, viewStage)}</span>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            {JOURNEY_STAGES.map((stage, idx) => {
              const currentIdx = stageIndex(currentStage);
              const thisIdx = stageIndex(stage);
              const done = thisIdx < currentIdx;
              const active = currentStage === stage;
              const viewing = viewStage === stage;
              const color = active ? "#00d4ff" : done ? "#00ff88" : "#334455";
              return (
                <div key={stage} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <button
                    className="btn-icon"
                    style={{ fontSize:9, letterSpacing:1, padding:"4px 8px", borderRadius:2, border:`1px solid ${viewing ? "#ffffff44" : `${color}55`}`, color:viewing ? "#ffffff" : color, background:viewing ? "rgba(255,255,255,0.08)" : `${color}12` }}
                    onClick={()=>setViewStage(stage)}
                  >
                    {formatStageLabel(t, stage)}
                  </button>
                  {idx < JOURNEY_STAGES.length - 1 && <span style={{ color:"#556677", fontSize:10 }}>→</span>}
                </div>
              );
            })}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:"#556677", fontSize:10 }}>↓</span>
            <button className="btn-icon" style={{ fontSize:9, letterSpacing:1, padding:"4px 8px", borderRadius:2, border:`1px solid ${viewStage==="promotion_gate" ? "#ffffff44" : "rgba(192,132,252,0.55)"}`, color:viewStage==="promotion_gate" ? "#ffffff" : "#c084fc", background:viewStage==="promotion_gate" ? "rgba(255,255,255,0.08)" : "rgba(192,132,252,0.12)" }} onClick={()=>setViewStage("promotion_gate")}>{t("discovery.promotion_gate_label")}</button>
            <span style={{ color:"#556677", fontSize:10 }}>→</span>
            <span style={{ fontSize:9, letterSpacing:1, padding:"4px 8px", borderRadius:2, border:"1px solid rgba(245,158,11,0.55)", color:"#f59e0b", background:"rgba(245,158,11,0.12)" }}>{t("discovery.define_macroarea_label")}</span>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:10, marginBottom:16 }}>
          <SummaryCard label={t("discovery.current_stage_label")} value={formatStageLabel(t, currentStage)} />
          <SummaryCard label={t("discovery.viewing_stage_label")} value={formatStageLabel(t, viewStage)} />
          <SummaryCard label={t("discovery.readiness_label")} value={readiness.replace(/_/g," ").toUpperCase()} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(6, minmax(0,1fr))", gap:8, marginBottom:16 }}>
          {VIEW_STAGES.map(stage=>(
            <button key={stage} className="btn-icon" onClick={()=>setViewStage(stage)} style={{ fontSize:9, padding:"8px 6px", display:"flex", alignItems:"center", justifyContent:"center", gap:6, background:viewStage===stage?"rgba(0,212,255,0.12)":"transparent", border:`1px solid ${viewStage===stage?"rgba(0,212,255,0.5)":"rgba(0,212,255,0.2)"}` }}>
              <span>{formatStageLabel(t, stage)}</span>
              <span style={{ width:6, height:6, borderRadius:"50%", background:getTabIndicatorColor(tabHasContent[stage]), boxShadow:tabHasContent[stage]==="complete"?"0 0 4px #00ff88":tabHasContent[stage]==="partial"?"0 0 4px #ff9900":"none" }} />
            </button>
          ))}
        </div>

        {hintOpen&&(
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:16, padding:"10px 14px", borderRadius:3, background:"rgba(0,212,255,0.04)", border:"1px solid rgba(0,212,255,0.15)", borderLeft:"3px solid rgba(0,212,255,0.4)" }}>
            <span style={{ fontSize:14, color:"rgba(0,212,255,0.6)", flexShrink:0 }}>ℹ</span>
            <span style={{ flex:1, fontSize:11, color:"#7899b0", lineHeight:1.6 }}>{t(`discovery.tab_hint_${viewStage}`,{defaultValue:""})}</span>
            <button onClick={handleHintDismiss} style={{ background:"rgba(0,212,255,0.08)", border:"1px solid rgba(0,212,255,0.3)", borderRadius:2, color:"rgba(0,212,255,0.7)", fontFamily:"var(--font-mono,monospace)", fontSize:8, letterSpacing:2, padding:"3px 8px", cursor:"pointer", flexShrink:0 }}>{t("discovery.tab_hint_dismiss")}</button>
          </div>
        )}
        <div style={{ minHeight:300 }}>
          {renderStageContent()}
        </div>

        <div style={{ marginTop:12, padding:"10px 12px", border:`1px solid ${bdr}`, background:"rgba(0,212,255,0.03)", color:"#7899b0", fontSize:11 }}>
          {t("discovery.value_canvas_process_mapping_independent_hint")}
        </div>

        {detailModal&&(
          <OppDetailModal
            opp={detailModal.opp}
            initialMode={detailModal.mode}
            onClose={()=>setDetailModal(null)}
            onSaved={(updated)=>{ setSelectedOpp(updated); setOpps(p=>p.map(o=>o.id===updated.id?updated:o)); setDetailModal(null); }}
            bizAreas={bizAreas}
            oppStakeholders={oppStakeholders}
          />
        )}
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleIcon="◎" moduleName="OPPORTUNITIES" moduleAccent="OPPORTUNITIES" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("discovery.eyebrow")}</span>
          <h1 className="mod-header__title">{t("discovery.title")}</h1>
          {productId&&<p className="mod-header__meta">{opps.length} {t("discovery.sidebar_title").toLowerCase()}</p>}
        </div>
        {productId&&<button className="btn-add" onClick={openNewOpp}>{t("discovery.btn_new_opp")}</button>}
      </div>
      {error&&<div className="mod-error">⚠ {error}</div>}
      {!productId&&<div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.no_product")}</div></div>}

      {productId&&opps.length===0&&<div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.sidebar_empty")}</div><div className="mod-empty__sub">{t("discovery.sidebar_empty_sub")}</div></div>}
      {productId&&opps.length>0&&(
        <div>
          <div className="mod-table-wrap" style={{ marginBottom:10, overflowX:"auto", border:`1px solid ${bdr}`, borderRadius:3 }}>
            <table className="mod-table" style={{ tableLayout:"fixed", width:"100%" }}>
              <thead><tr>
                <th style={{ width:18 }}></th>
                <th style={{ width:"48%" }}>{t("discovery.field_title")}</th>
                <th style={{ width:"14%", textAlign:"center" }}>{t("discovery.capture_source_label")}</th>
                <th style={{ width:"12%", textAlign:"center" }}>{t("discovery.capture_journey_stage_label")}</th>
                <th style={{ width:"10%", textAlign:"center" }}>{t("discovery.capture_lifecycle_label")}</th>
                <th style={{ width:"4%", textAlign:"center" }}>P</th>
                <th style={{ width:"12%", textAlign:"center", fontSize:8, letterSpacing:1 }}>{t("discovery.capture_readiness_label")}</th>
              </tr></thead>
              <tbody>
                {pagedOpps.map(o=>{
                  const isActive=selectedOpp?.id===o.id; const sc=statusColor(o.status);
                  return <tr key={o.id} style={{ cursor:"pointer", background:isActive?`${sc}12`:"transparent", borderLeft:isActive?`3px solid ${sc}`:"3px solid transparent", transition:"background 0.15s" }} onClick={()=>{ setSelectedOpp(o); setViewStage(JOURNEY_STAGE_TO_VIEW[normalizeJourneyStage(o.journey_stage)]); navigate(`/modules/discovery/${o.id}`); }}>
                    <td style={{ padding:"0 6px" }}><div style={{ width:8, height:8, borderRadius:"50%", background:isActive?sc:"rgba(120,153,176,0.25)", boxShadow:isActive?`0 0 8px ${sc}88`:"none", transition:"all 0.2s" }} /></td>
                    <td style={{ overflow:"hidden" }}>
                      <strong style={{ display:"block", fontSize:12, color:isActive?"#e0eaff":"#c8dce8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.title}</strong>
                      {o.identified_at&&<div style={{ fontSize:9, color:"#556677", marginTop:1 }}>{o.identified_at}</div>}
                    </td>
                    <td style={{ color:"#7899b0", fontSize:10, textAlign:"center", wordBreak:"break-word" }}>{o.primary_source?.source_type?.replace(/_/g," ").toUpperCase() ?? (o.origin?t(`discovery.origin_${o.origin}`,{defaultValue:o.origin}):"—")}</td>
                    <td style={{ whiteSpace:"nowrap", textAlign:"center" }}><span style={{ fontSize:9, letterSpacing:1, padding:"2px 7px", borderRadius:2, border:`1px solid ${statusColor(normalizeJourneyStage(o.journey_stage))}44`, color:statusColor(normalizeJourneyStage(o.journey_stage)), background:`${statusColor(normalizeJourneyStage(o.journey_stage))}0d` }}>{formatStageLabel(t, normalizeJourneyStage(o.journey_stage))}</span></td>
                    <td style={{ whiteSpace:"nowrap", textAlign:"center" }}><span style={{ fontSize:9, letterSpacing:1, padding:"2px 7px", borderRadius:2, border:`1px solid ${statusColor(o.lifecycle_status || "active")}44`, color:statusColor(o.lifecycle_status || "active"), background:`${statusColor(o.lifecycle_status || "active")}0d` }}>{(o.lifecycle_status || "active").replace(/_/g," ").toUpperCase()}</span></td>
                    <td style={{ textAlign:"center", color:isActive?"#e0eaff":"#7899b0", fontSize:12, fontWeight:700 }}>{o.priority}</td>
                    <td style={{ textAlign:"center", fontSize:9, color:"#7899b0", wordBreak:"break-word" }}>{o.latest_assessment?.recommendation ? o.latest_assessment.recommendation.replace(/_/g," ").toUpperCase() : t("discovery.readiness_not_assessed")}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:16, fontSize:10, color:"#7899b0" }}>
            <span>
              {((oppPage - 1) * oppPageSize) + 1}-{Math.min(oppPage * oppPageSize, opps.length)} / {opps.length}
            </span>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button className="btn-icon" style={{ fontSize:9, padding:"4px 8px" }} disabled={oppPage===1} onClick={()=>setOppPage(p=>Math.max(1,p-1))}>
                {t("backlog.btn_prev")}
              </button>
              <span style={{ minWidth:70, textAlign:"center" }}>{oppPage} {t("backlog.pagination_of")} {totalOppPages}</span>
              <button className="btn-icon" style={{ fontSize:9, padding:"4px 8px" }} disabled={oppPage===totalOppPages} onClick={()=>setOppPage(p=>Math.min(totalOppPages,p+1))}>
                {t("backlog.btn_next")}
              </button>
            </div>
          </div>

        </div>
      )}


      {oppModal==="new"&&(
        <div className="mod-overlay" onClick={()=>setOppModal(null)}>
          <div className="mod-modal" style={{ maxWidth:780 }} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header"><div><span className="mod-modal__eyebrow">// OPPORTUNITIES //</span><h3 className="mod-modal__title">{t("discovery.modal_new_opp")} <span>{t("discovery.modal_opp_subtitle")}</span></h3></div><button className="mod-modal__close" onClick={()=>setOppModal(null)}>✕</button></div>
            <div className="mod-modal__body" style={{ overflowY:"auto", maxHeight:"70vh" }}>
              <Fld lbl={t("discovery.field_title")}><input className="mod-input" value={oppForm.title} onChange={e=>setOppForm(p=>({...p,title:e.target.value}))} placeholder={t("discovery.placeholder_title")} /></Fld>
              <Fld lbl={t("discovery.field_description")}><textarea className="mod-textarea" style={{ minHeight:64 }} value={oppForm.description} onChange={e=>setOppForm(p=>({...p,description:e.target.value}))} placeholder={t("discovery.placeholder_description")} /></Fld>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                <Fld lbl={t("discovery.field_origin")}><select className="mod-select" value={oppForm.origin} onChange={e=>setOppForm(p=>({...p,origin:e.target.value}))}><option value="">— {t("discovery.placeholder_origin")} —</option>{ORIGIN_KEYS.map(k=><option key={k} value={k}>{t(`discovery.origin_${k}`)}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_impacted_area")}><select className="mod-select" value={oppForm.impacted_area_id} onChange={e=>setOppForm(p=>({...p,impacted_area_id:e.target.value}))}><option value="">—</option>{bizAreas.map(a=><option key={a.id} value={a.id}>{a.area_name}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_responsible")}><select className="mod-select" value={oppForm.responsible_stakeholder_id} onChange={e=>setOppForm(p=>({...p,responsible_stakeholder_id:e.target.value}))}><option value="">—</option>{oppStakeholders.map(s=><option key={s.stakeholder_id} value={s.stakeholder_id}>{s.full_name}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_identified_at")}><input className="mod-input" type="date" value={oppForm.identified_at} onChange={e=>setOppForm(p=>({...p,identified_at:e.target.value}))} /></Fld>
                <Fld lbl={t("discovery.field_status")}><select className="mod-select" value={oppForm.status} onChange={e=>setOppForm(p=>({...p,status:e.target.value}))}>{["identified","under_investigation","validated","paused","discarded","forwarded_to_roadmap"].map(v=><option key={v} value={v}>{t(`discovery.opp_status_${v}`)}</option>)}</select></Fld>
                <Fld lbl={t("discovery.field_priority")}><div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${oppForm.priority===n?"influence-btn--active":""}`} onClick={()=>setOppForm(p=>({...p,priority:n}))}>{n}</button>)}</div></Fld>
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setOppModal(null)}>{t("discovery.btn_cancel")}</button>
              <button className="btn-save" onClick={saveNewOpp} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.btn_save")}</button>
            </div>
          </div>
        </div>
      )}

      {detailModal&&(
        <OppDetailModal
          opp={detailModal.opp}
          initialMode={detailModal.mode}
          onClose={()=>setDetailModal(null)}
          onSaved={(updated)=>{ setSelectedOpp(updated); setOpps(p=>p.map(o=>o.id===updated.id?updated:o)); setDetailModal(null); }}
          bizAreas={bizAreas}
          oppStakeholders={oppStakeholders}
        />
      )}
    </ModuleLayout>
  );
}
