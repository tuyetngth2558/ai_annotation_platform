/** Type chung cho auth/RBAC. Khớp backend app/constants.py Role. */

export type Role = "ADMIN" | "ANNOTATOR" | "QA";

export interface AuthSession {
  accessToken: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  email: string;
}
