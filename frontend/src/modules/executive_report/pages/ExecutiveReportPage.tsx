/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import { useProduct } from "../../../contexts/ProductContext";
import ModuleLayout from "../../../shared/components/ModuleLayout";
import { apiGet } from "../../../shared/services/api";

interface KPIs { total_active_opportunities:number; validated_opportunities:number; decisions_accepted:number; decisions_pending:number; roadmap_items_active:number; risks_open:number; attention_items:number; business_cases_approved:number; business_cases_in_review:number; charters_in_execution:number; }
interface FunnelItem { stage:string; count:number; }
interface SourceItem { source:string; count:number; }
interface DecisionPending { id:string; title:string; context:string; status:string; decided_by:string|null; decision_date:string|null; created_at:string|null; }
interface RoadmapItemData { id:string; title:string; type:string|null; quarter:string|null; status:string|null; executive_status:string; executive_summary:string; executive_next_step:string; executive_owner_name:string|null; executive_risk_dependency:string; committed_deadline:string|null; attention_flag:boolean; attention_reason:string|null; }
interface OpportunityData { id:string; title:string; status:string|null; journey_stage:string|null; }
interface BusinessCaseData { id:string; status:string|null; go_no_go_recommendation:string|null; estimated_cost:string|null; estimated_effort:string|null; approved_by:number|null; approved_at:string|null; }
interface CharterData { id:string; status:string|null; sponsor_name:string|null; project_manager_name:string|null; success_criteria:string; budget_summary:string; }
interface DecisionData { id:string; title:string; status:string|null; decided_by:string|null; decision_date:string|null; }
interface PrioritizationData { id:string; priority_rank:number|null; quarter_score:number; business_value:number; time_criticality:number; risk_reduction:number; delivery_risk:number; dependency_readiness:number; confidence:number; planning_status:string; fiscal_year:number|null; quarter:string|null; }
interface RisksData { total:number; open:number; mitigated:number; accepted:number; max_score:number; critical:Array<{id:string;title:string;risk_score:number;status:string|null;responsible:string|null}>; }
interface Initiative { roadmap_item:RoadmapItemData; opportunity:OpportunityData|null; business_case:BusinessCaseData|null; project_charter:CharterData|null; decision:DecisionData|null; prioritization:PrioritizationData|null; risks:RisksData; }
interface QuarterRankItem { roadmap_item_id:string; roadmap_item_title:string; priority_rank:number|null; quarter_score:number; business_value:number; time_criticality:number; risk_reduction:number; delivery_risk:number; dependency_readiness:number; confidence:number; estimated_effort:number; planning_status:string; }
interface ReportData { kpis:KPIs; opportunity_funnel:FunnelItem[]; source_breakdown:SourceItem[]; governance:{decisions_pending:DecisionPending[]}; roadmap_status:{by_executive_status:Record<string,number>;attention_count:number}; roadmap_initiatives:Initiative[]; quarter_prioritization:QuarterRankItem[]; risks_summary:{total:number;open:number;mitigated:number;accepted:number;closed:number}; }

const EXEC_COLOR:Record<string,string> = { on_track:"#00ff88", attention:"#f59e0b", blocked:"#ef4444", waiting_owner:"#c084fc", completed:"#00d4ff", not_started:"#64748b" };
const BC_COLOR:Record<string,string> = { approved:"#00ff88", in_review:"#f59e0b", draft:"#64748b", rejected:"#ef4444" };
const CH_COLOR:Record<string,string> = { in_execution:"#00ff88", approved:"#00d4ff", draft:"#64748b", on_hold:"#f59e0b", closed:"#64748b" };

const pill = (label:string, color:string) => (
  <span style={{fontSize:9,fontWeight:700,letterSpacing:1,padding:"2px 8px",borderRadius:10,background:`${color}22`,border:`1px solid ${color}55`,color,whiteSpace:"nowrap",display:"inline-block"}}>{label.toUpperCase().replace(/_/g," ")}</span>
);

function KpiCard({label,value,color="#00d4ff",warn=false}:{label:string;value:number;color?:string;warn?:boolean}) {
  const c = warn && value > 0 ? "#ef4444" : color;
  return (
    <div style={{flex:"1 1 120px",minWidth:100,background:"rgba(255,255,255,0.03)",border:`1px solid ${c}33`,borderRadius:8,padding:"12px 14px",display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontSize:24,fontWeight:700,color:c,fontFamily:"var(--font-mono)",lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:1.5,lineHeight:1.4}}>{label}</div>
    </div>
  );
}

function Bar({label,count,max}:{label:string;count:number;max:number}) {
  const pct = max > 0 ? Math.max((count/max)*100, count>0?5:0) : 0;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
      <div style={{width:72,fontSize:9,color:"#7899b0",letterSpacing:1,textAlign:"right",flexShrink:0}}>{label.toUpperCase()}</div>
      <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:3,height:20}}>
        <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#00d4ff88,#00e5cccc)",borderRadius:3,transition:"width 0.5s"}}/>
      </div>
      <div style={{width:22,fontSize:10,color:"rgba(255,255,255,0.4)",textAlign:"right"}}>{count}</div>
    </div>
  );
}

export default function ExecutiveReportPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const {productId,productName,setProduct} = useProduct();
  const yr = new Date().getFullYear();
  const [fiscalYear,setFiscalYear] = useState(yr);
  const [quarter,setQuarter] = useState("");
  const [data,setData] = useState<ReportData|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [expanded,setExpanded] = useState<string|null>(null);

  const load = useCallback(async()=>{
    if(!productId) return;
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({product_id:productId});
      if(fiscalYear) p.set("fiscal_year",String(fiscalYear));
      if(quarter) p.set("quarter",quarter);
      setData(await apiGet<ReportData>(`/executive-report/summary?${p}`));
    } catch { setError("Erro ao carregar relatório executivo."); }
    finally { setLoading(false); }
  },[productId,fiscalYear,quarter]);

  useEffect(()=>{load();},[load]);

  const maxF = data ? Math.max(...data.opportunity_funnel.map(f=>f.count),1) : 1;
  const card:React.CSSProperties = {background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"18px 22px",marginBottom:18};
  const th:React.CSSProperties = {fontSize:9,color:"#7899b0",letterSpacing:1.5,fontWeight:600,padding:"6px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",textAlign:"left" as const,whiteSpace:"nowrap"};
  const td:React.CSSProperties = {fontSize:11,color:"#c8dce8",padding:"8px 10px",borderBottom:"1px solid rgba(255,255,255,0.04)",verticalAlign:"middle"};

  return (
    <ModuleLayout
      moduleIcon="◬"
      moduleName={t("nav.overview")}
      moduleAccent=""
      selectedProductId={productId}
      onProductChange={(id) => {
        const nextProduct = id ? (productName && id === productId ? { name: productName } : null) : null;
        setProduct(id, nextProduct?.name ?? "");
      }}
      extraSelectorOptions={[]}
    >
      <div style={{minHeight:"100vh",background:"#060a14",color:"#c8dce8",fontFamily:"var(--font-body)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"24px 24px 60px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:9,color:"#7899b0",letterSpacing:2}}>{"// EXECUTIVE REPORT //"}</span>
              <span style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"var(--font-mono)"}}>OPPORTUNITIES × ROADMAP</span>
              {productName && <span style={{fontSize:11,color:"#00d4ff",padding:"2px 8px",background:"rgba(0,212,255,0.08)",border:"1px solid rgba(0,212,255,0.2)",borderRadius:4}}>{productName}</span>}
              {isAdmin && (
                <button
                  onClick={() => navigate("/home", { state: { scrollTo: "admin" } })}
                  style={{background:"none",border:"1px solid rgba(255,153,0,0.3)",color:"#ff9900",fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:1,padding:"4px 10px",borderRadius:2,cursor:"pointer"}}
                >
                  {t("nav.admin")}
                </button>
              )}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
              <select value={fiscalYear} onChange={e=>setFiscalYear(Number(e.target.value))} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#c8dce8",fontFamily:"var(--font-mono)",fontSize:10,padding:"4px 8px",borderRadius:2,cursor:"pointer"}}>
                {[yr-1,yr,yr+1].map(y=><option key={y} value={y} style={{background:"#111827"}}>FY{y}</option>)}
              </select>
              <select value={quarter} onChange={e=>setQuarter(e.target.value)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#c8dce8",fontFamily:"var(--font-mono)",fontSize:10,padding:"4px 8px",borderRadius:2,cursor:"pointer"}}>
                <option value="" style={{background:"#111827"}}>— QUARTER —</option>
                {["Q1","Q2","Q3","Q4"].map(q=><option key={q} value={q} style={{background:"#111827"}}>{q}</option>)}
              </select>
              <button onClick={load} style={{background:"rgba(0,212,255,0.1)",border:"1px solid rgba(0,212,255,0.3)",color:"#00d4ff",fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:1,padding:"4px 12px",borderRadius:2,cursor:"pointer"}}>
                {loading ? "..." : "↻ ATUALIZAR"}
              </button>
            </div>
          </div>
        {!productId && <div style={{textAlign:"center",padding:"80px 20px",color:"#7899b0",fontSize:13}}>Selecione um produto para visualizar o relatório executivo.</div>}
        {error && <div style={{padding:14,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,color:"#ef4444",fontSize:12,marginBottom:16}}>{error}</div>}
        {loading && !data && <div style={{textAlign:"center",padding:"60px 20px",color:"#7899b0",letterSpacing:3,fontSize:11}}>CARREGANDO RELATÓRIO EXECUTIVO...</div>}

        {data && <>

          {/* ── A: KPI CARDS ───────────────────────────────────────────────── */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:22}}>
            <KpiCard label="OPPS ATIVAS" value={data.kpis.total_active_opportunities} />
            <KpiCard label="VALIDADAS" value={data.kpis.validated_opportunities} color="#00ff88" />
            <KpiCard label="DECISÕES ACEITAS" value={data.kpis.decisions_accepted} color="#00e5cc" />
            <KpiCard label="DECISÕES PENDENTES" value={data.kpis.decisions_pending} warn />
            <KpiCard label="NO ROADMAP" value={data.kpis.roadmap_items_active} color="#c084fc" />
            <KpiCard label="BC APROVADOS" value={data.kpis.business_cases_approved} color="#00ff88" />
            <KpiCard label="EM EXECUÇÃO" value={data.kpis.charters_in_execution} color="#00d4ff" />
            <KpiCard label="RISCOS ABERTOS" value={data.kpis.risks_open} warn />
            <KpiCard label="ATENÇÃO 🔴" value={data.kpis.attention_items} warn />
          </div>

          {/* ── B: FUNIL + STATUS ──────────────────────────────────────────── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
            <div style={card}>
              <div style={{fontSize:9,color:"#7899b0",letterSpacing:2,marginBottom:12}}>{"// FUNIL DE OPORTUNIDADES //"}</div>
              {data.opportunity_funnel.map(f=><Bar key={f.stage} label={f.stage} count={f.count} max={maxF}/>)}
            </div>
            <div style={card}>
              <div style={{fontSize:9,color:"#7899b0",letterSpacing:2,marginBottom:12}}>{"// STATUS DO ROADMAP //"}</div>
              {Object.entries(data.roadmap_status.by_executive_status).map(([k,v])=>(
                <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:10,color:EXEC_COLOR[k]||"#7899b0"}}>{k.toUpperCase().replace(/_/g," ")}</span>
                  <span style={{fontSize:14,fontWeight:700,color:EXEC_COLOR[k]||"#7899b0",fontFamily:"var(--font-mono)"}}>{v}</span>
                </div>
              ))}
              {data.kpis.attention_items > 0 && (
                <div style={{marginTop:10,padding:"6px 10px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:4,fontSize:10,color:"#ef4444"}}>
                  🔴 {data.kpis.attention_items} iniciativa(s) precisam de atenção
                </div>
              )}
            </div>
          </div>

          {/* ── C: GOVERNANÇA ─────────────────────────────────────────────── */}
          {data.governance.decisions_pending.length > 0 && (
            <div style={{...card,borderColor:"rgba(245,158,11,0.3)"}}>
              <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,marginBottom:12}}>{"// DECISÕES PENDENTES DE APROVAÇÃO //"}</div>
              {data.governance.decisions_pending.map(d=>(
                <div key={d.id} style={{padding:"10px 12px",background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:4,marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#fff",marginBottom:4}}>{d.title}</div>
                  {d.context && <div style={{fontSize:10,color:"#7899b0",marginBottom:4}}>{d.context}</div>}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {pill(d.status,"#f59e0b")}
                    {d.created_at && <span style={{fontSize:9,color:"#7899b0"}}>criado: {d.created_at.slice(0,10)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── D: INICIATIVAS DO ROADMAP ──────────────────────────────────── */}
          <div style={card}>
            <div style={{fontSize:9,color:"#c084fc",letterSpacing:2,marginBottom:12}}>{"// INICIATIVAS × OPORTUNIDADES — RASTREABILIDADE COMPLETA //"}</div>
            {data.roadmap_initiatives.length === 0 && (
              <div style={{textAlign:"center",padding:"30px 0",color:"#7899b0",fontSize:11}}>Nenhuma iniciativa encontrada para os filtros selecionados.</div>
            )}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr>
                    <th style={th}>INICIATIVA</th>
                    <th style={th}>QUARTER</th>
                    <th style={th}>STATUS</th>
                    <th style={th}>OPORTUNIDADE</th>
                    <th style={th}>BC</th>
                    <th style={th}>CHARTER</th>
                    <th style={th}>DECISÃO</th>
                    <th style={th}>RANK</th>
                    <th style={th}>RISCOS</th>
                    <th style={th}>OWNER</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roadmap_initiatives.map(ini=>{
                    const ri = ini.roadmap_item;
                    const isExp = expanded === ri.id;
                    return <>
                      <tr key={ri.id} onClick={()=>setExpanded(isExp?null:ri.id)} style={{cursor:"pointer",background:ri.attention_flag?"rgba(239,68,68,0.04)":undefined}}>
                        <td style={{...td,maxWidth:220}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                            {ri.attention_flag && <span style={{color:"#ef4444",flexShrink:0,fontSize:10}}>🔴</span>}
                            <div>
                              <div style={{fontWeight:600,color:"#fff",fontSize:12,lineHeight:1.3}}>{ri.title}</div>
                              {ri.type && <div style={{fontSize:9,color:"#64748b",marginTop:2}}>{ri.type.replace(/_/g," ")}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={td}><span style={{fontSize:10,color:"#c084fc",fontFamily:"var(--font-mono)"}}>{ri.quarter||"—"}</span></td>
                        <td style={td}>{pill(ri.executive_status, EXEC_COLOR[ri.executive_status]||"#64748b")}</td>
                        <td style={{...td,maxWidth:160}}>
                          {ini.opportunity ? (
                            <div>
                              <div style={{fontSize:11,color:"#c8dce8",lineHeight:1.3}}>{ini.opportunity.title.slice(0,50)}{ini.opportunity.title.length>50?"…":""}</div>
                              {ini.opportunity.status && <span style={{fontSize:9,color:"#7899b0"}}>{ini.opportunity.status.replace(/_/g," ")}</span>}
                            </div>
                          ) : <span style={{color:"#64748b",fontSize:9}}>—</span>}
                        </td>
                        <td style={td}>{ini.business_case ? pill(ini.business_case.status||"draft", BC_COLOR[ini.business_case.status||"draft"]||"#64748b") : <span style={{color:"#64748b",fontSize:9}}>—</span>}</td>
                        <td style={td}>{ini.project_charter ? pill(ini.project_charter.status||"draft", CH_COLOR[ini.project_charter.status||"draft"]||"#64748b") : <span style={{color:"#64748b",fontSize:9}}>—</span>}</td>
                        <td style={td}>{ini.decision ? pill(ini.decision.status||"proposed","#00e5cc") : <span style={{color:"#64748b",fontSize:9}}>—</span>}</td>
                        <td style={td}><span style={{fontSize:12,fontWeight:700,color:"#c084fc",fontFamily:"var(--font-mono)"}}>{ini.prioritization?.priority_rank??""}</span></td>
                        <td style={td}>
                          {ini.risks.total > 0 ? (
                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                              {ini.risks.open > 0 && <span style={{fontSize:9,color:"#ef4444",fontWeight:700}}>{ini.risks.open}🔴</span>}
                              {ini.risks.mitigated > 0 && <span style={{fontSize:9,color:"#00ff88"}}>{ini.risks.mitigated}✓</span>}
                            </div>
                          ) : <span style={{color:"#64748b",fontSize:9}}>0</span>}
                        </td>
                        <td style={{...td,fontSize:10,color:"#7899b0"}}>{ri.executive_owner_name||"—"}</td>
                      </tr>
                      {isExp && (
                        <tr key={`${ri.id}-exp`}>
                          <td colSpan={10} style={{padding:"12px 16px",background:"rgba(192,132,252,0.04)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,fontSize:11}}>
                              {ri.executive_summary && <div><div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>RESUMO EXECUTIVO</div><div style={{color:"#c8dce8",lineHeight:1.5}}>{ri.executive_summary}</div></div>}
                              {ri.executive_next_step && <div><div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>PRÓXIMO PASSO</div><div style={{color:"#00ff88",lineHeight:1.5}}>{ri.executive_next_step}</div></div>}
                              {ri.executive_risk_dependency && <div><div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>RISCO / DEPENDÊNCIA</div><div style={{color:"#f59e0b",lineHeight:1.5}}>{ri.executive_risk_dependency}</div></div>}
                              {ri.committed_deadline && <div><div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>DEADLINE</div><div style={{color:"#c8dce8"}}>{ri.committed_deadline.slice(0,10)}</div></div>}
                              {ini.business_case?.go_no_go_recommendation && <div><div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>GO/NO-GO</div><div style={{color:"#00ff88",lineHeight:1.5}}>{ini.business_case.go_no_go_recommendation}</div></div>}
                              {ini.project_charter?.sponsor_name && <div><div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>PATROCINADOR</div><div style={{color:"#c8dce8"}}>{ini.project_charter.sponsor_name}</div></div>}
                              {ini.prioritization && (
                                <div>
                                  <div style={{fontSize:9,color:"#7899b0",marginBottom:4}}>WSJF / QUARTER SCORE</div>
                                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                                    <span style={{color:"#c084fc"}}>BV: {ini.prioritization.business_value.toFixed(1)}</span>
                                    <span style={{color:"#c084fc"}}>TC: {ini.prioritization.time_criticality.toFixed(1)}</span>
                                    <span style={{color:"#c084fc"}}>RR: {ini.prioritization.risk_reduction.toFixed(1)}</span>
                                    <span style={{color:"#f59e0b"}}>DR: {ini.prioritization.delivery_risk.toFixed(1)}</span>
                                    <span style={{fontWeight:700,color:"#00d4ff"}}>Score: {ini.prioritization.quarter_score.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                              {ini.risks.critical.length > 0 && (
                                <div>
                                  <div style={{fontSize:9,color:"#ef4444",marginBottom:4}}>RISCOS CRÍTICOS</div>
                                  {ini.risks.critical.map(r=>(
                                    <div key={r.id} style={{fontSize:10,color:"#ef4444",marginBottom:2}}>⚠ {r.title} (score: {r.risk_score})</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── E: QUARTER PRIORITIZATION ──────────────────────────────────── */}
          {data.quarter_prioritization.length > 0 && (
            <div style={card}>
              <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,marginBottom:12}}>{"// QUARTER PRIORITIZATION — RANKING EXECUTIVO //"}</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      <th style={th}>#</th><th style={th}>INICIATIVA</th><th style={th}>SCORE</th>
                      <th style={th}>BV</th><th style={th}>TC</th><th style={th}>RR</th>
                      <th style={th}>DR</th><th style={th}>CONF</th><th style={th}>ESFORÇO</th><th style={th}>PLAN STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quarter_prioritization.map((q,i)=>(
                      <tr key={q.roadmap_item_id}>
                        <td style={{...td,fontWeight:700,color:"#f59e0b",fontFamily:"var(--font-mono)"}}>{q.priority_rank??i+1}</td>
                        <td style={{...td,fontWeight:600,color:"#fff",maxWidth:200}}>{q.roadmap_item_title}</td>
                        <td style={{...td,fontWeight:700,color:"#00d4ff",fontFamily:"var(--font-mono)"}}>{q.quarter_score.toFixed(2)}</td>
                        <td style={td}>{q.business_value.toFixed(1)}</td>
                        <td style={td}>{q.time_criticality.toFixed(1)}</td>
                        <td style={td}>{q.risk_reduction.toFixed(1)}</td>
                        <td style={{...td,color:q.delivery_risk>5?"#ef4444":"#c8dce8"}}>{q.delivery_risk.toFixed(1)}</td>
                        <td style={{...td,color:q.confidence>7?"#00ff88":"#c8dce8"}}>{q.confidence.toFixed(1)}</td>
                        <td style={td}>{q.estimated_effort.toFixed(1)}</td>
                        <td style={td}>{pill(q.planning_status,q.planning_status==="candidate"?"#64748b":q.planning_status==="committed"?"#00ff88":"#f59e0b")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── F: RISCOS ──────────────────────────────────────────────────── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:18}}>
            {[
              {label:"TOTAL RISCOS",value:data.risks_summary.total,color:"#c8dce8"},
              {label:"ABERTOS",value:data.risks_summary.open,color:"#ef4444",warn:true},
              {label:"MITIGADOS",value:data.risks_summary.mitigated,color:"#00ff88"},
              {label:"ACEITOS",value:data.risks_summary.accepted,color:"#f59e0b"},
              {label:"FECHADOS",value:data.risks_summary.closed,color:"#64748b"},
            ].map(r=>(
              <div key={r.label} style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${r.color}22`,borderRadius:8,padding:"12px 14px",display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontSize:22,fontWeight:700,color:r.warn&&r.value>0?"#ef4444":r.color,fontFamily:"var(--font-mono)"}}>{r.value}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:1.5}}>{r.label}</div>
              </div>
            ))}
          </div>

        </>}
        </div>
      </div>
    </ModuleLayout>
  );
}
