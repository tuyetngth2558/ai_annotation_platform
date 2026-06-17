/** ProjectDetailPage (ADMIN) — chi tiết project: claim list + gán annotator (B4). */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck, Loader2 } from "lucide-react";
import {
  fetchProjectClaims, fetchProjectMembers, assignClaims,
  type ProjectClaim, type ProjectMember,
} from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [claims, setClaims] = useState<ProjectClaim[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [annotatorId, setAnnotatorId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([fetchProjectClaims(projectId), fetchProjectMembers(projectId)])
      .then(([cs, ms]) => {
        setClaims(cs);
        const annotators = ms.filter((m) => m.role === "ANNOTATOR");
        setMembers(annotators);
        if (annotators[0]) setAnnotatorId(annotators[0].userId);
      })
      .catch((e) => setError(e?.message ?? "Không tải được chi tiết project."))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const assign = async (all: boolean) => {
    if (!annotatorId) { showToast("Chọn annotator để gán."); return; }
    const ids = all ? [] : [...selected];
    if (!all && ids.length === 0) { showToast("Chọn ít nhất 1 claim hoặc dùng 'Gán tất cả'."); return; }
    setBusy(true);
    try {
      const n = await assignClaims(projectId, annotatorId, ids);
      showToast(`Đã gán ${n} claim.`);
      setSelected(new Set());
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không gán được claim.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="app-card p-6 text-gray-500">Đang tải…</div>;
  if (error) return <div className="app-card p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="app-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => navigate("/admin/projects")} className="text-sm text-gray-500 inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Danh sách project
          </button>
          <h2 className="page-title">Chi tiết project — gán nhân sự</h2>
          <p className="text-sm text-gray-500 mt-1">{claims.length} claim. Chọn claim + annotator để gán.</p>
        </div>
      </div>

      <div className="app-card p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Gán cho:</span>
        <select
          value={annotatorId}
          onChange={(e) => setAnnotatorId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {members.length === 0 && <option value="">— Chưa có annotator trong project —</option>}
          {members.map((m) => <option key={m.userId} value={m.userId}>{m.email}</option>)}
        </select>
        <button onClick={() => assign(false)} disabled={busy || !annotatorId} className="btn-primary !py-2 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy && <Loader2 size={13} className="animate-spin" />}<UserCheck size={13} /> Gán {selected.size} claim đã chọn
        </button>
        <button onClick={() => assign(true)} disabled={busy || !annotatorId} className="text-xs font-bold text-vsf-600 disabled:opacity-50">
          Gán TẤT CẢ
        </button>
        {members.length === 0 && (
          <span className="text-xs text-amber-700">
            Chưa có ai role ANNOTATOR trong project — vào "Thành viên" tạo/gán user trước.
          </span>
        )}
      </div>

      <div className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Claim</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Annotator</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {claims.map((c) => (
                <tr key={c.claimId}>
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.has(c.claimId)} onChange={() => toggle(c.claimId)} />
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">{c.claimOrder}</td>
                  <td className="py-3 px-4 max-w-md truncate" title={c.claimText}>{c.claimText}</td>
                  <td className="py-3 px-4">
                    <span className="status-pill bg-gray-50 text-gray-700 border-gray-200">{c.status}</span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {c.assignedAnnotatorEmail
                      ? <span className="text-emerald-700 font-semibold">{c.assignedAnnotatorEmail}</span>
                      : <span className="text-gray-400">— chưa gán —</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
