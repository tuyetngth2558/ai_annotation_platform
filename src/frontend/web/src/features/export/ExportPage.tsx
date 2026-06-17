/** ExportPage (ADMIN) — tải CSV. Nối GET /exports/{project}/download. */
import { useEffect, useState } from "react";
import ExportView from "@/components/ExportView";
import { fetchProjects, downloadExportCsv } from "@/api/adapters";
import { useAuth } from "@/app/providers/AuthProvider";
import { useToast } from "@/app/providers/ToastProvider";
import type { Project } from "@/types";

const emptyProject: Project = {
  id: "", name: "Chưa có project", batch: "", bundleId: "", bundleName: "",
  importType: "pdf_bundle", answerPdf: "", sourceRefPdf: "", sourceContentPdfs: [],
  status: "Pending", createdAt: "", deadline: "", owner: "", annotators: [], qa: "",
};

export function ExportPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project>(emptyProject);

  useEffect(() => {
    fetchProjects().then((ps) => { if (ps[0]) setProject(ps[0]); }).catch(() => {});
  }, []);

  const onExport = async () => {
    if (!project.id) { showToast("Chưa có project để export."); return; }
    try {
      await downloadExportCsv(project.id);
      showToast("Đã tải file CSV export.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không tải được CSV.");
    }
  };

  return (
    <ExportView
      project={project}
      tasks={[]}
      exportJobs={[]}
      onAddExportJob={onExport}
      showToast={showToast}
      userName={session?.email ?? ""}
    />
  );
}
