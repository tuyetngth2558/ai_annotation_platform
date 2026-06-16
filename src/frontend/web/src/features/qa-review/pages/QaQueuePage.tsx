/** QaQueuePage — hàng đợi claim đã submit chờ QA. Nối GET /qa-reviews/queue. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { fetchQaQueue } from "@/shared/lib/adapters";
import type { ClaimTask } from "@/shared/types/domain";

const th: React.CSSProperties = { padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "var(--muted)" };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "top" };

export function QaQueuePage() {
  const [items, setItems] = useState<ClaimTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQaQueue()
      .then(setItems)
      .catch((e) => setError(e?.message ?? "Không tải được hàng đợi QA."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Hàng đợi QA</h1>
      <p style={{ color: "var(--muted)" }}>Claim đã submit, chờ duyệt (Approve) hoặc trả lại (Return).</p>

      {loading && <Card>Đang tải…</Card>}
      {error && <Card style={{ color: "var(--danger)" }}>{error}</Card>}
      {!loading && !error && items.length === 0 && <Card>Hàng đợi trống.</Card>}

      {items.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
                <th style={th}>Mã bài</th>
                <th style={th}>Claim</th>
                <th style={th}>Section</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((tk) => (
                <tr key={tk.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>{tk.articleCode || "—"}</td>
                  <td style={{ ...td, maxWidth: 420 }}>{tk.claimText}</td>
                  <td style={td}>{tk.sectionName || "—"}</td>
                  <td style={td}>
                    <Link to={`/qa/review/${tk.id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>
                      Duyệt →
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
