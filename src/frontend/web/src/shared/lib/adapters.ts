/**
 * Adapter: map response Backend (snake_case Pydantic) → domain type FE (camelCase).
 * Dùng apiFetch (shared/lib/apiClient) — đã gắn base URL + Bearer + parse {error:{...}}.
 * Nguồn shape BE: docs/api/API_Integration_Guide.md.
 */
import { apiFetch, getToken } from "./apiClient";
import type {
  ClaimTask,
  Dimension,
  Project,
  AuditLogRow,
  UserAccount,
  SourceRef,
  ClaimStatus,
} from "@/shared/types/domain";
import type { Role } from "@/shared/types/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Kiểu BE (chỉ field FE dùng)
// ---------------------------------------------------------------------------
interface Page<T> {
  items: T[];
  meta?: { total: number; limit: number; offset: number };
}
interface ListEnvelope<T> {
  items: T[];
  total: number;
}
interface ScoreBlockBE {
  sf: number;
  sc: number;
  hr: number;
  sq: number;
  rel: number;
  comp: number;
}
interface PreScoreOutBE extends ScoreBlockBE {
  pre_score_id: string;
  composite_score: number | null;
  rationale_json: Record<string, unknown> | null;
}
interface SourceRefOutBE {
  source_id: string;
  source_url: string | null;
  citation_marker: string | null;
  access_status: string | null;
}
interface TaskListItemBE {
  claim_id: string;
  claim_order: number;
  section_name: string | null;
  claim_text: string;
  status: string;
  submitted_at: string | null;
  parent_task_id: string;
  article_code: string | null;
  title: string | null;
}
interface TaskDetailOutBE extends TaskListItemBE {
  citation_markers: string | null;
  answer_context: string | null;
  pre_score: PreScoreOutBE | null;
  sources: SourceRefOutBE[];
  draft: {
    scores: ScoreBlockBE | null;
    source_access_status: string | null;
    annotator_note: string | null;
    justifications: Record<string, string | null> | null;
  } | null;
}
interface ReviewDetailOutBE {
  claim_id: string;
  claim_text: string;
  section_name: string | null;
  citation_markers: string | null;
  article_code: string | null;
  title: string | null;
  answer_context: string | null;
  score_diff: {
    dimension: string;
    pre_score: number | null;
    annotator_score: number;
    delta: number;
    needs_justification: boolean;
  }[];
  source_access_status: string | null;
  annotator_note: string | null;
  justifications: Record<string, string | null> | null;
}
interface ProjectOutBE {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  deadline: string | null;
  created_at: string;
  member_count: number;
}
interface AuditLogOutBE {
  id: string;
  user_id: string | null;
  user_role: string | null;
  entity_type: string;
  entity_id: string | null;
  action_type: string;
  description: string | null;
  reason: string | null;
  timestamp: string;
}
interface UserOutBE {
  id: string;
  email: string;
  full_name: string;
  status: string;
  role: string | null;
  last_login_at: string | null;
}

// ---------------------------------------------------------------------------
// Map helpers
// ---------------------------------------------------------------------------
export const ZERO_SCORES: Record<Dimension, number> = {
  SF: 0, SC: 0, NH: 0, SQ: 0, REL: 0, COMP: 0,
};

const DIM_BY_KEY: Record<string, Dimension> = {
  sf: "SF", sc: "SC", hr: "NH", sq: "SQ", rel: "REL", comp: "COMP",
};

function scoreBlockToDims(b: ScoreBlockBE | null | undefined): Record<Dimension, number> {
  if (!b) return { ...ZERO_SCORES };
  return { SF: b.sf, SC: b.sc, NH: b.hr, SQ: b.sq, REL: b.rel, COMP: b.comp };
}

export function dimsToScoreBlock(s: Record<Dimension, number>): ScoreBlockBE {
  return { sf: s.SF, sc: s.SC, hr: s.NH, sq: s.SQ, rel: s.REL, comp: s.COMP };
}

const STATUS_LABEL: Record<string, ClaimStatus> = {
  source_mapping_required: "Source Mapping Required",
  ready: "Ready for Annotation",
  in_annotation: "In Annotation",
  submitted: "Submitted",
  returned: "Returned",
  approved: "Approved",
  pre_scoring_failed: "Source Mapping Required",
};
function mapStatus(s: string): ClaimStatus {
  return STATUS_LABEL[s] ?? "Ready for Annotation";
}

function citationToArray(m: string | null | undefined): string[] {
  if (!m) return [];
  return m.split(";").map((s) => s.trim()).filter(Boolean);
}

function mapSource(s: SourceRefOutBE): SourceRef {
  return {
    sourceId: s.source_id,
    url: s.source_url,
    citationMarker: s.citation_marker,
    accessStatus: s.access_status,
  };
}

function normalizeRole(role: string | null): UserAccount["role"] {
  if (role === "ADMIN" || role === "ANNOTATOR" || role === "QA") return role;
  return "";
}

/** UI source status (6 trạng thái docs) → BE enum (4). */
export function toSourceAccessStatus(ui: string): string {
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
}

/** UI error type → BE error_category enum. */
export function toErrorCategory(ui: string): string {
  const map: Record<string, string> = {
    "Factual Error": "factual_error",
    "Guideline Violation": "guideline_violation",
    "Source Mismatch": "source_mismatch",
    Incomplete: "incomplete",
    Other: "other",
  };
  return map[ui] || "other";
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function fetchMyTasks(): Promise<ClaimTask[]> {
  const res = await apiFetch<ListEnvelope<TaskListItemBE>>("/tasks");
  return res.items.map(listItemToTask);
}

function listItemToTask(item: TaskListItemBE): ClaimTask {
  return {
    id: item.claim_id,
    parentTaskId: item.parent_task_id,
    articleCode: item.article_code || "",
    title: item.title || "",
    sectionName: item.section_name || "",
    claimText: item.claim_text,
    status: mapStatus(item.status),
    submittedAt: item.submitted_at || "",
    citationMarkers: [],
    answerContext: "",
    pre: { ...ZERO_SCORES },
    ann: { ...ZERO_SCORES },
    sourceAccessStatus: "",
    annotatorNote: "",
    reason: "",
    sources: [],
    annotatorId: "",
  };
}

export async function fetchTaskDetail(claimId: string): Promise<ClaimTask> {
  const d = await apiFetch<TaskDetailOutBE>(`/tasks/${claimId}`);
  const pre = scoreBlockToDims(d.pre_score);
  return {
    id: d.claim_id,
    parentTaskId: d.parent_task_id,
    articleCode: d.article_code || "",
    title: d.title || "",
    sectionName: d.section_name || "",
    claimText: d.claim_text,
    status: mapStatus(d.status),
    submittedAt: d.submitted_at || "",
    citationMarkers: citationToArray(d.citation_markers),
    answerContext: d.answer_context || "",
    pre,
    ann: d.draft?.scores ? scoreBlockToDims(d.draft.scores) : pre,
    sourceAccessStatus: d.draft?.source_access_status || "",
    annotatorNote: d.draft?.annotator_note || "",
    reason: "",
    sources: d.sources.map(mapSource),
    annotatorId: "",
  };
}

export async function fetchQaQueue(): Promise<ClaimTask[]> {
  const res = await apiFetch<ListEnvelope<TaskListItemBE & { annotator_id: string | null }>>(
    "/qa-reviews/queue"
  );
  return res.items.map((item) => ({
    ...listItemToTask(item),
    status: "Submitted" as ClaimStatus,
    annotatorId: item.annotator_id || "",
  }));
}

export async function fetchQaReviewDetail(claimId: string): Promise<ClaimTask> {
  const d = await apiFetch<ReviewDetailOutBE>(`/qa-reviews/${claimId}`);
  const pre = { ...ZERO_SCORES };
  const ann = { ...ZERO_SCORES };
  for (const row of d.score_diff) {
    const dim = DIM_BY_KEY[row.dimension];
    if (!dim) continue;
    pre[dim] = row.pre_score ?? 0;
    ann[dim] = row.annotator_score;
  }
  const reason = d.justifications
    ? Object.entries(d.justifications)
        .filter(([, v]) => !!v)
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join(" · ")
    : "";
  return {
    id: d.claim_id,
    parentTaskId: "",
    articleCode: d.article_code || "",
    title: d.title || "",
    sectionName: d.section_name || "",
    claimText: d.claim_text,
    status: "Submitted",
    submittedAt: "",
    citationMarkers: citationToArray(d.citation_markers),
    answerContext: d.answer_context || "",
    pre,
    ann,
    sourceAccessStatus: d.source_access_status || "",
    annotatorNote: d.annotator_note || "",
    reason,
    sources: [],
    annotatorId: "",
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await apiFetch<Page<ProjectOutBE>>("/projects");
  return res.items.map((p) => ({
    id: p.id,
    code: p.project_code,
    name: p.project_name,
    status: p.status,
    deadline: p.deadline || "",
    createdAt: p.created_at,
    memberCount: p.member_count,
  }));
}

export async function fetchProjectOptions(): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch<Page<ProjectOutBE>>("/projects");
  return res.items.map((p) => ({ id: p.id, name: p.project_name }));
}

export async function fetchAuditLogs(): Promise<AuditLogRow[]> {
  const res = await apiFetch<{ items: AuditLogOutBE[]; total: number }>("/audit-logs");
  return res.items.map((a) => ({
    id: a.id,
    userId: a.user_id || "system",
    userRole: a.user_role || "",
    entity: a.entity_id ? `${a.entity_type}:${a.entity_id}` : a.entity_type,
    action: a.action_type,
    description: a.description || a.reason || "",
    timestamp: a.timestamp,
  }));
}

export async function fetchUsers(): Promise<UserAccount[]> {
  const res = await apiFetch<UserOutBE[]>("/users");
  return res.map((u) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    role: normalizeRole(u.role),
    status: u.status === "active" ? "Đang hoạt động" : "Bị khóa",
  }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
export interface SubmitPayload {
  scores: Record<Dimension, number>;
  pre: Record<Dimension, number>;
  sourceStatusUi: string;
  annotatorNote: string;
  reason: string;
}

/** PUT /tasks/{id}/autosave — draft (không bắt buộc đủ chiều). */
export async function autosaveTask(claimId: string, p: SubmitPayload): Promise<void> {
  await apiFetch<{ claim_id: string; saved_at: string }>(`/tasks/${claimId}/autosave`, {
    method: "PUT",
    body: JSON.stringify({
      scores: dimsToScoreBlock(p.scores),
      source_access_status: toSourceAccessStatus(p.sourceStatusUi),
      annotator_note: p.annotatorNote || null,
    }),
  });
}

/** POST /tasks/{id}/submit — đủ 6 chiều + justification khi |delta|>=0.20. */
export async function submitTask(claimId: string, p: SubmitPayload): Promise<void> {
  const justifications: Record<string, string | null> = {};
  for (const [be, ui] of Object.entries(DIM_BY_KEY)) {
    const delta = Math.abs((p.scores[ui] ?? 0) - (p.pre[ui] ?? 0));
    justifications[be] = delta >= 0.2 ? p.reason || null : null;
  }
  await apiFetch<unknown>(`/tasks/${claimId}/submit`, {
    method: "POST",
    body: JSON.stringify({
      scores: dimsToScoreBlock(p.scores),
      source_access_status: toSourceAccessStatus(p.sourceStatusUi),
      annotator_note: p.annotatorNote || null,
      justifications,
    }),
  });
}

export async function approveClaim(claimId: string, comment?: string): Promise<void> {
  await apiFetch<unknown>(`/qa-reviews/${claimId}/approve`, {
    method: "POST",
    body: JSON.stringify({ qa_comment: comment || null }),
  });
}

export async function returnClaim(claimId: string, errorTypeUi: string, comment: string): Promise<void> {
  await apiFetch<unknown>(`/qa-reviews/${claimId}/return`, {
    method: "POST",
    body: JSON.stringify({ error_category: toErrorCategory(errorTypeUi), qa_comment: comment }),
  });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiFetch<void>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

// ---- Users (Admin tạo) ----
export interface CreateUserInput {
  email: string;
  fullName: string;
  tempPassword: string;
  role: Role;
  projectIds: string[];
}
export async function createUser(input: CreateUserInput): Promise<UserAccount> {
  const res = await apiFetch<UserOutBE>("/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      full_name: input.fullName,
      temp_password: input.tempPassword,
      role: input.role,
      project_ids: input.projectIds,
    }),
  });
  return {
    id: res.id,
    name: res.full_name,
    email: res.email,
    role: normalizeRole(res.role),
    status: res.status === "active" ? "Đang hoạt động" : "Bị khóa",
  };
}

// ---- Import bundle (4 bước) + create project ----
export interface CreateProjectInput {
  projectCode: string;
  projectName: string;
  description: string;
  deadline: string;
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
  promptTemplate: string;
}
export async function createProject(input: CreateProjectInput): Promise<{ id: string; name: string }> {
  const res = await apiFetch<ProjectOutBE>("/projects", {
    method: "POST",
    body: JSON.stringify({
      project_code: input.projectCode,
      project_name: input.projectName,
      description: input.description || null,
      deadline: input.deadline || null,
      llm_config: {
        endpoint: input.llmEndpoint,
        api_key: input.llmApiKey,
        model: input.llmModel,
        prompt_template: input.promptTemplate,
      },
    }),
  });
  return { id: res.id, name: res.project_name };
}

export type FileRole = "answer_pdf" | "source_ref_pdf" | "source_content_pdf";
export interface UploadedFile {
  fileId: string;
  filename: string;
  fileRole: FileRole;
  uploadToken: string;
}
export async function uploadBundleFile(file: File, fileRole: FileRole, projectId: string): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("file_role", fileRole);
  form.append("project_id", projectId);
  // multipart: KHÔNG dùng apiFetch (nó set Content-Type json) → fetch trực tiếp.
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/v1/import-bundles/upload-file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const b = await res.json();
      msg = b?.error?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const b = await res.json();
  return { fileId: b.file_id, filename: b.original_filename, fileRole: b.file_role, uploadToken: b.upload_token };
}

function tokensQuery(tokens: string[]): string {
  return tokens.map((t) => `upload_tokens=${encodeURIComponent(t)}`).join("&");
}

export interface ValidateResult {
  isValid: boolean;
  files: { filename: string; fileRole: string; isValid: boolean; errors: string[] }[];
  errors: string[];
  warnings: string[];
}
export async function validateBundle(projectId: string, tokens: string[], bundleName: string): Promise<ValidateResult> {
  const res = await apiFetch<{
    is_valid: boolean;
    files: { original_filename: string; file_role: string; is_valid: boolean; errors: string[] }[];
    errors: string[];
    warnings: string[];
  }>(`/import-bundles/validate?${tokensQuery(tokens)}`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, upload_token: tokens[0], bundle_name: bundleName }),
  });
  return {
    isValid: res.is_valid,
    files: res.files.map((f) => ({ filename: f.original_filename, fileRole: f.file_role, isValid: f.is_valid, errors: f.errors })),
    errors: res.errors,
    warnings: res.warnings,
  };
}

export interface PreviewResult {
  title: string;
  domainKey: string;
  domainName: string;
  totalClaimCandidates: number;
  sourceRefCount: number;
  sections: { heading: string; claimCount: number; sampleClaims: string[] }[];
  warnings: { code: string; message: string }[];
}
export async function previewBundle(projectId: string, tokens: string[]): Promise<PreviewResult> {
  const res = await apiFetch<{
    title: string;
    total_claim_candidates: number;
    source_ref_count: number;
    sections: { heading: string; claim_count: number; sample_claims: string[] }[];
    metadata: Record<string, unknown>;
    warnings: { warning_code: string; message: string }[];
  }>(`/import-bundles/preview?${tokensQuery(tokens)}`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, upload_token: tokens[0] }),
  });
  return {
    title: res.title,
    domainKey: String(res.metadata?.domain_key ?? ""),
    domainName: String(res.metadata?.domain_name ?? ""),
    totalClaimCandidates: res.total_claim_candidates,
    sourceRefCount: res.source_ref_count,
    sections: res.sections.map((s) => ({ heading: s.heading, claimCount: s.claim_count, sampleClaims: s.sample_claims })),
    warnings: res.warnings.map((w) => ({ code: w.warning_code, message: w.message })),
  };
}

export interface ConfirmResult {
  bundleId: string;
  status: string;
  message: string;
}
export async function confirmImport(projectId: string, tokens: string[], bundleName: string, batchName: string): Promise<ConfirmResult> {
  const res = await apiFetch<{ bundle_id: string; status: string; message: string }>(
    `/import-bundles/confirm?${tokensQuery(tokens)}`,
    {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, upload_token: tokens[0], bundle_name: bundleName, batch_name: batchName }),
    }
  );
  return { bundleId: res.bundle_id, status: res.status, message: res.message };
}

export interface BundleStatus {
  bundleStatus: string;
  errorDetail: string | null;
  fileCount: number;
}
export async function getBundleStatus(bundleId: string): Promise<BundleStatus> {
  const res = await apiFetch<{ bundle_status: string; error_detail: string | null; file_count: number }>(
    `/import-bundles/${bundleId}/status`
  );
  return { bundleStatus: res.bundle_status, errorDetail: res.error_detail, fileCount: res.file_count };
}

// ---- Export CSV (blob) ----
export async function downloadExportCsv(projectId: string, batchId?: string): Promise<void> {
  const token = getToken();
  const q = batchId ? `?batch_id=${encodeURIComponent(batchId)}` : "";
  const res = await fetch(`${BASE_URL}/api/v1/exports/${projectId}/download${q}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const b = await res.json();
      msg = b?.error?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "export.csv";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
