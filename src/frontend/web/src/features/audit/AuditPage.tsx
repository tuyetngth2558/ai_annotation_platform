/** AuditPage (ADMIN) — nhật ký. Nối GET /audit-logs. */
import { useEffect, useState } from "react";
import AuditLogView from "@/components/AuditLogView";
import { fetchAuditLogs } from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";
import type { AuditLog } from "@/types";

export function AuditPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAuditLogs().then(setLogs).catch((e) => showToast(e?.message ?? "Không tải được audit log."));
  }, [showToast]);

  return <AuditLogView auditLogs={logs} />;
}
