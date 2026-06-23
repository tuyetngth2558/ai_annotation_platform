/**
 * ProjectDetailPage (ADMIN) — chi tiết project: thông tin + thống kê tiến độ +
 * quản lý thành viên (thêm/xóa annotator/QA) + claim list (lọc + phân trang 10) + gán claim.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck, Loader2 } from "lucide-react";
import {
  fetchProjectDetail, fetchProjectClaims, assignClaims, assignMembers, removeMember, fetchUserOptions,
  type ProjectInfo, type ProjectClaimsPage, type UserOption,
} from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { setIfChanged } from "@/shared/setIfChanged";
import { TableSkeleton } from "@/shared/Skeleton";
import { MemberPicker } from "./MemberPicker";

const PAGE = 10;
const ROW_H = 49; // chiều cao 1 hàng claim (px)
const HEAD_H = 41; // chiều cao header bảng (px) — cộng vào maxHeight
const VISIBLE_ROWS = 9; // bảng fix cứng = 9 hàng; vượt thì cuộn dọc
const POLL_MS = 30000; // auto-refresh ngầm 30s
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

  usePageHeader(
    {
      title: info?.name ?? "Chi tiết dự án",
      description: "Thông tin, thành viên & gán claim cho annotator.",
      leading: (
        <button
          onClick={() => navigate("/admin/projects")}
          title="Về danh sách dự án"
          className="flex-shrink-0 grid place-items-center w-9 h-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
      ),
    },
    [info?.name],
  );

  // filters + paging
  const [status, setStatus] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [offset, setOffset] = useState(0);

  // assign claim
  const [annotatorId, setAnnotatorId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());


  // Info/members chỉ tải 1 lần + sau khi tự thao tác (không polling — ít đổi).
  const loadInfo = useCallback(() => {
    fetchProjectDetail(projectId)
      .then((i) => {
        setIfChanged(setInfo, i);
        setAnnotatorId((prev) => {
          if (prev) return prev; // giữ lựa chọn hiện tại của admin
          const ann = i.members.find((m) => m.role === "ANNOTATOR" && m.isActive);
          return ann ? ann.userId : prev;
        });
      })
      .catch((e) => showToast(e?.message ?? "Không tải được thông tin project."));
  }, [projectId, showToast]);

  // silent = refetch ngầm (không bật skeleton, chỉ setState khi data đổi).
  const loadClaims = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetchProjectClaims(projectId, {
      limit: PAGE, offset,
      status: status || undefined,
      unassigned: onlyUnassigned || undefined,
    })
      .then((p) => setIfChanged(setPage, p))
      .catch((e) => { if (!silent) showToast(e?.message ?? "Không tải được claim."); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [projectId, offset, status, onlyUnassigned, showToast]);

  useEffect(() => { loadInfo(); fetchUserOptions().then(setUserOpts).catch(() => {}); }, [loadInfo]);
  useEffect(() => { loadClaims(); }, [loadClaims]);

  // busy qua ref để tick đọc giá trị mới nhất (tránh stale closure + đè state khi đang thao tác).
  const busyRef = useRef(false);
  busyRef.current = busy;

  // Auto-refresh ngầm 30s — CHỈ làm mới bảng claim + thống kê (info/members ít đổi).
  // Bỏ qua khi tab ẩn hoặc đang thao tác.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !busyRef.current) loadClaims(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadClaims]);

  const annotators = info?.members.filter((m) => m.role === "ANNOTATOR" && m.isActive) ?? [];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  // Tích/bỏ tích tất cả claim trên trang hiện tại.
  const pageIds = page?.items.map((c) => c.claimId) ?? [];
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someChecked = pageIds.some((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allChecked) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });

  const doAssign = async () => {
    if (!annotatorId) { showToast("Chọn annotator."); return; }
    const ids = [...selected];
    if (ids.length === 0) { showToast("Tích chọn claim cần gán."); return; }
    setBusy(true);
    try {
      const n = await assignClaims(projectId, annotatorId, ids);
      showToast(`Đã gán ${n} claim.`);
      setSelected(new Set());
      loadClaims();
    } catch (e) { showToast(e instanceof Error ? e.message : "Không gán được."); }
    finally { setBusy(false); }
  };

  const doAddMember = async (userId: string, role: "ANNOTATOR" | "QA") => {
    setBusy(true);
    try {
      await assignMembers(projectId, [{ userId, role }]);
      showToast("Đã thêm thành viên.");
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

  // User theo role + tập id thành viên active (cho 2 dropdown Annotator/QA).
  const annotatorUsers = userOpts.filter((u) => u.role === "ANNOTATOR");
  const qaUsers = userOpts.filter((u) => u.role === "QA");
  const activeAnnotatorIds = new Set(
    (info?.members ?? []).filter((m) => m.isActive && m.role === "ANNOTATOR").map((m) => m.userId),
  );
  const activeQaIds = new Set(
    (info?.members ?? []).filter((m) => m.isActive && m.role === "QA").map((m) => m.userId),
  );

  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE)) : 1;
  const curPage = Math.floor(offset / PAGE) + 1;

  return (
    <div className="space-y-4 -mt-2">
      {/* Thành viên project + Gán claim — cùng một hàng. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quản lý thành viên — 2 dropdown theo role (Annotator / QA). */}
        <div className="app-card p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-800">Thành viên project</h3>
          <div className="grid grid-cols-2 gap-2">
            <MemberPicker
              label="Annotator"
              users={annotatorUsers}
              activeIds={activeAnnotatorIds}
              disabled={busy}
              onAdd={(id) => doAddMember(id, "ANNOTATOR")}
              onRemove={doRemoveMember}
            />
            <MemberPicker
              label="QA"
              users={qaUsers}
              activeIds={activeQaIds}
              disabled={busy}
              onAdd={(id) => doAddMember(id, "QA")}
              onRemove={doRemoveMember}
            />
          </div>
        </div>

        {/* Gán claim */}
        <div className="app-card p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-800">Gán claim cho annotator</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={annotatorId} onChange={(e) => setAnnotatorId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {annotators.length === 0 && <option value="">— Chưa có annotator —</option>}
              {annotators.map((m) => <option key={m.userId} value={m.userId}>{m.email}</option>)}
            </select>
            <button onClick={doAssign} disabled={busy || !annotatorId} className="btn-primary !py-2 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy && <Loader2 size={13} className="animate-spin" />}<UserCheck size={13} /> Gán {selected.size} đã chọn
            </button>
          </div>
        </div>
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

      {/* Claim table — skeleton khi tải lần đầu (khung trang đã hiện sẵn). */}
      {loading && !page ? (
        <div className="app-card p-4"><TableSkeleton rows={PAGE} cols={5} /></div>
      ) : (
      <div className="app-card overflow-hidden">
        {/* Bảng fix cứng chiều cao = 9 hàng; vượt thì cuộn dọc, header dính. */}
        <div className="overflow-auto" style={{ height: `${VISIBLE_ROWS * ROW_H + HEAD_H}px` }}>
          <table className="data-table">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả claim trong trang"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                    onChange={toggleAll}
                    disabled={pageIds.length === 0}
                  />
                </th>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Claim</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Annotator</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {page?.items.length === 0 && (
                <tr style={{ height: `${VISIBLE_ROWS * ROW_H}px` }}>
                  <td colSpan={5} className="text-center text-gray-400 align-middle">Không có claim khớp filter.</td>
                </tr>
              )}
              {page?.items.map((c) => (
                <tr
                  key={c.claimId}
                  onClick={() => toggle(c.claimId)}
                  className="cursor-pointer transition-colors hover:bg-vsf-50/60"
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.claimId)} onChange={() => toggle(c.claimId)} /></td>
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
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-xs">
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
      )}
    </div>
  );
}
