import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api/v1";

type Step = "email" | "token" | "success";

interface Props {
  onClose: () => void;
}

export default function ForgotPasswordModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Helper: fetch + parse JSON with graceful error handling
  const apiFetch = async (path: string, body: object): Promise<{ ok: boolean; data: Record<string, unknown> }> => {
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      throw new Error(`Não foi possível conectar à API. Verifique se o backend está em execução. (${msg})`);
    }
    const raw = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(raw); } catch {
      // Server returned HTML (503, 404, nginx error page, etc.)
      if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
        throw new Error(`O servidor retornou uma página de erro (HTTP ${res.status}). Verifique se o backend está ativo.`);
      }
      throw new Error(`Resposta inválida do servidor (HTTP ${res.status}): ${raw.slice(0, 120)}`);
    }
    return { ok: res.ok, data };
  };

  // Step 1: Request reset token
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/auth/forgot-password", { email: email.trim() });
      if (!ok) throw new Error((data.detail as string) || `HTTP erro`);
      setResetToken((data.reset_token as string) ?? "");
      setStep("token");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar reset");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm reset with token + new password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("As senhas não conferem"); return; }
    if (newPassword.length < 8) { setError("Senha deve ter ao menos 8 caracteres"); return; }
    setLoading(true);
    try {
      const { ok, data } = await apiFetch("/auth/reset-password", {
        reset_token: tokenInput || resetToken,
        new_password: newPassword,
      });
      if (!ok) throw new Error((data.detail as string) || `HTTP erro`);
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__corner modal-panel__corner--tl" />
        <div className="modal-panel__corner modal-panel__corner--br" />

        {/* Header */}
        <div className="modal-header">
          <span className="modal-eyebrow">// REDEFINIÇÃO DE SENHA //</span>
          <h3 className="modal-title">RESET <span className="modal-title--accent">SEGURO</span></h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step 1: Enter email */}
        {step === "email" && (
          <form className="modal-form" onSubmit={handleRequestReset}>
            <p className="modal-desc">
              Informe o e-mail cadastrado. Um token de reset será gerado — entregue ao usuário pelo administrador.
            </p>
            <div className="login-field">
              <label className="login-field__label">
                <span className="login-field__icon">◈</span> E-MAIL CADASTRADO
              </label>
              <div className="login-field__input-wrap">
                <input
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
            {error && <div className="login-error"><span>⚠</span> {error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>CANCELAR</button>
              <button type="submit" className="login-btn modal-btn" disabled={loading}>
                <span className="login-btn__glow" />
                {loading ? "GERANDO TOKEN..." : "GERAR TOKEN ⟩"}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Show token + enter new password */}
        {step === "token" && (
          <form className="modal-form" onSubmit={handleConfirmReset}>
            {resetToken && (
              <div className="modal-token-box">
                <div className="modal-token-label">TOKEN DE RESET (validade: 30 min)</div>
                <div className="modal-token-value">
                  <code className="modal-token-code">{resetToken}</code>
                  <button type="button" className="modal-copy-btn" onClick={copyToken}>
                    {copied ? "✓ COPIADO" : "⎘ COPIAR"}
                  </button>
                </div>
                <p className="modal-token-hint">⚠ Entregue este token ao usuário pelo canal seguro.</p>
              </div>
            )}

            {!resetToken && (
              <div className="login-field">
                <label className="login-field__label">
                  <span className="login-field__icon">◇</span> TOKEN DE RESET
                </label>
                <div className="login-field__input-wrap">
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Cole o token aqui"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    required
                  />
                  <div className="login-field__bar" />
                </div>
              </div>
            )}

            <div className="login-field">
              <label className="login-field__label">
                <span className="login-field__icon">◉</span> NOVA SENHA
              </label>
              <div className="login-field__input-wrap">
                <input type="password" className="login-input" placeholder="Mínimo 8 caracteres"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <div className="login-field__bar" />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field__label">
                <span className="login-field__icon">◉</span> CONFIRMAR NOVA SENHA
              </label>
              <div className="login-field__input-wrap">
                <input type="password" className="login-input" placeholder="Repita a senha"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <div className="login-field__bar" />
              </div>
            </div>

            {error && <div className="login-error"><span>⚠</span> {error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setStep("email")}>VOLTAR</button>
              <button type="submit" className="login-btn modal-btn" disabled={loading}>
                <span className="login-btn__glow" />
                {loading ? "REDEFININDO..." : "REDEFINIR SENHA ⟩"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="modal-success">
            <div className="modal-success__icon">✓</div>
            <h4 className="modal-success__title">SENHA REDEFINIDA</h4>
            <p className="modal-success__text">A senha foi alterada com sucesso. O usuário já pode fazer login com a nova senha.</p>
            <button className="login-btn modal-btn" onClick={onClose}>
              <span className="login-btn__glow" />FECHAR ⟩
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
