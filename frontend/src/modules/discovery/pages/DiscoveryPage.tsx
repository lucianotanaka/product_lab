import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "../../../shared/services/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Opp { id:string; product_id:number; title:string; description?:string; origin?:string; impacted_area?:string; responsible?:string; identified_at?:string; status:string; priority:number; created_at:string; updated_at:string; }
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
          <Fld lbl={t("discovery.jtbd_field_type")}><select className="mod-select" value={f.job_type} onChange={e=>setF(p=>({...p,job_type:e.target.value}))}><option value="principal">{t("discovery.jtbd_type_principal")}</option><option value="secondary">{t("discovery.jtbd_type_secondary")}</option></select></Fld>
          <Fld lbl={t("discovery.jtbd_field_priority")}><div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${f.priority===n?"influence-btn--active":""}`} onClick={()=>setF(p=>({...p,priority:n}))}>{n}</button>)}</div></Fld>
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
  const save = async () => { setSaving(true); try { if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/research`, f); else if (edit) await apiPatch(`/discovery/research/${edit.id}`, f); setModal(null); reload(); } catch{/**/} finally{setSaving(false);} };
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
  const save = async () => { setSaving(true); try { if (modal==="new") await apiPost(`/discovery/opportunities/${oppId}/insights`, f); else if (edit) await apiPatch(`/discovery/insights/${edit.id}`, f); setModal(null); reload(); } catch{/**/} finally{setSaving(false);} };
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
        <ItemCard key={m.id} title={m.metric} sub={`${t(`discovery.metric_type_${m.metric_type}`)} | ${m.baseline??"-"} → ${m.target??"-"}`} badge={m.metric_type} onEdit={()=>openEdit(m)} onDel={()=>remove(m.id,`/discovery/success-metrics/${m.id}`)} />
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

// ── VPC types ─────────────────────────────────────────────────────────────────
interface VPCStructured {
  canvas_id: string; canvas_name: string;
  jobs: Array<{ job: VPCItemSlim; pains: VPCItemSlim[]; gains: VPCItemSlim[] }>;
  orphan_pains: VPCItemSlim[]; orphan_gains: VPCItemSlim[];
  products: Array<{ item: VPCItemSlim; addresses: VPCItemSlim[] }>;
  pain_relievers: Array<{ item: VPCItemSlim; addresses: VPCItemSlim[] }>;
  gain_creators: Array<{ item: VPCItemSlim; addresses: VPCItemSlim[] }>;
}
interface VPCItemSlim { id:string; type:string; name?:string|null; content:string; priority:number; parent_id?:string|null; }

// ── VPCDiagramInline ──────────────────────────────────────────────────────────
function VPCDiagramInline({ data, dark }: { data: VPCStructured; dark: boolean }) {
  const { t } = useTranslation();
  const jobs=data.jobs.map(j=>j.job), pains=[...data.jobs.flatMap(j=>j.pains),...data.orphan_pains], gains=[...data.jobs.flatMap(j=>j.gains),...data.orphan_gains];
  const products=data.products.map(n=>n.item), relievers=data.pain_relievers.map(n=>n.item), creators=data.gain_creators.map(n=>n.item);
  const c = dark ? { vpBg:"rgba(0,136,200,0.12)", vpBorder:"rgba(0,212,255,0.5)", cpBorder:"rgba(255,68,102,0.6)", cpBg:"rgba(220,60,80,0.12)", vpTitle:"#00d4ff", cpTitle:"#ff4466", divider:"rgba(0,212,255,0.3)", cpDivider:"rgba(255,68,102,0.4)", text:"#c8dce8", sub:"#7899b0", jobColor:"#00d4ff", painColor:"#ff4466", gainColor:"#00ff88", productColor:"#00d4ff", relieverColor:"#ff4466", creatorColor:"#00ff88" } : { vpBg:"rgba(0,100,180,0.08)", vpBorder:"rgba(0,136,170,0.5)", cpBorder:"rgba(204,51,51,0.5)", cpBg:"rgba(200,40,60,0.08)", vpTitle:"#0088aa", cpTitle:"#cc3333", divider:"rgba(0,136,170,0.3)", cpDivider:"rgba(204,51,51,0.4)", text:"#1a2a3a", sub:"#5a7080", jobColor:"#0088aa", painColor:"#cc3333", gainColor:"#006e38", productColor:"#0088aa", relieverColor:"#cc3333", creatorColor:"#006e38" };
  const Items = ({ items, color, maxH=130 }: { items:{id:string;name?:string|null;content:string}[]; color:string; maxH?:number }) => (<div style={{ overflowY:"auto", maxHeight:maxH, paddingRight:4 }}>{items.length===0 ? <div style={{ fontSize:9, color:c.sub, fontStyle:"italic" }}>—</div> : items.map(i=>(<div key={i.id} style={{ fontSize:10, color:c.text, marginBottom:3, lineHeight:1.3 }}><span style={{ color, fontWeight:700 }}>·</span> {i.name??i.content.substring(0,42)}{!i.name&&i.content.length>42?"…":""}</div>))}</div>);
  const vpS=500, cpS=500, r=cpS/2, cx=r, cy=r;
  const arc=(s:number,e:number)=>{ const toRad=(d:number)=>(d*Math.PI)/180; const x1=cx+r*Math.cos(toRad(((s%360)+360)%360)), y1=cy+r*Math.sin(toRad(((s%360)+360)%360)), x2=cx+r*Math.cos(toRad(((e%360)+360)%360)), y2=cy+r*Math.sin(toRad(((e%360)+360)%360)); const span=((e-s)%360+360)%360, large=span>180?1:0; return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`; };
  const div1=60,div2=180,div3=300;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, flexWrap:"wrap" }}>
        <div style={{ position:"relative", width:vpS, height:vpS, background:c.vpBg, border:`2px solid ${c.vpBorder}`, borderRadius:4, flexShrink:0 }}>
          <div style={{ position:"absolute", top:10, left:"50%", transform:"translateX(-50%)", fontSize:12, fontWeight:700, color:c.vpTitle, letterSpacing:2, whiteSpace:"nowrap", zIndex:2 }}>{t("vpc.diagram_vp_title")}</div>
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox={`0 0 ${vpS} ${vpS}`}><line x1={0} y1={0} x2={vpS} y2={vpS} stroke={c.divider} strokeWidth="1.5" /><line x1={vpS} y1={0} x2={0} y2={vpS} stroke={c.divider} strokeWidth="1.5" /><line x1={vpS/2} y1={vpS/2} x2={vpS} y2={vpS/2} stroke={c.divider} strokeWidth="1.5" /></svg>
          <div style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", width:vpS*0.40, zIndex:2 }}><div style={{ fontSize:11, fontWeight:700, color:c.productColor, letterSpacing:1, marginBottom:6 }}>{t("vpc.section_products")}</div><Items items={products} color={c.productColor} maxH={150} /></div>
          <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", top:36, width:vpS*0.52, textAlign:"center", zIndex:2 }}><div style={{ fontSize:11, fontWeight:700, color:c.creatorColor, letterSpacing:1, marginBottom:6 }}>{t("vpc.section_creators")}</div><Items items={creators} color={c.creatorColor} maxH={110} /></div>
          <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:28, width:vpS*0.52, textAlign:"center", zIndex:2 }}><div style={{ fontSize:11, fontWeight:700, color:c.relieverColor, letterSpacing:1, marginBottom:6 }}>{t("vpc.section_relievers")}</div><Items items={relievers} color={c.relieverColor} maxH={110} /></div>
        </div>
        <div style={{ color:c.jobColor, fontSize:24, fontWeight:700, flexShrink:0 }}>⟵⟶</div>
        <div style={{ position:"relative", width:cpS, height:cpS, flexShrink:0 }}>
          <svg width={cpS} height={cpS} viewBox={`0 0 ${cpS} ${cpS}`} style={{ position:"absolute", inset:0 }}>
            <path d={arc(60,180)} fill={c.gainColor} opacity="0.20" /><path d={arc(300,420)} fill={c.jobColor} opacity="0.20" /><path d={arc(180,300)} fill={c.painColor} opacity="0.20" />
            <line x1={cx} y1={cy} x2={cx+r*Math.cos(div1*Math.PI/180)} y2={cy+r*Math.sin(div1*Math.PI/180)} stroke={c.cpDivider} strokeWidth="1.5" />
            <line x1={cx} y1={cy} x2={cx+r*Math.cos(div2*Math.PI/180)} y2={cy+r*Math.sin(div2*Math.PI/180)} stroke={c.cpDivider} strokeWidth="2" />
            <line x1={cx} y1={cy} x2={cx+r*Math.cos(div3*Math.PI/180)} y2={cy+r*Math.sin(div3*Math.PI/180)} stroke={c.cpDivider} strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r={r-2} fill="none" stroke={c.cpBorder} strokeWidth="2" /><circle cx={cx} cy={cy} r={16} fill={c.cpBg} stroke={c.cpBorder} strokeWidth="1.5" />
          </svg>
          <div style={{ position:"absolute", top:10, left:"50%", transform:"translateX(-50%)", fontSize:12, fontWeight:700, color:c.cpTitle, letterSpacing:2, whiteSpace:"nowrap", zIndex:2 }}>{t("vpc.diagram_cp_title")}</div>
          <div style={{ position:"absolute", top:40, left:40, width:205, zIndex:2 }}><div style={{ fontSize:11, fontWeight:700, color:c.gainColor, letterSpacing:1, marginBottom:4 }}>{t("vpc.section_gains")}</div><Items items={gains} color={c.gainColor} maxH={150} /></div>
          <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:175, zIndex:2 }}><div style={{ fontSize:11, fontWeight:700, color:c.jobColor, letterSpacing:1, marginBottom:4 }}>{t("vpc.customer_jobs")}</div><Items items={jobs} color={c.jobColor} maxH={150} /></div>
          <div style={{ position:"absolute", bottom:40, left:40, width:205, zIndex:2 }}><div style={{ fontSize:11, fontWeight:700, color:c.painColor, letterSpacing:1, marginBottom:4 }}>{t("vpc.section_pains")}</div><Items items={pains} color={c.painColor} maxH={150} /></div>
        </div>
      </div>
    </div>
  );
}

// ── VPCNetworkInline ──────────────────────────────────────────────────────────
function VPCNetworkInline({ data, dark }: { data: VPCStructured; dark: boolean }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [lines, setLines] = useState<{d:string;color:string;key:string;dashed:boolean}[]>([]);
  const [showIndirect, setShowIndirect] = useState(false);
  const products=data.products, relievers=data.pain_relievers, creators=data.gain_creators;
  const allPains=[...data.jobs.flatMap(j=>j.pains),...data.orphan_pains], allGains=[...data.jobs.flatMap(j=>j.gains),...data.orphan_gains], jobs=data.jobs.map(j=>j.job);
  const conns: {from:string;to:string;color:string;dashed?:boolean}[] = [];
  if (showIndirect) { products.forEach(p => { p.addresses.forEach(job => { relievers.forEach(r => { if (r.addresses.some(a=>a.parent_id===job.id)) conns.push({from:`p_${p.item.id}`,to:`r_${r.item.id}`,color:"#00d4ff"}); }); creators.forEach(cr => { if (cr.addresses.some(a=>a.parent_id===job.id)) conns.push({from:`p_${p.item.id}`,to:`c_${cr.item.id}`,color:"#c084fc"}); }); }); }); }
  relievers.forEach(r => { r.addresses.forEach(a => conns.push({from:`r_${r.item.id}`,to:`pain_${a.id}`,color:"#ff4466"})); });
  creators.forEach(cr => { cr.addresses.forEach(a => conns.push({from:`c_${cr.item.id}`,to:`gain_${a.id}`,color:"#00ff88"})); });
  useEffect(() => {
    const container = containerRef.current; if (!container) return;
    const rect = container.getBoundingClientRect();
    const newLines = conns.flatMap(({from,to,color,dashed},i) => {
      const a = itemRefs.current.get(from); const b = itemRefs.current.get(to); if (!a||!b) return [];
      const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
      const x1=ar.right-rect.left, y1=ar.top-rect.top+ar.height/2, x2=br.left-rect.left, y2=br.top-rect.top+br.height/2, cx_=(x1+x2)/2;
      return [{key:`${from}-${to}-${i}`,color,dashed:dashed??false,d:`M${x1},${y1} C${cx_},${y1} ${cx_},${y2} ${x2},${y2}`}];
    });
    setLines(newLines);
  });
  const setRef=(id:string)=>(el:HTMLDivElement|null)=>{ if(el) itemRefs.current.set(id,el); else itemRefs.current.delete(id); };
  const dk=dark, col={ text:dk?"#c8dce8":"#1a2a3a", sub:dk?"#7899b0":"#5a7080", border:dk?"#0d2535":"#d0dde8", cyan:dk?"#00d4ff":"#0088aa", red:dk?"#ff4466":"#cc3333", green:dk?"#00ff88":"#006e38" };
  const NetCard=({refId,color,title,desc,priority}:{refId:string;color:string;title:string;desc:string;priority:number})=>(<div ref={setRef(refId)} style={{ border:`1px solid ${color}44`, borderRadius:3, padding:"6px 8px", marginBottom:5, background:`${color}06` }}><div style={{ fontSize:9, fontWeight:700, color, marginBottom:2 }}>{title}</div><div style={{ fontSize:8, color:col.sub }}>{desc.substring(0,65)}{desc.length>65?"…":""}</div><div style={{ fontSize:7, color:col.sub, marginTop:2 }}>P{priority}</div></div>);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <button onClick={()=>setShowIndirect(v=>!v)} style={{ background:showIndirect?"rgba(192,132,252,0.15)":"rgba(0,212,255,0.05)", border:`1px solid ${showIndirect?"#c084fc":"rgba(0,212,255,0.25)"}`, color:showIndirect?"#c084fc":col.sub, fontFamily:"inherit", fontSize:9, letterSpacing:1, padding:"5px 12px", cursor:"pointer" }}>{showIndirect?"⬡ OCULTAR INDIRETOS":"⬡ EXIBIR INDIRETOS"}</button>
      </div>
      <div ref={containerRef} style={{ position:"relative", display:"grid", gridTemplateColumns:"260px 260px 280px 220px", columnGap:"110px", rowGap:"16px", alignItems:"start" }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}>
          <defs>{["00d4ff","ff4466","00ff88","c084fc"].map(c2=>(<marker key={c2} id={`arr-${c2}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 Z" fill={`#${c2}`} opacity="0.8" /></marker>))}</defs>
          {lines.map(l=>(<path key={l.key} d={l.d} fill="none" stroke={l.color} strokeWidth={l.dashed?"1":"1.5"} strokeOpacity={l.dashed?"0.35":"0.75"} strokeDasharray={l.dashed?"4,4":undefined} markerEnd={l.dashed?undefined:`url(#arr-${l.color.replace("#","").toLowerCase()})`} />))}
        </svg>
        <div style={{ background:`${col.cyan}06`, border:`1px solid ${col.cyan}22`, borderRadius:6, padding:"12px 14px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:col.cyan, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.cyan}30`, paddingBottom:8 }}>{t("vpc.section_products")}</div>
          {products.length===0?<div style={{ fontSize:9, color:col.sub }}>—</div>:products.map(n=><NetCard key={n.item.id} refId={`p_${n.item.id}`} color={col.cyan} title={n.item.name??n.item.content.substring(0,40)} desc={n.item.content} priority={n.item.priority} />)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:`${col.red}06`, border:`1px solid ${col.red}22`, borderRadius:6, padding:"12px 14px" }}><div style={{ fontSize:10, fontWeight:700, color:col.red, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.red}30`, paddingBottom:8 }}>{t("vpc.section_relievers")}</div>{relievers.length===0?<div style={{ fontSize:9, color:col.sub }}>—</div>:relievers.map(n=><NetCard key={n.item.id} refId={`r_${n.item.id}`} color={col.red} title={n.item.name??n.item.content.substring(0,40)} desc={n.item.content} priority={n.item.priority} />)}</div>
          <div style={{ background:`${col.green}06`, border:`1px solid ${col.green}22`, borderRadius:6, padding:"12px 14px" }}><div style={{ fontSize:10, fontWeight:700, color:col.green, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.green}30`, paddingBottom:8 }}>{t("vpc.section_creators")}</div>{creators.length===0?<div style={{ fontSize:9, color:col.sub }}>—</div>:creators.map(n=><NetCard key={n.item.id} refId={`c_${n.item.id}`} color={col.green} title={n.item.name??n.item.content.substring(0,40)} desc={n.item.content} priority={n.item.priority} />)}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:`${col.red}06`, border:`1px solid ${col.red}22`, borderRadius:6, padding:"12px 14px" }}><div style={{ fontSize:10, fontWeight:700, color:col.red, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.red}30`, paddingBottom:8 }}>{t("vpc.section_pains")}</div>{allPains.length===0?<div style={{ fontSize:9, color:col.sub }}>—</div>:allPains.map((p,i)=>(<div key={p.id} ref={setRef(`pain_${p.id}`)} style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:6, padding:"4px 8px", borderRadius:3, background:`${col.red}08`, border:`1px solid ${col.red}33` }}><span style={{ fontSize:9, fontWeight:700, color:col.red, minWidth:22 }}>P{i+1}</span><span style={{ fontSize:9, color:col.text }}>{(p.name??p.content).substring(0,55)}</span></div>))}</div>
          <div style={{ background:`${col.green}06`, border:`1px solid ${col.green}22`, borderRadius:6, padding:"12px 14px" }}><div style={{ fontSize:10, fontWeight:700, color:col.green, letterSpacing:2, marginBottom:12, borderBottom:`1px solid ${col.green}30`, paddingBottom:8 }}>{t("vpc.section_gains")}</div>{allGains.length===0?<div style={{ fontSize:9, color:col.sub }}>—</div>:allGains.map((g,i)=>(<div key={g.id} ref={setRef(`gain_${g.id}`)} style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:5, padding:"4px 8px", borderRadius:3, background:`${col.green}08`, border:`1px solid ${col.green}33` }}><span style={{ fontSize:9, fontWeight:700, color:col.green, minWidth:22 }}>G{i+1}</span><span style={{ fontSize:9, color:col.text }}>{(g.name??g.content).substring(0,55)}</span></div>))}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {jobs.length>0&&(<div style={{ background:`${col.cyan}06`, border:`1px solid ${col.cyan}22`, borderRadius:6, padding:"12px 14px" }}><div style={{ fontSize:10, fontWeight:700, color:col.cyan, letterSpacing:2, marginBottom:10, borderBottom:`1px solid ${col.cyan}30`, paddingBottom:8 }}>{t("vpc.customer_jobs")}</div>{jobs.map(j=>(<div key={j.id} style={{ fontSize:9, color:col.text, marginBottom:6, padding:"4px 8px", borderRadius:3, border:`1px solid ${col.cyan}33` }}>{(j.name??j.content).substring(0,80)}</div>))}</div>)}
          <div style={{ padding:"10px 12px", border:`1px solid ${col.border}`, borderRadius:4 }}>
            <div style={{ fontSize:9, color:col.sub, marginBottom:8, letterSpacing:1 }}>{t("vpc.network_legend")}</div>
            {[{color:"#00d4ff",label:t("vpc.legend_prod_reliever")},{color:"#c084fc",label:t("vpc.legend_prod_creator")},{color:col.red,label:t("vpc.legend_reliever_pain")},{color:col.green,label:t("vpc.legend_creator_gain")}].map(({color,label})=>(<div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}><svg width="32" height="10" style={{ flexShrink:0 }}><line x1="0" y1="5" x2="26" y2="5" stroke={color} strokeWidth="1.5" /><polygon points="24,2 30,5 24,8" fill={color} opacity="0.8" /></svg><span style={{ fontSize:8, color:col.sub }}>{label}</span></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: VPC (readonly — Diagram/Network + Generate button) ─────────────────
function TabVPC({ oppId, productId }: { oppId:string; productId:string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dark = user?.user_theme !== "light";
  const [linked, setLinked] = useState<VPCCanvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string>("");
  const [vpcData, setVpcData] = useState<VPCStructured|null>(null);
  const [vpcView, setVpcView] = useState<"diagram"|"network">("diagram");
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const loadLinked = useCallback(async () => {
    try { const list = await apiGet<VPCCanvas[]>(`/vpc/canvas?opportunity_id=${oppId}`); setLinked(list); if (list.length > 0 && !activeCanvasId) setActiveCanvasId(list[0].id); } catch{/**/}
  }, [oppId]);
  useEffect(() => { loadLinked(); }, [loadLinked]);
  useEffect(() => {
    if (!activeCanvasId) { setVpcData(null); return; }
    apiGet<VPCStructured>(`/vpc/canvas/${activeCanvasId}/structured`).then(setVpcData).catch(()=>{});
  }, [activeCanvasId]);
  const handleGenerate = async () => {
    if (!confirm("Gerar um VPC a partir dos dados desta oportunidade?")) return;
    setGenerating(true); setGenMsg("");
    try { const r = await apiPost<{canvas_id:string;canvas_name:string;items_created:number}>(`/discovery/opportunities/${oppId}/generate-vpc`,{}); setGenMsg(`✓ VPC gerado: "${r.canvas_name}" com ${r.items_created} item(s).`); await loadLinked(); setActiveCanvasId(r.canvas_id); } catch { setGenMsg("⚠ Erro ao gerar o VPC."); } finally { setGenerating(false); }
  };
  const activeCanvas = linked.find(c => c.id === activeCanvasId);
  void productId;
  return (
    <div>
      <SecHdr eyebrow={t("discovery.vpc_eyebrow")} />
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        <button className="btn-add" style={{ fontSize:10 }} onClick={handleGenerate} disabled={generating}>{generating ? "GERANDO..." : "⚡ GERAR VPC DO DISCOVERY"}</button>
        {activeCanvas && (<button onClick={()=>navigate("/modules/vpc")} style={{ fontSize:10, color:"#00d4ff", background:"transparent", textDecoration:"none", padding:"4px 10px", border:"1px solid rgba(0,212,255,0.3)", borderRadius:2, cursor:"pointer", fontFamily:"inherit", letterSpacing:1 }}>→ ABRIR NO MÓDULO VPC</button>)}
        {linked.length > 1 && (<select className="mod-select" style={{ fontSize:10, padding:"4px 10px", minWidth:200 }} value={activeCanvasId} onChange={e=>setActiveCanvasId(e.target.value)}>{linked.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
        {vpcData && (["diagram","network"] as const).map(v=>(<button key={v} className={`btn-icon ${vpcView===v?"influence-btn--active":""}`} style={{ fontSize:9 }} onClick={()=>setVpcView(v)}>{v.toUpperCase()}</button>))}
      </div>
      {genMsg && <div style={{ fontSize:10, color:genMsg.startsWith("✓")?"#00ff88":"#ff4466", marginBottom:12 }}>{genMsg}</div>}
      {activeCanvas && (<div style={{ marginBottom:10 }}><span style={{ fontSize:11, fontWeight:600, color:"#00d4ff" }}>{activeCanvas.name}</span>{activeCanvas.description && <span style={{ fontSize:10, color:"#7899b0", marginLeft:8 }}>{activeCanvas.description}</span>}</div>)}
      {linked.length === 0 && <EmptyItem text="Nenhum VPC vinculado. Clique em '⚡ GERAR VPC DO DISCOVERY' para criar automaticamente." />}
      {vpcData && vpcView === "diagram" && <VPCDiagramInline data={vpcData} dark={dark} />}
      {vpcData && vpcView === "network" && <VPCNetworkInline data={vpcData} dark={dark} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = ["tab_overview","tab_problem","tab_jtbd","tab_research","tab_insights","tab_assumptions","tab_vpc","tab_solutions","tab_experiments","tab_metrics"] as const;
type TabKey = typeof TABS[number];

export default function DiscoveryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dark = user?.user_theme !== "light";
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
    try { setOpps(await apiGet<Opp[]>(`/discovery/opportunities?product_id=${pid}`)); } catch { setError(t("discovery.err_load")); }
  }, [productId, t]);
  useEffect(() => { loadOpps(); }, [loadOpps]);
  const handleProductChange = (id:string) => { localStorage.setItem("pl_product",id); setProductId(id); setSelectedOpp(null); };
  const openNewOpp = () => { setError(""); setOppForm({ title:"", description:"", origin:"", impacted_area:"", responsible:"", identified_at:"", status:"identified", priority:3 }); setOppModal("new"); };
  const openEditOpp = (o:Opp) => { setError(""); setOppForm({ title:o.title, description:o.description??"", origin:o.origin??"", impacted_area:o.impacted_area??"", responsible:o.responsible??"", identified_at:o.identified_at??"", status:o.status, priority:o.priority }); setOppModal("edit"); };
  const saveOpp = async () => {
    if (!oppForm.title.trim()) return;
    setSaving(true);
    const body = { ...oppForm, identified_at:oppForm.identified_at||null, description:oppForm.description||null, origin:oppForm.origin||null, impacted_area:oppForm.impacted_area||null, responsible:oppForm.responsible||null };
    try {
      if (oppModal==="new") { const created = await apiPost<Opp>("/discovery/opportunities", { ...body, product_id:Number(productId) }); await loadOpps(); setSelectedOpp(created); }
      else if (selectedOpp) { const updated = await apiPatch<Opp>(`/discovery/opportunities/${selectedOpp.id}`, body); setSelectedOpp(updated); await loadOpps(); }
      setOppModal(null);
    } catch { setError(t("discovery.err_save")); } finally { setSaving(false); }
  };
  const deleteOpp = async (id:string) => {
    if (!confirm(t("discovery.confirm_delete_opp"))) return;
    try { await apiDelete(`/discovery/opportunities/${id}`); setSelectedOpp(null); await loadOpps(); } catch{/**/}
  };
  const bdr = dark ? "#0d2535" : "#d0dde8";
  return (
    <ModuleLayout moduleIcon="◎" moduleName="DISCOVERY MODULE" moduleAccent="MODULE" selectedProductId={productId} onProductChange={handleProductChange}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("discovery.eyebrow")}</span>
          <h1 className="mod-header__title">{t("discovery.title")} <span>{t("discovery.title_accent")}</span></h1>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {productId && opps.length > 0 && (
            <select className="mod-select" style={{ minWidth:280, fontSize:11 }} value={selectedOpp?.id ?? ""} onChange={e => { const found = opps.find(o => o.id === e.target.value); if (found) { setSelectedOpp(found); setActiveTab("tab_overview"); } else setSelectedOpp(null); }}>
              <option value="">{t("discovery.select_opp")}</option>
              {opps.map(o => <option key={o.id} value={o.id}>{o.title} [{o.status.replace(/_/g," ").toUpperCase()}]</option>)}
            </select>
          )}
          {productId && <button className="btn-add" onClick={openNewOpp}>{t("discovery.btn_new_opp")}</button>}
        </div>
      </div>
      {error && <div className="mod-error">⚠ {error}</div>}
      {!productId && <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.no_product")}</div></div>}
      {productId && opps.length === 0 && <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.sidebar_empty")}</div><div className="mod-empty__sub">{t("discovery.sidebar_empty_sub")}</div></div>}
      {productId && opps.length > 0 && (
        <div>
          {!selectedOpp ? (
            <div className="mod-empty"><div className="mod-empty__icon">◎</div><div className="mod-empty__title">{t("discovery.select_opp")}</div><div className="mod-empty__sub">{t("discovery.select_opp_sub")}</div></div>
          ) : (
            <div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16, borderBottom:`1px solid ${bdr}`, paddingBottom:8 }}>
                {TABS.map(tab => (<button key={tab} className={`btn-icon ${activeTab===tab?"influence-btn--active":""}`} style={{ fontSize:9, padding:"3px 10px" }} onClick={()=>setActiveTab(tab)}>{t(`discovery.${tab}`)}</button>))}
                <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                  <button className="btn-icon" style={{ fontSize:9 }} onClick={()=>openEditOpp(selectedOpp)}>{t("discovery.btn_edit")}</button>
                  <button className="btn-icon btn-icon--danger" style={{ fontSize:9 }} onClick={()=>deleteOpp(selectedOpp.id)}>{t("discovery.btn_del")}</button>
                </div>
              </div>
              <div style={{ minHeight:400 }}>
                {activeTab==="tab_overview"    && <TabOverview opp={selectedOpp} onEdit={()=>openEditOpp(selectedOpp)} />}
                {activeTab==="tab_problem"     && <TabProblem oppId={selectedOpp.id} />}
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
      {oppModal && (
        <ModalShell title={oppModal==="new"?t("discovery.modal_new_opp"):t("discovery.modal_edit_opp")} sub={t("discovery.modal_opp_subtitle")} onClose={()=>setOppModal(null)} onSave={saveOpp} saving={saving}>
          <Fld lbl={t("discovery.field_title")}><input className="mod-input" value={oppForm.title} onChange={e=>setOppForm(p=>({...p,title:e.target.value}))} placeholder={t("discovery.placeholder_title")} /></Fld>
          <Fld lbl={t("discovery.field_description")}><textarea className="mod-textarea" value={oppForm.description} onChange={e=>setOppForm(p=>({...p,description:e.target.value}))} placeholder={t("discovery.placeholder_description")} /></Fld>
          <Fld lbl={t("discovery.field_origin")}><input className="mod-input" value={oppForm.origin} onChange={e=>setOppForm(p=>({...p,origin:e.target.value}))} placeholder={t("discovery.placeholder_origin")} /></Fld>
          <Fld lbl={t("discovery.field_impacted_area")}><input className="mod-input" value={oppForm.impacted_area} onChange={e=>setOppForm(p=>({...p,impacted_area:e.target.value}))} placeholder={t("discovery.placeholder_impacted_area")} /></Fld>
          <Fld lbl={t("discovery.field_responsible")}><input className="mod-input" value={oppForm.responsible} onChange={e=>setOppForm(p=>({...p,responsible:e.target.value}))} placeholder={t("discovery.placeholder_responsible")} /></Fld>
          <Fld lbl={t("discovery.field_identified_at")}><input className="mod-input" type="date" value={oppForm.identified_at} onChange={e=>setOppForm(p=>({...p,identified_at:e.target.value}))} /></Fld>
          <Fld lbl={t("discovery.field_status")}><select className="mod-select" value={oppForm.status} onChange={e=>setOppForm(p=>({...p,status:e.target.value}))}>{["identified","under_investigation","validated","paused","discarded","forwarded_to_roadmap"].map(v=>(<option key={v} value={v}>{t(`discovery.opp_status_${v}`)}</option>))}</select></Fld>
          <Fld lbl={t("discovery.field_priority")}><div className="influence-grid">{[1,2,3,4,5].map(n=><button key={n} type="button" className={`influence-btn ${oppForm.priority===n?"influence-btn--active":""}`} onClick={()=>setOppForm(p=>({...p,priority:n}))}>{n}</button>)}</div></Fld>
        </ModalShell>
      )}
    </ModuleLayout>
  );
}
