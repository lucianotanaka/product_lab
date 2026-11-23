import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useCompany } from "../../../contexts/CompanyContext";
import { apiGet, apiPost, apiPatch } from "../../../shared/services/api";

interface BusinessArea { id:number;area_name:string;area_description?:string;area_color?:string;area_type:string;parent_area_id?:number;level:number;display_order:number;is_active:boolean;product_id?:number;created_at:string;updated_at:string; }
interface AssocArea extends BusinessArea { business_area_id?:number;company_id?:number; }
interface TreeNode extends BusinessArea { children:TreeNode[]; }
interface Stakeholder { stakeholder_id:number;full_name:string;email?:string;position_title?:string; }
interface AreaLeader { id:number;company_id:number;company_name:string;business_area_id:number;stakeholder_id:number;stakeholder_name:string;stakeholder_email?:string;stakeholder_role?:string;leadership_level:string;reports_to_leader_id?:number;reports_to_name?:string;is_current:boolean;started_at?:string;ended_at?:string;notes?:string; }

const AREA_TYPES=["STRATEGIC","OPERATIONAL","SUPPORT","TECHNOLOGY","COMMERCIAL"];
const LEADERSHIP_LEVELS=["DIRECTOR","MANAGER","COORDINATOR","SUPERVISOR","LEAD"];
const TYPE_COLORS:Record<string,string>={STRATEGIC:"#c084fc",OPERATIONAL:"#00d4ff",SUPPORT:"#00ff88",TECHNOLOGY:"#00e5cc",COMMERCIAL:"#ff9900"};
const LEVEL_LABELS=["RAIZ","SUB-ÁREA","TIME/SQUAD"];
const LEVEL_COLOR="#c084fc";
const EMPTY_FORM={area_name:"",area_description:"",area_color:"",area_type:"OPERATIONAL",parent_area_id:"",level:0,display_order:0,is_active:true};

const LEVEL_RANK:Record<string,number>={DIRECTOR:0,MANAGER:1,COORDINATOR:2,SUPERVISOR:3,LEAD:4};

function OrgNode({leader,allLeaders,depth}:{leader:AreaLeader;allLeaders:AreaLeader[];depth:number}) {
  const [col,setCol]=useState(false);
  const ch=allLeaders.filter(l=>l.reports_to_leader_id===leader.id);
  const a=Math.max(0.05,0.15-depth*0.03);
  return (
    <div style={{display:"flex",gap:0}}>
      {depth>0&&<div style={{width:24,flexShrink:0,position:"relative"}}><div style={{position:"absolute",left:11,top:0,bottom:0,width:1,background:"rgba(192,132,252,0.2)"}} /><div style={{position:"absolute",left:11,top:17,width:12,height:1,background:"rgba(192,132,252,0.2)"}} /></div>}
      <div style={{flex:1,minWidth:0,marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`rgba(192,132,252,${a})`,border:`1px solid rgba(192,132,252,${0.15+depth*0.02})`,borderLeft:`3px solid ${LEVEL_COLOR}`,borderRadius:4}}>
          <span style={{fontSize:7,padding:"2px 6px",background:"#c084fc22",border:"1px solid #c084fc55",borderRadius:3,color:LEVEL_COLOR,letterSpacing:1,fontWeight:700,flexShrink:0}}>{leader.leadership_level}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"#c8dce8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>◆ {leader.stakeholder_name}{leader.stakeholder_role&&<span style={{fontSize:9,color:"#7899b0",fontWeight:400,marginLeft:8}}>{leader.stakeholder_role}</span>}</div>
            <div style={{fontSize:8,color:"#00d4ff",marginTop:1,letterSpacing:1}}>{leader.company_name}{leader.started_at&&<span style={{color:"#555",marginLeft:8}}>desde {leader.started_at}</span>}</div>
          </div>
          {ch.length>0&&<button onClick={()=>setCol(v=>!v)} style={{background:"none",border:"none",color:LEVEL_COLOR,cursor:"pointer",fontSize:9,padding:"2px 5px",flexShrink:0,opacity:0.8}}>{col?`▶ ${ch.length}`:`▼`}</button>}
        </div>
        {!col&&ch.length>0&&<div style={{marginLeft:12}}>{ch.sort((a,b)=>(LEVEL_RANK[a.leadership_level]??9)-(LEVEL_RANK[b.leadership_level]??9)).map(c=><OrgNode key={c.id} leader={c} allLeaders={allLeaders} depth={depth+1}/>)}</div>}
      </div>
    </div>
  );
}

function OrgChart({leaders}:{leaders:AreaLeader[]}) {
  const ids=new Set(leaders.map(l=>l.id));
  const roots=leaders.filter(l=>!l.reports_to_leader_id||!ids.has(l.reports_to_leader_id)).sort((a,b)=>(LEVEL_RANK[a.leadership_level]??9)-(LEVEL_RANK[b.leadership_level]??9));
  if(roots.length===0) return <div style={{color:"#7899b0",fontSize:11,textAlign:"center",padding:"20px 0"}}>Sem estrutura hierárquica — configure "Reporta para" nos líderes.</div>;
  return <div style={{paddingBottom:8}}>{roots.map(r=><OrgNode key={r.id} leader={r} allLeaders={leaders} depth={0}/>)}</div>;
}

const OrgIcon=()=><svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><rect x="5" y="0" width="6" height="4" rx="1" fill="currentColor"/><rect x="0" y="10" width="6" height="4" rx="1" fill="currentColor"/><rect x="10" y="10" width="6" height="4" rx="1" fill="currentColor"/><line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="8" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>;

const PersonIcon=()=><svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{display:"inline-block",verticalAlign:"middle"}}><circle cx="8" cy="5" r="3" fill="currentColor"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="13" cy="4" r="2" fill="currentColor" opacity="0.6"/><path d="M13 8c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6"/></svg>;

function ToggleBtn({isActive,onToggle,tOff,tOn}:{isActive:boolean;onToggle:()=>void;tOff:string;tOn:string}) {
  return <button title={isActive?tOff:tOn} style={{background:isActive?"rgba(255,80,80,0.12)":"rgba(0,180,80,0.12)",border:`1px solid ${isActive?"rgba(255,80,80,0.4)":"rgba(0,180,80,0.4)"}`,borderRadius:3,cursor:"pointer",fontSize:10,lineHeight:1,padding:"2px 5px",color:isActive?"#ff5050":"#00c853"}} onClick={onToggle}>{isActive?"⏻":"↺"}</button>;
}

function buildTree(areas:BusinessArea[],parentId:number|null=null):TreeNode[] {
  return areas.filter(a=>(a.parent_area_id??null)===parentId).sort((a,b)=>a.display_order-b.display_order||a.area_name.localeCompare(b.area_name)).map(a=>({...a,children:buildTree(areas,a.id)}));
}

function TreeNodeCard({node,depth,companyName,onManage,onOrg,onEdit,onToggle,t}:{node:TreeNode;depth:number;companyName?:string;onManage:(a:BusinessArea)=>void;onOrg:(a:BusinessArea)=>void;onEdit:(a:BusinessArea)=>void;onToggle:(a:BusinessArea)=>void;t:(k:string)=>string}) {
  const [col,setCol]=useState(false);
  const accent=node.area_color||TYPE_COLORS[node.area_type]||"#7899b0";
  return (
    <div style={{marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:depth===0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.01)",border:`1px solid ${accent}${depth===0?"33":"22"}`,borderLeft:`${3-Math.min(depth,2)}px solid ${accent}`,borderRadius:3,marginLeft:depth*20,opacity:node.is_active?1:0.5}}>
        {node.children.length>0&&<button onClick={()=>setCol(v=>!v)} style={{background:"none",border:"none",color:accent,cursor:"pointer",fontSize:10,padding:"0 2px",lineHeight:1}}>{col?"▶":"▼"}</button>}
        {node.children.length===0&&<span style={{width:14}}/>}
        {node.area_color&&<span style={{width:8,height:8,borderRadius:"50%",background:node.area_color,flexShrink:0}}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#c8dce8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{node.area_name}</div>
          <div style={{fontSize:8,color:accent,letterSpacing:1}}>{node.area_type} · {LEVEL_LABELS[node.level]||`NÍVEL ${node.level}`}{companyName&&<span style={{marginLeft:8,color:"#00d4ff",opacity:0.7}}>| {companyName}</span>}</div>
        </div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          <button className="btn-icon" style={{fontSize:8,padding:"1px 5px"}} title={t("business_areas.btn_leaders")} onClick={()=>onManage(node)}><PersonIcon/></button>
          <button className="btn-icon" style={{fontSize:8,padding:"1px 5px"}} title="ORG" onClick={()=>onOrg(node)}><OrgIcon/></button>
          <button className="btn-icon" style={{fontSize:8,padding:"1px 5px"}} onClick={()=>onEdit(node)}>✎</button>
          <ToggleBtn isActive={node.is_active} onToggle={()=>onToggle(node)} tOff={t("business_areas.status_inactive")} tOn={t("business_areas.status_active")}/>
        </div>
      </div>
      {!col&&node.children.length>0&&<div>{node.children.map(child=><TreeNodeCard key={child.id} node={child} depth={depth+1} companyName={companyName} onManage={onManage} onOrg={onOrg} onEdit={onEdit} onToggle={onToggle} t={t}/>)}</div>}
    </div>
  );
}

export default function BusinessAreasPage() {
  const {t}=useTranslation();
  const {companies:userCompanies,companyId:ctxCompanyId}=useCompany();

  const [areas,setAreas]=useState<BusinessArea[]>([]);
  const [loading,setLoading]=useState(false);
  const [viewMode,setViewMode]=useState<"tree"|"list">("tree");
  const [filterType,setFilterType]=useState("");
  const [selCompanyId,setSelCompanyId]=useState(ctxCompanyId||"");
  const [selCompanyName,setSelCompanyName]=useState("");
  const [modal,setModal]=useState<"new"|"edit"|null>(null);
  const [editing,setEditing]=useState<BusinessArea|null>(null);
  const [form,setForm]=useState({...EMPTY_FORM});
  const [saving,setSaving]=useState(false);
  const [orgChartModal,setOrgChartModal]=useState<BusinessArea|null>(null);
  const [orgChartLeaders,setOrgChartLeaders]=useState<AreaLeader[]>([]);
  const [leadersArea,setLeadersArea]=useState<BusinessArea|null>(null);
  const [areaLeaders,setAreaLeaders]=useState<AreaLeader[]>([]);
  const [stakeholders,setStakeholders]=useState<Stakeholder[]>([]);
  const [leaderForm,setLeaderForm]=useState({company_id:"",stakeholder_id:"",leadership_level:"COORDINATOR",reports_to_leader_id:"",started_at:""});
  const [savingLeader,setSavingLeader]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [leadersView,setLeadersView]=useState<"grid"|"org">("grid");

  useEffect(()=>{
    if(selCompanyId){const c=userCompanies.find(c=>String(c.id)===selCompanyId);setSelCompanyName(c?.company_name??"");}
    else setSelCompanyName("");
  },[selCompanyId,userCompanies]);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      if(selCompanyId){
        const res=await apiGet<AssocArea[]>(`/companies/${selCompanyId}/areas`);
        const areaIds=res.map(a=>a.business_area_id??a.id);
        const catalog=await apiGet<{items:BusinessArea[]}>(`/business-areas?page=1&size=500`);
        setAreas(catalog.items.filter(a=>areaIds.includes(a.id)));
      }else{
        const res=await apiGet<{items:BusinessArea[]}>(`/business-areas?page=1&size=500`);
        setAreas(res.items);
      }
    }catch{/**/}finally{setLoading(false);}
  },[selCompanyId]);
  useEffect(()=>{load();},[load]);

  const loadLeaders=useCallback(async(area:BusinessArea)=>{
    try{setAreaLeaders(await apiGet<AreaLeader[]>(`/business-areas/${area.id}/leaders`));}catch{setAreaLeaders([]);}
  },[]);

  const loadStakeholders=useCallback(async(companyId?:string)=>{
    try{
      let r=await apiGet<{items:Stakeholder[]}>(companyId?`/stakeholders?company_id=${companyId}&size=200`:"/stakeholders?size=200");
      if((!r.items||r.items.length===0)&&companyId) r=await apiGet<{items:Stakeholder[]}>("/stakeholders?size=200");
      setStakeholders(r.items??[]);
    }catch{setStakeholders([]);}
  },[]);

  const openOrgChart=async(area:BusinessArea)=>{
    setOrgChartModal(area);setOrgChartLeaders([]);
    try{setOrgChartLeaders(await apiGet<AreaLeader[]>(`/business-areas/${area.id}/leaders`));}catch{/**/}
  };

  const openManageLeaders=(area:BusinessArea)=>{
    setLeadersArea(area);setAreaLeaders([]);setShowHistory(false);setLeadersView("grid");
    setLeaderForm({company_id:selCompanyId||"",stakeholder_id:"",leadership_level:"COORDINATOR",reports_to_leader_id:"",started_at:""});
    loadLeaders(area);if(selCompanyId)loadStakeholders(selCompanyId);
  };

  const openNew=(parentArea?:BusinessArea)=>{setForm({...EMPTY_FORM,parent_area_id:parentArea?String(parentArea.id):"",level:parentArea?Math.min(parentArea.level+1,2):0,area_type:parentArea?.area_type??"OPERATIONAL",area_color:parentArea?.area_color??""});setEditing(null);setModal("new");};
  const openEdit=(a:BusinessArea)=>{setForm({area_name:a.area_name,area_description:a.area_description??"",area_color:a.area_color??"",area_type:a.area_type,parent_area_id:a.parent_area_id?String(a.parent_area_id):"",level:a.level,display_order:a.display_order,is_active:a.is_active});setEditing(a);setModal("edit");};
  const handleToggleActive=async(a:BusinessArea)=>{try{await apiPatch(`/business-areas/${a.id}`,{is_active:!a.is_active});load();}catch{/**/}};

  const save=async()=>{
    if(!form.area_name.trim())return;setSaving(true);
    const body={area_name:form.area_name,area_description:form.area_description||null,area_color:form.area_color||null,area_type:form.area_type,parent_area_id:form.parent_area_id?Number(form.parent_area_id):null,level:Number(form.level),display_order:Number(form.display_order),is_active:form.is_active};
    try{if(modal==="new")await apiPost("/business-areas",body);else if(editing)await apiPatch(`/business-areas/${editing.id}`,body);setModal(null);load();}catch{/**/}finally{setSaving(false);}
  };

  const handleAddLeader=async()=>{
    if(!leadersArea||!leaderForm.company_id||!leaderForm.stakeholder_id)return;setSavingLeader(true);
    try{
      await apiPost(`/business-areas/${leadersArea.id}/leaders`,{company_id:Number(leaderForm.company_id),stakeholder_id:Number(leaderForm.stakeholder_id),leadership_level:leaderForm.leadership_level,reports_to_leader_id:leaderForm.reports_to_leader_id?Number(leaderForm.reports_to_leader_id):null,started_at:leaderForm.started_at||null});
      setLeaderForm(p=>({...p,stakeholder_id:"",reports_to_leader_id:"",started_at:""}));loadLeaders(leadersArea);
    }catch{/**/}finally{setSavingLeader(false);}
  };

  const handleEndLeader=async(leaderId:number)=>{
    if(!leadersArea||!confirm(t("business_areas.leaders_end_confirm")))return;
    const today=new Date().toISOString().split("T")[0];
    try{await apiPatch(`/business-areas/${leadersArea.id}/leaders/${leaderId}`,{ended_at:today,is_current:false});loadLeaders(leadersArea);}catch{/**/}
  };

  const filteredAreas=filterType?areas.filter(a=>a.area_type===filterType):areas;
  const tree=buildTree(filteredAreas);
  const rootAreas=areas.filter(a=>!a.parent_area_id);
  const currentLeaders=areaLeaders.filter(l=>l.is_current);
  const histLeaders=areaLeaders.filter(l=>!l.is_current);

  return (
    <ModuleLayout moduleIcon="◈" moduleName={t("business_areas.module_name")} moduleAccent={t("business_areas.module_accent")} showProductSelector={false}>
      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("business_areas.eyebrow")}</span>
          <h1 className="mod-header__title">{t("business_areas.title")} <span>{t("business_areas.title_accent")}</span></h1>
          <p className="mod-header__meta">{t("business_areas.meta",{count:areas.length})} · {rootAreas.length} {t("business_areas.root_areas")}{selCompanyName&&<span style={{color:"#00d4ff",marginLeft:10}}>| {selCompanyName}</span>}</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select className="mod-select" style={{fontSize:10,minWidth:160}} value={selCompanyId} onChange={e=>setSelCompanyId(e.target.value)}>
            <option value="">{t("business_areas.filter_all_companies")}</option>
            {userCompanies.map(c=><option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
          </select>
          <div style={{display:"flex",gap:2}}>
            {(["tree","list"] as const).map(v=><button key={v} className={`btn-icon ${viewMode===v?"influence-btn--active":""}`} style={{fontSize:9}} onClick={()=>setViewMode(v)}>{v==="tree"?t("business_areas.view_tree"):t("business_areas.view_list")}</button>)}
          </div>
          <select className="mod-select" style={{fontSize:10}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">{t("business_areas.filter_all_types")}</option>
            {AREA_TYPES.map(ty=><option key={ty} value={ty}>{t(`business_areas.type_${ty.toLowerCase()}`)}</option>)}
          </select>
          <button className="btn-add" onClick={()=>openNew()}>{t("business_areas.btn_new")}</button>
        </div>
      </div>
      {!selCompanyId&&<div style={{fontSize:9,color:"#7899b0",marginBottom:12,padding:"6px 10px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:4}}>{t("business_areas.hint_all_companies")}</div>}
      <div style={{fontSize:9,color:"#7899b0",marginBottom:16}}>
        {LEVEL_LABELS.map((lbl,i)=><span key={i} style={{marginRight:16}}><span style={{color:"#00d4ff"}}>L{i}</span> = {lbl}</span>)}
        <span style={{marginLeft:"auto",color:"#555",float:"right"}}>{t("business_areas.tree_legend")}</span>
      </div>
      {loading&&<div className="mod-loading">{t("business_areas.loading")}</div>}
      {!loading&&areas.length===0&&<div className="mod-empty"><div className="mod-empty__icon">◈</div><div className="mod-empty__title">{selCompanyId?t("business_areas.empty_company_title"):t("business_areas.empty_title")}</div><div className="mod-empty__sub">{selCompanyId?t("business_areas.empty_company_sub"):t("business_areas.empty_sub")}</div></div>}

      {!loading&&areas.length>0&&viewMode==="tree"&&(
        <div>
          {tree.length===0?<div style={{color:"#7899b0",fontSize:10}}>{t("business_areas.no_match_filter")}</div>
          :tree.map(node=><TreeNodeCard key={node.id} node={node} depth={0} companyName={selCompanyName||undefined} onManage={openManageLeaders} onOrg={openOrgChart} onEdit={openEdit} onToggle={handleToggleActive} t={t}/>)}
        </div>
      )}

      {!loading&&areas.length>0&&viewMode==="list"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:12}}>
          {filteredAreas.sort((a,b)=>a.level-b.level||a.area_name.localeCompare(b.area_name)).map(area=>{
            const accent=area.area_color||TYPE_COLORS[area.area_type]||"#7899b0";
            const parent=area.parent_area_id?areas.find(a=>a.id===area.parent_area_id):null;
            return(
              <div key={area.id} className="vpc-card" style={{borderLeft:`3px solid ${accent}`,opacity:area.is_active?1:0.5}}>
                <div style={{flex:1,marginBottom:6}}>
                  {parent&&<div style={{fontSize:8,color:"#7899b0",marginBottom:2}}>↳ {parent.area_name}</div>}
                  <div style={{fontSize:12,fontWeight:700,color:"#c8dce8"}}>{area.area_color&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:area.area_color,marginRight:5,verticalAlign:"middle"}}/>}{area.area_name}</div>
                  {area.area_description&&<div style={{fontSize:9,color:"#7899b0",marginTop:2}}>{area.area_description.substring(0,50)}</div>}
                  {selCompanyName&&<div style={{fontSize:8,color:"#00d4ff",marginTop:2,opacity:0.7}}>{selCompanyName}</div>}
                </div>
                <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:8,padding:"1px 6px",borderRadius:2,border:`1px solid ${accent}55`,color:accent}}>{area.area_type}</span>
                  <span style={{fontSize:8,padding:"1px 6px",borderRadius:2,border:"1px solid rgba(0,212,255,0.2)",color:"#7899b0"}}>{LEVEL_LABELS[area.level]||`L${area.level}`}</span>
                </div>
                <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                  <button className="btn-icon" style={{fontSize:8,color:LEVEL_COLOR,borderColor:`${LEVEL_COLOR}44`}} onClick={()=>openManageLeaders(area)}>{t("business_areas.btn_leaders")}</button>
                  <button className="btn-icon" style={{fontSize:8}} onClick={()=>openNew(area)}>+ SUB</button>
                  <button className="btn-icon" style={{fontSize:8}} onClick={()=>openEdit(area)}>✎</button>
                  <ToggleBtn isActive={area.is_active} onToggle={()=>handleToggleActive(area)} tOff={t("business_areas.status_inactive")} tOn={t("business_areas.status_active")}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LEADERS MODAL ── */}
      {leadersArea&&(
        <div className="mod-overlay" onClick={()=>setLeadersArea(null)}>
          <div className="mod-modal" style={{maxWidth:680,width:"95%",maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// BUSINESS AREAS //</span><h3 className="mod-modal__title">{leadersArea.area_name} — <span>{t("business_areas.leaders_title")}</span></h3></div>
              <button className="mod-modal__close" onClick={()=>setLeadersArea(null)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{flex:1,overflowY:"auto"}}>
              <div style={{marginBottom:16,padding:"12px 14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(192,132,252,0.15)",borderRadius:4}}>
                <div style={{fontSize:10,color:"#7899b0",marginBottom:10}}>{t("business_areas.leaders_add")}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
                  <div className="mod-field"><label className="mod-field__label">{t("business_areas.leaders_company")} *</label>
                    <select className="mod-select" value={leaderForm.company_id} onChange={e=>{setLeaderForm(p=>({...p,company_id:e.target.value,stakeholder_id:""}));loadStakeholders(e.target.value);}}>
                      <option value="">— {t("business_areas.leaders_select_company")} —</option>
                      {userCompanies.map(c=><option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="mod-field"><label className="mod-field__label">{t("business_areas.leaders_stakeholder")} *</label>
                    <select className="mod-select" value={leaderForm.stakeholder_id} onChange={e=>setLeaderForm(p=>({...p,stakeholder_id:e.target.value}))}>
                      <option value="">— {t("business_areas.leaders_select_stakeholder")} —</option>
                      {stakeholders.map(s=><option key={s.stakeholder_id} value={String(s.stakeholder_id)}>{s.full_name}{s.position_title?` — ${s.position_title}`:""}</option>)}
                    </select>
                  </div>
                  <div className="mod-field"><label className="mod-field__label">{t("business_areas.leaders_level")}</label>
                    <select className="mod-select" value={leaderForm.leadership_level} onChange={e=>setLeaderForm(p=>({...p,leadership_level:e.target.value}))}>
                      {LEADERSHIP_LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="mod-field"><label className="mod-field__label">{t("business_areas.leaders_start")}</label>
                    <input className="mod-input" type="date" value={leaderForm.started_at} onChange={e=>setLeaderForm(p=>({...p,started_at:e.target.value}))}/>
                  </div>
                  <div className="mod-field" style={{gridColumn:"1 / -1"}}><label className="mod-field__label">{t("business_areas.leaders_reports_to")} <span style={{color:"#555",fontWeight:400}}>({t("business_areas.optional")})</span></label>
                    <select className="mod-select" value={leaderForm.reports_to_leader_id} onChange={e=>setLeaderForm(p=>({...p,reports_to_leader_id:e.target.value}))}>
                      <option value="">— {t("business_areas.leaders_no_superior")} —</option>
                      {currentLeaders.filter(l=>String(l.stakeholder_id)!==leaderForm.stakeholder_id).map(l=><option key={l.id} value={String(l.id)}>{l.stakeholder_name} ({l.leadership_level}) — {l.company_name}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn-icon" style={{marginTop:8}} onClick={handleAddLeader} disabled={savingLeader||!leaderForm.company_id||!leaderForm.stakeholder_id}>
                  {savingLeader?t("business_areas.leaders_saving"):t("business_areas.leaders_btn_add")}
                </button>
              </div>

              {/* View toggle */}
              <div style={{display:"flex",gap:4,marginBottom:12,alignItems:"center"}}>
                <div style={{fontSize:10,color:"#7899b0",flex:1}}>{t("business_areas.leaders_current",{count:currentLeaders.length})}</div>
                {currentLeaders.length>0&&(
                  <>
                    <button className={`btn-icon ${leadersView==="grid"?"influence-btn--active":""}`} style={{fontSize:9}} onClick={()=>setLeadersView("grid")}>{t("business_areas.view_list")}</button>
                    <button className={`btn-icon ${leadersView==="org"?"influence-btn--active":""}`} style={{fontSize:9,display:"flex",alignItems:"center",gap:4}} onClick={()=>setLeadersView("org")}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="5" y="0" width="6" height="4" rx="1" fill="currentColor" opacity="0.9"/><rect x="0" y="10" width="6" height="4" rx="1" fill="currentColor" opacity="0.9"/><rect x="10" y="10" width="6" height="4" rx="1" fill="currentColor" opacity="0.9"/><line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.2"/><line x1="3" y1="8" x2="3" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="13" y1="8" x2="13" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg>
                      ORG
                    </button>
                  </>
                )}
              </div>
              {currentLeaders.length===0&&<div style={{color:"#7899b0",fontSize:11,marginBottom:12}}>{t("business_areas.leaders_empty")}</div>}

              {/* LIST VIEW */}
              {leadersView==="grid"&&(()=>{
                const leaderIdSet=new Set(currentLeaders.map(l=>l.id));
                const leafLeaders=currentLeaders.filter(l=>!currentLeaders.some(other=>other.reports_to_leader_id===l.id));
                const buildChain=(l:AreaLeader):AreaLeader[]=>{
                  if(!l.reports_to_leader_id||!leaderIdSet.has(l.reports_to_leader_id))return[];
                  const parent=currentLeaders.find(p=>p.id===l.reports_to_leader_id);
                  if(!parent)return[];return[...buildChain(parent),parent];
                };
                const leafWithDepth=leafLeaders.map(l=>({l,depth:buildChain(l).length}));
                const maxDepth=Math.max(...leafWithDepth.map(x=>x.depth));
                const deepestLeaves=leafWithDepth.filter(x=>x.depth===maxDepth).map(x=>x.l);
                return(
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                    {deepestLeaves.map(l=>{
                      const chain=buildChain(l);
                      return(
                        <div key={l.id} style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(192,132,252,0.2)",borderLeft:`3px solid ${LEVEL_COLOR}`,borderRadius:4}}>
                          {chain.length>0&&(
                            <div style={{fontSize:8,color:"#555",marginBottom:6,display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                              {chain.map((c,i)=>(
                                <span key={c.id} style={{display:"flex",gap:4,alignItems:"center"}}>
                                  <span style={{color:"#7899b0"}}>{c.stakeholder_name}</span>
                                  <span style={{fontSize:7,color:"#c084fc44",padding:"0 2px",border:"1px solid #c084fc22",borderRadius:2}}>{c.leadership_level}</span>
                                  {i<chain.length-1&&<span style={{color:"#333"}}>›</span>}
                                  <span style={{color:"#333"}}>›</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontSize:9,color:"#00d4ff",letterSpacing:1}}>{l.company_name}</div>
                              <div style={{display:"flex",gap:4,alignItems:"center",marginTop:3}}>
                                <span style={{fontSize:7,padding:"1px 5px",background:"#c084fc18",border:"1px solid #c084fc44",borderRadius:2,color:LEVEL_COLOR}}>{l.leadership_level}</span>
                                <span style={{fontSize:11,fontWeight:700,color:"#c8dce8"}}>◆ {l.stakeholder_name}</span>
                              </div>
                              {l.stakeholder_role&&<div style={{fontSize:8,color:"#7899b0",marginTop:1}}>{l.stakeholder_role}</div>}
                              {l.started_at&&<div style={{fontSize:7,color:"#555",marginTop:1}}>{t("business_areas.leaders_since")} {l.started_at}</div>}
                            </div>
                            <div style={{display:"flex",gap:3}}>
                              <button className="btn-icon" style={{fontSize:8}} title={t("business_areas.leaders_end_confirm")} onClick={()=>handleEndLeader(l.id)}>⏹</button>
                              <button className="btn-icon btn-icon--danger" style={{fontSize:8}} onClick={()=>handleEndLeader(l.id)}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {leadersView==="org"&&currentLeaders.length>0&&<OrgChart leaders={currentLeaders}/>}

              {histLeaders.length>0&&(
                <div>
                  <button className="btn-icon" style={{fontSize:9,marginBottom:8}} onClick={()=>setShowHistory(v=>!v)}>
                    {showHistory?t("business_areas.leaders_history_hide",{count:histLeaders.length}):t("business_areas.leaders_history_show",{count:histLeaders.length})}
                  </button>
                  {showHistory&&histLeaders.map(l=>(
                    <div key={l.id} style={{padding:"6px 10px",background:"rgba(255,255,255,0.01)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:4,marginBottom:5,opacity:0.6}}>
                      <div style={{fontSize:9,color:"#7899b0"}}>{l.company_name} · {l.leadership_level}</div>
                      <div style={{fontSize:10,color:"#7899b0"}}>◆ {l.stakeholder_name}</div>
                      <div style={{fontSize:7,color:"#555"}}>{l.started_at} → {l.ended_at}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setLeadersArea(null)}>{t("business_areas.btn_close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ORG CHART MODAL (standalone, no ADD form) ── */}
      {orgChartModal&&(
        <div className="mod-overlay" onClick={()=>setOrgChartModal(null)}>
          <div className="mod-modal" style={{maxWidth:560,width:"95%",maxHeight:"80vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// ORGANOGRAMA //</span>
                <h3 className="mod-modal__title">{orgChartModal.area_name} <span style={{fontSize:12,color:"#7899b0",fontWeight:400}}>· {orgChartModal.area_type}</span></h3>
              </div>
              <button className="mod-modal__close" onClick={()=>setOrgChartModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body" style={{flex:1,overflowY:"auto"}}>
              {orgChartLeaders.filter(l=>l.is_current).length===0
                ?<div style={{color:"#7899b0",fontSize:11,textAlign:"center",padding:"20px 0"}}>{t("business_areas.leaders_empty")}</div>
                :<OrgChart leaders={orgChartLeaders.filter(l=>l.is_current)}/>
              }
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setOrgChartModal(null)}>{t("business_areas.btn_close")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AREA CRUD MODAL ── */}
      {modal&&(
        <div className="mod-overlay" onClick={()=>setModal(null)}>
          <div className="mod-modal" style={{maxWidth:600}} onClick={e=>e.stopPropagation()}>
            <div className="mod-modal__header">
              <div><span className="mod-modal__eyebrow">// BUSINESS AREAS //</span><h3 className="mod-modal__title">{modal==="new"?t("business_areas.modal_new"):t("business_areas.modal_edit")} <span>{t("business_areas.modal_subtitle")}</span></h3></div>
              <button className="mod-modal__close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="mod-modal__body">
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"0 12px"}}>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.field_name")} *</label>
                  <input className="mod-input" value={form.area_name} onChange={e=>setForm(p=>({...p,area_name:e.target.value}))} placeholder={t("business_areas.placeholder_name")}/>
                </div>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.field_color")}</label>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={form.area_color||"#00e5cc"} onChange={e=>setForm(p=>({...p,area_color:e.target.value}))} style={{width:36,height:36,border:"1px solid #1e3a52",borderRadius:4,cursor:"pointer",background:"none",padding:2}}/>
                    <input className="mod-input" style={{width:90}} value={form.area_color} onChange={e=>setForm(p=>({...p,area_color:e.target.value}))} placeholder="#00e5cc"/>
                  </div>
                </div>
              </div>
              <div className="mod-field"><label className="mod-field__label">{t("business_areas.field_description")}</label>
                <textarea className="mod-textarea" style={{minHeight:60}} value={form.area_description} onChange={e=>setForm(p=>({...p,area_description:e.target.value}))} placeholder={t("business_areas.placeholder_description")}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px"}}>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.field_type")}</label>
                  <select className="mod-select" value={form.area_type} onChange={e=>setForm(p=>({...p,area_type:e.target.value}))}>
                    {AREA_TYPES.map(ty=><option key={ty} value={ty}>{t(`business_areas.type_${ty.toLowerCase()}`)}</option>)}
                  </select>
                </div>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.area_parent")}</label>
                  <select className="mod-select" value={form.parent_area_id} onChange={e=>{const pid=e.target.value;const parent=areas.find(a=>String(a.id)===pid);setForm(p=>({...p,parent_area_id:pid,level:parent?Math.min(parent.level+1,3):0}));}}>
                    <option value="">{t("business_areas.area_root")}</option>
                    {areas.filter(a=>editing?a.id!==editing.id:true).map(a=><option key={a.id} value={String(a.id)}>{"\u00a0".repeat(a.level*2)}{a.area_name}</option>)}
                  </select>
                </div>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.area_level")}</label>
                  <input className="mod-input" type="number" min={0} max={5} value={form.level} onChange={e=>setForm(p=>({...p,level:Number(e.target.value)}))}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.field_order")}</label>
                  <input className="mod-input" type="number" min={0} value={form.display_order} onChange={e=>setForm(p=>({...p,display_order:Number(e.target.value)}))}/>
                </div>
                <div className="mod-field"><label className="mod-field__label">{t("business_areas.field_active")}</label>
                  <select className="mod-select" value={String(form.is_active)} onChange={e=>setForm(p=>({...p,is_active:e.target.value==="true"}))}>
                    <option value="true">{t("business_areas.status_active")}</option>
                    <option value="false">{t("business_areas.status_inactive")}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={()=>setModal(null)}>{t("business_areas.btn_cancel")}</button>
              <button className="btn-save" onClick={save} disabled={saving}>{saving?t("business_areas.btn_saving"):t("business_areas.btn_save")}</button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
