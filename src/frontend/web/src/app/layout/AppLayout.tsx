/**
 * AppLayout — khung cam đỏ sau đăng nhập: sidebar (nav theo role) + header + <Outlet/>.
 * Dùng React Router (NavLink/useNavigate) → URL thật, back/forward chuẩn trình duyệt.
 */
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Files, CheckSquare, FileSpreadsheet, Users, History,
  Lock, LogOut, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import type { UserRole } from "@/types";
import BrandLogo from "@/components/BrandLogo";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} />, roles: ["ADMIN"] },
  { to: "/admin/projects", label: "Import dữ liệu", icon: <Files size={17} />, roles: ["ADMIN"] },
  { to: "/admin/export", label: "Xuất kết quả", icon: <FileSpreadsheet size={17} />, roles: ["ADMIN"] },
  { to: "/admin/users", label: "Thành viên", icon: <Users size={17} />, roles: ["ADMIN"] },
  { to: "/admin/audit", label: "Nhật ký", icon: <History size={17} />, roles: ["ADMIN"] },
  { to: "/annotator/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} />, roles: ["ANNOTATOR"] },
  { to: "/annotator/tasks", label: "Task của tôi", icon: <CheckSquare size={17} />, roles: ["ANNOTATOR"] },
  { to: "/qa/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} />, roles: ["QA"] },
  { to: "/qa/queue", label: "Hàng đợi QA", icon: <CheckSquare size={17} />, roles: ["QA"] },
];

export function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const role = session?.role ?? "ADMIN";
  const email = session?.email ?? "";
  const items = NAV.filter((i) => i.roles.includes(role));

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <aside className="app-shell-sidebar">
        <BrandLogo variant="sidebar" />

        <div className="flex-1 min-h-0 px-3 pt-4 overflow-y-auto">
          <nav className="space-y-0.5" aria-label="Điều hướng chính">
            {items.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-gray-400"}>{link.icon}</span>
                    <span className="truncate">{link.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-700 font-medium truncate">{email}</p>
              <span className="text-[10px] text-gray-400 font-medium">{role}</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="app-shell-main">
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <div className="text-sm text-gray-500 min-w-0">
              <span className="font-semibold text-gray-900">VSF Annotation</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu((s) => !s)}
                aria-label="Open profile menu"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-800 text-white font-semibold text-[10px]">
                  {role === "ADMIN" ? "AD" : role === "QA" ? "QA" : "AN"}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-lg p-1 z-50 animate-scale-in text-[13px]"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)" }}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{email}</p>
                    <p className="text-[11px] text-gray-400">{role}</p>
                  </div>
                  <button
                    onClick={() => { setShowMenu(false); navigate("/change-password"); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-md text-left"
                  >
                    <Lock size={14} className="text-gray-400" /> Đổi mật khẩu
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 rounded-md text-left"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
