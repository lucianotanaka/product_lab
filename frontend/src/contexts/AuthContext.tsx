import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import i18n from "../i18n";

const API = import.meta.env.VITE_API_URL || "/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  user_id: number;
  user_full_name: string;
  user_email: string;
  user_is_active: boolean;
  user_role: "admin" | "user";
  user_theme: "dark" | "light";
  user_language: "en" | "pt" | "es";
  module_order: string[] | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: "dark" | "light") => Promise<void>;
  setLanguage: (lang: "en" | "pt" | "es") => Promise<void>;
  setModuleOrder: (order: string[]) => Promise<void>;
  isAdmin: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll", "click",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyLanguage(lang: "en" | "pt" | "es") {
  i18n.changeLanguage(lang);
  document.documentElement.setAttribute("lang", lang);
}

// Chamada autenticada — o cookie httpOnly é enviado automaticamente pelo browser.
// NÃO há token no código, NÃO há Authorization header.
async function authFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, isAuthenticated: false, isLoading: true,
  });

  const isAdmin = state.user?.user_role === "admin";
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Inactivity logout ────────────────────────────────────────────────────
  const doLogout = async () => {
    try {
      await authFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignora erros de rede — o cookie será removido pelo backend
    }
    localStorage.removeItem("pl_user");
    applyTheme("dark");
    applyLanguage("en");
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      console.info("[Auth] Sessão encerrada por inatividade (2h)");
      doLogout();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!state.isAuthenticated) {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      return;
    }
    resetInactivityTimer();
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetInactivityTimer, { passive: true })
    );
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetInactivityTimer)
      );
    };
  }, [state.isAuthenticated]);

  // ── Restore session — valida cookie via GET /auth/me ─────────────────────
  // O cookie httpOnly é enviado automaticamente; se o backend retornar 200,
  // a sessão está ativa. Não há token no localStorage.
  useEffect(() => {
    authFetch("/auth/me")
      .then(async res => {
        if (res.ok) {
          const user = (await res.json()) as User;
          if (!user.user_theme) user.user_theme = "dark";
          if (!user.user_language) user.user_language = "en";
          applyTheme(user.user_theme);
          applyLanguage(user.user_language);
          localStorage.setItem("pl_user", JSON.stringify(user));
          setState({ user, isAuthenticated: true, isLoading: false });
        } else {
          // Cookie expirado ou inválido
          localStorage.removeItem("pl_user");
          applyTheme("dark");
          applyLanguage("en");
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      })
      .catch(() => {
        // Backend indisponível — não assume autenticação local sem validação do cookie/sessão.
        localStorage.removeItem("pl_user");
        applyTheme("dark");
        applyLanguage("en");
        setState({ user: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    let res: Response;
    try {
      res = await fetch(`${API}/auth/login`, {
        method: "POST",
        credentials: "include",  // recebe o cookie httpOnly
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new Error(
        `Não foi possível conectar à API (${API}). Verifique se o backend está em execução. (${msg})`
      );
    }

    if (!res.ok) {
      const raw = await res.text();
      let detail = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(raw);
        detail = json.detail || json.message || raw;
      } catch {
        detail = raw || detail;
      }
      throw new Error(detail);
    }

    // O token está no cookie httpOnly — o frontend só recebe o objeto user
    const data = await res.json();
    const { user } = data;

    if (!user.user_theme) user.user_theme = "dark";
    if (!user.user_language) user.user_language = "en";

    applyTheme(user.user_theme);
    applyLanguage(user.user_language);
    // Salva apenas dados do usuário (sem token)
    localStorage.setItem("pl_user", JSON.stringify(user));
    setState({ user, isAuthenticated: true, isLoading: false });
    console.info("[Auth] Login OK:", user.user_email);
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => doLogout();

  // ── Set Theme ─────────────────────────────────────────────────────────────
  const setTheme = async (theme: "dark" | "light") => {
    applyTheme(theme);
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, user_theme: theme };
      localStorage.setItem("pl_user", JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
    try {
      await authFetch("/auth/me/theme", {
        method: "PATCH",
        body: JSON.stringify({ user_theme: theme }),
      });
    } catch (err) {
      console.warn("[Auth] Falha ao persistir tema:", err);
    }
  };

  // ── Set Language ──────────────────────────────────────────────────────────
  const setLanguage = async (lang: "en" | "pt" | "es") => {
    applyLanguage(lang);
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, user_language: lang };
      localStorage.setItem("pl_user", JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
    try {
      await authFetch("/auth/me/language", {
        method: "PATCH",
        body: JSON.stringify({ user_language: lang }),
      });
    } catch (err) {
      console.warn("[Auth] Falha ao persistir idioma:", err);
    }
  };

  // ── Set Module Order ──────────────────────────────────────────────────────
  const setModuleOrder = async (order: string[]) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, module_order: order };
      localStorage.setItem("pl_user", JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
    try {
      await authFetch("/auth/me/module_order", {
        method: "PATCH",
        body: JSON.stringify({ module_order: order }),
      });
    } catch (err) {
      console.warn("[Auth] Falha ao persistir ordem dos módulos:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, setTheme, setLanguage, setModuleOrder, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
