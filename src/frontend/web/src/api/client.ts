import { UserRole } from "../types";
import { demoLogin, isDemoAuthEnabled, shouldFallbackToDemoAuth } from "./demoAuth";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "/api/v1";

const TOKEN_KEY = "vsf-access-token";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  email: string;
}

/** Rút message + code từ body lỗi BE: {error:{code,message}} (AppError) hoặc {detail} (422 FastAPI). */
function parseError(status: number, payload: unknown): { message: string; code: string } {
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (obj.error && typeof obj.error === "object") {
      const err = obj.error as Record<string, unknown>;
      return { message: String(err.message ?? `Lỗi backend (status ${status})`), code: String(err.code ?? "error") };
    }
    if ("detail" in obj) {
      const detail = obj.detail;
      if (Array.isArray(detail)) {
        const msgs = detail
          .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
          .join("; ");
        return { message: msgs || `Dữ liệu không hợp lệ (status ${status})`, code: "validation_error" };
      }
      return { message: String(detail), code: "validation_error" };
    }
  }
  return { message: `Backend request failed with status ${status}`, code: "error" };
}

export class ApiError extends Error {
  status: number;
  code: string;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    const { message, code } = parseError(status, detail);
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authToken.get();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  login: async (email: string, password: string) => {
    try {
      return await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (isDemoAuthEnabled() && shouldFallbackToDemoAuth(error)) {
        return demoLogin(email, password);
      }
      throw error;
    }
  },
  /** Tải file (blob) kèm Bearer token — dùng cho export CSV. */
  download: async (path: string): Promise<{ blob: Blob; filename: string }> => {
    const token = authToken.get();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (!response.ok) {
      const ct = response.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await response.json() : await response.text();
      throw new ApiError(response.status, payload);
    }
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    return { blob: await response.blob(), filename: match ? match[1] : "export.csv" };
  },
};

