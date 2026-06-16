/** Domain types FE (camelCase) — map từ shape BE qua shared/lib/adapters.ts. */

import type { Role } from "./auth";

export type UserRole = Role;

export type Dimension = "SF" | "SC" | "NH" | "SQ" | "REL" | "COMP";

export interface SourceRef {
  sourceId: string;
  url: string | null;
  citationMarker: string | null;
  accessStatus: string | null;
}

export type ClaimStatus =
  | "Ready for Annotation"
  | "In Annotation"
  | "Submitted"
  | "Returned"
  | "Approved"
  | "Source Mapping Required";

export interface ClaimTask {
  id: string;
  parentTaskId: string;
  articleCode: string;
  title: string;
  sectionName: string;
  claimText: string;
  status: ClaimStatus;
  submittedAt: string;
  citationMarkers: string[];
  answerContext: string;
  /** Điểm pre-score (LLM + SQ rule), theo 6 chiều. */
  pre: Record<Dimension, number>;
  /** Điểm annotator (draft hoặc đã submit). Khởi tạo = pre nếu chưa có draft. */
  ann: Record<Dimension, number>;
  sourceAccessStatus: string;
  annotatorNote: string;
  /** Lý do justification (gộp hiển thị, QA review). */
  reason: string;
  sources: SourceRef[];
  /** QA: annotator id (queue). */
  annotatorId: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  deadline: string;
  createdAt: string;
  memberCount: number;
}

export interface AuditLogRow {
  id: string;
  userId: string;
  userRole: string;
  entity: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  /** Role duy nhất (default_role BE). "" = chưa xác định. */
  role: UserRole | "";
  status: "Đang hoạt động" | "Bị khóa";
}
