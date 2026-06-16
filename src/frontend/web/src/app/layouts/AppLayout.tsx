/**
 * AppLayout — khung chính sau đăng nhập: sidebar (nav theo role) + header.
 * Nav item lọc theo role hiện tại (RBAC ở UI — docs AC mục 1).
 */
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Role } from "@/shared/types/auth";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { LangSwitch } from "@/shared/ui/LangSwitch";
import { Button } from "@/shared/ui/Button";

interface NavItem {
  to: string;
  labelKey: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/admin/dashboard", labelKey: "nav.dashboard", roles: ["ADMIN"] },
  { to: "/admin/projects", labelKey: "nav.projects", roles: ["ADMIN"] },
  { to: "/admin/import", labelKey: "nav.import", roles: ["ADMIN"] },
  { to: "/admin/export", labelKey: "nav.export", roles: ["ADMIN"] },
  { to: "/admin/audit", labelKey: "nav.audit", roles: ["ADMIN"] },
  { to: "/annotator/tasks", labelKey: "nav.tasks", roles: ["ANNOTATOR"] },
  { to: "/qa/queue", labelKey: "nav.qaQueue", roles: ["QA"] },
];

export function AppLayout() {
  const { session, logout } = useAuth();
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();

  const role = session?.role;
  const items = NAV.filter((i) => role && i.roles.includes(role));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--line)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontWeight: 800, padding: "8px 12px 16px" }}>{t("appName")}</div>
        {items.map((i) => {
          const active = location.pathname === i.to;
          return (
            <Link
              key={i.to}
              to={i.to}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius)",
                color: active ? "var(--on-primary)" : "var(--ink)",
                background: active ? "var(--primary)" : "transparent",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {t(i.labelKey)}
            </Link>
          );
        })}
      </aside>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: 12,
            borderBottom: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <span style={{ color: "var(--muted)", marginRight: "auto", paddingLeft: 8 }}>
            {session?.email} · {role}
          </span>
          <LangSwitch />
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            {t("actions.logout")}
          </Button>
        </header>
        <main style={{ padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
