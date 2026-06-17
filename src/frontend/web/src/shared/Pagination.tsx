/** Pagination — nút Trước/Sau dùng chung. total=undefined → dùng hasMore (không biết tổng). */
interface Props {
  offset: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
  onChange: (offset: number) => void;
}

export function Pagination({ offset, limit, total, hasMore, onChange }: Props) {
  const curPage = Math.floor(offset / limit) + 1;
  const totalPages = total != null ? Math.max(1, Math.ceil(total / limit)) : undefined;
  const canPrev = offset > 0;
  const canNext = total != null ? curPage < (totalPages ?? 1) : !!hasMore;

  if (!canPrev && !canNext) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
      <span className="text-slate-500">
        Trang {curPage}{totalPages ? `/${totalPages}` : ""}{total != null ? ` · ${total} mục` : ""}
      </span>
      <div className="flex gap-2">
        <button disabled={!canPrev} onClick={() => onChange(Math.max(0, offset - limit))}
          className="px-3 py-1 border border-slate-200 rounded-lg font-bold disabled:opacity-40">‹ Trước</button>
        <button disabled={!canNext} onClick={() => onChange(offset + limit)}
          className="px-3 py-1 border border-slate-200 rounded-lg font-bold disabled:opacity-40">Sau ›</button>
      </div>
    </div>
  );
}
