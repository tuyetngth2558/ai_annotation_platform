/**
 * AppLayout — khung cam đỏ sau đăng nhập: sidebar (nav theo role) + header + <Outlet/>.
 * Dùng React Router (NavLink/useNavigate) → URL thật, back/forward chuẩn trình duyệt.
 */
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Files, FolderPlus, CheckSquare, Users, History,
  Lock, LogOut, ChevronDown, PanelLeftClose,
} from "lucide-react";
import { useAuth, defaultRouteForRole } from "@/app/providers/AuthProvider";
import { usePageHeaderSlot } from "@/app/providers/PageHeaderProvider";
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
  { to: "/admin/import", label: "Tạo & Import", icon: <FolderPlus size={17} />, roles: ["ADMIN"] },
  { to: "/admin/projects", label: "Dự án", icon: <Files size={17} />, roles: ["ADMIN"] },
  { to: "/admin/users", label: "Thành viên", icon: <Users size={17} />, roles: ["ADMIN"] },
  { to: "/admin/audit", label: "Nhật ký", icon: <History size={17} />, roles: ["ADMIN"] },
  { to: "/annotator/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} />, roles: ["ANNOTATOR"] },
  { to: "/annotator/tasks", label: "Task của tôi", icon: <CheckSquare size={17} />, roles: ["ANNOTATOR"] },
  { to: "/qa/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} />, roles: ["QA"] },
  { to: "/qa/queue", label: "Hàng đợi QA", icon: <CheckSquare size={17} />, roles: ["QA"] },
];

export function AppLayout() {
  const { session, logout } = useAuth();
  const { header } = usePageHeaderSlot();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("vsf-sidebar-collapsed") === "1",
  );

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("vsf-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  const role = session?.role ?? "ADMIN";
  const email = session?.email ?? "";
  const items = NAV.filter((i) => i.roles.includes(role));

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <aside className={`app-shell-sidebar ${collapsed ? "md:w-16" : "md:w-60"}`}>
        <div className="relative">
          {/* Mở rộng: bấm logo = điều hướng về dashboard.
              Thu nhỏ: bấm logo = mở rộng lại (không điều hướng); nút toggle ẩn đi. */}
          {collapsed ? (
            <button
              onClick={toggleCollapsed}
              aria-label="Mở rộng menu"
              className="block w-full cursor-pointer"
            >
              <BrandLogo variant="sidebar" collapsed />
            </button>
          ) : (
            <>
              <NavLink
                to={defaultRouteForRole(role)}
                aria-label="Về trang tổng quan"
                className="block cursor-pointer"
              >
                <BrandLogo variant="sidebar" />
              </NavLink>
              {/* Nút thu gọn — chỉ hiện khi đang mở rộng. */}
              <button
                onClick={toggleCollapsed}
                aria-label="Thu gọn menu"
                className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm z-10 cursor-pointer"
              >
                <PanelLeftClose size={14} />
              </button>
            </>
          )}
        </div>

        <div className={`flex-1 min-h-0 pt-4 overflow-y-auto ${collapsed ? "px-2" : "px-3"}`}>
          <nav className="space-y-0.5" aria-label="Điều hướng chính">
            {items.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                title={collapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-item-active" : ""} ${collapsed ? "!justify-center !px-2" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-gray-700"}>{link.icon}</span>
                    {!collapsed && (
                      <span className={`truncate font-normal ${isActive ? "text-white" : "text-gray-800"}`}>
                        {link.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={`shrink-0 py-3 border-t border-sidebar-border bg-sidebar ${collapsed ? "px-2" : "px-3"}`}>
          {/* Menu tài khoản: render fixed (sidebar có overflow-hidden nên absolute bị cắt).
              Neo cạnh phải sidebar, sát đáy. Overlay để bấm ngoài đóng. */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div
                className={`fixed bottom-4 w-44 bg-white border border-gray-200 rounded-lg p-1 z-50 animate-scale-in text-[12px] ${collapsed ? "left-[60px]" : "left-[244px]"}`}
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }}
              >
                <button
                  onClick={() => { setShowMenu(false); navigate("/change-password"); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 text-gray-600 rounded-md text-left"
                >
                  <Lock size={13} className="text-gray-400" /> Đổi mật khẩu
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-50 text-red-600 rounded-md text-left"
                >
                  <LogOut size={13} /> Đăng xuất
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => setShowMenu((s) => !s)}
            aria-label="Mở menu tài khoản"
            title={collapsed ? email : undefined}
            className={`w-full flex items-center rounded-lg hover:bg-gray-100 transition-colors text-left ${collapsed ? "justify-center py-1.5" : "gap-2.5 px-1.5 py-1.5"}`}
          >
            <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 font-medium truncate">{email}</p>
                  <span className="text-[10px] text-gray-400 font-medium">{role}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 shrink-0 transition-transform ${showMenu ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>
        </div>
      </aside>

      <section className={`app-shell-main ${collapsed ? "md:ml-16" : "md:ml-60"}`}>
        <header className="app-topbar">
          <div className="app-topbar-inner">
            {/* Tiêu đề + mô tả trang hiện tại (do mỗi trang đăng ký qua usePageHeader). */}
            <div className="min-w-0 flex-1">
              {header ? (
                <>
                  <h1 className="text-xl font-bold text-gray-900 truncate leading-tight">{header.title}</h1>
                  {header.description && (
                    <p className="text-[13px] text-gray-400 truncate mt-1">{header.description}</p>
                  )}
                </>
              ) : (
                <span className="text-lg font-bold text-gray-900">VSF Annotation</span>
              )}
            </div>

            {/* Hành động căn giữa (vd stepper): 3-cột [title][center][spacer]. */}
            {header?.action && header.actionCenter && (
              <>
                <div className="flex-1 flex justify-center min-w-0">{header.action}</div>
                <div className="flex-1 min-w-0" aria-hidden />
              </>
            )}

            {/* Hành động thường (nút) → nằm bên phải. */}
            {header?.action && !header.actionCenter && (
              <div className="flex-shrink-0">{header.action}</div>
            )}
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
