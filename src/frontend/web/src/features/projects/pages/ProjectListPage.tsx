/** ProjectListPage — danh sách project (ADMIN). Nối GET /projects. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fetchProjects } from "@/shared/lib/adapters";
import type { Project } from "@/shared/types/domain";

const th: React.CSSProperties = { padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "var(--muted)" };
const td: React.CSSProperties = { padding: "10px 14px" };

export function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch((e) => setError(e?.message ?? "Không tải được danh sách project."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ marginTop: 0 }}>Dự án</h1>
        <Link to="/admin/projects/new"><Button>+ Tạo project</Button></Link>
      </div>

      {loading && <Card>Đang tải…</Card>}
      {error && <Card style={{ color: "var(--danger)" }}>{error}</Card>}
      {!loading && !error && projects.length === 0 && <Card>Chưa có project nào.</Card>}

      {projects.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
                <th style={th}>Mã</th><th style={th}>Tên</th><th style={th}>Trạng thái</th>
                <th style={th}>Thành viên</th><th style={th}>Hạn chót</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ ...td, fontFamily: "monospace" }}>{p.code}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                  <td style={td}>{p.status}</td>
                  <td style={td}>{p.memberCount}</td>
                  <td style={td}>{p.deadline || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
