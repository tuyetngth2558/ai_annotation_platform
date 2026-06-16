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

/** GET /qa-reviews/queue — hàng đợi QA (đã map). */
export async function fetchQaQueue(): Promise<ClaimTask[]> {
  const res = await apiClient.get<ListEnvelope<TaskListItemBE & { annotator_id: string | null }>>(
    "/qa-reviews/queue"
  );
  return res.items.map((item) => {
    const task = emptyClaimTask(item.claim_id);
    task.articleCode = item.article_code || "";
    task.title = item.title || "";
    task.sectionName = item.section_name || "";
    task.question = item.claim_text;
    task.claimOriginal = item.claim_text;
    task.claimFinal = item.claim_text;
    task.status = "Submitted";
    task.submittedAt = item.submitted_at || "";
    task.answerId = item.parent_task_id;
    task.annotator = item.annotator_id || "";
    return task;
  });
}

/** GET /qa-reviews/{id} — diff view (đã map pre/ann/delta + sources). */
export async function fetchQaReviewDetail(claimId: string): Promise<ClaimTask> {
  const d = await apiClient.get<ReviewDetailOutBE>(`/qa-reviews/${claimId}`);
  const task = emptyClaimTask(d.claim_id);
  task.articleCode = d.article_code || "";
  task.title = d.title || "";
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

/** GET /audit-logs — đã map sang shape FE AuditLog. */
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await apiClient.get<{ items: AuditLogOutBE[]; total: number }>("/audit-logs");
  return res.items.map((a) => ({
    id: a.id,
    user: a.user_id || "system",
    action: a.action_type,
    entity: a.entity_id ? `${a.entity_type}:${a.entity_id}` : a.entity_type,
    time: a.timestamp,
    detail: a.description || a.reason || "",
  }));
}

/** Chuẩn hóa role BE (string|null) → UserRole | "" cho FE. */
function normalizeRole(role: string | null): UserAccount["role"] {
  if (role === "ADMIN" || role === "ANNOTATOR" || role === "QA") return role;
  return "";
}

/** GET /users — đã map sang shape FE UserAccount (role = default_role). */
export async function fetchUsers(): Promise<UserAccount[]> {
  const res = await apiClient.get<UserOutBE[]>("/users");
  return res.map((u) => ({
    name: u.full_name,
    email: u.email,
    role: normalizeRole(u.role),
    status: u.status === "active" ? "Đang hoạt động" : "Bị khóa",
  }));
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
  projectCode: string;
  projectName: string;
  description: string;
  deadline: string; // "YYYY-MM-DD" hoặc ""
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
  promptTemplate: string;
}

/** POST /projects — tạo project + llm_config. Trả id project mới. */
export async function createProject(input: CreateProjectInput): Promise<{ id: string; name: string }> {
  const body = {
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
  };
  const res = await apiClient.post<ProjectOutBE>("/projects", body);
  return { id: res.id, name: res.project_name };
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
  bundleName: string
): Promise<ValidateResult> {
  const res = await apiClient.post<{
    is_valid: boolean;
    files: { original_filename: string; file_role: string; is_valid: boolean; errors: string[] }[];
    errors: string[];
    warnings: string[];
  }>(`/import-bundles/validate?${uploadTokensQuery(tokens)}`, {
    project_id: projectId,
    upload_token: tokens[0],
    bundle_name: bundleName,
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
  bundleName: string,
  batchName: string
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
    bundle_name: bundleName,
    batch_name: batchName,
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
