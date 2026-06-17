/** Skeleton loading — placeholder nhấp nháy khi đang tải (chuẩn UX, đỡ giật/trống). */

/** 1 khối skeleton (tùy chỉnh className để đặt kích thước). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/70 rounded ${className}`} />;
}

/** Skeleton dạng bảng có khung — cho list (Users/Audit...). */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="app-table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton className="h-3 w-20" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton className={`h-3.5 ${c === 0 ? "w-32" : "w-24"}`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Skeleton cho workspace chấm điểm / QA review (toolbar + 2 khung). */
export function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="app-card p-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      {/* 2 khung */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="app-card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={`h-4 ${i % 2 ? "w-2/3" : "w-full"}`} />)}
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="app-card p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className={`h-4 ${i % 3 ? "w-3/4" : "w-full"}`} />)}
        </div>
      </div>
    </div>
  );
}

/** Skeleton dạng lưới card — cho danh sách project. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="app-card p-5 space-y-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
