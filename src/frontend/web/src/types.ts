export type UserRole = "ADMIN" | "ANNOTATOR" | "QA";

export type Dimension = "SF" | "SC" | "NH" | "SQ" | "REL" | "COMP";

export interface Source {
  order: number;
  title: string;
  tier: string;
  url: string | null;
  file: string;
  parseStatus: "parsed" | "pending" | "failed";
  text: string;
}

export interface ClaimTask {
  id: string;
  answerId: string;
  bundleId: string;
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
  sourceStatus: string;
  sourceNote: string;
  reason: string;
  notes: string;
  sources: Source[];
  urls: string[];
  qaComment: string;
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
  status: "Active" | "Completed" | "Pending";
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
  user: string;
  action: string;
  entity: string;
  time: string;
  detail: string;
}

export interface UserAccount {
  name: string;
  email: string;
  role: UserRole;
  status: "Đang hoạt động" | "Bị khóa";
}
