/**
 * Lớp adapter: map response Backend (snake_case, shape Pydantic) → type Frontend
 * (camelCase, shape UI). Tập trung mọi ánh xạ ở đây để component giữ nguyên type cũ.
 *
 * Nguồn chân lý shape BE: docs/api/API_Integration_Guide.md + backend feature schemas.py
 */
import { apiClient } from "./client";
import {
  ClaimTask,
  Dimension,
  Project,
  AuditLog,
  UserAccount,
  Source,
} from "../types";

// ---------------------------------------------------------------------------
// Kiểu response BE (chỉ khai báo field FE dùng tới)
// ---------------------------------------------------------------------------

interface Page<T> {
  items: T[];
  meta?: { total: number; limit: number; offset: number };
}

interface ListEnvelope<T> {
  items: T[];
  total: number;
}

interface ProjectOutBE {
  id: string;
  project_code: string;
  project_name: string;
  description: string | null;
  modality: string;
  status: string;
  deadline: string | null;
  created_at: string;
  member_count: number;
  llm_config: {
    endpoint: string | null;
    api_key_masked: string;
    model: string | null;
    is_configured: boolean;
  };
}

interface ScoreBlockBE {
  sf: number;
  sc: number;
  hr: number; // NH trong UI
  sq: number;
  rel: number;
  comp: number;
}

interface PreScoreOutBE extends ScoreBlockBE {
  pre_score_id: string;
  provider: string;
  model: string;
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
  project_id: string | null;
  project_name: string | null;
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
    saved_at: string | null;
  } | null;
}

interface ReviewDetailOutBE {
  claim_id: string;
  claim_order: number;
  claim_text: string;
  section_name: string | null;
  citation_markers: string | null;
  article_code: string | null;
  title: string | null;
  project_name: string | null;
  submitted_at: string | null;
  annotator_email: string | null;
  answer_context: string | null;
  score_diff: {
    dimension: string;
    pre_score: number | null;
    annotator_score: number;
    delta: number;
    needs_justification: boolean;
  }[];
  composite_pre: number | null;
  composite_annotator: number | null;
  source_access_status: string | null;
  annotator_note: string | null;
  justifications: Record<string, string | null> | null;
}

interface AuditLogOutBE {
  id: string;
  project_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  entity_type: string;
  entity_id: string | null;
  action_type: string;
  description: string | null;
  reason: string | null;
  client_ip: string | null;
  timestamp: string;
}

interface UserOutBE {
  id: string;
  email: string;
  full_name: string;
  status: string;
  role: string | null; // default_role (1 user = 1 role); null nếu user cũ chưa set
  last_login_at: string | null;
}

// ---------------------------------------------------------------------------
// Map helpers
// ---------------------------------------------------------------------------

const ZERO_SCORES: Record<Dimension, number> = {
  SF: 0,
  SC: 0,
  NH: 0,
  SQ: 0,
  REL: 0,
  COMP: 0,
};

/** BE ScoreBlock (sf/sc/hr/sq/rel/comp) → FE Record<Dimension> (SF/SC/NH/SQ/REL/COMP). */
function scoreBlockToDimensions(block: ScoreBlockBE | null | undefined): Record<Dimension, number> {
  if (!block) return { ...ZERO_SCORES };
  return {
    SF: block.sf,
    SC: block.sc,
    NH: block.hr,
    SQ: block.sq,
    REL: block.rel,
    COMP: block.comp,
  };
}

/** FE Record<Dimension> → BE ScoreBlock (gửi lên autosave/submit). */
export function dimensionsToScoreBlock(scores: Record<Dimension, number>): ScoreBlockBE {
  return {
    sf: scores.SF,
    sc: scores.SC,
    hr: scores.NH,
    sq: scores.SQ,
    rel: scores.REL,
    comp: scores.COMP,
  };
}

/** UI source status (6 trạng thái Screen Spec) → BE enum (4). */
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

/** UI error type → BE error_category. */
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

const _DIM_BE: { ui: Dimension; be: string }[] = [
  { ui: "SF", be: "sf" }, { ui: "SC", be: "sc" }, { ui: "NH", be: "hr" },
  { ui: "SQ", be: "sq" }, { ui: "REL", be: "rel" }, { ui: "COMP", be: "comp" },
];

/** POST /tasks/{id}/submit từ ClaimTask FE — map scores + justification >=0.20. */
export async function submitTaskFromClaim(task: ClaimTask): Promise<void> {
  const justifications: Record<string, string | null> = {};
  for (const { ui, be } of _DIM_BE) {
    const delta = Math.abs((task.ann[ui] ?? 0) - (task.pre[ui] ?? 0));
    justifications[be] = delta >= 0.2 ? task.reason || null : null;
  }
  await apiClient.post(`/tasks/${task.id}/submit`, {
    scores: dimensionsToScoreBlock(task.ann),
    source_access_status: toSourceAccessStatus(task.sourceStatus),
    annotator_note: task.notes || null,
    justifications,
  });
}

export async function approveClaim(claimId: string, comment?: string): Promise<void> {
  await apiClient.post(`/qa-reviews/${claimId}/approve`, { qa_comment: comment || null });
}

export async function returnClaim(claimId: string, errorTypeUi: string, comment: string): Promise<void> {
  await apiClient.post(`/qa-reviews/${claimId}/return`, {
    error_category: toErrorCategory(errorTypeUi),
    qa_comment: comment,
  });
}

/** BE claim status (snake) → FE label hiển thị. */
const STATUS_LABEL: Record<string, ClaimTask["status"]> = {
  source_mapping_required: "Source Mapping Required",
  ready: "Ready for Annotation",
  in_annotation: "In Annotation",
  submitted: "Submitted",
  returned: "Returned",
  approved: "Approved",
  // pre_scoring_failed: không có nhãn UI riêng → hiển thị như Source Mapping Required
  pre_scoring_failed: "Source Mapping Required",
};

function mapStatus(beStatus: string): ClaimTask["status"] {
  return STATUS_LABEL[beStatus] ?? "Ready for Annotation";
}

/** ClaimTask rỗng với mọi field bắt buộc — mapper chỉ ghi đè field BE có. */
function emptyClaimTask(id: string): ClaimTask {
  return {
    id,
    answerId: "",
    bundleId: "",
    projectId: "",
    projectName: "",
    articleCode: "",
    title: "",
    category: "",
    tier: "",
    confidenceScore: 0,
    sectionName: "",
    citationMarkers: [],
    mappedSourceOrders: [],
    answerPdf: "",
    status: "Ready for Annotation",
    domain: "",
    annotator: "",
    qa: "",
    submittedAt: "",
    returnCount: 0,
    question: "",
    answer: "",
    claimOriginal: "",
    claimFinal: "",
    edited: false,
    pre: { ...ZERO_SCORES },
    ann: { ...ZERO_SCORES },
    sourceStatus: "",
    sourceNote: "",
    reason: "",
    notes: "",
    sources: [],
    urls: [],
    qaComment: "",
  };
}

function citationMarkersToArray(markers: string | null | undefined): string[] {
  if (!markers) return [];
  // BE lưu "1;3" → ["1", "3"]
  return markers
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapSourceRef(src: SourceRefOutBE, idx: number): Source {
  return {
    order: idx + 1,
    title: src.citation_marker || `Nguồn ${idx + 1}`,
    tier: "",
    url: src.source_url,
    file: src.source_id,
    parseStatus: "parsed",
    text: "",
  };
}

// ---------------------------------------------------------------------------
// API calls (đã map sẵn sang type FE)
// ---------------------------------------------------------------------------

/** GET /tasks — danh sách claim của annotator (đã map). */
export async function fetchMyTasks(): Promise<ClaimTask[]> {
  const res = await apiClient.get<ListEnvelope<TaskListItemBE>>("/tasks");
  return res.items.map((item) => {
    const task = emptyClaimTask(item.claim_id);
    task.articleCode = item.article_code || "";
    task.title = item.title || "";
    task.projectId = item.project_id || "";
    task.projectName = item.project_name || "";
    task.sectionName = item.section_name || "";
    task.question = item.claim_text;
    task.claimOriginal = item.claim_text;
    task.claimFinal = item.claim_text;
    task.status = mapStatus(item.status);
    task.submittedAt = item.submitted_at || "";
    task.answerId = item.parent_task_id;
    return task;
  });
}

/** GET /tasks/{id} — chi tiết claim + pre_score + sources (đã map, đầy đủ hơn list). */
export async function fetchTaskDetail(claimId: string): Promise<ClaimTask> {
  const d = await apiClient.get<TaskDetailOutBE>(`/tasks/${claimId}`);
  const task = emptyClaimTask(d.claim_id);
  task.articleCode = d.article_code || "";
  task.title = d.title || "";
  task.projectName = d.project_name || "";
  task.sectionName = d.section_name || "";
  task.question = d.claim_text;
  task.claimOriginal = d.claim_text;
  task.claimFinal = d.draft?.annotator_note ? d.claim_text : d.claim_text;
  task.answer = d.answer_context || "";
  task.status = mapStatus(d.status);
  task.submittedAt = d.submitted_at || "";
  task.answerId = d.parent_task_id;
  task.citationMarkers = citationMarkersToArray(d.citation_markers);
  task.pre = scoreBlockToDimensions(d.pre_score);
  // Draft (nếu annotator đang làm dở) → đổ vào ann; nếu chưa có draft, ann = pre làm điểm khởi đầu.
  task.ann = d.draft?.scores ? scoreBlockToDimensions(d.draft.scores) : scoreBlockToDimensions(d.pre_score);
  task.sourceStatus = d.draft?.source_access_status || "";
  task.notes = d.draft?.annotator_note || "";
  task.sources = d.sources.map(mapSourceRef);
  task.urls = d.sources.map((s) => s.source_url).filter((u): u is string => !!u);
  return task;
}

interface QaQueueItemBE extends TaskListItemBE {
  annotator_id: string | null;
  annotator_email: string | null;
  annotator_name: string | null;
  composite_annotator: number | null;
}

/** GET /qa-reviews/queue — hàng đợi QA (đã map). */
export async function fetchQaQueue(): Promise<ClaimTask[]> {
  const res = await apiClient.get<ListEnvelope<QaQueueItemBE>>("/qa-reviews/queue");
  return res.items.map((item) => {
    const task = emptyClaimTask(item.claim_id);
    task.articleCode = item.article_code || "";
    task.title = item.title || "";
    task.projectId = item.project_id || "";
    task.projectName = item.project_name || "";
    task.sectionName = item.section_name || "";
    task.question = item.claim_text;
    task.claimOriginal = item.claim_text;
    task.claimFinal = item.claim_text;
    task.status = "Submitted";
    task.submittedAt = item.submitted_at || "";
    task.answerId = item.parent_task_id;
    // Ưu tiên email (rõ) → tên → UUID.
    task.annotator = item.annotator_email || item.annotator_name || item.annotator_id || "";
    task.compositeAnnotator = item.composite_annotator ?? null;
    return task;
  });
}

/** GET /qa-reviews/{id} — diff view (đã map pre/ann/delta + sources). */
export async function fetchQaReviewDetail(claimId: string): Promise<ClaimTask> {
  const d = await apiClient.get<ReviewDetailOutBE>(`/qa-reviews/${claimId}`);
  const task = emptyClaimTask(d.claim_id);
  task.articleCode = d.article_code || "";
  task.title = d.title || "";
  task.projectName = d.project_name || "";
  task.submittedAt = d.submitted_at || "";
  task.annotator = d.annotator_email || "";
  task.sectionName = d.section_name || "";
  task.question = d.claim_text;
  task.claimOriginal = d.claim_text;
  task.claimFinal = d.claim_text;
  task.answer = d.answer_context || "";
  task.status = "Submitted";
  task.citationMarkers = citationMarkersToArray(d.citation_markers);
  task.sourceStatus = d.source_access_status || "";
  task.notes = d.annotator_note || "";

  // score_diff[] → pre + ann theo từng dimension (key BE: sf/sc/hr/sq/rel/comp)
  const dimByKey: Record<string, Dimension> = {
    sf: "SF",
    sc: "SC",
    hr: "NH",
    sq: "SQ",
    rel: "REL",
    comp: "COMP",
  };
  const pre = { ...ZERO_SCORES };
  const ann = { ...ZERO_SCORES };
  for (const row of d.score_diff) {
    const dim = dimByKey[row.dimension];
    if (!dim) continue;
    pre[dim] = row.pre_score ?? 0;
    ann[dim] = row.annotator_score;
  }
  task.pre = pre;
  task.ann = ann;

  // Lý do (justification) gộp lại thành 1 chuỗi hiển thị
  if (d.justifications) {
    task.reason = Object.entries(d.justifications)
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
      .join(" · ");
  }
  return task;
}

/** GET /projects — lấy project đầu tiên (MVP single project), đã map. */
export interface Paged<T> { items: T[]; total: number; limit: number; offset: number }

function mapProjectOut(p: ProjectOutBE): Project {
  return {
    id: p.id,
    name: p.project_name,
    batch: "", bundleId: "", bundleName: "", importType: "pdf_bundle",
    answerPdf: "", sourceRefPdf: "", sourceContentPdfs: [],
    status: p.status === "active" ? "Active"
      : p.status === "completed" ? "Completed"
      : p.status === "draft" ? "Draft" : "Pending",
    createdAt: p.created_at, deadline: p.deadline || "", owner: "", annotators: [], qa: "",
  };
}

/** GET /projects phân trang. */
export async function fetchProjectsPaged(limit = 10, offset = 0): Promise<Paged<Project>> {
  const res = await apiClient.get<Page<ProjectOutBE>>(`/projects?limit=${limit}&offset=${offset}`);
  return {
    items: res.items.map(mapProjectOut),
    total: res.meta?.total ?? res.items.length,
    limit, offset,
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await apiClient.get<Page<ProjectOutBE>>("/projects");
  return res.items.map((p) => ({
    id: p.id,
    name: p.project_name,
    batch: "",
    bundleId: "",
    bundleName: "",
    importType: "pdf_bundle",
    answerPdf: "",
    sourceRefPdf: "",
    sourceContentPdfs: [],
    status: p.status === "active" ? "Active" : p.status === "completed" ? "Completed" : "Pending",
    createdAt: p.created_at,
    deadline: p.deadline || "",
    owner: "",
    annotators: [],
    qa: "",
  }));
}

function mapAudit(a: AuditLogOutBE): AuditLog {
  return {
    id: a.id,
    // Ưu tiên email (rõ), rồi tên, cuối cùng "Hệ thống" cho hành động tự động.
    user: a.user_email || a.user_name || "Hệ thống",
    userRole: a.user_role || "",
    action: a.action_type,
    entity: a.entity_id ? `${a.entity_type}:${a.entity_id}` : a.entity_type,
    time: a.timestamp,
    detail: a.description || a.reason || "",
  };
}

/** GET /audit-logs — đã map sang shape FE AuditLog. */
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await apiClient.get<{ items: AuditLogOutBE[]; total: number }>("/audit-logs");
  return res.items.map(mapAudit);
}

/** GET /audit-logs phân trang. */
export async function fetchAuditLogsPaged(limit = 10, offset = 0): Promise<Paged<AuditLog>> {
  const res = await apiClient.get<{ items: AuditLogOutBE[]; total: number }>(
    `/audit-logs?limit=${limit}&offset=${offset}`
  );
  return { items: res.items.map(mapAudit), total: res.total ?? res.items.length, limit, offset };
}

/** Chuẩn hóa role BE (string|null) → UserRole | "" cho FE. */
function normalizeRole(role: string | null): UserAccount["role"] {
  if (role === "ADMIN" || role === "ANNOTATOR" || role === "QA") return role;
  return "";
}

function mapUser(u: UserOutBE): UserAccount {
  return {
    name: u.full_name,
    email: u.email,
    role: normalizeRole(u.role),
    status: u.status === "active" ? "Đang hoạt động" : "Bị khóa",
  };
}

/** GET /users — đã map sang shape FE UserAccount (role = default_role). */
export async function fetchUsers(): Promise<UserAccount[]> {
  const res = await apiClient.get<UserOutBE[]>("/users");
  return res.map(mapUser);
}

/** GET /users phân trang. BE trả mảng (chưa có total) → fetch limit+1 để biết còn trang sau. */
export async function fetchUsersPaged(
  limit = 10, offset = 0
): Promise<{ items: UserAccount[]; hasMore: boolean; limit: number; offset: number }> {
  const res = await apiClient.get<UserOutBE[]>(`/users?limit=${limit + 1}&offset=${offset}`);
  const hasMore = res.length > limit;
  return { items: res.slice(0, limit).map(mapUser), hasMore, limit, offset };
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  tempPassword: string;
  role: "ADMIN" | "ANNOTATOR" | "QA";
  projectIds: string[]; // 0..N
}

/** POST /users — Admin tạo user (role duy nhất, gán 0..N project). Trả UserAccount đã map. */
export async function createUser(input: CreateUserInput): Promise<UserAccount> {
  const res = await apiClient.post<UserOutBE>("/users", {
    email: input.email,
    full_name: input.fullName,
    temp_password: input.tempPassword,
    role: input.role,
    project_ids: input.projectIds,
  });
  return {
    name: res.full_name,
    email: res.email,
    role: normalizeRole(res.role),
    status: res.status === "active" ? "Đang hoạt động" : "Bị khóa",
  };
}

/** GET /projects — danh sách rút gọn {id, name} cho dropdown gán project. */
export async function fetchProjectOptions(): Promise<{ id: string; name: string }[]> {
  const res = await apiClient.get<Page<ProjectOutBE>>("/projects");
  return res.items.map((p) => ({ id: p.id, name: p.project_name }));
}

/** POST /auth/change-password → 204. Ném ApiError nếu sai mật khẩu cũ / new yếu. */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiClient.post<void>("/auth/change-password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

// ---------------------------------------------------------------------------
// Import bundle flow (4 bước) + tạo project
// ---------------------------------------------------------------------------

export interface CreateProjectInput {
  projectName: string;
  description: string;
  startDate: string; // "YYYY-MM-DD" hoặc ""
  deadline: string; // "YYYY-MM-DD" hoặc ""
}

/** POST /projects — tạo project. Mã tự sinh phía BE; LLM config lấy từ .env. */
export async function createProject(input: CreateProjectInput): Promise<{ id: string; name: string }> {
  const body = {
    project_name: input.projectName,
    description: input.description || null,
    start_date: input.startDate || null,
    deadline: input.deadline || null,
  };
  const res = await apiClient.post<ProjectOutBE>("/projects", body);
  return { id: res.id, name: res.project_name };
}

/** DELETE /projects/{id} — xóa project (BE chặn nếu đã có claim → 409). */
export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.del(`/projects/${projectId}`);
}

// ---- Dashboard ADMIN stats ----
export interface AdminStats {
  users: { total: number; admin: number; annotator: number; qa: number };
  projects: { total: number; active: number; draft: number };
  claims: { total: number; ready: number; in_annotation: number; submitted: number; returned: number; approved: number };
  auditCount: number;
}

/** GET /admin/stats — thống kê tổng quan toàn hệ thống cho Dashboard ADMIN. */
export async function fetchAdminStats(): Promise<AdminStats> {
  const r = await apiClient.get<{
    users: AdminStats["users"];
    projects: AdminStats["projects"];
    claims: AdminStats["claims"];
    audit_count: number;
  }>("/admin/stats");
  return {
    users: r.users,
    projects: r.projects,
    claims: r.claims,
    auditCount: r.audit_count,
  };
}

export type FileRole = "answer_pdf" | "source_ref_pdf" | "source_content_pdf";

export interface UploadedFile {
  fileId: string;
  filename: string;
  fileRole: FileRole;
  sizeBytes: number;
  uploadToken: string;
}

/** POST /import-bundles/upload-file (multipart) — upload 1 file, trả upload_token. */
export async function uploadBundleFile(
  file: File,
  fileRole: FileRole,
  projectId: string
): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("file_role", fileRole);
  form.append("project_id", projectId);
  const res = await apiClient.post<{
    file_id: string;
    original_filename: string;
    file_role: FileRole;
    file_size_bytes: number;
    upload_token: string;
  }>("/import-bundles/upload-file", form);
  return {
    fileId: res.file_id,
    filename: res.original_filename,
    fileRole: res.file_role,
    sizeBytes: res.file_size_bytes,
    uploadToken: res.upload_token,
  };
}

/** Ghép query ?upload_tokens=T1&upload_tokens=T2... */
function uploadTokensQuery(tokens: string[]): string {
  return tokens.map((t) => `upload_tokens=${encodeURIComponent(t)}`).join("&");
}

export interface ValidateResult {
  isValid: boolean;
  files: { filename: string; fileRole: string; isValid: boolean; errors: string[] }[];
  errors: string[];
  warnings: string[];
}

/** POST /import-bundles/validate?upload_tokens=... */
export async function validateBundle(
  projectId: string,
  tokens: string[],
): Promise<ValidateResult> {
  const res = await apiClient.post<{
    is_valid: boolean;
    files: { original_filename: string; file_role: string; is_valid: boolean; errors: string[] }[];
    errors: string[];
    warnings: string[];
  }>(`/import-bundles/validate?${uploadTokensQuery(tokens)}`, {
    project_id: projectId,
    upload_token: tokens[0],
    bundle_name: "", // BE tự sinh
  });
  return {
    isValid: res.is_valid,
    files: res.files.map((f) => ({
      filename: f.original_filename,
      fileRole: f.file_role,
      isValid: f.is_valid,
      errors: f.errors,
    })),
    errors: res.errors,
    warnings: res.warnings,
  };
}

export interface PreviewResult {
  title: string;
  articleCode: string | null;
  domainKey: string;
  domainName: string;
  totalSections: number;
  totalClaimCandidates: number;
  sourceRefCount: number;
  sections: { heading: string; claimCount: number; sampleClaims: string[] }[];
  sourceRefs: { index: number; url: string; sourceText: string; page: number }[];
  warnings: { code: string; message: string }[];
}

/** POST /import-bundles/preview?upload_tokens=... */
export async function previewBundle(projectId: string, tokens: string[]): Promise<PreviewResult> {
  const res = await apiClient.post<{
    title: string;
    article_code: string | null;
    total_sections: number;
    total_claim_candidates: number;
    source_ref_count: number;
    sections: { heading: string; claim_count: number; sample_claims: string[] }[];
    source_refs: { index: number; url: string; source_text: string; page: number }[];
    metadata: Record<string, unknown>;
    warnings: { warning_code: string; message: string }[];
  }>(`/import-bundles/preview?${uploadTokensQuery(tokens)}`, {
    project_id: projectId,
    upload_token: tokens[0],
  });
  return {
    title: res.title,
    articleCode: res.article_code,
    domainKey: String(res.metadata?.domain_key ?? ""),
    domainName: String(res.metadata?.domain_name ?? ""),
    totalSections: res.total_sections,
    totalClaimCandidates: res.total_claim_candidates,
    sourceRefCount: res.source_ref_count,
    sections: res.sections.map((s) => ({
      heading: s.heading,
      claimCount: s.claim_count,
      sampleClaims: s.sample_claims,
    })),
    sourceRefs: res.source_refs.map((s) => ({
      index: s.index,
      url: s.url,
      sourceText: s.source_text,
      page: s.page,
    })),
    warnings: res.warnings.map((w) => ({ code: w.warning_code, message: w.message })),
  };
}

export interface ConfirmResult {
  bundleId: string;
  batchId: string;
  status: string;
  message: string;
  jobId: string | null;
}

/** POST /import-bundles/confirm?upload_tokens=... → 202 */
export async function confirmImport(
  projectId: string,
  tokens: string[],
): Promise<ConfirmResult> {
  const res = await apiClient.post<{
    bundle_id: string;
    batch_id: string;
    status: string;
    message: string;
    job_id: string | null;
  }>(`/import-bundles/confirm?${uploadTokensQuery(tokens)}`, {
    project_id: projectId,
    upload_token: tokens[0],
    bundle_name: "", // BE tự sinh
    batch_name: "",
  });
  return {
    bundleId: res.bundle_id,
    batchId: res.batch_id,
    status: res.status,
    message: res.message,
    jobId: res.job_id,
  };
}

export interface BundleStatus {
  bundleStatus: string; // uploaded | parsing | pre_scoring | done | failed
  title: string | null;
  articleCode: string | null;
  fileCount: number;
  errorDetail: string | null;
}

/** GET /exports/{project_id}/download — tải CSV blob và trigger download trên browser. */
export async function downloadExportCsv(projectId: string, batchId?: string): Promise<void> {
  const query = batchId ? `?batch_id=${encodeURIComponent(batchId)}` : "";
  const { blob, filename } = await apiClient.download(`/exports/${projectId}/download${query}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** GET /import-bundles/{bundle_id}/status — để poll. */
export async function getBundleStatus(bundleId: string): Promise<BundleStatus> {
  const res = await apiClient.get<{
    bundle_status: string;
    title: string | null;
    article_code: string | null;
    file_count: number;
    error_detail: string | null;
  }>(`/import-bundles/${bundleId}/status`);
  return {
    bundleStatus: res.bundle_status,
    title: res.title,
    articleCode: res.article_code,
    fileCount: res.file_count,
    errorDetail: res.error_detail,
  };
}

// ---------------------------------------------------------------------------
// Project detail: claims + gán annotator (B1 BE endpoints)
// ---------------------------------------------------------------------------
export interface ProjectClaim {
  claimId: string;
  claimOrder: number;
  sectionName: string;
  claimText: string;
  status: string;
  articleCode: string;
  assignedAnnotatorId: string | null;
  assignedAnnotatorEmail: string | null;
}

export interface ClaimStats {
  total: number; ready: number; in_annotation: number;
  submitted: number; returned: number; approved: number; unassigned: number;
}
export interface ProjectClaimsPage {
  items: ProjectClaim[];
  total: number;
  limit: number;
  offset: number;
  stats: ClaimStats;
}
export interface ClaimsQuery {
  limit?: number;
  offset?: number;
  status?: string;
  annotatorId?: string;
  unassigned?: boolean;
}

export async function fetchProjectClaims(
  projectId: string,
  q: ClaimsQuery = {}
): Promise<ProjectClaimsPage> {
  const params = new URLSearchParams();
  params.set("limit", String(q.limit ?? 10));
  params.set("offset", String(q.offset ?? 0));
  if (q.status) params.set("status", q.status);
  if (q.unassigned) params.set("unassigned", "true");
  else if (q.annotatorId) params.set("annotator_id", q.annotatorId);

  const res = await apiClient.get<{
    items: {
      claim_id: string; claim_order: number; section_name: string | null; claim_text: string;
      status: string; article_code: string | null;
      assigned_annotator_id: string | null; assigned_annotator_email: string | null;
    }[];
    total: number; limit: number; offset: number; stats: ClaimStats;
  }>(`/projects/${projectId}/claims?${params.toString()}`);

  return {
    items: res.items.map((c) => ({
      claimId: c.claim_id,
      claimOrder: c.claim_order,
      sectionName: c.section_name || "",
      claimText: c.claim_text,
      status: c.status,
      articleCode: c.article_code || "",
      assignedAnnotatorId: c.assigned_annotator_id,
      assignedAnnotatorEmail: c.assigned_annotator_email,
    })),
    total: res.total,
    limit: res.limit,
    offset: res.offset,
    stats: res.stats,
  };
}

/** Gán claim cho annotator. claimIds rỗng = gán tất cả. */
export async function assignClaims(
  projectId: string,
  annotatorId: string,
  claimIds: string[] = []
): Promise<number> {
  const res = await apiClient.post<{ assigned_count: number; annotator_id: string }>(
    `/projects/${projectId}/assign-claims`,
    { annotator_id: annotatorId, claim_ids: claimIds }
  );
  return res.assigned_count;
}

export interface ProjectMember {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface ProjectInfo {
  id: string;
  code: string;
  name: string;
  status: string;
  deadline: string;
  modality: string;
  llmModel: string | null;
  llmConfigured: boolean;
  memberCount: number;
  members: ProjectMember[];
}

interface ProjectDetailBE {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  deadline: string | null;
  modality: string;
  member_count: number;
  llm_config: { model: string | null; is_configured: boolean };
  members: { user_id: string; full_name: string; email: string; role: string; is_active: boolean }[];
}

/** GET /projects/{id} → thông tin đầy đủ + members. */
export async function fetchProjectDetail(projectId: string): Promise<ProjectInfo> {
  const r = await apiClient.get<ProjectDetailBE>(`/projects/${projectId}`);
  return {
    id: r.id,
    code: r.project_code,
    name: r.project_name,
    status: r.status,
    deadline: r.deadline || "",
    modality: r.modality,
    llmModel: r.llm_config?.model ?? null,
    llmConfigured: !!r.llm_config?.is_configured,
    memberCount: r.member_count,
    members: (r.members || []).map((m) => ({
      userId: m.user_id, fullName: m.full_name, email: m.email, role: m.role, isActive: m.is_active,
    })),
  };
}

/** Members đang active của project (cho dropdown gán annotator). */
export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const info = await fetchProjectDetail(projectId);
  return info.members.filter((m) => m.isActive);
}

/** POST /projects/{id}/assignments — gán user (đã có) vào project với role. */
export async function assignMembers(
  projectId: string,
  members: { userId: string; role: "ANNOTATOR" | "QA" }[]
): Promise<void> {
  await apiClient.post(`/projects/${projectId}/assignments`, {
    members: members.map((m) => ({ user_id: m.userId, role: m.role })),
  });
}

/** DELETE /projects/{id}/members/{userId} — gỡ thành viên khỏi project. */
export async function removeMember(projectId: string, userId: string): Promise<void> {
  await apiClient.del(`/projects/${projectId}/members/${userId}`);
}

export interface UserOption { id: string; email: string; role: string }

/** GET /users → option cho dropdown gán vào project. */
export async function fetchUserOptions(): Promise<UserOption[]> {
  const res = await apiClient.get<{ id: string; email: string; role: string | null }[]>("/users");
  return res.map((u) => ({ id: u.id, email: u.email, role: u.role || "" }));
}
