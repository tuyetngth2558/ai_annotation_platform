import { useEffect, useRef, useState } from "react";
import { TEST_IDS } from "../testability";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertTriangle,
  Loader2,
  XCircle,
  FileText,
  Check,
  ListChecks,
  Link2,
} from "lucide-react";
import {
  createProject,
  assignMembers,
  fetchUserOptions,
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
  type UserOption,
} from "../api/adapters";
import { usePageHeader } from "@/app/providers/PageHeaderProvider";
import { DatePicker } from "@/shared/DatePicker";

interface ProjectSetupViewProps {
  showToast: (msg: string) => void;
  /** Tiếp tục import cho project nháp đã tạo → bỏ qua bước 1, vào thẳng bước chọn file. */
  existingProjectId?: string;
  /** Gọi ngay khi bước 1 tạo xong project (để ghi projectId vào URL, tránh tạo lại). */
  onProjectCreated?: (projectId: string) => void;
  onImported?: (projectId: string) => void; // gọi khi import xong (kèm id project)
}

type StagedFile = { file: File; role: FileRole };

const STEPS = [
  { num: 1, label: "Thông tin dự án" },
  { num: 2, label: "Chọn file + Upload & Validate" },
  { num: 3, label: "Preview parse" },
  { num: 4, label: "Confirm + Theo dõi" },
];

// Giới hạn dung lượng 1 file PDF (khớp BE VR-UP-004: 50 MB).
const MAX_FILE_MB = 50;

// Số dòng section cố định mỗi trang (bảng preview luôn cao đúng 8 dòng).
const SECTION_PAGE = 8;

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
      className={`group h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center px-4 transition-colors ${
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
          {/* Nút thao tác: chỉ rõ khi hover vào ô (di chuột vào mới hiện). */}
          <div className="flex gap-3 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <button onClick={() => inputRef.current?.click()} className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Đổi file</button>
            <button onClick={props.onClear} className="text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer">Xóa</button>
          </div>
        </>
      ) : (
        <>
          <Upload size={22} className="text-slate-400 my-2" />
          <span className="text-[11px] text-slate-500">{props.hint}</span>
          <button onClick={() => inputRef.current?.click()} className="mt-2 py-1 px-3 bg-vsf-600 text-white rounded-lg text-[11px] font-bold cursor-pointer">Kéo-thả hoặc chọn file</button>
        </>
      )}
    </div>
  );
}

export default function ProjectSetupView({
  showToast,
  existingProjectId = "",
  onProjectCreated,
  onImported,
}: ProjectSetupViewProps) {
  // Có project nháp sẵn → vào thẳng bước 2 (chọn file); ngược lại bắt đầu bước 1.
  const [step, setStep] = useState(existingProjectId ? 2 : 1);
  const [busy, setBusy] = useState(false);

  // Stepper đẩy lên thanh header app (sticky) → scroll không mất.
  const stepper = (
    <div className="flex items-center" data-testid={TEST_IDS.projectWizardStepper}>
      {STEPS.map((s, i) => {
        const done = step > s.num;
        const active = step === s.num;
        return (
          <div key={s.num} className="flex items-center">
            <div
              data-testid={TEST_IDS.projectWizardStep(s.num)}
              title={s.label}
              className={`relative flex items-center justify-center rounded-full font-bold transition-all duration-300 ${
                active
                  ? "w-11 h-11 bg-red-600 text-white text-base shadow-lg shadow-red-200 ring-4 ring-red-100 scale-105"
                  : done
                  ? "w-9 h-9 bg-emerald-500 text-white text-sm hover:bg-emerald-600 cursor-default"
                  : "w-9 h-9 bg-white border-2 border-slate-200 text-slate-400 text-sm hover:border-slate-300"
              }`}
            >
              {active && <span className="absolute inset-0 rounded-full bg-red-400 opacity-40 animate-ping" />}
              <span className="relative">{done ? <Check size={17} strokeWidth={3} /> : s.num}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 transition-colors duration-300 ${step > s.num ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
  usePageHeader(
    { title: "Tạo Project & Import Bundle", action: stepper, actionCenter: true },
    [step],
  );

  // Step 1 — project (mã tự sinh phía BE)
  const [projectName, setProjectName] = useState("Vivipedia MVP");
  const [description, setDescription] = useState("Review claim-level cho câu trả lời Vivipedia (text-only MVP).");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [projectId, setProjectId] = useState<string>(existingProjectId);
  // Thành viên chọn lúc tạo (gán sau khi tạo project xong).
  const [userOpts, setUserOpts] = useState<UserOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<{ userId: string; role: "ANNOTATOR" | "QA" }[]>([]);
  useEffect(() => { fetchUserOptions().then(setUserOpts).catch(() => {}); }, []);
  const toggleMember = (userId: string, role: "ANNOTATOR" | "QA") =>
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.userId === userId);
      if (exists) return prev.filter((m) => m.userId !== userId);
      return [...prev, { userId, role }];
    });

  // Step 2 — file staging (2 slot cố định: answer + source_ref) + upload + validate.
  // Tên bundle/batch BE tự sinh → gửi rỗng.
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);

  // Step 4 — preview
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [sectionPage, setSectionPage] = useState(0); // phân trang bảng section (8/trang)

  // Step 5 — confirm + poll
  const [bundleId, setBundleId] = useState<string>("");
  const [bundleStatus, setBundleStatus] = useState<BundleStatus | null>(null);

  const uploadTokens = uploaded.map((u) => u.uploadToken);

  // Poll bundle status mỗi 2.5s khi đang ở step 5 và chưa done/failed.
  useEffect(() => {
    if (step !== 4 || !bundleId) return;
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

  // ---- Step 1: tạo project mới ----
  const handleCreateProject = async () => {
    if (startDate && deadline && startDate > deadline) {
      showToast("Ngày bắt đầu phải trước hoặc bằng hạn chót.");
      return;
    }
    setBusy(true);
    try {
      const created = await createProject({
        projectName,
        description,
        startDate,
        deadline,
      });
      setProjectId(created.id);
      onProjectCreated?.(created.id); // ghi ?projectId vào URL → back/reload không tạo lại
      // Gán thành viên đã chọn (nếu có) vào project vừa tạo.
      if (selectedMembers.length > 0) {
        try {
          await assignMembers(created.id, selectedMembers);
          showToast(`Đã tạo project + gán ${selectedMembers.length} thành viên.`);
        } catch {
          showToast(`Đã tạo project "${created.name}" (gán thành viên lỗi — gán lại ở trang chi tiết).`);
        }
      } else {
        showToast(`Đã tạo project "${created.name}".`);
      }
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

  // Validate FE sớm 1 file (đuôi .pdf + size). Trả message lỗi hoặc null nếu OK.
  const validateFileEarly = (file: File): string | null => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Chỉ nhận file PDF.";
    if (file.size === 0) return "File rỗng.";
    if (file.size > MAX_FILE_MB * 1024 * 1024) return `File vượt ${MAX_FILE_MB} MB.`;
    return null;
  };

  // Đặt file vào 1 slot role (thay thế file cũ của role đó nếu có). Reset validate cũ
  // vì file đổi → kết quả validate trước không còn đúng.
  const setSlotFile = (role: FileRole, file: File | null) => {
    if (file) {
      const err = validateFileEarly(file);
      if (err) { showToast(err); return; }
    }
    setValidation(null);
    setUploaded([]);
    setStaged((prev) => {
      const others = prev.filter((s) => s.role !== role);
      return file ? [...others, { file, role }] : others;
    });
  };

  const onDropToSlot = (role: FileRole, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file) setSlotFile(role, file); // validate trong setSlotFile
  };

  // Đủ role bắt buộc khi có cả 2 file.
  const bundleRolesOk = !!answerFile && !!sourceRefFile;

  // ---- Step 2 (gộp): upload thật + validate ----
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
      const val = await validateBundle(projectId, results.map((r) => r.uploadToken));
      setValidation(val);
      if (val.isValid) showToast("Upload + validate OK.");
      else showToast("Bundle không hợp lệ — xem chi tiết lỗi.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi upload/validate.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 3: preview parse ----
  const handlePreview = async () => {
    setBusy(true);
    try {
      const pv = await previewBundle(projectId, uploadTokens);
      setPreview(pv);
      setSectionPage(0);
      setStep(3);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi preview parse.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 4: confirm ----
  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await confirmImport(projectId, uploadTokens);
      setBundleId(res.bundleId);
      setStep(4);
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
      <div data-testid={TEST_IDS.projectWizardPanel}>
          <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-800">{step}. {STEPS[step - 1].label}</h3>
            </div>
            <div className="p-6 space-y-6">

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Tên dự án</label>
                        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} data-testid={TEST_IDS.projectNameInput} className={inputCls} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Ngày bắt đầu</label>
                        <DatePicker value={startDate} onChange={setStartDate} max={deadline || undefined} placeholder="Chọn ngày bắt đầu" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Hạn chót</label>
                        <DatePicker value={deadline} onChange={setDeadline} min={startDate || undefined} placeholder="Chọn hạn chót" testId={TEST_IDS.projectDeadlineInput} />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Mô tả</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid={TEST_IDS.projectDescriptionTextarea} className={inputCls} rows={2} />
                      </div>
                  </div>

                  {/* Chọn thành viên gán vào project (tùy chọn — có thể gán sau ở trang chi tiết).
                      Tạm hiển thị tối đa 15 (TODO: tìm kiếm/recommend sau). */}
                  {(() => {
                    const eligible = userOpts.filter((u) => u.role === "ANNOTATOR" || u.role === "QA");
                    const MAX_SHOW = 15;
                    const shown = eligible.slice(0, MAX_SHOW);
                    return (
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-slate-700">Gán thành viên</label>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                          {eligible.length === 0 && (
                            <span className="text-xs text-slate-400">Chưa có annotator/QA nào — tạo ở trang Thành viên.</span>
                          )}
                          {shown.map((u) => {
                            const sel = selectedMembers.find((m) => m.userId === u.id);
                            const role: "ANNOTATOR" | "QA" = u.role === "QA" ? "QA" : "ANNOTATOR";
                            return (
                              <button key={u.id} type="button" onClick={() => toggleMember(u.id, role)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                  sel ? "bg-vsf-600 text-white border-vsf-500" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                                {u.email} · {role}
                              </button>
                            );
                          })}
                        </div>
                        {eligible.length > MAX_SHOW && (
                          <p className="text-[11px] text-slate-400">
                            Hiển thị {MAX_SHOW}/{eligible.length} thành viên — gán thêm ở trang chi tiết project (tìm kiếm sẽ bổ sung sau).
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button onClick={handleCreateProject} disabled={busy} data-testid={TEST_IDS.projectWizardNext}
                      className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-50">
                      {busy && <Loader2 size={14} className="animate-spin" />}
                      <span>Tạo project</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 (gộp) — chọn 2 file + Upload & Validate ngay tại chỗ */}
              {step === 2 && (
                <div className="space-y-4">
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

                  {/* Nút upload + validate (cùng 1 bước). Chỉ bật khi đủ 2 file. */}
                  <button onClick={handleUploadAndValidate} disabled={busy || !bundleRolesOk} data-testid={TEST_IDS.projectValidateBundle}
                    className="w-full py-2.5 bg-gradient-to-tr from-vsf-600 to-vsf-700 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-40">
                    {busy && <Loader2 size={14} className="animate-spin" />} Upload & Validate Bundle
                  </button>

                  {/* Chỉ hiện panel khi LỖI (hợp lệ đã có toast). */}
                  {validation && !validation.isValid && (
                    <div data-testid={TEST_IDS.projectValidationPanel} className="p-4 rounded-xl border text-xs space-y-2 bg-red-50 border-red-200 text-red-800">
                      <h4 className="font-extrabold flex items-center gap-1.5">
                        <XCircle size={15} /> Bundle KHÔNG hợp lệ
                      </h4>
                      {validation.files.filter((f) => !f.isValid).map((f, i) => (
                        <div key={i} className="font-mono text-[11px]">✗ {f.filename} · {f.fileRole}{f.errors.length > 0 && ` — ${f.errors.join(", ")}`}</div>
                      ))}
                      {validation.errors.map((e, i) => <div key={`e${i}`} className="text-red-700">⛔ {e}</div>)}
                      {validation.warnings.map((w, i) => <div key={`w${i}`} className="text-amber-700">⚠ {w}</div>)}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    {/* Resume (project nháp đã tạo) → không quay về bước 1 (project đã tồn tại). */}
                    {existingProjectId ? <span /> : (
                      <button onClick={() => setStep(1)} data-testid={TEST_IDS.projectWizardPrev} className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"><ArrowLeft size={14} /> Quay lại</button>
                    )}
                    <button onClick={handlePreview} disabled={busy || !validation?.isValid} data-testid={TEST_IDS.projectPreviewParse}
                      className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-40">
                      <span>Tiếp tục (Preview)</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Preview parse */}
              {step === 3 && preview && (
                <div className="space-y-4">
                  {/* Hàng trên: [tiêu đề trái] · [3 thông số giữa] · [domain phải] */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tài liệu</p>
                      <h4 className="text-base font-bold text-slate-800 truncate">{preview.title || "Chưa rõ tiêu đề"}</h4>
                    </div>

                    {/* 3 thông số ở giữa — icon trên + label dưới (trái), giá trị bên phải */}
                    <div className="flex items-center gap-3 mx-auto">
                      {[
                        { icon: <FileText size={15} />, label: "Claim", value: preview.totalClaimCandidates, accent: "text-vsf-600 bg-vsf-50" },
                        { icon: <ListChecks size={15} />, label: "Sections", value: preview.totalSections, accent: "text-indigo-600 bg-indigo-50" },
                        { icon: <Link2 size={15} />, label: "Nguồn", value: preview.sourceRefCount, accent: "text-amber-600 bg-amber-50" },
                      ].map((c) => (
                        <div key={c.label} className="rounded-lg border border-slate-200 bg-white pl-3 pr-4 py-2.5 flex items-center gap-3 min-w-[124px]">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`w-7 h-7 rounded-md flex items-center justify-center ${c.accent}`}>{c.icon}</span>
                            <span className="text-[11px] text-slate-400 font-medium">{c.label}</span>
                          </div>
                          <div className="ml-auto text-2xl font-extrabold text-slate-900 leading-none">{c.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Domain bên phải */}
                    {(preview.domainName || preview.domainKey) && (
                      <span className="px-2.5 py-1 rounded-full bg-vsf-50 text-vsf-700 text-[11px] font-bold shrink-0">
                        {preview.domainName || preview.domainKey}
                      </span>
                    )}
                  </div>

                  {/* Bảng section — cố định 8 dòng/trang, đủ thì phân trang, thiếu thì đệm dòng trống. */}
                  {(() => {
                    const totalSec = preview.sections.length;
                    const pageCount = Math.max(1, Math.ceil(totalSec / SECTION_PAGE));
                    const cur = Math.min(sectionPage, pageCount - 1);
                    const rows = preview.sections.slice(cur * SECTION_PAGE, cur * SECTION_PAGE + SECTION_PAGE);
                    const emptyRows = SECTION_PAGE - rows.length;
                    return (
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table data-testid={TEST_IDS.projectParsePreviewTable} className="w-full text-left text-[12px] table-fixed">
                          <thead>
                            <tr className="text-slate-400 text-[10px] font-bold uppercase border-b border-slate-100">
                              <th className="py-2 px-4 w-48">Section</th>
                              <th className="py-2 px-3 w-16 text-center">Claims</th>
                              <th className="py-2 px-4">Câu mẫu</th>
                            </tr>
                          </thead>
                          {/* Chiều cao cứng: 8 dòng × 44px (h-11). Rỗng → thông báo + đệm cho đủ 8. */}
                          <tbody className="divide-y divide-slate-100">
                            {totalSec === 0 ? (
                              <>
                                <tr className="h-11">
                                  <td colSpan={3} className="px-4 text-center text-[12px] text-amber-700">
                                    Không trích xuất được claim nào có citation. Claim extraction sẽ dùng toàn bộ text.
                                  </td>
                                </tr>
                                {Array.from({ length: SECTION_PAGE - 1 }).map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-11"><td className="px-4">&nbsp;</td><td /><td /></tr>
                                ))}
                              </>
                            ) : (
                              <>
                                {rows.map((s, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50 align-top h-11">
                                    <td className="py-2.5 px-4 font-semibold text-slate-700 truncate">{s.heading || `Section ${cur * SECTION_PAGE + i + 1}`}</td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className="inline-block px-2 py-0.5 rounded-full bg-vsf-50 text-vsf-700 font-bold text-[11px]">{s.claimCount}</span>
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-500 truncate">{s.sampleClaims.join(" · ") || "—"}</td>
                                  </tr>
                                ))}
                                {/* Đệm dòng trống cho đủ 8 → chiều cao bảng cố định, không co. */}
                                {Array.from({ length: emptyRows }).map((_, i) => (
                                  <tr key={`empty-${i}`} className="h-11"><td className="px-4">&nbsp;</td><td /><td /></tr>
                                ))}
                              </>
                            )}
                          </tbody>
                        </table>
                        {pageCount > 1 && (
                          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-[11px]">
                            <span className="text-slate-400">Trang {cur + 1}/{pageCount}</span>
                            <div className="flex gap-1">
                              <button onClick={() => setSectionPage(Math.max(0, cur - 1))} disabled={cur === 0}
                                className="px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer">‹ Trước</button>
                              <button onClick={() => setSectionPage(Math.min(pageCount - 1, cur + 1))} disabled={cur >= pageCount - 1}
                                className="px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer">Sau ›</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Cảnh báo khác (đã bỏ cảnh báo 'no citation' vì hiện ngay trong bảng). */}
                  {(() => {
                    const others = preview.warnings.filter((w) => !/citation/i.test(w.message));
                    if (others.length === 0) return null;
                    return (
                      <div data-testid={TEST_IDS.projectParseWarningBanner} className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 space-y-1">
                        {others.map((w, i) => <div key={i} className="flex items-center gap-1.5"><AlertTriangle size={13} /> {w.message}</div>)}
                      </div>
                    );
                  })()}

                  <div className="pt-4 border-t border-slate-100 flex justify-between">
                    <button onClick={() => setStep(2)} data-testid={TEST_IDS.projectWizardPrev} className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"><ArrowLeft size={14} /> Quay lại</button>
                    <button onClick={handleConfirm} disabled={busy} data-testid={TEST_IDS.projectConfirmImport}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-50 cursor-pointer">
                      {busy && <Loader2 size={14} className="animate-spin" />}<span>Xác nhận Import</span> <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — theo dõi pipeline (không hiện UUID; mô tả 4 giai đoạn) */}
              {step === 4 && (() => {
                const st = bundleStatus?.bundleStatus || "queued";
                const isDone = st === "done";
                const isFailed = st === "failed";
                // 4 giai đoạn pipeline + thứ tự để tô màu theo tiến độ.
                const STAGES = [
                  { key: "parsing", label: "Đọc & tách nội dung PDF" },
                  { key: "extracting", label: "Trích xuất claim" },
                  { key: "mapping", label: "Đối chiếu nguồn tham chiếu" },
                  { key: "pre_scoring", label: "LLM chấm điểm sơ bộ" },
                ];
                // Suy ra giai đoạn hiện tại (đơn giản theo status BE; done = xong hết).
                const curIdx = isDone ? STAGES.length
                  : st === "pre_scoring" ? 3
                  : st === "parsing" ? 1
                  : 0;
                return (
                  <div className="space-y-5" data-testid={TEST_IDS.projectPipelinePanel}>
                    {/* Banner trạng thái tổng */}
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      isDone ? "bg-emerald-50 border-emerald-200" : isFailed ? "bg-red-50 border-red-200" : "bg-vsf-50 border-vsf-100"
                    }`}>
                      {isDone ? <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                        : isFailed ? <XCircle size={20} className="text-red-600 shrink-0" />
                        : <Loader2 size={20} className="text-vsf-600 animate-spin shrink-0" />}
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${isDone ? "text-emerald-700" : isFailed ? "text-red-700" : "text-vsf-700"}`}>
                          {isDone ? "Import hoàn tất!" : isFailed ? "Pipeline gặp lỗi" : "Đang xử lý dữ liệu…"}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          {isDone ? "Dữ liệu đã sẵn sàng — mở project để gán nhân sự."
                            : isFailed ? (bundleStatus?.errorDetail || "Vui lòng thử import lại.")
                            : "Hệ thống đang chạy nền, quá trình này có thể mất vài chục giây."}
                        </p>
                      </div>
                    </div>

                    {/* Các giai đoạn */}
                    {!isFailed && (
                      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {STAGES.map((s, i) => {
                          const done = i < curIdx;
                          const active = i === curIdx && !isDone;
                          return (
                            <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                done ? "bg-emerald-500 text-white"
                                : active ? "bg-vsf-600 text-white"
                                : "bg-slate-100 text-slate-400"
                              }`}>
                                {done ? <Check size={13} strokeWidth={3} /> : active ? <Loader2 size={13} className="animate-spin" /> : i + 1}
                              </span>
                              <span className={`text-[13px] ${done || active ? "text-slate-700 font-semibold" : "text-slate-400"}`}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button onClick={() => onImported?.(projectId)}
                        className="py-2 px-4 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                        {isDone ? "Mở chi tiết project →" : "Vào project (xử lý tiếp ở nền) →"}
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>
          </section>
      </div>
    </div>
  );
}
