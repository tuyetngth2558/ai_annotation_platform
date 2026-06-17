import { useEffect, useRef, useState } from "react";
import { Project } from "../types";
import { TEST_IDS } from "../testability";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  Loader2,
  XCircle,
  FileText,
  X,
} from "lucide-react";
import {
  createProject,
  uploadBundleFile,
  validateBundle,
  previewBundle,
  confirmImport,
  getBundleStatus,
  FileRole,
  UploadedFile,
  ValidateResult,
  PreviewResult,
  BundleStatus,
} from "../api/adapters";

interface ProjectSetupViewProps {
  project: Project;
  onBackToDashboard: () => void;
  showToast: (msg: string) => void;
  onImported?: (projectId: string) => void; // gọi khi import xong (kèm id project)
}

type StagedFile = { file: File; role: FileRole };

const STEPS = [
  { num: 1, label: "Thông tin + LLM" },
  { num: 2, label: "Chọn & gán file" },
  { num: 3, label: "Upload + Validate" },
  { num: 4, label: "Preview parse" },
  { num: 5, label: "Confirm + Theo dõi" },
];

// Ô thả file cố định (1 file/ô). Kéo-thả hoặc click chọn. Chiều cao cố định, không tràn.
function DropSlot(props: {
  label: string;
  hint: string;
  accent: "vsf" | "amber";
  file: File | null;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ring = props.accent === "vsf" ? "border-vsf-400 bg-vsf-50/60" : "border-amber-400 bg-amber-50/60";
  const chip = props.accent === "vsf" ? "text-vsf-700" : "text-amber-700";

  return (
    <div
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
      className={`h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center px-4 transition-colors ${
        props.dragging ? ring : props.file ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300 bg-slate-50/50"
      }`}
    >
      <input
        ref={inputRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onPick(f); e.target.value = ""; }}
      />
      <span className={`text-[11px] font-bold uppercase tracking-wide ${chip}`}>{props.label}</span>

      {props.file ? (
        <>
          <FileText size={22} className="text-emerald-600 my-2" />
          <span className="text-xs font-semibold text-slate-700 truncate max-w-full">{props.file.name}</span>
          <div className="flex gap-2 mt-2">
            <button onClick={() => inputRef.current?.click()} className="text-[11px] font-bold text-slate-500 hover:text-slate-700">Đổi file</button>
            <button onClick={props.onClear} className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-0.5"><X size={11} /> Xóa</button>
          </div>
        </>
      ) : (
        <>
          <Upload size={22} className="text-slate-400 my-2" />
          <span className="text-[11px] text-slate-500">{props.hint}</span>
          <button onClick={() => inputRef.current?.click()} className="mt-2 py-1 px-3 bg-vsf-600 text-white rounded-lg text-[11px] font-bold">Kéo-thả hoặc chọn file</button>
        </>
      )}
    </div>
  );
}

export default function ProjectSetupView({
  project,
  onBackToDashboard,
  showToast,
  onImported,
}: ProjectSetupViewProps) {
  const [mode, setMode] = useState<"list" | "wizard">("list");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1 — project + llm config
  const [projectCode, setProjectCode] = useState("vivipedia");
  const [projectName, setProjectName] = useState("Vivipedia MVP");
  const [description, setDescription] = useState("Review claim-level cho câu trả lời Vivipedia (text-only MVP).");
  const [deadline, setDeadline] = useState("");
  const [llmEndpoint, setLlmEndpoint] = useState("https://openrouter.ai/api/v1");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("openai/gpt-5.4");
  const [promptTemplate, setPromptTemplate] = useState(
    "Chấm claim {{claim_text}} dựa trên nguồn {{source_context}} theo 6 dimension SF/SC/NH/SQ/REL/COMP."
  );
  const [projectId, setProjectId] = useState<string>("");
  const [useExistingProject, setUseExistingProject] = useState(false);

  // Step 2 — file staging (2 slot cố định: answer + source_ref)
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [bundleName, setBundleName] = useState("Bundle 01");
  const [batchName, setBatchName] = useState("Batch 01");

  // Step 3 — upload + validate
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);

  // Step 4 — preview
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // Step 5 — confirm + poll
  const [bundleId, setBundleId] = useState<string>("");
  const [bundleStatus, setBundleStatus] = useState<BundleStatus | null>(null);

  const uploadTokens = uploaded.map((u) => u.uploadToken);

  // Poll bundle status mỗi 2.5s khi đang ở step 5 và chưa done/failed.
  useEffect(() => {
    if (step !== 5 || !bundleId) return;
    if (bundleStatus && ["done", "failed"].includes(bundleStatus.bundleStatus)) return;
    const timer = setInterval(async () => {
      try {
        const st = await getBundleStatus(bundleId);
        setBundleStatus(st);
        if (["done", "failed"].includes(st.bundleStatus)) {
          clearInterval(timer);
          if (st.bundleStatus === "done") {
            showToast("Pipeline xử lý bundle hoàn tất!");
            onImported?.(projectId);
          } else {
            showToast(`Pipeline lỗi: ${st.errorDetail || "không rõ"}`);
          }
        }
      } catch {
        // im lặng, lần poll sau thử lại
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [step, bundleId, bundleStatus, showToast, onImported]);

  const startWizard = () => {
    setMode("wizard");
    setStep(1);
    setStaged([]);
    setUploaded([]);
    setValidation(null);
    setPreview(null);
    setBundleId("");
    setBundleStatus(null);
    setProjectId("");
    setUseExistingProject(false);
  };

  // ---- Step 1: tạo project (hoặc dùng project có sẵn) ----
  const handleCreateProject = async () => {
    if (useExistingProject) {
      if (!project.id) {
        showToast("Chưa có project sẵn — bỏ tick hoặc tạo mới.");
        return;
      }
      setProjectId(project.id);
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      const created = await createProject({
        projectCode,
        projectName,
        description,
        deadline,
        llmEndpoint,
        llmApiKey,
        llmModel,
        promptTemplate,
      });
      setProjectId(created.id);
      showToast(`Đã tạo project "${created.name}".`);
      setStep(2);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không tạo được project.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 2: 2 ô cố định (answer + source_ref), mỗi ô đúng 1 file (kéo-thả hoặc click) ----
  const answerFile = staged.find((s) => s.role === "answer_pdf")?.file ?? null;
  const sourceRefFile = staged.find((s) => s.role === "source_ref_pdf")?.file ?? null;
  const [dragOver, setDragOver] = useState<FileRole | null>(null);

  // Đặt file vào 1 slot role (thay thế file cũ của role đó nếu có).
  const setSlotFile = (role: FileRole, file: File | null) => {
    setStaged((prev) => {
      const others = prev.filter((s) => s.role !== role);
      return file ? [...others, { file, role }] : others;
    });
  };

  const onDropToSlot = (role: FileRole, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") setSlotFile(role, file);
    else if (file) showToast("Chỉ nhận file PDF.");
  };

  // Đủ role bắt buộc khi có cả 2 file.
  const bundleRolesOk = !!answerFile && !!sourceRefFile;
  // ---- Step 3: upload thật + validate ----
  const handleUploadAndValidate = async () => {
    if (staged.length === 0) {
      showToast("Chưa chọn file nào.");
      return;
    }
    setBusy(true);
    try {
      const results: UploadedFile[] = [];
      for (const s of staged) {
        results.push(await uploadBundleFile(s.file, s.role, projectId));
      }
      setUploaded(results);
      const val = await validateBundle(projectId, results.map((r) => r.uploadToken), bundleName);
      setValidation(val);
      if (val.isValid) showToast("Upload + validate OK.");
      else showToast("Bundle không hợp lệ — xem chi tiết lỗi.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi upload/validate.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 4: preview parse ----
  const handlePreview = async () => {
    setBusy(true);
    try {
      const pv = await previewBundle(projectId, uploadTokens);
      setPreview(pv);
      setStep(4);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi preview parse.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 5: confirm ----
  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await confirmImport(projectId, uploadTokens, bundleName, batchName);
      setBundleId(res.bundleId);
      setStep(5);
      showToast(res.message || "Đã enqueue xử lý bundle.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi confirm import.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm";

  return (
    <div className="space-y-6">
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Project Setup & PDF Import Bundle</h2>
          <p className="text-xs text-slate-400 mt-1">Luồng thật: tạo project → upload PDF → validate → preview → confirm → theo dõi pipeline.</p>
        </div>
        <div className="flex gap-2">
          {mode === "wizard" && (
            <button onClick={() => setMode("list")} data-testid={TEST_IDS.projectBackList}
              className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold">
              Danh sách Project
            </button>
          )}
          <button onClick={onBackToDashboard} data-testid={TEST_IDS.projectBackDashboard}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold">
            Dashboard
          </button>
        </div>
      </div>

      {mode === "list" ? (
        <div data-testid={TEST_IDS.projectListPanel}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Project hiện tại</span>
              <strong className="text-lg font-extrabold text-slate-800 block">{project.name}</strong>
              <span className="text-[11px] text-vsf-600 font-semibold uppercase">{project.status}</span>
            </div>
            <button onClick={startWizard} data-testid={TEST_IDS.projectCreateNew}
              className="bg-gradient-to-tr from-vsf-600 to-indigo-600 text-white rounded-xl border border-vsf-500 p-5 shadow flex flex-col justify-center items-center text-center space-y-1.5 group hover:from-vsf-700 hover:to-indigo-700 font-bold">
              <FolderPlus size={24} className="group-hover:scale-110 transition-transform text-teal-300" />
              <span>Tạo Project Mới & Import Bundle</span>
            </button>
          </div>
        </div>
      ) : (
        <div data-testid={TEST_IDS.projectWizardPanel}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60" data-testid={TEST_IDS.projectWizardStepper}>
            {STEPS.map((s) => (
              <div key={s.num} data-testid={TEST_IDS.projectWizardStep(s.num)}
                className={`p-2 rounded-lg text-left border ${
                  step === s.num ? "bg-vsf-600 border-vsf-500 text-white" :
                  step > s.num ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                  "bg-white border-slate-150 text-slate-500"}`}>
                <span className="block text-[10px] font-bold uppercase opacity-80">Bước {s.num}</span>
                <strong className="block text-[11.5px] font-extrabold truncate mt-0.5">{s.label}</strong>
              </div>
            ))}
          </div>

          <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-800">{step}. {STEPS[step - 1].label}</h3>
            </div>
            <div className="p-6 space-y-6">

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={useExistingProject} onChange={(e) => setUseExistingProject(e.target.checked)} />
                    Dùng project có sẵn ({project.name || "chưa có"}) thay vì tạo mới
                  </label>

                  {!useExistingProject && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Mã project (code)</label>
                        <input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className={inputCls} placeholder="vivipedia" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Tên dự án</label>
                        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} data-testid={TEST_IDS.projectNameInput} className={inputCls} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Hạn chót</label>
                        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} data-testid={TEST_IDS.projectDeadlineInput} className={inputCls} />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Mô tả</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid={TEST_IDS.projectDescriptionTextarea} className={inputCls} rows={2} />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">LLM Endpoint</label>
                        <input value={llmEndpoint} onChange={(e) => setLlmEndpoint(e.target.value)} data-testid={TEST_IDS.projectLlmUrlInput} className={inputCls} placeholder="https://openrouter.ai/api/v1" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">API Key</label>
                        <input type="password" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} data-testid={TEST_IDS.projectLlmApiKeyInput} className={inputCls} placeholder="sk-or-..." autoComplete="off" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Model</label>
                        <input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} className={inputCls} placeholder="openai/gpt-5.4" />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Prompt template (phải chứa {"{{claim_text}}"} và {"{{source_context}}"})</label>
                        <textarea value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)} data-testid={TEST_IDS.projectPromptTemplateTextarea} className={inputCls} rows={3} />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button onClick={handleCreateProject} disabled={busy} data-testid={TEST_IDS.projectWizardNext}
                      className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-50">
                      {busy && <Loader2 size={14} className="animate-spin" />}
                      <span>{useExistingProject ? "Dùng project này" : "Tạo project"}</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — 2 ô cố định: Answer PDF + Source Ref PDF (kéo-thả hoặc click) */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Tên Bundle</label>
                      <input value={bundleName} onChange={(e) => setBundleName(e.target.value)} className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Tên Batch</label>
                      <input value={batchName} onChange={(e) => setBatchName(e.target.value)} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4" data-testid={TEST_IDS.projectUploadZone}>
                    {/* Slot 1: Answer PDF */}
                    <DropSlot
                      label="Answer PDF" hint="File câu trả lời"
                      accent="vsf" file={answerFile} dragging={dragOver === "answer_pdf"}
                      onDragOver={(e) => { e.preventDefault(); setDragOver("answer_pdf"); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => onDropToSlot("answer_pdf", e)}
                      onPick={(f) => setSlotFile("answer_pdf", f)}
                      onClear={() => setSlotFile("answer_pdf", null)}
                    />
                    {/* Slot 2: Source Ref PDF */}
                    <DropSlot
                      label="Source Ref PDF" hint="File liệt kê nguồn tham chiếu"
                      accent="amber" file={sourceRefFile} dragging={dragOver === "source_ref_pdf"}
                      onDragOver={(e) => { e.preventDefault(); setDragOver("source_ref_pdf"); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => onDropToSlot("source_ref_pdf", e)}
                      onPick={(f) => setSlotFile("source_ref_pdf", f)}
                      onClear={() => setSlotFile("source_ref_pdf", null)}
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={() => setStep(1)} data-testid={TEST_IDS.projectWizardPrev} className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"><ArrowLeft size={14} /> Quay lại</button>
                    {!bundleRolesOk && <span className="text-[11px] text-amber-700">Cần đủ Answer PDF + Source Ref PDF</span>}
                    <button onClick={() => setStep(3)} disabled={!bundleRolesOk} data-testid={TEST_IDS.projectUploadContinue}
                      className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-40">
                      <span>Tiếp tục (Upload)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-5">
                  {/* Tóm tắt file sẽ upload (role badge) */}
                  <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-[11.5px]">
                    {staged.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="font-semibold text-slate-700 truncate">{s.file.name}</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          s.role === "answer_pdf" ? "bg-vsf-100 text-vsf-700"
                          : s.role === "source_ref_pdf" ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"}`}>{s.role}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleUploadAndValidate} disabled={busy} data-testid={TEST_IDS.projectValidateBundle}
                    className="w-full py-2.5 bg-gradient-to-tr from-vsf-600 to-vsf-700 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                    {busy && <Loader2 size={14} className="animate-spin" />} Upload {staged.length} file + Validate Bundle
                  </button>

                  {validation && (
                    <div data-testid={TEST_IDS.projectValidationPanel} className={`p-4 rounded-xl border text-xs space-y-2 ${validation.isValid ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                      <h4 className="font-extrabold flex items-center gap-1.5">
                        {validation.isValid ? <CheckCircle size={15} /> : <XCircle size={15} />}
                        {validation.isValid ? "Bundle hợp lệ" : "Bundle KHÔNG hợp lệ"}
                      </h4>
                      {validation.files.map((f, i) => (
                        <div key={i} className="font-mono text-[11px]">{f.isValid ? "✓" : "✗"} {f.filename} · {f.fileRole}{f.errors.length > 0 && ` — ${f.errors.join(", ")}`}</div>
                      ))}
                      {validation.errors.map((e, i) => <div key={`e${i}`} className="text-red-700">⛔ {e}</div>)}
                      {validation.warnings.map((w, i) => <div key={`w${i}`} className="text-amber-700">⚠ {w}</div>)}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-between">
                    <button onClick={() => setStep(2)} data-testid={TEST_IDS.projectWizardPrev} className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"><ArrowLeft size={14} /> Quay lại</button>
                    <button onClick={handlePreview} disabled={busy || !validation?.isValid} data-testid={TEST_IDS.projectPreviewParse}
                      className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-40">
                      <span>Tiếp tục (Preview)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && preview && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border"><span className="text-slate-400 block">Title</span><strong className="text-slate-800">{preview.title || "—"}</strong></div>
                    <div className="bg-slate-50 p-3 rounded-lg border"><span className="text-slate-400 block">Domain</span><strong className="text-slate-800">{preview.domainName || preview.domainKey || "—"}</strong></div>
                    <div className="bg-slate-50 p-3 rounded-lg border"><span className="text-slate-400 block">Claim candidates</span><strong className="text-slate-800">{preview.totalClaimCandidates}</strong></div>
                    <div className="bg-slate-50 p-3 rounded-lg border"><span className="text-slate-400 block">Source refs</span><strong className="text-slate-800">{preview.sourceRefCount}</strong></div>
                  </div>

                  <div data-testid={TEST_IDS.projectParsePreviewTable} className="overflow-x-auto">
                    <table className="w-full text-left text-[11.5px] border border-slate-150">
                      <thead><tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="py-2 px-3">Section</th><th className="py-2 px-3">Claims</th><th className="py-2 px-3">Sample</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-150">
                        {preview.sections.map((s, i) => (
                          <tr key={i}><td className="py-2 px-3 font-semibold">{s.heading}</td><td className="py-2 px-3">{s.claimCount}</td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-sm">{s.sampleClaims.join(" | ")}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {preview.warnings.length > 0 && (
                    <div data-testid={TEST_IDS.projectParseWarningBanner} className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 space-y-1">
                      {preview.warnings.map((w, i) => <div key={i} className="flex items-center gap-1.5"><AlertTriangle size={13} /> {w.code}: {w.message}</div>)}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-between">
                    <button onClick={() => setStep(3)} data-testid={TEST_IDS.projectWizardPrev} className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2"><ArrowLeft size={14} /> Quay lại</button>
                    <button onClick={handleConfirm} disabled={busy} data-testid={TEST_IDS.projectConfirmImport}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-50">
                      {busy && <Loader2 size={14} className="animate-spin" />}<span>Xác nhận Import</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="space-y-5" data-testid={TEST_IDS.projectPipelinePanel}>
                  <div className="bg-vsf-50 border border-vsf-100 p-4 rounded-xl text-vsf-700 text-xs">
                    Bundle <strong className="font-mono">{bundleId}</strong> đang được pipeline nền xử lý: parse → claim extract → source map → pre-score.
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    {bundleStatus && ["done", "failed"].includes(bundleStatus.bundleStatus) ? (
                      bundleStatus.bundleStatus === "done"
                        ? <span className="text-emerald-700 flex items-center gap-2"><CheckCircle size={18} /> Hoàn tất ({bundleStatus.fileCount} file)</span>
                        : <span className="text-red-700 flex items-center gap-2"><XCircle size={18} /> Lỗi: {bundleStatus.errorDetail}</span>
                    ) : (
                      <span className="text-vsf-700 flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Trạng thái: {bundleStatus?.bundleStatus || "đang chờ"}…</span>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button onClick={() => onImported?.(projectId)} className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold">Mở chi tiết project →</button>
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
