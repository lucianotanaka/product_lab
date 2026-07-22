import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../shared/services/api";
import ThemeToggle from "../../../shared/components/ThemeToggle";
import LanguageSelector from "../../../shared/components/LanguageSelector";
import { INTL_LOCALE } from "../../../i18n";

export interface UserAdmin {
  user_id: number; user_full_name: string; user_email: string;
  user_is_active: boolean; user_role: "admin" | "user";
  user_reset_token: string | null; user_reset_token_expires_at: string | null;
  created_at: string; updated_at: string;
}

function fmtDate(iso: string | null, locale = "en-US") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale);
}
function tokenExpired(exp: string | null) {
  if (!exp) return true;
  return new Date(exp) < new Date();
}

function makeStyles(dark: boolean) {
  const c=dark?"#00d4ff":"#0088aa", mu=dark?"#7899b0":"#5a7080", bt=dark?"#e8f4fd":"#1a2a3a";
  const st=dark?"#a0bcd0":"#2a3a4a", mb=dark?"#0a1628":"#FFFFFF";
  const mbd=dark?"rgba(0,212,255,0.3)":"rgba(0,136,170,0.25)";
  const ib=dark?"rgba(0,0,0,0.4)":"rgba(0,136,170,0.03)";
  const ibd=dark?"rgba(0,212,255,0.2)":"rgba(0,136,170,0.18)";
  const rb=dark?"rgba(0,212,255,0.06)":"rgba(0,136,170,0.08)";
  const tb=dark?"rgba(0,212,255,0.2)":"rgba(0,136,170,0.15)";
  const rh=dark?"rgba(0,212,255,0.03)":"rgba(0,136,170,0.03)";
  const tk=dark?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.05)";
  const gr=dark?"#00ff88":"#006e38", rd=dark?"#ff6b6b":"#cc3333", am=dark?"#ff9900":"#b85c00";
  const cb=dark?"rgba(0,212,255,0.2)":"rgba(0,136,170,0.2)";
  return {
    c,mu,bt,st,mb,mbd,ib,ibd,rb,tb,rh,tk,gr,rd,am,
    ovr:{position:"fixed",inset:0,background:dark?"rgba(0,0,0,0.75)":"rgba(180,195,210,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999} as React.CSSProperties,
    mdl:{background:mb,border:`1px solid ${mbd}`,borderRadius:8,padding:"2rem",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto" as const,fontFamily:"'Orbitron',monospace"} as React.CSSProperties,
    lbl:{display:"block",fontSize:10,color:c,letterSpacing:2,marginBottom:6,marginTop:16} as React.CSSProperties,
    inp:{width:"100%",background:ib,border:`1px solid ${ibd}`,borderRadius:4,color:bt,padding:"8px 12px",fontFamily:"'Orbitron',monospace",fontSize:12,boxSizing:"border-box" as const} as React.CSSProperties,
    btnp:{background:dark?"linear-gradient(135deg,rgba(0,212,255,0.2),rgba(0,229,204,0.1))":"linear-gradient(135deg,rgba(0,136,170,0.12),rgba(0,122,110,0.08))",border:`1px solid ${dark?"rgba(0,212,255,0.4)":"rgba(0,136,170,0.45)"}`,color:c,padding:"9px 18px",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2,cursor:"pointer",borderRadius:4,marginTop:20} as React.CSSProperties,
    btng:{background:"transparent",border:`1px solid ${dark?"rgba(120,153,176,0.3)":"rgba(90,112,128,0.3)"}`,color:mu,padding:"9px 18px",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2,cursor:"pointer",borderRadius:4,marginTop:20,marginLeft:8} as React.CSSProperties,
    btnd:{background:dark?"rgba(255,107,107,0.1)":"rgba(204,51,51,0.06)",border:`1px solid ${dark?"rgba(255,107,107,0.3)":"rgba(204,51,51,0.3)"}`,color:rd,padding:"9px 18px",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2,cursor:"pointer",borderRadius:4,marginTop:20,marginLeft:8} as React.CSSProperties,
    act:{background:"transparent",border:`1px solid ${cb}`,color:c,padding:"3px 8px",fontFamily:"'Orbitron',monospace",fontSize:9,letterSpacing:1,cursor:"pointer",borderRadius:3,marginRight:4,whiteSpace:"nowrap" as const} as React.CSSProperties,
    actd:{background:"transparent",border:`1px solid ${dark?"rgba(255,107,107,0.2)":"rgba(204,51,51,0.25)"}`,color:rd,padding:"3px 8px",fontFamily:"'Orbitron',monospace",fontSize:9,letterSpacing:1,cursor:"pointer",borderRadius:3,marginRight:4,whiteSpace:"nowrap" as const} as React.CSSProperties,
    actg:{background:"transparent",border:`1px solid ${dark?"rgba(0,255,136,0.2)":"rgba(0,110,56,0.25)"}`,color:gr,padding:"3px 8px",fontFamily:"'Orbitron',monospace",fontSize:9,letterSpacing:1,cursor:"pointer",borderRadius:3,marginRight:4,whiteSpace:"nowrap" as const} as React.CSSProperties,
  };
}
type S = ReturnType<typeof makeStyles>;

function RoleBadge({ role, dark }: { role: string; dark: boolean }) {
  const admin = role === "admin";
  return <span style={{ fontSize:10,letterSpacing:1,padding:"2px 8px",borderRadius:3,background:admin?(dark?"rgba(255,153,0,0.15)":"rgba(184,92,0,0.1)"):(dark?"rgba(0,212,255,0.1)":"rgba(0,136,170,0.1)"),color:admin?(dark?"#ff9900":"#b85c00"):(dark?"#00d4ff":"#0088aa"),border:`1px solid ${admin?(dark?"rgba(255,153,0,0.3)":"rgba(184,92,0,0.3)"):(dark?"rgba(0,212,255,0.2)":"rgba(0,136,170,0.25)")}` }}>{role.toUpperCase()}</span>;
}

function StatusBadge({ active, dark }: { active: boolean; dark: boolean }) {
  const { t } = useTranslation();
  return <span style={{ fontSize:10,letterSpacing:1,padding:"2px 8px",borderRadius:3,background:active?(dark?"rgba(0,255,136,0.1)":"rgba(0,110,56,0.08)"):(dark?"rgba(255,107,107,0.1)":"rgba(204,51,51,0.08)"),color:active?(dark?"#00ff88":"#006e38"):(dark?"#ff6b6b":"#cc3333"),border:`1px solid ${active?(dark?"rgba(0,255,136,0.2)":"rgba(0,110,56,0.25)"):(dark?"rgba(255,107,107,0.2)":"rgba(204,51,51,0.25)")}` }}>{active?t("users_page.status_active"):t("users_page.status_inactive")}</span>;
}

function FieldErr({ msg, dark }: { msg: string; dark: boolean }) {
  if (!msg) return null;
  return <div style={{ color:dark?"#ff6b6b":"#cc3333",fontSize:11,marginTop:12,padding:"8px 12px",background:dark?"rgba(255,107,107,0.08)":"rgba(204,51,51,0.06)",borderRadius:4,border:`1px solid ${dark?"rgba(255,107,107,0.2)":"rgba(204,51,51,0.2)"}` }}>⚠ {msg}</div>;
}

function ModalCreate({ s,dark,cf,setCf,onSave,onClose,saving,ferr }:{ s:S;dark:boolean;cf:{user_full_name:string;user_email:string;password:string;user_role:"admin"|"user"};setCf:React.Dispatch<React.SetStateAction<typeof cf>>;onSave:()=>void;onClose:()=>void;saving:boolean;ferr:string }) {
  const { t } = useTranslation();
  return (
    <div style={s.ovr}><div style={s.mdl}>
      <h2 style={{ fontFamily:"'Orbitron',monospace",color:s.c,fontSize:16,margin:"0 0 4px" }}>{t("users_page.modal_create_title")}</h2>
      <div style={{ fontSize:10,color:s.mu,letterSpacing:2 }}>{t("users_page.modal_create_eyebrow")}</div>
      <label style={s.lbl}>{t("users_page.label_fullname")}</label>
      <input style={s.inp} value={cf.user_full_name} onChange={e=>setCf(p=>({...p,user_full_name:e.target.value}))} placeholder={t("users_page.placeholder_name")} />
      <label style={s.lbl}>{t("users_page.label_email")}</label>
      <input style={s.inp} type="email" value={cf.user_email} onChange={e=>setCf(p=>({...p,user_email:e.target.value}))} placeholder={t("users_page.placeholder_email")} />
      <label style={s.lbl}>{t("users_page.label_password")}</label>
      <input style={s.inp} type="password" value={cf.password} onChange={e=>setCf(p=>({...p,password:e.target.value}))} placeholder={t("users_page.placeholder_password")} />
      <label style={s.lbl}>{t("users_page.label_role")}</label>
      <select style={s.inp} value={cf.user_role} onChange={e=>setCf(p=>({...p,user_role:e.target.value as "admin"|"user"}))}>
        <option value="user">{t("users_page.role_user")}</option>
        <option value="admin">{t("users_page.role_admin")}</option>
      </select>
      <FieldErr msg={ferr} dark={dark} />
      <div style={{ display:"flex",marginTop:4 }}>
        <button style={s.btnp} onClick={onSave} disabled={saving}>{saving?t("users_page.btn_saving"):t("users_page.btn_create")}</button>
        <button style={s.btng} onClick={onClose}>{t("users_page.btn_cancel")}</button>
      </div>
    </div></div>
  );
}

function ModalEdit({ s,dark,u,ef,setEf,onSave,onClose,saving,ferr }:{ s:S;dark:boolean;u:UserAdmin;ef:{user_full_name:string;user_email:string;user_role:"admin"|"user";user_is_active:boolean;new_password:string};setEf:React.Dispatch<React.SetStateAction<typeof ef>>;onSave:()=>void;onClose:()=>void;saving:boolean;ferr:string }) {
  const { t } = useTranslation();
  return (
    <div style={s.ovr}><div style={s.mdl}>
      <h2 style={{ fontFamily:"'Orbitron',monospace",color:s.c,fontSize:16,margin:"0 0 4px" }}>{t("users_page.modal_edit_title")}</h2>
      <div style={{ fontSize:10,color:s.mu,letterSpacing:2 }}>#{u.user_id} — {u.user_email}</div>
      <label style={s.lbl}>{t("users_page.label_fullname")}</label>
      <input style={s.inp} value={ef.user_full_name} onChange={e=>setEf(p=>({...p,user_full_name:e.target.value}))} />
      <label style={s.lbl}>{t("users_page.label_email")}</label>
      <input style={s.inp} type="email" value={ef.user_email} onChange={e=>setEf(p=>({...p,user_email:e.target.value}))} />
      <label style={s.lbl}>{t("users_page.label_role")}</label>
      <select style={s.inp} value={ef.user_role} onChange={e=>setEf(p=>({...p,user_role:e.target.value as "admin"|"user"}))}>
        <option value="user">{t("users_page.role_user_short")}</option>
        <option value="admin">{t("users_page.role_admin_short")}</option>
      </select>
      <label style={s.lbl}>{t("users_page.label_status")}</label>
      <select style={s.inp} value={ef.user_is_active?"1":"0"} onChange={e=>setEf(p=>({...p,user_is_active:e.target.value==="1"}))}>
        <option value="1">{t("users_page.status_active")}</option>
        <option value="0">{t("users_page.status_inactive")}</option>
      </select>
      <label style={s.lbl}>{t("users_page.label_new_password")}</label>
      <input style={s.inp} type="password" value={ef.new_password} onChange={e=>setEf(p=>({...p,new_password:e.target.value}))} placeholder={t("users_page.placeholder_new_password")} />
      <FieldErr msg={ferr} dark={dark} />
      <div style={{ display:"flex",marginTop:4 }}>
        <button style={s.btnp} onClick={onSave} disabled={saving}>{saving?t("users_page.btn_saving"):t("users_page.btn_save")}</button>
        <button style={s.btng} onClick={onClose}>{t("users_page.btn_cancel")}</button>
      </div>
    </div></div>
  );
}

function ModalToken({ s,u,genToken,onClose }:{ s:S;u:UserAdmin;genToken:{token:string;expires:string}|null;onClose:()=>void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const intlLocale = INTL_LOCALE[user?.user_language ?? "en"] ?? "en-US";
  const token   = genToken?.token   ?? u.user_reset_token;
  const expires = genToken?.expires ?? u.user_reset_token_expires_at;
  return (
    <div style={s.ovr}><div style={s.mdl}>
      <h2 style={{ fontFamily:"'Orbitron',monospace",color:s.gr,fontSize:16,margin:"0 0 4px" }}>{t("users_page.modal_token_title")}</h2>
      <div style={{ fontSize:10,color:s.mu,letterSpacing:2,marginBottom:24 }}>{u.user_full_name} — {u.user_email}</div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"monospace",fontSize:28,letterSpacing:6,color:s.gr,background:"rgba(0,0,0,0.08)",border:`1px solid ${s.gr}44`,padding:"16px 24px",borderRadius:8,display:"inline-block",marginBottom:12 }}>{token}</div>
        <div style={{ fontSize:11,color:s.mu,marginBottom:8 }}>{t("users_page.token_expires_at")} <span style={{ color:s.bt }}>{fmtDate(expires, intlLocale)}</span></div>
        <div style={{ fontSize:10,color:s.am,marginBottom:16 }}>{t("users_page.token_warning")}</div>
      </div>
      <div style={{ display:"flex",justifyContent:"center" }}>
        <button style={{ ...s.btnp,marginTop:0 }} onClick={onClose}>{t("users_page.btn_close")}</button>
      </div>
    </div></div>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: me, isAdmin, logout } = useAuth();
  const nav = useNavigate();
  const dark = me?.user_theme !== "light";
  const s = makeStyles(dark);
  const intlLocale = INTL_LOCALE[me?.user_language ?? "en"] ?? "en-US";

  const [users, setUsers]   = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserAdmin | null>(null);
  const [tokenTarget, setTokenTarget] = useState<UserAdmin | null>(null);
  const [genToken, setGenToken] = useState<{ token: string; expires: string } | null>(null);
  const [cf, setCf] = useState({ user_full_name:"", user_email:"", password:"", user_role:"user" as "admin"|"user" });
  const [ef, setEf] = useState({ user_full_name:"", user_email:"", user_role:"user" as "admin"|"user", user_is_active:true, new_password:"" });
  const [saving, setSaving] = useState(false);
  const [ferr, setFerr]     = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try { setUsers(await apiGet<UserAdmin[]>("/users/")); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : t("users_page.err_load")); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isAdmin) { nav("/home", { replace: true }); return; }
    load();
  }, [isAdmin]);

  const doCreate = async () => {
    setFerr("");
    if (!cf.user_full_name.trim()) return setFerr(t("users_page.err_name_required"));
    if (!cf.user_email.trim())     return setFerr(t("users_page.err_email_required"));
    if (cf.password.length < 8)    return setFerr(t("users_page.err_password_min"));
    setSaving(true);
    try { await apiPost("/users/", cf); setShowCreate(false); setCf({ user_full_name:"", user_email:"", password:"", user_role:"user" }); await load(); }
    catch (e: unknown) { setFerr(e instanceof Error ? e.message : t("users_page.err_create")); }
    finally { setSaving(false); }
  };

  const openEdit = (u: UserAdmin) => {
    setEditing(u);
    setEf({ user_full_name:u.user_full_name, user_email:u.user_email, user_role:u.user_role, user_is_active:u.user_is_active, new_password:"" });
    setFerr("");
  };

  const doEdit = async () => {
    if (!editing) return;
    setFerr("");
    if (!ef.user_full_name.trim()) return setFerr(t("users_page.err_name_required"));
    if (!ef.user_email.trim())     return setFerr(t("users_page.err_email_required"));
    if (ef.new_password && ef.new_password.length < 8) return setFerr(t("users_page.err_new_password_min"));
    const body: Record<string, unknown> = { user_full_name:ef.user_full_name, user_email:ef.user_email, user_role:ef.user_role, user_is_active:ef.user_is_active };
    if (ef.new_password) body.new_password = ef.new_password;
    setSaving(true);
    try { await apiPatch(`/users/${editing.user_id}`, body); setEditing(null); await load(); }
    catch (e: unknown) { setFerr(e instanceof Error ? e.message : t("users_page.err_edit")); }
    finally { setSaving(false); }
  };

  const doGenToken = async (u: UserAdmin) => {
    setTokenTarget(u); setGenToken(null);
    try {
      const r = await apiPost<{ reset_token: string; expires_at: string }>(`/users/${u.user_id}/reset-token`, {});
      setGenToken({ token: r.reset_token, expires: r.expires_at });
      await load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : t("users_page.err_gen_token")); }
  };

  const doRevoke = async (u: UserAdmin) => {
    if (!confirm(t("users_page.confirm_revoke", { name: u.user_full_name }))) return;
    try {
      await apiDelete(`/users/${u.user_id}/reset-token`);
      await load();
      if (tokenTarget?.user_id === u.user_id) { setTokenTarget(null); setGenToken(null); }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : t("users_page.err_revoke")); }
  };

  const cols = [
    t("users_page.col_id"), t("users_page.col_name"), t("users_page.col_email"),
    t("users_page.col_role"), t("users_page.col_status"), t("users_page.col_token"),
    t("users_page.col_created"), t("users_page.col_actions"),
  ];

  return (
    <div className="mod-root">
      {showCreate && <ModalCreate s={s} dark={dark} cf={cf} setCf={setCf} onSave={doCreate} onClose={()=>setShowCreate(false)} saving={saving} ferr={ferr} />}
      {editing    && <ModalEdit   s={s} dark={dark} u={editing} ef={ef} setEf={setEf} onSave={doEdit} onClose={()=>setEditing(null)} saving={saving} ferr={ferr} />}
      {tokenTarget && <ModalToken s={s} u={tokenTarget} genToken={genToken} onClose={()=>{ setTokenTarget(null); setGenToken(null); }} />}

      <nav className="mod-nav">
        <div className="mod-nav__inner">
          <button className="mod-nav__back" onClick={()=>nav("/home", { state: { scrollTo: "modules" } })}>{t("nav.back_home")}</button>
          <div className="mod-nav__title">
            <span className="mod-nav__icon">⚙</span>
            <span className="mod-nav__name">{t("users_page.nav_title_prefix")} <span className="mod-nav__accent">{t("users_page.nav_title_accent")}</span></span>
          </div>
          <div className="mod-nav__user">
            <span className="mod-nav__user-dot" />
            {me?.user_full_name?.split(" ")[0]?.toUpperCase() ?? "ADMIN"}
            <span style={{ marginLeft:6,fontSize:9,color:dark?"#ff9900":"#b85c00",border:`1px solid ${dark?"rgba(255,153,0,0.4)":"rgba(184,92,0,0.35)"}`,padding:"1px 6px",borderRadius:3 }}>{t("users_page.admin_badge")}</span>
          </div>
          <LanguageSelector variant="mod" />
          <ThemeToggle variant="mod" />
          <button className="mod-nav__back" style={{ borderColor:"rgba(255,107,107,0.3)",color:dark?"#ff6b6b":"#cc3333" }} onClick={()=>{ logout(); nav("/"); }}>{t("common.logout")}</button>
        </div>
      </nav>

      <main className="mod-main" style={{ padding:"2rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem" }}>
          <div>
            <div style={{ fontSize:11,color:s.c,letterSpacing:3,marginBottom:4 }}>{t("users_page.eyebrow")}</div>
            <h1 style={{ fontFamily:"'Orbitron',monospace",color:s.bt,fontSize:22,fontWeight:700,margin:0 }}>
              {t("users_page.title_prefix")} <span style={{ color:s.c }}>{t("users_page.title_accent")}</span>
            </h1>
          </div>
          <button style={{ ...s.btnp,marginTop:0 }} onClick={()=>{ setShowCreate(true); setFerr(""); }}>{t("users_page.btn_new")}</button>
        </div>

        {err && <div style={{ background:dark?"rgba(255,107,107,0.1)":"rgba(204,51,51,0.06)",border:`1px solid ${dark?"rgba(255,107,107,0.3)":"rgba(204,51,51,0.3)"}`,color:s.rd,padding:"12px 16px",borderRadius:4,marginBottom:20,fontSize:12 }}>⚠ {err}</div>}

        {loading ? (
          <div style={{ color:s.c,fontFamily:"'Orbitron',monospace",fontSize:12,letterSpacing:3,textAlign:"center",padding:"4rem" }}>{t("users_page.loading")}</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",fontFamily:"'Orbitron',monospace" }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${s.tb}` }}>
                  {cols.map(h => <th key={h} style={{ textAlign:"left",padding:"10px 12px",fontSize:10,color:s.c,letterSpacing:2,whiteSpace:"nowrap" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign:"center",padding:"3rem",color:s.mu,fontSize:12 }}>{t("users_page.empty")}</td></tr>
                )}
                {users.map(u => (
                  <tr key={u.user_id}
                    style={{ borderBottom:`1px solid ${s.rb}`,opacity:u.user_is_active?1:0.5,transition:"background 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=s.rh)}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                  >
                    <td style={{ padding:"10px 12px",fontSize:11,color:s.mu }}>#{u.user_id}</td>
                    <td style={{ padding:"10px 12px",fontSize:12,color:s.bt,whiteSpace:"nowrap" }}>{u.user_full_name}</td>
                    <td style={{ padding:"10px 12px",fontSize:11,color:s.st }}>{u.user_email}</td>
                    <td style={{ padding:"10px 12px" }}><RoleBadge role={u.user_role} dark={dark} /></td>
                    <td style={{ padding:"10px 12px" }}><StatusBadge active={u.user_is_active} dark={dark} /></td>
                    <td style={{ padding:"10px 12px",minWidth:170 }}>
                      {u.user_reset_token ? (
                        <div>
                          <div style={{ fontFamily:"monospace",fontSize:13,letterSpacing:2,color:tokenExpired(u.user_reset_token_expires_at)?s.rd:s.gr,background:s.tk,padding:"3px 8px",borderRadius:3,display:"inline-block",marginBottom:3 }}>{u.user_reset_token}</div>
                          <div style={{ fontSize:9,color:s.mu }}>
                            {tokenExpired(u.user_reset_token_expires_at) ? t("users_page.token_expired") : t("users_page.token_expires", { date: fmtDate(u.user_reset_token_expires_at, intlLocale) })}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize:10,color:s.mu }}>—</span>
                      )}
                    </td>
                    <td style={{ padding:"10px 12px",fontSize:10,color:s.mu,whiteSpace:"nowrap" }}>{fmtDate(u.created_at, intlLocale)}</td>
                    <td style={{ padding:"10px 12px",whiteSpace:"nowrap" }}>
                      <button style={s.act} onClick={()=>openEdit(u)}>{t("users_page.btn_edit")}</button>
                      {u.user_reset_token ? (
                        <>
                          <button style={s.actg} onClick={()=>{ setTokenTarget(u); setGenToken(null); }}>{t("users_page.btn_view_token")}</button>
                          <button style={s.actd} onClick={()=>doRevoke(u)}>{t("users_page.btn_revoke")}</button>
                        </>
                      ) : (
                        <button style={s.actg} onClick={()=>doGenToken(u)}>{t("users_page.btn_gen_token")}</button>
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
