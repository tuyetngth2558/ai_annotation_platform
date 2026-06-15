import { useState } from "react";
import { Project, ClaimTask } from "../types";
import { TEST_IDS, toTestSlug } from "../testability";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  ArrowUpRight,
  FileText,
  RefreshCw,
  Users,
  Sliders,
  CheckSquare
} from "lucide-react";

interface ProjectSetupViewProps {
  project: Project;
  tasks: ClaimTask[];
  onBackToDashboard: () => void;
  showToast: (msg: string) => void;
  onAddTask: (task: ClaimTask) => void;
  onUpdateTasks: (taskList: ClaimTask[]) => void;
}

export default function ProjectSetupView({
  project,
  tasks,
  onBackToDashboard,
  showToast,
  onUpdateTasks
}: ProjectSetupViewProps) {
  const [projectMode, setProjectMode] = useState<"list" | "wizard">("list");
  const [wizardStep, setWizardStep] = useState(1);
  const [projectName, setProjectName] = useState(project.name);
  const [description, setDescription] = useState("Review claim-level cho câu trả lời Vivipedia, text-only trong MVP.");
  const [deadline, setDeadline] = useState(project.deadline);
  const [llmUrl, setLlmUrl] = useState("https://llm-provider.example/v1/prescore");
  const [apiKey, setApiKey] = useState("vsf-demo-key-9912");
  const [promptTemplate, setPromptTemplate] = useState(
    "Trích xuất claim từ Answer Context đã parse từ PDF và chấm 6 dimension SF, SC, NH, SQ, REL, COMP theo rubric MVP."
  );
  
  // Validation indicator
  const [bundleValidated, setBundleValidated] = useState(false);
  
  // Assign selectors
  const [selectedAnnotators, setSelectedAnnotators] = useState<string[]>(["Annotator Mai", "Annotator Nam"]);
  const [selectedQa, setSelectedQa] = useState("QA Specialist Linh");

  const steps = [
    { num: 1, label: "Thông tin project" },
    { num: 2, label: "Cấu hình LLM" },
    { num: 3, label: "Upload PDF" },
    { num: 4, label: "Gán role / Validate" },
    { num: 5, label: "Preview parse" },
    { num: 6, label: "Confirm import" },
    { num: 7, label: "Assignment" },
    { num: 8, label: "Project Detail" }
  ];

  const handleCreateNewProject = () => {
    setProjectMode("wizard");
    setWizardStep(1);
    setBundleValidated(false);
  };

  const handleValidateBundle = () => {
    setBundleValidated(true);
    showToast("PDF Bundle đã được xác thực thành công! Phát hiện 1 cảnh báo: Thiếu SOURCE_URL ở source [2] (Không chặn import).");
  };

  const currentCompositeAverage = (task: ClaimTask) => {
    const total = task.ann.SF + task.ann.SC + task.ann.NH + task.ann.SQ + task.ann.REL + task.ann.COMP;
    return total / 6;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-250";
      case "Submitted":
        return "bg-blue-100 text-blue-800 border-blue-250";
      case "Returned":
        return "bg-red-100 text-red-800 border-red-250";
      default:
        return "bg-amber-100 text-amber-800 border-amber-250";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Title & Header Navigation */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Project Setup & PDF Import Bundle</h2>
          <p className="text-xs text-slate-400 mt-1">Cơ chế tự động hóa phân luồng đánh giá độ tin cậy từ tài liệu thô PDF.</p>
        </div>
        <div className="flex gap-2">
          {projectMode === "wizard" && (
            <button
              onClick={() => setProjectMode("list")}
              data-testid={TEST_IDS.projectBackList}
              className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all"
            >
              Quay lại danh sách Project
            </button>
          )}
          <button
            onClick={onBackToDashboard}
            data-testid={TEST_IDS.projectBackDashboard}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all"
          >
            Quay lại Dashboard
          </button>
        </div>
      </div>

      {projectMode === "list" ? (
        <div data-testid={TEST_IDS.projectListPanel}>
          {/* Project List Mode */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Tổng số Project</span>
              <strong className="text-2xl font-extrabold text-slate-800 block">1</strong>
              <span className="text-[11px] text-blue-600 font-semibold uppercase">{project.name} (Active)</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">ID BUNDLE</span>
              <strong className="text-2xl font-extrabold text-slate-800 block">{project.bundleId}</strong>
              <span className="text-[11px] text-indigo-500 font-semibold uppercase">{project.bundleName}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Loại hình Import</span>
              <strong className="text-2xl font-extrabold text-slate-800 block">PDF Bundle</strong>
              <span className="text-[11px] text-emerald-500 font-semibold uppercase">Hỗ trợ trích xuất text</span>
            </div>
            <button
              onClick={handleCreateNewProject}
              data-testid={TEST_IDS.projectCreateNew}
              className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl border border-blue-500 p-5 shadow flex flex-col justify-center items-center text-center space-y-1.5 group hover:from-blue-700 hover:to-indigo-700 transition-all font-bold"
            >
              <FolderPlus size={24} className="group-hover:scale-110 transition-transform text-teal-300" />
              <span>Tạo Dự Án Mới & Gán File</span>
            </button>
          </div>

          <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h3 className="text-base font-bold text-slate-800">Danh Sách Dự Án Đang Chạy</h3>
                <p className="text-xs text-slate-400 mt-0.5">ADMIN giám sát các dự án đánh giá và điều phối thông tin.</p>
              </div>
              <p className="text-xs text-slate-500 font-semibold">Cập nhật: Mới nhất</p>
            </div>

            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs" data-testid={TEST_IDS.projectListTable}>
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Project & ID</th>
                    <th className="py-2.5 px-3">Use case</th>
                    <th className="py-2.5 px-3">Hồ Sơ PDF (Batch)</th>
                    <th className="py-2.5 px-3">Thống kê Task Status</th>
                    <th className="py-2.5 px-3">Thành viên tham gia</th>
                    <th className="py-2.5 px-3">Hạn chót</th>
                    <th className="py-2.5 px-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50" data-testid={TEST_IDS.projectRow(project.id)}>
                    <td className="py-4 px-3">
                      <strong className="block text-slate-800 text-sm font-bold">{project.name}</strong>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{project.id}</span>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold tracking-wide uppercase text-[10px]">
                        Vivipedia
                      </span>
                      <span className="block text-slate-400 mt-1 text-[11px]">Text modality</span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="font-semibold text-slate-700">{project.batch}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{project.bundleId} · pdf_bundle</div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-semibold text-[10px]">
                          Ready: {tasks.filter(t => t.status === "Ready for Annotation").length}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-150 font-semibold text-[10px]">
                          Sub: {tasks.filter(t => t.status === "Submitted").length}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-150 font-semibold text-[10px]">
                          Ret: {tasks.filter(t => t.status === "Returned").length}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-150 font-semibold text-[10px]">
                          Appr: {tasks.filter(t => t.status === "Approved").length}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-slate-600 font-medium">
                      <div className="text-slate-700 font-semibold">{project.annotators.join(", ")}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{project.qa}</div>
                    </td>
                    <td className="py-4 px-3 font-semibold text-slate-700 font-mono tracking-tight">{project.deadline}</td>
                    <td className="py-4 px-3 text-center space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setProjectMode("wizard");
                          setWizardStep(8);
                        }}
                        data-testid={TEST_IDS.projectDetailButton(project.id)}
                        className="py-1 px-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold rounded text-[11px] transition-all"
                      >
                        Chi Tiết
                      </button>
                      <button
                        onClick={() => {
                          setProjectMode("wizard");
                          setWizardStep(3);
                        }}
                        data-testid={TEST_IDS.projectImportButton(project.id)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] shadow transition-all"
                      >
                        Import Lại
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div data-testid={TEST_IDS.projectWizardPanel}>
          {/* Stepper indicators */}
          <div className="grid grid-cols-2 md:grid-cols-8 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 overflow-hidden" data-testid={TEST_IDS.projectWizardStepper}>
            {steps.map((s) => (
              <button
                key={s.num}
                onClick={() => setWizardStep(s.num)}
                data-testid={TEST_IDS.projectWizardStep(s.num)}
                className={`p-2 rounded-lg text-left transition-all border ${
                  wizardStep === s.num
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-100"
                    : wizardStep > s.num
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-150 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide opacity-80">Bước {s.num}</span>
                <strong className="block text-[11.5px] font-extrabold truncate mt-0.5">{s.label}</strong>
              </button>
            ))}
          </div>

          {/* Stepper content frame */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-800">
                {steps[wizardStep - 1] ? `${wizardStep}. ${steps[wizardStep - 1].label}` : ""}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Text enabled
              </span>
            </div>

            <div className="p-6">
              {/* STAGE 1: PROJECT BASIC INFO */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 required">Tên dự án</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        data-testid={TEST_IDS.projectNameInput}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g. Vivipedia ODA Evaluations"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Hạn chót thẩm định</label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        data-testid={TEST_IDS.projectDeadlineInput}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Mô tả mục tiêu dự án</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        data-testid={TEST_IDS.projectDescriptionTextarea}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Nêu rõ yêu cầu chỉ định đặc thù..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 required">Modality Type</label>
                      <select data-testid={TEST_IDS.projectModalitySelect} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white">
                        <option>Text (Văn bản)</option>
                        <option disabled>Audio (Âm thanh - Giai đoạn 2)</option>
                        <option disabled>Image (Hình ảnh - Giai đoạn 2)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      onClick={() => setWizardStep(2)}
                      data-testid={TEST_IDS.projectWizardNext}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow"
                    >
                      <span>Cấu hình LLM</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: LLM PRESCORE CONFIGURATION */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 required">LLM Pre-score Endpoint URL</label>
                      <input
                        type="url"
                        value={llmUrl}
                        onChange={(e) => setLlmUrl(e.target.value)}
                        data-testid={TEST_IDS.projectLlmUrlInput}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
                        placeholder="https://..."
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 required">API Key bảo mật</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        data-testid={TEST_IDS.projectLlmApiKeyInput}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Mô hình tích hợp (Provider)</label>
                      <select data-testid={TEST_IDS.projectLlmProviderSelect} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white">
                        <option>Gemini 1.5 Flash (Preset hỗ trợ 6 dimensions)</option>
                        <option>Gemini 1.5 Pro</option>
                        <option>Custom LLM Endpoint</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 required">Prompt template phân tích (Rubric-driven)</label>
                      <textarea
                        value={promptTemplate}
                        onChange={(e) => setPromptTemplate(e.target.value)}
                        data-testid={TEST_IDS.projectPromptTemplateTextarea}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                    <button
                      onClick={() => setWizardStep(1)}
                      data-testid={TEST_IDS.projectWizardPrev}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      data-testid={TEST_IDS.projectWizardNext}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow"
                    >
                      <span>Tiếp tục (Upload PDF)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 3: UPLOAD PDF BUNDLE */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-8 hover:bg-slate-50 hover:border-blue-450 transition-all text-center space-y-3 relative" data-testid={TEST_IDS.projectUploadZone}>
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                          <Upload size={20} />
                        </div>
                        <div>
                          <strong className="block text-sm text-slate-800">Thả files PDF Bundle tại đây</strong>
                          <p className="text-xs text-slate-400 mt-1">Hoặc click để duyệt nhiều tài liệu cùng một lúc.</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          data-testid={TEST_IDS.projectPdfFilesInput}
                          onChange={() => {
                            showToast("Đã mô phỏng nạp các file PDF thành công.");
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span data-testid={TEST_IDS.projectAnswerPdfChip} className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
                          {project.answerPdf}
                        </span>
                        <span data-testid={TEST_IDS.projectSourceRefPdfChip} className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
                          {project.sourceRefPdf}
                        </span>
                        {project.sourceContentPdfs.map((sc, i) => (
                          <span key={i} data-testid={i === 0 ? TEST_IDS.projectSourceCountChip : undefined} className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold">
                            {sc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-xs md:text-sm leading-relaxed space-y-2.5">
                      <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                        <CheckCircle size={15} className="text-emerald-700" /> Files staged in browser memory
                      </h4>
                      <p>
                        Các file tạm đã được ghi nhận trong bộ nhớ đệm giả lập trình duyệt. Khi tiếp tục sang bước validate, ADMIN sẽ gán các <strong>file_role</strong> tương ứng để hệ thống phân loại chính xác.
                      </p>
                      <div className="text-xs text-teal-800 bg-emerald-100/50 p-2 rounded border border-emerald-250">
                        Chế độ import: <strong>pdf_bundle (Answer PDF + Source Reference list + Source Contents)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                    <button
                      onClick={() => setWizardStep(2)}
                      data-testid={TEST_IDS.projectWizardPrev}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      onClick={() => setWizardStep(4)}
                      data-testid={TEST_IDS.projectUploadContinue}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow"
                    >
                      <span>Tiếp tục (Gán Role)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 4: ROLE ASSIGNMENT & BUNDLE VALIDATION */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Left Builder Pane */}
                    <div className="md:col-span-7 bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                      <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                        <Sliders size={15} className="text-indigo-600" /> Bundle Builder & Role Mapper
                      </h4>

                      <div className="overflow-x-auto text-[11.5px]">
                        <table className="w-full border-collapse" data-testid={TEST_IDS.projectBundleBuilderTable}>
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                              <th className="py-2 pb-1.5 text-left">Tên File</th>
                              <th className="py-2 pb-1.5 text-left">Gán file_role</th>
                              <th className="py-2 pb-1.5 text-right">Điều kiện</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="py-2.5 font-semibold text-slate-700">{project.answerPdf}</td>
                              <td className="py-2.5 text-left">
                                <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-extrabold uppercase text-[10px]">
                                  answer_pdf
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-slate-400">Required, unique</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 font-semibold text-slate-700">{project.sourceRefPdf}</td>
                              <td className="py-2.5 text-left">
                                <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold uppercase text-[10px]">
                                  source_ref_pdf
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-slate-400">Required, unique</td>
                            </tr>
                            {project.sourceContentPdfs.map((sc, i) => (
                              <tr key={i}>
                                <td className="py-2.5 font-semibold text-slate-700">{sc}</td>
                                <td className="py-2.5 text-left">
                                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold uppercase text-[10px]">
                                    source_content_pdf
                                  </span>
                                </td>
                                <td className="py-2.5 text-right text-slate-400">At least 1 req.</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleValidateBundle}
                          data-testid={TEST_IDS.projectValidateBundle}
                          className="w-full py-2 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-extrabold rounded-lg text-xs hover:indigo-800 shadow"
                        >
                          Chạy Xác Thực PDF Bundle (Validate)
                        </button>
                      </div>
                    </div>

                    {/* Right feedback state */}
                    <div className="md:col-span-5" data-testid={TEST_IDS.projectValidationPanel}>
                      {!bundleValidated ? (
                        <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl text-amber-800 text-xs space-y-3">
                          <h4 className="font-bold text-sm flex items-center gap-1.5">
                            <AlertTriangle size={15} className="text-amber-700" /> Bundle validation criteria:
                          </h4>
                          <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                            <li>Thiếu <strong>answer_pdf</strong> hoặc <strong>source_ref_pdf</strong> sẽ chặn import (Block).</li>
                            <li>Nếu không phát hiện bất kỳ file nào có vai trò <strong>source_content_pdf</strong>: block.</li>
                            <li>Tập tin corrupt hoặc định dạng không phải PDF: block.</li>
                            <li>Thiếu liên kết Web URL: Warning (Cảnh báo, không chặn tải).</li>
                            <li>Nội dung PDF scan / ảnh thô: Gắn cờ cảnh báo <strong>ocr_required</strong>.</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-emerald-800 text-xs md:text-sm space-y-2.5">
                          <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <CheckCircle size={15} className="text-emerald-700" /> Xác thực hoàn tất (Validation Checked)
                          </h4>
                          <p className="text-slate-700 text-xs">
                            Cấu trúc file hợp lệ. Phát hiện 1 Warning ở tài liệu <strong>source_002_oecd.pdf</strong>: Thiếu liên kết URL bên ngoài (source_url is null). Bạn có thể tiếp tục import.
                          </p>
                          <div className="text-xs text-amber-900 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                            <span>Warning: SOURCE_URL_MISSING ở source [2] (cho phép qua).</span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                    <button
                      onClick={() => setWizardStep(3)}
                      data-testid={TEST_IDS.projectWizardPrev}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      onClick={() => setWizardStep(5)}
                      disabled={!bundleValidated}
                      data-testid={TEST_IDS.projectPreviewParse}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Tiếp tục (Preview parse)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 5: PARSER PREVIEW METADATA SCREEN */}
              {wizardStep === 5 && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 mb-4" data-testid={TEST_IDS.projectParseWarningBanner}>
                    <h4 className="font-extrabold text-slate-800 text-sm">Parse Preview Details</h4>
                    <p className="text-slate-500">
                      Hiển thị trích xuất dữ liệu thô bao gồm: article_code, title, danh sách nguồn hỗ trợ và trạng thái metadata của Bundle trước khi Admin bấm Confirm.
                    </p>
                  </div>

                  <div className="overflow-x-auto text-xs">
                    <table className="w-full border border-slate-150" data-testid={TEST_IDS.projectParsePreviewTable}>
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                          <th className="py-2 px-3 text-left">Thuộc tính</th>
                          <th className="py-2 px-3 text-left">Giá trị thu thập</th>
                          <th className="py-2 px-3 text-left">Nguồn gốc trích xuất</th>
                          <th className="py-2 px-3 text-left">Trạng thái file</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">article_code</td>
                          <td className="py-2 px-3 text-slate-600">ODA-001</td>
                          <td className="py-2 px-3">Answer PDF</td>
                          <td className="py-2 px-3 text-emerald-600 font-bold">{project.answerPdf}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">title</td>
                          <td className="py-2 px-3 text-slate-600">Tổng quan vốn ODA cho hạ tầng</td>
                          <td className="py-2 px-3">Source Reference PDF</td>
                          <td className="py-2 px-3 text-emerald-600 font-bold">{project.sourceRefPdf}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">source [1]</td>
                          <td className="py-2 px-3 text-slate-600">World Bank Vietnam Urban Upgrading Program</td>
                          <td className="py-2 px-3">Tier 1 · source_001_worldbank.pdf</td>
                          <td className="py-2 px-3 text-slate-500 font-semibold">parsed</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">source [2]</td>
                          <td className="py-2 px-3 text-slate-600">OECD Development Co-operation Profile</td>
                          <td className="py-2 px-3">Tier 1 · source_002_oecd.pdf</td>
                          <td className="py-2 px-3 text-slate-500 font-semibold">parsed</td>
                        </tr>
                        <tr className="bg-amber-50/50">
                          <td className="py-2 px-3 font-semibold text-amber-900">warning</td>
                          <td className="py-2 px-3 text-amber-700 font-medium">SOURCE_URL_MISSING (Không chặn)</td>
                          <td className="py-2 px-3">source_url</td>
                          <td className="py-2 px-3 text-amber-600 font-bold">null</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                    <button
                      onClick={() => setWizardStep(4)}
                      data-testid={TEST_IDS.projectWizardPrev}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      onClick={() => setWizardStep(6)}
                      data-testid={TEST_IDS.projectConfirmImport}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow"
                    >
                      <span>Xác nhận Import</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 6: BACKGROUND PIPELINE SIMULATION PROGRESS */}
              {wizardStep === 6 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl text-blue-800 text-xs md:text-sm">
                     Sau khi ADMIN bấm xác nhận import, một hệ thống pipeline chạy nền sẽ xử lý PDF: Tạo <strong>Batch</strong>, nạp <strong>PDF Bundle</strong>, bóc tách <strong>Parent Task</strong> tạo <strong>Claim Tasks</strong>, map logic citations và gọi API pre-scoring LLM.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3" data-testid={TEST_IDS.projectPipelinePanel}>
                      <strong className="block text-slate-800 font-bold uppercase tracking-wide border-b pb-2">Background Processing Pipeline</strong>
                      
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-emerald-700">
                          <span className="font-semibold">1. Uploaded Bundle successfully</span>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Done</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-700">
                          <span className="font-semibold">2. Parsing PDF content text</span>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Done</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-700">
                          <span className="font-semibold">3. Claim Extraction (Split & Refine)</span>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Done</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-700">
                          <span className="font-semibold">4. Source Mapping & Citations alignment</span>
                          <span className="text-[10px] font-extrabold uppercase bg-amber-100 px-1.5 py-0.5 rounded">Reviewed</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-700">
                          <span className="font-semibold">5. Pre-scoring Running (Gemini Evaluator)</span>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 px-1.5 py-0.5 rounded">Completed</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3" data-testid={TEST_IDS.projectPipelineErrorPanel}>
                      <strong className="block text-slate-800 font-bold uppercase tracking-wide border-b pb-2">Error State Demo Reference</strong>
                      <p className="text-slate-500">Mô phỏng xử lý lỗi hệ thống trong tương lai:</p>
                      
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-red-650">
                          <span className="font-medium text-[11px]">Trường hợp: Parse Failed (Lỗi cấu trúc)</span>
                          <span className="text-[10px] font-bold bg-red-150 px-1.5 py-0.5 rounded">Reject file</span>
                        </div>
                        <div className="flex justify-between items-center text-red-650">
                          <span className="font-medium text-[11px]">Trường hợp: LLM Pre-scoring endpoint dead</span>
                          <span className="text-[10px] font-bold bg-red-150 px-1.5 py-0.5 rounded">Show error box</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-medium text-[11px]">Trường hợp: ocr_required (PDF Scanned)</span>
                          <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">Flag for OCR</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                    <button
                      onClick={() => setWizardStep(5)}
                      data-testid={TEST_IDS.projectWizardPrev}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      onClick={() => setWizardStep(7)}
                      data-testid={TEST_IDS.projectAssignmentNext}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow"
                    >
                      <span>Tiếp tục (Assignment)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 7: TEAM TASK ASSIGNMENT */}
              {wizardStep === 7 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Chọn điều phối viên (Annotators)</label>
                      <div className="space-y-2">
                        {["Annotator Mai", "Annotator Nam"].map((ann) => (
                          <label key={ann} className="flex items-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedAnnotators.includes(ann)}
                              data-testid={TEST_IDS.projectAnnotator(toTestSlug(ann))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAnnotators([...selectedAnnotators, ann]);
                                } else {
                                  setSelectedAnnotators(selectedAnnotators.filter(item => item !== ann));
                                }
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-100"
                            />
                            <div>
                              <strong className="block text-sm text-slate-800">{ann}</strong>
                              <span className="text-xs text-slate-400 font-mono block mt-0.5">Active scope</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Chọn kiểm duyệt viên (QA Specialist)</label>
                      <div className="space-y-2">
                        {["QA Specialist Linh", "QA Specialist Hương"].map((qaName) => (
                          <label key={qaName} className="flex items-center gap-2.5 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="radio"
                              name="qa_assign"
                              checked={selectedQa === qaName}
                              data-testid={TEST_IDS.projectQa(toTestSlug(qaName))}
                              onChange={() => setSelectedQa(qaName)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-100"
                            />
                            <div>
                              <strong className="block text-sm text-slate-800">{qaName}</strong>
                              <span className="text-xs text-slate-400 block mt-0.5">QA Queue master</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between gap-3 font-bold">
                    <button
                      onClick={() => setWizardStep(6)}
                      data-testid={TEST_IDS.projectWizardPrev}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      onClick={() => {
                        setWizardStep(8);
                        showToast(`Cấu hình dự án mới và phân công cho ${selectedAnnotators.join(", ")} thành công!`);
                      }}
                      data-testid={TEST_IDS.projectAssignmentComplete}
                      className="py-2 px-5 bg-gradient-to-tr from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow shadow-emerald-100"
                    >
                      <span>Hoàn tất & Mở Project Detail</span> <CheckCircle size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 8: PROJECT DETAIL - FINALIZED VIEWS */}
              {wizardStep === 8 && (
                <div className="space-y-6" data-testid={TEST_IDS.projectDetailPanel}>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-xs md:text-sm">
                    <strong>Thông báo:</strong> PDF Bundle đã nạp thành công. Dự án <strong>{project.name}</strong> hiện đang được vận hành bởi: {selectedAnnotators.join(", ")} và {selectedQa}.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 block pb-1">Mã dự án</span>
                      <strong className="text-slate-800 text-sm font-bold block">{project.id}</strong>
                      <span className="text-slate-400 text-[11px] block">Vivipedia-modality text</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 block pb-1">Hồ sơ trích xuất (Bundle)</span>
                      <strong className="text-slate-800 text-sm font-bold block">{project.bundleId}</strong>
                      <span className="text-slate-400 text-[11px] block">{project.bundleName}</span>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-400 block pb-1">Claim Tasks</span>
                      <strong className="text-slate-800 text-sm font-bold block">{tasks.length} Claims</strong>
                      <span className="text-slate-400 text-[11px] block">Hỗ trợ đối chiếu rubric</span>
                    </div>
                  </div>

                  <section className="border border-slate-100 rounded-xl overflow-hidden shadow mt-4">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-sm">Danh Sách Câu Đánh Giá Cận Cảnh</h4>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">BAT-001 list</span>
                    </div>

                    <div className="overflow-x-auto text-[11.5px]">
                      <table className="w-full text-left" data-testid={TEST_IDS.projectDetailTaskTable}>
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="py-2 px-3">ID Task</th>
                            <th className="py-2 px-3">Nội dung Câu Hỏi trích xuất</th>
                            <th className="py-2 px-3">Phân công</th>
                            <th className="py-2 px-3">Trạng Thái</th>
                            <th className="py-2 px-3">Composite Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {tasks.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50" data-testid={TEST_IDS.projectDetailTaskRow(t.id)}>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{t.id}</td>
                              <td className="py-2.5 px-3 max-w-sm font-medium text-slate-700 truncate" title={t.question}>
                                {t.question}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-600">{t.annotator}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${getStatusColor(t.status)}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-bold">
                                  {currentCompositeAverage(t).toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-bold">
                    <button
                      onClick={() => setProjectMode("list")}
                      className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs"
                    >
                      Về danh sách
                    </button>
                    <button
                      onClick={onBackToDashboard}
                      className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs shadow-md shadow-blue-100"
                    >
                      Mở Dashboard
                    </button>
                  </div>
                </div>
              )}

            </div>
          </section>
        </div>
      )}

    </div>
  );
}
