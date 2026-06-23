/**
 * AuthProvider — giữ session (email + role), expose login/logout.
 * Session persist localStorage → reload/back KHÔNG mất đăng nhập (token lưu riêng ở authToken).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { apiClient, authToken, refreshToken } from "@/api/client";
import type { UserRole } from "@/types";

export interface Session {
  email: string;
  role: UserRole;
}

interface AuthCtx {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  /** Đồng bộ session khi đăng nhập đã xong ở nơi khác (LoginView gọi apiClient.login). */
  syncSession: (s: Session) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const SESSION_KEY = "vsf-session";

function loadSession(): Session | null {
  if (typeof window === "undefined" || !authToken.get()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  async function login(email: string, password: string): Promise<Session> {
    const res = await apiClient.login(email, password);
    authToken.set(res.access_token);
    if (res.refresh_token) refreshToken.set(res.refresh_token);
    else refreshToken.clear();
    const next: Session = { email: res.email, role: res.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
    return next;
  }

  function syncSession(s: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }

  function logout() {
    authToken.clear();
    refreshToken.clear();
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  const value = useMemo(() => ({ session, login, syncSession, logout }), [session]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth phải dùng trong AuthProvider");
  return ctx;
}

/** Route mặc định theo role. */
export function defaultRouteForRole(role: UserRole): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "ANNOTATOR") return "/annotator/tasks";
  return "/qa/queue";
}
