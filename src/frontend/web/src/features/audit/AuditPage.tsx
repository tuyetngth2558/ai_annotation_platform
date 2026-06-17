/** AuditPage (ADMIN) — nhật ký, phân trang 10. Nối GET /audit-logs. */
import { useEffect, useState } from "react";
import AuditLogView from "@/components/AuditLogView";
import { Pagination } from "@/shared/Pagination";
import { fetchAuditLogsPaged } from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";
import type { AuditLog } from "@/types";

const PAGE = 10;

export function AuditPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchAuditLogsPaged(PAGE, offset)
      .then((p) => { setLogs(p.items); setTotal(p.total); })
      .catch((e) => showToast(e?.message ?? "Không tải được audit log."));
  }, [offset, showToast]);

  return (
    <div className="space-y-3">
      <AuditLogView auditLogs={logs} />
      <div className="app-card p-0">
        <Pagination offset={offset} limit={PAGE} total={total} onChange={setOffset} />
      </div>
    </div>
  );
}
