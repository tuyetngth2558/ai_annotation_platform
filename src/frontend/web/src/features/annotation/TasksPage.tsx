/** TasksPage (ANNOTATOR) — danh sách task được giao. Nối GET /tasks. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, ClipboardList } from "lucide-react";
import { fetchMyTasks } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { EmptyState } from "@/shared/EmptyState";
import { Pagination } from "@/shared/Pagination";
import { ColumnFilter } from "@/shared/ColumnFilter";
import { TableSkeleton } from "@/shared/Skeleton";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { setIfChanged } from "@/shared/setIfChanged";
import type { ClaimTask } from "@/types";
import { TEST_IDS } from "@/testability";

const PAGE = 10;
const ROW_H = 53; // chiều cao 1 hàng task (px)
const HEAD_H = 41; // chiều cao header bảng (px)
const VISIBLE_ROWS = 10; // bảng fix cứng = 10 hàng; thừa thì sang trang khác

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [projectFilter, setProjectFilter] = useState(""); // "" = tất cả project
  const [statusFilter, setStatusFilter] = useState("");   // "" = tất cả trạng thái

  usePageHeader({
    title: "Nhiệm vụ được giao",
    description: "Claim task phân công cho bạn (chỉ thấy task của mình).",
  });

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetchMyTasks()
      .then((t) => setIfChanged(setTasks, t.map(enrichClaimTask)))
      .catch((e) => { if (!silent) setError(e?.message ?? "Không tải được danh sách task."); })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh ngầm 30s — thấy claim admin vừa gán; chỉ re-render khi data đổi.
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) load(true); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  // Option lọc theo project (distinct) — gắn vào header cột "Dự án".
  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tasks) {
      if (t.projectId && !seen.has(t.projectId)) seen.set(t.projectId, t.projectName || t.projectId);
    }
    return [...seen].map(([value, name]) => ({
      value, label: name, count: tasks.filter((t) => t.projectId === value).length,
    }));
  }, [tasks]);

  // Option lọc theo trạng thái — gắn vào header cột "Trạng thái".
  const statusOptions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of tasks) seen.set(t.status, (seen.get(t.status) ?? 0) + 1);
    return [...seen].map(([value, count]) => ({ value, label: value, count }));
  }, [tasks]);

  // Lọc theo project + trạng thái (client) rồi phân trang.
  const filtered = useMemo(
    () => tasks.filter((t) =>
      (!projectFilter || t.projectId === projectFilter) &&
      (!statusFilter || t.status === statusFilter),
    ),
    [tasks, projectFilter, statusFilter],
  );
  const pageItems = useMemo(() => filtered.slice(offset, offset + PAGE), [filtered, offset]);

  // Đổi filter → về trang 1.
  useEffect(() => { setOffset(0); }, [projectFilter, statusFilter]);
  // Kẹp offset khi danh sách co lại (vd vừa submit hết task trang cuối).
  useEffect(() => {
    if (offset > 0 && offset >= filtered.length) setOffset(Math.max(0, (Math.ceil(filtered.length / PAGE) - 1) * PAGE));
  }, [filtered.length, offset]);

  return (
    <div className="space-y-4" data-testid={TEST_IDS.view("tasks")}>
      {loading && tasks.length === 0 && <div className="app-card p-4"><TableSkeleton rows={PAGE} cols={5} /></div>}
      {error && <div className="app-card p-5 text-red-600">{error}</div>}
      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={26} />}
          title="Chưa có claim nào được giao"
          description="Khi admin gán claim cho bạn, chúng sẽ xuất hiện ở đây."
        />
      )}

      {tasks.length > 0 && (
        <div className="app-card overflow-hidden">
          {/* Bảng fix cứng chiều cao = 10 hàng; thừa thì cuộn / sang trang. */}
          <div className="overflow-auto" style={{ height: `${VISIBLE_ROWS * ROW_H + HEAD_H}px` }}>
            <table className="data-table" data-testid={TEST_IDS.tasksAssignedTable}>
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <th className="py-3 px-4">
                    <ColumnFilter label="Dự án" options={projectOptions} value={projectFilter} onChange={setProjectFilter} />
                  </th>
                  <th className="py-3 px-4">Claim</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">
                    <ColumnFilter label="Trạng thái" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
                  </th>
                  <th className="py-3 px-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {pageItems.length === 0 && (
                  <tr style={{ height: `${VISIBLE_ROWS * ROW_H}px` }}>
                    <td colSpan={5} className="text-center text-gray-400 align-middle">Không có task khớp bộ lọc.</td>
                  </tr>
                )}
                {pageItems.map((t) => (
                  <tr key={t.id} data-testid={TEST_IDS.taskRow(t.id)}>
                    <td className="py-3 px-4">
                      <span className="block font-semibold text-slate-800">{t.projectName || "—"}</span>
                    </td>
                    <td className="py-3 px-4 max-w-sm truncate font-medium" title={t.claimFinal}>
                      {t.claimFinal || t.question}
                    </td>
                    <td className="py-3 px-4">{t.sectionName || "—"}</td>
                    <td className="py-3 px-4">
                      <span
                        data-testid={TEST_IDS.taskStatus(t.id)}
                        className={`status-pill ${
                          t.status === "Returned" ? "bg-red-50 text-red-800 border-red-200"
                          : t.status === "Submitted" ? "bg-vsf-50 text-vsf-800 border-vsf-200"
                          : t.status === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => navigate(`/annotator/tasks/${t.id}`)}
                        data-testid={TEST_IDS.taskOpenAnnotation(t.id)}
                        className="btn-primary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1"
                      >
                        <CheckSquare size={13} /> {t.status === "Returned" ? "Chỉnh sửa" : "Mở workspace"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} limit={PAGE} total={filtered.length} onChange={setOffset} />
        </div>
      )}
    </div>
  );
}
