/** AuditLogPage — nhật ký hệ thống (ADMIN). Nối GET /audit-logs. INSERT-only (BR-10.1). */
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { fetchAuditLogs } from "@/shared/lib/adapters";
import type { AuditLogRow } from "@/shared/types/domain";

const th: React.CSSProperties = { padding: "8px 12px", fontSize: 12, textTransform: "uppercase", color: "var(--muted)" };
const td: React.CSSProperties = { padding: "8px 12px", verticalAlign: "top", fontSize: 13 };

export function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs()
      .then(setRows)
      .catch((e) => setError(e?.message ?? "Không tải được audit log."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Nhật ký hệ thống</h1>
      <p style={{ color: "var(--muted)" }}>Ghi nhận import/submit/approve/return/export. Chỉ thêm, không sửa/xóa (BR-10.1).</p>

      {loading && <Card>Đang tải…</Card>}
      {error && <Card style={{ color: "var(--danger)" }}>{error}</Card>}
      {!loading && !error && rows.length === 0 && <Card>Chưa có log.</Card>}

      {rows.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
                <th style={th}>Thời gian</th>
                <th style={th}>Hành động</th>
                <th style={th}>Đối tượng</th>
                <th style={th}>Vai trò</th>
                <th style={th}>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>{new Date(r.timestamp).toLocaleString("vi-VN")}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.action}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{r.entity}</td>
                  <td style={td}>{r.userRole || "—"}</td>
                  <td style={{ ...td, color: "var(--muted)", maxWidth: 360 }}>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
