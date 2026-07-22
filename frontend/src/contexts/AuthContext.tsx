import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import i18n from "../i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  user_id: number;
  user_full_name: string;
  user_email: string;
  user_is_active: boolean;
  user_role: "admin" | "user";
  user_theme: "dark" | "light";
  user_language: "en" | "pt" | "es";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTheme: (theme: "dark" | "light") => Promise<void>;
  setLanguage: (lang: "en" | "pt" | "es") => Promise<void>;
  isAdmin: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "/api/v1";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

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

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, token: null, isAuthenticated: false, isLoading: true,
  });

  const isAdmin = state.user?.user_role === "admin";
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLogout = () => {
    localStorage.removeItem("pl_token");
    localStorage.removeItem("pl_user");
    applyTheme("dark");
    applyLanguage("en");
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      console.info("[Auth] Sessão encerrada por inatividade (30 min)");
      doLogout();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    if (!state.isAuthenticated) {
      if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
      return;
    }
    resetInactivityTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [state.isAuthenticated]);

  // ── Restore session from localStorage ────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("pl_token");
    const userRaw = localStorage.getItem("pl_user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        if (!user.user_theme) user.user_theme = "dark";
        if (!user.user_language) user.user_language = "en";
        applyTheme(user.user_theme);
        applyLanguage(user.user_language);
        setState({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem("pl_token");
        localStorage.removeItem("pl_user");
        applyTheme("dark");
        applyLanguage("en");
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      applyTheme("dark");
      applyLanguage("en");
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    let res: Response;
    try {
      res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new Error(`Não foi possível conectar à API (${API}). Verifique se o backend está em execução. (${msg})`);
    }

    if (!res.ok) {
      const raw = await res.text();
      let detail = `HTTP ${res.status}`;
      try { const json = JSON.parse(raw); detail = json.detail || json.message || raw; } catch { detail = raw || detail; }
      throw new Error(detail);
    }

    const data = await res.json();
    const { access_token, user } = data;

    if (!user.user_theme) user.user_theme = "dark";
    if (!user.user_language) user.user_language = "en";

    applyTheme(user.user_theme);
    applyLanguage(user.user_language);
    localStorage.setItem("pl_token", access_token);
    localStorage.setItem("pl_user", JSON.stringify(user));
    setState({ user, token: access_token, isAuthenticated: true, isLoading: false });
    console.info("[Auth] Login OK:", user.user_email);
  };

  // ── Set Theme ─────────────────────────────────────────────────────────────
  const setTheme = async (theme: "dark" | "light") => {
    const token = localStorage.getItem("pl_token");
    if (!token) return;
    applyTheme(theme);
    setState((prev) => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, user_theme: theme };
      localStorage.setItem("pl_user", JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
    try {
      await fetch(`${API}/auth/me/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_theme: theme }),
      });
    } catch (err) {
      console.warn("[Auth] Falha ao persistir tema:", err);
    }
  };

  // ── Set Language ──────────────────────────────────────────────────────────
  const setLanguage = async (lang: "en" | "pt" | "es") => {
    const token = localStorage.getItem("pl_token");
    if (!token) return;
    applyLanguage(lang);
    setState((prev) => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, user_language: lang };
      localStorage.setItem("pl_user", JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
    try {
      await fetch(`${API}/auth/me/language`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_language: lang }),
      });
    } catch (err) {
      console.warn("[Auth] Falha ao persistir idioma:", err);
    }
  };

  const logout = () => doLogout();

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setTheme, setLanguage, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
