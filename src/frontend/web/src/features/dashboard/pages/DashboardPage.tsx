/** DashboardPage — landing ADMIN: số liệu cơ bản + lối tắt. Nối GET /projects, /audit-logs. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { fetchProjects, fetchAuditLogs } from "@/shared/lib/adapters";

export function DashboardPage() {
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [auditCount, setAuditCount] = useState<number | null>(null);

  useEffect(() => {
    fetchProjects().then((p) => setProjectCount(p.length)).catch(() => setProjectCount(null));
    fetchAuditLogs().then((a) => setAuditCount(a.length)).catch(() => setAuditCount(null));
  }, []);

  const metric = (label: string, value: number | null) => (
    <Card style={{ minWidth: 160 }}>
      <div style={{ color: "var(--muted)", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{value ?? "—"}</div>
    </Card>
  );

  const shortcut = (to: string, label: string) => (
    <Link to={to} style={{ textDecoration: "none" }}>
      <Card style={{ color: "var(--primary)", fontWeight: 700 }}>{label} →</Card>
    </Link>
  );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Tổng quan</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {metric("Số project", projectCount)}
        {metric("Bản ghi audit", auditCount)}
      </div>
      <h3 style={{ marginTop: 24 }}>Lối tắt</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {shortcut("/admin/projects", "Dự án")}
        {shortcut("/admin/import", "Nhập PDF Bundle")}
        {shortcut("/admin/export", "Xuất CSV")}
        {shortcut("/admin/users", "Quản lý người dùng")}
        {shortcut("/admin/audit", "Nhật ký hệ thống")}
      </div>
    </div>
  );
}
