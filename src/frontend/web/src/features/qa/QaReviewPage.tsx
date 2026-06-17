/** QaReviewPage (QA) — diff + approve/return. Route /qa/review/:claimId. */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QaReviewView from "@/components/QaReviewView";
import { fetchQaReviewDetail, approveClaim, returnClaim } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { useToast } from "@/app/providers/ToastProvider";
import type { ClaimTask } from "@/types";

export function QaReviewPage() {
  const { claimId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [task, setTask] = useState<ClaimTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="app-card p-6 text-gray-500">Đang tải…</div>;
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
