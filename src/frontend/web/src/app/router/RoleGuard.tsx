/**
 * RoleGuard — bảo vệ route theo role.
 * Chưa đăng nhập → /login. Sai role → /403.
 * RBAC enforce ở UI (docs AC mục 1); backend vẫn enforce độc lập ở API.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Role } from "@/shared/types/auth";

interface Props {
  allow: Role[];
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: Props) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!allow.includes(session.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
