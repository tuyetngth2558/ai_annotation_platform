/** AnnotationPage (ANNOTATOR) — chấm 1 claim. Route /annotator/tasks/:claimId. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AnnotationWorkspaceView from "@/components/AnnotationWorkspaceView";
import { fetchTaskDetail, submitTaskFromClaim } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { useToast } from "@/app/providers/ToastProvider";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { WorkspaceSkeleton } from "@/shared/Skeleton";
import type { ClaimTask } from "@/types";

export function AnnotationPage() {
  const { claimId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [task, setTask] = useState<ClaimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageHeader({
    title: "Chấm điểm claim",
    description: "Đánh giá 6 chiều dựa trên nguồn tham chiếu.",
    leading: (
      <button
        onClick={() => navigate("/annotator/tasks")}
        title="Quay lại danh sách"
        aria-label="Quay lại"
        className="grid place-items-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex-shrink-0"
      >
        <ArrowLeft size={18} />
      </button>
    ),
  });

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

  if (loading) return <WorkspaceSkeleton />;
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
