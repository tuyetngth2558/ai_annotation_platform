export type UserRole = "ADMIN" | "ANNOTATOR" | "QA";

export type Dimension = "SF" | "SC" | "NH" | "SQ" | "REL" | "COMP";

export type SourceParseStatus = "parsed" | "unparsed" | "ocr_required" | "pending" | "failed";

export type SourceDomainClass =
  | "gov_vn"
  | "intl_org"
  | "academic"
  | "social_or_blog"
  | "pdf_only"
  | "general"
  | "unknown";

export interface Source {
  order: number;
  title: string;
  tier: string;
  url: string | null;
  file: string;
  parseStatus: SourceParseStatus;
  text: string;
  domainClass?: SourceDomainClass;
  sqPrescore?: number;
  sqRationale?: string;
  sqNeedsReview?: boolean;
  tierNormalized?: string;
}

export interface ClaimTask {
  id: string;
  answerId: string;
  bundleId: string;
  projectId: string;
  projectName: string;
  articleCode: string;
  title: string;
  category: string;
  tier: string;
  confidenceScore: number;
  sectionName: string;
  citationMarkers: string[];
  mappedSourceOrders: number[];
  answerPdf: string;
  status:
    | "Ready for Annotation"
    | "In Annotation"
    | "Submitted"
    | "Returned"
    | "Approved"
    | "Exported"
    | "Source Mapping Required";
  domain: string;
  annotator: string;
  qa: string;
  submittedAt: string;
  returnCount: number;
  question: string;
  answer: string;
  claimOriginal: string;
  claimFinal: string;
  edited: boolean;
  pre: Record<Dimension, number>;
  ann: Record<Dimension, number>;
  /** Composite annotator (server tính); null nếu chưa có. Dùng cho QA queue. */
  compositeAnnotator?: number | null;
  sourceStatus: string;
  sourceNote: string;
  reason: string;
  notes: string;
  sources: Source[];
  urls: string[];
  qaComment: string;
  sqRationale?: string;
  sqEngine?: "rule" | "llm";
}

export interface Project {
  id: string;
  name: string;
  batch: string;
  bundleId: string;
  bundleName: string;
  importType: string;
  answerPdf: string;
  sourceRefPdf: string;
  sourceContentPdfs: string[];
  status: "Active" | "Completed" | "Pending" | "Draft";
  createdAt: string;
  deadline: string;
  owner: string;
  annotators: string[];
  qa: string;
}

export interface ExportJob {
  id: string;
  project: string;
  bundleId: string;
  status: "Done" | "Failed" | "Processing";
  count: number;
  by: string;
  time: string;
  answerPdf: string;
  sourceRefPdf: string;
}

export interface AuditLog {
  id: string;
  /** Email/tên người thực hiện (đã rõ), fallback "Hệ thống" nếu không có. */
  user: string;
  /** Vai trò người thực hiện tại thời điểm hành động (ADMIN/QA/ANNOTATOR). */
  userRole: string;
  action: string;
  entity: string;
  /** ISO timestamp gốc (để format hiển thị). */
  time: string;
  detail: string;
}

export interface UserAccount {
  name: string;
  email: string;
  // "" = role chưa xác định (user cũ chưa set default_role) — hiển "—".
  role: UserRole | "";
  status: "Đang hoạt động" | "Bị khóa";
}
