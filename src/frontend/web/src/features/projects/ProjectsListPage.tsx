/** ProjectsListPage (ADMIN) — danh sách project. Draft → tiếp tục import; Active → chi tiết.
 *  Mỗi card có menu (góc phải) để Xóa (lưu trữ... làm sau). */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, FileText, Files, MoreVertical, Trash2, Download } from "lucide-react";
import { fetchProjectsPaged, deleteProject, downloadExportCsv } from "@/api/adapters";
import { Pagination } from "@/shared/Pagination";
import { EmptyState } from "@/shared/EmptyState";
import { CardGridSkeleton } from "@/shared/Skeleton";
import { ConfirmDialog } from "@/shared/ConfirmDialog";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { useToast } from "@/app/providers/ToastProvider";
import type { Project } from "@/types";

const PAGE = 10;

/** 1 card project + menu góc phải. */
function ProjectCard({ p, onOpen, onDelete, onExport }: {
  p: Project;
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDraft = p.status === "Draft";

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div className="app-card p-5 relative hover:border-vsf-300 transition-colors">
      {/* Menu góc phải */}
      <div className="absolute top-3 right-3" ref={ref}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Tùy chọn project"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg p-1 z-20 animate-scale-in text-[13px]"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)" }}
          >
            {/* Xuất CSV — DRAFTING chưa có claim nên disabled (mờ, không bấm/hover). */}
            <button
              onClick={() => { if (isDraft) return; setMenuOpen(false); onExport(); }}
              disabled={isDraft}
              title={isDraft ? "Project nháp chưa có dữ liệu để xuất" : undefined}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left ${
                isDraft
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              <Download size={14} /> Xuất CSV
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-50 text-red-600 rounded-md text-left cursor-pointer"
            >
              <Trash2 size={14} /> Xóa
            </button>
          </div>
        )}
      </div>

      {/* Nội dung — bấm để mở (draft → import tiếp; active → chi tiết) */}
      <button onClick={onOpen} className="text-left w-full pr-8 cursor-pointer">
        <div className="flex items-center gap-2 text-vsf-600 mb-2"><FileText size={16} /></div>
        <strong className="text-base font-bold text-gray-900 block">{p.name}</strong>
        {isDraft ? (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
            DRAFTING
          </span>
        ) : (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
            {p.status === "Active" ? "ACTIVE" : p.status}
          </span>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {isDraft ? "Bấm để tiếp tục import →" : "Bấm để xem chi tiết & gán nhân sự →"}
        </p>
      </button>
    </div>
  );
}

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Project | null>(null); // project chờ xác nhận xóa
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    fetchProjectsPaged(PAGE, offset)
      .then((p) => { setProjects(p.items); setTotal(p.total); })
      .catch((e) => setError(e?.message ?? "Không tải được project."))
      .finally(() => setLoading(false));
  }, [offset]);

  useEffect(() => { reload(); }, [reload]);

  const hasProjects = projects.length > 0;

  usePageHeader(
    {
      title: "Dự án & Import PDF Bundle",
      description: "Quản lý project, import bundle, gán nhân sự.",
      action: hasProjects ? (
        <button onClick={() => navigate("/admin/import")} className="btn-primary inline-flex items-center gap-2">
          <FolderPlus size={16} /> Tạo Project & Import
        </button>
      ) : undefined,
    },
    [hasProjects],
  );

  const openProject = (p: Project) => {
    // Draft → tiếp tục import; Active → chi tiết.
    if (p.status === "Draft") navigate(`/admin/import?projectId=${p.id}`);
    else navigate(`/admin/projects/${p.id}`);
  };

  const handleExport = async (p: Project) => {
    try {
      showToast(`Đang tạo file CSV cho "${p.name}"…`);
      await downloadExportCsv(p.id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không xuất được CSV.");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProject(toDelete.id);
      showToast(`Đã xóa project "${toDelete.name}".`);
      setToDelete(null);
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không xóa được project.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="app-card p-5 text-red-600">{error}</div>}

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : !error && projects.length === 0 ? (
        <EmptyState
          icon={<Files size={26} />}
          title="Chưa có project nào"
          description="Tạo project đầu tiên và import PDF bundle để bắt đầu quy trình đánh giá."
          action={
            <button onClick={() => navigate("/admin/import")} className="btn-primary inline-flex items-center gap-2">
              <FolderPlus size={16} /> Tạo Project & Import
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} onOpen={() => openProject(p)} onDelete={() => setToDelete(p)} onExport={() => handleExport(p)} />
            ))}
          </div>

          {total > PAGE && (
            <div className="app-card p-0">
              <Pagination offset={offset} limit={PAGE} total={total} onChange={setOffset} />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Xóa project?"
        message={toDelete ? `Project "${toDelete.name}" sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.` : ""}
        confirmLabel="Xóa"
        variant="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
