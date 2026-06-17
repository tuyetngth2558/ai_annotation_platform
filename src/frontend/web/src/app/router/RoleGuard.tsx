/** RoleGuard — chặn route theo role. Chưa đăng nhập → /login; sai role → /403. */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import type { UserRole } from "@/types";

export function RoleGuard({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!allow.includes(session.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
