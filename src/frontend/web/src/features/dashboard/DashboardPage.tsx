/** DashboardPage — tổng quan theo role. ADMIN: thống kê hệ thống; ANNOTATOR/QA: task của mình. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardView from "@/components/DashboardView";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { fetchMyTasks, fetchQaQueue, fetchAdminStats, type AdminStats } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import type { ClaimTask } from "@/types";

const DESC: Record<string, string> = {
  ADMIN: "Tổng quan toàn hệ thống — người dùng, dự án, tiến độ.",
  ANNOTATOR: "Các claim task được giao cho bạn.",
  QA: "Các task chờ bạn kiểm duyệt.",
};

export function DashboardPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const role = session?.role ?? "ADMIN";
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);

  usePageHeader({ title: "Tổng quan", description: DESC[role] }, [role]);

  useEffect(() => {
    if (role === "ANNOTATOR") {
      fetchMyTasks().then((t) => setTasks(t.map(enrichClaimTask))).catch(() => setTasks([]));
    } else if (role === "QA") {
      fetchQaQueue().then((t) => setTasks(t.map(enrichClaimTask))).catch(() => setTasks([]));
    } else {
      fetchAdminStats().then(setStats).catch(() => setStats(null));
    }
  }, [role]);

  const onNavigate = (view: string) => {
    const prefix = role === "ADMIN" ? "/admin" : role === "QA" ? "/qa" : "/annotator";
    const map: Record<string, string> = {
      dashboard: `${prefix}/dashboard`,
      import: "/admin/import",
      projects: "/admin/projects",
      users: "/admin/users",
      audit: "/admin/audit",
      tasks: "/annotator/tasks",
      qa: "/qa/queue",
    };
    navigate(map[view] ?? `${prefix}/dashboard`);
  };

  return (
    <DashboardView
      userRole={role}
      tasks={tasks}
      stats={stats}
      onNavigate={onNavigate}
      onOpenTaskAnnotation={(id) => navigate(`/annotator/tasks/${id}`)}
      onOpenTaskQa={(id) => navigate(`/qa/review/${id}`)}
    />
  );
}
