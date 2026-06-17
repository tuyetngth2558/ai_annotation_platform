/** ImportPage (ADMIN) — wizard import bundle. Import xong → về /admin/projects (B5). */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectSetupView from "@/components/ProjectSetupView";
import { fetchProjects } from "@/api/adapters";
import { useToast } from "@/app/providers/ToastProvider";
import type { Project } from "@/types";

const emptyProject: Project = {
  id: "", name: "Chưa có project", batch: "", bundleId: "", bundleName: "",
  importType: "pdf_bundle", answerPdf: "", sourceRefPdf: "", sourceContentPdfs: [],
  status: "Pending", createdAt: "", deadline: "", owner: "", annotators: [], qa: "",
};

export function ImportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project>(emptyProject);

  useEffect(() => {
    fetchProjects().then((ps) => { if (ps[0]) setProject(ps[0]); }).catch(() => {});
  }, []);

  return (
    <ProjectSetupView
      project={project}
      onBackToDashboard={() => navigate("/admin/projects")}
      showToast={showToast}
      onImported={() => {
        showToast("Import xong — về danh sách project.");
        navigate("/admin/projects");
      }}
    />
  );
}
