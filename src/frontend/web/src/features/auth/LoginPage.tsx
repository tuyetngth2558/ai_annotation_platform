/** LoginPage — bọc LoginView cam đỏ, dùng AuthProvider + điều hướng theo role. */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginView from "@/components/LoginView";
import { useAuth, defaultRouteForRole } from "@/app/providers/AuthProvider";
import { useToast } from "@/app/providers/ToastProvider";
import type { UserRole } from "@/types";

export function LoginPage() {
  const { session, syncSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Đã đăng nhập → vào thẳng workspace.
  useEffect(() => {
    if (session) navigate(defaultRouteForRole(session.role), { replace: true });
  }, [session, navigate]);

  // Bị đẩy về do phiên hết hạn (client.ts gắn ?expired=1) → báo cho user.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired") === "1") {
      showToast("Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.");
      window.history.replaceState(null, "", "/login");
    }
  }, [showToast]);

  // LoginView đã gọi apiClient.login (set token). Đồng bộ session vào provider + điều hướng.
  const onLoginSuccess = (email: string, role: UserRole) => {
    syncSession({ email, role });
    navigate(defaultRouteForRole(role), { replace: true });
  };

  return <LoginView onLoginSuccess={onLoginSuccess} showToast={showToast} />;
}
