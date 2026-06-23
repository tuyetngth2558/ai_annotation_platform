/** Định nghĩa route + guard theo role. URL thật, back/forward chuẩn trình duyệt. */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { RoleGuard } from "@/app/router/RoleGuard";
import { ForbiddenPage, NotFoundPage } from "@/app/router/StatusPage";

import { LoginPage } from "@/features/auth/LoginPage";
import { ChangePasswordPage } from "@/features/auth/ChangePasswordPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectsListPage } from "@/features/projects/ProjectsListPage";
import { ImportPage } from "@/features/projects/ImportPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { UsersPage } from "@/features/users/UsersPage";
import { AuditPage } from "@/features/audit/AuditPage";
import { TasksPage } from "@/features/annotation/TasksPage";
import { AnnotationPage } from "@/features/annotation/AnnotationPage";
import { QaQueuePage } from "@/features/qa/QaQueuePage";
import { QaReviewPage } from "@/features/qa/QaReviewPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },

  {
    element: (
      <RoleGuard allow={["ADMIN"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { path: "/admin/dashboard", element: <DashboardPage /> },
      { path: "/admin/import", element: <ImportPage /> },
      { path: "/admin/projects", element: <ProjectsListPage /> },
      { path: "/admin/projects/:projectId", element: <ProjectDetailPage /> },
      { path: "/admin/users", element: <UsersPage /> },
      { path: "/admin/audit", element: <AuditPage /> },
    ],
  },
  {
    element: (
      <RoleGuard allow={["ANNOTATOR"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { path: "/annotator/dashboard", element: <DashboardPage /> },
      { path: "/annotator/tasks", element: <TasksPage /> },
      { path: "/annotator/tasks/:claimId", element: <AnnotationPage /> },
    ],
  },
  {
    element: (
      <RoleGuard allow={["QA"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [
      { path: "/qa/dashboard", element: <DashboardPage /> },
      { path: "/qa/queue", element: <QaQueuePage /> },
      { path: "/qa/review/:claimId", element: <QaReviewPage /> },
    ],
  },

  // change-password dùng được cho mọi role đã đăng nhập (guard cho cả 3).
  {
    element: (
      <RoleGuard allow={["ADMIN", "ANNOTATOR", "QA"]}>
        <AppLayout />
      </RoleGuard>
    ),
    children: [{ path: "/change-password", element: <ChangePasswordPage /> }],
  },

  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/403", element: <ForbiddenPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
