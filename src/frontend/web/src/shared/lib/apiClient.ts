/**
 * API client — fetch wrapper mỏng. Gắn base URL + Authorization + parse lỗi
 * theo shape ErrorResponse của backend (app/schemas/common.py).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
// Token lưu localStorage + gửi qua Bearer header. Quyết định có chủ đích cho MVP nội bộ
// (xem docs/adr/0006-auth-token-storage.md). Xem lại sang httpOnly cookie trước khi public.
const TOKEN_KEY = "vsf-access-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  code: string;
  message: string;
  request_id?: string;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let err: ApiError = { code: "unknown", message: res.statusText };
    try {
      const body = await res.json();
      if (body?.error) err = body.error;
    } catch {
      /* ignore parse error */
    }
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// TODO(shared): generate type endpoint vào shared/types/api.gen.ts (npm run gen:api).
