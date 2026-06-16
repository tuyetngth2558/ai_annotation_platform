/** MyTasksPage — danh sách claim được giao (OQ-008). Nối GET /tasks. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { fetchMyTasks } from "@/shared/lib/adapters";
import type { ClaimTask } from "@/shared/types/domain";

const STATUS_COLOR: Record<string, string> = {
  Returned: "var(--danger)",
  Submitted: "var(--primary)",
  Approved: "#16a34a",
};

const th: React.CSSProperties = { padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "var(--muted)" };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "top" };

export function MyTasksPage() {
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTasks()
      .then(setTasks)
      .catch((e) => setError(e?.message ?? "Không tải được danh sách task."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Công việc của tôi</h1>
      <p style={{ color: "var(--muted)" }}>Chỉ hiển thị claim được phân công cho bạn (OQ-008).</p>

      {loading && <Card>Đang tải…</Card>}
      {error && <Card style={{ color: "var(--danger)" }}>{error}</Card>}
      {!loading && !error && tasks.length === 0 && <Card>Chưa có claim nào được giao.</Card>}

      {tasks.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
                <th style={th}>Mã bài</th>
                <th style={th}>Claim</th>
                <th style={th}>Section</th>
                <th style={th}>Trạng thái</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((tk) => (
                <tr key={tk.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>{tk.articleCode || "—"}</td>
                  <td style={{ ...td, maxWidth: 360 }}>{tk.claimText}</td>
                  <td style={td}>{tk.sectionName || "—"}</td>
                  <td style={td}>
                    <span style={{ color: STATUS_COLOR[tk.status] ?? "var(--muted)", fontWeight: 700 }}>
                      {tk.status}
                    </span>
                  </td>
                  <td style={td}>
                    <Link to={`/annotator/tasks/${tk.id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>
                      Mở chấm →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
