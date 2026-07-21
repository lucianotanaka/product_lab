import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  user_id: number;
  user_full_name: string;
  user_email: string;
  user_is_active: boolean;
  user_role: "admin" | "user";
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
  isAdmin: boolean;
}

// ─── API base ─────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "/api/v1";

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const isAdmin = state.user?.user_role === "admin";

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("pl_token");
    const userRaw = localStorage.getItem("pl_user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        setState({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem("pl_token");
        localStorage.removeItem("pl_user");
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // OAuth2PasswordRequestForm expects form-encoded body
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
      console.error("[Auth] Network error:", msg);
      throw new Error(
        `Não foi possível conectar à API (${API}). Verifique se o backend está em execução.`
      );
    }

    if (!res.ok) {
      const raw = await res.text();
      console.error(`[Auth] HTTP ${res.status} ${res.statusText}:`, raw);
      let detail = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(raw);
        detail = json.detail || json.message || raw;
      } catch {
        detail = raw || `HTTP ${res.status} ${res.statusText}`;
      }
      throw new Error(detail);
    }

    const data = await res.json();
    const { access_token, user } = data;

    localStorage.setItem("pl_token", access_token);
    localStorage.setItem("pl_user", JSON.stringify(user));
    setState({ user, token: access_token, isAuthenticated: true, isLoading: false });
    console.info("[Auth] Login OK:", user.user_email);
  };

  const logout = () => {
    localStorage.removeItem("pl_token");
    localStorage.removeItem("pl_user");
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
