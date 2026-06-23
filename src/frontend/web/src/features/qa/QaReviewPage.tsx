/** QaReviewPage (QA) — diff + approve/return. Route /qa/review/:claimId. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import QaReviewView from "@/components/QaReviewView";
import { fetchQaReviewDetail, approveClaim, returnClaim } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { useToast } from "@/app/providers/ToastProvider";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { WorkspaceSkeleton } from "@/shared/Skeleton";
import type { ClaimTask } from "@/types";

export function QaReviewPage() {
  const { claimId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [task, setTask] = useState<ClaimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageHeader({
    title: "Kiểm duyệt claim",
    description: "So sánh điểm annotator vs LLM, duyệt hoặc trả lại.",
    leading: (
      <button
        onClick={() => navigate("/qa/queue")}
        title="Quay lại hàng đợi"
        aria-label="Quay lại"
        className="grid place-items-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex-shrink-0"
      >
        <ArrowLeft size={18} />
      </button>
    ),
  });

  useEffect(() => {
    setLoading(true);
    fetchQaReviewDetail(claimId)
      .then((t) => setTask(enrichClaimTask(t)))
      .catch((e) => setError(e?.message ?? "Không tải được chi tiết review."))
      .finally(() => setLoading(false));
  }, [claimId]);

  const onApprove = async (id: string) => {
    try {
      await approveClaim(id);
      showToast(`Đã duyệt ${id}.`);
      navigate("/qa/queue");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không duyệt được.");
      throw e;
    }
  };

  const onReturn = async (id: string, errorType: string, comment: string) => {
    try {
      await returnClaim(id, errorType, comment);
      showToast(`Đã trả lại ${id}.`);
      navigate("/qa/queue");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không trả lại được.");
      throw e;
    }
  };

  if (loading) return <WorkspaceSkeleton />;
  if (error) return <div className="app-card p-6 text-red-600">{error}</div>;
  if (!task) return <div className="app-card p-6 text-gray-500">Không có dữ liệu.</div>;

  return (
    <QaReviewView
      task={task}
      onBackToQueue={() => navigate("/qa/queue")}
      onApprove={onApprove}
      onReturn={onReturn}
      showToast={showToast}
    />
  );
}
