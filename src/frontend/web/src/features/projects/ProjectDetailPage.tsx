/**
 * ProjectDetailPage (ADMIN) — chi tiết project: thông tin + thống kê tiến độ +
 * quản lý thành viên (thêm/xóa annotator/QA) + claim list (lọc + phân trang 10) + gán claim.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck, UserPlus, Trash2, Loader2 } from "lucide-react";
import {
  fetchProjectDetail, fetchProjectClaims, assignClaims, assignMembers, removeMember, fetchUserOptions,
  type ProjectInfo, type ProjectClaimsPage, type UserOption,
} from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";

const PAGE = 10;
const STATUS_FILTERS = [
  { v: "", label: "Tất cả" },
  { v: "ready", label: "Chưa làm" },
  { v: "in_annotation", label: "Đang làm" },
  { v: "submitted", label: "Đã nộp" },
  { v: "returned", label: "Bị trả" },
  { v: "approved", label: "Đã duyệt" },
];

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [page, setPage] = useState<ProjectClaimsPage | null>(null);
  const [userOpts, setUserOpts] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // filters + paging
  const [status, setStatus] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [offset, setOffset] = useState(0);

  // assign claim
  const [annotatorId, setAnnotatorId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // add member
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"ANNOTATOR" | "QA">("ANNOTATOR");

  const loadInfo = useCallback(() => {
    fetchProjectDetail(projectId)
      .then((i) => {
        setInfo(i);
        const ann = i.members.find((m) => m.role === "ANNOTATOR" && m.isActive);
        if (ann) setAnnotatorId(ann.userId);
      })
      .catch((e) => showToast(e?.message ?? "Không tải được thông tin project."));
  }, [projectId, showToast]);

  const loadClaims = useCallback(() => {
    fetchProjectClaims(projectId, {
      limit: PAGE, offset,
      status: status || undefined,
      unassigned: onlyUnassigned || undefined,
    })
      .then(setPage)
      .catch((e) => showToast(e?.message ?? "Không tải được claim."))
      .finally(() => setLoading(false));
  }, [projectId, offset, status, onlyUnassigned, showToast]);

  useEffect(() => { loadInfo(); fetchUserOptions().then(setUserOpts).catch(() => {}); }, [loadInfo]);
  useEffect(() => { loadClaims(); }, [loadClaims]);

  const annotators = info?.members.filter((m) => m.role === "ANNOTATOR" && m.isActive) ?? [];

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doAssign = async (all: boolean) => {
    if (!annotatorId) { showToast("Chọn annotator."); return; }
    const ids = all ? [] : [...selected];
    if (!all && ids.length === 0) { showToast("Chọn claim hoặc dùng 'Gán tất cả'."); return; }
    setBusy(true);
    try {
      const n = await assignClaims(projectId, annotatorId, ids);
      showToast(`Đã gán ${n} claim.`);
      setSelected(new Set());
      loadClaims();
    } catch (e) { showToast(e instanceof Error ? e.message : "Không gán được."); }
    finally { setBusy(false); }
  };

  const doAddMember = async () => {
    if (!newMemberId) { showToast("Chọn user để thêm."); return; }
    setBusy(true);
    try {
      await assignMembers(projectId, [{ userId: newMemberId, role: newMemberRole }]);
      showToast("Đã thêm thành viên.");
      setNewMemberId("");
      loadInfo();
    } catch (e) { showToast(e instanceof Error ? e.message : "Không thêm được."); }
    finally { setBusy(false); }
  };

  const doRemoveMember = async (userId: string) => {
    setBusy(true);
    try { await removeMember(projectId, userId); showToast("Đã gỡ thành viên."); loadInfo(); }
    catch (e) { showToast(e instanceof Error ? e.message : "Không gỡ được."); }
    finally { setBusy(false); }
  };

  if (loading && !info) return <div className="app-card p-6 text-gray-500">Đang tải…</div>;

  const stats = page?.stats;
  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE)) : 1;
  const curPage = Math.floor(offset / PAGE) + 1;

  return (
    <div className="space-y-5">
      {/* Header thông tin project */}
      <div className="app-card p-5">
        <button onClick={() => navigate("/admin/projects")} className="text-sm text-gray-500 inline-flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Danh sách project
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="page-title">{info?.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-mono">{info?.code}</span> · {info?.status} ·
              {info?.deadline ? ` deadline ${info.deadline}` : " không deadline"} ·
              LLM {info?.llmConfigured ? info?.llmModel : "chưa cấu hình"}
            </p>
          </div>
        </div>
        {/* Thống kê tiến độ */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
            {[
              { l: "Tổng", v: stats.total }, { l: "Chưa gán", v: stats.unassigned },
              { l: "Chưa làm", v: stats.ready }, { l: "Đã nộp", v: stats.submitted },
              { l: "Bị trả", v: stats.returned }, { l: "Đã duyệt", v: stats.approved },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                <div className="text-lg font-extrabold text-slate-900">{s.v}</div>
                <div className="text-[10px] text-slate-400 uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quản lý thành viên */}
      <div className="app-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Thành viên project</h3>
        <div className="flex flex-wrap gap-2">
          {(info?.members.filter((m) => m.isActive) ?? []).length === 0 && (
            <span className="text-xs text-amber-700">Chưa có thành viên — thêm annotator/QA bên dưới.</span>
          )}
          {info?.members.filter((m) => m.isActive).map((m) => (
            <span key={m.userId} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              m.role === "QA" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-vsf-50 text-vsf-700 border-vsf-200"}`}>
              {m.email} · {m.role}
              <button onClick={() => doRemoveMember(m.userId)} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-600">Thêm thành viên:</span>
          <select value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
            <option value="">— Chọn user —</option>
            {userOpts.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
          <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as "ANNOTATOR" | "QA")} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
            <option value="ANNOTATOR">ANNOTATOR</option>
            <option value="QA">QA</option>
          </select>
          <button onClick={doAddMember} disabled={busy} className="py-1.5 px-3 bg-vsf-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50">
            <UserPlus size={13} /> Thêm
          </button>
        </div>
      </div>

      {/* Gán claim */}
      <div className="app-card p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Gán claim cho:</span>
        <select value={annotatorId} onChange={(e) => setAnnotatorId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          {annotators.length === 0 && <option value="">— Chưa có annotator —</option>}
          {annotators.map((m) => <option key={m.userId} value={m.userId}>{m.email}</option>)}
        </select>
        <button onClick={() => doAssign(false)} disabled={busy || !annotatorId} className="btn-primary !py-2 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy && <Loader2 size={13} className="animate-spin" />}<UserCheck size={13} /> Gán {selected.size} đã chọn
        </button>
        <button onClick={() => doAssign(true)} disabled={busy || !annotatorId} className="text-xs font-bold text-vsf-600 disabled:opacity-50">Gán TẤT CẢ (theo filter)</button>
      </div>

      {/* Filter claim */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.v} onClick={() => { setStatus(f.v); setOffset(0); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${status === f.v ? "bg-vsf-600 text-white border-vsf-500" : "bg-white text-slate-600 border-slate-200"}`}>
            {f.label}
          </button>
        ))}
        <label className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1 ml-2">
          <input type="checkbox" checked={onlyUnassigned} onChange={(e) => { setOnlyUnassigned(e.target.checked); setOffset(0); }} /> Chỉ chưa gán
        </label>
      </div>

      {/* Claim table */}
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
              {page?.items.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">Không có claim khớp filter.</td></tr>
              )}
              {page?.items.map((c) => (
                <tr key={c.claimId}>
                  <td className="py-3 px-4"><input type="checkbox" checked={selected.has(c.claimId)} onChange={() => toggle(c.claimId)} /></td>
                  <td className="py-3 px-4 font-mono text-sm">{c.claimOrder}</td>
                  <td className="py-3 px-4 max-w-md truncate" title={c.claimText}>{c.claimText}</td>
                  <td className="py-3 px-4"><span className="status-pill bg-gray-50 text-gray-700 border-gray-200">{c.status}</span></td>
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
        {/* Phân trang */}
        {page && page.total > PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Trang {curPage}/{totalPages} · {page.total} claim</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}
                className="px-3 py-1 border border-slate-200 rounded-lg font-bold disabled:opacity-40">‹ Trước</button>
              <button disabled={curPage >= totalPages} onClick={() => setOffset(offset + PAGE)}
                className="px-3 py-1 border border-slate-200 rounded-lg font-bold disabled:opacity-40">Sau ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
