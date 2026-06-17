import { AuditLog } from "../types";
import { TEST_IDS } from "../testability";
import { History, FileCode, User } from "lucide-react";
import { TableSkeleton } from "../shared/Skeleton";

interface AuditLogProps {
  auditLogs: AuditLog[];
  loading?: boolean;
}

/** ISO → "dd/MM/yyyy HH:mm:ss" theo giờ địa phương; rỗng nếu parse lỗi. */
function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
  QA: "bg-teal-50 text-teal-700 border-teal-200",
  ANNOTATOR: "bg-vsf-50 text-vsf-700 border-vsf-200",
};

export default function AuditLogView({ auditLogs, loading = false }: AuditLogProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <History size={16} className="text-vsf-600" /> Nhật ký hệ thống
        </h3>
        <span className="px-2 py-0.5 rounded bg-indigo-50 text-vsf-700 text-[11px] font-bold">
          Dữ liệu hoạt động thực tế
        </span>
      </div>

      <div className="p-4">
       {loading ? <TableSkeleton rows={6} cols={5} /> : (
       <div className="app-table-wrap overflow-x-auto">
        <table className="app-table text-sm text-slate-700" data-testid={TEST_IDS.auditTable}>
          <thead>
            <tr className="text-xs">
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Mã đối tượng</th>
              <th>Thời gian</th>
              <th>Mô tả chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                  Chưa có hoạt động nào được ghi nhận.
                </td>
              </tr>
            )}
            {auditLogs.map((log) => (
              <tr key={log.id} data-testid={TEST_IDS.auditRow(log.id)}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="grid place-items-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex-shrink-0">
                      <User size={13} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-800 truncate">{log.user}</span>
                      {log.userRole && (
                        <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-bold border ${ROLE_STYLE[log.userRole] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                          {log.userRole}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td>
                  <span data-testid={TEST_IDS.auditAction(log.id)} className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200 uppercase font-mono tracking-tight text-[11px]">
                    {log.action}
                  </span>
                </td>
                <td className="font-mono text-vsf-600 text-xs" data-testid={TEST_IDS.auditEntity(log.id)}>{log.entity}</td>
                <td className="text-slate-500 whitespace-nowrap">{formatTime(log.time)}</td>
                <td className="text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <FileCode size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{log.detail || "—"}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
       )}
      </div>
    </section>
  );
}
