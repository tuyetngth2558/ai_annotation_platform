import { UserRole } from "../types";

export interface DemoLoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  email: string;
}

export const DEMO_ACCOUNTS: Record<
  string,
  { password: string; role: UserRole }
> = {
  "admin@vsf.local": { password: "admin-demo-2026", role: "ADMIN" },
  "annotator@vsf.local": { password: "annotator-demo-2026", role: "ANNOTATOR" },
  "qa@vsf.local": { password: "qa-demo-2026", role: "QA" },
};

export function isDemoAuthEnabled(): boolean {
  if (import.meta.env.VITE_DEMO_AUTH === "true") return true;
  if (import.meta.env.VITE_DEMO_AUTH === "false") return false;
  return import.meta.env.DEV;
}

export function demoLogin(email: string, password: string): DemoLoginResponse {
  const normalized = email.trim().toLowerCase();
  const account = DEMO_ACCOUNTS[normalized];

  if (!account || account.password !== password) {
    throw new Error(
      "Tài khoản hoặc mật khẩu không đúng. Demo: admin@vsf.local / annotator@vsf.local / qa@vsf.local"
    );
  }

  return {
    access_token: `demo-token-${account.role.toLowerCase()}`,
    token_type: "bearer",
    role: account.role,
    email: normalized,
  };
}

export function shouldFallbackToDemoAuth(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: number }).status);
    return status === 404 || status === 501 || status === 502 || status === 503;
  }
  return false;
}
