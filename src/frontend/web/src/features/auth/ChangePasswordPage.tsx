/** ChangePasswordPage — bọc ChangePasswordView. */
import { useNavigate } from "react-router-dom";
import ChangePasswordView from "@/components/ChangePasswordView";
import { useToast } from "@/app/providers/ToastProvider";
import { useAuth, defaultRouteForRole } from "@/app/providers/AuthProvider";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { session } = useAuth();
  const back = () => navigate(session ? defaultRouteForRole(session.role) : "/login");
  return <ChangePasswordView onCancel={back} showToast={showToast} />;
}
