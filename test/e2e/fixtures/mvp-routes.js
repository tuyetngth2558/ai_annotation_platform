export const ROLES = {
  admin: "ADMIN",
  annotator: "ANNOTATOR",
  qa: "QA",
};

export const USERS = {
  ADMIN: { email: "admin@vsf.local", password: "admin-demo-2026", role: "ADMIN" },
  ANNOTATOR: {
    email: "annotator@vsf.local",
    password: "annotator-demo-2026",
    role: "ANNOTATOR",
  },
  QA: { email: "qa@vsf.local", password: "qa-demo-2026", role: "QA" },
};

export const ROUTES = {
  login: "/login",
  adminDashboard: "/admin/dashboard",
  projectSetup: "/admin/projects/new",
  importBundle: "/admin/import",
  annotatorTasks: "/annotator/tasks",
  annotationWorkspace: (claimId) => `/annotator/tasks/${claimId}`,
  qaQueue: "/qa/queue",
  qaReview: (claimId) => `/qa/review/${claimId}`,
  exportCsv: "/admin/export",
};

export const LANDING_BY_ROLE = {
  ADMIN: ROUTES.adminDashboard,
  ANNOTATOR: ROUTES.annotatorTasks,
  QA: ROUTES.qaQueue,
};

export const CLAIM_IDS = {
  submittedByAnnotator: "CT-001",
  readyForQaReview: "CT-002",
};

export const PAGE_TEST_IDS = {
  login: "login-page",
  projectSetup: "project-setup-page",
  importBundle: "import-bundle-page",
  annotatorTasks: "annotator-tasks-page",
  annotationWorkspace: "annotation-workspace-page",
  qaQueue: "qa-queue-page",
  qaReview: "qa-review-page",
  exportCsv: "export-page",
};

