/** ExportPage — tải CSV claim-level (ADMIN). Nối GET /exports/{project_id}/download (blob). */
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fetchProjectOptions, downloadExportCsv } from "@/shared/lib/adapters";

export function ExportPage() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectOptions()
      .then((ps) => {
        setProjects(ps);
        if (ps[0]) setProjectId(ps[0].id);
      })
      .catch((e) => setMsg(e?.message ?? "Không tải được danh sách project."));
  }, []);

  async function onExport() {
    if (!projectId) {
      setMsg("Chọn project để export.");
      return;
    }
    setMsg(null);
    setDownloading(true);
    try {
      await downloadExportCsv(projectId);
      setMsg("Đã tải file CSV.");
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? "Không tải được CSV.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>Xuất dữ liệu</h1>
      <p style={{ color: "var(--muted)" }}>CSV claim-level, chỉ claim đã Approved (BR-9.1), UTF-8 BOM.</p>

      <Card style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13 }}>
          Project
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            style={{ padding: 10, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}>
            {projects.length === 0 && <option value="">— Chưa có project —</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        {msg && <div style={{ fontSize: 13, color: msg.startsWith("Đã tải") ? "#16a34a" : "var(--danger)" }}>{msg}</div>}

        <Button onClick={onExport} disabled={downloading || !projectId}>
          {downloading ? "Đang tải CSV…" : "Tải CSV export"}
        </Button>
      </Card>
    </div>
  );
}
