import { Fragment, useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../contexts/AuthContext";
import { useProduct } from "../contexts/ProductContext";
import { useCompany } from "../contexts/CompanyContext";
import { apiGet } from "../shared/services/api";
import ThemeToggle from "../shared/components/ThemeToggle";
import LanguageSelector from "../shared/components/LanguageSelector";
import "../styles/hud.css";
import "../styles/hud-sections.css";
import "../styles/hud-cockpit.css";
import "../styles/hud-responsive.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  product: { product_id: number; name: string; status: string; description?: string };
  metrics: {
    open_risks: number; high_risks: number; backlog_open: number; backlog_total: number;
    decisions_recent: number; stakeholders: number; roadmap_upcoming: number; publications_review: number;
  };
  attention: Array<{ type: string; severity: string; title: string; detail: string; link: string }>;
}

interface SystemStats {
  products: number; decisions: number; knowledge_items: number; risks: number;
  roadmap_items: number; prioritization_items: number; stakeholders: number; vpc_items: number;
  backlog_items: number; product_impacts: number; product_features: number; users: number; communications: number;
}

interface FollowupItem {
  id: string; entity_type: string; entity_id: string;
  action_type: string; description: string;
  assigned_to?: string; due_date?: string; status: string; notes?: string;
}
interface FollowupSummary {
  pending: number; overdue: number; due_today: number; due_this_week: number;
  overdue_items: FollowupItem[]; due_soon_items: FollowupItem[];
}

interface AIConnectionOption {
  id: string;
  name: string;
  provider: string;
  scope: string;
  product_id?: number | null;
  company_id?: number | null;
  is_active: boolean;
}

const MODULE_ROUTES: Record<string, string> = {
  dashboard: "/modules/products", knowledge: "/modules/knowledge", decisions: "/modules/decisions",
  roadmap: "/modules/roadmap", prioritization: "/modules/prioritization", risks: "/modules/risks",
  stakeholders: "/modules/stakeholders", backlog: "/modules/backlog",
  communication: "/modules/communication",
  ai_agent: "/modules/ai-agent",
  vpc: "/modules/vpc",
  discovery: "/modules/discovery",
  requirements: "/modules/requirements",
  process_mapping: "/modules/process-mapping",
  meetings: "/modules/meetings",
  raci: "/modules/raci",
  followups: "/modules/followups",
  business_domains: "/modules/business-domains",
  executive_report: "/modules/executive-report",
};

interface Module { id: string; icon: string; status: "ATIVO" | "SYNC" | "STANDBY"; color: string; }

const MODULES: Module[] = [
  { id: "backlog",        icon: "◫", status: "ATIVO",   color: "#ff9900" },
  { id: "roadmap",        icon: "⬢", status: "ATIVO",   color: "#00d4ff" },
  { id: "prioritization", icon: "◇", status: "SYNC",    color: "#00e5cc" },
  { id: "risks",          icon: "△", status: "ATIVO",   color: "#ff9900" },
  { id: "decisions",      icon: "◎", status: "ATIVO",   color: "#00ff88" },
  { id: "stakeholders",   icon: "◉", status: "ATIVO",   color: "#00ff88" },
  { id: "communication",  icon: "◈", status: "ATIVO",   color: "#c084fc" },
  { id: "ai_agent",       icon: "◉", status: "ATIVO",   color: "#00d4ff" },
  { id: "knowledge",      icon: "◈", status: "ATIVO",   color: "#00e5cc" },
  { id: "vpc",            icon: "⬡", status: "ATIVO",   color: "#c084fc" },
  { id: "discovery",      icon: "◎", status: "ATIVO",   color: "#00e5cc" },
  { id: "requirements",   icon: "◫", status: "ATIVO",   color: "#00e5cc" },
  { id: "process_mapping",icon: "⊞", status: "ATIVO",   color: "#c084fc" },
  { id: "meetings",       icon: "◷", status: "ATIVO",   color: "#00d4ff" },
  { id: "raci",           icon: "◈", status: "ATIVO",   color: "#ff9900" },
  { id: "followups",      icon: "⊙", status: "ATIVO",   color: "#f59e0b" },
  { id: "business_domains", icon: "◈", status: "ATIVO", color: "#a78bfa" },
];

const DEFAULT_MODULE_ORDER = MODULES.map(m => m.id);
const MODULE_MAP = Object.fromEntries(MODULES.map(m => [m.id, m]));

// ─── Science SVG Icons ────────────────────────────────────────────────────────
function OrbitalRingIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color} strokeWidth="1.5" opacity="0.9"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color} strokeWidth="1.5" opacity="0.9" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color} strokeWidth="1.5" opacity="0.9" transform="rotate(120 12 12)"/>
      <circle cx="12" cy="12" r="2.5" fill={color} opacity="0.9"/>
    </svg>
  );
}
function CrystalHexIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" stroke={color} strokeWidth="1.5" fill="none" opacity="0.9"/>
      <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="0.8" opacity="0.5"/>
      <line x1="3" y1="7" x2="21" y2="17" stroke={color} strokeWidth="0.8" opacity="0.5"/>
      <line x1="21" y1="7" x2="3" y2="17" stroke={color} strokeWidth="0.8" opacity="0.5"/>
      <circle cx="12" cy="12" r="2" fill={color} opacity="0.8"/>
    </svg>
  );
}
function PlasmaArcIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12 Q8 4 12 8 Q16 12 12 16 Q8 20 12 12" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M10 6 L20 12 L10 18 L13 12 Z" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2" opacity="0.9"/>
    </svg>
  );
}
function NeuralWaveIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 12 Q4 6 6 12 Q8 18 10 12 Q12 6 14 12 Q16 18 18 12 Q20 6 22 12" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9"/>
      <circle cx="6" cy="12" r="1.5" fill={color} opacity="0.7"/>
      <circle cx="12" cy="12" r="1.5" fill={color} opacity="0.7"/>
      <circle cx="18" cy="12" r="1.5" fill={color} opacity="0.7"/>
    </svg>
  );
}
function HelixMoleculeIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 4 Q12 8 19 4" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9"/>
      <path d="M5 12 Q12 8 19 12" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9"/>
      <path d="M5 20 Q12 16 19 20" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9"/>
      <line x1="5" y1="4" x2="5" y2="20" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="19" y1="4" x2="19" y2="20" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <circle cx="5" cy="12" r="2" fill={color} opacity="0.8"/>
      <circle cx="19" cy="12" r="2" fill={color} opacity="0.8"/>
    </svg>
  );
}

// ─── Circular Gauge (Cockpit Metrics — Stage 4) ───────────────────────────────
function CircularGauge({ value, max = 100, color, icon, label, onClick }: {
  value: number; max?: number; color: string; icon: string; label: string; onClick: () => void;
}) {
  const r = 30; const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = circ * pct;
  return (
    <button className="cockpit-gauge" onClick={onClick}>
      <div className="cockpit-gauge__ring">
        <svg className="cockpit-gauge__svg" viewBox="0 0 72 72">
          <circle className="cockpit-gauge__track" cx="36" cy="36" r={r}/>
          <circle className="cockpit-gauge__arc" cx="36" cy="36" r={r}
            stroke={color}
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset="0"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="cockpit-gauge__center">
          <span className="cockpit-gauge__icon" style={{ color }}>{icon}</span>
          <span className="cockpit-gauge__value" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="cockpit-gauge__label">{label}</span>
    </button>
  );
}

// ─── Module Categories with Science Themes ────────────────────────────────────
const MODULE_CATEGORIES = [
  { id: "discover", scienceId: "astrophysics", scienceLabel: "ASTROFÍSICA", color: "#7c3aed", color2: "#4f46e5", SciIcon: OrbitalRingIcon,     modules: ["discovery", "vpc", "process_mapping"] },
  { id: "define",   scienceId: "quantum",      scienceLabel: "FÍS. QUÂNTICA",color: "#0ea5e9", color2: "#7dd3fc", SciIcon: CrystalHexIcon,      modules: ["requirements", "decisions", "knowledge", "business_domains"] },
  { id: "deliver",  scienceId: "plasma",       scienceLabel: "FÍS. PLASMA",  color: "#f97316", color2: "#fbbf24", SciIcon: PlasmaArcIcon,       modules: ["roadmap", "backlog", "prioritization"] },
  { id: "operate",  scienceId: "neural",       scienceLabel: "NEUROCIÊNCIA", color: "#10b981", color2: "#34d399", SciIcon: NeuralWaveIcon,      modules: ["meetings", "communication", "ai_agent", "stakeholders", "risks", "raci", "followups"] },
  { id: "setup",    scienceId: "molecular",    scienceLabel: "BIO. MOLECULAR",color: "#eab308", color2: "#fde047", SciIcon: HelixMoleculeIcon,  modules: [] },
];

const SEV_COLOR: Record<string, string> = { HIGH: "#ff6b6b", MEDIUM: "#ff9900", LOW: "#00ff88" };
const TYPE_ICON: Record<string, string>  = { RISK: "△", BACKLOG: "◫", PUBLICATION: "◈", DECISION: "◎" };

const ENTITY_LABELS: Record<string, string> = {
  discovery_research: "Research", discovery_opportunity: "Discovery",
  meeting: "Meeting", backlog_item: "Backlog", decision: "Decision",
  risk: "Risk", roadmap_item: "Roadmap", requirement: "Requirement",
  process: "Process",
};
function fmtFollowupDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`;
}
function isFollowupOverdue(due?: string): boolean {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}
function isFollowupToday(due?: string): boolean {
  if (!due) return false;
  return due === new Date().toISOString().split("T")[0];
}

// ─── Particle Canvas (enhanced with hex grid + data streams) ─────────────────
interface Particle { x: number; y: number; vx: number; vy: number; radius: number; opacity: number; type: "dot" | "stream"; }

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let animId: number;
    const particles: Particle[] = [];
    const COUNT = 70; const MAX_D = 140;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    for (let i = 0; i < COUNT; i++) {
      particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-0.5)*0.35, vy: (Math.random()-0.5)*0.35, radius: Math.random()*1.8+0.8, opacity: Math.random()*0.45+0.15, type: i < 8 ? "stream" : "dot" });
    }
    // Hexagonal grid helper
    const drawHexGrid = () => {
      const size = 52; const w = size * Math.sqrt(3); const h = size * 2;
      ctx.strokeStyle = "rgba(0,212,255,0.035)"; ctx.lineWidth = 0.5;
      for (let row = -1; row < Math.ceil(canvas.height/h)+2; row++) {
        for (let col = -1; col < Math.ceil(canvas.width/w)+2; col++) {
          const cx = col * w + (row % 2 === 0 ? 0 : w/2);
          const cy = row * h * 0.75;
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const angle = (Math.PI / 3) * a - Math.PI/6;
            const px = cx + size * Math.cos(angle); const py = cy + size * Math.sin(angle);
            a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
    };
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawHexGrid();
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        if (p.type === "stream") {
          // Data stream: faster horizontal movement, small glowing dash
          p.x += 0.6; if (p.x > canvas.width) p.x = 0;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 12, p.y);
          ctx.strokeStyle = `rgba(0,229,204,${p.opacity * 0.7})`; ctx.lineWidth = 1; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
          ctx.fillStyle = `rgba(0,212,255,${p.opacity})`; ctx.fill();
        }
      });
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].type === "stream") continue;
        for (let j = i+1; j < particles.length; j++) {
          if (particles[j].type === "stream") continue;
          const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < MAX_D) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${(1-d/MAX_D)*0.12})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="pl-canvas" />;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    started.current = false;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let cur = 0; const inc = Math.max(1, target/60);
        const t = setInterval(() => { cur+=inc; if(cur>=target){setCount(target);clearInterval(t);}else setCount(Math.floor(cur)); }, 2000/60);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <div ref={ref} className="stat-value">{count.toLocaleString("pt-BR")}{suffix}</div>;
}

// ─── SciLab Logo — Multi-orbital atom (Physics + Chemistry + Biology + Math) ──
function SciLabLogo({ size = 64 }: { size?: number }) {
  const id = "sl";
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="sci-lab-logo">
      <defs>
        <linearGradient id={`${id}-g1`} x1="-1" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#00ff88"/></linearGradient>
        <linearGradient id={`${id}-g2`} x1="0" y1="-1" x2="0" y2="1"><stop offset="0%" stopColor="#00e5cc"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient>
        <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id={`${id}-glow2`}><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Outer measurement ring with tick marks */}
      <circle r="56" stroke="rgba(0,212,255,0.2)" strokeWidth="0.5" strokeDasharray="3 5"/>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const a = deg * Math.PI/180; const r1 = 49; const r2 = i%3===0 ? 55 : 52;
        return <line key={deg} x1={r1*Math.cos(a)} y1={r1*Math.sin(a)} x2={r2*Math.cos(a)} y2={r2*Math.sin(a)} stroke="rgba(0,212,255,0.4)" strokeWidth={i%3===0?1.5:0.5}/>;
      })}
      {/* Orbital ring 1 — horizontal (Physics: electron orbit) */}
      <ellipse rx="42" ry="14" stroke={`url(#${id}-g1)`} strokeWidth="1" opacity="0.7" filter={`url(#${id}-glow2)`}/>
      {/* Orbital ring 2 — tilted 60° (Chemistry: molecular bond) */}
      <g transform="rotate(60)"><ellipse rx="42" ry="14" stroke="rgba(0,229,204,0.65)" strokeWidth="1" filter={`url(#${id}-glow2)`}/></g>
      {/* Orbital ring 3 — tilted 120° (Biology: helix projection) */}
      <g transform="rotate(120)"><ellipse rx="42" ry="14" stroke="rgba(0,255,136,0.55)" strokeWidth="1" filter={`url(#${id}-glow2)`}/></g>
      {/* Orbiting particles with animateMotion */}
      <circle r="4" fill="#00d4ff" filter={`url(#${id}-glow)`}>
        <animateMotion dur="4s" repeatCount="indefinite" path="M-42,0 A42,14 0 0,1 42,0 A42,14 0 0,1 -42,0"/>
      </circle>
      <g transform="rotate(60)">
        <circle r="3.5" fill="#00e5cc" filter={`url(#${id}-glow)`}>
          <animateMotion dur="5.5s" repeatCount="indefinite" path="M-42,0 A42,14 0 0,1 42,0 A42,14 0 0,1 -42,0"/>
        </circle>
      </g>
      <g transform="rotate(120)">
        <circle r="3" fill="#00ff88" filter={`url(#${id}-glow)`}>
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="0.8s" path="M-42,0 A42,14 0 0,1 42,0 A42,14 0 0,1 -42,0"/>
        </circle>
      </g>
      {/* Nucleus — multi-layer glow */}
      <circle r="14" fill="rgba(0,212,255,0.06)"/>
      <circle r="10" fill="rgba(0,212,255,0.1)"/>
      <circle r="7"  fill="rgba(0,229,204,0.25)" filter={`url(#${id}-glow)`}/>
      <circle r="4.5" fill="rgba(0,212,255,0.6)"  filter={`url(#${id}-glow)`}/>
      <circle r="2.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

// ─── Sortable Module Card ─────────────────────────────────────────────────────
function SortableModuleCard({ mod, onNavigate, statusKey, t }: {
  mod: Module; onNavigate: (path: string) => void;
  statusKey: (s: string) => string; t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) { wasDragging.current = true; }
    else if (wasDragging.current) {
      const id = setTimeout(() => { wasDragging.current = false; }, 150);
      return () => clearTimeout(id);
    }
  }, [isDragging]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.75 : 1, zIndex: isDragging ? 999 : undefined,
    cursor: isDragging ? "grabbing" : undefined, "--card-color": mod.color,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style}
      className={`module-card${isDragging ? " module-card--dragging" : ""}`}
      onClick={() => { if (!wasDragging.current) onNavigate(MODULE_ROUTES[mod.id] ?? "/home"); }}
      {...attributes} {...listeners}
    >
      <div className="module-card__drag" aria-hidden="true">⠿</div>
      <div className="module-card__corner module-card__corner--tl" />
      <div className="module-card__corner module-card__corner--br" />
      <div className="module-card__header">
        <span className="module-card__icon" style={{ color: mod.color }}>{mod.icon}</span>
        <span className={`module-card__status module-card__status--${mod.status.toLowerCase()}`}>
          <span className="module-card__status-dot" />{statusKey(mod.status)}
        </span>
      </div>
      <h3 className="module-card__title">{t(`modules_section.modules.${mod.id}.title`)}</h3>
      <p className="module-card__desc">{t(`modules_section.modules.${mod.id}.desc`)}</p>
      <div className="module-card__footer">
        <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: mod.color }} /></div>
        <span className="module-card__link" style={{ color: mod.color }}>{t("modules_section.access")}</span>
      </div>
    </div>
  );
}

function ProductCockpit({ dashboard, followupSummary, onNavigate, overviewKpis }: {
  dashboard: DashboardData;
  followupSummary: FollowupSummary | null;
  onNavigate: (path: string) => void;
  overviewKpis?: { attention_items: number; decisions_pending: number; roadmap_blocked: number; roadmap_attention: number; risks_open: number; } | null;
}) {
  const { t } = useTranslation();
  const { product, metrics, attention } = dashboard;
  const metricCards = [
    { label: t("cockpit.metric_open_risks"),  value: metrics.open_risks,  color: metrics.high_risks > 0 ? "#ff6b6b" : "#00ff88", icon: "△", link: "/modules/risks" },
    { label: t("cockpit.metric_high_risks"),  value: metrics.high_risks,  color: metrics.high_risks > 0 ? "#ff6b6b" : "#7899b0", icon: "⚠", link: "/modules/risks" },
    { label: t("cockpit.metric_backlog"),      value: metrics.backlog_open,        color: "#ff9900", icon: "◫", link: "/modules/backlog" },
    { label: t("cockpit.metric_decisions"),    value: metrics.decisions_recent,    color: "#00ff88", icon: "◎", link: "/modules/decisions" },
    { label: t("cockpit.metric_roadmap"),      value: metrics.roadmap_upcoming,    color: "#00d4ff", icon: "⬢", link: "/modules/roadmap" },
    { label: t("cockpit.metric_publications"), value: metrics.publications_review, color: metrics.publications_review > 0 ? "#ff9900" : "#7899b0", icon: "◈", link: "/modules/communication" },
    { label: t("cockpit.metric_stakeholders"), value: metrics.stakeholders,        color: "#00e5cc", icon: "◉", link: "/modules/stakeholders" },
    ...(followupSummary ? [{
      label: followupSummary.overdue > 0
        ? t("cockpit.followup_overdue")
        : followupSummary.due_today > 0
        ? t("cockpit.followup_today")
        : followupSummary.due_this_week > 0
        ? t("cockpit.followup_this_week")
        : t("cockpit.metric_followups"),
      value: followupSummary.overdue > 0
        ? followupSummary.overdue
        : followupSummary.due_today > 0
        ? followupSummary.due_today
        : followupSummary.pending,
      color: followupSummary.overdue > 0 ? "#ef4444"
           : followupSummary.due_today > 0 ? "#f59e0b"
           : followupSummary.due_this_week > 0 ? "#00d4ff"
           : "#f59e0b",
      icon: "⊙",
      link: "/modules/followups",
    }] : []),
  ];
  return (
    <section id="cockpit" className="pl-cockpit">
      <div className="cockpit-header">
        <div className="cockpit-header__left">
          <span className="section-eyebrow">{t("cockpit.active_product")}</span>
          <h2 className="cockpit-product-name">{product.name}</h2>
          {product.description && <p className="cockpit-product-desc">{product.description.slice(0,100)}{product.description.length > 100 ? "…" : ""}</p>}
        </div>
        <span className={`cockpit-status cockpit-status--${product.status}`}>{product.status.toUpperCase()}</span>
      </div>
      <div className="cockpit-metrics">
        {metricCards.map(m => (
          <CircularGauge key={m.label} value={m.value} max={Math.max(m.value * 2, 10)} color={m.color} icon={m.icon} label={m.label} onClick={() => onNavigate(m.link)} />
        ))}
      </div>
      {overviewKpis && (overviewKpis.roadmap_blocked > 0 || overviewKpis.roadmap_attention > 0 || overviewKpis.decisions_pending > 0) && (
        <div style={{ margin: "12px 0 0", padding: "10px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: "#7899b0" }}>// PIPELINE FLAGS //</span>
            <button onClick={() => onNavigate("/modules/executive-report")} style={{ fontSize: 8, padding: "2px 8px", background: "rgba(232,121,249,0.08)", border: "1px solid rgba(232,121,249,0.25)", borderRadius: 2, color: "#e879f9", cursor: "pointer", letterSpacing: 1 }}>
              OVERVIEW ⟩
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {overviewKpis.roadmap_blocked > 0 && (
              <button onClick={() => onNavigate("/modules/executive-report")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
                <span>🔴</span><span style={{ fontWeight: 700 }}>{overviewKpis.roadmap_blocked}</span><span style={{ opacity: 0.8 }}>iniciativa(s) bloqueada(s)</span>
              </button>
            )}
            {overviewKpis.roadmap_attention > 0 && (
              <button onClick={() => onNavigate("/modules/executive-report")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4, color: "#f59e0b", fontSize: 10, cursor: "pointer" }}>
                <span>🟡</span><span style={{ fontWeight: 700 }}>{overviewKpis.roadmap_attention}</span><span style={{ opacity: 0.8 }}>iniciativa(s) com atenção</span>
              </button>
            )}
            {overviewKpis.decisions_pending > 0 && (
              <button onClick={() => onNavigate("/modules/executive-report")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 4, color: "#c084fc", fontSize: 10, cursor: "pointer" }}>
                <span>⏳</span><span style={{ fontWeight: 700 }}>{overviewKpis.decisions_pending}</span><span style={{ opacity: 0.8 }}>decisão(ões) pendente(s)</span>
              </button>
            )}
          </div>
        </div>
      )}
      {attention.length > 0 && (
        <div className="cockpit-attention">
          <div className="cockpit-attention__header"><span className="section-eyebrow">{t("cockpit.needs_attention")}</span></div>
          <div className="cockpit-attention__list">
            {attention.map((item, i) => (
              <button key={i} className="attention-item" onClick={() => onNavigate(item.link)} style={{ "--att-color": SEV_COLOR[item.severity] ?? "#7899b0" } as React.CSSProperties}>
                <span className="attention-item__icon" style={{ color: SEV_COLOR[item.severity] }}>{TYPE_ICON[item.type] ?? "◆"}</span>
                <div className="attention-item__body">
                  <span className="attention-item__type" style={{ color: SEV_COLOR[item.severity] }}>{item.type}</span>
                  <span className="attention-item__title">{item.title}</span>
                  <span className="attention-item__detail">{item.detail}</span>
                </div>
                <span className="attention-item__arrow" style={{ color: SEV_COLOR[item.severity] }}>⟩</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { productId, productName, setProduct, products } = useProduct();
  const { companyId, companyName, setCompany, companies } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [followupSummary, setFollowupSummary] = useState<FollowupSummary | null>(null);
  const [aiAgentAvailable, setAiAgentAvailable] = useState(true);
  const [overviewKpis, setOverviewKpis] = useState<{
    attention_items: number; decisions_pending: number;
    roadmap_blocked: number; roadmap_attention: number; risks_open: number;
  } | null>(null);
  // Persist active category so returning from a module restores the last selected tab
  const [activeCategory, setActiveCategoryState] = useState(
    () => localStorage.getItem("pl_active_category") || "discover"
  );
  const setActiveCategory = (cat: string) => {
    localStorage.setItem("pl_active_category", cat);
    setActiveCategoryState(cat);
  };

  useEffect(() => { apiGet<SystemStats>("/stats").then(setStats).catch(() => {}); }, []);
  useEffect(() => { apiGet<FollowupSummary>("/followups/summary").then(setFollowupSummary).catch(() => {}); }, []);
  useEffect(() => {
    if (!productId) { setOverviewKpis(null); return; }
    apiGet<Record<string, Record<string, number>>>(`/executive-report/summary?product_id=${productId}`).then(d => {
      const kpis = (d as any).kpis ?? {};
      const roadmapStatus = (d as any).roadmap_status ?? {};
      setOverviewKpis({
        attention_items: kpis.attention_items ?? 0,
        decisions_pending: kpis.decisions_pending ?? 0,
        roadmap_blocked: roadmapStatus.by_executive_status?.blocked ?? 0,
        roadmap_attention: roadmapStatus.by_executive_status?.attention ?? 0,
        risks_open: kpis.risks_open ?? 0,
      });
    }).catch(() => {});
  }, [productId]);
  useEffect(() => {
    apiGet<AIConnectionOption[]>(`/integrations/ai/connections${productId ? `?product_id=${productId}` : ""}`)
      .then(connections => setAiAgentAvailable(connections.some(c => c.is_active)))
      .catch(() => setAiAgentAvailable(false));
  }, [productId]);

  const handleMarkFollowupDone = useCallback(async (id: string) => {
    const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
    const token = localStorage.getItem("pl_token") ?? document.cookie.match(/pl_token=([^;]+)/)?.[1] ?? "";
    try {
      const res = await fetch(`${BASE}/followups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ status: "done" }),
      });
      if (res.ok) {
        setFollowupSummary(prev => {
          if (!prev) return prev;
          const removeItem = (items: FollowupItem[]) => items.filter(x => x.id !== id);
          const newPending = Math.max(0, prev.pending - 1);
          const wasOverdue  = prev.overdue_items.some(x => x.id === id);
          const wasDueSoon  = prev.due_soon_items.some(x => x.id === id);
          return {
            ...prev,
            pending: newPending,
            overdue:        wasOverdue ? Math.max(0, prev.overdue - 1)        : prev.overdue,
            due_today:      wasDueSoon ? Math.max(0, prev.due_today - 1)      : prev.due_today,
            due_this_week:  wasDueSoon ? Math.max(0, prev.due_this_week - 1)  : prev.due_this_week,
            overdue_items:  removeItem(prev.overdue_items),
            due_soon_items: removeItem(prev.due_soon_items),
          };
        });
      }
    } catch {/**/}
  }, []);
  const loadDashboard = useCallback(async (pid: string) => {
    if (!pid) { setDashboard(null); return; }
    setDashLoading(true);
    try { const d = await apiGet<DashboardData>(`/products/${pid}/dashboard`); setDashboard(d); }
    catch { setDashboard(null); } finally { setDashLoading(false); }
  }, []);
  useEffect(() => { loadDashboard(productId); }, [productId]);
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (target) { const el = document.getElementById(target); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 80); }
  }, [location.state]);
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const fn = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const handleLogout = async () => { await logout(); navigate("/", { replace: true }); };
  const firstName = user?.user_full_name?.split(" ")[0] ?? "User";
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const c = companies.find(c => String(c.id) === id);
    setCompany(id, c?.company_name ?? "");
    setProduct("", "");
  };
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const p = products.find(p => String(p.product_id) === id);
    setProduct(id, p?.name ?? "");
  };

  const { setModuleOrder } = useAuth();
  const [moduleOrder, setModuleOrderLocal] = useState<string[]>([]);
  useEffect(() => {
    const saved = user?.module_order;
    if (saved && saved.length > 0) {
      const merged = [...saved.filter(id => MODULE_MAP[id]), ...DEFAULT_MODULE_ORDER.filter(id => !saved.includes(id))];
      setModuleOrderLocal(merged);
    } else { setModuleOrderLocal(DEFAULT_MODULE_ORDER); }
  }, [user?.module_order]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = moduleOrder.indexOf(active.id as string);
      const newIndex = moduleOrder.indexOf(over.id as string);
      const newOrder = arrayMove(moduleOrder, oldIndex, newIndex);
      setModuleOrderLocal(newOrder);
      setModuleOrder(newOrder);
    }
  };

  const activeCat =
    MODULE_CATEGORIES.find(c => c.id === activeCategory) ??
    MODULE_CATEGORIES[0];
  const orderedCategoryIds = moduleOrder.filter((id) => activeCat.modules.includes(id) && MODULE_MAP[id]);
  const missingCategoryIds = activeCat.modules.filter((id) => !orderedCategoryIds.includes(id) && MODULE_MAP[id]);
  const activeCatModules = [...orderedCategoryIds, ...missingCategoryIds].map((id) => MODULE_MAP[id]);
  const activeCatIds = activeCatModules.map((m) => m.id);

  const statusKey = (s: string) => {
    if (s === "ATIVO") return t("modules_section.status_active");
    if (s === "SYNC")  return t("modules_section.status_sync");
    return t("modules_section.status_standby");
  };

  const renderedModules = activeCatModules.map(mod => (
    mod.id === "ai_agent" && !aiAgentAvailable
      ? { ...mod, status: "STANDBY" as const }
      : mod
  ));

  return (
    <div className="pl-root">
      <ParticleCanvas />
      <div className="pl-scanline" />
      <div className="hud-corner hud-tl" /><div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" /><div className="hud-corner hud-br" />

      {/* NAV */}
      <nav className={`pl-nav ${navScrolled ? "pl-nav--scrolled" : ""}`}>
        <div className="pl-nav__inner">
          <button className="pl-nav__logo" onClick={() => scrollTo("hero")}>
            <SciLabLogo size={36} />
            <span className="nav-logo-text"><span className="nav-logo-product">PRODUCT</span><span className="nav-logo-lab">LAB</span></span>
          </button>

          <ul className="pl-nav__links">
            {([["hero", t("nav.home")], ["cockpit", t("nav.cockpit")], ["modules", t("nav.modules")], ["stats", t("nav.data")]] as [string,string][]).map(([id, label]) => (
              <li key={id}><button className="pl-nav__link" onClick={() => scrollTo(id)}>{label}</button></li>
            ))}
            <li>
              <button className="pl-nav__link" onClick={() => navigate("/modules/executive-report")} style={{ color: "#e879f9", borderBottom: "1px solid #e879f933", paddingBottom: 1 }}>
                {t("nav.overview")}
              </button>
            </li>
            {isAdmin && <li><button className="pl-nav__link" style={{ color: "rgba(255,153,0,0.7)" }} onClick={() => scrollTo("admin")}>{t("nav.admin")}</button></li>}
          </ul>

          {/* ── Active product selector in nav ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {companies.length > 1 && (
              <select
                value={companyId}
                onChange={handleCompanyChange}
                title="Empresa / Cliente"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#F8FAFC",
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "5px 10px",
                  borderRadius: "var(--radius-md)",
                  maxWidth: 140,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="" style={{ color: "#111827", background: "#ffffff" }}>— empresa —</option>
                {companies.map(c => <option key={c.id} value={String(c.id)} style={{ color: "#111827", background: "#ffffff" }}>{c.company_name}</option>)}
              </select>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-md)", padding: "4px 4px 4px 10px" }}>
              {productId && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success)", flexShrink: 0 }} />}
              <select
                value={productId}
                onChange={handleProductChange}
                disabled={companies.length > 1 && !companyId}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#F8FAFC",
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  fontWeight: productId ? 600 : 400,
                  padding: "2px 4px",
                  maxWidth: 160,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="" style={{ color: "#111827", background: "#ffffff" }}>{t("hero.select_product")}</option>
                {products.map(p => <option key={p.product_id} value={String(p.product_id)} style={{ color: "#111827", background: "#ffffff" }}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pl-nav__user"><span className="pl-nav__user-dot" /><span className="pl-nav__user-name">{firstName.toUpperCase()}</span></div>
          <LanguageSelector variant="hud" />
          <ThemeToggle variant="hud" />
          <button className="pl-nav__logout" onClick={handleLogout} title={t("common.logout")}>{t("common.logout")}</button>
          <div className="pl-nav__clock">{time}</div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" className="pl-hero">
        <div className="pl-hero__content" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", maxWidth: "var(--content-max)", margin: "0 auto", padding: "80px var(--section-px)", width: "100%", position: "relative", zIndex: 2 }}>

          {/* Left — text content */}
          <div>
            <div className="hero-badge">
              <span className="hero-badge__dot" />
              <span className="hero-badge__text">Product Lab · v{import.meta.env.VITE_APP_VERSION ?? "2.0"}</span>
            </div>

            <p style={{ fontSize: 14, color: "var(--color-cyan)", fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>
              {t("hero.divider_knowledge")} · {t("hero.divider_decisions")} · {t("hero.divider_impact")}
            </p>

            <h1 className="hero-title">
              <span className="hero-title__product">PRODUCT</span><span className="hero-title__lab">LAB</span>
            </h1>

            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, maxWidth: 480, marginBottom: 28, marginTop: 8 }}>
              {t("about.text1")}
            </p>

            {/* Active product indicator (read-only, selector is in nav) */}
            {productName && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "8px 14px", background: "rgba(0,196,212,0.08)", border: "1px solid rgba(0,196,212,0.2)", borderRadius: "var(--radius-md)", width: "fit-content" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-success)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{productName}</span>
                {companyName && companies.length > 1 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 8 }}>{companyName}</span>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="hero-actions">
              {productId ? (
                <button className="btn-primary" onClick={() => scrollTo("cockpit")}>
                  <span className="btn-primary__glow" />{t("hero.view_cockpit")} <span className="btn-primary__arrow">→</span>
                </button>
              ) : (
                <button className="btn-primary" onClick={() => scrollTo("modules")}>
                  <span className="btn-primary__glow" />{t("hero.explore_modules")} <span className="btn-primary__arrow">→</span>
                </button>
              )}
              <button className="btn-secondary" onClick={() => scrollTo("stats")}>{t("nav.data")}</button>
            </div>

            {/* Telemetry strip */}
            <div className="hero-telemetry">
              {[
                { label: t("telemetry.status"), value: t("telemetry.active"), active: true },
                { label: t("telemetry.products"), value: String(stats?.products ?? 0) },
                { label: t("telemetry.modules"), value: String(MODULES.length) },
                { label: t("telemetry.uptime"), value: "99.8%" },
              ].map((item, i) => (
                <div key={i} className="telemetry-item">
                  <span className="telemetry-label">{item.label}</span>
                  <span className={`telemetry-value ${item.active ? "telemetry-value--active" : ""}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual card grid (NTT360 style) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {MODULE_CATEGORIES.slice(0, 4).map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); scrollTo("modules"); }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${cat.color}33`,
                  borderRadius: 12,
                  padding: "20px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${cat.color}14`; (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}66`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}33`; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cat.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <cat.SciIcon size={18} color={cat.color} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{t(`modules_section.categories.${cat.id}.label`)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{cat.modules.length} {t("telemetry.modules").toLowerCase()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* COCKPIT */}
      {productId && (dashLoading ? (
        <section id="cockpit" className="pl-cockpit pl-cockpit--loading">
          <div className="section-header"><div className="section-header__content"><span className="section-eyebrow">{t("cockpit.loading")}</span><div className="mod-loading" style={{ marginTop: 16 }}>{t("cockpit.syncing")}</div></div></div>
        </section>
      ) : dashboard ? <ProductCockpit dashboard={dashboard} followupSummary={followupSummary} onNavigate={(p: string) => navigate(p)} overviewKpis={overviewKpis} /> : null)}
      {!productId && (
        <section id="cockpit" className="pl-cockpit pl-cockpit--empty">
          <div className="section-header">
            <div className="section-header__line" />
            <div className="section-header__content">
              <span className="section-eyebrow">{t("cockpit.select_title")}</span>
              <h2 className="section-title">{t("cockpit.select_heading")} <span className="section-title--accent">{t("cockpit.select_accent")}</span></h2>
              <p style={{ color: "#7899b0", fontSize: 12, letterSpacing: 1, marginTop: 8 }}>{t("cockpit.select_hint")}</p>
            </div>
            <div className="section-header__line" />
          </div>
        </section>
      )}

      {/* GLOBAL FOLLOW-UP REMINDERS — always visible, independent of product */}
      {followupSummary && followupSummary.pending > 0 && (
        <section style={{ padding: "0 var(--section-px, 32px) 0", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ marginTop: 0, marginBottom: 20, padding: "14px 16px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 3 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 9, letterSpacing: 2, color: "#f59e0b" }}>
                ⊙ {t("cockpit.followups_section")}
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {followupSummary.overdue > 0 && (
                  <span style={{ fontSize: 8, padding: "2px 7px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>
                    {followupSummary.overdue} {t("cockpit.followup_overdue")}
                  </span>
                )}
                {followupSummary.due_today > 0 && (
                  <span style={{ fontSize: 8, padding: "2px 7px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8 }}>
                    {followupSummary.due_today} {t("cockpit.followup_today")}
                  </span>
                )}
                {followupSummary.due_this_week > 0 && (
                  <span style={{ fontSize: 8, padding: "2px 7px", background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 8 }}>
                    {followupSummary.due_this_week} {t("cockpit.followup_this_week")}
                  </span>
                )}
                <button onClick={() => navigate("/modules/followups")} style={{ fontSize: 8, padding: "2px 8px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 2, color: "#f59e0b", cursor: "pointer" }}>
                  VER TODOS ⟩
                </button>
              </div>
            </div>

            {/* Overdue items */}
            {followupSummary.overdue_items.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", marginBottom: 4, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 2, borderLeft: "3px solid #ef4444" }}>
                <span style={{ fontSize: 10, color: "#ef4444", flexShrink: 0 }}>▲</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#c8dce8", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                  <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#ef4444", fontWeight: 700 }}>📆 {fmtFollowupDate(item.due_date)}</span>
                    <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "0 5px", borderRadius: 3 }}>{ENTITY_LABELS[item.entity_type] ?? item.entity_type}</span>
                    {item.assigned_to && <span>👤 {item.assigned_to}</span>}
                  </div>
                </div>
                <button onClick={() => handleMarkFollowupDone(item.id)} style={{ flexShrink: 0, fontSize: 8, padding: "2px 7px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 2, color: "#10b981", cursor: "pointer" }}>
                  {t("cockpit.followup_mark_done")}
                </button>
              </div>
            ))}

            {/* Due soon items */}
            {followupSummary.due_soon_items.filter(i => !isFollowupOverdue(i.due_date)).map(item => {
              const today = isFollowupToday(item.due_date);
              const col = today ? "#f59e0b" : "#00d4ff";
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", marginBottom: 4, background: today ? "rgba(245,158,11,0.05)" : "rgba(0,212,255,0.04)", border: `1px solid ${col}33`, borderRadius: 2, borderLeft: `3px solid ${col}` }}>
                  <span style={{ fontSize: 10, color: col, flexShrink: 0 }}>⊙</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#c8dce8", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                    <div style={{ fontSize: 9, color: "#7899b0", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: col }}>📆 {fmtFollowupDate(item.due_date)}{today && <span style={{ marginLeft: 4, background: `${col}33`, padding: "0 4px", borderRadius: 2 }}>HOJE</span>}</span>
                      <span style={{ background: `${col}18`, color: col, padding: "0 5px", borderRadius: 3 }}>{ENTITY_LABELS[item.entity_type] ?? item.entity_type}</span>
                      {item.assigned_to && <span>👤 {item.assigned_to}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleMarkFollowupDone(item.id)} style={{ flexShrink: 0, fontSize: 8, padding: "2px 7px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 2, color: "#10b981", cursor: "pointer" }}>
                    {t("cockpit.followup_mark_done")}
                  </button>
                </div>
              );
            })}

            {/* Pending with no due date */}
            {followupSummary.overdue_items.length === 0 && followupSummary.due_soon_items.length === 0 && followupSummary.pending > 0 && (
              <div style={{ fontSize: 10, color: "#7899b0", textAlign: "center", padding: "8px 0" }}>
                ⊙ {followupSummary.pending} {t("cockpit.followup_pending_no_date")}
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODULES */}
      <section id="modules" className="pl-modules" data-science={activeCat.scienceId}>
        {/* Stage 3: Science atmosphere background */}
        <div className="science-atmosphere" />

        <div className="section-header">
          <div className="section-header__line" />
          <div className="section-header__content">
            <span className="section-eyebrow">{t("modules_section.eyebrow")}</span>
            <h2 className="section-title">{t("modules_section.heading")} <span className="section-title--accent">{t("modules_section.heading_accent")}</span></h2>
          </div>
          <div className="section-header__line" />
        </div>

        {/* ── Category Tabs with Science SVG Icons ── */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32, flexWrap: "wrap", rowGap: 12 }}>
          {MODULE_CATEGORIES.map((cat, idx) => {
            const isActive = activeCategory === cat.id;
            return (
              <Fragment key={cat.id}>
                {idx > 0 && (
                  <div style={{ flex: 1, minWidth: 16, height: 1, background: `linear-gradient(90deg, ${MODULE_CATEGORIES[idx-1].color}, ${cat.color})`, opacity: 0.15 }} />
                )}
                <button onClick={() => setActiveCategory(cat.id)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", flexShrink: 0,
                  background: isActive ? `linear-gradient(135deg, ${cat.color}22, ${cat.color}0a)` : "rgba(0,0,0,0.3)",
                  border: `1px solid ${isActive ? cat.color : cat.color + "33"}`, borderRadius: 2, cursor: "pointer",
                  transition: "all 0.25s", boxShadow: isActive ? `0 0 20px ${cat.color}35, inset 0 0 12px ${cat.color}08` : "none",
                }}>
                  <cat.SciIcon size={16} color={isActive ? cat.color : cat.color + "88"} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: isActive ? cat.color : cat.color + "88", transition: "color 0.25s" }}>
                    {t(`modules_section.categories.${cat.id}.label`)}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>

        {/* ── Active category description ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, opacity: 0.8 }}>
          <div style={{ width: 3, height: 20, background: activeCat.color, borderRadius: 1, boxShadow: `0 0 8px ${activeCat.color}` }} />
          <activeCat.SciIcon size={14} color={activeCat.color} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: activeCat.color }}>
            {t(`modules_section.categories.${activeCat.id}.desc`)}
          </span>
        </div>

        {/* ── Modules Grid or Setup content ── */}
        {activeCategory === "setup" ? (
          <div className="modules-grid">
            {/* Empresas & Clientes */}
            <div className="module-card" style={{ "--card-color": "#00e5cc", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/settings/companies")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: "#00e5cc" }}>◈</span>
                <span className="module-card__status module-card__status--ativo"><span className="module-card__status-dot" />{t("modules_section.status_active")}</span>
              </div>
              <h3 className="module-card__title">{t("modules_section.categories.setup.companies_title")}</h3>
              <p className="module-card__desc">{t("modules_section.categories.setup.companies_desc")}</p>
              <div className="module-card__footer">
                <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#00e5cc" }} /></div>
                <span className="module-card__link" style={{ color: "#00e5cc" }}>{t("modules_section.access")}</span>
              </div>
            </div>
            {/* Business Areas */}
            <div className="module-card" style={{ "--card-color": "#c084fc", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/settings/business-areas")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: "#c084fc" }}>◈</span>
                <span className="module-card__status module-card__status--ativo"><span className="module-card__status-dot" />{t("modules_section.status_active")}</span>
              </div>
              <h3 className="module-card__title">{t("modules_section.categories.setup.business_areas_title")}</h3>
              <p className="module-card__desc">{t("modules_section.categories.setup.business_areas_desc")}</p>
              <div className="module-card__footer">
                <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#c084fc" }} /></div>
                <span className="module-card__link" style={{ color: "#c084fc" }}>{t("modules_section.access")}</span>
              </div>
            </div>
            {/* Stakeholders */}
            <div className="module-card" style={{ "--card-color": "#00ff88", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/modules/stakeholders")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: "#00ff88" }}>◉</span>
                <span className="module-card__status module-card__status--ativo"><span className="module-card__status-dot" />{t("modules_section.status_active")}</span>
              </div>
              <h3 className="module-card__title">{t("modules_section.modules.stakeholders.title")}</h3>
              <p className="module-card__desc">{t("modules_section.categories.setup.stakeholders_desc")}</p>
              <div className="module-card__footer">
                <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#00ff88" }} /></div>
                <span className="module-card__link" style={{ color: "#00ff88" }}>{t("modules_section.access")}</span>
              </div>
            </div>
            {/* Gestão de Produtos */}
            <div className="module-card" style={{ "--card-color": "#00d4ff", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/modules/products")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: "#00d4ff" }}>⬡</span>
                <span className="module-card__status module-card__status--ativo"><span className="module-card__status-dot" />{t("modules_section.status_active")}</span>
              </div>
              <h3 className="module-card__title">{t("modules_section.categories.setup.products_title")}</h3>
              <p className="module-card__desc">{t("modules_section.categories.setup.products_desc")}</p>
              <div className="module-card__footer">
                <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#00d4ff" }} /></div>
                <span className="module-card__link" style={{ color: "#00d4ff" }}>{t("modules_section.access")}</span>
              </div>
            </div>
            {/* Integrations Hub */}
            <div className="module-card" style={{ "--card-color": "#ff9900", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/settings/integrations")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: "#ff9900" }}>⚡</span>
                <span className="module-card__status module-card__status--ativo"><span className="module-card__status-dot" />{t("modules_section.status_active")}</span>
              </div>
              <h3 className="module-card__title">INTEGRATIONS HUB</h3>
              <p className="module-card__desc">Connect ADO, OpenAI, Jira, GitHub and other tools. Sync backlog from Azure DevOps automatically.</p>
              <div className="module-card__footer">
                <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#ff9900" }} /></div>
                <span className="module-card__link" style={{ color: "#ff9900" }}>{t("modules_section.access")}</span>
              </div>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeCatIds} strategy={rectSortingStrategy}>
              <div className="modules-grid">
                {renderedModules.map(mod => (
                  <SortableModuleCard key={mod.id} mod={mod} onNavigate={(path) => navigate(path)} statusKey={statusKey} t={t} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ADMIN */}
      {isAdmin && (
        <section id="admin" className="pl-modules pl-admin">
          <div className="section-header">
            <div className="section-header__line" style={{ background: "linear-gradient(90deg, transparent, rgba(255,153,0,0.3), transparent)" }} />
            <div className="section-header__content">
              <span className="section-eyebrow" style={{ color: "rgba(255,153,0,0.7)" }}>{t("admin_section.eyebrow")}</span>
              <h2 className="section-title">{t("admin_section.heading")} <span style={{ background: "linear-gradient(135deg,#ff9900,#ffcc44)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{t("admin_section.heading_accent")}</span></h2>
            </div>
            <div className="section-header__line" style={{ background: "linear-gradient(90deg, transparent, rgba(255,153,0,0.3), transparent)" }} />
          </div>
          <div className="modules-grid">
            <div className="module-card" style={{ "--card-color": "#ff9900", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/admin/users")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header"><span className="module-card__icon" style={{ color: "#ff9900" }}>⚙</span><span className="module-card__status module-card__status--sync"><span className="module-card__status-dot" />ADMIN</span></div>
              <h3 className="module-card__title">{t("admin_section.users_title")}</h3>
              <p className="module-card__desc">{t("admin_section.users_desc")}</p>
              <div className="module-card__footer"><div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#ff9900" }} /></div><span className="module-card__link" style={{ color: "#ff9900" }}>{t("modules_section.access")}</span></div>
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      <section id="stats" className="pl-stats">
        <div className="pl-stats__bg" />
        <div className="section-header">
          <div className="section-header__line" />
          <div className="section-header__content"><span className="section-eyebrow">{t("stats_section.eyebrow")}</span><h2 className="section-title">{t("stats_section.heading")} <span className="section-title--accent">{t("stats_section.heading_accent")}</span></h2></div>
          <div className="section-header__line" />
        </div>
        <div className="stats-grid">
          {[
            { key: "products", value: stats?.products ?? 0 }, { key: "decisions", value: stats?.decisions ?? 0 },
            { key: "knowledge", value: stats?.knowledge_items ?? 0 }, { key: "risks", value: stats?.risks ?? 0 },
            { key: "roadmap", value: stats?.roadmap_items ?? 0 }, { key: "stakeholders", value: stats?.stakeholders ?? 0 },
            { key: "backlog", value: stats?.backlog_items ?? 0 }, { key: "vpc", value: stats?.vpc_items ?? 0 },
            { key: "features", value: stats?.product_features ?? 0 }, { key: "communications", value: stats?.communications ?? 0 },
            { key: "users", value: stats?.users ?? 0 },
          ].map(s => (
            <div key={s.key} className="stat-card">
              <div className="stat-card__corner stat-card__corner--tl" /><div className="stat-card__corner stat-card__corner--br" />
              <AnimatedCounter target={s.value} suffix="" />
              <div className="stat-label">{t(`stats_section.${s.key}`)}</div>
              <div className="stat-bar"><div className="stat-bar__fill" /></div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="pl-about">
        <div className="about-grid">
          <div className="about-visual">
            <div className="about-hex-container">
              <div className="about-hex about-hex--1" /><div className="about-hex about-hex--2" /><div className="about-hex about-hex--3" />
              <div className="about-flask-center"><SciLabLogo size={100} /></div>
            </div>
          </div>
          <div className="about-content">
            <span className="section-eyebrow">{t("about.eyebrow")}</span>
            <h2 className="section-title">{t("about.heading")} <span className="section-title--accent">{t("about.heading_accent")}</span></h2>
            <p className="about-text">{t("about.text1")}</p>
            <p className="about-text">{t("about.text2")}</p>
            <div className="about-pillars">
              {[
                { icon: "◈", titleKey: "about.pillar_knowledge_title", descKey: "about.pillar_knowledge_desc" },
                { icon: "◎", titleKey: "about.pillar_decisions_title", descKey: "about.pillar_decisions_desc" },
                { icon: "◉", titleKey: "about.pillar_impact_title",    descKey: "about.pillar_impact_desc" },
              ].map(p => (
                <div key={p.titleKey} className="pillar">
                  <span className="pillar__icon">{p.icon}</span>
                  <div><div className="pillar__title">{t(p.titleKey)}</div><div className="pillar__desc">{t(p.descKey)}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="contact-coords contact-coords--standalone">
        <span>LAT: -23.5505° S</span><span className="contact-coords__sep">|</span>
        <span>LNG: -46.6333° W</span><span className="contact-coords__sep">|</span>
        <span>ALT: 760m</span>
      </div>

      <footer className="pl-footer">
        <div className="pl-footer__inner">
          <div className="pl-footer__logo"><SciLabLogo size={28} /><span className="footer-logo-text"><span>PRODUCT</span><span className="footer-logo-lab">LAB</span></span></div>
          <div className="pl-footer__tagline">{t("footer.tagline")}</div>
          <div className="pl-footer__clock">{time}</div>
        </div>
        <div className="pl-footer__bar" />
      </footer>
    </div>
  );
}
