import { useState } from "react";
import { ClaimTask } from "../types";
import { TEST_IDS } from "../testability";
import { ClipboardList, Search, Eye, Sparkles } from "lucide-react";

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

  const filteredTasks = tasks.filter((t) => {
    // Role status filter
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    
    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(query) ||
        t.question.toLowerCase().includes(query) ||
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
    if (score >= 0.8) return "bg-emerald-50 text-emerald-800 border-emerald-250";
    if (score >= 0.6) return "bg-amber-50 text-amber-800 border-amber-250";
    return "bg-red-50 text-red-800 border-red-250";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Returned":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and interactive filter bar */}
      <section className="bg-white rounded-xl border border-slate-100 p-5 shadow space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Thẩm Định & Kiểm Duyệt (QA Queue)</h2>
            <p className="text-xs text-slate-400 mt-1">Nơi phê duyệt chéo các nhận định đã được Annotators chấm điểm và mapping nguồn.</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setStatusFilter("Submitted")}
              data-testid={TEST_IDS.qaFilterSubmitted}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === "Submitted"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-white border-slate-150 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Chờ duyệt ({counts.submitted})
            </button>
            <button
              onClick={() => setStatusFilter("Returned")}
              data-testid={TEST_IDS.qaFilterReturned}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === "Returned"
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-white border-slate-150 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Đã trả về ({counts.returned})
            </button>
            <button
              onClick={() => setStatusFilter("Approved")}
              data-testid={TEST_IDS.qaFilterApproved}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === "Approved"
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-white border-slate-150 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Đã duyệt ({counts.approved})
            </button>
            <button
              onClick={() => setStatusFilter("All")}
              data-testid={TEST_IDS.qaFilterAll}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === "All"
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-slate-150 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tất cả ({tasks.length})
            </button>
          </div>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid={TEST_IDS.qaSearchInput}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Tìm kiếm theo mã task, annotator, câu hỏi hỏi đáp ODA hoặc mã bài viết..."
          />
        </div>
      </section>

      {/* Queue tasks tables representation */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <ClipboardList size={16} className="text-blue-600" /> Danh Sách Claim Đang Đợi Review ({filteredTasks.length})
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] uppercase font-bold">
            Thẩm định chéo
          </span>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="overflow-x-auto text-[11.5px]">
            <table className="w-full text-left" data-testid={TEST_IDS.qaQueueTable}>
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Claim Task ID</th>
                  <th className="py-2.5 px-3">Mã Bài / Category</th>
                  <th className="py-2.5 px-3">Câu Hỏi (Question)</th>
                  <th className="py-2.5 px-3">Annotator thực hiện</th>
                  <th className="py-2.5 px-3">Trạng Thái</th>
                  <th className="py-2.5 px-3">Composite Score</th>
                  <th className="py-2.5 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50" data-testid={TEST_IDS.qaRow(t.id)}>
                    <td className="py-3.5 px-3 font-bold text-slate-900">{t.id}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono">
                        {t.articleCode}
                      </span>
                      <span className="block text-slate-400 mt-0.5 text-[10.5px]" title={t.category}>{t.category}</span>
                    </td>
                    <td className="py-3.5 px-3 max-w-sm font-medium text-slate-700 truncate" title={t.question}>
                      {t.question}
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
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow transition-all flex items-center justify-center gap-1 mx-auto"
                      >
                        <Eye size={12} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 text-slate-400 block border-t" data-testid={TEST_IDS.qaEmptyState}>
            <Sparkles size={28} className="text-slate-300 mx-auto mb-2" />
            <strong className="text-slate-700 block text-xs">Không Tìm Thấy Hạng Mục Trùng Khớp</strong>
            <p className="text-[11px] text-slate-400 mt-1">Hệ thống không phát hiện claim task nào thuộc điều kiện lọc hiện tại.</p>
          </div>
        )}
      </section>

    </div>
  );
}
