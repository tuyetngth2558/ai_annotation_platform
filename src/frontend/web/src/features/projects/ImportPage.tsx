/** ImportPage (ADMIN) — form tạo project + import bundle.
 *  ?projectId=xxx → tiếp tục import cho project nháp đã tạo (bỏ qua bước 1). */
import { useNavigate, useSearchParams } from "react-router-dom";
import ProjectSetupView from "@/components/ProjectSetupView";
import { useToast } from "@/app/providers/ToastProvider";

export function ImportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  const projectIdParam = params.get("projectId") || "";

  return (
    <ProjectSetupView
      key={projectIdParam}
      existingProjectId={projectIdParam}
      showToast={showToast}
      // Khi bước 1 tạo xong project → ghi ?projectId vào URL (back/reload không tạo lại).
      onProjectCreated={(projectId) => setParams({ projectId }, { replace: true })}
      onImported={(projectId) => {
        showToast("Import xong — mở chi tiết project để gán nhân sự.");
        navigate(projectId ? `/admin/projects/${projectId}` : "/admin/projects");
      }}
    />
  );
}
