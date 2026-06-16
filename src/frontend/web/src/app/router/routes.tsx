/**
 * Định nghĩa route + guard theo role.
 * - /login (AuthLayout)
 * - /admin/* (ADMIN), /annotator/* (ANNOTATOR), /qa/* (QA) trong AppLayout
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { RoleGuard } from "@/app/router/RoleGuard";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ProjectListPage } from "@/features/projects/pages/ProjectListPage";
import { ProjectSetupPage } from "@/features/projects/pages/ProjectSetupPage";
import { ImportBundlePage } from "@/features/import-bundle/pages/ImportBundlePage";
import { MyTasksPage } from "@/features/annotation-workspace/pages/MyTasksPage";
import { AnnotationWorkspacePage } from "@/features/annotation-workspace/pages/AnnotationWorkspacePage";
import { QaQueuePage } from "@/features/qa-review/pages/QaQueuePage";
import { QaReviewWorkspacePage } from "@/features/qa-review/pages/QaReviewWorkspacePage";
import { ExportPage } from "@/features/export/pages/ExportPage";
import { AuditLogPage } from "@/features/audit-log/pages/AuditLogPage";
import { ForbiddenPage, NotFoundPage } from "@/shared/ui/StatusPage";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: (
      <RoleGuard allow={["ADMIN"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { path: "/admin/dashboard", element: <DashboardPage /> },
      { path: "/admin/projects", element: <ProjectListPage /> },
      { path: "/admin/projects/new", element: <ProjectSetupPage /> },
      { path: "/admin/import", element: <ImportBundlePage /> },
      { path: "/admin/export", element: <ExportPage /> },
      { path: "/admin/audit", element: <AuditLogPage /> },
    ],
  },
  {
    element: (
      <RoleGuard allow={["ANNOTATOR"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { path: "/annotator/tasks", element: <MyTasksPage /> },
      { path: "/annotator/tasks/:claimId", element: <AnnotationWorkspacePage /> },
    ],
  },
  {
    element: (
      <RoleGuard allow={["QA"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { path: "/qa/queue", element: <QaQueuePage /> },
      { path: "/qa/review/:claimId", element: <QaReviewWorkspacePage /> },
    ],
  },
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/403", element: <ForbiddenPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
