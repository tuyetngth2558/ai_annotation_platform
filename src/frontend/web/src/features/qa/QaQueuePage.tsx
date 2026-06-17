/** QaQueuePage (QA) — hàng đợi claim đã submit. Nối GET /qa-reviews/queue. */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QaQueueView from "@/components/QaQueueView";
import { fetchQaQueue } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { setIfChanged } from "@/shared/setIfChanged";
import type { ClaimTask } from "@/types";

export function QaQueuePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  usePageHeader({
    title: "Hàng đợi QA",
    description: "Claim chờ duyệt. Task đã duyệt/trả về chỉ để đối chiếu lịch sử.",
  });

  const load = useCallback(() => {
    fetchQaQueue()
      .then((t) => setIfChanged(setTasks, t.map(enrichClaimTask)))
      .catch((e) => setError(e?.message ?? "Không tải được hàng đợi QA."));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh ngầm 30s — thấy claim annotator vừa nộp; chỉ re-render khi data đổi.
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <div className="app-card p-6 text-red-600">{error}</div>;
  return <QaQueueView tasks={tasks} onOpenTaskQa={(id) => navigate(`/qa/review/${id}`)} />;
}
