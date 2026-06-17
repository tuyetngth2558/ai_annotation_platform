import { ClaimTask, UserRole } from "../types";
import { TEST_IDS } from "../testability";
import type { AdminStats } from "../api/adapters";
import {
  CheckCircle, Clock, AlertCircle, FileText, ArrowRight,
  Users, FolderKanban, ListChecks, History,
} from "lucide-react";

interface DashboardViewProps {
  userRole: UserRole;
  tasks: ClaimTask[];
  stats: AdminStats | null; // chỉ ADMIN dùng
  onNavigate: (view: string) => void;
  onOpenTaskAnnotation: (id: string) => void;
  onOpenTaskQa: (id: string) => void;
}

interface MetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "red" | "green" | "amber" | "blue" | "gray";
  testId?: string;
}

function MetricCard({ label, value, icon, color, testId }: MetricProps) {
  const colorMap = {
    red: "text-brand-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    gray: "text-gray-600",
  };

  return (
    <div data-testid={testId} className="metric-card">
      <div className="flex items-center justify-between">
        <span className="section-title">{label}</span>
        <span className={`${colorMap[color]} opacity-60`}>{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

export default function DashboardView({
  userRole,
  tasks,
  stats,
  onNavigate,
  onOpenTaskAnnotation,
  onOpenTaskQa
}: DashboardViewProps) {
  // ADMIN: dashboard tổng quan riêng (thống kê hệ thống + workload), không bảng claim.
  if (userRole === "ADMIN") return <AdminDashboard stats={stats} onNavigate={onNavigate} />;

  // ANNOTATOR: `tasks` đã là task của chính mình (fetchMyTasks) → dùng thẳng, không lọc theo tên.
  const counts = {
    assigned: tasks.filter((t) => ["Ready for Annotation", "In Annotation", "Returned"].includes(t.status)).length,
    inWork: tasks.filter((t) => t.status === "In Annotation").length,
    returned: tasks.filter((t) => t.status === "Returned").length,
    submitted: tasks.filter((t) => t.status === "Submitted").length,
    submittedGlobal: tasks.filter((t) => t.status === "Submitted").length,
    approvedGlobal: tasks.filter((t) => t.status === "Approved").length,
    returnedGlobal: tasks.filter((t) => t.status === "Returned").length,
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Ready for Annotation": return "bg-blue-50 text-blue-700 border-blue-200";
      case "In Annotation": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Submitted": return "bg-violet-50 text-violet-700 border-violet-200";
      case "Returned": return "bg-red-50 text-red-700 border-red-200";
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const compositeAverage = (task: ClaimTask) => {
    return (task.ann.SF + task.ann.SC + task.ann.NH + task.ann.SQ + task.ann.REL + task.ann.COMP) / 6;
  };

  const scoreBarColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500";
    if (score >= 0.6) return "bg-amber-500";
    return "bg-red-500";
  };

  const isReviewable = (status: ClaimTask["status"]) => status === "Submitted";

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {userRole === "ANNOTATOR" && (
          <>
            <MetricCard label="Được giao" value={counts.assigned} icon={<FileText size={18} />} color="blue" />
            <MetricCard label="Đang làm" value={counts.inWork} icon={<Clock size={18} />} color="amber" />
            <MetricCard label="Bị trả lại" value={counts.returned} icon={<AlertCircle size={18} />} color="red" />
            <MetricCard testId={TEST_IDS.dashboardMetricSubmitted} label="Đã nộp" value={counts.submitted} icon={<CheckCircle size={18} />} color="green" />
          </>
        )}
        {userRole === "QA" && (
          <>
            <MetricCard testId={TEST_IDS.dashboardMetricSubmitted} label="Chờ review" value={counts.submittedGlobal} icon={<Clock size={18} />} color="amber" />
            <MetricCard testId={TEST_IDS.dashboardMetricApproved} label="Đã duyệt" value={counts.approvedGlobal} icon={<CheckCircle size={18} />} color="green" />
            <MetricCard label="Đã trả lại" value={counts.returnedGlobal} icon={<AlertCircle size={18} />} color="red" />
            <MetricCard label="Tổng trong hàng đợi" value={tasks.length} icon={<FileText size={18} />} color="blue" />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="app-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {userRole === "ANNOTATOR" && (
            <>
              <button onClick={() => onNavigate("tasks")} data-testid={TEST_IDS.dashboardOpenTasks} className="btn-primary !text-xs !py-2 !px-4">
                Xem danh sách task <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  const first = tasks[0];
                  if (first) onOpenTaskAnnotation(first.id);
                  else onNavigate("tasks");
                }}
                data-testid={TEST_IDS.dashboardOpenAnnotation}
                className="btn-secondary !text-xs !py-2 !px-4"
              >
                Mở workspace
              </button>
            </>
          )}
          {userRole === "QA" && (
            <>
              <button onClick={() => onNavigate("qa")} data-testid={TEST_IDS.dashboardOpenQa} className="btn-primary !text-xs !py-2 !px-4">
                Kiểm duyệt <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task table */}
      <section className="app-card overflow-hidden">
        <div className="app-card-header">
          <h3 className="text-sm font-semibold text-gray-800">Danh sách claim task</h3>
          <span className="text-[11px] text-gray-400 font-medium">{tasks.length} task</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table" data-testid={TEST_IDS.dashboardTaskTable}>
            <thead>
              <tr>
                <th>Claim</th>
                <th>Mã bài</th>
                <th>Nguồn</th>
                <th>Annotator</th>
                <th>Trạng thái</th>
                <th>Điểm</th>
                <th className="text-center w-24"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const isMyTask = userRole === "ANNOTATOR";
                const composite = compositeAverage(t);

                return (
                  <tr key={t.id}>
                    <td className="max-w-xs">
                      <span className="block text-sm font-semibold text-gray-900">{t.id}</span>
                      <span className="block text-[12px] text-gray-400 truncate mt-0.5" title={t.claimFinal}>
                        {t.claimFinal}
                      </span>
                    </td>
                    <td>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[11px] font-medium">
                        {t.articleCode}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      {t.mappedSourceOrders.length > 0 ? (
                        t.mappedSourceOrders.map((o) => (
                          <span key={o} className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[10px] font-medium mr-1">
                            [{o}]
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">Chưa map</span>
                      )}
                    </td>
                    <td className="text-gray-600 text-[13px]">{t.annotator}</td>
                    <td>
                      <span className={`status-pill ${getStatusClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${scoreBarColor(composite)}`} style={{ width: `${composite * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-gray-600 tabular-nums">{composite.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      {userRole === "ANNOTATOR" && (
                        <button
                          onClick={() => onOpenTaskAnnotation(t.id)}
                          disabled={!isMyTask}
                          data-testid={TEST_IDS.dashboardOpenAnnotationTask(t.id)}
                          className="btn-ghost !text-[11px] !py-1 !px-2 disabled:opacity-30"
                        >
                          {t.status === "Returned" ? "Sửa" : "Mở"}
                        </button>
                      )}
                      {userRole === "QA" && (
                        <button
                          onClick={() => onOpenTaskQa(t.id)}
                          data-testid={TEST_IDS.dashboardOpenQaTask(t.id)}
                          className={`${
                            isReviewable(t.status) ? "btn-ghost" : "btn-secondary"
                          } !text-[11px] !py-1 !px-2`}
                        >
                          {isReviewable(t.status) ? "Review" : "Xem"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Dashboard ADMIN — tổng quan hệ thống: thống kê + workload "ai đang làm đến đâu". */
function AdminDashboard({ stats, onNavigate }: { stats: AdminStats | null; onNavigate: (v: string) => void }) {
  const s = stats;
  const claimTotal = s?.claims.total ?? 0;
  const approvedPct = claimTotal ? Math.round((s!.claims.approved / claimTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 4 nhóm metric tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard testId={TEST_IDS.dashboardMetricProjects} label="Dự án" value={s?.projects.total ?? 0} icon={<FolderKanban size={18} />} color="blue" />
        <MetricCard label="Người dùng" value={s?.users.total ?? 0} icon={<Users size={18} />} color="gray" />
        <MetricCard label="Tổng claim" value={claimTotal} icon={<ListChecks size={18} />} color="amber" />
        <MetricCard label="Hành động (log)" value={s?.auditCount ?? 0} icon={<History size={18} />} color="green" />
      </div>

      {/* Chi tiết: người dùng theo vai trò + dự án + claim theo trạng thái */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="app-card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5"><Users size={15} className="text-vsf-600" /> Người dùng</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-slate-500">Admin</span><strong>{s?.users.admin ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Annotator</span><strong>{s?.users.annotator ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">QA</span><strong>{s?.users.qa ?? 0}</strong></li>
          </ul>
        </section>

        <section className="app-card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5"><FolderKanban size={15} className="text-vsf-600" /> Dự án</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-slate-500">Đang chạy (active)</span><strong className="text-emerald-600">{s?.projects.active ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Nháp (drafting)</span><strong className="text-amber-600">{s?.projects.draft ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Tổng</span><strong>{s?.projects.total ?? 0}</strong></li>
          </ul>
        </section>

        <section className="app-card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5"><ListChecks size={15} className="text-vsf-600" /> Claim theo trạng thái</h3>
          <ul className="space-y-1.5 text-[13px]">
            <li className="flex justify-between"><span className="text-slate-500">Chưa làm</span><strong>{s?.claims.ready ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Đang làm</span><strong>{s?.claims.in_annotation ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Đã nộp (chờ QA)</span><strong className="text-violet-600">{s?.claims.submitted ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Bị trả</span><strong className="text-red-600">{s?.claims.returned ?? 0}</strong></li>
            <li className="flex justify-between"><span className="text-slate-500">Đã duyệt</span><strong className="text-emerald-600">{s?.claims.approved ?? 0}</strong></li>
          </ul>
        </section>
      </div>

      {/* Tiến độ duyệt tổng */}
      <section className="app-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800">Tiến độ duyệt toàn hệ thống</h3>
          <span className="text-sm font-bold text-emerald-600">{approvedPct}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${approvedPct}%` }} />
        </div>
        <p className="text-[12px] text-slate-400 mt-2">{s?.claims.approved ?? 0}/{claimTotal} claim đã được QA duyệt.</p>
      </section>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onNavigate("import")} data-testid={TEST_IDS.dashboardOpenProjects} className="btn-primary !text-xs !py-2 !px-4">
          Tạo & Import <ArrowRight size={14} />
        </button>
        <button onClick={() => onNavigate("projects")} className="btn-secondary !text-xs !py-2 !px-4">Dự án</button>
        <button onClick={() => onNavigate("audit")} data-testid={TEST_IDS.dashboardOpenAudit} className="btn-ghost !text-xs">Nhật ký hệ thống</button>
      </div>
    </div>
  );
}
