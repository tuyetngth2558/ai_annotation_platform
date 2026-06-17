/** DashboardPage — tổng quan theo role. ADMIN: projects/audit; ANNOTATOR: tasks; QA: queue. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardView from "@/components/DashboardView";
import { useAuth } from "@/app/providers/AuthProvider";
import { fetchMyTasks, fetchQaQueue } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import type { ClaimTask } from "@/types";

export function DashboardPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const role = session?.role ?? "ADMIN";
  const [tasks, setTasks] = useState<ClaimTask[]>([]);

  useEffect(() => {
    if (role === "ANNOTATOR") {
      fetchMyTasks().then((t) => setTasks(t.map(enrichClaimTask))).catch(() => setTasks([]));
    } else if (role === "QA") {
      fetchQaQueue().then((t) => setTasks(t.map(enrichClaimTask))).catch(() => setTasks([]));
    } else {
      setTasks([]);
    }
  }, [role]);

  const onNavigate = (view: string) => {
    const prefix = role === "ADMIN" ? "/admin" : role === "QA" ? "/qa" : "/annotator";
    const map: Record<string, string> = {
      dashboard: `${prefix}/dashboard`,
      projects: "/admin/projects",
      export: "/admin/export",
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
      exportJobsCount={0}
      onNavigate={onNavigate}
      onOpenTaskAnnotation={(id) => navigate(`/annotator/tasks/${id}`)}
      onOpenTaskQa={(id) => navigate(`/qa/review/${id}`)}
    />
  );
}
