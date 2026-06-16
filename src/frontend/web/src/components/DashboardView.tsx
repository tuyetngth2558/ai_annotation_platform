import { ClaimTask, UserRole } from "../types";
import { TEST_IDS } from "../testability";
import PageHeader from "./PageHeader";
import { FolderOpen, CheckCircle, Clock, AlertCircle, FileText, ArrowRight } from "lucide-react";

interface DashboardViewProps {
  userRole: UserRole;
  tasks: ClaimTask[];
  exportJobsCount: number;
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
  exportJobsCount,
  onNavigate,
  onOpenTaskAnnotation,
  onOpenTaskQa
}: DashboardViewProps) {
  const myTasks = tasks.filter((t) => t.annotator === "Annotator Mai");

  const counts = {
    assigned: myTasks.filter((t) => ["Ready for Annotation", "In Annotation", "Returned"].includes(t.status)).length,
    inWork: myTasks.filter((t) => t.status === "In Annotation").length,
    returned: myTasks.filter((t) => t.status === "Returned").length,
    submitted: myTasks.filter((t) => t.status === "Submitted").length,
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

  const roleGreeting = () => {
    switch (userRole) {
      case "ADMIN": return "Quản lý dự án và theo dõi tiến độ chung.";
      case "ANNOTATOR": return "Các claim task được giao cho bạn.";
      case "QA": return "Các task chờ bạn kiểm duyệt.";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tổng quan"
        description={roleGreeting()}
      />

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {userRole === "ADMIN" && (
          <>
            <MetricCard testId={TEST_IDS.dashboardMetricProjects} label="Dự án" value={1} icon={<FolderOpen size={18} />} color="blue" />
            <MetricCard label="Tổng claim" value={tasks.length} icon={<FileText size={18} />} color="gray" />
            <MetricCard testId={TEST_IDS.dashboardMetricApproved} label="Đã duyệt" value={counts.approvedGlobal} icon={<CheckCircle size={18} />} color="green" />
            <MetricCard testId={TEST_IDS.dashboardMetricSubmitted} label="Chờ QA" value={counts.submittedGlobal} icon={<Clock size={18} />} color="amber" />
          </>
        )}
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
            <MetricCard testId={TEST_IDS.dashboardMetricExports} label="Export jobs" value={exportJobsCount} icon={<FileText size={18} />} color="blue" />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="app-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {userRole === "ADMIN" && (
            <>
              <button onClick={() => onNavigate("projects")} data-testid={TEST_IDS.dashboardOpenProjects} className="btn-primary !text-xs !py-2 !px-4">
                Import dữ liệu <ArrowRight size={14} />
              </button>
              <button onClick={() => onNavigate("export")} data-testid={TEST_IDS.dashboardOpenExport} className="btn-secondary !text-xs !py-2 !px-4">
                Xuất kết quả
              </button>
              <button onClick={() => onNavigate("audit")} data-testid={TEST_IDS.dashboardOpenAudit} className="btn-ghost !text-xs">
                Nhật ký hệ thống
              </button>
            </>
          )}
          {userRole === "ANNOTATOR" && (
            <>
              <button onClick={() => onNavigate("tasks")} data-testid={TEST_IDS.dashboardOpenTasks} className="btn-primary !text-xs !py-2 !px-4">
                Xem danh sách task <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  const first = tasks.find((t) => t.annotator === "Annotator Mai");
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
              <button onClick={() => onNavigate("export")} data-testid={TEST_IDS.dashboardOpenExport} className="btn-secondary !text-xs !py-2 !px-4">
                Xuất kết quả
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
                const isMyTask = userRole === "ANNOTATOR" && t.annotator === "Annotator Mai";
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
                      {(userRole === "QA" || userRole === "ADMIN") && (
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
