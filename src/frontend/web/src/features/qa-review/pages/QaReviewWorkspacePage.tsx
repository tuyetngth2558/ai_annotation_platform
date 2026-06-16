/**
 * QaReviewWorkspacePage — diff view pre vs annotator + Approve / Return.
 * Nối GET /qa-reviews/{id}, POST approve, POST return (qa_comment >=10 ký tự VR-QA-002).
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fetchQaReviewDetail, approveClaim, returnClaim } from "@/shared/lib/adapters";
import type { ClaimTask, Dimension } from "@/shared/types/domain";

const DIMS: { key: Dimension; label: string }[] = [
  { key: "SF", label: "SF" }, { key: "SC", label: "SC" }, { key: "NH", label: "NH" },
  { key: "SQ", label: "SQ" }, { key: "REL", label: "REL" }, { key: "COMP", label: "COMP" },
];

const ERROR_TYPES = ["Factual Error", "Guideline Violation", "Source Mismatch", "Incomplete", "Other"];

export function QaReviewWorkspacePage() {
  const { claimId = "" } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState<ClaimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [showReturn, setShowReturn] = useState(false);
  const [errorType, setErrorType] = useState(ERROR_TYPES[0]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchQaReviewDetail(claimId)
      .then(setTask)
      .catch((e) => setError(e?.message ?? "Không tải được chi tiết review."))
      .finally(() => setLoading(false));
  }, [claimId]);

  async function onApprove() {
    setMsg(null);
    setBusy(true);
    try {
      await approveClaim(claimId);
      navigate("/qa/queue");
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? "Không duyệt được.");
    } finally {
      setBusy(false);
    }
  }

  async function onReturn() {
    setMsg(null);
    if (comment.trim().length < 10) {
      setMsg("Ý kiến trả lại phải ≥ 10 ký tự (VR-QA-002).");
      return;
    }
    setBusy(true);
    try {
      await returnClaim(claimId, errorType, comment);
      navigate("/qa/queue");
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? "Không trả lại được.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Card>Đang tải…</Card>;
  if (error) return <Card style={{ color: "var(--danger)" }}>{error}</Card>;
  if (!task) return <Card>Không có dữ liệu.</Card>;

  const compPre = DIMS.reduce((s, d) => s + (task.pre[d.key] || 0), 0) / 6;
  const compAnn = DIMS.reduce((s, d) => s + (task.ann[d.key] || 0), 0) / 6;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      <div>
        <h1 style={{ margin: 0 }}>Màn duyệt QA</h1>
        <p style={{ color: "var(--muted)", margin: "4px 0" }}>{task.articleCode} · {task.sectionName || "—"}</p>
      </div>

      <Card>
        <strong>Claim</strong>
        <p style={{ marginTop: 6 }}>{task.claimText}</p>
        {task.answerContext && <p style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>{task.answerContext}</p>}
      </Card>

      <Card>
        <strong>So sánh điểm (Pre vs Annotator)</strong>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
              <th style={{ padding: 6 }}>Chiều</th><th style={{ padding: 6 }}>Pre</th>
              <th style={{ padding: 6 }}>Annotator</th><th style={{ padding: 6 }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {DIMS.map((d) => {
              const delta = (task.ann[d.key] || 0) - (task.pre[d.key] || 0);
              return (
                <tr key={d.key} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 6 }}>{d.label}</td>
                  <td style={{ padding: 6, color: "var(--muted)" }}>{(task.pre[d.key] || 0).toFixed(2)}</td>
                  <td style={{ padding: 6, fontWeight: 600 }}>{(task.ann[d.key] || 0).toFixed(2)}</td>
                  <td style={{ padding: 6, fontWeight: 700, color: Math.abs(delta) >= 0.2 ? "var(--danger)" : "var(--muted)" }}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 700 }}>
              <td style={{ padding: 6 }}>Composite</td>
              <td style={{ padding: 6, color: "var(--muted)" }}>{compPre.toFixed(2)}</td>
              <td style={{ padding: 6 }}>{compAnn.toFixed(2)}</td>
              <td style={{ padding: 6 }}>{(compAnn - compPre >= 0 ? "+" : "") + (compAnn - compPre).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        {task.reason && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <strong>Lý do annotator:</strong> <span style={{ color: "var(--muted)" }}>{task.reason}</span>
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 13 }}>
          <strong>Trạng thái nguồn:</strong> <span style={{ color: "var(--muted)" }}>{task.sourceAccessStatus || "—"}</span>
        </div>
        {task.annotatorNote && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <strong>Ghi chú:</strong> <span style={{ color: "var(--muted)" }}>{task.annotatorNote}</span>
          </div>
        )}
      </Card>

      {msg && <Card style={{ color: "var(--danger)" }}>{msg}</Card>}

      {!showReturn ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onApprove} disabled={busy}>Duyệt (Approve)</Button>
          <Button variant="danger" onClick={() => setShowReturn(true)} disabled={busy}>Trả lại (Return)</Button>
          <Button variant="ghost" onClick={() => navigate("/qa/queue")}>Quay lại</Button>
        </div>
      ) : (
        <Card>
          <strong>Trả lại cho annotator</strong>
          <label style={{ display: "grid", gap: 6, marginTop: 10, fontSize: 13, fontWeight: 600 }}>
            Loại lỗi
            <select value={errorType} onChange={(e) => setErrorType(e.target.value)}
              style={{ padding: 8, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}>
              {ERROR_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, marginTop: 10, fontSize: 13, fontWeight: 600 }}>
            Ý kiến (≥ 10 ký tự)
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              style={{ padding: 8, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }} />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button variant="danger" onClick={onReturn} disabled={busy}>Xác nhận trả lại</Button>
            <Button variant="ghost" onClick={() => setShowReturn(false)}>Hủy</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
