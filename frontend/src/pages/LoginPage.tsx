import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ForgotPasswordModal from "./ForgotPasswordModal";
import "../styles/hud.css";
import "../styles/login.css";

// ─── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let id: number;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "rgba(0,212,255,0.04)"; ctx.lineWidth = 1;
      for (let x = 0; x < c.width; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke(); }
      for (let y = 0; y < c.height; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke(); }
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x<0||p.x>c.width) p.vx*=-1; if (p.y<0||p.y>c.height) p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle="rgba(0,229,204,0.4)"; ctx.fill();
      });
      id = requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="pl-canvas" />;
}

// ─── Flask SVG ────────────────────────────────────────────────────────────────
function FlaskIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 80 80" fill="none" className="flask-logo">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#00ff88"/>
        </linearGradient>
        <filter id="gf"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="40" cy="40" r="37" stroke="url(#lg1)" strokeWidth="1" opacity="0.6" strokeDasharray="4 3"/>
      <path d="M30 12 L30 28 L18 46 Q15 52 20 57 L60 57 Q65 52 62 46 L50 28 L50 12 Z" stroke="url(#lg1)" strokeWidth="2" fill="rgba(0,212,255,0.05)" filter="url(#gf)"/>
      <line x1="27" y1="12" x2="53" y2="12" stroke="url(#lg1)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="27" cy="28" r="3.5" fill="#00e5cc" filter="url(#gf)"/>
      <circle cx="53" cy="34" r="3.5" fill="#00d4ff" filter="url(#gf)"/>
      <circle cx="40" cy="48" r="5" fill="url(#lg1)" filter="url(#gf)"/>
      <path d="M27 28 L40 48 L53 34" stroke="url(#lg1)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M34 43 Q40 60 46 43" fill="url(#lg1)" opacity="0.4"/>
    </svg>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("pt-BR", { hour12: false })), 1000);
    setTime(new Date().toLocaleTimeString("pt-BR", { hour12: false }));
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/home", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  // Health check on mount
  useEffect(() => {
    const api = import.meta.env.VITE_API_URL || "/api/v1";
    fetch(`${api}/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => setApiStatus(r.ok ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/home", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pl-root login-root">
      <ParticleCanvas />
      <div className="pl-scanline" />
      <div className="hud-corner hud-tl" />
      <div className="hud-corner hud-tr" />
      <div className="hud-corner hud-bl" />
      <div className="hud-corner hud-br" />

      <div className="login-clock">{time}</div>

      {/* Forgot Password Modal */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <div className="login-wrapper">
        {/* Left panel — branding */}
        <div className="login-brand">
          <div className="login-brand__rings">
            <div className="login-ring login-ring--1" />
            <div className="login-ring login-ring--2" />
            <div className="login-ring login-ring--3" />
            <div className="login-brand__icon"><FlaskIcon /></div>
          </div>
          <div className="login-brand__title">
            <span className="login-brand__product">PRODUCT</span>
            <span className="login-brand__lab">LAB</span>
          </div>
          <div className="login-brand__divider">
            <div className="login-brand__line" />
            <span className="login-brand__tagline">KNOWLEDGE · DECISIONS · IMPACT</span>
            <div className="login-brand__line" />
          </div>
          <p className="login-brand__desc">
            Sistema de gestão estratégica de produtos.<br/>
            Acesso restrito a usuários autorizados.
          </p>
          <div className="login-brand__status">
            <span className="login-status-dot" />
            <span className="login-status-text">SISTEMA OPERACIONAL</span>
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="login-panel">
          <div className="login-panel__corner login-panel__corner--tl" />
          <div className="login-panel__corner login-panel__corner--br" />

          <div className="login-header">
            <span className="login-header__eyebrow">// AUTENTICAÇÃO DO SISTEMA //</span>
            <h2 className="login-header__title">ACESSO <span className="login-header__accent">SEGURO</span></h2>
            <p className="login-header__sub">Insira suas credenciais para acessar o Product Lab</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
            {/* Email field */}
            <div className="login-field">
              <label className="login-field__label" htmlFor="email">
                <span className="login-field__icon">◈</span> E-MAIL
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="email"
                  type="email"
                  className="login-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <div className="login-field__bar" />
              </div>
            </div>

            {/* Password field */}
            <div className="login-field">
              <label className="login-field__label" htmlFor="password">
                <span className="login-field__icon">◉</span> SENHA
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-show-pass"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? "◎" : "◉"}
                </button>
                <div className="login-field__bar" />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="login-error">
                <span className="login-error__icon">⚠</span> {error}
              </div>
            )}

            {/* Forgot password */}
            <button
              type="button"
              className="login-forgot"
              onClick={() => setShowForgot(true)}
            >
              ESQUECI MINHA SENHA ◇
            </button>

            {/* Submit button */}
            <button type="submit" className="login-btn" disabled={loading}>
              <span className="login-btn__glow" />
              {loading ? (
                <span className="login-btn__loading">
                  <span className="login-spinner" />
                  AUTENTICANDO...
                </span>
              ) : (
                <>INICIAR SESSÃO <span className="login-btn__arrow">⟩</span></>
              )}
            </button>
          </form>

          {/* API status indicator */}
          <div className="login-api-status">
            <span
              className={`login-api-dot login-api-dot--${apiStatus}`}
              title={`API: ${apiStatus === "ok" ? "online" : apiStatus === "error" ? "offline/erro" : "verificando..."}`}
            />
            <span className="login-api-label">
              API&nbsp;
              {apiStatus === "checking" && "VERIFICANDO..."}
              {apiStatus === "ok"       && "ONLINE"}
              {apiStatus === "error"    && "OFFLINE — backend indisponível"}
            </span>
          </div>

          <div className="login-footer">
            <span className="login-footer__text">PRODUCT LAB v2.0</span>
            <span className="login-footer__sep">|</span>
            <span className="login-footer__text">ACESSO RESTRITO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
