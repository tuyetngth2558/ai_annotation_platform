/**
 * AnnotationWorkspacePage — chấm 1 claim theo 6 chiều.
 * Nối: GET /tasks/{id} (pre_score + sources + answer), PUT autosave, POST submit.
 * Quy tắc: |delta| >= 0.20 bắt buộc nhập lý do (BR-7.3); nguồn inaccessible bắt buộc note.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fetchTaskDetail, autosaveTask, submitTask, ZERO_SCORES } from "@/shared/lib/adapters";
import type { ClaimTask, Dimension } from "@/shared/types/domain";

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "SF", label: "SF — Tính xác thực" },
  { key: "SC", label: "SC — Hỗ trợ từ nguồn" },
  { key: "NH", label: "NH — Không ảo giác" },
  { key: "SQ", label: "SQ — Chất lượng nguồn (rule)" },
  { key: "REL", label: "REL — Liên quan" },
  { key: "COMP", label: "COMP — Đầy đủ" },
];

const SOURCE_STATUS_OPTS = [
  "unknown",
  "source_text_parsed",
  "Truy cập được - hỗ trợ rõ",
  "Truy cập được - hỗ trợ một phần",
  "Truy cập được - không hỗ trợ",
  "inaccessible / Không truy cập được",
  "Không liên quan",
];

export function AnnotationWorkspacePage() {
  const { claimId = "" } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState<ClaimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scores, setScores] = useState<Record<Dimension, number>>({ ...ZERO_SCORES });
  const [sourceStatus, setSourceStatus] = useState("unknown");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTaskDetail(claimId)
      .then((t) => {
        setTask(t);
        setScores(t.ann);
        setSourceStatus(t.sourceAccessStatus || "unknown");
        setNote(t.annotatorNote || "");
      })
      .catch((e) => setError(e?.message ?? "Không tải được chi tiết task."))
      .finally(() => setLoading(false));
  }, [claimId]);

  const delta = (d: Dimension) => (scores[d] ?? 0) - (task?.pre[d] ?? 0);
  const highDelta = (d: Dimension) => Math.abs(delta(d)) >= 0.2; // khớp BE BR-7.3
  const anyHighDelta = DIMENSIONS.some((d) => highDelta(d.key));
  const composite = DIMENSIONS.reduce((s, d) => s + (scores[d.key] || 0), 0) / 6;

  const setScore = (d: Dimension, v: string) => {
    let n = parseFloat(v);
    if (Number.isNaN(n)) n = 0;
    n = Math.max(0, Math.min(1, n));
    setScores((prev) => ({ ...prev, [d]: n }));
  };

  // Autosave debounce 1.5s sau thay đổi (BR-6.1 ~ 30s; ở đây nhẹ hơn cho UX).
  const autosaveTimer = useRef<number | null>(null);
  const queueAutosave = useCallback(() => {
    if (!task) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await autosaveTask(task.id, { scores, pre: task.pre, sourceStatusUi: sourceStatus, annotatorNote: note, reason });
        setSavedAt(new Date().toLocaleTimeString("vi-VN"));
      } catch {
        /* im lặng — autosave không chặn UX */
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [task, scores, sourceStatus, note, reason]);

  useEffect(() => {
    queueAutosave();
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [queueAutosave]);

  async function onSubmit() {
    if (!task) return;
    setMsg(null);
    if (sourceStatus === "unknown") {
      setMsg("Vui lòng chọn trạng thái nguồn.");
      return;
    }
    if (sourceStatus.includes("Không truy cập được") && !note.trim()) {
      setMsg("Nguồn không truy cập được — bắt buộc nhập ghi chú (VR-ANN-004).");
      return;
    }
    if (anyHighDelta && !reason.trim()) {
      setMsg("Có chiều lệch ≥ 0.20 so với pre-score — bắt buộc nhập lý do (BR-7.3).");
      return;
    }
    setSubmitting(true);
    try {
      await submitTask(task.id, { scores, pre: task.pre, sourceStatusUi: sourceStatus, annotatorNote: note, reason });
      navigate("/annotator/tasks");
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? "Không gửi được bài chấm.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Card>Đang tải…</Card>;
  if (error) return <Card style={{ color: "var(--danger)" }}>{error}</Card>;
  if (!task) return <Card>Không có dữ liệu.</Card>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
      {/* Trái: context + scoring */}
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Màn gán nhãn</h1>
          <p style={{ color: "var(--muted)", margin: "4px 0" }}>
            {task.articleCode} · {task.sectionName || "—"} · {task.status}
          </p>
        </div>

        <Card>
          <strong>Claim</strong>
          <p style={{ marginTop: 6 }}>{task.claimText}</p>
          {task.answerContext && (
            <>
              <strong>Ngữ cảnh câu trả lời</strong>
              <p style={{ marginTop: 6, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{task.answerContext}</p>
            </>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Chấm điểm 6 chiều (0.00 – 1.00)</strong>
            <span style={{ fontWeight: 700 }}>Composite: {composite.toFixed(2)}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                <th style={{ padding: 6 }}>Chiều</th>
                <th style={{ padding: 6 }}>Pre</th>
                <th style={{ padding: 6 }}>Điểm bạn chấm</th>
                <th style={{ padding: 6 }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((d) => (
                <tr key={d.key} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 6 }}>{d.label}</td>
                  <td style={{ padding: 6, color: "var(--muted)" }}>{(task.pre[d.key] ?? 0).toFixed(2)}</td>
                  <td style={{ padding: 6 }}>
                    <input
                      type="number" min={0} max={1} step={0.01}
                      value={scores[d.key]}
                      onChange={(e) => setScore(d.key, e.target.value)}
                      style={{ width: 90, padding: 6, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}
                    />
                  </td>
                  <td style={{ padding: 6, fontWeight: 700, color: highDelta(d.key) ? "var(--danger)" : "var(--muted)" }}>
                    {delta(d.key) >= 0 ? "+" : ""}{delta(d.key).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {anyHighDelta && (
            <label style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600 }}>
              Lý do thay đổi (bắt buộc vì có chiều lệch ≥ 0.20)
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                style={{ padding: 8, borderRadius: "var(--radius)", border: "1px solid var(--danger)", background: "var(--surface-2)", color: "var(--ink)" }} />
            </label>
          )}
        </Card>
      </div>

      {/* Phải: nguồn + source status + submit */}
      <div style={{ display: "grid", gap: 16, position: "sticky", top: 16 }}>
        <Card>
          <strong>Nguồn ({task.sources.length})</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
            {task.sources.length === 0 && <li style={{ color: "var(--muted)" }}>Chưa map nguồn.</li>}
            {task.sources.map((s) => (
              <li key={s.sourceId} style={{ marginBottom: 4 }}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>{s.url}</a> : "(không có URL)"}
              </li>
            ))}
          </ul>

          <label style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600 }}>
            Trạng thái nguồn
            <select value={sourceStatus} onChange={(e) => setSourceStatus(e.target.value)}
              style={{ padding: 8, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}>
              {SOURCE_STATUS_OPTS.map((o) => <option key={o} value={o}>{o === "unknown" ? "— Chọn —" : o}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600 }}>
            Ghi chú nguồn {sourceStatus.includes("Không truy cập được") && <span style={{ color: "var(--danger)" }}>*bắt buộc</span>}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              style={{ padding: 8, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }} />
          </label>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            {saving ? "Đang lưu nháp…" : savedAt ? `Đã lưu nháp lúc ${savedAt}` : "Tự lưu nháp khi bạn chỉnh."}
          </div>
          {msg && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>{msg}</div>}
          <Button onClick={onSubmit} disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Đang gửi…" : "Gửi bài chấm (Submit)"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/annotator/tasks")} style={{ width: "100%", marginTop: 8 }}>
            Quay lại danh sách
          </Button>
        </Card>
      </div>
    </div>
  );
}
