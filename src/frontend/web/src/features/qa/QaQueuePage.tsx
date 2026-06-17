/** QaQueuePage (QA) — hàng đợi claim đã submit. Nối GET /qa-reviews/queue. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QaQueueView from "@/components/QaQueueView";
import { fetchQaQueue } from "@/api/adapters";
import { enrichClaimTask } from "@/sqRules";
import type { ClaimTask } from "@/types";

export function QaQueuePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQaQueue()
      .then((t) => setTasks(t.map(enrichClaimTask)))
      .catch((e) => setError(e?.message ?? "Không tải được hàng đợi QA."));
  }, []);

  if (error) return <div className="app-card p-6 text-red-600">{error}</div>;
  return <QaQueueView tasks={tasks} onOpenTaskQa={(id) => navigate(`/qa/review/${id}`)} />;
}
