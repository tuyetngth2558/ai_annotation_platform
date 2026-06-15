import { ClaimTask, UserRole } from "../types";
import { TEST_IDS } from "../testability";
import { FolderGit2, CheckSquare, RefreshCw, Send, ShieldAlert, Award, FileSpreadsheet, PlayCircle } from "lucide-react";

interface DashboardViewProps {
  userRole: UserRole;
  tasks: ClaimTask[];
  exportJobsCount: number;
  onNavigate: (view: string) => void;
  onOpenTaskAnnotation: (id: string) => void;
  onOpenTaskQa: (id: string) => void;
}

export default function DashboardView({
  userRole,
  tasks,
  exportJobsCount,
  onNavigate,
  onOpenTaskAnnotation,
  onOpenTaskQa
}: DashboardViewProps) {
  // Compute counts
  const totalProjects = 1;
  const totalBatches = 1;
  const myTasks = tasks.filter((t) => t.annotator === "Annotator Mai");

  const counts = {
    assigned: myTasks.filter((t) => ["Ready for Annotation", "In Annotation", "Returned"].includes(t.status)).length,
    inWork: myTasks.filter((t) => t.status === "In Annotation").length,
    returned: myTasks.filter((t) => t.status === "Returned").length,
    submitted: myTasks.filter((t) => t.status === "Submitted").length,
    submittedGlobal: tasks.filter((t) => t.status === "Submitted").length,
    approvedGlobal: tasks.filter((t) => t.status === "Approved").length,
    returnedGlobal: tasks.filter((t) => t.status === "Returned").length,
    readyGlobal: tasks.filter((t) => t.status === "Ready for Annotation").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Uploaded":
      case "Imported":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "Parsing":
      case "Claim Extracted":
      case "Pre-scoring Running":
        return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
      case "Parse Failed":
      case "Pre-scoring Failed":
        return "bg-red-50 text-red-700 border-red-200";
      case "Ready for Annotation":
      case "Parsed":
        return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "In Annotation":
      case "Source Mapping Required":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Submitted":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Returned":
        return "bg-red-100 text-red-800 border-red-300";
      case "Approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Exported":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-55 text-slate-600 border-slate-22";
    }
  };

  const getCompositeScoreClass = (score: number) => {
    if (score >= 0.8) return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    if (score >= 0.6) return "bg-amber-50 text-amber-700 border border-amber-100";
    return "bg-red-50 text-red-700 border border-red-100";
  };

  const compositeAverage = (task: ClaimTask) => {
    const total = task.ann.SF + task.ann.SC + task.ann.NH + task.ann.SQ + task.ann.REL + task.ann.COMP;
    return total / 6;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic metric widgets adapted to Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {userRole === "ADMIN" && (
          <>
            <div data-testid={TEST_IDS.dashboardMetricProjects} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-blue-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Dự án Đang Chạy</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{totalProjects}</strong>
              <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                <FolderGit2 size={13} /> Vivipedia active
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-indigo-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Số Lượng Batch</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{totalBatches}</strong>
              <div className="text-[11px] text-indigo-500 font-semibold flex items-center gap-1">
                <CheckSquare size={13} /> Evaluation BAT-001
              </div>
            </div>
            <div data-testid={TEST_IDS.dashboardMetricApproved} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-emerald-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Đã Duyệt (Approved)</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.approvedGlobal}</strong>
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Award size={13} /> Đủ điều kiện export
              </div>
            </div>
            <div data-testid={TEST_IDS.dashboardMetricSubmitted} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-amber-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Đang Chờ QA duyệt</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.submittedGlobal}</strong>
              <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                <RefreshCw size={13} /> Đang đợi đánh giá
              </div>
            </div>
          </>
        )}

        {userRole === "ANNOTATOR" && (
          <>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-blue-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Task Được Giao</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.assigned}</strong>
              <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                <FolderGit2 size={13} /> Chỉ định cho bạn
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-amber-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Đang Làm</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.inWork}</strong>
              <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                <PlayCircle size={13} /> Auto-save mỗi 30 giây
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-red-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Bị Trả Lại (Returned)</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.returned}</strong>
              <div className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                <ShieldAlert size={13} /> Cần sửa và resubmit
              </div>
            </div>
            <div data-testid={TEST_IDS.dashboardMetricSubmitted} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-emerald-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Đã Gửi Đi (Submitted)</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.submitted}</strong>
              <div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                <Send size={13} /> Đã chuyển sang QA
              </div>
            </div>
          </>
        )}

        {userRole === "QA" && (
          <>
            <div data-testid={TEST_IDS.dashboardMetricSubmitted} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-amber-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Yêu Cầu Review</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.submittedGlobal}</strong>
              <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                <RefreshCw size={13} /> Task vừa được Annotator nộp
              </div>
            </div>
            <div data-testid={TEST_IDS.dashboardMetricApproved} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-emerald-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Được Chấp Thuận</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.approvedGlobal}</strong>
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Award size={13} /> Hoàn tất thẩm định
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-red-650 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Số Task Returned</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{counts.returnedGlobal}</strong>
              <div className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                <ShieldAlert size={13} /> Đang đợi annotator nộp lại
              </div>
            </div>
            <div data-testid={TEST_IDS.dashboardMetricExports} className="bg-white p-5 rounded-xl border border-slate-100 shadow-md border-l-4 border-l-teal-600 space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Yêu Cầu Xuất (Jobs)</span>
              <strong className="text-3xl font-extrabold text-slate-800 block">{exportJobsCount}</strong>
              <div className="text-[11px] text-teal-600 font-semibold flex items-center gap-1">
                <FileSpreadsheet size={13} /> File CSV claim-level
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick shortcuts adapted to Role */}
      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Lối tắt thao tác nhanh</h3>
        <div className="flex flex-wrap gap-2.5">
          {userRole === "ADMIN" && (
            <>
              <button
                onClick={() => onNavigate("projects")}
                data-testid={TEST_IDS.dashboardOpenProjects}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-tight shadow transition-all"
              >
                Tạo Project / Import PDF
              </button>
              <button
                onClick={() => onNavigate("export")}
                data-testid={TEST_IDS.dashboardOpenExport}
                className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs tracking-tight shadow transition-all"
              >
                Export CSV Kết Quả
              </button>
              <button
                onClick={() => onNavigate("audit")}
                data-testid={TEST_IDS.dashboardOpenAudit}
                className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs tracking-tight transition-all"
              >
                Xem Nhật Ký Hệ Thống (Audit Log)
              </button>
            </>
          )}

          {userRole === "ANNOTATOR" && (
            <>
              <button
                onClick={() => onNavigate("tasks")}
                data-testid={TEST_IDS.dashboardOpenTasks}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-tight shadow transition-all"
              >
                Danh Sách Task Của Tôi
              </button>
              <button
                onClick={() => {
                  const firstReady = tasks.find((t) => t.annotator === "Annotator Mai");
                  if (firstReady) {
                    onOpenTaskAnnotation(firstReady.id);
                  } else {
                    onNavigate("tasks");
                  }
                }}
                data-testid={TEST_IDS.dashboardOpenAnnotation}
                className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs tracking-tight shadow transition-all"
              >
                Claim Hoạt Động (Claim Task)
              </button>
            </>
          )}

          {userRole === "QA" && (
            <>
              <button
                onClick={() => onNavigate("qa")}
                data-testid={TEST_IDS.dashboardOpenQa}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-tight shadow transition-all"
              >
                Kiểm Duyệt QA Queue
              </button>
              <button
                onClick={() => onNavigate("export")}
                data-testid={TEST_IDS.dashboardOpenExport}
                className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs tracking-tight shadow transition-all"
              >
                Truy Cập Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Snap Table of all tasks */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-base font-bold text-slate-800">Cập nhật Trạng Thái (Task Status Snapshot)</h2>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-150 text-[10px] font-bold">
            Dữ liệu Vivipedia Mock
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" data-testid={TEST_IDS.dashboardTaskTable}>
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Claim Task</th>
                <th className="py-3 px-4">Parent Task</th>
                <th className="py-3 px-4">Mã Bài Viết</th>
                <th className="py-3 px-4">Nguồn Map</th>
                <th className="py-3 px-4">Người Điều Phối</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tasks.map((t) => {
                const isAssignedToMe = (userRole === "ANNOTATOR" && t.annotator === "Annotator Mai");
                const canDirectlyReview = (userRole === "QA" && t.status === "Submitted") || (userRole === "ADMIN");

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium max-w-xs">
                      <strong className="block text-slate-800 text-sm font-semibold">{t.id}</strong>
                      <span className="block text-slate-400 mt-0.5 truncate" title={t.question}>
                        {t.question}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{t.answerId}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase font-mono tracking-wider">
                        {t.articleCode}
                      </span>
                      <span className="block text-slate-400 mt-0.5 text-[11px]">{t.sectionName}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap space-x-1">
                      {t.mappedSourceOrders.length ? (
                        t.mappedSourceOrders.map((order) => (
                          <span
                            key={order}
                            className="inline-block px-1 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px]"
                          >
                            [{order}]
                          </span>
                        ))
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                          Mapping required
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{t.annotator}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${getCompositeScoreClass(compositeAverage(t))}`}>
                        {compositeAverage(t).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {userRole === "ANNOTATOR" && (
                        <button
                          onClick={() => onOpenTaskAnnotation(t.id)}
                          disabled={!isAssignedToMe}
                          data-testid={TEST_IDS.dashboardOpenAnnotationTask(t.id)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg text-[11px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {t.status === "Returned" ? "Sửa" : "Xem/Làm"}
                        </button>
                      )}
                      {(userRole === "QA" || userRole === "ADMIN") && (
                        <button
                          onClick={() => onOpenTaskQa(t.id)}
                          data-testid={TEST_IDS.dashboardOpenQaTask(t.id)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-lg text-[11px] transition-all"
                        >
                          Review
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
