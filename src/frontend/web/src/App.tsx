import { useEffect, useState } from "react";
import { UserRole, ClaimTask, Project, ExportJob, AuditLog, UserAccount, Dimension } from "./types";
import { TEST_IDS, VIEW_LABELS, VIEW_URL_MAP } from "./testability";
import { ApiError, apiClient, authToken } from "./api/client";
import { demoProject, demoTasks } from "./data/demoTasks";
import { enrichClaimTask } from "./sqRules";
import {
  fetchMyTasks,
  fetchTaskDetail,
  fetchQaQueue,
  fetchQaReviewDetail,
  fetchProjects,
  fetchAuditLogs,
  fetchUsers,
  dimensionsToScoreBlock,
  downloadExportCsv,
} from "./api/adapters";

// Components
import LoginView from "./components/LoginView";
import ChangePasswordView from "./components/ChangePasswordView";
import DashboardView from "./components/DashboardView";
import ProjectSetupView from "./components/ProjectSetupView";
import AnnotationWorkspaceView from "./components/AnnotationWorkspaceView";
import QaQueueView from "./components/QaQueueView";
import QaReviewView from "./components/QaReviewView";
import ExportView from "./components/ExportView";
import UsersView from "./components/UsersView";
import AuditLogView from "./components/AuditLogView";
import BrandLogo from "./components/BrandLogo";

// Lucide Icons
import {
  LayoutDashboard,
  Files,
  CheckSquare,
  FileSpreadsheet,
  Users,
  History,
  Lock,
  LogOut,
  ChevronDown
} from "lucide-react";

type ViewKey = keyof typeof VIEW_URL_MAP;

const emptyProject: Project = {
  id: "",
  name: "Chưa có project từ backend",
  batch: "",
  bundleId: "",
  bundleName: "",
  importType: "pdf_bundle",
  answerPdf: "",
  sourceRefPdf: "",
  sourceContentPdfs: [],
  status: "Pending",
  createdAt: "",
  deadline: "",
  owner: "",
  annotators: [],
  qa: "",
};

const hashToView = (hash: string) => {
  const slug = hash.replace(/^#\/?/, "");
  if (!slug) return "dashboard";

  const found = Object.entries(VIEW_URL_MAP).find(([, url]) => url.endsWith(`/${slug}`));
  return found ? found[0] : "dashboard";
};

const viewToHash = (view: string) => {
  const url = VIEW_URL_MAP[view as ViewKey] || VIEW_URL_MAP.dashboard;
  return url.replace("/", "");
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>("ADMIN");
  const [activeView, setActiveView] = useState<string>(() =>
    typeof window === "undefined" ? "login" : hashToView(window.location.hash) || "login"
  );

  // Models state tracking
  const [tasks, setTasks] = useState<ClaimTask[]>([]);
  const [project, setProject] = useState<Project>(emptyProject);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [backendNotice, setBackendNotice] = useState<string>("");

  // Active sub-item indices
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedQaTaskId, setSelectedQaTaskId] = useState<string>("");

  // Notifications
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const showToast = (message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const backendMessage = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.status === 501) {
      return "Backend endpoint chưa implement, UI đã sẵn sàng để kết nối.";
    }
    if (error instanceof Error) return error.message;
    return fallback;
  };

  // Tải dữ liệu theo ĐÚNG role (tránh gọi endpoint ADMIN-only khi ANNOTATOR/QA → 403).
  // Demo data chỉ dùng khi gọi API LỖI (BE down) — không che dữ liệu rỗng thật.
  const loadWorkspaceData = async (role: UserRole) => {
    setBackendNotice("");

    if (role === "ADMIN") {
      const [projectsResult, auditsResult, usersResult] = await Promise.allSettled([
        fetchProjects(),
        fetchAuditLogs(),
        fetchUsers(),
      ]);
      if (projectsResult.status === "fulfilled") {
        setProject(projectsResult.value[0] || emptyProject);
      } else {
        setProject(demoProject);
        setBackendNotice(backendMessage(projectsResult.reason, "Không tải được projects — dùng dữ liệu demo."));
      }
      if (auditsResult.status === "fulfilled") setAuditLogs(auditsResult.value);
      if (usersResult.status === "fulfilled") setUsers(usersResult.value);
      setTasks([]);
      return;
    }

    if (role === "ANNOTATOR") {
      try {
        const t = await fetchMyTasks();
        const enriched = t.map(enrichClaimTask);
        setTasks(enriched);
        setSelectedTaskId(enriched[0]?.id || "");
      } catch (error) {
        setTasks(demoTasks);
        setSelectedTaskId(demoTasks[0]?.id || "");
        setBackendNotice(backendMessage(error, "Không tải được tasks — dùng dữ liệu demo."));
      }
      return;
    }

    if (role === "QA") {
      try {
        const q = await fetchQaQueue();
        setTasks(q.map(enrichClaimTask));
        setSelectedQaTaskId(q[0]?.id || "");
      } catch (error) {
        setTasks(demoTasks);
        setSelectedQaTaskId(demoTasks.find((t) => t.status === "Submitted")?.id || demoTasks[0]?.id || "");
        setBackendNotice(backendMessage(error, "Không tải được QA queue — dùng dữ liệu demo."));
      }
      return;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveView(hashToView(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const targetHash = currentUser ? viewToHash(activeView) : viewToHash("login");
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, "", targetHash);
    }
  }, [activeView, currentUser]);

  const handleLoginSuccess = (email: string, role: UserRole) => {
    setCurrentUser(email);
    setCurrentRole(role);
    setActiveView("dashboard");
    void loadWorkspaceData(role);
  };

  const handleLogout = () => {
    authToken.clear();
    setCurrentUser(null);
    setTasks([]);
    setProject(emptyProject);
    setExportJobs([]);
    setAuditLogs([]);
    setUsers([]);
    setBackendNotice("");
    setActiveView("dashboard");
    setShowProfileDropdown(false);
    showToast("Đã đăng xuất khỏi hệ thống!");
  };

  // Nav configuration based on user roles
  const getNavLinks = () => {
    switch (currentRole) {
      case "ADMIN":
        return [
          { view: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} /> },
          { view: "projects", label: "Import dữ liệu", icon: <Files size={17} /> },
          { view: "export", label: "Xuất kết quả", icon: <FileSpreadsheet size={17} /> },
          { view: "users", label: "Thành viên", icon: <Users size={17} /> },
          { view: "audit", label: "Nhật ký", icon: <History size={17} /> }
        ];
      case "ANNOTATOR":
        return [
          { view: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} /> },
          { view: "tasks", label: "Task của tôi", icon: <CheckSquare size={17} /> },
          { view: "annotation", label: "Chấm điểm", icon: <Files size={17} /> }
        ];
      case "QA":
        // Export là ADMIN-only (BE require ADMIN) → không hiển cho QA.
        return [
          { view: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} /> },
          { view: "qa", label: "Hàng đợi QA", icon: <CheckSquare size={17} /> },
          { view: "qaReview", label: "Kiểm duyệt", icon: <Files size={17} /> }
        ];
    }
  };

  // Gộp 1 task đã fetch chi tiết vào state.
  const mergeTaskDetail = (detail: ClaimTask) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === detail.id);
      const enriched = enrichClaimTask(detail);
      return exists ? prev.map((t) => (t.id === detail.id ? { ...t, ...enriched } : t)) : [...prev, enriched];
    });
  };

  // Mở workspace → fetch detail (pre_score + sources + answer_context).
  const handleOpenTaskAnnotation = async (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveView("annotation");
    try {
      mergeTaskDetail(await fetchTaskDetail(taskId));
    } catch (error) {
      showToast(backendMessage(error, "Không tải được chi tiết task."));
    }
  };

  const handleOpenTaskQa = async (taskId: string) => {
    setSelectedQaTaskId(taskId);
    setActiveView("qaReview");
    try {
      mergeTaskDetail(await fetchQaReviewDetail(taskId));
    } catch (error) {
      showToast(backendMessage(error, "Không tải được chi tiết QA review."));
    }
  };

  const toSourceAccessStatus = (ui: string): string => {
    const map: Record<string, string> = {
      source_text_parsed: "accessible",
      "Truy cập được - hỗ trợ rõ": "accessible",
      accessible: "accessible",
      "Truy cập được - hỗ trợ một phần": "partial",
      "Truy cập được - không hỗ trợ": "partial",
      "Không liên quan": "partial",
      partial: "partial",
      "inaccessible / Không truy cập được": "inaccessible",
      inaccessible: "inaccessible",
      unknown: "not_checked",
      not_checked: "not_checked",
    };
    return map[ui] || "not_checked";
  };

  const handleAnnotationSubmit = async (updatedTask: ClaimTask) => {
    try {
      const justifications: Record<string, string | null> = {};
      const dims: { ui: Dimension; be: string }[] = [
        { ui: "SF", be: "sf" }, { ui: "SC", be: "sc" }, { ui: "NH", be: "hr" },
        { ui: "SQ", be: "sq" }, { ui: "REL", be: "rel" }, { ui: "COMP", be: "comp" },
      ];
      for (const { ui, be } of dims) {
        const delta = Math.abs((updatedTask.ann[ui] ?? 0) - (updatedTask.pre[ui] ?? 0));
        justifications[be] = delta >= 0.2 ? (updatedTask.reason || null) : null;
      }
      await apiClient.post(`/tasks/${updatedTask.id}/submit`, {
        scores: dimensionsToScoreBlock(updatedTask.ann),
        source_access_status: toSourceAccessStatus(updatedTask.sourceStatus),
        annotator_note: updatedTask.notes || null,
        justifications,
      });
      showToast(`Đã gửi task ${updatedTask.id} lên backend.`);
      await loadWorkspaceData(currentRole);
    } catch (error) {
      showToast(backendMessage(error, "Không gửi được annotation lên backend."));
      throw error;
    }
  };

  const handleQaApprove = async (taskId: string) => {
    try {
      await apiClient.post(`/qa-reviews/${taskId}/approve`, { qa_comment: null });
      showToast(`Backend đã duyệt task ${taskId}.`);
      await loadWorkspaceData(currentRole);
    } catch (error) {
      showToast(backendMessage(error, "Không duyệt được task qua backend."));
      throw error;
    }
  };

  const toErrorCategory = (ui: string): string => {
    const map: Record<string, string> = {
      "Factual Error": "factual_error",
      "Guideline Violation": "guideline_violation",
      "Source Mismatch": "source_mismatch",
      "Incomplete": "incomplete",
      "Other": "other",
    };
    return map[ui] || "other";
  };

  const handleQaReturn = async (taskId: string, errorType: string, comment: string) => {
    try {
      await apiClient.post(`/qa-reviews/${taskId}/return`, {
        error_category: toErrorCategory(errorType),
        qa_comment: comment,
      });
      showToast(`Backend đã trả task ${taskId} cho annotator.`);
      await loadWorkspaceData(currentRole);
    } catch (error) {
      showToast(backendMessage(error, "Không trả task qua backend."));
      throw error;
    }
  };

  // Export: tải CSV thật từ BE (GET /exports/{project_id}/download). Bỏ "tạo job" giả.
  const handleExportDownload = async () => {
    if (!project.id) {
      showToast("Chưa có project để export.");
      return;
    }
    try {
      await downloadExportCsv(project.id);
      showToast("Đã tải file CSV export.");
    } catch (error) {
      showToast(backendMessage(error, "Không tải được CSV export."));
    }
  };

  const toggleDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const renderToasts = () => (
    <div className="fixed right-5 bottom-5 z-55 flex flex-col gap-2 pointer-events-none" data-testid={TEST_IDS.toastRegion} aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex items-start gap-3 pointer-events-auto animate-slide-up border-l-4 border-l-vsf-600"
        >
          <div className="w-8 h-8 rounded-lg bg-vsf-50 text-vsf-600 flex items-center justify-center flex-shrink-0">
            <CheckSquare size={14} />
          </div>
          <div className="text-xs">
            <strong className="text-gray-900 font-semibold block">Thông báo</strong>
            <p className="text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );

  // If user is logged out, render the Login screen
  if (!currentUser || activeView === "login") {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        {renderToasts()}
      </>
    );
  }

  const activeTaskObj = tasks.find((t) => t.id === selectedTaskId) || tasks[0];
  const activeQaTaskObj = tasks.find((t) => t.id === selectedQaTaskId) || tasks[0];

  const getBreadcrumbTitle = () => {
    return VIEW_LABELS[activeView as ViewKey] || "Platform View";
  };

  return (
    <div className="min-h-screen bg-canvas font-sans" data-testid={TEST_IDS.appShell}>
      <aside className="app-shell-sidebar" data-testid={TEST_IDS.sidebar}>
        <BrandLogo variant="sidebar" />

        <div className="flex-1 min-h-0 px-3 pt-4 overflow-y-auto">
          <nav className="space-y-0.5" aria-label="Điều hướng chính" data-testid={TEST_IDS.primaryNav}>
              {getNavLinks().map((link) => (
                <button
                  key={link.view}
                  onClick={() => setActiveView(link.view)}
                  data-testid={TEST_IDS.navLink(link.view)}
                  aria-label={`Navigate to ${link.label}`}
                  className={`nav-item ${activeView === link.view ? "nav-item-active" : ""}`}
                >
                  <span className={activeView === link.view ? "text-white" : "text-gray-400"}>
                    {link.icon}
                  </span>
                  <span className="truncate">{link.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="shrink-0 px-4 py-3 border-t border-sidebar-border bg-sidebar">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {currentUser?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-700 font-medium truncate">{currentUser}</p>
                <span className="text-[10px] text-gray-400 font-medium">{currentRole}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="app-shell-main">
          <header className="app-topbar">
            <div className="app-topbar-inner">
              <div className="text-sm text-gray-500 min-w-0">
                <span className="font-semibold text-gray-900">{getBreadcrumbTitle()}</span>
              </div>

              <div className="relative">
              <button
                onClick={toggleDropdown}
                data-testid={TEST_IDS.profileMenuButton}
                aria-label="Open profile menu"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-800 text-white font-semibold text-[10px]">
                  {currentRole === "ADMIN" ? "AD" : currentRole === "QA" ? "QA" : "AN"}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {showProfileDropdown && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-lg p-1 z-50 animate-scale-in text-[13px]"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
                  data-testid={TEST_IDS.profileMenu}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{currentUser}</p>
                    <p className="text-[11px] text-gray-400">{currentRole}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveView("changePassword");
                      setShowProfileDropdown(false);
                    }}
                    data-testid={TEST_IDS.profileChangePassword}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-md text-left"
                  >
                    <Lock size={14} className="text-gray-400" /> Đổi mật khẩu
                  </button>
                  <button
                    onClick={handleLogout}
                    data-testid={TEST_IDS.profileLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 rounded-md text-left"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
              </div>
            </div>
          </header>

          <main className="app-content" data-testid={TEST_IDS.mainViewport}>
            {backendNotice && (
              <div className="mb-5 rounded-lg border border-amber-200/60 bg-amber-50/80 px-4 py-2.5 text-[13px] text-amber-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {backendNotice}
              </div>
            )}

            {activeView === "dashboard" && (
              <div data-testid={TEST_IDS.view("dashboard")}>
                <DashboardView
                  userRole={currentRole}
                  tasks={tasks}
                  exportJobsCount={exportJobs.length}
                  onNavigate={setActiveView}
                  onOpenTaskAnnotation={handleOpenTaskAnnotation}
                  onOpenTaskQa={handleOpenTaskQa}
                />
              </div>
            )}

            {activeView === "projects" && (
              <div data-testid={TEST_IDS.view("projects")}>
                <ProjectSetupView
                  project={project}
                  onBackToDashboard={() => setActiveView("dashboard")}
                  showToast={showToast}
                  onImported={() => void loadWorkspaceData(currentRole)}
                />
              </div>
            )}

            {activeView === "tasks" && (
              <div className="space-y-4" data-testid={TEST_IDS.view("tasks")}>
                <div className="app-card p-5 flex justify-between items-center">
                  <div>
                    <h2 className="page-title">Nhiệm vụ được giao</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Claim task phân công cho annotator hiện tại.
                    </p>
                  </div>
                  <span className="status-pill bg-vsf-50 text-vsf-700 border-vsf-200 font-mono">
                    Annotator Mai
                  </span>
                </div>

                <div className="app-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table" data-testid={TEST_IDS.tasksAssignedTable}>
                      <thead>
                        <tr>
                          <th className="py-3 px-4">ID Task</th>
                          <th className="py-3 px-4">Mã bài</th>
                          <th className="py-3 px-4">Claim</th>
                          <th className="py-3 px-4">Citations</th>
                          <th className="py-3 px-4">Trạng thái</th>
                          <th className="py-3 px-4 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700">
                        {/* BE /tasks đã chỉ trả task của annotator hiện tại (OQ-008). */}
                        {tasks.map((t) => (
                            <tr key={t.id} data-testid={TEST_IDS.taskRow(t.id)}>
                              <td className="py-3 px-4 font-semibold text-gray-900">{t.id}</td>
                              <td className="py-3 px-4 font-mono text-sm">{t.articleCode}</td>
                              <td className="py-3 px-4 max-w-sm truncate font-medium" title={t.claimFinal}>
                                {t.claimFinal}
                              </td>
                              <td className="py-3 px-4">
                                {t.mappedSourceOrders.map((o) => (
                                  <span
                                    key={o}
                                    className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 font-mono text-[10px] mr-1"
                                  >
                                    [{o}]
                                  </span>
                                ))}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  data-testid={TEST_IDS.taskStatus(t.id)}
                                  className={`status-pill ${
                                    t.status === "Returned"
                                      ? "bg-red-50 text-red-800 border-red-200"
                                      : t.status === "Submitted"
                                        ? "bg-vsf-50 text-vsf-800 border-vsf-200"
                                        : t.status === "Approved"
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                          : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleOpenTaskAnnotation(t.id)}
                                  data-testid={TEST_IDS.taskOpenAnnotation(t.id)}
                                  className="btn-primary !py-1.5 !px-3 !text-xs"
                                >
                                  {t.status === "Returned" ? "Chỉnh sửa" : "Mở workspace"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeView === "annotation" && (
              <div data-testid={TEST_IDS.view("annotation")}>
                {activeTaskObj ? (
                  <AnnotationWorkspaceView
                    task={activeTaskObj}
                    tasksList={tasks}
                    onSelectTask={setSelectedTaskId}
                    onSubmit={handleAnnotationSubmit}
                    showToast={showToast}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
                    Chưa có claim task từ backend để mở workspace annotation.
                  </div>
                )}
              </div>
            )}

            {activeView === "qa" && (
              <div data-testid={TEST_IDS.view("qa")}>
                <QaQueueView tasks={tasks} onOpenTaskQa={handleOpenTaskQa} />
              </div>
            )}

            {activeView === "qaReview" && (
              <div data-testid={TEST_IDS.view("qaReview")}>
                {activeQaTaskObj ? (
                  <QaReviewView
                    task={activeQaTaskObj}
                    onBackToQueue={() => setActiveView("qa")}
                    onApprove={handleQaApprove}
                    onReturn={handleQaReturn}
                    showToast={showToast}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
                    Chưa có claim task từ backend để mở QA review.
                  </div>
                )}
              </div>
            )}

            {activeView === "export" && (
              <div data-testid={TEST_IDS.view("export")}>
                <ExportView
                  project={project}
                  tasks={tasks}
                  exportJobs={exportJobs}
                  onAddExportJob={handleExportDownload}
                  showToast={showToast}
                  userName={currentUser || ""}
                />
              </div>
            )}

            {activeView === "users" && (
              <div data-testid={TEST_IDS.view("users")}>
                <UsersView
                  users={users}
                  showToast={showToast}
                  onUserCreated={() => void loadWorkspaceData(currentRole)}
                />
              </div>
            )}

            {activeView === "audit" && (
              <div data-testid={TEST_IDS.view("audit")}>
                <AuditLogView auditLogs={auditLogs} />
              </div>
            )}

            {activeView === "changePassword" && (
              <div data-testid={TEST_IDS.view("changePassword")}>
                <ChangePasswordView
                  onCancel={() => setActiveView("dashboard")}
                  showToast={showToast}
                />
              </div>
            )}
          </main>

        </section>

      {/* Toast */}
      <div className="fixed right-5 bottom-5 z-50 flex flex-col gap-2 pointer-events-none" data-testid={TEST_IDS.toastRegion} aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="w-full max-w-xs bg-gray-900 rounded-lg p-3.5 flex items-start gap-2.5 pointer-events-auto animate-slide-up"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
          >
            <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare size={11} className="text-white" />
            </div>
            <p className="text-[13px] text-gray-200 leading-relaxed">{toast.message}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
