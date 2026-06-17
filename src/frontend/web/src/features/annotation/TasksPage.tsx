/** TasksPage (ANNOTATOR) — danh sách task được giao. Nối GET /tasks. */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, ClipboardList } from "lucide-react";
import { fetchMyTasks } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { EmptyState } from "@/shared/EmptyState";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { setIfChanged } from "@/shared/setIfChanged";
import type { ClaimTask } from "@/types";
import { TEST_IDS } from "@/testability";

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4" data-testid={TEST_IDS.view("tasks")}>
      {loading && <div className="app-card p-5 text-gray-500">Đang tải…</div>}
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
          <div className="overflow-x-auto">
            <table className="data-table" data-testid={TEST_IDS.tasksAssignedTable}>
              <thead>
                <tr>
                  <th className="py-3 px-4">Mã bài</th>
                  <th className="py-3 px-4">Claim</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {tasks.map((t) => (
                  <tr key={t.id} data-testid={TEST_IDS.taskRow(t.id)}>
                    <td className="py-3 px-4 font-mono text-sm">{t.articleCode}</td>
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
        </div>
      )}
    </div>
  );
}
