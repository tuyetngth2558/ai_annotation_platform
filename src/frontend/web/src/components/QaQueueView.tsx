import { useState } from "react";
import { ClaimTask } from "../types";
import { TEST_IDS } from "../testability";
import { ClipboardList, Search, Eye, Inbox } from "lucide-react";

interface QaQueueViewProps {
  tasks: ClaimTask[];
  onOpenTaskQa: (id: string) => void;
}

export default function QaQueueView({ tasks, onOpenTaskQa }: QaQueueViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Submitted" | "Returned" | "Approved">("Submitted");

  const counts = {
    submitted: tasks.filter(t => t.status === "Submitted").length,
    returned: tasks.filter(t => t.status === "Returned").length,
    approved: tasks.filter(t => t.status === "Approved").length
  };

  const isReviewable = (status: ClaimTask["status"]) => status === "Submitted";

  const filteredTasks = tasks.filter((t) => {
    // Role status filter
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    
    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(query) ||
        t.claimFinal.toLowerCase().includes(query) ||
        t.annotator.toLowerCase().includes(query) ||
        t.articleCode.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getCompositeAverage = (task: ClaimTask) => {
    const total = task.ann.SF + task.ann.SC + task.ann.NH + task.ann.SQ + task.ann.REL + task.ann.COMP;
    return total / 6;
  };

  const scoreClass = (score: number) => {
    if (score >= 0.8) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (score >= 0.6) return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-red-50 text-red-800 border-red-250";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Returned":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-vsf-100 text-vsf-800 border-vsf-200";
    }
  };

  return (
    <div className="space-y-6">
      <section className="app-card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("Submitted")}
            data-testid={TEST_IDS.qaFilterSubmitted}
            className={`filter-chip ${statusFilter === "Submitted" ? "filter-chip-active" : "filter-chip-inactive"}`}
          >
            Chờ duyệt ({counts.submitted})
          </button>
          <button
            onClick={() => setStatusFilter("Returned")}
            data-testid={TEST_IDS.qaFilterReturned}
            className={`filter-chip ${statusFilter === "Returned" ? "bg-red-600 border-red-600 text-white" : "filter-chip-inactive"}`}
          >
            Đã trả về ({counts.returned})
          </button>
          <button
            onClick={() => setStatusFilter("Approved")}
            data-testid={TEST_IDS.qaFilterApproved}
            className={`filter-chip ${statusFilter === "Approved" ? "bg-emerald-600 border-emerald-600 text-white" : "filter-chip-inactive"}`}
          >
            Đã duyệt ({counts.approved})
          </button>
          <button
            onClick={() => setStatusFilter("All")}
            data-testid={TEST_IDS.qaFilterAll}
            className={`filter-chip ${statusFilter === "All" ? "filter-chip-active" : "filter-chip-inactive"}`}
          >
            Tất cả ({tasks.length})
          </button>
        </div>

        <div className="relative max-w-lg">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid={TEST_IDS.qaSearchInput}
            className="field-input pl-10"
            placeholder="Tìm task, mã bài, annotator..."
          />
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="app-card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-vsf-600" />
            Danh sách review ({filteredTasks.length})
          </h3>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table" data-testid={TEST_IDS.qaQueueTable}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Mã bài</th>
                  <th>Claim</th>
                  <th>Annotator</th>
                  <th>Trạng thái</th>
                  <th>Composite</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      Không có claim nào trong hàng đợi.
                    </td>
                  </tr>
                )}
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50" data-testid={TEST_IDS.qaRow(t.id)}>
                    <td className="py-3.5 px-3 font-bold text-slate-900">{t.id}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono">
                        {t.articleCode}
                      </span>
                      <span className="block text-slate-400 mt-0.5 text-[10.5px]" title={t.category}>{t.category}</span>
                    </td>
                    <td className="py-3.5 px-3 max-w-sm font-medium text-slate-700 truncate" title={t.claimFinal}>
                      {t.claimFinal}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-bold">{t.annotator}</td>
                    <td className="py-3.5 px-3">
                      <span data-testid={TEST_IDS.qaStatus(t.id)} className={`inline-block px-2.5 py-0.5 rounded-full border text-[10.5px] font-bold ${statusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded border ${scoreClass(getCompositeAverage(t))}`}>
                        {getCompositeAverage(t).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => onOpenTaskQa(t.id)}
                        data-testid={TEST_IDS.qaReviewOpen(t.id)}
                        className={`${isReviewable(t.status) ? "btn-primary" : "btn-secondary"} !text-xs !py-1.5 !px-3 mx-auto`}
                      >
                        <Eye size={12} /> {isReviewable(t.status) ? "Review" : "Xem"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center" data-testid={TEST_IDS.qaEmptyState}>
            <Inbox size={32} className="text-gray-300 mx-auto mb-3" />
            <strong className="text-gray-800 block text-sm">Không có task phù hợp</strong>
            <p className="text-sm text-gray-500 mt-1">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        )}
      </section>

    </div>
  );
}
