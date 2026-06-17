/** ProjectsListPage (ADMIN) — danh sách project + nút tạo/import. Nối GET /projects. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, FileText } from "lucide-react";
import { fetchProjectsPaged } from "@/api/adapters";
import { Pagination } from "@/shared/Pagination";
import type { Project } from "@/types";

const PAGE = 10;

export function ProjectsListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectsPaged(PAGE, offset)
      .then((p) => { setProjects(p.items); setTotal(p.total); })
      .catch((e) => setError(e?.message ?? "Không tải được project."));
  }, [offset]);

  return (
    <div className="space-y-5">
      <div className="app-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Dự án & Import PDF Bundle</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý project, import bundle, gán nhân sự.</p>
        </div>
        <button
          onClick={() => navigate("/admin/projects/import")}
          className="btn-primary inline-flex items-center gap-2"
        >
          <FolderPlus size={16} /> Tạo Project & Import
        </button>
      </div>

      {error && <div className="app-card p-5 text-red-600">{error}</div>}
      {!error && projects.length === 0 && (
        <div className="app-card p-5 text-gray-500">Chưa có project nào.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/admin/projects/${p.id}`)}
            className="app-card p-5 text-left hover:border-vsf-300 transition-colors"
          >
            <div className="flex items-center gap-2 text-vsf-600 mb-2"><FileText size={16} /></div>
            <strong className="text-base font-bold text-gray-900 block">{p.name}</strong>
            <span className="text-xs text-vsf-600 font-semibold uppercase">{p.status}</span>
            <p className="text-xs text-gray-400 mt-2">Bấm để xem chi tiết & gán nhân sự →</p>
          </button>
        ))}
      </div>

      <div className="app-card p-0">
        <Pagination offset={offset} limit={PAGE} total={total} onChange={setOffset} />
      </div>
    </div>
  );
}
