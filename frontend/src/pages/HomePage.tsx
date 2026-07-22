import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useProduct } from "../contexts/ProductContext";
import { apiGet } from "../shared/services/api";
import ThemeToggle from "../shared/components/ThemeToggle";
import LanguageSelector from "../shared/components/LanguageSelector";
import "../styles/hud.css";

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

const MODULE_ROUTES: Record<string, string> = {
  dashboard: "/modules/products", knowledge: "/modules/knowledge", decisions: "/modules/decisions",
  roadmap: "/modules/roadmap", prioritization: "/modules/prioritization", risks: "/modules/risks",
  stakeholders: "/modules/stakeholders", vpc: "/modules/vpc", backlog: "/modules/backlog",
  research: "/modules/knowledge", communication: "/modules/communication",
};

interface Module { id: string; icon: string; status: "ATIVO" | "SYNC" | "STANDBY"; color: string; }

const MODULES: Module[] = [
  { id: "dashboard",      icon: "⬡", status: "ATIVO",   color: "#00d4ff" },
  { id: "knowledge",      icon: "◈", status: "ATIVO",   color: "#00e5cc" },
  { id: "decisions",      icon: "◎", status: "ATIVO",   color: "#00ff88" },
  { id: "roadmap",        icon: "⬢", status: "ATIVO",   color: "#00d4ff" },
  { id: "prioritization", icon: "◇", status: "SYNC",    color: "#00e5cc" },
  { id: "risks",          icon: "△", status: "ATIVO",   color: "#ff9900" },
  { id: "stakeholders",   icon: "◉", status: "ATIVO",   color: "#00ff88" },
  { id: "vpc",            icon: "⬡", status: "ATIVO",   color: "#00d4ff" },
  { id: "research",       icon: "◈", status: "STANDBY", color: "#c084fc" },
  { id: "backlog",        icon: "◫", status: "ATIVO",   color: "#ff9900" },
  { id: "communication",  icon: "◈", status: "ATIVO",   color: "#c084fc" },
];

const SEV_COLOR: Record<string, string> = { HIGH: "#ff6b6b", MEDIUM: "#ff9900", LOW: "#00ff88" };
const TYPE_ICON: Record<string, string> = { RISK: "△", BACKLOG: "◫", PUBLICATION: "◈", DECISION: "◎" };

// ─── Particle Canvas ──────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; radius: number; opacity: number; }

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let animId: number;
    const particles: Particle[] = [];
    const COUNT = 80; const MAX_D = 150;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    for (let i = 0; i < COUNT; i++) {
      particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4, radius: Math.random()*2+1, opacity: Math.random()*0.5+0.2 });
    }
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle="rgba(0,212,255,0.04)"; ctx.lineWidth=1;
      for (let x=0;x<canvas.width;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
      for (let y=0;y<canvas.height;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>canvas.width)p.vx*=-1; if(p.y<0||p.y>canvas.height)p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fillStyle=`rgba(0,229,204,${p.opacity})`; ctx.fill();
      });
      for(let i=0;i<particles.length;i++){for(let j=i+1;j<particles.length;j++){const dx=particles[i].x-particles[j].x;const dy=particles[i].y-particles[j].y;const d=Math.sqrt(dx*dx+dy*dy);if(d<MAX_D){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle=`rgba(0,212,255,${(1-d/MAX_D)*0.15})`;ctx.lineWidth=0.5;ctx.stroke();}}}
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

// ─── Flask Logo ───────────────────────────────────────────────────────────────
function FlaskLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="flask-logo">
      <defs>
        <linearGradient id="fg1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#00ff88"/></linearGradient>
        <linearGradient id="ff1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" stopOpacity="0.05"/><stop offset="100%" stopColor="#00ff88" stopOpacity="0.15"/></linearGradient>
        <linearGradient id="fl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00e5cc"/><stop offset="100%" stopColor="#00ff88"/></linearGradient>
        <filter id="fg"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="40" cy="40" r="37" stroke="url(#fg1)" strokeWidth="1" opacity="0.6" strokeDasharray="4 3"/>
      <path d="M30 12 L30 28 L18 46 Q15 52 20 57 L60 57 Q65 52 62 46 L50 28 L50 12 Z" stroke="url(#fg1)" strokeWidth="2" fill="url(#ff1)" filter="url(#fg)"/>
      <line x1="27" y1="12" x2="53" y2="12" stroke="url(#fg1)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="27" cy="28" r="3.5" fill="#00e5cc" filter="url(#fg)"/>
      <circle cx="53" cy="34" r="3.5" fill="#00d4ff" filter="url(#fg)"/>
      <circle cx="40" cy="48" r="5" fill="url(#fg1)" filter="url(#fg)"/>
      <circle cx="27" cy="28" r="1.5" fill="white"/><circle cx="53" cy="34" r="1.5" fill="white"/><circle cx="40" cy="48" r="2" fill="white"/>
      <path d="M27 28 L40 48 L53 34" stroke="url(#fg1)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#fg)"/>
      <path d="M34 43 Q40 60 46 43" fill="url(#fl1)" opacity="0.5"/>
    </svg>
  );
}

// ─── Product Cockpit ──────────────────────────────────────────────────────────
function ProductCockpit({ dashboard, onNavigate }: { dashboard: DashboardData; onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const { product, metrics, attention } = dashboard;

  const metricCards = [
    { label: t("cockpit.metric_open_risks"),    value: metrics.open_risks,          color: metrics.high_risks > 0 ? "#ff6b6b" : "#00ff88", icon: "△", link: "/modules/risks" },
    { label: t("cockpit.metric_high_risks"),    value: metrics.high_risks,          color: metrics.high_risks > 0 ? "#ff6b6b" : "#7899b0", icon: "⚠", link: "/modules/risks" },
    { label: t("cockpit.metric_backlog"),        value: metrics.backlog_open,        color: "#ff9900", icon: "◫", link: "/modules/backlog" },
    { label: t("cockpit.metric_decisions"),      value: metrics.decisions_recent,    color: "#00ff88", icon: "◎", link: "/modules/decisions" },
    { label: t("cockpit.metric_roadmap"),        value: metrics.roadmap_upcoming,    color: "#00d4ff", icon: "⬢", link: "/modules/roadmap" },
    { label: t("cockpit.metric_publications"),   value: metrics.publications_review, color: metrics.publications_review > 0 ? "#ff9900" : "#7899b0", icon: "◈", link: "/modules/communication" },
    { label: t("cockpit.metric_stakeholders"),   value: metrics.stakeholders,        color: "#00e5cc", icon: "◉", link: "/modules/stakeholders" },
  ];

  return (
    <section id="cockpit" className="pl-cockpit">
      <div className="cockpit-header">
        <div className="cockpit-header__left">
          <span className="section-eyebrow">{t("cockpit.active_product")}</span>
          <h2 className="cockpit-product-name">{product.name}</h2>
          {product.description && <p className="cockpit-product-desc">{product.description.slice(0, 100)}{product.description.length > 100 ? "…" : ""}</p>}
        </div>
        <span className={`cockpit-status cockpit-status--${product.status}`}>{product.status.toUpperCase()}</span>
      </div>
      <div className="cockpit-metrics">
        {metricCards.map(m => (
          <button key={m.label} className="cockpit-metric" onClick={() => onNavigate(m.link)} style={{ "--metric-color": m.color } as React.CSSProperties}>
            <span className="cockpit-metric__icon" style={{ color: m.color }}>{m.icon}</span>
            <span className="cockpit-metric__value" style={{ color: m.color }}>{m.value}</span>
            <span className="cockpit-metric__label">{m.label}</span>
          </button>
        ))}
      </div>
      {attention.length > 0 && (
        <div className="cockpit-attention">
          <div className="cockpit-attention__header">
            <span className="section-eyebrow">{t("cockpit.needs_attention")}</span>
          </div>
          <div className="cockpit-attention__list">
            {attention.map((item, i) => (
              <button key={i} className="attention-item" onClick={() => onNavigate(item.link)}
                style={{ "--att-color": SEV_COLOR[item.severity] ?? "#7899b0" } as React.CSSProperties}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { productId, productName, setProduct, products } = useProduct();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [time, setTime]           = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [stats, setStats]         = useState<SystemStats | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => { apiGet<SystemStats>("/stats").then(setStats).catch(() => {}); }, []);

  const loadDashboard = useCallback(async (pid: string) => {
    if (!pid) { setDashboard(null); return; }
    setDashLoading(true);
    try { const d = await apiGet<DashboardData>(`/products/${pid}/dashboard`); setDashboard(d); }
    catch { setDashboard(null); }
    finally { setDashLoading(false); }
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
  const handleLogout = () => { logout(); navigate("/", { replace: true }); };
  const firstName = user?.user_full_name?.split(" ")[0] ?? "User";
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const p  = products.find(p => String(p.product_id) === id);
    setProduct(id, p?.name ?? "");
  };

  // Map module status to i18n key
  const statusKey = (s: string) => {
    if (s === "ATIVO") return t("modules_section.status_active");
    if (s === "SYNC")  return t("modules_section.status_sync");
    return t("modules_section.status_standby");
  };

  return (
    <div className="pl-root">
      <ParticleCanvas />
      <div className="pl-scanline" />
      <div className="hud-corner hud-tl" /><div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" /><div className="hud-corner hud-br" />

      {/* ── NAV ── */}
      <nav className={`pl-nav ${navScrolled ? "pl-nav--scrolled" : ""}`}>
        <div className="pl-nav__inner">
          <button className="pl-nav__logo" onClick={() => scrollTo("hero")}>
            <FlaskLogo size={36} />
            <span className="nav-logo-text">
              <span className="nav-logo-product">PRODUCT</span>
              <span className="nav-logo-lab">LAB</span>
            </span>
          </button>
          <ul className="pl-nav__links">
            {([["hero", t("nav.home")], ["cockpit", t("nav.cockpit")], ["modules", t("nav.modules")], ["stats", t("nav.data")]] as [string,string][]).map(([id, label]) => (
              <li key={id}><button className="pl-nav__link" onClick={() => scrollTo(id)}>{label}</button></li>
            ))}
          </ul>
          <div className="pl-nav__user">
            <span className="pl-nav__user-dot" />
            <span className="pl-nav__user-name">{firstName.toUpperCase()}</span>
          </div>
          <LanguageSelector variant="hud" />
          <ThemeToggle variant="hud" />
          <button className="pl-nav__logout" onClick={handleLogout} title={t("common.logout")}>{t("common.logout")}</button>
          <div className="pl-nav__clock">{time}</div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="pl-hero">
        <div className="pl-hero__reactor">
          <div className="reactor-ring reactor-ring--1" /><div className="reactor-ring reactor-ring--2" />
          <div className="reactor-ring reactor-ring--3" />
          <div className="reactor-core"><FlaskLogo size={120} /></div>
          <div className="reactor-glow" />
        </div>
        <div className="pl-hero__content">
          <div className="hero-badge">
            <span className="hero-badge__dot" />
            <span className="hero-badge__text">{t("hero.badge", { version: import.meta.env.VITE_APP_VERSION ?? "dev" })}</span>
          </div>
          <h1 className="hero-title">
            <span className="hero-title__product">PRODUCT</span>
            <span className="hero-title__lab">LAB</span>
          </h1>
          <div className="hero-product-selector">
            <span className="hero-product-selector__label">{t("hero.active_product")}</span>
            <select className="hero-product-selector__select" value={productId} onChange={handleProductChange}>
              <option value="">{t("hero.select_product")}</option>
              {products.map(p => <option key={p.product_id} value={String(p.product_id)}>{p.name}</option>)}
            </select>
            {productName && (
              <span className="hero-product-selector__active">
                <span className="hero-product-selector__dot" />{productName}
              </span>
            )}
          </div>
          <div className="hero-divider">
            <div className="hero-divider__line" />
            <div className="hero-divider__text">
              <span>{t("hero.divider_knowledge")}</span><span className="hero-divider__gem">◆</span>
              <span>{t("hero.divider_decisions")}</span><span className="hero-divider__gem">◆</span>
              <span>{t("hero.divider_impact")}</span>
            </div>
            <div className="hero-divider__line" />
          </div>
          <div className="hero-actions">
            {productId ? (
              <button className="btn-primary" onClick={() => scrollTo("cockpit")}>
                <span className="btn-primary__glow" />{t("hero.view_cockpit")} <span className="btn-primary__arrow">⟩</span>
              </button>
            ) : (
              <button className="btn-primary" onClick={() => scrollTo("modules")}>
                <span className="btn-primary__glow" />{t("hero.explore_modules")} <span className="btn-primary__arrow">⟩</span>
              </button>
            )}
            <button className="btn-secondary" onClick={() => scrollTo("modules")}>{t("hero.modules_btn")}</button>
          </div>
          <div className="hero-telemetry">
            {[
              { label: t("telemetry.status"),   value: t("telemetry.active"), active: true },
              { label: t("telemetry.products"), value: String(stats?.products ?? 0) },
              { label: t("telemetry.modules"),  value: "10" },
              { label: t("telemetry.uptime"),   value: "99.8%" },
            ].map((item, i) => (
              <div key={i} className="telemetry-item">
                {i > 0 && <span className="telemetry-sep">|</span>}
                <span className="telemetry-label">{item.label}</span>
                <span className={`telemetry-value ${item.active ? "telemetry-value--active" : ""}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COCKPIT ── */}
      {productId && (
        dashLoading ? (
          <section id="cockpit" className="pl-cockpit pl-cockpit--loading">
            <div className="section-header">
              <div className="section-header__content">
                <span className="section-eyebrow">{t("cockpit.loading")}</span>
                <div className="mod-loading" style={{ marginTop: 16 }}>{t("cockpit.syncing")}</div>
              </div>
            </div>
          </section>
        ) : dashboard ? (
          <ProductCockpit dashboard={dashboard} onNavigate={(p) => navigate(p)} />
        ) : null
      )}

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

      {/* ── MODULES ── */}
      <section id="modules" className="pl-modules">
        <div className="section-header">
          <div className="section-header__line" />
          <div className="section-header__content">
            <span className="section-eyebrow">{t("modules_section.eyebrow")}</span>
            <h2 className="section-title">{t("modules_section.heading")} <span className="section-title--accent">{t("modules_section.heading_accent")}</span></h2>
          </div>
          <div className="section-header__line" />
        </div>
        <div className="modules-grid">
          {isAdmin && (
            <div className="module-card" style={{ "--card-color": "#ff9900", cursor: "pointer" } as React.CSSProperties} onClick={() => navigate("/admin/users")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: "#ff9900" }}>⚙</span>
                <span className="module-card__status module-card__status--ativo"><span className="module-card__status-dot" />{t("modules_section.admin_badge")}</span>
              </div>
              <h3 className="module-card__title">{t("modules_section.modules.users.title")}</h3>
              <p className="module-card__desc">{t("modules_section.modules.users.desc")}</p>
              <div className="module-card__footer">
                <div className="module-card__bar"><div className="module-card__bar-fill" style={{ background: "#ff9900" }} /></div>
                <span className="module-card__link" style={{ color: "#ff9900" }}>{t("modules_section.access")}</span>
              </div>
            </div>
          )}
          {MODULES.map(mod => (
            <div key={mod.id} className="module-card" style={{ "--card-color": mod.color, cursor: "pointer" } as React.CSSProperties} onClick={() => navigate(MODULE_ROUTES[mod.id] ?? "/home")}>
              <div className="module-card__corner module-card__corner--tl" /><div className="module-card__corner module-card__corner--br" />
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
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="pl-stats">
        <div className="pl-stats__bg" />
        <div className="section-header">
          <div className="section-header__line" />
          <div className="section-header__content">
            <span className="section-eyebrow">{t("stats_section.eyebrow")}</span>
            <h2 className="section-title">{t("stats_section.heading")} <span className="section-title--accent">{t("stats_section.heading_accent")}</span></h2>
          </div>
          <div className="section-header__line" />
        </div>
        <div className="stats-grid">
          {[
            { key: "products",       value: stats?.products ?? 0 },
            { key: "decisions",      value: stats?.decisions ?? 0 },
            { key: "knowledge",      value: stats?.knowledge_items ?? 0 },
            { key: "risks",          value: stats?.risks ?? 0 },
            { key: "roadmap",        value: stats?.roadmap_items ?? 0 },
            { key: "stakeholders",   value: stats?.stakeholders ?? 0 },
            { key: "backlog",        value: stats?.backlog_items ?? 0 },
            { key: "vpc",            value: stats?.vpc_items ?? 0 },
            { key: "features",       value: stats?.product_features ?? 0 },
            { key: "communications", value: stats?.communications ?? 0 },
            { key: "users",          value: stats?.users ?? 0 },
          ].map(s => (
            <div key={s.key} className="stat-card">
              <div className="stat-card__corner stat-card__corner--tl" />
              <div className="stat-card__corner stat-card__corner--br" />
              <AnimatedCounter target={s.value} suffix="" />
              <div className="stat-label">{t(`stats_section.${s.key}`)}</div>
              <div className="stat-bar"><div className="stat-bar__fill" /></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="pl-about">
        <div className="about-grid">
          <div className="about-visual">
            <div className="about-hex-container">
              <div className="about-hex about-hex--1" />
              <div className="about-hex about-hex--2" />
              <div className="about-hex about-hex--3" />
              <div className="about-flask-center"><FlaskLogo size={100} /></div>
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
                { icon: "◉", titleKey: "about.pillar_impact_title",    descKey: "about.pillar_impact_desc"    },
              ].map(p => (
                <div key={p.titleKey} className="pillar">
                  <span className="pillar__icon">{p.icon}</span>
                  <div>
                    <div className="pillar__title">{t(p.titleKey)}</div>
                    <div className="pillar__desc">{t(p.descKey)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COORDS ── */}
      <div className="contact-coords contact-coords--standalone">
        <span>LAT: -23.5505° S</span>
        <span className="contact-coords__sep">|</span>
        <span>LNG: -46.6333° W</span>
        <span className="contact-coords__sep">|</span>
        <span>ALT: 760m</span>
      </div>

      {/* ── FOOTER ── */}
      <footer className="pl-footer">
        <div className="pl-footer__inner">
          <div className="pl-footer__logo">
            <FlaskLogo size={28} />
            <span className="footer-logo-text">
              <span>PRODUCT</span><span className="footer-logo-lab">LAB</span>
            </span>
          </div>
          <div className="pl-footer__tagline">{t("footer.tagline")}</div>
          <div className="pl-footer__clock">{time}</div>
        </div>
        <div className="pl-footer__bar" />
      </footer>
    </div>
  );
}
