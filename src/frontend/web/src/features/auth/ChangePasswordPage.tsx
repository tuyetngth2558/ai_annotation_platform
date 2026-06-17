/** ChangePasswordPage — bọc ChangePasswordView. */
import { useNavigate } from "react-router-dom";
import ChangePasswordView from "@/components/ChangePasswordView";
import { useToast } from "@/app/providers/ToastProvider";
import { useAuth, defaultRouteForRole } from "@/app/providers/AuthProvider";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { session } = useAuth();
  usePageHeader({ title: "Đổi mật khẩu", description: "Cập nhật mật khẩu đăng nhập của bạn." });
  const back = () => navigate(session ? defaultRouteForRole(session.role) : "/login");
  return <ChangePasswordView onCancel={back} showToast={showToast} />;
}
