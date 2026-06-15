import { ClaimTask, Project, ExportJob, AuditLog, UserAccount } from "../types";

export const initialProject: Project = {
  id: "PRJ-001",
  name: "Vivipedia Text Trust",
  batch: "BAT-001",
  bundleId: "BND-001",
  bundleName: "ODA Article 001",
  importType: "pdf_bundle",
  answerPdf: "answer_oda_article_001.pdf",
  sourceRefPdf: "source_reference_oda_article_001.pdf",
  sourceContentPdfs: ["source_001_worldbank.pdf", "source_002_oecd.pdf", "source_003_vsf_archive.pdf"],
  status: "Active",
  createdAt: "04/06/2026",
  deadline: "2026-06-12",
  owner: "Admin Trí",
  annotators: ["Annotator Mai", "Annotator Nam"],
  qa: "QA Specialist Linh",
};

export const initialTasks: ClaimTask[] = [
  {
    id: "CT-001",
    answerId: "PT-001",
    bundleId: "BND-001",
    articleCode: "ODA-001",
    title: "Tổng quan vốn ODA cho hạ tầng",
    category: "Kinh tế phát triển",
    tier: "Tier 1",
    confidenceScore: 0.87,
    sectionName: "Tóm tắt",
    citationMarkers: ["[1]", "[2]"],
    mappedSourceOrders: [1, 2],
    answerPdf: "answer_oda_article_001.pdf",
    status: "Ready for Annotation",
    domain: "Kinh tế phát triển",
    annotator: "Annotator Mai",
    qa: "QA specialist Linh",
    submittedAt: "",
    returnCount: 0,
    question: "Nguồn vốn ODA hỗ trợ hạ tầng công cộng như thế nào?",
    answer: "Nguồn vốn ODA thường được dùng để hỗ trợ các dự án hạ tầng công cộng có thời gian hoàn vốn dài như cầu, đường, cấp nước và xử lý nước thải. Trong giai đoạn 2015-2024, nhiều chương trình ODA tại Việt Nam tập trung vào kết nối giao thông và cải thiện dịch vụ đô thị [1]. Một số khoản vay ưu đãi cũng đi kèm yêu cầu minh bạch đấu thầu và báo cáo tiến độ định kỳ [2].",
    claimOriginal: "Nhiều chương trình ODA tại Việt Nam tập trung vào kết nối giao thông và cải thiện dịch vụ đô thị [1].",
    claimFinal: "Nhiều chương trình ODA tại Việt Nam tập trung vào kết nối giao thông và cải thiện dịch vụ đô thị [1].",
    edited: false,
    pre: { SF: 0.82, SC: 0.78, NH: 0.86, SQ: 0.76, REL: 0.88, COMP: 0.80 },
    ann: { SF: 0.82, SC: 0.78, NH: 0.86, SQ: 0.76, REL: 0.88, COMP: 0.80 },
    sourceStatus: "unknown",
    sourceNote: "",
    reason: "",
    notes: "",
    sources: [
      {
        order: 1,
        title: "World Bank Vietnam Urban Upgrading Program",
        tier: "Tier 1",
        url: "https://worldbank.org/example/urban-upgrading",
        file: "source_001_worldbank.pdf",
        parseStatus: "parsed",
        text: "The program supported urban infrastructure, drainage, roads and access to basic services in selected Vietnamese cities."
      },
      {
        order: 2,
        title: "OECD Development Co-operation Profile",
        tier: "Tier 1",
        url: null,
        file: "source_002_oecd.pdf",
        parseStatus: "parsed",
        text: "Development co-operation projects may include procurement transparency, reporting obligations and concessional financing terms."
      }
    ],
    urls: ["https://worldbank.org/example/urban-upgrading"],
    qaComment: ""
  },
  {
    id: "CT-002",
    answerId: "PT-001",
    bundleId: "BND-001",
    articleCode: "ODA-001",
    title: "Tổng quan vốn ODA cho hạ tầng",
    category: "Kinh tế phát triển",
    tier: "Tier 1",
    confidenceScore: 0.87,
    sectionName: "Phân tích",
    citationMarkers: ["[2]"],
    mappedSourceOrders: [2],
    answerPdf: "answer_oda_article_001.pdf",
    status: "Submitted",
    domain: "Kinh tế phát triển",
    annotator: "Annotator Mai",
    qa: "QA Specialist Linh",
    submittedAt: "04/06/2026 09:11",
    returnCount: 0,
    question: "Vốn vay ưu đãi thường đi kèm yêu cầu gì?",
    answer: "Nguồn vốn ODA thường được dùng để hỗ trợ các dự án hạ tầng công cộng có thời gian hoàn vốn dài như cầu, đường, cấp nước và xử lý nước thải. Trong giai đoạn 2015-2024, nhiều chương trình ODA tại Việt Nam tập trung vào kết nối giao thông và cải thiện dịch vụ đô thị [1]. Một số khoản vay ưu đãi cũng đi kèm yêu cầu minh bạch đấu thầu và báo cáo tiến độ định kỳ [2].",
    claimOriginal: "Một số khoản vay ưu đãi đi kèm yêu cầu minh bạch đấu thầu và báo cáo tiến độ định kỳ [2].",
    claimFinal: "Một số khoản vay ưu đãi đi kèm yêu cầu minh bạch đấu thầu và báo cáo tiến độ định kỳ [2].",
    edited: false,
    pre: { SF: 0.74, SC: 0.68, NH: 0.88, SQ: 0.72, REL: 0.82, COMP: 0.76 },
    ann: { SF: 0.78, SC: 0.70, NH: 0.88, SQ: 0.72, REL: 0.82, COMP: 0.77 },
    sourceStatus: "Truy cập được - hỗ trợ một phần",
    sourceNote: "",
    reason: "",
    notes: "Nguồn có nêu điều kiện quản trị nhưng không dùng đúng cụm từ trong claim.",
    sources: [
      {
        order: 2,
        title: "OECD Development Co-operation Profile",
        tier: "Tier 1",
        url: null,
        file: "source_002_oecd.pdf",
        parseStatus: "parsed",
        text: "Concessional loans can include reporting and governance requirements tied to implementation milestones."
      }
    ],
    urls: [],
    qaComment: ""
  },
  {
    id: "CT-003",
    answerId: "PT-001",
    bundleId: "BND-001",
    articleCode: "ODA-001",
    title: "Tổng quan vốn ODA cho hạ tầng",
    category: "Kinh tế phát triển",
    tier: "Tier 3",
    confidenceScore: 0.64,
    sectionName: "Lưu ý",
    citationMarkers: [],
    mappedSourceOrders: [],
    answerPdf: "answer_oda_article_001.pdf",
    status: "Returned",
    domain: "Kinh tế phát triển",
    annotator: "Annotator Mai",
    qa: "QA Specialist Linh",
    submittedAt: "03/06/2026 17:30",
    returnCount: 1,
    question: "Có phải mọi dự án ODA đều không cần hoàn trả?",
    answer: "Nguồn vốn ODA bao gồm viện trợ không hoàn lại, vay ưu đãi và hỗn hợp tài trợ. Không phải mọi dự án ODA đều là viện trợ không hoàn lại; nhiều chương trình hạ tầng dùng khoản vay ưu đãi cần hoàn trả theo thời hạn dài [3].",
    claimOriginal: "Mọi dự án ODA đều là viện trợ không hoàn lại.",
    claimFinal: "Mọi dự án ODA đều là viện trợ không hoàn lại.",
    edited: false,
    pre: { SF: 0.60, SC: 0.54, NH: 0.82, SQ: 0.62, REL: 0.74, COMP: 0.58 },
    ann: { SF: 0.72, SC: 0.66, NH: 0.84, SQ: 0.66, REL: 0.76, COMP: 0.64 },
    sourceStatus: "Truy cập được - không hỗ trợ",
    sourceNote: "",
    reason: "Annotator nâng điểm sau khi đối chiếu nguồn, cần QA kiểm tra lại.",
    notes: "Cần xác nhận lại với source PDF.",
    sources: [
      {
        order: 3,
        title: "VSF Archive - ODA financing notes",
        tier: "Tier 3",
        url: null,
        file: "source_003_vsf_archive.pdf",
        parseStatus: "parsed",
        text: "ODA may be provided as grants, concessional loans or blended finance. Loan components are repayable."
      }
    ],
    urls: [],
    qaComment: "Source Mismatch: điểm SC/SF cao hơn nội dung nguồn, cần sửa claim hoặc hạ điểm."
  },
  {
    id: "CT-004",
    answerId: "PT-001",
    bundleId: "BND-001",
    articleCode: "ODA-001",
    title: "Tổng quan vốn ODA cho hạ tầng",
    category: "Kinh tế phát triển",
    tier: "Tier 1",
    confidenceScore: 0.87,
    sectionName: "Hồ sơ",
    citationMarkers: ["[1]"],
    mappedSourceOrders: [1],
    answerPdf: "answer_oda_article_001.pdf",
    status: "Approved",
    domain: "Kinh tế phát triển",
    annotator: "Annotator Mai",
    qa: "QA Specialist Linh",
    submittedAt: "04/06/2026 08:55",
    returnCount: 0,
    question: "Các chương trình đô thị ODA hỗ trợ nhóm hoạt động nào?",
    answer: "Nguồn vốn ODA thường được dùng để hỗ trợ các dự án hạ tầng công cộng có thời gian hoàn vốn dài như cầu, đường, cấp nước và xử lý nước thải. Trong giai đoạn 2015-2024, nhiều chương trình ODA tại Việt Nam tập trung vào kết nối giao thông và cải thiện dịch vụ đô thị [1].",
    claimOriginal: "Các chương trình đô thị ODA có thể hỗ trợ thoát nước, đường đô thị và dịch vụ cơ bản [1].",
    claimFinal: "Các chương trình đô thị ODA có thể hỗ trợ thoát nước, đường đô thị và dịch vụ cơ bản [1].",
    edited: false,
    pre: { SF: 0.90, SC: 0.86, NH: 0.84, SQ: 0.88, REL: 0.91, COMP: 0.89 },
    ann: { SF: 0.91, SC: 0.88, NH: 0.85, SQ: 0.88, REL: 0.91, COMP: 0.90 },
    sourceStatus: "source_text_parsed",
    sourceNote: "",
    reason: "",
    notes: "Claim rõ, nguồn hỗ trợ trực tiếp.",
    sources: [
      {
        order: 1,
        title: "World Bank Vietnam Urban Upgrading Program",
        tier: "Tier 1",
        url: "https://worldbank.org/example/urban-upgrading",
        file: "source_001_worldbank.pdf",
        parseStatus: "parsed",
         text: "The program supported drainage, roads and access to basic services in selected Vietnamese cities."
      }
    ],
    urls: ["https://worldbank.org/example/urban-upgrading"],
    qaComment: ""
  }
];

export const initialExports: ExportJob[] = [
  {
    id: "EXP-2026-001",
    project: "Vivipedia Text Trust",
    bundleId: "BND-001",
    status: "Done",
    count: 1,
    by: "QA Linh",
    time: "2026-06-04 09:42",
    answerPdf: "answer_oda_article_001.pdf",
    sourceRefPdf: "source_reference_oda_article_001.pdf",
  }
];

export const initialAudits: AuditLog[] = [
  { id: "A-001", user: "Admin Trí", action: "Create Project", entity: "PRJ-001", time: "2026-06-04 08:10", detail: "Tạo project Vivipedia Text Trust" },
  { id: "A-002", user: "Admin Trí", action: "Import PDF Bundle", entity: "BND-001", time: "2026-06-04 08:22", detail: "Answer PDF, Source Reference PDF và 3 Source Content PDF hợp lệ" },
  { id: "A-003", user: "Annotator Mai", action: "Submit Annotation", entity: "CT-002", time: "2026-06-04 09:11", detail: "Task chuyển sang Submitted" },
  { id: "A-004", user: "QA Linh", action: "Approve Task", entity: "CT-004", time: "2026-06-04 09:33", detail: "Task đủ điều kiện export" },
  { id: "A-005", user: "QA Linh", action: "Create Export Job", entity: "EXP-2026-001", time: "2026-06-04 09:42", detail: "Export CSV claim-level cho Approved task" }
];

export const initialUsers: UserAccount[] = [
  { name: "Admin Trí", email: "admin@vsf.local", role: "ADMIN", status: "Đang hoạt động" },
  { name: "Annotator Mai", email: "annotator@vsf.local", role: "ANNOTATOR", status: "Đang hoạt động" },
  { name: "Annotator Nam", email: "annotator-nam@vsf.local", role: "ANNOTATOR", status: "Đang hoạt động" },
  { name: "QA Specialist Linh", email: "qa@vsf.local", role: "QA", status: "Đang hoạt động" }
];
