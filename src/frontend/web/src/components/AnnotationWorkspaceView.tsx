import { useState, useEffect, useMemo } from "react";
import { ClaimTask, Dimension } from "../types";
import { TEST_IDS } from "../testability";
import {
  Clock,
  Link,
  BookOpen,
  Info,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  SOURCE_ACCESS_OPTIONS,
  DOMAIN_CLASS_LABELS,
  SQ_RUBRIC_PDF_NATIVE,
  dimensionLabel,
  enrichClaimTask,
  hasUnknownMappedTier,
  isScLocked,
  needsSqUnknownNote,
  normalizeTier,
} from "../sqRules";

interface AnnotationWorkspaceViewProps {
  task: ClaimTask;
  tasksList: ClaimTask[];
  onSelectTask: (id: string) => void;
  onSubmit: (updatedTask: ClaimTask) => void;
  showToast: (msg: string) => void;
}

export default function AnnotationWorkspaceView({
  task: rawTask,
  onSubmit,
  showToast
}: AnnotationWorkspaceViewProps) {
  const task = useMemo(() => enrichClaimTask(rawTask), [rawTask]);
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

  useEffect(() => {
    if (isScLocked(sourceStatus)) {
      setScores((prev) => ({ ...prev, SC: 0 }));
    }
  }, [sourceStatus]);

  const dimensions: Dimension[] = ["SF", "SC", "NH", "SQ", "REL", "COMP"];
  const showSqUnknownWarning = hasUnknownMappedTier(task) && (scores.SQ ?? 0) >= 0.75;

  const handleScoreChange = (dim: Dimension, valStr: string) => {
    if (dim === "SC" && isScLocked(sourceStatus)) return;

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
          <mark data-testid={TEST_IDS.annotationHighlightedClaim} className="bg-amber-200 text-amber-950 font-semibold px-1 rounded-sm border border-amber-300">{matched}</mark>
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
      showToast("Chưa chọn trạng thái nguồn (source_access_status). Đây là thuộc tính bắt buộc.");
      return;
    }

    if (sourceStatus === "inaccessible" && !sourceNote.trim()) {
      showToast("Nguồn inaccessible bắt buộc nhập ghi chú nguồn (source note).");
      return;
    }

    if (needsSqUnknownNote(task, scores.SQ ?? 0, sourceNote, reason)) {
      showToast("Tier unknown: nếu SQ ≥ 0,75 vui lòng ghi chú nguồn hoặc lý do thay đổi.");
      return;
    }
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
    <div className="workspace-shell">
      {task.status === "Returned" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3" data-testid={TEST_IDS.annotationReturnedWarning}>
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-red-800 font-semibold text-sm">QA đã trả task — cần chỉnh sửa</strong>
            <p className="text-red-700 text-sm mt-1">{task.qaComment || "Xem comment QA và nộp lại."}</p>
          </div>
        </div>
      )}

      <div className="workspace-toolbar" data-testid={TEST_IDS.annotationBreadcrumb}>
        <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
          <span className="font-mono text-gray-900 font-semibold">{task.id}</span>
          <span className="text-gray-300">·</span>
          <span>{task.articleCode}</span>
          <span className="text-gray-300">·</span>
          <span className="truncate max-w-md">{task.bundleId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span data-testid={TEST_IDS.annotationStatusBadge} className="status-pill bg-vsf-50 text-vsf-700 border-vsf-200">
            {task.status}
          </span>
          <span data-testid={TEST_IDS.annotationTimer} className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={12} /> 12:34
          </span>
        </div>
      </div>

      <div className="workspace-steps">
        <span className="workspace-step workspace-step-active">① Context</span>
        <span className="workspace-step workspace-step-active">② Scoring</span>
        <span className="workspace-step workspace-step-active">③ Sources</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch w-full">
        <section className="workspace-pane lg:col-span-4" data-testid={TEST_IDS.annotationAnswerPanel}>
          <div className="workspace-pane-header">
            <h3 className="workspace-pane-title">Document context</h3>
            <span className="text-xs font-mono text-gray-500">{task.articleCode}</span>
          </div>

          <div className="workspace-pane-body">
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[10.5px] font-bold font-mono">
                {task.category}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[10.5px] font-bold font-mono">
                {task.tier}
              </span>
              <span className="px-2 py-0.5 bg-vsf-50 text-vsf-800 border border-vsf-100 rounded text-[10.5px] font-bold font-mono">
                conf: {(task.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-extrabold block">Tên Tài Liệu:</span>
              <p className="text-xs text-slate-700 font-bold block">{task.title}</p>
              <p className="text-[11px] text-vsf-600 font-mono tracking-tight">{task.answerPdf}</p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-extrabold block">Answer Context:</span>
              <div className="text-slate-700 text-xs md:text-sm leading-relaxed p-3 bg-slate-50 border border-gray-200 rounded-lg overflow-y-auto max-h-[220px]" data-testid={TEST_IDS.annotationAnswerText}>
                {highlightClaim(task.answer, task.claimOriginal)}
              </div>
            </div>
          </div>
        </section>

        <section className="workspace-pane lg:col-span-4" data-testid={TEST_IDS.annotationScoringPanel}>
          <div className="workspace-pane-header">
            <h3 className="workspace-pane-title">Claim &amp; scores</h3>
            <span className="text-xs font-semibold text-vsf-700 bg-vsf-50 px-2 py-0.5 rounded-full">AI draft</span>
          </div>

          <div className="workspace-pane-body">
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
                  className="text-[10px] text-vsf-600 font-bold hover:underline flex items-center gap-1"
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
                  <span key={o} className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold">source_{o}</span>
                ))}
              </div>

              <textarea
                value={claimFinal}
                onChange={(e) => {
                  setClaimFinal(e.target.value);
                  setClaimEdited(e.target.value !== task.claimOriginal);
                }}
                data-testid={TEST_IDS.annotationClaimTextarea}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-vsf-500 font-semibold"
                rows={3}
                placeholder="Điều chỉnh nhận định nếu AI viết chưa sát..."
              />
              {claimEdited && (
                <span className="inline-block px-1.5 py-0.5 bg-vsf-50 text-vsf-700 text-[9.5px] font-extrabold uppercase rounded tracking-wide">
                  Đã sửa đổi Claim
                </span>
              )}
            </div>

            {/* Core scoring metrics table */}
            <div className="space-y-2">
              <strong className="text-xs text-slate-800 font-bold block">Điều chỉnh Thang Điểm (0.00 - 1.00)</strong>
              
              <div className="overflow-x-auto text-[11.5px] border border-slate-100 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-gray-200">
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
                        <tr key={dim} className={dim === "SQ" ? "bg-vsf-50/50" : undefined}>
                          <td className="py-2 px-2">
                            <strong className="text-slate-800 font-bold">{dimensionLabel(dim)}</strong>
                            {dim === "SQ" && (
                              <span className="block text-[9px] text-vsf-600 font-semibold mt-0.5">
                                Pre-score từ rule engine (tier + domain)
                              </span>
                            )}
                            {dim === "SC" && isScLocked(sourceStatus) && (
                              <span className="block text-[9px] text-red-600 font-bold mt-0.5">Khóa SC = 0 (inaccessible)</span>
                            )}
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
                              disabled={dim === "SC" && isScLocked(sourceStatus)}
                              data-testid={TEST_IDS.annotationScore(dim)}
                              className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-right font-mono text-xs font-semibold focus:outline-none focus:border-vsf-600 disabled:bg-slate-100 disabled:text-slate-400"
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

            <div className="grid grid-cols-1 gap-3 pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Quy tắc delta</span>
                <span className="block text-[11px] mt-0.5 leading-relaxed">Lệch &gt; ±0,20 so với pre-score → bắt buộc nhập lý do.</span>
              </div>
            </div>

            {/* Justification text */}
            <div className="space-y-1 bg-amber-50/30 p-3 rounded-xl border border-amber-200">
              <label className="text-xs font-bold text-slate-700 block text-amber-900">
                Lý do thay đổi {hasHighDelta() && <span className="text-red-600 font-bold ml-1">*Bắt buộc</span>}
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
          </div>
        </section>

        <section className="workspace-pane lg:col-span-4" data-testid={TEST_IDS.annotationSourcePanel}>
          <div className="workspace-pane-header">
            <h3 className="workspace-pane-title">Sources &amp; rubric</h3>
            <span className="text-xs text-gray-500">PDF-native</span>
          </div>

          <div className="workspace-pane-body">
            <div className="bg-vsf-50/70 border border-vsf-100 rounded-xl p-3 space-y-1.5" data-testid={TEST_IDS.annotationSqPanel}>
              <div className="flex items-center gap-1.5 text-vsf-900 font-bold text-xs">
                <ShieldCheck size={14} /> Chất lượng nguồn (SQ)
              </div>
              <p className="text-[11px] text-vsf-800 leading-relaxed" data-testid={TEST_IDS.annotationSqHint}>
                Dựa trên <strong>tier</strong> và <strong>loại domain</strong> từ PDF — không cần tìm kiếm web để nộp bài.
                Xác nhận hoặc sửa điểm SQ draft từ rule engine.
              </p>
              {task.sqRationale && (
                <p className="text-[10px] text-gray-600 font-mono bg-white/70 rounded p-2 border border-vsf-100">
                  {task.sqRationale}
                </p>
              )}
            </div>

            {showSqUnknownWarning && (
              <div
                className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900"
                data-testid={TEST_IDS.annotationSqUnknownWarning}
              >
                <strong className="block font-bold">Tier chưa xác định</strong>
                Nếu chấm SQ ≥ 0,75 vui lòng ghi chú nguồn hoặc lý do thay đổi. Có thể mở URL gốc (tùy chọn) để kiểm tra.
              </div>
            )}

            <div className="space-y-2.5">
              <strong className="text-xs text-slate-800 font-bold block">Danh sách nguồn đã map</strong>
              {task.sources && task.sources.length > 0 ? (
                task.sources
                  .filter((src) => task.mappedSourceOrders.includes(src.order))
                  .map((src) => {
                    const tierNorm = normalizeTier(src.tier);
                    const domainClass = src.domainClass ?? "unknown";
                    const highlightUnknown = tierNorm === "unknown";

                    return (
                      <div
                        key={src.order}
                        data-testid={TEST_IDS.annotationSourceCard(src.order)}
                        className={`p-3 rounded-xl border space-y-2 ${
                          highlightUnknown ? "bg-amber-50/80 border-amber-200" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <strong className="text-[11.5px] text-slate-800 font-bold">
                            [{src.order}] {src.title}
                          </strong>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[9px] font-bold">
                            {src.tier}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span
                            data-testid={TEST_IDS.annotationSourceDomainBadge(src.order)}
                            className="px-1.5 py-0.5 rounded bg-vsf-50 border border-vsf-200 text-vsf-800 font-semibold"
                          >
                            {DOMAIN_CLASS_LABELS[domainClass]}
                          </span>
                          <span className="px-1 rounded bg-teal-50 border border-teal-200 text-teal-800 uppercase font-semibold font-mono">
                            {src.parseStatus}
                          </span>
                          <span
                            data-testid={TEST_IDS.annotationSourceSqDraft(src.order)}
                            className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-800 font-bold font-mono"
                          >
                            SQ draft: {(src.sqPrescore ?? task.pre.SQ).toFixed(2)}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded border border-slate-100 max-h-24 overflow-y-auto">
                          {src.text}
                        </p>

                        {src.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={TEST_IDS.annotationSourceOpenUrl(src.order)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                              highlightUnknown
                                ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                                : "bg-white border-slate-200 text-vsf-700 hover:bg-vsf-50"
                            }`}
                          >
                            <ExternalLink size={12} />
                            Mở URL gốc (tùy chọn)
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            <Link size={10} /> URL not in PDF — dùng source text extract
                          </span>
                        )}

                        {src.sqRationale && (
                          <p className="text-[9.5px] text-slate-500 font-mono">{src.sqRationale}</p>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-center rounded-xl">
                  <AlertTriangle size={20} className="text-amber-500 mx-auto mb-1" />
                  <strong className="text-xs text-amber-900 block">Mapping Required</strong>
                  <p className="text-[11px] text-slate-500 mt-1">Claim chưa map được citation marker sang source_order.</p>
                </div>
              )}
            </div>

            <div className="space-y-3.5 pt-3 border-t border-slate-100/60 font-semibold text-xs text-slate-700">
              <div className="space-y-1">
                <label htmlFor="annotation-source-status" className="text-xs font-bold text-slate-700 required">
                  Trạng thái nguồn (source_access_status)
                </label>
                <select
                  id="annotation-source-status"
                  value={sourceStatus}
                  onChange={(e) => setSourceStatus(e.target.value)}
                  data-testid={TEST_IDS.annotationSourceStatusSelect}
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs"
                >
                  {SOURCE_ACCESS_OPTIONS.map((opt) => (
                    <option key={opt.value || "empty"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  PDF-native: chọn <code className="font-mono">source_text_parsed</code> khi đối chiếu được text từ PDF.
                  Chọn <code className="font-mono">inaccessible</code> sẽ khóa SC = 0.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="annotation-source-note" className="text-xs font-bold text-slate-700">
                  Ghi chú nguồn (source note){" "}
                  {(sourceStatus === "inaccessible" || showSqUnknownWarning) && (
                    <span className="text-red-600 ml-1 font-bold">*Bắt buộc</span>
                  )}
                </label>
                <textarea
                  id="annotation-source-note"
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  data-testid={TEST_IDS.annotationSourceNoteTextarea}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs"
                  placeholder="Ghi chú khi inaccessible, tier unknown, hoặc cần giải thích SQ..."
                  rows={2}
                />
              </div>
            </div>

            {/* Rubrics and tabs */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveRefTab("rubric")}
                  data-testid={TEST_IDS.annotationReferenceTab("rubric")}
                  className={`flex-1 py-1.5 text-center text-xs font-bold tracking-tight border-b-2 ${
                    activeRefTab === "rubric" ? "border-vsf-600 text-vsf-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Tiêu chí Rubric
                </button>
                <button
                  onClick={() => setActiveRefTab("guideline")}
                  data-testid={TEST_IDS.annotationReferenceTab("guideline")}
                  className={`flex-1 py-1.5 text-center text-xs font-bold tracking-tight border-b-2 ${
                    activeRefTab === "guideline" ? "border-vsf-600 text-vsf-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Hướng Dẫn
                </button>
                <button
                  onClick={() => setActiveRefTab("examples")}
                  data-testid={TEST_IDS.annotationReferenceTab("examples")}
                  className={`flex-1 py-1.5 text-center text-xs font-bold tracking-tight border-b-2 ${
                    activeRefTab === "examples" ? "border-vsf-600 text-vsf-700" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Bài Mẫu Ví Dụ
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl leading-relaxed text-slate-600 text-[11px] md:text-[11.5px] max-h-[150px] overflow-y-auto space-y-2" data-testid={TEST_IDS.annotationReferenceContent}>
                {activeRefTab === "rubric" && (
                  <>
                    <p><strong>SF:</strong> Độ trung thành với nguồn (đối chiếu source text extract).</p>
                    <p><strong>SC:</strong> Nguồn có cover trực tiếp claim (khóa = 0 nếu inaccessible).</p>
                    <p><strong>NH:</strong> Mức độ không hallucination.</p>
                    <p className="font-bold text-vsf-800 mt-2">SQ (PDF-native — rule engine):</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {SQ_RUBRIC_PDF_NATIVE.map((row) => (
                        <li key={row.band}>
                          <strong>{row.band}:</strong> {row.desc}
                        </li>
                      ))}
                    </ul>
                    <p><strong>REL:</strong> Liên kết với câu hỏi gốc.</p>
                    <p><strong>COMP:</strong> Độ đầy đủ của claim.</p>
                  </>
                )}
                {activeRefTab === "guideline" && (
                  <>
                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                      <BookOpen size={11} className="text-vsf-500" /> Chấm SQ trên platform:
                    </p>
                    <p>Đọc <strong>tier badge</strong> + <strong>domain class</strong> + excerpt PDF. Không bắt buộc web search.</p>
                    <p>Xác nhận SQ draft từ rule engine; sửa nếu disagree và ghi chú khi tier unknown.</p>
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-2">
                      <Info size={11} className="text-amber-500" /> URL / tier unknown:
                    </p>
                    <p>Dùng nút &quot;Mở URL gốc (tùy chọn)&quot; nếu cần verify thủ công — không lưu kết quả search vào export.</p>
                  </>
                )}
                {activeRefTab === "examples" && (
                  <>
                    <p className="text-emerald-700 font-bold">✓ VÍ DỤ CHUẨN (High SC Score):</p>
                    <p className="p-1.5 bg-emerald-100/50 border border-emerald-200 rounded text-gray-700">
                      "World Bank Urban Upgrading hỗ trợ nâng cấp đường đô thị [1]." {"->"} Source 1 có từ khóa direct support.
                    </p>
                    <p className="text-red-750 font-bold mt-2">✗ VÍ DỤ SAI (Low SC - Sắp bị Return):</p>
                    <p className="p-1.5 bg-red-100/50 border border-red-200 rounded text-gray-700">
                      "TẤT CẢ các khoản tài trợ ODA đều là viện trợ không hoàn lại." {"->"} Nguồn 3 ghi rõ: ODA có cả cho vay ưu đãi phải hoàn trả.
                    </p>
                  </>
                )}
              </div>
            </div>

          </div>
        </section>

      </div>

      <div className="workspace-footer">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-gray-500 block">Composite</span>
            <strong
              data-testid={TEST_IDS.annotationCompositeScore}
              className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${getCompositeBadgeClass(currentComposite())}`}
            >
              {currentComposite().toFixed(2)}
            </strong>
          </div>
          <p className="text-xs text-gray-500 max-w-sm hidden sm:block">
            Delta &gt; ±0,20 cần lý do · inaccessible khóa SC = 0
          </p>
        </div>
        <button
          onClick={handleCustomSubmit}
          data-testid={TEST_IDS.annotationSubmit}
          className="btn-primary min-w-[200px]"
        >
          Submit to QA
        </button>
      </div>
    </div>
  );
}
