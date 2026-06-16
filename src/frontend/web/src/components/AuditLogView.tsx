import { AuditLog } from "../types";
import { TEST_IDS } from "../testability";
import { History, FileCode } from "lucide-react";

interface AuditLogProps {
  auditLogs: AuditLog[];
}

export default function AuditLogView({ auditLogs }: AuditLogProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <History size={16} className="text-vsf-600" /> Audit Trace Log
        </h3>
        <span className="px-2 py-0.5 rounded bg-indigo-50 text-vsf-700 text-[10px] font-bold">
          Dữ liệu hoat động thực tế
        </span>
      </div>

      <div className="overflow-x-auto text-[11.5px] font-semibold text-gray-600">
        <table className="w-full text-left" data-testid={TEST_IDS.auditTable}>
          <thead>
            <tr className="bg-slate-50/70 border-b border-gray-200 text-slate-400 font-bold uppercase text-[9.5px]">
              <th className="py-2.5 px-3">Người thực hiện</th>
              <th className="py-2.5 px-3">Hành động</th>
              <th className="py-2.5 px-3">Mã đối tượng</th>
              <th className="py-2.5 px-3">Thời gian</th>
              <th className="py-2.5 px-3">Mô tả hành vi chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-gray-600">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/40" data-testid={TEST_IDS.auditRow(log.id)}>
                <td className="py-3 px-3 font-bold text-slate-800">{log.user}</td>
                <td className="py-3 px-3 antialiased">
                  <span data-testid={TEST_IDS.auditAction(log.id)} className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-bold border border-slate-200 uppercase font-mono tracking-tight text-[10px]">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono font-bold text-vsf-600 tracking-wide text-xs" data-testid={TEST_IDS.auditEntity(log.id)}>{log.entity}</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400 tracking-tight">{log.time}</td>
                <td className="py-3 px-3 text-slate-550 leading-relaxed font-normal">
                  <span className="flex items-center gap-1.5">
                    <FileCode size={13} className="text-slate-400 flex-shrink-0" />
                    <span>{log.detail}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
