import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "../../../shared/services/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Opp { id:string; product_id:number; title:string; description?:string; origin?:string; impacted_area?:string; responsible?:string; identified_at?:string; status:string; priority:number; created_at:string; updated_at:string; }
interface Persona { id:string; product_id:number; opportunity_id?:string; name:string; role?:string; objectives?:string; responsibilities?:string; usage_context?:string; main_needs?:string; constraints?:string; }
interface JTBD { id:string; product_id:number; opportunity_id?:string; description:string; job_type:string; priority:number; frequency?:string; context?:string; expected_result?:string; }
interface Research { id:string; opportunity_id:string; research_type:string; participants?:string; research_date?:string; questions?:string; findings?:string; evidence?:string; source?:string; reliability:string; }
interface Insight { id:string; opportunity_id:string; insight:string; affected_audience?:string; impact:string; observed_frequency?:string; confidence:string; product_implication?:string; }
interface Assumption { id:string; opportunity_id:string; hypothesis:string; assumption_type:string; impact:string; uncertainty_level:string; existing_evidence?:string; validation_method?:string; status:string; }
interface SolutionIdea { id:string; opportunity_id:string; idea:string; description?:string; related_problem?:string; expected_benefit?:string; estimated_complexity:string; risks?:string; dependencies?:string; status:string; }
interface Experiment { id:string; opportunity_id:string; method:string; assumption_id?:string; participants?:string; success_criteria?:string; result?:string; evidence?:string; conclusion?:string; next_action?:string; status:string; }
interface Metric { id:string; opportunity_id:string; metric:string; metric_type:string; baseline?:string; target?:string; data_source?:string; measurement_frequency?:string; responsible?:string; }
interface VPCCanvas { id:string; product_id:string; name:string; description?:string; discovery_opportunity_id?:string; }

// ── Colors ─────────────────────────────────────────────────────────────────────
const SC: Record<string,string> = {
  identified:"#7899b0", under_investigation:"#00d4ff", validated:"#00ff88",
  paused:"#ff9900", discarded:"#ff4466", forwarded_to_roadmap:"#c084fc",
  unvalidated:"#7899b0", in_progress:"#00d4ff", invalidated:"#ff4466",
  planned:"#7899b0", completed:"#00ff88", cancelled:"#ff4466",
  idea:"#7899b0", under_evaluation:"#00d4ff", selected:"#00ff88",
};

// ── Micro-components ───────────────────────────────────────────────────────────
function Badge({ v }: { v: string }) {
  const c = SC[v] ?? "#7899b0";
  return <span style={{ fontSize:9, letterSpacing:1, padding:"2px 7px", borderRadius:2, border:`1px solid ${c}55`, color:c, background:`${c}12` }}>{v.toUpperCase().replace(/_/g," ")}</span>;
}

function Fld({ lbl, children }: { lbl: string; children: React.ReactNode }) {
  return <div className="mod-field"><label className="mod-field__label">{lbl}</label>{children}</div>;
}

function EmptyItem({ text }: { text: string }) {
  return <div style={{ fontSize:11, color:"#7899b0", textAlign:"center", padding:"20px 0" }}>{text}</div>;
}

function ItemCard({ title, sub, badge, onEdit, onDel }: { title:string; sub?:string; badge?:string; onEdit:()=>void; onDel:()=>void; }) {
  const { t } = useTranslation();
  return (
    <div className="vpc-card" style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#c8dce8" }}>{title}</div>
          {sub && <div style={{ fontSize:10, color:"#7899b0", marginTop:2 }}>{sub}</div>}
          {badge && <div style={{ marginTop:4 }}><Badge v={badge} /></div>}
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <button className="btn-icon" style={{ fontSize:9, padding:"1px 6px" }} onClick={onEdit}>{t("discovery.btn_edit")}</button>
          <button className="btn-icon btn-icon--danger" style={{ fontSize:9, padding:"1px 6px" }} onClick={onDel}>{t("discovery.btn_del")}</button>
        </div>
      </div>
    </div>
  );
}

function SecHdr({ eyebrow, onAdd, addLbl }: { eyebrow:string; onAdd?:()=>void; addLbl?:string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <span className="mod-header__eyebrow" style={{ fontSize:10 }}>{eyebrow}</span>
      {onAdd && <button className="btn-add" style={{ fontSize:10 }} onClick={onAdd}>{addLbl}</button>}
    </div>
  );
}

function ModalShell({ title, sub, onClose, onSave, saving, children }: { title:string; sub:string; onClose:()=>void; onSave:()=>void; saving:boolean; children:React.ReactNode; }) {
  const { t } = useTranslation();
  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-modal" style={{ maxWidth:620 }} onClick={e=>e.stopPropagation()}>
        <div className="mod-modal__header">
          <div><span className="mod-modal__eyebrow">// DISCOVERY //</span><h3 className="mod-modal__title">{title} <span>{sub}</span></h3></div>
          <button className="mod-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="mod-modal__body">{children}</div>
        <div className="mod-modal__footer">
          <button className="btn-cancel" onClick={onClose}>{t("discovery.btn_cancel")}</button>
          <button className="btn-save" onClick={onSave} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.btn_save")}</button>
        </div>
      </div>
    </div>
  );
}

// ── Generic list hook ──────────────────────────────────────────────────────────
function useList<T extends { id: string }>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const load = useCallback(async () => { try { setItems(await apiGet<T[]>(url)); } catch { /**/ } }, [url]);
  useEffect(() => { load(); }, [load]);
  const remove = async (id: string, delUrl: string) => {
    if (!confirm("Excluir este registro?")) return;
    try { await apiDelete(delUrl); setItems(p => p.filter(i => i.id !== id)); } catch { /**/ }
  };
  return { items, reload: load, remove };
}

// ─── TAB: OVERVIEW ────────────────────────────────────────────────────────────
function TabOverview({ opp, onEdit }: { opp: Opp; onEdit: () => void }) {
  const { t } = useTranslation();
  const rows = [
    [t("discovery.field_origin"), opp.origin],
    [t("discovery.field_impacted_area"), opp.impacted_area],
    [t("discovery.field_responsible"), opp.responsible],
    [t("discovery.field_identified_at"), opp.identified_at],
    [t("discovery.field_priority"), String(opp.priority)],
  ].filter(r => r[1]) as [string, string][];
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:"#00d4ff", margin:0 }}>{opp.title}</h2>
          {opp.description && <p style={{ fontSize:12, color:"#7899b0", marginTop:6, lineHeight:1.5 }}>{opp.description}</p>}
        </div>
        <div style={{ display:"flex", gap:8, marginLeft:16 }}>
          <Badge v={opp.status} />
          <button className="btn-icon" style={{ fontSize:10 }} onClick={onEdit}>{t("discovery.btn_edit")}</button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 32px" }}>
        {rows.map(([lbl, val]) => (
          <div key={lbl} style={{ borderBottom:"1px solid #0d2535", paddingBottom:8 }}>
            <div style={{ fontSize:9, color:"#7899b0", letterSpacing:1, marginBottom:3 }}>{lbl}</div>
            <div style={{ fontSize:12, color:"#c8dce8" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: PROBLEM STATEMENT ───────────────────────────────────────────────────
function TabProblem({ oppId }: { oppId: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ observed_problem:"", who_is_affected:"", current_impact:"", available_evidence:"", consequence_of_inaction:"" });
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    apiGet<Record<string,string>|null>(`/discovery/opportunities/${oppId}/problem-statement`)
      .then(r => { if (r) setForm({ observed_problem:r.observed_problem??"", who_is_affected:r.who_is_affected??"", current_impact:r.current_impact??"", available_evidence:r.available_evidence??"", consequence_of_inaction:r.consequence_of_inaction??"" }); })
      .catch(()=>{});
  }, [oppId]);
  const save = async () => { setSaving(true); try { await apiPut(`/discovery/opportunities/${oppId}/problem-statement`, form); setOk(true); setTimeout(()=>setOk(false),2000); } catch{/***/} finally{setSaving(false);} };
  const FIELDS:[keyof typeof form, string, string][] = [
    ["observed_problem", t("discovery.problem_observed"), t("discovery.problem_placeholder_observed")],
    ["who_is_affected", t("discovery.problem_who"), t("discovery.problem_placeholder_who")],
    ["current_impact", t("discovery.problem_impact"), t("discovery.problem_placeholder_impact")],
    ["available_evidence", t("discovery.problem_evidence"), t("discovery.problem_placeholder_evidence")],
    ["consequence_of_inaction", t("discovery.problem_consequence"), t("discovery.problem_placeholder_consequence")],
  ];
  return (
    <div>
      <SecHdr eyebrow={t("discovery.problem_eyebrow")} />
      {FIELDS.map(([k,lbl,ph]) => <Fld key={k} lbl={lbl}><textarea className="mod-textarea" style={{ minHeight:80 }} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} /></Fld>)}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center", marginTop:8 }}>
        {ok && <span style={{ fontSize:10, color:"#00ff88" }}>✓</span>}
        <button className="btn-save" onClick={save} disabled={saving}>{saving?t("discovery.btn_saving"):t("discovery.problem_btn_save")}</button>
      </div>
    </div>
  );
}

// ─── TAB: PERSONAS ────────────────────────────────────────────────────────────
function TabPersonas({ oppId, productId }: { oppId:string; productId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<Persona>(`/discovery/opportunities/${oppId}/personas`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<Persona|null>(null);
  const [f, setF] = useState({ name:"", role:"", objectives:"", responsibilities:"", usage_context:"", main_needs:"", constraints:"" });
  const [saving, setSaving] = useState(false);
  const openNew = () => { setF({ name:"", role:"", objectives:"", responsibilities:"", usage_context:"", main_needs:"", constraints:"" }); setEdit(null); setModal("new"); };
  const openEdit = (p:Persona) => { setF({ name:p.name, role:p.role??"", objectives:p.objectives??"", responsibilities:p.responsibilities??"", usage_context:p.usage_context??"", main_needs:p.main_needs??"", constraints:p.constraints??"" }); setEdit(p); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/personas`, {...f, product_id:Number(productId)});
      else if (edit) await apiPatch(`/discovery/personas/${edit.id}`, f);
      setModal(null); reload();
    } catch{/**/} finally{setSaving(false);}
  };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.personas_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_persona")} />
      {items.length===0 ? <EmptyItem text={t("discovery.personas_empty")} /> : items.map(p => (
        <ItemCard key={p.id} title={p.name} sub={p.role} badge={undefined} onEdit={()=>openEdit(p)} onDel={()=>remove(p.id,`/discovery/personas/${p.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_persona"):t("discovery.modal_edit_persona")} sub={t("discovery.modal_persona_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.persona_field_name")}><input className="mod-input" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder={t("discovery.persona_placeholder_name")} /></Fld>
          <Fld lbl={t("discovery.persona_field_role")}><input className="mod-input" value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.persona_field_objectives")}><textarea className="mod-textarea" value={f.objectives} onChange={e=>setF(p=>({...p,objectives:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.persona_field_responsibilities")}><textarea className="mod-textarea" value={f.responsibilities} onChange={e=>setF(p=>({...p,responsibilities:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.persona_field_context")}><textarea className="mod-textarea" value={f.usage_context} onChange={e=>setF(p=>({...p,usage_context:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.persona_field_needs")}><textarea className="mod-textarea" value={f.main_needs} onChange={e=>setF(p=>({...p,main_needs:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.persona_field_constraints")}><textarea className="mod-textarea" value={f.constraints} onChange={e=>setF(p=>({...p,constraints:e.target.value}))} /></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: JTBD ────────────────────────────────────────────────────────────────
function TabJTBD({ oppId, productId }: { oppId:string; productId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<JTBD>(`/discovery/opportunities/${oppId}/jtbd`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<JTBD|null>(null);
  const [f, setF] = useState({ description:"", job_type:"principal", priority:3, frequency:"", context:"", expected_result:"" });
  const [saving, setSaving] = useState(false);
  const openNew = () => { setF({ description:"", job_type:"principal", priority:3, frequency:"", context:"", expected_result:"" }); setEdit(null); setModal("new"); };
  const openEdit = (j:JTBD) => { setF({ description:j.description, job_type:j.job_type, priority:j.priority, frequency:j.frequency??"", context:j.context??"", expected_result:j.expected_result??"" }); setEdit(j); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/jtbd`, {...f, product_id:Number(productId)});
      else if (edit) await apiPatch(`/discovery/jtbd/${edit.id}`, f);
      setModal(null); reload();
    } catch{/**/} finally{setSaving(false);}
  };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.jtbd_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_jtbd")} />
      {items.length===0 ? <EmptyItem text={t("discovery.jtbd_empty")} /> : items.map(j => (
        <ItemCard key={j.id} title={j.description.substring(0,80)} sub={`${j.job_type} · P${j.priority}`} badge={j.job_type} onEdit={()=>openEdit(j)} onDel={()=>remove(j.id,`/discovery/jtbd/${j.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_jtbd"):t("discovery.modal_edit_jtbd")} sub={t("discovery.modal_jtbd_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.jtbd_field_description")}><textarea className="mod-textarea" style={{ minHeight:100 }} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} placeholder={t("discovery.jtbd_placeholder_description")} /></Fld>
          <Fld lbl={t("discovery.jtbd_field_type")}>
            <select className="mod-select" value={f.job_type} onChange={e=>setF(p=>({...p,job_type:e.target.value}))}>
              <option value="principal">{t("discovery.jtbd_type_principal")}</option>
              <option value="secondary">{t("discovery.jtbd_type_secondary")}</option>
            </select>
          </Fld>
          <Fld lbl={t("discovery.jtbd_field_priority")}>
            <div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${f.priority===n?"influence-btn--active":""}`} onClick={()=>setF(p=>({...p,priority:n}))}>{n}</button>)}</div>
          </Fld>
          <Fld lbl={t("discovery.jtbd_field_frequency")}><input className="mod-input" value={f.frequency} onChange={e=>setF(p=>({...p,frequency:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.jtbd_field_context")}><textarea className="mod-textarea" value={f.context} onChange={e=>setF(p=>({...p,context:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.jtbd_field_result")}><textarea className="mod-textarea" value={f.expected_result} onChange={e=>setF(p=>({...p,expected_result:e.target.value}))} /></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: RESEARCH ────────────────────────────────────────────────────────────
function TabResearch({ oppId }: { oppId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<Research>(`/discovery/opportunities/${oppId}/research`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<Research|null>(null);
  const [f, setF] = useState({ research_type:"interview", participants:"", research_date:"", questions:"", findings:"", evidence:"", source:"", reliability:"medium" });
  const [saving, setSaving] = useState(false);
  const TYPES = ["interview","meeting","observation","survey","quantitative","feedback","document","evidence"];
  const openNew = () => { setF({ research_type:"interview", participants:"", research_date:"", questions:"", findings:"", evidence:"", source:"", reliability:"medium" }); setEdit(null); setModal("new"); };
  const openEdit = (r:Research) => { setF({ research_type:r.research_type, participants:r.participants??"", research_date:r.research_date??"", questions:r.questions??"", findings:r.findings??"", evidence:r.evidence??"", source:r.source??"", reliability:r.reliability }); setEdit(r); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/research`, f);
      else if (edit) await apiPatch(`/discovery/research/${edit.id}`, f);
      setModal(null); reload();
    } catch{/**/} finally{setSaving(false);}
  };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.research_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_research")} />
      {items.length===0 ? <EmptyItem text={t("discovery.research_empty")} /> : items.map(r => (
        <ItemCard key={r.id} title={t(`discovery.research_type_${r.research_type}`)} sub={r.participants?.substring(0,60)} badge={r.reliability} onEdit={()=>openEdit(r)} onDel={()=>remove(r.id,`/discovery/research/${r.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_research"):t("discovery.modal_edit_research")} sub={t("discovery.modal_research_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.research_field_type")}><select className="mod-select" value={f.research_type} onChange={e=>setF(p=>({...p,research_type:e.target.value}))}>{TYPES.map(v=><option key={v} value={v}>{t(`discovery.research_type_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.research_field_participants")}><input className="mod-input" value={f.participants} onChange={e=>setF(p=>({...p,participants:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.research_field_date")}><input className="mod-input" type="date" value={f.research_date} onChange={e=>setF(p=>({...p,research_date:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.research_field_questions")}><textarea className="mod-textarea" value={f.questions} onChange={e=>setF(p=>({...p,questions:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.research_field_findings")}><textarea className="mod-textarea" value={f.findings} onChange={e=>setF(p=>({...p,findings:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.research_field_evidence")}><textarea className="mod-textarea" value={f.evidence} onChange={e=>setF(p=>({...p,evidence:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.research_field_source")}><input className="mod-input" value={f.source} onChange={e=>setF(p=>({...p,source:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.research_field_reliability")}><select className="mod-select" value={f.reliability} onChange={e=>setF(p=>({...p,reliability:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.reliability_${v}`)}</option>)}</select></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: INSIGHTS ────────────────────────────────────────────────────────────
function TabInsights({ oppId }: { oppId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<Insight>(`/discovery/opportunities/${oppId}/insights`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<Insight|null>(null);
  const [f, setF] = useState({ insight:"", affected_audience:"", impact:"medium", observed_frequency:"", confidence:"medium", product_implication:"" });
  const [saving, setSaving] = useState(false);
  const openNew = () => { setF({ insight:"", affected_audience:"", impact:"medium", observed_frequency:"", confidence:"medium", product_implication:"" }); setEdit(null); setModal("new"); };
  const openEdit = (i:Insight) => { setF({ insight:i.insight, affected_audience:i.affected_audience??"", impact:i.impact, observed_frequency:i.observed_frequency??"", confidence:i.confidence, product_implication:i.product_implication??"" }); setEdit(i); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/insights`, f);
      else if (edit) await apiPatch(`/discovery/insights/${edit.id}`, f);
      setModal(null); reload();
    } catch{/**/} finally{setSaving(false);}
  };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.insights_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_insight")} />
      {items.length===0 ? <EmptyItem text={t("discovery.insights_empty")} /> : items.map(i => (
        <ItemCard key={i.id} title={i.insight.substring(0,80)} sub={i.affected_audience} badge={i.impact} onEdit={()=>openEdit(i)} onDel={()=>remove(i.id,`/discovery/insights/${i.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_insight"):t("discovery.modal_edit_insight")} sub={t("discovery.modal_insight_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.insight_field_insight")}><textarea className="mod-textarea" style={{ minHeight:100 }} value={f.insight} onChange={e=>setF(p=>({...p,insight:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.insight_field_audience")}><input className="mod-input" value={f.affected_audience} onChange={e=>setF(p=>({...p,affected_audience:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.insight_field_impact")}><select className="mod-select" value={f.impact} onChange={e=>setF(p=>({...p,impact:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.impact_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.insight_field_frequency")}><input className="mod-input" value={f.observed_frequency} onChange={e=>setF(p=>({...p,observed_frequency:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.insight_field_confidence")}><select className="mod-select" value={f.confidence} onChange={e=>setF(p=>({...p,confidence:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.confidence_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.insight_field_implication")}><textarea className="mod-textarea" value={f.product_implication} onChange={e=>setF(p=>({...p,product_implication:e.target.value}))} /></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: ASSUMPTIONS ─────────────────────────────────────────────────────────
function TabAssumptions({ oppId }: { oppId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<Assumption>(`/discovery/opportunities/${oppId}/assumptions`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<Assumption|null>(null);
  const [f, setF] = useState({ hypothesis:"", assumption_type:"desirability", impact:"medium", uncertainty_level:"high", existing_evidence:"", validation_method:"", status:"unvalidated" });
  const [saving, setSaving] = useState(false);
  const ATYPES = ["desirability","viability","usability","value","data","technology","process"];
  const openNew = () => { setF({ hypothesis:"", assumption_type:"desirability", impact:"medium", uncertainty_level:"high", existing_evidence:"", validation_method:"", status:"unvalidated" }); setEdit(null); setModal("new"); };
  const openEdit = (a:Assumption) => { setF({ hypothesis:a.hypothesis, assumption_type:a.assumption_type, impact:a.impact, uncertainty_level:a.uncertainty_level, existing_evidence:a.existing_evidence??"", validation_method:a.validation_method??"", status:a.status }); setEdit(a); setModal("edit"); };
  const save = async () => { setSaving(true); try { if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/assumptions`, f); else if (edit) await apiPatch(`/discovery/assumptions/${edit.id}`, f); setModal(null); reload(); } catch{/**/} finally{setSaving(false);} };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.assumptions_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_assumption")} />
      {items.length===0 ? <EmptyItem text={t("discovery.assumptions_empty")} /> : items.map(a => (
        <ItemCard key={a.id} title={a.hypothesis.substring(0,80)} sub={t(`discovery.assumption_type_${a.assumption_type}`)} badge={a.status} onEdit={()=>openEdit(a)} onDel={()=>remove(a.id,`/discovery/assumptions/${a.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_assumption"):t("discovery.modal_edit_assumption")} sub={t("discovery.modal_assumption_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.assumption_field_hypothesis")}><textarea className="mod-textarea" style={{ minHeight:100 }} value={f.hypothesis} onChange={e=>setF(p=>({...p,hypothesis:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.assumption_field_type")}><select className="mod-select" value={f.assumption_type} onChange={e=>setF(p=>({...p,assumption_type:e.target.value}))}>{ATYPES.map(v=><option key={v} value={v}>{t(`discovery.assumption_type_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.assumption_field_impact")}><select className="mod-select" value={f.impact} onChange={e=>setF(p=>({...p,impact:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.impact_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.assumption_field_uncertainty")}><select className="mod-select" value={f.uncertainty_level} onChange={e=>setF(p=>({...p,uncertainty_level:e.target.value}))}>{["high","medium","low"].map(v=><option key={v} value={v}>{t(`discovery.uncertainty_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.assumption_field_evidence")}><textarea className="mod-textarea" value={f.existing_evidence} onChange={e=>setF(p=>({...p,existing_evidence:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.assumption_field_validation")}><textarea className="mod-textarea" value={f.validation_method} onChange={e=>setF(p=>({...p,validation_method:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.assumption_field_status")}><select className="mod-select" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{["unvalidated","in_progress","validated","invalidated"].map(v=><option key={v} value={v}>{t(`discovery.assumption_status_${v}`)}</option>)}</select></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: SOLUTIONS ───────────────────────────────────────────────────────────
function TabSolutions({ oppId }: { oppId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<SolutionIdea>(`/discovery/opportunities/${oppId}/solution-ideas`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<SolutionIdea|null>(null);
  const [f, setF] = useState({ idea:"", description:"", related_problem:"", expected_benefit:"", estimated_complexity:"medium", risks:"", dependencies:"", status:"idea" });
  const [saving, setSaving] = useState(false);
  const openNew = () => { setF({ idea:"", description:"", related_problem:"", expected_benefit:"", estimated_complexity:"medium", risks:"", dependencies:"", status:"idea" }); setEdit(null); setModal("new"); };
  const openEdit = (s:SolutionIdea) => { setF({ idea:s.idea, description:s.description??"", related_problem:s.related_problem??"", expected_benefit:s.expected_benefit??"", estimated_complexity:s.estimated_complexity, risks:s.risks??"", dependencies:s.dependencies??"", status:s.status }); setEdit(s); setModal("edit"); };
  const save = async () => { setSaving(true); try { if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/solution-ideas`, f); else if (edit) await apiPatch(`/discovery/solution-ideas/${edit.id}`, f); setModal(null); reload(); } catch{/**/} finally{setSaving(false);} };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.solutions_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_solution")} />
      {items.length===0 ? <EmptyItem text={t("discovery.solutions_empty")} /> : items.map(s => (
        <ItemCard key={s.id} title={s.idea} sub={s.description?.substring(0,60)} badge={s.status} onEdit={()=>openEdit(s)} onDel={()=>remove(s.id,`/discovery/solution-ideas/${s.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_solution"):t("discovery.modal_edit_solution")} sub={t("discovery.modal_solution_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.solution_field_idea")}><input className="mod-input" value={f.idea} onChange={e=>setF(p=>({...p,idea:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.solution_field_description")}><textarea className="mod-textarea" value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.solution_field_problem")}><textarea className="mod-textarea" value={f.related_problem} onChange={e=>setF(p=>({...p,related_problem:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.solution_field_benefit")}><textarea className="mod-textarea" value={f.expected_benefit} onChange={e=>setF(p=>({...p,expected_benefit:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.solution_field_complexity")}><select className="mod-select" value={f.estimated_complexity} onChange={e=>setF(p=>({...p,estimated_complexity:e.target.value}))}>{["low","medium","high","very_high"].map(v=><option key={v} value={v}>{t(`discovery.complexity_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.solution_field_status")}><select className="mod-select" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{["idea","under_evaluation","selected","discarded"].map(v=><option key={v} value={v}>{t(`discovery.solution_status_${v}`)}</option>)}</select></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: EXPERIMENTS ─────────────────────────────────────────────────────────
function TabExperiments({ oppId }: { oppId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<Experiment>(`/discovery/opportunities/${oppId}/experiments`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<Experiment|null>(null);
  const [f, setF] = useState({ method:"prototype", participants:"", success_criteria:"", result:"", evidence:"", conclusion:"", next_action:"", status:"planned" });
  const [saving, setSaving] = useState(false);
  const METHODS = ["prototype","interview","usability_test","mvp","pilot","data_analysis","ab_test","technical_validation"];
  const openNew = () => { setF({ method:"prototype", participants:"", success_criteria:"", result:"", evidence:"", conclusion:"", next_action:"", status:"planned" }); setEdit(null); setModal("new"); };
  const openEdit = (e:Experiment) => { setF({ method:e.method, participants:e.participants??"", success_criteria:e.success_criteria??"", result:e.result??"", evidence:e.evidence??"", conclusion:e.conclusion??"", next_action:e.next_action??"", status:e.status }); setEdit(e); setModal("edit"); };
  const save = async () => { setSaving(true); try { if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/experiments`, f); else if (edit) await apiPatch(`/discovery/experiments/${edit.id}`, f); setModal(null); reload(); } catch{/**/} finally{setSaving(false);} };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.experiments_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_experiment")} />
      {items.length===0 ? <EmptyItem text={t("discovery.experiments_empty")} /> : items.map(e => (
        <ItemCard key={e.id} title={t(`discovery.experiment_method_${e.method}`)} sub={e.success_criteria?.substring(0,60)} badge={e.status} onEdit={()=>openEdit(e)} onDel={()=>remove(e.id,`/discovery/experiments/${e.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_experiment"):t("discovery.modal_edit_experiment")} sub={t("discovery.modal_experiment_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.experiment_field_method")}><select className="mod-select" value={f.method} onChange={e=>setF(p=>({...p,method:e.target.value}))}>{METHODS.map(v=><option key={v} value={v}>{t(`discovery.experiment_method_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.experiment_field_participants")}><input className="mod-input" value={f.participants} onChange={e=>setF(p=>({...p,participants:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.experiment_field_criteria")}><textarea className="mod-textarea" value={f.success_criteria} onChange={e=>setF(p=>({...p,success_criteria:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.experiment_field_result")}><textarea className="mod-textarea" value={f.result} onChange={e=>setF(p=>({...p,result:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.experiment_field_conclusion")}><textarea className="mod-textarea" value={f.conclusion} onChange={e=>setF(p=>({...p,conclusion:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.experiment_field_next")}><input className="mod-input" value={f.next_action} onChange={e=>setF(p=>({...p,next_action:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.experiment_field_status")}><select className="mod-select" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>{["planned","in_progress","completed","cancelled"].map(v=><option key={v} value={v}>{t(`discovery.experiment_status_${v}`)}</option>)}</select></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: METRICS ─────────────────────────────────────────────────────────────
function TabMetrics({ oppId }: { oppId:string }) {
  const { t } = useTranslation();
  const { items, reload, remove } = useList<Metric>(`/discovery/opportunities/${oppId}/success-metrics`);
  const [modal, setModal] = useState<"new"|"edit"|null>(null);
  const [edit, setEdit] = useState<Metric|null>(null);
  const [f, setF] = useState({ metric:"", metric_type:"adoption", baseline:"", target:"", data_source:"", measurement_frequency:"", responsible:"" });
  const [saving, setSaving] = useState(false);
  const MTYPES = ["adoption","efficiency","quality","satisfaction","business_result","data_reliability"];
  const openNew = () => { setF({ metric:"", metric_type:"adoption", baseline:"", target:"", data_source:"", measurement_frequency:"", responsible:"" }); setEdit(null); setModal("new"); };
  const openEdit = (m:Metric) => { setF({ metric:m.metric, metric_type:m.metric_type, baseline:m.baseline??"", target:m.target??"", data_source:m.data_source??"", measurement_frequency:m.measurement_frequency??"", responsible:m.responsible??"" }); setEdit(m); setModal("edit"); };
  const save = async () => { setSaving(true); try { if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/success-metrics`, f); else if (edit) await apiPatch(`/discovery/success-metrics/${edit.id}`, f); setModal(null); reload(); } catch{/**/} finally{setSaving(false);} };
  return (
    <div>
      <SecHdr eyebrow={t("discovery.metrics_eyebrow")} onAdd={openNew} addLbl={t("discovery.btn_new_metric")} />
      {items.length===0 ? <EmptyItem text={t("discovery.metrics_empty")} /> : items.map(m => (
        <ItemCard key={m.id} title={m.metric} sub={`${t(`discovery.metric_type_${m.metric_type}`)} | Baseline: ${m.baseline??"-"} → Meta: ${m.target??"-"}`} badge={m.metric_type} onEdit={()=>openEdit(m)} onDel={()=>remove(m.id,`/discovery/success-metrics/${m.id}`)} />
      ))}
      {modal && (
        <ModalShell title={modal==="new"?t("discovery.modal_new_metric"):t("discovery.modal_edit_metric")} sub={t("discovery.modal_metric_subtitle")} onClose={()=>setModal(null)} onSave={save} saving={saving}>
          <Fld lbl={t("discovery.metric_field_metric")}><input className="mod-input" value={f.metric} onChange={e=>setF(p=>({...p,metric:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.metric_field_type")}><select className="mod-select" value={f.metric_type} onChange={e=>setF(p=>({...p,metric_type:e.target.value}))}>{MTYPES.map(v=><option key={v} value={v}>{t(`discovery.metric_type_${v}`)}</option>)}</select></Fld>
          <Fld lbl={t("discovery.metric_field_baseline")}><input className="mod-input" value={f.baseline} onChange={e=>setF(p=>({...p,baseline:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.metric_field_target")}><input className="mod-input" value={f.target} onChange={e=>setF(p=>({...p,target:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.metric_field_source")}><input className="mod-input" value={f.data_source} onChange={e=>setF(p=>({...p,data_source:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.metric_field_frequency")}><input className="mod-input" value={f.measurement_frequency} onChange={e=>setF(p=>({...p,measurement_frequency:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.metric_field_responsible")}><input className="mod-input" value={f.responsible} onChange={e=>setF(p=>({...p,responsible:e.target.value}))} /></Fld>
        </ModalShell>
      )}
    </div>
  );
}

// ─── TAB: VPC ─────────────────────────────────────────────────────────────────
function TabVPC({ oppId, productId }: { oppId:string; productId:string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [linked, setLinked] = useState<VPCCanvas[]>([]);
  const [allCanvases, setAllCanvases] = useState<VPCCanvas[]>([]);
  const [linkModal, setLinkModal] = useState(false);
  const [selectedCanvas, setSelectedCanvas] = useState("");

  const loadLinked = useCallback(async () => {
    try { setLinked(await apiGet<VPCCanvas[]>(`/vpc/canvas?opportunity_id=${oppId}`)); } catch{/**/}
  }, [oppId]);

  const loadAll = useCallback(async () => {
    try { setAllCanvases(await apiGet<VPCCanvas[]>(`/vpc/canvas?product_id=${productId}`)); } catch{/**/}
  }, [productId]);

  useEffect(() => { loadLinked(); }, [loadLinked]);

  const handleLink = async () => {
    if (!selectedCanvas) return;
    try { await apiPatch(`/vpc/canvas/${selectedCanvas}`, { discovery_opportunity_id: oppId }); setLinkModal(false); loadLinked(); } catch{/**/}
  };

  const handleCreate = async () => {
    try {
      await apiPost(`/vpc/canvas`, { product_id: productId, name: `Canvas - ${oppId.substring(0,8)}`, discovery_opportunity_id: oppId });
      loadLinked();
    } catch{/**/}
  };

  const unlink = async (canvasId:string) => {
    try { await apiPatch(`/vpc/canvas/${canvasId}`, { discovery_opportunity_id: null }); loadLinked(); } catch{/**/}
  };

  return (
    <div>
      <SecHdr eyebrow={t("discovery.vpc_eyebrow")} />
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <button className="btn-icon" style={{ fontSize:10 }} onClick={()=>{ loadAll(); setLinkModal(true); }}>{t("discovery.vpc_btn_link")}</button>
        <button className="btn-icon" style={{ fontSize:10 }} onClick={handleCreate}>{t("discovery.vpc_btn_create")}</button>
        <button className="btn-icon" style={{ fontSize:10, color:"#00d4ff" }} onClick={()=>navigate("/modules/vpc")}>{t("discovery.vpc_btn_open")}</button>
      </div>
      {linked.length===0 ? <EmptyItem text={t("discovery.vpc_empty")} /> : linked.map(c => (
        <div key={c.id} className="vpc-card" style={{ marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#00d4ff" }}>{c.name}</div>
              {c.description && <div style={{ fontSize:10, color:"#7899b0" }}>{c.description}</div>}
            </div>
            <button className="btn-icon btn-icon--danger" style={{ fontSize:9 }} onClick={()=>unlink(c.id)}>DESVINCULAR</button>
          </div>
        </div>
      ))}
      {linkModal && (
        <div className="mod-overlay" onClick={()=>setLinkModal(false)}>
          <div className="mod-modal" style={{ maxWidth:480 }} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// VPC //</span><h3 className="mod-modal__title">{t("discovery.vpc_link_title")}</h3></div>
              <button className="mod-modal__close" onClick={()=>setLinkModal(false)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <Fld lbl={t("discovery.vpc_select_canvas")}>
                <select className="mod-select" value={selectedCanvas} onChange={e=>setSelectedCanvas(e.target.value)}>
                  <option value="">{t("discovery.vpc_no_canvas")}</option>
                  {allCanvases.filter(c=>!c.discovery_opportunity_id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Fld>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setLinkModal(false)}>{t("discovery.btn_cancel")}</button>
              <button className="btn-save" onClick={handleLink} disabled={!selectedCanvas}>{t("discovery.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ["tab_overview","tab_problem","tab_personas","tab_jtbd","tab_research","tab_insights","tab_assumptions","tab_vpc","tab_solutions","tab_experiments","tab_metrics"] as const;
type TabKey = typeof TABS[number];

export default function DiscoveryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dark = user?.user_theme !== "light";
  const navigate = useNavigate();

  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [opps, setOpps] = useState<Opp[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<Opp|null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("tab_overview");
  const [oppModal, setOppModal] = useState<"new"|"edit"|null>(null);
  const [oppForm, setOppForm] = useState({ title:"", description:"", origin:"", impacted_area:"", responsible:"", identified_at:"", status:"identified", priority:3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadOpps = useCallback(async (pid=productId) => {
    if (!pid) { setOpps([]); return; }
    try { setOpps(await apiGet<Opp[]>(`/discovery/opportunities?product_id=${pid}`)); }
    catch { setError(t("discovery.err_load")); }
  }, [productId, t]);

  useEffect(() => { loadOpps(); }, [loadOpps]);

  const handleProductChange = (id:string) => { localStorage.setItem("pl_product",id); setProductId(id); setSelectedOpp(null); };

  const openNewOpp = () => { setOppForm({ title:"", description:"", origin:"", impacted_area:"", responsible:"", identified_at:"", status:"identified", priority:3 }); setOppModal("new"); };
  const openEditOpp = (o:Opp) => { setOppForm({ title:o.title, description:o.description??"", origin:o.origin??"", impacted_area:o.impacted_area??"", responsible:o.responsible??"", identified_at:o.identified_at??"", status:o.status, priority:o.priority }); setOppModal("edit"); };

  const saveOpp = async () => {
    if (!oppForm.title.trim()) return;
    setSaving(true);
    try {
      if (oppModal==="new") {
        const created = await apiPost<Opp>("/discovery/opportunities", { ...oppForm, product_id:Number(productId) });
        await loadOpps(); setSelectedOpp(created);
      } else if (selectedOpp) {
        const updated = await apiPatch<Opp>(`/discovery/opportunities/${selectedOpp.id}`, oppForm);
        setSelectedOpp(updated); await loadOpps();
      }
      setOppModal(null);
    } catch { setError(t("discovery.err_save")); } finally { setSaving(false); }
  };

  const deleteOpp = async (id:string) => {
    if (!confirm(t("discovery.confirm_delete_opp"))) return;
    try { await apiDelete(`/discovery/opportunities/${id}`); setSelectedOpp(null); await loadOpps(); } catch{/**/}
  };

  const bdr = dark ? "#0d2535" : "#d0dde8";
  const sub = dark ? "#7899b0" : "#5a7080";

  return (
    <ModuleLayout moduleIcon="◎" moduleName="DISCOVERY MODULE" moduleAccent="MODULE" selectedProductId={productId} onProductChange={handleProductChange}>

      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("discovery.eyebrow")}</span>
          <h1 className="mod-header__title">{t("discovery.title")} <span>{t("discovery.title_accent")}</span></h1>
        </div>
        {productId && <button className="btn-add" onClick={openNewOpp}>{t("discovery.btn_new_opp")}</button>}
      </div>

      {error && <div className="mod-error">⚠ {error}</div>}

      {!productId && <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.no_product")}</div></div>}

      {productId && (
        <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16, alignItems:"start" }}>

          {/* Sidebar */}
          <div style={{ border:`1px solid ${bdr}`, borderRadius:4 }}>
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${bdr}`, fontSize:9, letterSpacing:2, color:sub }}>{t("discovery.sidebar_title")}</div>
            {opps.length===0 ? (
              <div style={{ padding:16, textAlign:"center" }}>
                <div style={{ fontSize:10, color:sub, marginBottom:6 }}>{t("discovery.sidebar_empty")}</div>
                <div style={{ fontSize:9, color:sub, opacity:0.7 }}>{t("discovery.sidebar_empty_sub")}</div>
              </div>
            ) : opps.map(o => (
              <div key={o.id} onClick={()=>{setSelectedOpp(o); setActiveTab("tab_overview");}}
                style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${bdr}`, background:selectedOpp?.id===o.id?(dark?"rgba(0,212,255,0.06)":"rgba(0,136,170,0.06)"):"transparent", borderLeft:selectedOpp?.id===o.id?"3px solid #00d4ff":"3px solid transparent" }}>
                <div style={{ fontSize:11, fontWeight:600, color:dark?"#c8dce8":"#1a2a3a", marginBottom:3 }}>{o.title}</div>
                <Badge v={o.status} />
              </div>
            ))}
          </div>

          {/* Detail */}
          {!selectedOpp ? (
            <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.select_opp")}</div><div className="mod-empty__sub">{t("discovery.select_opp_sub")}</div></div>
          ) : (
            <div>
              {/* Tab bar */}
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16, borderBottom:`1px solid ${bdr}`, paddingBottom:8 }}>
                {TABS.map(tab => (
                  <button key={tab} className={`btn-icon ${activeTab===tab?"influence-btn--active":""}`} style={{ fontSize:9, padding:"3px 10px" }} onClick={()=>setActiveTab(tab)}>{t(`discovery.${tab}`)}</button>
                ))}
                <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                  <button className="btn-icon" style={{ fontSize:9 }} onClick={()=>openEditOpp(selectedOpp)}>{t("discovery.btn_edit")}</button>
                  <button className="btn-icon btn-icon--danger" style={{ fontSize:9 }} onClick={()=>deleteOpp(selectedOpp.id)}>{t("discovery.btn_del")}</button>
                </div>
              </div>

              {/* Tab content */}
              <div style={{ minHeight:400 }}>
                {activeTab==="tab_overview"    && <TabOverview opp={selectedOpp} onEdit={()=>openEditOpp(selectedOpp)} />}
                {activeTab==="tab_problem"     && <TabProblem oppId={selectedOpp.id} />}
                {activeTab==="tab_personas"    && <TabPersonas oppId={selectedOpp.id} productId={productId} />}
                {activeTab==="tab_jtbd"        && <TabJTBD oppId={selectedOpp.id} productId={productId} />}
                {activeTab==="tab_research"    && <TabResearch oppId={selectedOpp.id} />}
                {activeTab==="tab_insights"    && <TabInsights oppId={selectedOpp.id} />}
                {activeTab==="tab_assumptions" && <TabAssumptions oppId={selectedOpp.id} />}
                {activeTab==="tab_vpc"         && <TabVPC oppId={selectedOpp.id} productId={productId} />}
                {activeTab==="tab_solutions"   && <TabSolutions oppId={selectedOpp.id} />}
                {activeTab==="tab_experiments" && <TabExperiments oppId={selectedOpp.id} />}
                {activeTab==="tab_metrics"     && <TabMetrics oppId={selectedOpp.id} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Opportunity Modal */}
      {oppModal && (
        <ModalShell title={oppModal==="new"?t("discovery.modal_new_opp"):t("discovery.modal_edit_opp")} sub={t("discovery.modal_opp_subtitle")} onClose={()=>setOppModal(null)} onSave={saveOpp} saving={saving}>
          <Fld lbl={t("discovery.field_title")}><input className="mod-input" value={oppForm.title} onChange={e=>setOppForm(p=>({...p,title:e.target.value}))} placeholder={t("discovery.placeholder_title")} /></Fld>
          <Fld lbl={t("discovery.field_description")}><textarea className="mod-textarea" value={oppForm.description} onChange={e=>setOppForm(p=>({...p,description:e.target.value}))} placeholder={t("discovery.placeholder_description")} /></Fld>
          <Fld lbl={t("discovery.field_origin")}><input className="mod-input" value={oppForm.origin} onChange={e=>setOppForm(p=>({...p,origin:e.target.value}))} placeholder={t("discovery.placeholder_origin")} /></Fld>
          <Fld lbl={t("discovery.field_impacted_area")}><input className="mod-input" value={oppForm.impacted_area} onChange={e=>setOppForm(p=>({...p,impacted_area:e.target.value}))} placeholder={t("discovery.placeholder_impacted_area")} /></Fld>
          <Fld lbl={t("discovery.field_responsible")}><input className="mod-input" value={oppForm.responsible} onChange={e=>setOppForm(p=>({...p,responsible:e.target.value}))} placeholder={t("discovery.placeholder_responsible")} /></Fld>
          <Fld lbl={t("discovery.field_identified_at")}><input className="mod-input" type="date" value={oppForm.identified_at} onChange={e=>setOppForm(p=>({...p,identified_at:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.field_status")}>
            <select className="mod-select" value={oppForm.status} onChange={e=>setOppForm(p=>({...p,status:e.target.value}))}>
              {["identified","under_investigation","validated","paused","discarded","forwarded_to_roadmap"].map(v=>(
                <option key={v} value={v}>{t(`discovery.opp_status_${v}`)}</option>
              ))}
            </select>
          </Fld>
          <Fld lbl={t("discovery.field_priority")}>
            <div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${oppForm.priority===n?"influence-btn--active":""}`} onClick={()=>setOppForm(p=>({...p,priority:n}))}>{n}</button>)}</div>
          </Fld>
        </ModalShell>
      )}

    </ModuleLayout>
  );
}
