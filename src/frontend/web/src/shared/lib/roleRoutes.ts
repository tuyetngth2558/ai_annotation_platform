/** Helper định tuyến theo role — tách khỏi AuthProvider để file provider chỉ export
 * component (tránh warning react-refresh/only-export-components). */
import type { Role } from "@/shared/types/auth";

/** Trang mặc định sau login theo role. */
export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "ANNOTATOR":
      return "/annotator/tasks";
    case "QA":
      return "/qa/queue";
  }
}
