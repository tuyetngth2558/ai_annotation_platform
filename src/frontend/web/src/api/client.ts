import { UserRole } from "../types";
import { demoLogin, isDemoAuthEnabled, shouldFallbackToDemoAuth } from "./demoAuth";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "/api/v1";

const TOKEN_KEY = "vsf-access-token";
const REFRESH_KEY = "vsf-refresh-token";

export interface LoginResponse {
  access_token: string;
  refresh_token?: string; // login thật trả; demo (fallback FE) không có
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
      return { message: String(err.message ?? `Lỗi máy chủ (mã ${status})`), code: String(err.code ?? "error") };
    }
    if ("detail" in obj) {
      const detail = obj.detail;
      if (Array.isArray(detail)) {
        const msgs = detail
          .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
          .join("; ");
        return { message: msgs || `Dữ liệu không hợp lệ (mã ${status})`, code: "validation_error" };
      }
      return { message: String(detail), code: "validation_error" };
    }
  }
  return { message: `Yêu cầu tới máy chủ thất bại (mã ${status})`, code: "error" };
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

export const refreshToken = {
  get: () => localStorage.getItem(REFRESH_KEY),
  set: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  clear: () => localStorage.removeItem(REFRESH_KEY),
};

const SESSION_KEY = "vsf-session";

/** 401 + refresh thất bại = hết phiên thật → dọn phiên + đẩy về /login (1 lần, tránh loop). */
let redirectingToLogin = false;
function handleUnauthorized() {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login?expired=1");
  }
}

/**
 * Gọi /auth/refresh đổi access token mới bằng refresh_token. Dùng 1 promise chung
 * để nhiều request 401 đồng thời không gọi refresh nhiều lần (single-flight).
 * Trả access token mới, hoặc null nếu không refresh được (hết refresh / không có).
 */
let refreshing: Promise<string | null> | null = null;
async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = refreshToken.get();
    if (!rt) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) return null;
      authToken.set(data.access_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Gửi fetch 1 lần với access token hiện tại. */
function doFetch(path: string, options: RequestInit): Promise<Response> {
  const token = authToken.get();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isAuthRoute = path.startsWith("/auth/");
  let response = await doFetch(path, options);

  // Access token hết hạn (401) trên route thường → thử refresh 1 lần rồi retry.
  if (response.status === 401 && !isAuthRoute) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      response = await doFetch(path, options); // retry với token mới
    }
    // Sau refresh mà vẫn 401 (hoặc không refresh được) → hết phiên thật.
    if (response.status === 401) {
      handleUnauthorized();
    }
  }

  // 204/205 hoặc body rỗng → không parse JSON (tránh "Unexpected end of JSON input").
  const contentType = response.headers.get("content-type") || "";
  let payload: unknown = null;
  if (response.status !== 204 && response.status !== 205) {
    const text = await response.text();
    if (text) {
      payload = contentType.includes("application/json") ? JSON.parse(text) : text;
    }
  }

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
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
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

