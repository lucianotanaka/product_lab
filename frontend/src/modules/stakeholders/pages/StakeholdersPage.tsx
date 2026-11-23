import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { useCompany } from "../../../contexts/CompanyContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import type { Paginated } from "../../../shared/services/api";

interface StakeholderProduct { id:number;product_id:number;role?:string;influence:number;interest:number;is_active:boolean;created_at:string; }
interface StakeholderArea { id:number;company_id:number;company_name:string;business_area_id:number;area_name:string;area_type:string;area_color?:string;role_in_area?:string;leadership_level?:string;is_active:boolean;is_current:boolean;started_at?:string; }
interface Stakeholder { stakeholder_id:number;full_name:string;position_title?:string;company_id?:number;email?:string;notes?:string;is_active:boolean;created_at:string;updated_at:string;products:StakeholderProduct[];areas:StakeholderArea[]; }
interface AreaMembership { id:number;company_id:number;company_name:string;business_area_id:number;area_name:string;area_type:string;area_color?:string;role_in_area?:string;leadership_level?:string;is_active:boolean;is_current:boolean;started_at?:string; }
interface CompanyAreaOption { id:number;business_area_id:number;area_name:string;area_type:string;area_color?:string; }

const EMPTY = { full_name:"",position_title:"",company_id:"",email:"",notes:"" };
const TCOLORS:Record<string,string> = { STRATEGIC:"#c084fc",OPERATIONAL:"#00d4ff",SUPPORT:"#00ff88",TECHNOLOGY:"#00e5cc",COMMERCIAL:"#ff9900" };
const quadrant = (i:number,t:number) => {
  if(i>=3&&t>=3) return{label:"GERENCIE DE PERTO",color:"#ff6b6b"};
  if(i>=3&&t<3)  return{label:"MANTENHA SATISFEITO",color:"#ff9900"};
  if(i<3&&t>=3)  return{label:"MANTENHA INFORMADO",color:"#00d4ff"};
  return{label:"MONITORE",color:"#7899b0"};
};

export default function StakeholdersPage() {
  const { t } = useTranslation();
  const { companies:userCompanies } = useCompany();
  const [productId,setProductId] = useState(localStorage.getItem("pl_product")??"");
  const [items,setItems]   = useState<Stakeholder[]>([]);
  const [total,setTotal]   = useState(0);
  const [page,setPage]     = useState(1);
  const [loading,setLoading] = useState(false);
  const [error,setError]     = useState("");
  const [filterCo,setFilterCo] = useState("");
  const SIZE=20, pid = productId?parseInt(productId,10):undefined;
  const [products,setProducts] = useState<{product_id:number;name:string}[]>([]);
  const [modal,setModal]     = useState<"create"|"edit"|null>(null);
  const [editing,setEditing] = useState<Stakeholder|null>(null);
  const [saving,setSaving]   = useState(false);
  const [tab,setTab]         = useState<"data"|"areas"|"products">("data");
  const [form,setForm]       = useState({...EMPTY});
  const [areaMems,setAreaMems]   = useState<AreaMembership[]>([]);
  const [coAreas,setCoAreas]     = useState<CompanyAreaOption[]>([]);
  const [areaLeaders,setAreaLeaders] = useState<{id:number;stakeholder_name:string;leadership_level:string}[]>([]);
  const [aForm,setAForm]         = useState({
    company_id:"", business_area_id:"", participation_type:"MEMBER",
    started_at:"", ended_at:"", reports_to_member_id:"", notes:""
  });
  const [savingA,setSavingA]     = useState(false);
  const [editingAreaId,setEditingAreaId] = useState<number|null>(null);
  const [editAreaForm,setEditAreaForm]   = useState({participation_type:"MEMBER",reports_to_member_id:"",started_at:"",ended_at:""});
  const [savingEditArea,setSavingEditArea] = useState(false);
  const [editAreaLeaders,setEditAreaLeaders] = useState<{id:number;stakeholder_name:string;leadership_level:string}[]>([]);
  const [aProd,setAProd]         = useState("");
  const [aRole,setARole]         = useState("");
  const [aInf,setAInf]           = useState(3);
  const [aInt,setAInt]           = useState(3);
  const [aSaving,setASaving]     = useState(false);
  const [editAssocId,setEditAssocId] = useState<number|null>(null);
  const [eInf,setEInf]   = useState(3);
  const [eInt,setEInt]   = useState(3);
  const [eRole,setERole] = useState("");
  const [eSaving,setESaving] = useState(false);

  useEffect(()=>{ apiGet<{total:number;items:{product_id:number;name:string}[]}>("/products?size=100").then(r=>setProducts(r.items)).catch(()=>{}); },[]);

  const load = async(p=page,oPid?:number|null)=>{
    setLoading(true);setError("");
    try{
      const ep=oPid===null?undefined:(oPid??pid);
      let qs=`page=${p}&size=${SIZE}`;
      if(ep) qs+=`&product_id=${ep}`;
      if(filterCo) qs+=`&company_id=${filterCo}`;
      const r=await apiGet<Paginated<Stakeholder>>(`/stakeholders?${qs}`);
      setItems(r.items);setTotal(r.total);
    }catch(e:unknown){setError(e instanceof Error?e.message:t("stakeholders.err_load"));}
    finally{setLoading(false);}
  };
  useEffect(()=>{load(1);setPage(1);},[productId,filterCo]);
  useEffect(()=>{load();},[page]);

  const loadMems = useCallback(async(sid:number)=>{
    try{setAreaMems(await apiGet<AreaMembership[]>(`/stakeholders/${sid}/areas`));}
    catch{setAreaMems([]);}
  },[]);
  const loadCoAreas = useCallback(async(cid:string)=>{
    if(!cid){setCoAreas([]);return;}
    try{setCoAreas((await apiGet<CompanyAreaOption[]>(`/companies/${cid}/areas`))??[]);}
    catch{setCoAreas([]);}
  },[]);
  const refreshEdit = async(s:Stakeholder)=>{
    const u=await apiGet<Stakeholder>(`/stakeholders/${s.stakeholder_id}`);
    setEditing(u);setItems(p=>p.map(x=>x.stakeholder_id===u.stakeholder_id?u:x));return u;
  };

  const EMPTY_AFORM = {company_id:"",business_area_id:"",participation_type:"MEMBER",started_at:"",ended_at:"",reports_to_member_id:"",notes:""};
  const LEADERSHIP_LEVELS = ["DIRECTOR","MANAGER","COORDINATOR","SUPERVISOR","LEAD"];
  const isLeaderRole = (pt:string) => LEADERSHIP_LEVELS.includes(pt);

  const loadAreaLeaders = useCallback(async(cid:string, baId:string)=>{
    if(!cid||!baId){setAreaLeaders([]);return;}
    try{
      const r = await apiGet<{id:number;stakeholder_name:string;leadership_level:string}[]>(
        `/companies/${cid}/area-members?area_id=${baId}&leaders_only=true&current_only=true`
      );
      setAreaLeaders(r??[]);
    }catch{setAreaLeaders([]);}
  },[]);

  const openCreate=()=>{setForm({...EMPTY});setEditing(null);setTab("data");setAreaMems([]);setCoAreas([]);setAreaLeaders([]);setAForm({...EMPTY_AFORM});setAProd("");setARole("");setAInf(3);setAInt(3);setModal("create");};
  const openEdit=(item:Stakeholder)=>{
    setForm({full_name:item.full_name,position_title:item.position_title??"",company_id:item.company_id?String(item.company_id):"",email:item.email??"",notes:item.notes??""});
    setEditing(item);setTab("data");setAForm({...EMPTY_AFORM,company_id:item.company_id?String(item.company_id):""});
    setAProd("");setARole("");setAInf(3);setAInt(3);setEditAssocId(null);
    setAreaLeaders([]);
    loadMems(item.stakeholder_id);if(item.company_id)loadCoAreas(String(item.company_id));
    setModal("edit");
  };
  const closeModal=()=>{setModal(null);setEditing(null);};
  const switchTab=(tb:"data"|"areas"|"products")=>{if(tb!=="data"&&!editing)return;setTab(tb);if(tb==="areas"&&editing)loadMems(editing.stakeholder_id);};

  const handleSave=async()=>{
    if(!form.full_name.trim())return;setSaving(true);
    try{
      const payload={full_name:form.full_name,position_title:form.position_title||null,company_id:form.company_id?Number(form.company_id):null,email:form.email||null,notes:form.notes||null,is_active:true};
      if(modal==="create"){
        const c=await apiPost<Stakeholder>("/stakeholders",payload);
        setEditing(c);setItems(p=>[c,...p]);setTotal(p=>p+1);
        setModal("edit");setTab("areas");loadMems(c.stakeholder_id);
        if(form.company_id){loadCoAreas(form.company_id);setAForm(f=>({...f,company_id:form.company_id}));}
      }else if(editing){await apiPatch(`/stakeholders/${editing.stakeholder_id}`,payload);await refreshEdit(editing);}
    }catch(e:unknown){setError(e instanceof Error?e.message:t("stakeholders.err_save"));}
    finally{setSaving(false);}
  };

  const handleDelete=async(id:number)=>{
    if(!confirm(t("stakeholders.confirm_delete")))return;
    try{await apiDelete(`/stakeholders/${id}`);load(page);}
    catch(e:unknown){setError(e instanceof Error?e.message:t("stakeholders.err_delete"));}
  };

  const addArea=async()=>{
    if(!editing||!aForm.company_id||!aForm.business_area_id)return;setSavingA(true);
    const isLeader=isLeaderRole(aForm.participation_type);
    try{
      await apiPost(`/stakeholders/${editing.stakeholder_id}/areas`,{
        company_id:Number(aForm.company_id),
        business_area_id:Number(aForm.business_area_id),
        role_in_area: isLeader ? aForm.participation_type : (aForm.participation_type==="MEMBER"?"Membro":aForm.participation_type),
        leadership_level: isLeader ? aForm.participation_type : null,
        started_at: aForm.started_at||null,
        ended_at: aForm.ended_at||null,
        reports_to_member_id: aForm.reports_to_member_id?Number(aForm.reports_to_member_id):null,
        notes: aForm.notes||null,
      });
      await loadMems(editing.stakeholder_id);
      setAForm(f=>({...f,business_area_id:"",participation_type:"MEMBER",started_at:"",ended_at:"",reports_to_member_id:"",notes:""}));
      setAreaLeaders([]);
    }
    catch{/**/}finally{setSavingA(false);}
  };
  const toggleAreaActive=async(m:AreaMembership)=>{
    if(!editing)return;
    try{
      await apiPatch(`/stakeholders/${editing.stakeholder_id}/areas/${m.id}`,{is_active:!m.is_active});
      await loadMems(editing.stakeholder_id);
    }catch{/**/}
  };

  const openEditArea=(m:AreaMembership)=>{
    setEditingAreaId(m.id);
    const pt=m.leadership_level||"MEMBER";
    setEditAreaForm({participation_type:pt,reports_to_member_id:"",started_at:m.started_at??"",ended_at:""});
    if(m.business_area_id&&m.company_id)
      apiGet<{id:number;stakeholder_name:string;leadership_level:string}[]>(
        `/companies/${m.company_id}/area-members?area_id=${m.business_area_id}&leaders_only=true&current_only=true`
      ).then(r=>setEditAreaLeaders(r??[])).catch(()=>setEditAreaLeaders([]));
  };

  const saveEditArea=async(m:AreaMembership)=>{
    if(!editing)return;setSavingEditArea(true);
    const isLeader=LEADERSHIP_LEVELS.includes(editAreaForm.participation_type);
    try{
      await apiPatch(`/stakeholders/${editing.stakeholder_id}/areas/${m.id}`,{
        role_in_area: isLeader ? editAreaForm.participation_type : (editAreaForm.participation_type==="MEMBER"?"Membro":editAreaForm.participation_type),
        leadership_level: isLeader ? editAreaForm.participation_type : null,
        reports_to_member_id: editAreaForm.reports_to_member_id?Number(editAreaForm.reports_to_member_id):null,
        started_at: editAreaForm.started_at||null,
        ended_at: editAreaForm.ended_at||null,
        is_current: !editAreaForm.ended_at,
      });
      await loadMems(editing.stakeholder_id);
      setEditingAreaId(null);setEditAreaLeaders([]);
    }catch{/**/}finally{setSavingEditArea(false);}
  };

  const addProd=async()=>{
    if(!editing||!aProd)return;setASaving(true);
    try{await apiPost(`/stakeholders/${editing.stakeholder_id}/products`,{product_id:parseInt(aProd,10),role:aRole||null,influence:aInf,interest:aInt});await refreshEdit(editing);setAProd("");setARole("");setAInf(3);setAInt(3);}
    catch{/**/}finally{setASaving(false);}
  };
  const startEdit=(p:StakeholderProduct)=>{setEditAssocId(p.id);setEInf(p.influence);setEInt(p.interest);setERole(p.role??"");};
  const saveEdit=async(p:StakeholderProduct)=>{
    if(!editing)return;setESaving(true);
    try{await apiPatch(`/stakeholders/${editing.stakeholder_id}/products/${p.product_id}`,{influence:eInf,interest:eInt,role:eRole||null});await refreshEdit(editing);setEditAssocId(null);}
    catch{/**/}finally{setESaving(false);}
  };
  const toggleProd=async(p:StakeholderProduct)=>{
    if(!editing)return;
    try{await apiPatch(`/stakeholders/${editing.stakeholder_id}/products/${p.product_id}`,{is_active:!p.is_active});await refreshEdit(editing);}catch{/**/}
  };

  const resolveCo=(item:Stakeholder)=>{if(item.company_id){const c=userCompanies.find(c=>c.id===item.company_id);if(c)return c.company_name;}return"—";};
  const getQ=(item:Stakeholder)=>{
    if(pid){const a=item.products.find(p=>p.product_id===pid&&p.is_active);if(a)return quadrant(a.influence,a.interest);}
    const f=item.products.find(p=>p.is_active);return f?quadrant(f.influence,f.interest):quadrant(3,3);
  };
  const pName=(id:number)=>products.find(p=>p.product_id===id)?.name??`#${id}`;
  const areaNames=(item:Stakeholder)=>{
    const names=[...new Set((item.areas??[]).filter(a=>a.is_active).map(a=>a.area_name).filter(Boolean))];
    return names;
  };
  const avail=products.filter(p=>!editing?.products.some(sp=>sp.product_id===p.product_id&&sp.is_active));
  const coName=filterCo?userCompanies.find(c=>String(c.id)===filterCo)?.company_name:null;
  const isSaved=!!editing;

  const tabStyle=(active:boolean)=>({fontSize:9,padding:"4px 10px",background:active?"rgba(0,212,255,0.15)":"transparent",border:`1px solid ${active?"rgba(0,212,255,0.5)":"rgba(0,212,255,0.15)"}`,color:active?"#00d4ff":"#7899b0",cursor:"pointer",opacity:(!active&&!isSaved&&tab==="data")?0.4:1} as React.CSSProperties);

  return (
    <ModuleLayout moduleIcon="◉" moduleName={t("stakeholders.module_name")} moduleAccent={t("stakeholders.module_accent")}
      selectedProductId={productId} onProductChange={id=>{localStorage.setItem("pl_product",id);setProductId(id);}}>

      <div className="mod-header">
        <div className="mod-header__left">
          <span className="mod-header__eyebrow">{t("stakeholders.eyebrow")}</span>
          <h1 className="mod-header__title">{t("stakeholders.title")} <span>{t("stakeholders.title_accent")}</span></h1>
          <p className="mod-header__meta">{t("stakeholders.meta",{count:total})}{coName&&<span style={{color:"#00d4ff",marginLeft:10}}>| {coName}</span>}</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select className="mod-select" style={{fontSize:10,minWidth:160}} value={filterCo} onChange={e=>{setFilterCo(e.target.value);setPage(1);}}>
            <option value="">{t("stakeholders.filter_all_companies")}</option>
            {userCompanies.map(c=><option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
          </select>
          <button className="btn-add" onClick={openCreate}>{t("stakeholders.btn_new")}</button>
        </div>
      </div>
      {error&&<div className="mod-error">⚠ {error}</div>}

      {/* LIST */}
      <div className="mod-table-wrap">
        {loading?<div className="mod-loading">{t("stakeholders.loading")}</div>
        :items.length===0?(
          <div className="mod-empty"><div className="mod-empty__icon">◉</div><div className="mod-empty__title">{t("stakeholders.empty_title")}</div><div className="mod-empty__sub">{t("stakeholders.empty_sub")}</div></div>
        ):(
          <table className="mod-table">
            <thead><tr><th>{t("stakeholders.col_name")}</th><th>{t("stakeholders.col_position")}</th><th>{t("stakeholders.col_company")}</th><th>{t("stakeholders.col_areas")}</th><th>{t("stakeholders.col_products")}</th><th>{t("stakeholders.col_quadrant")}</th><th>{t("stakeholders.col_email")}</th><th></th></tr></thead>
            <tbody>
              {items.map(item=>{
                const q=getQ(item);
                const activeProds=item.products.filter(p=>p.is_active);
                const activeAreas=areaNames(item);
                return(
                  <tr key={item.stakeholder_id}>
                    <td><strong>{item.full_name}</strong></td>
                    <td style={{color:"#7899b0"}}>{item.position_title||"—"}</td>
                    <td style={{fontSize:11,color:"#c8dce8"}}>{resolveCo(item)}</td>
                    <td>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {activeAreas.length===0?<span style={{color:"#7899b0",fontSize:10}}>—</span>
                          :activeAreas.map(name=><span key={name} style={{fontSize:9,letterSpacing:1,color:"#c8dce8",border:"1px solid rgba(120,153,176,0.3)",padding:"1px 5px"}}>{name}</span>)}
                      </div>
                    </td>
                    <td>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {activeProds.length===0?<span style={{color:"#7899b0",fontSize:10}}>—</span>
                          :activeProds.map(p=><span key={p.product_id} style={{fontSize:9,letterSpacing:1,color:"#00d4ff",border:"1px solid rgba(0,212,255,0.3)",padding:"1px 5px"}}>{pName(p.product_id)}</span>)}
                      </div>
                    </td>
                    <td><span style={{fontSize:9,letterSpacing:1,color:q.color,border:`1px solid ${q.color}40`,padding:"2px 6px"}}>{q.label}</span></td>
                    <td style={{color:"#7899b0"}}>{item.email||"—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" onClick={()=>openEdit(item)}>{t("stakeholders.btn_edit")}</button>
                        <button className="btn-icon btn-icon--danger" onClick={()=>handleDelete(item.stakeholder_id)}>{t("stakeholders.btn_del")}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {total>SIZE&&(
          <div className="mod-pagination">
            <span>{(page-1)*SIZE+1}–{Math.min(page*SIZE,total)} de {total}</span>
            <div className="mod-pagination__btns">
              <button className="btn-page" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t("stakeholders.btn_prev")}</button>
              <button className="btn-page" disabled={page*SIZE>=total} onClick={()=>setPage(p=>p+1)}>{t("stakeholders.btn_next")}</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal&&(
        <div className="mod-overlay" onClick={closeModal}>
          <div className="mod-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:660,width:"95%",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
            <div className="mod-modal__header">
              <div>
                <span className="mod-modal__eyebrow">// STAKEHOLDER //</span>
                <h3 className="mod-modal__title">{modal==="create"?t("stakeholders.modal_new"):t("stakeholders.modal_edit")} <span>STAKEHOLDER</span></h3>
                {editing&&<div style={{fontSize:9,color:"#7899b0",marginTop:2}}>{editing.full_name}</div>}
              </div>
              <button className="mod-modal__close" onClick={closeModal}>✕</button>
            </div>

            {/* TABS */}
            <div style={{display:"flex",gap:4,padding:"8px 24px",borderBottom:"1px solid rgba(0,212,255,0.12)"}}>
              <button style={tabStyle(tab==="data")} onClick={()=>switchTab("data")}>{t("stakeholders.tab_data")}</button>
              <button style={{...tabStyle(tab==="areas"),opacity:isSaved?1:0.35,cursor:isSaved?"pointer":"not-allowed"}} onClick={()=>switchTab("areas")}>
                {t("stakeholders.tab_areas")}{areaMems.length>0?` (${areaMems.length})`:""}
              </button>
              <button style={{...tabStyle(tab==="products"),opacity:isSaved?1:0.35,cursor:isSaved?"pointer":"not-allowed"}} onClick={()=>switchTab("products")}>
                {t("stakeholders.tab_products")}{editing&&editing.products.length>0?` (${editing.products.length})`:""}
              </button>
              {!isSaved&&<span style={{fontSize:8,color:"#555",marginLeft:6,alignSelf:"center"}}>{t("stakeholders.save_first_hint")}</span>}
            </div>

            <div className="mod-modal__body" style={{flex:1,overflowY:"auto"}}>

              {/* TAB: DADOS */}
              {tab==="data"&&(
                <div>
                  <div className="mod-field-row">
                    <div className="mod-field">
                      <label className="mod-field__label">{t("stakeholders.field_full_name")} <span>*</span></label>
                      <input className="mod-input" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder={t("stakeholders.placeholder_full_name")} />
                    </div>
                    <div className="mod-field">
                      <label className="mod-field__label">{t("stakeholders.field_position")}</label>
                      <input className="mod-input" value={form.position_title} onChange={e=>setForm(f=>({...f,position_title:e.target.value}))} placeholder={t("stakeholders.placeholder_position")} />
                    </div>
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("stakeholders.field_company")}</label>
                    <select className="mod-select" value={form.company_id} onChange={e=>{setForm(f=>({...f,company_id:e.target.value}));loadCoAreas(e.target.value);setAForm(f=>({...f,company_id:e.target.value,business_area_id:""}));}}>
                      <option value="">{t("stakeholders.select_company")}</option>
                      {userCompanies.map(c=><option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("stakeholders.field_email")}</label>
                    <input className="mod-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder={t("stakeholders.placeholder_email")} />
                  </div>
                  <div className="mod-field">
                    <label className="mod-field__label">{t("stakeholders.field_notes")}</label>
                    <textarea className="mod-textarea" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder={t("stakeholders.placeholder_notes")} />
                  </div>
                </div>
              )}

              {/* TAB: ÁREAS */}
              {tab==="areas"&&editing&&(
                <div>
                  <div style={{marginBottom:14,padding:"10px 14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,212,255,0.1)",borderRadius:4}}>
                    <div style={{fontSize:10,color:"#7899b0",marginBottom:8}}>{t("stakeholders.areas_add_title")}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
                      <div className="mod-field">
                        <label className="mod-field__label">{t("stakeholders.areas_add_company")}</label>
                        <select className="mod-select" value={aForm.company_id} onChange={e=>{setAForm(f=>({...f,company_id:e.target.value,business_area_id:""}));loadCoAreas(e.target.value);}}>
                          <option value="">{t("stakeholders.areas_select_company")}</option>
                          {userCompanies.map(c=><option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
                        </select>
                      </div>
                      <div className="mod-field">
                        <label className="mod-field__label">{t("stakeholders.areas_add_area")}</label>
                        <select className="mod-select" value={aForm.business_area_id} onChange={e=>{const v=e.target.value;setAForm(f=>({...f,business_area_id:v,reports_to_member_id:""}));if(v&&aForm.company_id)loadAreaLeaders(aForm.company_id,v);else setAreaLeaders([]);}} disabled={!aForm.company_id}>
                          <option value="">{aForm.company_id?(coAreas.length>0?t("stakeholders.areas_select_area"):t("stakeholders.areas_no_areas")):t("stakeholders.areas_select_company_first")}</option>
                          {coAreas.map(a=><option key={a.id} value={String(a.business_area_id)}>{a.area_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mod-field" style={{marginTop:6}}>
                      <label className="mod-field__label">{t("stakeholders.areas_type_label")}</label>
                      <select className="mod-select" value={aForm.participation_type}
                        onChange={e=>setAForm(f=>({...f,participation_type:e.target.value,reports_to_member_id:""}))}>
                        <option value="MEMBER">{t("stakeholders.areas_type_member")}</option>
                        <option value="LEAD">LEAD</option>
                        <option value="COORDINATOR">COORDINATOR</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="DIRECTOR">DIRECTOR</option>
                      </select>
                    </div>
                    <div className="mod-field" style={{marginTop:4}}>
                      <label className="mod-field__label">{t("stakeholders.areas_reports_to")} <span style={{color:"#555",fontWeight:400}}>{t("stakeholders.areas_reports_to_hint")}</span></label>
                      <select className="mod-select" value={aForm.reports_to_member_id} onChange={e=>setAForm(f=>({...f,reports_to_member_id:e.target.value}))} disabled={!aForm.business_area_id}>
                        <option value="">{t("stakeholders.areas_no_superior")}</option>
                        {areaLeaders.map(l=><option key={l.id} value={String(l.id)}>{l.stakeholder_name} ({l.leadership_level})</option>)}
                      </select>
                      {areaLeaders.length===0&&aForm.business_area_id&&<div style={{fontSize:8,color:"#555",marginTop:2}}>{t("stakeholders.areas_no_leaders_yet")}</div>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginTop:4}}>
                      <div className="mod-field">
                        <label className="mod-field__label">{t("stakeholders.areas_started_at")}</label>
                        <input className="mod-input" type="date" value={aForm.started_at} onChange={e=>setAForm(f=>({...f,started_at:e.target.value}))} />
                      </div>
                      <div className="mod-field">
                        <label className="mod-field__label">{t("stakeholders.areas_ended_at")} <span style={{color:"#555",fontWeight:400}}>{t("stakeholders.areas_ended_at_hint")}</span></label>
                        <input className="mod-input" type="date" value={aForm.ended_at} onChange={e=>setAForm(f=>({...f,ended_at:e.target.value}))} />
                        {aForm.ended_at&&<div style={{fontSize:8,color:"#ff9900",marginTop:2}}>{t("stakeholders.areas_is_current_warn")}</div>}
                      </div>
                    </div>
                    <button className="btn-icon" style={{marginTop:8}} onClick={addArea} disabled={savingA||!aForm.company_id||!aForm.business_area_id}>
                      {savingA?t("stakeholders.areas_saving"):t("stakeholders.areas_add_btn")}
                    </button>
                  </div>
                  {areaMems.length===0?<div style={{color:"#7899b0",fontSize:11,textAlign:"center",padding:"12px 0"}}>{t("stakeholders.areas_empty")}</div>:(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {areaMems.map(m=>{
                        const accent=m.area_color||TCOLORS[m.area_type]||"#7899b0";
                        return(
                          <div key={m.id} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:`1px solid ${accent}33`,borderLeft:`3px solid ${accent}`,borderRadius:4}}>
                            {editingAreaId===m.id?(
                              <div>
                                <div style={{fontSize:9,fontWeight:700,color:"#c8dce8",marginBottom:6}}>{m.area_name} <span style={{color:accent,fontWeight:400,fontSize:8}}>· EDITANDO</span></div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 10px"}}>
                                  <div className="mod-field">
                                    <label className="mod-field__label" style={{fontSize:8}}>TIPO</label>
                                    <select className="mod-select" value={editAreaForm.participation_type} onChange={e=>setEditAreaForm(f=>({...f,participation_type:e.target.value,reports_to_member_id:""}))}>
                                      <option value="MEMBER">MEMBRO</option>
                                      {LEADERSHIP_LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div className="mod-field">
                                    <label className="mod-field__label" style={{fontSize:8}}>REPORTA PARA</label>
                                    <select className="mod-select" value={editAreaForm.reports_to_member_id} onChange={e=>setEditAreaForm(f=>({...f,reports_to_member_id:e.target.value}))}>
                                      <option value="">— Sem superior —</option>
                                      {editAreaLeaders.filter(l=>l.id!==m.id).map(l=><option key={l.id} value={String(l.id)}>{l.stakeholder_name} ({l.leadership_level})</option>)}
                                    </select>
                                  </div>
                                  <div className="mod-field">
                                    <label className="mod-field__label" style={{fontSize:8}}>INÍCIO</label>
                                    <input className="mod-input" type="date" value={editAreaForm.started_at} onChange={e=>setEditAreaForm(f=>({...f,started_at:e.target.value}))} style={{padding:"4px 6px"}}/>
                                  </div>
                                  <div className="mod-field">
                                    <label className="mod-field__label" style={{fontSize:8}}>FIM</label>
                                    <input className="mod-input" type="date" value={editAreaForm.ended_at} onChange={e=>setEditAreaForm(f=>({...f,ended_at:e.target.value}))} style={{padding:"4px 6px"}}/>
                                  </div>
                                </div>
                                <div style={{display:"flex",gap:6,marginTop:8}}>
                                  <button className="btn-icon" style={{fontSize:9}} onClick={()=>{setEditingAreaId(null);setEditAreaLeaders([]);}}>CANCELAR</button>
                                  <button className="btn-save" style={{padding:"4px 10px",fontSize:9}} onClick={()=>saveEditArea(m)} disabled={savingEditArea}>{savingEditArea?"...":"SALVAR ⟩"}</button>
                                </div>
                              </div>
                            ):(
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",opacity:m.is_active?1:0.5}}>
                                <div>
                                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                    <div style={{fontSize:11,fontWeight:700,color:"#c8dce8"}}>{m.area_name}</div>
                                    {!m.is_active&&<span style={{fontSize:8,color:"#7899b0",border:"1px solid rgba(120,153,176,0.4)",padding:"1px 5px",letterSpacing:1}}>INATIVO</span>}
                                    {!m.is_current&&m.is_active&&<span style={{fontSize:8,color:"#ff9900",border:"1px solid rgba(255,153,0,0.4)",padding:"1px 5px",letterSpacing:1}}>ENCERRADO</span>}
                                  </div>
                                  <div style={{fontSize:8,color:accent,letterSpacing:1}}>{m.company_name} · {m.area_type}</div>
                                  {m.role_in_area&&m.role_in_area!==m.leadership_level&&<div style={{fontSize:9,color:"#7899b0",marginTop:1}}>{m.role_in_area}</div>}
                                  {m.leadership_level&&<div style={{fontSize:8,color:"#c084fc",marginTop:1}}>◆ {m.leadership_level}</div>}
                                  {m.started_at&&<div style={{fontSize:7,color:"#555",marginTop:2}}>desde {m.started_at}</div>}
                                </div>
                                <div style={{display:"flex",gap:4}}>
                                  {m.is_active&&<button className="btn-icon" style={{fontSize:8}} onClick={()=>openEditArea(m)}>✎</button>}
                                  <button
                                    title={m.is_active?t("stakeholders.btn_deactivate"):t("stakeholders.btn_activate")}
                                    style={{
                                      background: m.is_active?"rgba(255,80,80,0.12)":"rgba(0,180,80,0.12)",
                                      border:`1px solid ${m.is_active?"rgba(255,80,80,0.4)":"rgba(0,180,80,0.4)"}`,
                                      borderRadius:3,cursor:"pointer",fontSize:10,lineHeight:1,
                                      padding:"3px 6px",color:m.is_active?"#ff5050":"#00c853",
                                      letterSpacing:1,fontWeight:700,
                                    }}
                                    onClick={()=>toggleAreaActive(m)}
                                  >{m.is_active?"⏻":"↺"}</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: PRODUTOS */}
              {tab==="products"&&editing&&(
                <div>
                  <div style={{marginBottom:12}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
                      <div className="mod-field" style={{flex:2}}>
                        <label className="mod-field__label">{t("stakeholders.products_select_label")}</label>
                        <select className="mod-select" value={aProd} onChange={e=>setAProd(e.target.value)}>
                          <option value="">{t("stakeholders.products_select")}</option>
                          {avail.map(p=><option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="mod-field" style={{width:60}}>
                        <label className="mod-field__label">INF</label>
                        <select className="mod-select" value={aInf} onChange={e=>setAInf(Number(e.target.value))}>
                          {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="mod-field" style={{width:60}}>
                        <label className="mod-field__label">INT</label>
                        <select className="mod-select" value={aInt} onChange={e=>setAInt(Number(e.target.value))}>
                          {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <button className="btn-save" style={{padding:"8px 12px"}} onClick={addProd} disabled={aSaving||!aProd}>
                        {aSaving?"...":t("stakeholders.btn_add")}
                      </button>
                    </div>
                    <div className="mod-field" style={{marginTop:4}}>
                      <label className="mod-field__label">{t("stakeholders.products_role_label")}</label>
                      <input className="mod-input" value={aRole} onChange={e=>setARole(e.target.value)} placeholder={t("stakeholders.products_role_placeholder")} />
                    </div>
                  </div>
                  {editing.products.length===0
                    ?<div style={{color:"#7899b0",fontSize:11,textAlign:"center",padding:"12px 0"}}>{t("stakeholders.products_empty")}</div>
                    :(
                      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                        {editing.products.map(p=>{
                          const q=quadrant(p.influence,p.interest);
                          const isE=editAssocId===p.id;
                          const inact=!p.is_active;
                          return(
                            <div key={p.id} style={{padding:"8px 10px",background:inact?"rgba(0,10,20,0.4)":"rgba(0,20,40,0.6)",border:`1px solid ${inact?"rgba(120,153,176,0.15)":"rgba(0,212,255,0.15)"}`,opacity:inact?0.6:1,fontSize:11,borderRadius:3}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isE?8:0}}>
                                <span style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                  <span style={{color:"#00d4ff"}}>{pName(p.product_id)}</span>
                                  {inact&&<span style={{fontSize:9,color:"#7899b0",border:"1px solid rgba(120,153,176,0.4)",padding:"1px 5px"}}>INATIVO</span>}
                                  {!isE&&<><span style={{color:"#7899b0",fontSize:9}}>INF {p.influence} · INT {p.interest}</span><span style={{color:q.color,fontSize:9}}>— {q.label}</span></>}
                                  {!isE&&p.role&&<span style={{color:"#7899b0"}}>{p.role}</span>}
                                </span>
                                <span style={{display:"flex",gap:5,flexShrink:0}}>
                                  {!inact&&!isE&&<button className="btn-icon" style={{padding:"2px 8px",fontSize:9}} onClick={()=>startEdit(p)}>EDITAR</button>}
                                  {isE&&<><button className="btn-icon" style={{padding:"2px 8px",fontSize:9}} onClick={()=>setEditAssocId(null)} disabled={eSaving}>✕</button><button className="btn-save" style={{padding:"2px 8px",fontSize:9}} onClick={()=>saveEdit(p)} disabled={eSaving}>{eSaving?"...":"OK"}</button></>}
                                  <button className={inact?"btn-save":"btn-icon"} style={{padding:"2px 8px",fontSize:9,...(inact?{background:"rgba(0,180,80,0.15)",borderColor:"rgba(0,180,80,0.4)",color:"#00c853"}:{})}} onClick={()=>toggleProd(p)}>{inact?"ATIVAR":"INATIVAR"}</button>
                                </span>
                              </div>
                              {isE&&(
                                <div style={{display:"flex",gap:8,alignItems:"flex-end",marginTop:4}}>
                                  <div className="mod-field" style={{flex:1}}><label className="mod-field__label" style={{fontSize:9}}>INF</label><select className="mod-select" value={eInf} onChange={e=>setEInf(Number(e.target.value))} style={{padding:"4px 6px"}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                                  <div className="mod-field" style={{flex:1}}><label className="mod-field__label" style={{fontSize:9}}>INT</label><select className="mod-select" value={eInt} onChange={e=>setEInt(Number(e.target.value))} style={{padding:"4px 6px"}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                                  <div className="mod-field" style={{flex:3}}><label className="mod-field__label" style={{fontSize:9}}>PAPEL</label><input className="mod-input" value={eRole} onChange={e=>setERole(e.target.value)} placeholder="Product Owner..." style={{padding:"4px 8px"}}/></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
              )}
            </div>

            <div className="mod-modal__footer">
              <button className="btn-cancel" onClick={closeModal}>{t("stakeholders.btn_cancel")}</button>
              {tab==="data"&&(
                <button className="btn-save" onClick={handleSave} disabled={saving||!form.full_name.trim()}>
                  {saving?t("stakeholders.btn_saving"):t("stakeholders.btn_save")}
                </button>
              )}
              {tab!=="data"&&<button className="btn-cancel" onClick={closeModal}>{t("stakeholders.btn_close")}</button>}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
