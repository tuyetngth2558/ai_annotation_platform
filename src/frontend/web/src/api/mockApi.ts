import type { ClaimTask, Project, AuditLog, ExportJob, UserRole } from "../types";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
  email: string;
}

const mockUsers = {
  "admin@vsf.local": {
    password: "admin-demo-2026",
    role: "ADMIN" as UserRole,
    name: "Admin Demo",
  },
  "annotator@vsf.local": {
    password: "annotator-demo-2026",
    role: "ANNOTATOR" as UserRole,
    name: "Annotator Mai",
  },
  "qa@vsf.local": {
    password: "qa-demo-2026",
    role: "QA" as UserRole,
    name: "QA Demo",
  },
};

const mockProjects: Project[] = [
  {
    id: "proj-001",
    name: "Vivipedia Demo Project",
    batch: "batch-001",
    bundleId: "bundle-001",
    bundleName: "Demo PDF Bundle",
    importType: "pdf_bundle",
    answerPdf: "answer.pdf",
    sourceRefPdf: "source-ref.pdf",
    sourceContentPdfs: ["source-1.pdf", "source-2.pdf"],
    status: "Active",
    createdAt: "2026-06-16T08:00:00Z",
    deadline: "2026-07-01",
    owner: "Admin Demo",
    annotators: ["Annotator Mai"],
    qa: "QA Demo",
  },
];

const mockTasks: ClaimTask[] = [
  {
    id: "task-001",
    answerId: "ans-001",
    bundleId: "bundle-001",
    articleCode: "ART-1001",
    title: "Claim extraction for policy article",
    category: "Source Quality",
    tier: "Tier 1",
    confidenceScore: 0.82,
    sectionName: "Introduction",
    citationMarkers: ["[1]", "[2]"],
    mappedSourceOrders: [1, 2],
    answerPdf: "answer.pdf",
    status: "Ready for Annotation",
    domain: "Politics",
    annotator: "Annotator Mai",
    qa: "QA Demo",
    submittedAt: "",
    returnCount: 0,
    question: "Nội dung chính của câu trả lời này là gì?",
    answer: "Theo bài báo, chính sách này ảnh hưởng đến nền kinh tế vĩ mô.",
    claimOriginal: "Nguồn nói rằng chính sách sẽ tăng trưởng GDP 2%.",
    claimFinal: "Chính sách được trình bày sẽ cải thiện GDP khoảng 2%.",
    edited: false,
    pre: { SF: 0.7, SC: 0.8, NH: 0.6, SQ: 0.75, REL: 0.78, COMP: 0.74 },
    ann: { SF: 0.0, SC: 0.0, NH: 0.0, SQ: 0.0, REL: 0.0, COMP: 0.0 },
    sourceStatus: "parsed",
    sourceNote: "",
    reason: "",
    notes: "",
    sources: [
      {
        order: 1,
        title: "Source reference 1",
        tier: "Primary",
        url: "https://example.com/source1",
        file: "source-1.pdf",
        parseStatus: "parsed",
        text: "Trích đoạn nguồn 1 chứa nội dung chính...",
      },
      {
        order: 2,
        title: "Source reference 2",
        tier: "Secondary",
        url: "https://example.com/source2",
        file: "source-2.pdf",
        parseStatus: "parsed",
        text: "Trích đoạn nguồn 2 minh họa thêm ý chính...",
      },
    ],
    urls: ["https://example.com/source1", "https://example.com/source2"],
    qaComment: "",
  },
  {
    id: "task-002",
    answerId: "ans-002",
    bundleId: "bundle-001",
    articleCode: "ART-1002",
    title: "Claim review for citation compliance",
    category: "Claim Accuracy",
    tier: "Tier 2",
    confidenceScore: 0.65,
    sectionName: "Discussion",
    citationMarkers: ["[1]"],
    mappedSourceOrders: [1],
    answerPdf: "answer.pdf",
    status: "Submitted",
    domain: "Economy",
    annotator: "Annotator Mai",
    qa: "QA Demo",
    submittedAt: "2026-06-16T09:20:00Z",
    returnCount: 0,
    question: "Độ chính xác của trích dẫn nguồn có phù hợp không?",
    answer: "Nguồn hỗ trợ yêu cầu nhưng không đưa đủ dữ kiện chi tiết.",
    claimOriginal: "Trích dẫn nguồn hoàn toàn phù hợp với thông tin được trình bày.",
    claimFinal: "Nguồn phần lớn phù hợp nhưng thiếu một số dữ kiện cụ thể.",
    edited: true,
    pre: { SF: 0.6, SC: 0.7, NH: 0.65, SQ: 0.72, REL: 0.7, COMP: 0.68 },
    ann: { SF: 0.8, SC: 0.75, NH: 0.7, SQ: 0.8, REL: 0.78, COMP: 0.76 },
    sourceStatus: "parsed",
    sourceNote: "Nguồn có data phù hợp nhưng cần ghi chú tỷ lệ chính xác.",
    reason: "Điểm SC cao hơn do trích dẫn thực tế đúng nội dung.",
    notes: "Annotator đã điều chỉnh khi phát hiện thiếu bối cảnh.",
    sources: [
      {
        order: 1,
        title: "Source reference 1",
        tier: "Primary",
        url: "https://example.com/source-economy",
        file: "source-1.pdf",
        parseStatus: "parsed",
        text: "Nội dung nguồn cho thấy sự phù hợp chung với tuyên bố.",
      },
    ],
    urls: ["https://example.com/source-economy"],
    qaComment: "",
  },
];

const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-001",
    user: "Admin Demo",
    action: "Login",
    entity: "auth",
    time: "2026-06-16T08:00:00Z",
    detail: "Admin Demo đăng nhập vào hệ thống.",
  },
  {
    id: "audit-002",
    user: "Annotator Mai",
    action: "Task Submitted",
    entity: "task-002",
    time: "2026-06-16T09:20:00Z",
    detail: "Annotator đã nộp task để QA xét duyệt.",
  },
];

const mockExportJobs: ExportJob[] = [
  {
    id: "export-001",
    project: "Vivipedia Demo Project",
    bundleId: "bundle-001",
    status: "Done",
    count: 12,
    by: "Admin Demo",
    time: "2026-06-16T10:10:00Z",
    answerPdf: "answer.pdf",
    sourceRefPdf: "source-ref.pdf",
  },
];

let projects = [...mockProjects];
let tasks = [...mockTasks];
let auditLogs = [...mockAuditLogs];
let exportJobs = [...mockExportJobs];

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getTaskById = (id: string) => tasks.find((task) => task.id === id);

export async function mockRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  await delay();
  const method = (options.method ?? "GET").toUpperCase();
  const cleaned = path.replace(/^\//, "");

  if (cleaned === "auth/login" && method === "POST") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const email = String(body.email ?? "").toLowerCase();
    const password = String(body.password ?? "");
    const account = mockUsers[email];
    if (!account || account.password !== password) {
      throw new Error("Email hoặc mật khẩu không đúng.");
    }
    return {
      access_token: `mock-access-token-${email}`,
      refresh_token: `mock-refresh-token-${email}`,
      token_type: "bearer",
      role: account.role,
      email,
    } as unknown as T;
  }

  if (cleaned === "projects" && method === "GET") {
    return clone(projects) as T;
  }

  if (cleaned === "tasks" && method === "GET") {
    return clone(tasks) as T;
  }

  if (cleaned === "audit-logs" && method === "GET") {
    return clone(auditLogs) as T;
  }

  if (cleaned === "exports" && method === "POST") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const newJob: ExportJob = {
      id: `export-${String(exportJobs.length + 1).padStart(3, "0")}`,
      project: body.project ?? "Vivipedia Demo Project",
      bundleId: body.bundleId ?? "bundle-001",
      status: "Processing",
      count: body.count ?? 12,
      by: body.by ?? "Admin Demo",
      time: new Date().toISOString(),
      answerPdf: body.answerPdf ?? "answer.pdf",
      sourceRefPdf: body.sourceRefPdf ?? "source-ref.pdf",
    };
    exportJobs = [newJob, ...exportJobs];
    auditLogs = [
      {
        id: `audit-${String(auditLogs.length + 1).padStart(3, "0")}`,
        user: newJob.by,
        action: "Export Requested",
        entity: newJob.id,
        time: new Date().toISOString(),
        detail: `Yêu cầu xuất CSV bởi ${newJob.by}.`,
      },
      ...auditLogs,
    ];
    return newJob as unknown as T;
  }

  if (cleaned.startsWith("tasks/") && cleaned.endsWith("/submit") && method === "POST") {
    const taskId = cleaned.split("/")[1];
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} không tồn tại.`);
    task.status = "Submitted";
    task.submittedAt = new Date().toISOString();
    auditLogs.unshift({
      id: `audit-${String(auditLogs.length + 1).padStart(3, "0")}`,
      user: task.annotator,
      action: "Task Submitted",
      entity: task.id,
      time: task.submittedAt,
      detail: `Annotator nộp task ${task.id}.`,
    });
    return clone(task) as T;
  }

  if (cleaned.startsWith("qa-reviews/") && cleaned.endsWith("/approve") && method === "POST") {
    const taskId = cleaned.split("/")[1];
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} không tồn tại.`);
    task.status = "Approved";
    auditLogs.unshift({
      id: `audit-${String(auditLogs.length + 1).padStart(3, "0")}`,
      user: task.qa,
      action: "Task Approved",
      entity: task.id,
      time: new Date().toISOString(),
      detail: `QA duyệt task ${task.id}.`,
    });
    return { success: true } as unknown as T;
  }

  if (cleaned.startsWith("qa-reviews/") && cleaned.endsWith("/return") && method === "POST") {
    const taskId = cleaned.split("/")[1];
    const body = options.body ? JSON.parse(options.body as string) : {};
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} không tồn tại.`);
    task.status = "Returned";
    task.qaComment = String(body.comment ?? "");
    task.returnCount += 1;
    auditLogs.unshift({
      id: `audit-${String(auditLogs.length + 1).padStart(3, "0")}`,
      user: task.qa,
      action: "Task Returned",
      entity: task.id,
      time: new Date().toISOString(),
      detail: `QA trả task ${task.id} với lý do: ${task.qaComment}`,
    });
    return { success: true } as unknown as T;
  }

  if (
    ["import-bundles/validate", "import-bundles/preview", "import-bundles/confirm"].includes(cleaned) &&
    method === "POST"
  ) {
    return { status: "ok" } as unknown as T;
  }

  throw new Error(`Mock API chưa hỗ trợ endpoint: ${path}`);
}
