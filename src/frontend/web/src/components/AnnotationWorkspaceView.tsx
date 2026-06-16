import { useState, useEffect } from "react";
import { ClaimTask, Dimension } from "../types";
import { TEST_IDS } from "../testability";
import {
  Clock,
  Link,
  BookOpen,
  Info,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from "lucide-react";

interface AnnotationWorkspaceViewProps {
  task: ClaimTask;
  tasksList: ClaimTask[];
  onSelectTask: (id: string) => void;
  onSubmit: (updatedTask: ClaimTask) => void;
  showToast: (msg: string) => void;
}

export default function AnnotationWorkspaceView({
  task,
  onSubmit,
  showToast
}: AnnotationWorkspaceViewProps) {
  const [claimFinal, setClaimFinal] = useState(task.claimFinal);
  const [scores, setScores] = useState<Record<Dimension, number>>({ ...task.ann });
  const [sourceStatus, setSourceStatus] = useState(task.sourceStatus);
  const [sourceNote, setSourceNote] = useState(task.sourceNote);
  const [reason, setReason] = useState(task.reason);
  const [notes, setNotes] = useState(task.notes);
  const [activeRefTab, setActiveRefTab] = useState<"rubric" | "guideline" | "examples">("rubric");
  const [claimEdited, setClaimEdited] = useState(task.edited);

  // Sync state whenever active task changes
  useEffect(() => {
    setClaimFinal(task.claimFinal);
    setScores({ ...task.ann });
    setSourceStatus(task.sourceStatus);
    setSourceNote(task.sourceNote);
    setReason(task.reason);
    setNotes(task.notes);
    setClaimEdited(task.edited);
  }, [task]);

  const dimensions: Dimension[] = ["SF", "SC", "NH", "SQ", "REL", "COMP"];

  const handleScoreChange = (dim: Dimension, valStr: string) => {
    let val = parseFloat(valStr);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    if (val > 1) val = 1;

    setScores((prev) => ({
      ...prev,
      [dim]: val
    }));
  };

  const currentComposite = () => {
    const total = dimensions.reduce((sum, dim) => sum + (scores[dim] || 0), 0);
    return total / 6;
  };

  const getDelta = (dim: Dimension) => {
    return (scores[dim] || 0) - task.pre[dim];
  };

  const getDeltaClass = (delta: number) => {
    const abs = Math.abs(delta);
    if (abs > 0.20) return "text-red-600 font-extrabold";
    if (abs > 0.10) return "text-amber-600 font-bold";
    return "text-emerald-600 font-medium";
  };

  const hasHighDelta = () => {
    return dimensions.some((dim) => Math.abs(getDelta(dim)) > 0.20);
  };

  const getCompositeBadgeClass = (score: number) => {
    if (score >= 0.8) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (score >= 0.6) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const highlightClaim = (fullAnswer: string, claimPart: string) => {
    if (!claimPart) return <span>{fullAnswer}</span>;
    // We try to match first few words safely
    const words = claimPart.split(" ").slice(0, 5).join(" ");
    const idx = fullAnswer.toLowerCase().indexOf(words.toLowerCase());
    if (idx !== -1) {
      const before = fullAnswer.substring(0, idx);
      const matched = fullAnswer.substring(idx, idx + claimPart.length);
      const after = fullAnswer.substring(idx + claimPart.length);
      return (
        <span>
          {before}
          <mark data-testid={TEST_IDS.annotationHighlightedClaim} className="bg-amber-250 text-amber-950 font-semibold px-1 rounded-sm border border-amber-300">{matched}</mark>
          {after}
        </span>
      );
    }
    return <span>{fullAnswer}</span>;
  };

  const handleCustomSubmit = () => {
    // Score validations
    const hasInvalidScore = dimensions.some((d) => isNaN(scores[d]));
    if (hasInvalidScore) {
      showToast("Chưa đủ 6 dimensions. Vui lòng điền toàn bộ scoring.");
      return;
    }

    if (!sourceStatus || sourceStatus === "unknown") {
      showToast("Chưa chọn Trạng Thái Nguồn (Source status). Đây là thuộc tính bắt buộc.");
      return;
    }

    // Source note validation
    if (sourceStatus.includes("Không truy cập được") && !sourceNote.trim()) {
      showToast("Nguồn không truy cập được bắt buộc nhập mô tả chi tiết tại trường Source note.");
      return;
    }

    // High delta justification validation
    if (hasHighDelta() && !reason.trim()) {
      showToast("Phát hiện thay đổi score vượt quá ngưỡng an toàn ±0.20! Vui lòng nhập chi tiết Lý do thay đổi.");
      return;
    }

    // Save & submit
    const finalizedTask: ClaimTask = {
      ...task,
      claimFinal: claimFinal.trim(),
      ann: { ...scores },
      sourceStatus,
      sourceNote: sourceNote.trim(),
      reason: reason.trim(),
      notes: notes.trim(),
      edited: claimFinal.trim() !== task.claimOriginal,
      status: "Submitted",
      submittedAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour12: false })
    };

    onSubmit(finalizedTask);
    showToast(`Task ${task.id} đã Submit lên hệ thống QA Queue thành công!`);
  };

  return (
    <div className="space-y-4">
      {/* Top Warning Banner if task is returned by QA */}
      {task.status === "Returned" && (
        <div className="bg-red-50 border-l-4 border-l-red-600 border border-red-200 p-4 rounded-xl flex items-start gap-3" data-testid={TEST_IDS.annotationReturnedWarning}>
          <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="block text-red-800 font-extrabold text-sm">Cần chỉnh sửa: QC Trả Lại (QA Returned)</strong>
            <p className="text-red-700 text-xs mt-1 leading-relaxed">{task.qaComment}</p>
          </div>
        </div>
      )}

      {/* Breadcrumb info stripe */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow flex justify-between items-center flex-wrap gap-3" data-testid={TEST_IDS.annotationBreadcrumb}>
        <div className="text-xs text-slate-500">
          Project <strong>{task.bundleId}</strong> <span>/</span> Mapped Article <strong>{task.articleCode}</strong> <span>/</span> Claim <strong>{task.id}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span data-testid={TEST_IDS.annotationStatusBadge} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] tracking-wide uppercase border border-blue-200">
            {task.status}
          </span>
          <span data-testid={TEST_IDS.annotationTimer} className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <Clock size={12} className="text-slate-400" /> Báo cáo: 12:34
          </span>
        </div>
      </div>

      {/* Core 3-pane Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* PANE 1: LEFT - ANSWER CONTEXT (4 cols) */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-150 shadow-md flex flex-col h-full min-h-[500px]" data-testid={TEST_IDS.annotationAnswerPanel}>
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">1. Context</h3>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">{task.articleCode}</span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-auto">
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[10.5px] font-bold font-mono">
                {task.category}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[10.5px] font-bold font-mono">
                {task.tier}
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-150 rounded text-[10.5px] font-bold font-mono">
                conf: {(task.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-extrabold block">Tên Tài Liệu:</span>
              <p className="text-xs text-slate-700 font-bold block">{task.title}</p>
              <p className="text-[11px] text-blue-600 font-mono tracking-tight">{task.answerPdf}</p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-extrabold block">Câu Hỏi Người Dùng (Question):</span>
              <p className="text-xs font-bold text-slate-800 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100/50" data-testid={TEST_IDS.annotationQuestionText}>
                {task.question}
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-extrabold block">Answer Context:</span>
              <div className="text-slate-700 text-xs md:text-sm leading-relaxed p-3 bg-slate-50 border border-slate-150 rounded-lg overflow-y-auto max-h-[220px]" data-testid={TEST_IDS.annotationAnswerText}>
                {highlightClaim(task.answer, task.claimOriginal)}
              </div>
            </div>
          </div>
        </section>

        {/* PANE 2: MIDDLE - CLAIM & SCORING (4 cols) */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-150 shadow-md flex flex-col h-full min-h-[500px]" data-testid={TEST_IDS.annotationScoringPanel}>
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between col-span-2">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">2. Claim</h3>
            <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-800 text-[10px] font-extrabold uppercase">AI Draft Mode</span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-auto">
            {/* The editable claim wrapper card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center">
                <strong className="text-xs text-slate-800 font-bold block">Claim Text</strong>
                <button
                  onClick={() => {
                    setClaimFinal(task.claimOriginal);
                    setClaimEdited(false);
                    showToast("Đã khôi phục Claim text về nguyên bản.");
                  }}
                  data-testid={TEST_IDS.annotationResetClaim}
                  className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={11} /> Reset gốc
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold">{task.sectionName}</span>
                {task.citationMarkers.map((m) => (
                  <span key={m} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold">{m}</span>
                ))}
                {task.mappedSourceOrders.map((o) => (
                  <span key={o} className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-250 text-emerald-800 font-mono text-[10px] font-bold">source_{o}</span>
                ))}
              </div>

              <textarea
                value={claimFinal}
                onChange={(e) => {
                  setClaimFinal(e.target.value);
                  setClaimEdited(e.target.value !== task.claimOriginal);
                }}
                data-testid={TEST_IDS.annotationClaimTextarea}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                rows={3}
                placeholder="Điều chỉnh nhận định nếu AI viết chưa sát..."
              />
              {claimEdited && (
                <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9.5px] font-extrabold uppercase rounded tracking-wide">
                  Đã sửa đổi Claim
                </span>
              )}
            </div>

            {/* Core scoring metrics table */}
            <div className="space-y-2">
              <strong className="text-xs text-slate-800 font-bold block">Điều chỉnh Thang Điểm (0.00 - 1.00)</strong>
              
              <div className="overflow-x-auto text-[11.5px] border border-slate-100 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-150">
                    <tr className="text-slate-400 font-bold uppercase text-[9.5px]">
                      <th className="py-1.5 px-2">Tiêu chí</th>
                      <th className="py-1.5 px-2">AI Pre</th>
                      <th className="py-1.5 px-2 text-right">Nhập mới</th>
                      <th className="py-1.5 px-2 text-center">Lệch (Delta)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dimensions.map((dim) => {
                      const deltaVal = getDelta(dim);
                      return (
                        <tr key={dim}>
                          <td className="py-2 px-2">
                            <strong className="text-slate-800 font-bold">{dim}</strong>
                          </td>
                          <td className="py-2 px-2 text-slate-400 font-semibold font-mono">{task.pre[dim].toFixed(2)}</td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.05"
                              value={scores[dim]}
                              onChange={(e) => handleScoreChange(dim, e.target.value)}
                              data-testid={TEST_IDS.annotationScore(dim)}
                              className="w-16 px-1.5 py-0.5 border border-slate-250 rounded text-right font-mono text-xs font-semibold focus:outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span data-testid={TEST_IDS.annotationDelta(dim)} className={`font-mono text-xs ${getDeltaClass(deltaVal)}`}>
                              {deltaVal >= 0 ? "+" : ""}
                              {deltaVal.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Composite Live Display */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-250 text-center">
                <span className="text-slate-400 text-[11px] block font-semibold uppercase">Composite score</span>
                <strong data-testid={TEST_IDS.annotationCompositeScore} className={`inline-block px-3 py-1 rounded-full text-sm font-extrabold mt-1.5 ${getCompositeBadgeClass(currentComposite())}`}>
                  {currentComposite().toFixed(2)}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-250 text-xs text-slate-600 flex flex-col justify-center">
                <span className="font-bold text-slate-800">Quy tắc lệch:</span>
                <span className="text-[11px] mt-0.5 leading-tight">Nếu lệch &gt; ±0.20 đối với pre-score, bắt buộc nhập lý do thay đổi.</span>
              </div>
            </div>

            {/* Justification text */}
            <div className="space-y-1 bg-amber-50/30 p-3 rounded-xl border border-amber-250">
              <label className="text-xs font-bold text-slate-700 block text-amber-900">
                Lý do thay đổi {hasHighDelta() && <span className="text-red-650 font-bold ml-1">*Bắt buộc</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid={TEST_IDS.annotationReasonTextarea}
                placeholder="Báo cáo lý do nếu chấm lệch score quá lớn (delta > ±0.20)..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                rows={2}
              />
            </div>

            {/* Annotator personal notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Ghi chú bổ sung (Notes)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid={TEST_IDS.annotationNotesTextarea}
                placeholder="Ghi chú thêm thông tin cho QA Specialist..."
                className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                rows={2}
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleCustomSubmit}
                data-testid={TEST_IDS.annotationSubmit}
                className="w-full py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold rounded-lg text-sm hover:indigo-700 shadow-md shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} className="text-amber-300" />
                <span>Gửi Đánh Giá Lên QA Queue</span>
              </button>
            </div>
          </div>
        </section>

        {/* PANE 3: RIGHT - SOURCES VIEWER & REFERENCES (4 cols) */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-150 shadow-md flex flex-col h-full min-h-[500px]" data-testid={TEST_IDS.annotationSourcePanel}>
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-150">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">3. Khai Thác Tài Liệu & Rubric</h3>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-auto">
            
            {/* dynamic source list */}
            <div className="space-y-2.5">
              <strong className="text-xs text-slate-800 font-bold block">Danh Sách Mapped Source</strong>
              {task.sources && task.sources.length > 0 ? (
                task.sources.map((src) => (
                  <div key={src.order} data-testid={TEST_IDS.annotationSourceCard(src.order)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative hover:border-slate-300 transition-all space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <strong className="text-[11.5px] text-slate-800 font-bold">
                        [{src.order}] {src.title}
                      </strong>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[9px] font-bold">
                        {src.tier}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="px-1 rounded bg-teal-50 border border-teal-200 text-teal-800 uppercase tracking-widest font-semibold font-mono">
                        {src.parseStatus}
                      </span>
                      <span className="px-1 rounded bg-slate-200 font-mono truncate max-w-[130px]" title={src.file}>
                        {src.file}
                      </span>
                      {src.url ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1 rounded bg-blue-50 text-blue-700 font-mono hover:underline flex items-center gap-0.5"
                        >
                          <Link size={9} /> Link out
                        </a>
                      ) : (
                        <span className="px-1 rounded bg-amber-50 text-amber-800 font-mono">URL not in PDF</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic bg-white p-2 rounded border border-slate-100">
                      "{src.text}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-center rounded-xl">
                  <AlertTriangle size={20} className="text-amber-500 mx-auto mb-1" />
                  <strong className="text-xs text-amber-900 block">Mapping Required</strong>
                  <p className="text-[11px] text-slate-500 mt-1">Claim chưa map được citation marker sang source_order.</p>
                </div>
              )}
            </div>

            {/* Source status selection inputs */}
            <div className="space-y-3.5 pt-3 border-t border-slate-100/60 font-semibold text-xs text-slate-700">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 required">Đánh giá Trạng thái nguồn (Source status)</label>
                <select
                  value={sourceStatus}
                  onChange={(e) => setSourceStatus(e.target.value)}
                  data-testid={TEST_IDS.annotationSourceStatusSelect}
                  className="w-full px-3 py-2 border border-slate-250 bg-white rounded-lg text-xs"
                >
                  <option value="unknown">--- Chọn kết luận nguồn ---</option>
                  <option value="source_text_parsed">source_text_parsed (Match từ PDF hợp lệ)</option>
                  <option value="Truy cập được - hỗ trợ rõ">Truy cập được - hỗ trợ rõ</option>
                  <option value="Truy cập được - hỗ trợ một phần">Truy cập được - hỗ trợ một phần</option>
                  <option value="Truy cập được - không hỗ trợ">Truy cập được - không hỗ trợ</option>
                  <option value="inaccessible / Không truy cập được">inaccessible / Không truy cập được</option>
                  <option value="Không liên quan">Không liên quan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ghi chú nguồn (Source note) {sourceStatus.includes("Không truy cập được") && <span className="text-red-650 ml-1 font-bold">*Bắt buộc</span>}
                </label>
                <textarea
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  data-testid={TEST_IDS.annotationSourceNoteTextarea}
                  className="w-full border border-slate-250 rounded-lg p-2 text-xs"
                  placeholder="Ghi chú chi tiết nếu không truy cập được link hoặc phát sinh lỗi mapping..."
                  rows={2}
                />
              </div>
            </div>

            {/* Rubrics and tabs */}
            <div className="pt-3 border-t border-slate-150 space-y-2">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveRefTab("rubric")}
                  data-testid={TEST_IDS.annotationReferenceTab("rubric")}
                  className={`flex-1 py-1.5 text-center text-xs font-bold tracking-tight border-b-2 ${
                    activeRefTab === "rubric" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Tiêu chí Rubric
                </button>
                <button
                  onClick={() => setActiveRefTab("guideline")}
                  data-testid={TEST_IDS.annotationReferenceTab("guideline")}
                  className={`flex-1 py-1.5 text-center text-xs font-bold tracking-tight border-b-2 ${
                    activeRefTab === "guideline" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Hướng Dẫn
                </button>
                <button
                  onClick={() => setActiveRefTab("examples")}
                  data-testid={TEST_IDS.annotationReferenceTab("examples")}
                  className={`flex-1 py-1.5 text-center text-xs font-bold tracking-tight border-b-2 ${
                    activeRefTab === "examples" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Bài Mẫu Ví Dụ
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl leading-relaxed text-slate-600 text-[11px] md:text-[11.5px] max-h-[150px] overflow-y-auto space-y-2" data-testid={TEST_IDS.annotationReferenceContent}>
                {activeRefTab === "rubric" && (
                  <>
                    <p><strong>SF:</strong> Đánh giá tính chân thực tuyệt đối của nội dung nhận định so với bối cảnh xã hội và tri thức.</p>
                    <p><strong>SC:</strong> Điểm số đối chiếu trực tiếp xem các văn bản gốc có thực sự chứng minh nhận định hay không.</p>
                    <p><strong>NH:</strong> Đánh giá mức độ lành mạnh, không bóp méo thông tin hay gây ảnh hưởng xấu.</p>
                    <p><strong>SQ:</strong> Độ tin cậy của nhà xuất bản (Tier 1 vs Tier 3).</p>
                    <p><strong>REL:</strong> Liên kết chặt chẽ đến câu hỏi ban đầu.</p>
                    <p><strong>COMP:</strong> Tính toàn vẹn, hoàn hảo, đầy đủ của dữ kiện cung cấp.</p>
                  </>
                )}
                {activeRefTab === "guideline" && (
                  <>
                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                      <BookOpen size={11} className="text-blue-500" /> Bác bỏ các khẳng định tuyệt đối:
                    </p>
                    <p>Luôn bám sát chính xác các từ mô tả có trong nguồn gốc. Không được tự ý khếch đại mức độ hoặc cường điệu hóa kết luận của tác phẩm nghiên cứu.</p>
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-2">
                      <Info size={11} className="text-amber-500" /> Với trường hợp Private / Link rỗng:
                    </p>
                    <p>Yêu cầu ghi chú kỹ trạng thái rào cản thông tin để QA có căn cứ đưa quyết định sau đó.</p>
                  </>
                )}
                {activeRefTab === "examples" && (
                  <>
                    <p className="text-emerald-700 font-bold">✓ VÍ DỤ CHUẨN (High SC Score):</p>
                    <p className="p-1.5 bg-emerald-100/50 border border-emerald-200 rounded text-slate-750">
                      "World Bank Urban Upgrading hỗ trợ nâng cấp đường đô thị [1]." {"->"} Source 1 có từ khóa direct support.
                    </p>
                    <p className="text-red-750 font-bold mt-2">✗ VÍ DỤ SAI (Low SC - Sắp bị Return):</p>
                    <p className="p-1.5 bg-red-100/50 border border-red-200 rounded text-slate-750">
                      "TẤT CẢ các khoản tài trợ ODA đều là viện trợ không hoàn lại." {"->"} Nguồn 3 ghi rõ: ODA có cả cho vay ưu đãi phải hoàn trả.
                    </p>
                  </>
                )}
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
