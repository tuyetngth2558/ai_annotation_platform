/** EmptyState — hiển thị chuẩn khi danh sách trống (thay vì khoảng trắng/lỗi). */
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Icon minh họa (mặc định Inbox). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Nút hành động chính (vd "Tạo project"). */
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="app-card flex flex-col items-center justify-center text-center px-6 py-14">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
        {icon ?? <Inbox size={26} />}
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {description && (
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
