/** AnnotationPage (ANNOTATOR) — chấm 1 claim. Route /annotator/tasks/:claimId. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AnnotationWorkspaceView from "@/components/AnnotationWorkspaceView";
import { fetchTaskDetail, submitTaskFromClaim } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { useToast } from "@/app/providers/ToastProvider";
import type { ClaimTask } from "@/types";

export function AnnotationPage() {
  const { claimId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [task, setTask] = useState<ClaimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTaskDetail(claimId)
      .then((t) => setTask(enrichClaimTask(t)))
      .catch((e) => setError(e?.message ?? "Không tải được chi tiết task."))
      .finally(() => setLoading(false));
  }, [claimId]);

  const onSubmit = async (updated: ClaimTask) => {
    try {
      await submitTaskFromClaim(updated);
      showToast(`Đã gửi task ${updated.id}.`);
      navigate("/annotator/tasks");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không gửi được bài chấm.");
      throw e;
    }
  };

  if (loading) return <div className="app-card p-6 text-gray-500">Đang tải…</div>;
  if (error) return <div className="app-card p-6 text-red-600">{error}</div>;
  if (!task) return <div className="app-card p-6 text-gray-500">Không có dữ liệu.</div>;

  return (
    <AnnotationWorkspaceView
      task={task}
      tasksList={[task]}
      onSelectTask={() => {}}
      onSubmit={onSubmit}
      showToast={showToast}
    />
  );
}
