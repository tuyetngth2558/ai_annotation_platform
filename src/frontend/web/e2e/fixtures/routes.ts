/** E2E — landing route theo role (khớp defaultRouteForRole ở AuthProvider). */

export const LANDING_BY_ROLE = {
  ADMIN: "/admin/dashboard",
  ANNOTATOR: "/annotator/tasks",
  QA: "/qa/queue",
} as const;
