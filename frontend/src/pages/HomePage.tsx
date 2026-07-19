import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../shared/services/api";
import "../styles/hud.css";

interface SystemStats {
  products:             number;
  decisions:            number;
  knowledge_items:      number;
  risks:                number;
  roadmap_items:        number;
  prioritization_items: number;
  stakeholders:         number;
  vpc_items:            number;
  backlog_items:        number;
  product_impacts:      number;
  product_features:     number;
  users:                number;
  communications:       number;
}

// Module route map
const MODULE_ROUTES: Record<string, string> = {
  dashboard:      "/modules/products",
  knowledge:      "/modules/knowledge",
  decisions:      "/modules/decisions",
  roadmap:        "/modules/roadmap",
  prioritization: "/modules/prioritization",
  risks:          "/modules/risks",
  stakeholders:   "/modules/stakeholders",
  vpc:            "/modules/vpc",
  backlog:        "/modules/backlog",
  research:       "/modules/knowledge",
  communication:  "/modules/communication",
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface Module {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: "ATIVO" | "SYNC" | "STANDBY";
  color: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const MODULES: Module[] = [
  { id: "dashboard", icon: "⬡", title: "Dashboard", description: "Visão unificada de métricas, KPIs e indicadores estratégicos em tempo real.", status: "ATIVO", color: "#00d4ff" },
  { id: "knowledge", icon: "◈", title: "Knowledge Base", description: "Base de conhecimento centralizada com frameworks, templates e melhores práticas.", status: "ATIVO", color: "#00e5cc" },
  { id: "decisions", icon: "◎", title: "Decisions", description: "Registro estruturado de decisões estratégicas com contexto, alternativas e resultados.", status: "ATIVO", color: "#00ff88" },
  { id: "roadmap", icon: "⬢", title: "Roadmap", description: "Planejamento visual de iniciativas, epics e marcos com alinhamento estratégico.", status: "ATIVO", color: "#00d4ff" },
  { id: "prioritization", icon: "◇", title: "Prioritization", description: "Frameworks de priorização (RICE, ICE, MoSCoW) para maximizar impacto nos resultados.", status: "SYNC", color: "#00e5cc" },
  { id: "risks", icon: "△", title: "Risk Matrix", description: "Mapeamento e monitoramento de riscos com planos de mitigação estratégica.", status: "ATIVO", color: "#ff9900" },
  { id: "stakeholders", icon: "◉", title: "Stakeholders", description: "Gestão de partes interessadas com mapeamento de influência e comunicação.", status: "ATIVO", color: "#00ff88" },
  { id: "vpc", icon: "⬡", title: "Value Canvas", description: "Canvas de proposta de valor com análise de jobs, pains e gains do cliente.", status: "ATIVO", color: "#00d4ff" },
  { id: "research", icon: "◈", title: "Research Lab", description: "Repositório de pesquisas, experimentos e insights validados com usuários reais.", status: "STANDBY", color: "#c084fc" },
  { id: "backlog",       icon: "◫", title: "Backlog",      description: "Gestão de user stories, tasks, bugs e epics com story points e critérios de aceite.", status: "ATIVO",    color: "#ff9900" },
  { id: "communication", icon: "◈", title: "Comunicação",  description: "Gestão de comunicações, anúncios, newsletters e atualizações de status para stakeholders.", status: "ATIVO", color: "#c084fc" },
];


// ─── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: Particle[] = [];
    const COUNT = 80;
    const MAX_D = 150;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < COUNT; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, radius: Math.random() * 2 + 1, opacity: Math.random() * 0.5 + 0.2 });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(0,212,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,204,${p.opacity})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_D) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(0,212,255,${(1 - d / MAX_D) * 0.15})`; ctx.lineWidth = 0.5; ctx.stroke(); }
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
    started.current = false; // reset so it re-animates when real data arrives
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let cur = 0;
        const inc = Math.max(1, target / 60);
        const t = setInterval(() => {
          cur += inc;
          if (cur >= target) { setCount(target); clearInterval(t); }
          else setCount(Math.floor(cur));
        }, 2000 / 60);
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
        <linearGradient id="fg1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#00d4ff" /><stop offset="100%" stopColor="#00ff88" /></linearGradient>
        <linearGradient id="ff1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" stopOpacity="0.05" /><stop offset="100%" stopColor="#00ff88" stopOpacity="0.15" /></linearGradient>
        <linearGradient id="fl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00e5cc" /><stop offset="100%" stopColor="#00ff88" /></linearGradient>
        <filter id="fg"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="40" cy="40" r="37" stroke="url(#fg1)" strokeWidth="1" opacity="0.6" strokeDasharray="4 3" />
      <path d="M30 12 L30 28 L18 46 Q15 52 20 57 L60 57 Q65 52 62 46 L50 28 L50 12 Z" stroke="url(#fg1)" strokeWidth="2" fill="url(#ff1)" filter="url(#fg)" />
      <line x1="27" y1="12" x2="53" y2="12" stroke="url(#fg1)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="27" cy="28" r="3.5" fill="#00e5cc" filter="url(#fg)" />
      <circle cx="53" cy="34" r="3.5" fill="#00d4ff" filter="url(#fg)" />
      <circle cx="40" cy="48" r="5" fill="url(#fg1)" filter="url(#fg)" />
      <circle cx="27" cy="28" r="1.5" fill="white" />
      <circle cx="53" cy="34" r="1.5" fill="white" />
      <circle cx="40" cy="48" r="2" fill="white" />
      <path d="M27 28 L40 48 L53 34" stroke="url(#fg1)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#fg)" />
      <path d="M34 43 Q40 60 46 43" fill="url(#fl1)" opacity="0.5" />
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    apiGet<SystemStats>("/stats").then(setStats).catch(() => {});
  }, []);

  // Scroll to section when coming back from a module page
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (target) {
      const el = document.getElementById(target);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 80);
      }
    }
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

  // First name only
  const firstName = user?.user_full_name?.split(" ")[0] ?? "Usuário";

  return (
    <div className="pl-root">
      <ParticleCanvas />
      <div className="pl-scanline" />

      {/* HUD Corners */}
      <div className="hud-corner hud-tl" />
      <div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" />
      <div className="hud-corner hud-br" />

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
            {[["hero","INÍCIO"],["modules","MÓDULOS"],["stats","DADOS"],["about","MISSÃO"]].map(([id, label]) => (
              <li key={id}><button className="pl-nav__link" onClick={() => scrollTo(id)}>{label}</button></li>
            ))}
          </ul>
          <div className="pl-nav__user">
            <span className="pl-nav__user-dot" />
            <span className="pl-nav__user-name">{firstName.toUpperCase()}</span>
          </div>
          <button className="pl-nav__logout" onClick={handleLogout} title="Encerrar sessão">
            ⏻ SAIR
          </button>
          <div className="pl-nav__clock">{time}</div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="pl-hero">
        <div className="pl-hero__reactor">
          <div className="reactor-ring reactor-ring--1" />
          <div className="reactor-ring reactor-ring--2" />
          <div className="reactor-ring reactor-ring--3" />
          <div className="reactor-core">
            <FlaskLogo size={120} />
          </div>
          <div className="reactor-glow" />
        </div>

        <div className="pl-hero__content">
          <div className="hero-badge">
            <span className="hero-badge__dot" />
            <span className="hero-badge__text">// SISTEMA OPERACIONAL {import.meta.env.VITE_APP_VERSION ?? "dev"} — PROTOCOLO INICIADO //</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title__product">PRODUCT</span>
            <span className="hero-title__lab">LAB</span>
          </h1>

          <div className="hero-divider">
            <div className="hero-divider__line" />
            <div className="hero-divider__text">
              <span>KNOWLEDGE</span>
              <span className="hero-divider__gem">◆</span>
              <span>DECISIONS</span>
              <span className="hero-divider__gem">◆</span>
              <span>IMPACT</span>
            </div>
            <div className="hero-divider__line" />
          </div>

          <p className="hero-subtitle">
            O laboratório de inovação em gestão de produtos.<br />
            Onde dados se transformam em decisões estratégicas<br />
            e decisões se tornam impacto real.
          </p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={() => scrollTo("modules")}>
              <span className="btn-primary__glow" />
              INICIAR PROTOCOLO <span className="btn-primary__arrow">⟩</span>
            </button>
            <button className="btn-secondary" onClick={() => scrollTo("about")}>
              ACESSAR BRIEFING
            </button>
          </div>

          <div className="hero-telemetry">
            {[
              { label: "STATUS", value: "ATIVO", active: true },
              { label: "MÓDULOS", value: "10" },
              { label: "UPTIME", value: "99.8%" },
              { label: "LABS", value: "∞" },
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

      {/* ── MODULES ── */}
      <section id="modules" className="pl-modules">
        <div className="section-header">
          <div className="section-header__line" />
          <div className="section-header__content">
            <span className="section-eyebrow">// MÓDULOS DO SISTEMA //</span>
            <h2 className="section-title">LABORATÓRIOS <span className="section-title--accent">ATIVOS</span></h2>
          </div>
          <div className="section-header__line" />
        </div>

        <div className="modules-grid">
          {MODULES.map((mod) => (
              <div key={mod.id} className="module-card" style={{ "--card-color": mod.color, cursor: "pointer" } as React.CSSProperties} onClick={() => navigate(MODULE_ROUTES[mod.id] ?? "/home")}>
              <div className="module-card__corner module-card__corner--tl" />
              <div className="module-card__corner module-card__corner--br" />
              <div className="module-card__header">
                <span className="module-card__icon" style={{ color: mod.color }}>{mod.icon}</span>
                <span className={`module-card__status module-card__status--${mod.status.toLowerCase()}`}>
                  <span className="module-card__status-dot" />
                  {mod.status}
                </span>
              </div>
              <h3 className="module-card__title">{mod.title}</h3>
              <p className="module-card__desc">{mod.description}</p>
              <div className="module-card__footer">
                <div className="module-card__bar">
                  <div className="module-card__bar-fill" style={{ background: mod.color }} />
                </div>
                <span className="module-card__link" style={{ color: mod.color }}>ACESSAR ⟩</span>
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
            <span className="section-eyebrow">// TELEMETRIA DO SISTEMA //</span>
            <h2 className="section-title">DADOS <span className="section-title--accent">EM TEMPO REAL</span></h2>
          </div>
          <div className="section-header__line" />
        </div>
        <div className="stats-grid">
          {[
            { label: "Produtos",       value: stats?.products ?? 0 },
            { label: "Decisões",       value: stats?.decisions ?? 0 },
            { label: "Conhecimentos",  value: stats?.knowledge_items ?? 0 },
            { label: "Riscos",         value: stats?.risks ?? 0 },
            { label: "Roadmap items",  value: stats?.roadmap_items ?? 0 },
            { label: "Stakeholders",   value: stats?.stakeholders ?? 0 },
            { label: "Backlog items",  value: stats?.backlog_items ?? 0 },
            { label: "VPC Canvas",     value: stats?.vpc_items ?? 0 },
            { label: "Features",       value: stats?.product_features ?? 0 },
            { label: "Impactos",       value: stats?.product_impacts ?? 0 },
            { label: "Comunicações",   value: stats?.communications ?? 0 },
            { label: "Usuários",       value: stats?.users ?? 0 },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-card__corner stat-card__corner--tl" />
              <div className="stat-card__corner stat-card__corner--br" />
              <AnimatedCounter target={s.value} suffix="" />
              <div className="stat-label">{s.label}</div>
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
              <div className="about-flask-center">
                <FlaskLogo size={100} />
              </div>
            </div>
          </div>
          <div className="about-content">
            <span className="section-eyebrow">// BRIEFING DA MISSÃO //</span>
            <h2 className="section-title">NOSSA <span className="section-title--accent">MISSÃO</span></h2>
            <p className="about-text">
              O Product Lab é o centro de operações estratégicas para equipes de produto que buscam excelência. Combinamos metodologias ágeis, análise de dados e frameworks de decisão para transformar visões em produtos que geram impacto real.
            </p>
            <p className="about-text">
              Inspirado nos grandes laboratórios de inovação, nosso ambiente é desenhado para que Product Managers, Designers e Engenheiros colaborem com precisão cirúrgica — do discovery ao delivery.
            </p>
            <div className="about-pillars">
              {[
                { icon: "◈", title: "Knowledge", desc: "Frameworks e metodologias validadas" },
                { icon: "◎", title: "Decisions", desc: "Estrutura para decisões de alto impacto" },
                { icon: "◉", title: "Impact", desc: "Métricas claras de resultado e valor" },
              ].map((p) => (
                <div key={p.title} className="pillar">
                  <span className="pillar__icon">{p.icon}</span>
                  <div>
                    <div className="pillar__title">{p.title}</div>
                    <div className="pillar__desc">{p.desc}</div>
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
          <div className="pl-footer__tagline">KNOWLEDGE · DECISIONS · IMPACT</div>
          <div className="pl-footer__clock">{time}</div>
        </div>
        <div className="pl-footer__bar" />
      </footer>
    </div>
  );
}
