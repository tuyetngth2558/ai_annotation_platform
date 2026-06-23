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

  if (userRole === "ANNOTATOR") return <AnnotatorDashboard tasks={tasks} onNavigate={onNavigate} onOpenTaskAnnotation={onOpenTaskAnnotation} />;
  return <QaDashboard tasks={tasks} onNavigate={onNavigate} onOpenTaskQa={onOpenTaskQa} />;
}

/** Hàng phân bố theo trạng thái — 1 dòng nhãn + số. */
function StatusRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <strong className={color}>{value}</strong>
    </li>
  );
}

/** Dashboard ANNOTATOR — thẻ số liệu + tiến độ + việc cần làm tiếp (không bảng). */
function AnnotatorDashboard({
  tasks, onNavigate, onOpenTaskAnnotation,
}: {
  tasks: ClaimTask[];
  onNavigate: (v: string) => void;
  onOpenTaskAnnotation: (id: string) => void;
}) {
  const c = {
    ready: tasks.filter((t) => t.status === "Ready for Annotation").length,
    inWork: tasks.filter((t) => t.status === "In Annotation").length,
    returned: tasks.filter((t) => t.status === "Returned").length,
    submitted: tasks.filter((t) => t.status === "Submitted").length,
    approved: tasks.filter((t) => t.status === "Approved").length,
  };
  const total = tasks.length;
  const done = c.submitted + c.approved;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Việc cần làm tiếp: ưu tiên claim bị trả → đang làm → chưa làm.
  const next =
    tasks.find((t) => t.status === "Returned") ??
    tasks.find((t) => t.status === "In Annotation") ??
    tasks.find((t) => t.status === "Ready for Annotation") ??
    null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Chưa làm" value={c.ready} icon={<FileText size={18} />} color="blue" />
        <MetricCard label="Đang làm" value={c.inWork} icon={<Clock size={18} />} color="amber" />
        <MetricCard label="Bị trả lại" value={c.returned} icon={<AlertCircle size={18} />} color="red" />
        <MetricCard testId={TEST_IDS.dashboardMetricSubmitted} label="Đã nộp" value={c.submitted} icon={<CheckCircle size={18} />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Việc cần làm tiếp */}
        <section className="app-card p-5 lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Việc cần làm tiếp</h3>
          {next ? (
            <div className="flex-1 flex flex-col">
              <span className={`self-start status-pill ${
                next.status === "Returned" ? "bg-red-50 text-red-700 border-red-200"
                : next.status === "In Annotation" ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                {next.status === "Returned" ? "Bị trả lại — cần sửa" : next.status === "In Annotation" ? "Đang làm dở" : "Chưa bắt đầu"}
              </span>
              <p className="mt-2 text-[13px] text-slate-400">{next.projectName || "—"}</p>
              <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-2" title={next.claimFinal}>{next.claimFinal || next.question}</p>
              <div className="mt-auto pt-4">
                <button onClick={() => onOpenTaskAnnotation(next.id)} data-testid={TEST_IDS.dashboardOpenAnnotation} className="btn-primary !text-xs !py-2 !px-4">
                  {next.status === "Returned" ? "Sửa ngay" : "Tiếp tục"} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <CheckCircle size={28} className="text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Bạn đã làm hết phần được giao 🎉</p>
              <p className="text-[13px] text-slate-400 mt-1">Chưa có claim nào chờ xử lý.</p>
            </div>
          )}
        </section>

        {/* Tiến độ + phân bố */}
        <section className="app-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-800">Tiến độ của bạn</h3>
            <span className="text-sm font-bold text-emerald-600">{pct}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[12px] text-slate-400 mt-2">{done}/{total} claim đã nộp/duyệt.</p>
          <ul className="space-y-1.5 text-[13px] mt-4 pt-4 border-t border-slate-100">
            <StatusRow label="Chưa làm" value={c.ready} color="text-slate-700" />
            <StatusRow label="Đang làm" value={c.inWork} color="text-amber-600" />
            <StatusRow label="Bị trả" value={c.returned} color="text-red-600" />
            <StatusRow label="Đã nộp" value={c.submitted} color="text-violet-600" />
            <StatusRow label="Đã duyệt" value={c.approved} color="text-emerald-600" />
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onNavigate("tasks")} data-testid={TEST_IDS.dashboardOpenTasks} className="btn-secondary !text-xs !py-2 !px-4">
          Xem tất cả nhiệm vụ <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

/** Dashboard QA — thẻ số liệu hàng đợi + claim chờ lâu nhất + lối tắt (không bảng). */
function QaDashboard({
  tasks, onNavigate, onOpenTaskQa,
}: {
  tasks: ClaimTask[];
  onNavigate: (v: string) => void;
  onOpenTaskQa: (id: string) => void;
}) {
  // Queue chỉ trả claim "Submitted" (chờ duyệt) → tasks = hàng đợi hiện tại.
  const pending = tasks.length;
  // Số dự án khác nhau đang có claim chờ.
  const projects = new Set(tasks.map((t) => t.projectId).filter(Boolean)).size;
  // Claim chờ lâu nhất (queue đã sort submitted_at tăng dần → phần tử đầu).
  const oldest = tasks[0] ?? null;

  const fmt = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard testId={TEST_IDS.dashboardMetricSubmitted} label="Chờ bạn duyệt" value={pending} icon={<Clock size={18} />} color="amber" />
        <MetricCard label="Số dự án liên quan" value={projects} icon={<FolderKanban size={18} />} color="blue" />
        <MetricCard label="Tổng trong hàng đợi" value={pending} icon={<FileText size={18} />} color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Claim chờ lâu nhất */}
        <section className="app-card p-5 lg:col-span-2 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Claim chờ lâu nhất</h3>
          {oldest ? (
            <div className="flex-1 flex flex-col">
              <p className="text-[13px] text-slate-400">{oldest.projectName || "—"} · nộp {fmt(oldest.submittedAt)}</p>
              <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-2" title={oldest.claimFinal}>{oldest.claimFinal || oldest.question}</p>
              <p className="mt-1 text-[13px] text-slate-500">Annotator: <span className="font-semibold text-slate-700">{oldest.annotator || "—"}</span></p>
              <div className="mt-auto pt-4">
                <button onClick={() => onOpenTaskQa(oldest.id)} data-testid={TEST_IDS.dashboardOpenQa} className="btn-primary !text-xs !py-2 !px-4">
                  Duyệt ngay <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <CheckCircle size={28} className="text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Hàng đợi trống 🎉</p>
              <p className="text-[13px] text-slate-400 mt-1">Không có claim nào chờ duyệt.</p>
            </div>
          )}
        </section>

        {/* Tóm tắt hàng đợi */}
        <section className="app-card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5"><ListChecks size={15} className="text-vsf-600" /> Hàng đợi</h3>
          <ul className="space-y-2 text-sm">
            <StatusRow label="Claim chờ duyệt" value={pending} color="text-violet-600" />
            <StatusRow label="Dự án liên quan" value={projects} color="text-slate-700" />
          </ul>
          <p className="text-[12px] text-slate-400 mt-4 pt-4 border-t border-slate-100">
            Duyệt theo thứ tự nộp sớm nhất để tránh tồn đọng.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onNavigate("qa")} data-testid={TEST_IDS.dashboardOpenTasks} className="btn-secondary !text-xs !py-2 !px-4">
          Mở hàng đợi QA <ArrowRight size={14} />
        </button>
      </div>
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
