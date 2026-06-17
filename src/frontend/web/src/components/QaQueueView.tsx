import { useEffect, useMemo, useState } from "react";
import { ClaimTask } from "../types";
import { TEST_IDS } from "../testability";
import { Search, Eye, Inbox } from "lucide-react";
import { Pagination } from "../shared/Pagination";
import { ColumnFilter } from "../shared/ColumnFilter";

interface QaQueueViewProps {
  tasks: ClaimTask[];
  onOpenTaskQa: (id: string) => void;
}

const PAGE = 10;
const ROW_H = 57; // chiều cao 1 hàng (px)
const HEAD_H = 41;
const VISIBLE_ROWS = 10; // bảng fix cứng = 10 hàng; thừa thì sang trang

/** ISO → "dd/MM/yyyy HH:mm"; "—" nếu rỗng/parse lỗi. */
function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const scoreClass = (s: number) => {
  if (s >= 0.8) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s >= 0.6) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-red-50 text-red-800 border-red-200";
};

export default function QaQueueView({ tasks, onOpenTaskQa }: QaQueueViewProps) {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [offset, setOffset] = useState(0);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (!q) return true;
      return (
        t.claimFinal.toLowerCase().includes(q) ||
        t.annotator.toLowerCase().includes(q) ||
        t.articleCode.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q)
      );
    });
  }, [tasks, projectFilter, search]);

  const pageItems = useMemo(() => filtered.slice(offset, offset + PAGE), [filtered, offset]);

  useEffect(() => { setOffset(0); }, [projectFilter, search]);
  useEffect(() => {
    if (offset > 0 && offset >= filtered.length) setOffset(Math.max(0, (Math.ceil(filtered.length / PAGE) - 1) * PAGE));
  }, [filtered.length, offset]);

  if (tasks.length === 0) {
    return (
      <div className="app-card p-12 text-center" data-testid={TEST_IDS.qaEmptyState}>
        <Inbox size={32} className="text-gray-300 mx-auto mb-3" />
        <strong className="text-gray-800 block text-sm">Hàng đợi trống</strong>
        <p className="text-sm text-gray-500 mt-1">Chưa có claim nào chờ duyệt. Claim annotator vừa nộp sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="app-card overflow-hidden">
      {/* Toolbar: tìm kiếm + đếm. */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid={TEST_IDS.qaSearchInput}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-vsf-500"
            placeholder="Tìm claim, mã bài, annotator, dự án…"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} claim chờ duyệt</span>
      </div>

      {/* Bảng fix cứng chiều cao = 10 hàng; thừa thì cuộn / sang trang. */}
      <div className="overflow-auto" style={{ height: `${VISIBLE_ROWS * ROW_H + HEAD_H}px` }}>
        <table className="data-table" data-testid={TEST_IDS.qaQueueTable}>
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="py-3 px-4">
                <ColumnFilter label="Dự án" options={projectOptions} value={projectFilter} onChange={setProjectFilter} />
              </th>
              <th className="py-3 px-4">Claim</th>
              <th className="py-3 px-4">Annotator</th>
              <th className="py-3 px-4">Thời gian nộp</th>
              <th className="py-3 px-4 text-center">Composite</th>
              <th className="py-3 px-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {pageItems.length === 0 && (
              <tr style={{ height: `${VISIBLE_ROWS * ROW_H}px` }}>
                <td colSpan={6} className="text-center text-gray-400 align-middle">Không có claim khớp bộ lọc.</td>
              </tr>
            )}
            {pageItems.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/50" data-testid={TEST_IDS.qaRow(t.id)}>
                <td className="py-3 px-4">
                  <span className="block font-semibold text-slate-800">{t.projectName || "—"}</span>
                </td>
                <td className="py-3 px-4 max-w-sm font-medium text-slate-700 truncate" title={t.claimFinal}>
                  {t.claimFinal}
                </td>
                <td className="py-3 px-4 text-slate-700">{t.annotator || "—"}</td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatTime(t.submittedAt)}</td>
                <td className="py-3 px-4 text-center">
                  {t.compositeAnnotator != null ? (
                    <span className={`inline-block px-2 py-0.5 rounded border font-semibold ${scoreClass(t.compositeAnnotator)}`}>
                      {t.compositeAnnotator.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onOpenTaskQa(t.id)}
                    data-testid={TEST_IDS.qaReviewOpen(t.id)}
                    className="btn-primary !text-xs !py-1.5 !px-3 mx-auto inline-flex items-center gap-1"
                  >
                    <Eye size={12} /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination offset={offset} limit={PAGE} total={filtered.length} onChange={setOffset} />
    </div>
  );
}
