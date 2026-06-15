import { useEffect, useState } from "react";
import { UserRole, ClaimTask, Project, ExportJob, AuditLog, UserAccount } from "./types";
import { TEST_IDS, VIEW_LABELS, VIEW_URL_MAP } from "./testability";
import {
  initialProject,
  initialTasks,
  initialExports,
  initialAudits,
  initialUsers
} from "./data/mockData";

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
  ChevronDown,
  MonitorCheck
} from "lucide-react";

type ViewKey = keyof typeof VIEW_URL_MAP;

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
  const [tasks, setTasks] = useState<ClaimTask[]>(initialTasks);
  const [project] = useState<Project>(initialProject);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>(initialExports);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAudits);
  const [users] = useState<UserAccount[]>(initialUsers);

  // Active sub-item indices
  const [selectedTaskId, setSelectedTaskId] = useState<string>("CT-001");
  const [selectedQaTaskId, setSelectedQaTaskId] = useState<string>("CT-002");

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

  const addAuditLog = (action: string, entity: string, detail: string) => {
    const freshLog: AuditLog = {
      id: "A-" + String(auditLogs.length + 1).padStart(3, "0"),
      user: currentUser === "admin@vsf.local" ? "Admin Trí" : currentUser === "qa@vsf.local" ? "QA Linh" : "Annotator Mai",
      action,
      entity,
      time: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour12: false }),
      detail
    };
    setAuditLogs((prev) => [freshLog, ...prev]);
  };

  const handleLoginSuccess = (email: string, role: UserRole) => {
    setCurrentUser(email);
    setCurrentRole(role);
    setActiveView("dashboard");
    addAuditLog("Đăng nhập (Login)", role, `Mở thành công workspace bằng tài khoản ${email}`);
  };

  const handleLogout = () => {
    addAuditLog("Đăng xuất (Logout)", currentRole, `Đăng xuất tài khoản ${currentUser}`);
    setCurrentUser(null);
    setActiveView("dashboard");
    setShowProfileDropdown(false);
    showToast("Đã đăng xuất khỏi hệ thống!");
  };

  // Nav configuration based on user roles
  const getNavLinks = () => {
    switch (currentRole) {
      case "ADMIN":
        return [
          { view: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
          { view: "projects", label: "Projects / PDF Import", icon: <Files size={16} /> },
          { view: "export", label: "Export CSV results", icon: <FileSpreadsheet size={16} /> },
          { view: "users", label: "Member list (Users)", icon: <Users size={16} /> },
          { view: "audit", label: "Audit log trace", icon: <History size={16} /> }
        ];
      case "ANNOTATOR":
        return [
          { view: "dashboard", label: "Dashboard overview", icon: <LayoutDashboard size={16} /> },
          { view: "tasks", label: "My Assigned Tasks", icon: <CheckSquare size={16} /> },
          { view: "annotation", label: "Annotation Workspace", icon: <Files size={16} /> }
        ];
      case "QA":
        return [
          { view: "dashboard", label: "Dashboard overview", icon: <LayoutDashboard size={16} /> },
          { view: "qa", label: "QA Queue", icon: <CheckSquare size={16} /> },
          { view: "qaReview", label: "QA Review Workspace", icon: <Files size={16} /> },
          { view: "export", label: "Export CSV results", icon: <FileSpreadsheet size={16} /> }
        ];
    }
  };

  // Switch Quick Profile helper
  const handleQuickRoleSwitch = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === "ADMIN") {
      setCurrentUser("admin@vsf.local");
      setActiveView("dashboard");
    } else if (newRole === "ANNOTATOR") {
      setCurrentUser("annotator@vsf.local");
      setActiveView("dashboard");
    } else {
      setCurrentUser("qa@vsf.local");
      setActiveView("dashboard");
    }
    showToast(`Mô phỏng chuyển đổi nhanh vai trò: [${newRole}]`);
  };

  // Task workflows
  const handleOpenTaskAnnotation = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveView("annotation");

    const targeted = tasks.find((t) => t.id === taskId);
    if (targeted && targeted.status === "Ready for Annotation") {
      // Transition to In Annotation is appropriate upon load
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "In Annotation" } : t))
      );
    }
  };

  const handleOpenTaskQa = (taskId: string) => {
    setSelectedQaTaskId(taskId);
    setActiveView("qaReview");
  };

  const handleAnnotationSubmit = (updatedTask: ClaimTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    addAuditLog("Gửi Đánh Giá", updatedTask.id, `Annotator nộp kết quả chấm cho Task ${updatedTask.id}. Chuyển sang Submitted.`);
  };

  const handleQaApprove = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "Approved" } : t))
    );
    addAuditLog("Duyệt Thẩm Định", taskId, `QA duyệt hồ sơ Task ${taskId} thành công, đưa vào danh sách Approved.`);
  };

  const handleQaReturn = (taskId: string, errorType: string, comment: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "Returned",
              returnCount: t.returnCount + 1,
              qaComment: `${errorType}: ${comment}`
            }
          : t
      )
    );
    addAuditLog("Trả Lại Hồ Sơ", taskId, `QA trả lại Task ${taskId} cho annotator chỉnh sửa. Lý do: ${errorType}`);
  };

  const handleAddExportJob = (newJob: ExportJob) => {
    setExportJobs((prev) => [newJob, ...prev]);
    addAuditLog("Xuất Dữ Liệu", newJob.id, `Xuất thành công tệp tin CSV chứa ${newJob.count} kết quả đánh giá.`);
  };

  const toggleDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const renderToasts = () => (
    <div className="fixed right-5 bottom-5 z-55 flex flex-col gap-2 pointer-events-none" data-testid={TEST_IDS.toastRegion} aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="w-full max-w-sm bg-white rounded-xl border border-slate-100 shadow-2xl p-4 flex items-start gap-4 pointer-events-auto animate-slide-up border-l-4 border-l-blue-600"
        >
          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckSquare size={12} />
          </div>
          <div className="text-xs">
            <strong className="text-slate-800 font-bold block">Thông báo tiến trình</strong>
            <p className="text-slate-500 mt-1 leading-relaxed font-semibold">{toast.message}</p>
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
  const activeQaTaskObj = tasks.find((t) => t.id === selectedQaTaskId) || tasks[1];

  const getBreadcrumbTitle = () => {
    return VIEW_LABELS[activeView as ViewKey] || "Platform View";
  };

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50/30 flex flex-col font-sans" data-testid={TEST_IDS.appShell}>
      
      {/* Root Layout Layer: Left sidebar + Main viewport */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR NAVIGATION PANE */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-150 p-5 flex flex-col justify-between shrink-0" data-testid={TEST_IDS.sidebar}>
          <div className="space-y-6">
            
            {/* VSF Logo Branding */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-extrabold text-base shadow-lg shadow-blue-100">
                VSF
              </div>
              <div>
                <strong className="block text-slate-800 text-sm font-bold tracking-tight">AI Annotation</strong>
                <span className="block text-[11px] text-slate-400 font-medium">Vivipedia MVP platform</span>
              </div>
            </div>

            {/* Menu Listing */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2 mb-1">
                Điều hướng
              </span>
              <nav className="space-y-1" aria-label="Điều hướng chính" data-testid={TEST_IDS.primaryNav}>
                {getNavLinks().map((link) => (
                  <button
                    key={link.view}
                    onClick={() => setActiveView(link.view)}
                    data-testid={TEST_IDS.navLink(link.view)}
                    aria-label={`Navigate to ${link.label}`}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeView === link.view
                        ? "bg-blue-50/75 text-blue-700 shadow-sm shadow-blue-50/50 border border-blue-100/50 font-extrabold"
                        : "text-slate-650 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    <span className={activeView === link.view ? "text-blue-600" : "text-slate-400"}>
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                  </button>
                ))}
              </nav>
            </div>

          </div>

          {/* Role projection widget at bottom */}
          <div className="pt-5 border-t border-slate-100 space-y-2 mt-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
              <MonitorCheck size={11} className="text-blue-500" /> Switch Role Tester (Mô Phỏng)
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => handleQuickRoleSwitch("ADMIN")}
                data-testid={TEST_IDS.roleSwitch("ADMIN")}
                aria-label="Switch to ADMIN role"
                className={`py-1 rounded text-[9.5px] font-bold border tracking-tight ${
                  currentRole === "ADMIN"
                    ? "bg-purple-100 border-purple-200 text-purple-800 font-extrabold"
                    : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                }`}
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleSwitch("ANNOTATOR")}
                data-testid={TEST_IDS.roleSwitch("ANNOTATOR")}
                aria-label="Switch to ANNOTATOR role"
                className={`py-1 rounded text-[9.5px] font-bold border tracking-tight ${
                  currentRole === "ANNOTATOR"
                    ? "bg-blue-100 border-blue-200 text-blue-800 font-extrabold"
                    : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                }`}
              >
                ANN
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleSwitch("QA")}
                data-testid={TEST_IDS.roleSwitch("QA")}
                aria-label="Switch to QA role"
                className={`py-1 rounded text-[9.5px] font-bold border tracking-tight ${
                  currentRole === "QA"
                    ? "bg-teal-100 border-teal-200 text-teal-800 font-extrabold"
                    : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                }`}
              >
                QA
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Reviewer có thể chuyển đổi nhanh 3 vai trò để test thử toàn bộ các màn hình chức năng.
            </p>
          </div>
        </aside>

        {/* MAIN BODY AREA & TOP NAV BAR */}
        <section className="flex-1 flex flex-col min-w-0">
          
          {/* HEADER TOP NAV */}
          <header className="bg-white border-b border-slate-150 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/95">
            <div>
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <span>VSF Platform</span> <span className="opacity-60">/</span> <span>{getBreadcrumbTitle()}</span>
              </div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
                {getBreadcrumbTitle()}
              </h1>
            </div>

            {/* Profile Dropdown controller */}
            <div className="relative">
              <button
                onClick={toggleDropdown}
                data-testid={TEST_IDS.profileMenuButton}
                aria-label="Open profile menu"
                className="flex items-center gap-2.5 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-650 transition-all focus:outline-none"
              >
                <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs">
                  {currentRole === "ADMIN" ? "AD" : currentRole === "QA" ? "QA" : "AN"}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="block font-bold text-slate-800 leading-tight">
                    {currentRole === "ADMIN" ? "Admin Trí" : currentRole === "QA" ? "QA specialist Linh" : "Annotator Mai"}
                  </span>
                  <span className="block text-[9.5.px] text-slate-400 block tracking-wide">{currentRole} role</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-150 rounded-xl shadow-2xl p-1.5 z-50 animate-slide-up text-xs font-medium" data-testid={TEST_IDS.profileMenu}>
                  <button
                    onClick={() => {
                      setActiveView("changePassword");
                      setShowProfileDropdown(false);
                    }}
                    data-testid={TEST_IDS.profileChangePassword}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-slate-700 rounded-lg text-left"
                  >
                    <Lock size={14} className="text-slate-400" /> Đổi mật khẩu
                  </button>
                  <button
                    onClick={handleLogout}
                    data-testid={TEST_IDS.profileLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-700 rounded-lg text-left border-t border-slate-100"
                  >
                    <LogOut size={14} className="text-red-500" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* COMPONENT VIEWPORT PORT */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto" data-testid={TEST_IDS.mainViewport}>
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
                  tasks={tasks}
                  onBackToDashboard={() => setActiveView("dashboard")}
                  showToast={showToast}
                  onAddTask={(newTask) => setTasks((prev) => [...prev, newTask])}
                  onUpdateTasks={setTasks}
                />
              </div>
            )}

            {activeView === "tasks" && (
              <div className="space-y-4" data-testid={TEST_IDS.view("tasks")}>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Nhiệm Vụ Được Giao (My Tasks)</h2>
                    <p className="text-xs text-slate-400 mt-1">Danh sách chỉ hiển thị các Claim task được phân công cho điều phối viên hiện tại.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                    Annotator Mai
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow overflow-hidden">
                  <div className="overflow-x-auto text-[11.5px]">
                    <table className="w-full text-left" data-testid={TEST_IDS.tasksAssignedTable}>
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-205 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">ID Task</th>
                          <th className="py-2.5 px-3">Mã Bài Viết</th>
                          <th className="py-2.5 px-3">Câu Hỏi trích xuất</th>
                          <th className="py-2.5 px-3">Citations Map</th>
                          <th className="py-2.5 px-3">Trạng Thái</th>
                          <th className="py-2.5 px-3 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                        {tasks
                          .filter((t) => t.annotator === "Annotator Mai")
                          .map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/30" data-testid={TEST_IDS.taskRow(t.id)}>
                              <td className="py-3 px-3 font-bold text-slate-900">{t.id}</td>
                              <td className="py-3 px-3 font-mono text-slate-700">{t.articleCode}</td>
                              <td className="py-3 px-3 max-w-sm truncate text-slate-700 font-medium" title={t.question}>
                                {t.question}
                              </td>
                              <td className="py-3 px-3">
                                {t.mappedSourceOrders.map((o) => (
                                  <span key={o} className="px-1 rounded bg-slate-100 border text-slate-500 font-bold text-[10px] mr-1">
                                    [{o}]
                                  </span>
                                ))}
                              </td>
                              <td className="py-3 px-3">
                                <span data-testid={TEST_IDS.taskStatus(t.id)} className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                  t.status === "Returned" ? "bg-red-50 text-red-800 border border-red-200" :
                                  t.status === "Submitted" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                                  t.status === "Approved" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                                  "bg-amber-50 text-amber-805 border border-amber-205"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleOpenTaskAnnotation(t.id)}
                                  data-testid={TEST_IDS.taskOpenAnnotation(t.id)}
                                  className="px-2.5 py-1 bg-gradient-to-tr from-blue-600 to-blue-700 hover:indigo-700 text-white font-bold rounded-lg text-[11px] shadow shadow-blue-100"
                                >
                                  {t.status === "Returned" ? "Chỉnh sửa" : "Bản đồ nguồn (Claim)"}
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
                <AnnotationWorkspaceView
                  task={activeTaskObj}
                  tasksList={tasks}
                  onSelectTask={setSelectedTaskId}
                  onSubmit={handleAnnotationSubmit}
                  showToast={showToast}
                />
              </div>
            )}

            {activeView === "qa" && (
              <div data-testid={TEST_IDS.view("qa")}>
                <QaQueueView tasks={tasks} onOpenTaskQa={handleOpenTaskQa} />
              </div>
            )}

            {activeView === "qaReview" && (
              <div data-testid={TEST_IDS.view("qaReview")}>
                <QaReviewView
                  task={activeQaTaskObj}
                  onBackToQueue={() => setActiveView("qa")}
                  onApprove={handleQaApprove}
                  onReturn={handleQaReturn}
                  showToast={showToast}
                />
              </div>
            )}

            {activeView === "export" && (
              <div data-testid={TEST_IDS.view("export")}>
                <ExportView
                  project={project}
                  tasks={tasks}
                  exportJobs={exportJobs}
                  onAddExportJob={handleAddExportJob}
                  showToast={showToast}
                  userName={currentUser === "admin@vsf.local" ? "Admin Trí" : "QA Linh"}
                />
              </div>
            )}

            {activeView === "users" && (
              <div data-testid={TEST_IDS.view("users")}>
                <UsersView users={users} />
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
      </div>

      {/* TOAST SYSTEM CONTAINER */}
      <div className="fixed right-5 bottom-5 z-55 flex flex-col gap-2 pointer-events-none" data-testid={TEST_IDS.toastRegion} aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="w-full max-w-sm bg-white rounded-xl border border-slate-100 shadow-2xl p-4 flex items-start gap-4 pointer-events-auto animate-slide-up border-l-4 border-l-blue-600"
          >
            <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare size={12} />
            </div>
            <div className="text-xs">
              <strong className="text-slate-800 font-bold block">Thông báo tiến trình</strong>
              <p className="text-slate-500 mt-1 leading-relaxed font-semibold">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
