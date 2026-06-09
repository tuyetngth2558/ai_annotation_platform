/**
 * AuthProvider — giữ session (token + role + email), expose login/logout.
 * Đợt scaffold: login gọi /auth/login (backend mock trả JWT thật) → lưu token,
 * RoleGuard điều hướng theo role. Verify thật để TODO ở backend.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { apiFetch, getToken, setToken } from "@/shared/lib/apiClient";
import type { AuthSession, LoginRequest, LoginResponse, Role } from "@/shared/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  login: (payload: LoginRequest) => Promise<AuthSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "vsf-session";

function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw || !getToken()) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession);

  async function login(payload: LoginRequest): Promise<AuthSession> {
    const res = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(res.access_token);
    const next: AuthSession = { accessToken: res.access_token, email: res.email, role: res.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
    return next;
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  const value = useMemo(() => ({ session, login, logout }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng trong AuthProvider");
  return ctx;
}

/** Trang mặc định sau login theo role. */
export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "ANNOTATOR":
      return "/annotator/tasks";
    case "QA":
      return "/qa/queue";
  }
}
