import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserAdmin {
  user_id: number;
  user_full_name: string;
  user_email: string;
  user_is_active: boolean;
  user_role: "admin" | "user";
  user_reset_token: string | null;
  user_reset_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}
function tokenExpired(exp: string | null) {
  if (!exp) return true;
  return new Date(exp) < new Date();
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  ovr: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 } as React.CSSProperties,
  mdl: { background: "#0a1628", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 8, padding: "2rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" as const, fontFamily: "'Orbitron',monospace" } as React.CSSProperties,
  lbl: { display: "block", fontSize: 10, color: "#7899b0", letterSpacing: 2, marginBottom: 6, marginTop: 16 } as React.CSSProperties,
  inp: { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 4, color: "#e8f4fd", padding: "8px 12px", fontFamily: "'Orbitron',monospace", fontSize: 12, boxSizing: "border-box" as const } as React.CSSProperties,
  btnp: { background: "linear-gradient(135deg,rgba(0,212,255,0.2),rgba(0,229,204,0.1))", border: "1px solid rgba(0,212,255,0.4)", color: "#00d4ff", padding: "9px 18px", fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", borderRadius: 4, marginTop: 20 } as React.CSSProperties,
  btng: { background: "transparent", border: "1px solid rgba(120,153,176,0.3)", color: "#7899b0", padding: "9px 18px", fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", borderRadius: 4, marginTop: 20, marginLeft: 8 } as React.CSSProperties,
  btnd: { background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b", padding: "9px 18px", fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer", borderRadius: 4, marginTop: 20, marginLeft: 8 } as React.CSSProperties,
  act: { background: "transparent", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", padding: "3px 8px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: 1, cursor: "pointer", borderRadius: 3, marginRight: 4, whiteSpace: "nowrap" as const } as React.CSSProperties,
  actd: { background: "transparent", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b", padding: "3px 8px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: 1, cursor: "pointer", borderRadius: 3, marginRight: 4, whiteSpace: "nowrap" as const } as React.CSSProperties,
  actg: { background: "transparent", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", padding: "3px 8px", fontFamily: "'Orbitron',monospace", fontSize: 9, letterSpacing: 1, cursor: "pointer", borderRadius: 3, marginRight: 4, whiteSpace: "nowrap" as const } as React.CSSProperties,
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const admin = role === "admin";
  return <span style={{ fontSize: 10, letterSpacing: 1, padding: "2px 8px", borderRadius: 3, background: admin ? "rgba(255,153,0,0.15)" : "rgba(0,212,255,0.1)", color: admin ? "#ff9900" : "#00d4ff", border: `1px solid ${admin ? "rgba(255,153,0,0.3)" : "rgba(0,212,255,0.2)"}` }}>{role.toUpperCase()}</span>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <span style={{ fontSize: 10, letterSpacing: 1, padding: "2px 8px", borderRadius: 3, background: active ? "rgba(0,255,136,0.1)" : "rgba(255,107,107,0.1)", color: active ? "#00ff88" : "#ff6b6b", border: `1px solid ${active ? "rgba(0,255,136,0.2)" : "rgba(255,107,107,0.2)"}` }}>{active ? "ATIVO" : "INATIVO"}</span>;
}

function FieldErr({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div style={{ color: "#ff6b6b", fontSize: 11, marginTop: 12, padding: "8px 12px", background: "rgba(255,107,107,0.08)", borderRadius: 4, border: "1px solid rgba(255,107,107,0.2)" }}>⚠ {msg}</div>;
}

// ─── Modal: Create ────────────────────────────────────────────────────────────
function ModalCreate({ cf, setCf, onSave, onClose, saving, ferr }: {
  cf: { user_full_name: string; user_email: string; password: string; user_role: "admin" | "user" };
  setCf: React.Dispatch<React.SetStateAction<typeof cf>>;
  onSave: () => void; onClose: () => void; saving: boolean; ferr: string;
}) {
  return (
    <div style={S.ovr}>
      <div style={S.mdl}>
        <h2 style={{ fontFamily: "'Orbitron',monospace", color: "#00d4ff", fontSize: 16, margin: "0 0 4px" }}>NOVO USUÁRIO</h2>
        <div style={{ fontSize: 10, color: "#7899b0", letterSpacing: 2 }}>// CADASTRAR ACESSO //</div>
        <label style={S.lbl}>NOME COMPLETO</label>
        <input style={S.inp} value={cf.user_full_name} onChange={e => setCf(p => ({ ...p, user_full_name: e.target.value }))} placeholder="Nome do usuário" />
        <label style={S.lbl}>E-MAIL</label>
        <input style={S.inp} type="email" value={cf.user_email} onChange={e => setCf(p => ({ ...p, user_email: e.target.value }))} placeholder="email@empresa.com" />
        <label style={S.lbl}>SENHA INICIAL</label>
        <input style={S.inp} type="password" value={cf.password} onChange={e => setCf(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
        <label style={S.lbl}>PERFIL</label>
        <select style={S.inp} value={cf.user_role} onChange={e => setCf(p => ({ ...p, user_role: e.target.value as "admin" | "user" }))}>
          <option value="user">USER — Acesso padrão</option>
          <option value="admin">ADMIN — Acesso total</option>
        </select>
        <FieldErr msg={ferr} />
        <div style={{ display: "flex", marginTop: 4 }}>
          <button style={S.btnp} onClick={onSave} disabled={saving}>{saving ? "SALVANDO..." : "CRIAR USUÁRIO"}</button>
          <button style={S.btng} onClick={onClose}>CANCELAR</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Edit ──────────────────────────────────────────────────────────────
function ModalEdit({ u, ef, setEf, onSave, onClose, saving, ferr }: {
  u: UserAdmin;
  ef: { user_full_name: string; user_email: string; user_role: "admin" | "user"; user_is_active: boolean; new_password: string };
  setEf: React.Dispatch<React.SetStateAction<typeof ef>>;
  onSave: () => void; onClose: () => void; saving: boolean; ferr: string;
}) {
  return (
    <div style={S.ovr}>
      <div style={S.mdl}>
        <h2 style={{ fontFamily: "'Orbitron',monospace", color: "#00d4ff", fontSize: 16, margin: "0 0 4px" }}>EDITAR USUÁRIO</h2>
        <div style={{ fontSize: 10, color: "#7899b0", letterSpacing: 2 }}>#{u.user_id} — {u.user_email}</div>
        <label style={S.lbl}>NOME COMPLETO</label>
        <input style={S.inp} value={ef.user_full_name} onChange={e => setEf(p => ({ ...p, user_full_name: e.target.value }))} />
        <label style={S.lbl}>E-MAIL</label>
        <input style={S.inp} type="email" value={ef.user_email} onChange={e => setEf(p => ({ ...p, user_email: e.target.value }))} />
        <label style={S.lbl}>PERFIL</label>
        <select style={S.inp} value={ef.user_role} onChange={e => setEf(p => ({ ...p, user_role: e.target.value as "admin" | "user" }))}>
          <option value="user">USER</option>
          <option value="admin">ADMIN</option>
        </select>
        <label style={S.lbl}>STATUS</label>
        <select style={S.inp} value={ef.user_is_active ? "1" : "0"} onChange={e => setEf(p => ({ ...p, user_is_active: e.target.value === "1" }))}>
          <option value="1">ATIVO</option>
          <option value="0">INATIVO</option>
        </select>
        <label style={S.lbl}>NOVA SENHA (opcional)</label>
        <input style={S.inp} type="password" value={ef.new_password} onChange={e => setEf(p => ({ ...p, new_password: e.target.value }))} placeholder="Deixe em branco para manter" />
        <FieldErr msg={ferr} />
        <div style={{ display: "flex", marginTop: 4 }}>
          <button style={S.btnp} onClick={onSave} disabled={saving}>{saving ? "SALVANDO..." : "SALVAR"}</button>
          <button style={S.btng} onClick={onClose}>CANCELAR</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Token ─────────────────────────────────────────────────────────────
function ModalToken({ u, genToken, onClose }: {
  u: UserAdmin; genToken: { token: string; expires: string } | null; onClose: () => void;
}) {
  const token = genToken?.token ?? u.user_reset_token;
  const expires = genToken?.expires ?? u.user_reset_token_expires_at;
  return (
    <div style={S.ovr}>
      <div style={S.mdl}>
        <h2 style={{ fontFamily: "'Orbitron',monospace", color: "#00ff88", fontSize: 16, margin: "0 0 4px" }}>TOKEN DE RESET</h2>
        <div style={{ fontSize: 10, color: "#7899b0", letterSpacing: 2, marginBottom: 24 }}>{u.user_full_name} — {u.user_email}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: 6, color: "#00ff88", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", padding: "16px 24px", borderRadius: 8, display: "inline-block", marginBottom: 12 }}>
            {token}
          </div>
          <div style={{ fontSize: 11, color: "#7899b0", marginBottom: 8 }}>
            Expira: <span style={{ color: "#e8f4fd" }}>{fmtDate(expires)}</span>
          </div>
          <div style={{ fontSize: 10, color: "#ff9900", marginBottom: 16 }}>
            ⚠ Entregue este token ao usuário por canal seguro (WhatsApp, e-mail, etc.)
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button style={{ ...S.btnp, marginTop: 0 }} onClick={onClose}>FECHAR</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: me, isAdmin, logout } = useAuth();
  const nav = useNavigate();

  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserAdmin | null>(null);
  const [tokenTarget, setTokenTarget] = useState<UserAdmin | null>(null);
  const [genToken, setGenToken] = useState<{ token: string; expires: string } | null>(null);
  const [cf, setCf] = useState({ user_full_name: "", user_email: "", password: "", user_role: "user" as "admin" | "user" });
  const [ef, setEf] = useState({ user_full_name: "", user_email: "", user_role: "user" as "admin" | "user", user_is_active: true, new_password: "" });
  const [saving, setSaving] = useState(false);
  const [ferr, setFerr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try { setUsers(await apiGet<UserAdmin[]>("/users/")); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erro ao carregar"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isAdmin) { nav("/home", { replace: true }); return; }
    load();
  }, [isAdmin]);

  const doCreate = async () => {
    setFerr("");
    if (!cf.user_full_name.trim()) return setFerr("Nome obrigatório");
    if (!cf.user_email.trim()) return setFerr("E-mail obrigatório");
    if (cf.password.length < 8) return setFerr("Senha mín. 8 caracteres");
    setSaving(true);
    try { await apiPost("/users/", cf); setShowCreate(false); setCf({ user_full_name: "", user_email: "", password: "", user_role: "user" }); await load(); }
    catch (e: unknown) { setFerr(e instanceof Error ? e.message : "Erro ao criar"); }
    finally { setSaving(false); }
  };

  const openEdit = (u: UserAdmin) => {
    setEditing(u);
    setEf({ user_full_name: u.user_full_name, user_email: u.user_email, user_role: u.user_role, user_is_active: u.user_is_active, new_password: "" });
    setFerr("");
  };

  const doEdit = async () => {
    if (!editing) return;
    setFerr("");
    if (!ef.user_full_name.trim()) return setFerr("Nome obrigatório");
    if (!ef.user_email.trim()) return setFerr("E-mail obrigatório");
    if (ef.new_password && ef.new_password.length < 8) return setFerr("Nova senha mín. 8 caracteres");
    const body: Record<string, unknown> = { user_full_name: ef.user_full_name, user_email: ef.user_email, user_role: ef.user_role, user_is_active: ef.user_is_active };
    if (ef.new_password) body.new_password = ef.new_password;
    setSaving(true);
    try { await apiPatch(`/users/${editing.user_id}`, body); setEditing(null); await load(); }
    catch (e: unknown) { setFerr(e instanceof Error ? e.message : "Erro ao editar"); }
    finally { setSaving(false); }
  };

  const doGenToken = async (u: UserAdmin) => {
    setTokenTarget(u); setGenToken(null);
    try {
      const r = await apiPost<{ reset_token: string; expires_at: string }>(`/users/${u.user_id}/reset-token`, {});
      setGenToken({ token: r.reset_token, expires: r.expires_at });
      await load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro ao gerar token"); }
  };

  const doRevoke = async (u: UserAdmin) => {
    if (!confirm(`Revogar token de ${u.user_full_name}?`)) return;
    try {
      await apiDelete(`/users/${u.user_id}/reset-token`);
      await load();
      if (tokenTarget?.user_id === u.user_id) { setTokenTarget(null); setGenToken(null); }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro ao revogar"); }
  };

  return (
    <div className="mod-root">
      {/* Modals */}
      {showCreate && <ModalCreate cf={cf} setCf={setCf} onSave={doCreate} onClose={() => setShowCreate(false)} saving={saving} ferr={ferr} />}
      {editing && <ModalEdit u={editing} ef={ef} setEf={setEf} onSave={doEdit} onClose={() => setEditing(null)} saving={saving} ferr={ferr} />}
      {tokenTarget && <ModalToken u={tokenTarget} genToken={genToken} onClose={() => { setTokenTarget(null); setGenToken(null); }} />}

      {/* NAV */}
      <nav className="mod-nav">
        <div className="mod-nav__inner">
          <button className="mod-nav__back" onClick={() => nav("/home")}>⟨ HOME</button>
          <div className="mod-nav__title">
            <span className="mod-nav__icon">⚙</span>
            <span className="mod-nav__name">GESTÃO DE <span className="mod-nav__accent">USUÁRIOS</span></span>
          </div>
          <div className="mod-nav__user">
            <span className="mod-nav__user-dot" />
            {me?.user_full_name?.split(" ")[0]?.toUpperCase() ?? "ADMIN"}
            <span style={{ marginLeft: 6, fontSize: 9, color: "#ff9900", border: "1px solid rgba(255,153,0,0.4)", padding: "1px 6px", borderRadius: 3 }}>ADMIN</span>
          </div>
          <button className="mod-nav__back" style={{ borderColor: "rgba(255,107,107,0.3)", color: "#ff6b6b" }} onClick={() => { logout(); nav("/"); }}>⏻ SAIR</button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="mod-main" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 3, marginBottom: 4 }}>// ADMINISTRAÇÃO DO SISTEMA //</div>
            <h1 style={{ fontFamily: "'Orbitron',monospace", color: "#e8f4fd", fontSize: 22, fontWeight: 700, margin: 0 }}>
              GESTÃO DE <span style={{ color: "#00d4ff" }}>USUÁRIOS</span>
            </h1>
          </div>
          <button style={S.btnp} onClick={() => { setShowCreate(true); setFerr(""); }}>+ NOVO USUÁRIO</button>
        </div>

        {err && <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b", padding: "12px 16px", borderRadius: 4, marginBottom: 20, fontSize: 12 }}>⚠ {err}</div>}

        {loading ? (
          <div style={{ color: "#00d4ff", fontFamily: "'Orbitron',monospace", fontSize: 12, letterSpacing: 3, textAlign: "center", padding: "4rem" }}>CARREGANDO USUÁRIOS...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Orbitron',monospace" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,212,255,0.2)" }}>
                  {["ID", "NOME", "E-MAIL", "ROLE", "STATUS", "TOKEN RESET", "CRIADO EM", "AÇÕES"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, color: "#7899b0", letterSpacing: 2, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#7899b0", fontSize: 12 }}>Nenhum usuário encontrado</td></tr>
                )}
                {users.map(u => (
                  <tr key={u.user_id}
                    style={{ borderBottom: "1px solid rgba(0,212,255,0.06)", opacity: u.user_is_active ? 1 : 0.5, transition: "background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "#7899b0" }}>#{u.user_id}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#e8f4fd", whiteSpace: "nowrap" }}>{u.user_full_name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "#a0bcd0" }}>{u.user_email}</td>
                    <td style={{ padding: "10px 12px" }}><RoleBadge role={u.user_role} /></td>
                    <td style={{ padding: "10px 12px" }}><StatusBadge active={u.user_is_active} /></td>
                    <td style={{ padding: "10px 12px", minWidth: 170 }}>
                      {u.user_reset_token ? (
                        <div>
                          <div style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: 2, color: tokenExpired(u.user_reset_token_expires_at) ? "#ff6b6b" : "#00ff88", background: "rgba(0,0,0,0.3)", padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 3 }}>
                            {u.user_reset_token}
                          </div>
                          <div style={{ fontSize: 9, color: "#7899b0" }}>
                            {tokenExpired(u.user_reset_token_expires_at) ? "⚠ EXPIRADO" : `Expira ${fmtDate(u.user_reset_token_expires_at)}`}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: "#7899b0" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 10, color: "#7899b0", whiteSpace: "nowrap" }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <button style={S.act} onClick={() => openEdit(u)}>✎ EDITAR</button>
                      {u.user_reset_token ? (
                        <>
                          <button style={S.actg} onClick={() => { setTokenTarget(u); setGenToken(null); }}>👁 VER TOKEN</button>
                          <button style={S.actd} onClick={() => doRevoke(u)}>✕ REVOGAR</button>
                        </>
                      ) : (
                        <button style={S.actg} onClick={() => doGenToken(u)}>⟳ GERAR TOKEN</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
