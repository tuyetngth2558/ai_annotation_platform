import { useMemo, useState } from "react";
import { ClaimTask, Dimension } from "../types";
import { TEST_IDS } from "../testability";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  History,
  Info,
  CheckSquare,
  BookOpen,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import {
  DOMAIN_CLASS_LABELS,
  dimensionLabel,
  enrichClaimTask,
  normalizeTier,
} from "../sqRules";

interface QaReviewViewProps {
  task: ClaimTask;
  onBackToQueue: () => void;
  onApprove: (id: string) => void;
  onReturn: (id: string, errorType: string, comment: string) => void;
  showToast: (msg: string) => void;
}

export default function QaReviewView({
  task: rawTask,
  onBackToQueue,
  onApprove,
  onReturn,
  showToast,
}: QaReviewViewProps) {
  const task = useMemo(() => enrichClaimTask(rawTask), [rawTask]);
  const [activeSubTab, setActiveSubTab] = useState<"review" | "history">("review");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnErrorType, setReturnErrorType] = useState("");
  const [returnComment, setReturnComment] = useState("");

  const dimensions: Dimension[] = ["SF", "SC", "NH", "SQ", "REL", "COMP"];
  const isReviewable = task.status === "Submitted";

  const getCompositeAverage = (scores: Record<Dimension, number>) => {
    const total = dimensions.reduce((sum, dim) => sum + (scores[dim] || 0), 0);
    return total / 6;
  };

  const getDeltaClass = (delta: number) => {
    const abs = Math.abs(delta);
    if (abs > 0.2) return "text-red-600 font-extrabold";
    if (abs > 0.1) return "text-amber-600 font-bold";
    return "text-emerald-600 font-medium";
  };

  const handleApproveAction = () => {
    if (!isReviewable) return;
    onApprove(task.id);
    showToast(`Task ${task.id} đã được chấp thuận (Approved) thành công!`);
    onBackToQueue();
  };

  const handleOpenReturnModal = () => {
    if (!isReviewable) return;
    setReturnErrorType("");
    setReturnComment("");
    setShowReturnModal(true);
  };

  const handleConfirmReturn = () => {
    if (!returnErrorType) {
      showToast("Vui lòng chọn loại lỗi bắt buộc (Error type).");
      return;
    }
    if (!returnComment.trim()) {
      showToast("Vui lòng nhập mô tả ý kiến phản hồi chi tiết (Comment).");
      return;
    }

    onReturn(task.id, returnErrorType, returnComment);
    showToast(`Task ${task.id} đã được gửi trả lại (Returned) thành công.`);
    setShowReturnModal(false);
    onBackToQueue();
  };

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-100 p-4 shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500" data-testid={TEST_IDS.qaReviewBreadcrumb}>
            <button onClick={onBackToQueue} data-testid={TEST_IDS.qaBackQueue} className="hover:underline font-bold text-vsf-600 flex items-center gap-0.5">
              <ArrowLeft size={12} /> Quay lại Queue
            </button>
            <span>/</span>
            <span>QA Review Workspace</span>
            <span>/</span>
            <span>{task.id}</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">
            Thẩm Định Task: <span className="font-mono text-vsf-600">{task.id}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            Annotator: {task.annotator}
          </span>
          <span data-testid={TEST_IDS.qaReviewStatusBadge} className="px-2.5 py-1 rounded-full bg-vsf-50 text-vsf-800 border border-vsf-200 text-xs font-bold font-mono">
            {task.status}
          </span>
        </div>
      </section>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveSubTab("review")}
            data-testid={TEST_IDS.qaReviewTab("review")}
            className={`py-3 px-5 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeSubTab === "review"
                ? "border-vsf-600 text-vsf-700 bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText size={16} /> Chi tiết chấm điểm
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            data-testid={TEST_IDS.qaReviewTab("history")}
            className={`py-3 px-5 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeSubTab === "history"
                ? "border-vsf-600 text-vsf-700 bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <History size={16} /> Lịch sử chỉnh sửa
          </button>
        </div>

        <div className="p-5">
          {activeSubTab === "review" ? (
            <div className="space-y-6">
              <section
                className="bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden"
                data-testid="qa-original-article-panel"
              >
                <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <BookOpen size={15} className="text-vsf-600" /> Hồ sơ PDF để QA đối chiếu
                  </h3>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      {task.articleCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-vsf-50 text-vsf-800 border border-vsf-100 font-mono">
                      {task.answerPdf || "answer_pdf_pending"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {task.sectionName}
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                  <div className="lg:col-span-4 space-y-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                      <strong className="block text-slate-400 uppercase tracking-wide text-[9.5px]">
                        Tài liệu / tiêu đề
                      </strong>
                      <p className="font-bold text-slate-900 leading-relaxed">{task.title}</p>
                      <p className="text-slate-500 font-semibold">
                        {task.category} · {task.tier} · confidence {(task.confidenceScore * 100).toFixed(0)}%
                      </p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                      <strong className="block text-slate-400 uppercase tracking-wide text-[9.5px]">
                        Claim gốc được trích xuất
                      </strong>
                      <p
                        className="text-slate-800 font-semibold leading-relaxed bg-amber-50/70 border border-amber-150 rounded-lg p-2"
                        data-testid="qa-original-claim-text"
                      >
                        {task.claimOriginal}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {task.citationMarkers.map((marker) => (
                          <span key={marker} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                            {marker}
                          </span>
                        ))}
                        {task.mappedSourceOrders.map((order) => (
                          <span key={order} className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold">
                            source_{order}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                    <strong className="block text-slate-400 uppercase tracking-wide text-[9.5px]">
                      Nội dung answer context
                    </strong>
                    <div
                      className="max-h-[280px] overflow-y-auto rounded-lg bg-slate-50 border border-gray-200 p-3 text-gray-700 leading-relaxed text-sm whitespace-pre-wrap"
                      data-testid="qa-original-answer-text"
                    >
                      {task.answer}
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs">
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm" data-testid={TEST_IDS.qaBaselinePanel}>
                  <strong className="block text-slate-400 font-extrabold uppercase text-[10px]">
                    Pre-score (LLM + SQ Rule)
                  </strong>
                  <div className="space-y-1 text-slate-700">
                    {dimensions.map((dim) => (
                      <div key={dim} className="flex justify-between items-center py-0.5 border-b border-slate-50 font-semibold px-2">
                        <span>{dimensionLabel(dim)}:</span>
                        <span className="font-mono">{task.pre[dim].toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 font-bold px-2 text-slate-900 border-t border-dashed mt-2">
                      <span>Composite:</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{getCompositeAverage(task.pre).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm" data-testid={TEST_IDS.qaAnnotatorOutputPanel}>
                  <strong className="block text-slate-400 font-extrabold uppercase text-[10px]">Annotator Scores</strong>
                  <div className="space-y-1 text-slate-700">
                    {dimensions.map((dim) => (
                      <div key={dim} className="flex justify-between items-center py-0.5 border-b border-slate-50 font-semibold px-2">
                        <span>{dimensionLabel(dim)}:</span>
                        <span className="font-mono">{task.ann[dim].toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 font-bold px-2 text-vsf-800 border-t border-dashed mt-2">
                      <span>Composite:</span>
                      <span className="bg-vsf-50 px-2 py-0.5 rounded font-mono">{getCompositeAverage(task.ann).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm" data-testid={TEST_IDS.qaDeltaPanel}>
                  <strong className="block text-slate-400 font-extrabold uppercase text-[10px]">Độ lệch (Delta)</strong>
                  <div className="space-y-1 text-slate-700">
                    {dimensions.map((dim) => {
                      const deltaVal = task.ann[dim] - task.pre[dim];
                      return (
                        <div key={dim} className="flex justify-between items-center py-0.5 border-b border-slate-50 px-2">
                          <span>{dimensionLabel(dim)}:</span>
                          <span className={`${getDeltaClass(deltaVal)} font-mono`}>
                            {deltaVal >= 0 ? "+" : ""}
                            {deltaVal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2 font-bold px-2 text-slate-900 border-t border-dashed mt-2">
                      <span>Delta Comp:</span>
                      {(() => {
                        const compositeDelta = getCompositeAverage(task.ann) - getCompositeAverage(task.pre);
                        return (
                          <span className={`${getDeltaClass(compositeDelta)} font-mono`}>
                            {compositeDelta >= 0 ? "+" : ""}
                            {compositeDelta.toFixed(2)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="bg-slate-50/50 p-4 border border-gray-200 rounded-xl space-y-3" data-testid={TEST_IDS.qaClaimDetailPanel}>
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Info size={14} className="text-vsf-600" /> Claim sau khi annotator xử lý
                    {task.edited && <span className="bg-vsf-100 text-vsf-800 text-[9px] px-1 rounded ml-1 uppercase">Đã sửa</span>}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">{task.articleCode}</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">{task.sectionName}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">{task.bundleId}</span>
                  </div>
                  <p className="p-3 bg-white border border-gray-200 rounded-lg text-slate-800 leading-relaxed font-semibold">
                    {task.claimFinal}
                  </p>

                  <div className="space-y-1.5">
                    <strong className="block text-slate-400 font-bold uppercase text-[9px]">Lý do thay đổi (Annotator Reason):</strong>
                    <p className="text-slate-700 italic bg-white p-2.5 rounded border border-slate-100">
                      {task.reason || "Không phát hiện thay đổi score vượt quá ngưỡng ±0.20."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <strong className="block text-slate-400 font-bold uppercase text-[9px]">Annotator Notes:</strong>
                    <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-100">
                      {task.notes || "Không có ghi chú thêm."}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 border border-gray-200 rounded-xl space-y-3" data-testid={TEST_IDS.qaSourceDetailPanel}>
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-teal-600" /> Bản đồ nguồn & SQ (PDF-native)
                  </h4>

                  {task.sqRationale && (
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1 text-indigo-900 font-bold text-[11px]">
                        <ShieldCheck size={13} /> SQ Rule Engine rationale
                      </div>
                      <p className="text-[10px] text-slate-600 font-mono leading-relaxed">{task.sqRationale}</p>
                      {task.sqEngine === "rule" && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[9px] font-bold">
                          sq_engine=rule (không dùng web search)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {task.sources && task.sources.length > 0 ? (
                      task.sources
                        .filter((src) => task.mappedSourceOrders.includes(src.order))
                        .map((src) => {
                          const tierNorm = normalizeTier(src.tier);
                          const domainClass = src.domainClass ?? "unknown";
                          return (
                            <div key={src.order} className="bg-white p-2.5 rounded-lg border border-gray-200 text-[11px] space-y-1.5">
                              <div className="flex justify-between gap-2">
                                <strong className="text-slate-800">[{src.order}] {src.title}</strong>
                                <span className="px-1 py-0.5 rounded bg-slate-200 font-mono text-[9px]">{src.tier}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-vsf-800 font-semibold">
                                  {DOMAIN_CLASS_LABELS[domainClass]}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-800 font-bold font-mono">
                                  SQ draft: {(src.sqPrescore ?? task.pre.SQ).toFixed(2)}
                                </span>
                                {tierNorm === "unknown" && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-900 font-bold">
                                    tier unknown — cần review
                                  </span>
                                )}
                              </div>
                              <span className="block text-slate-400 text-[10px] font-mono">
                                {src.file} · {src.parseStatus}
                              </span>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-vsf-700 hover:underline text-[10px] font-semibold"
                                >
                                  <ExternalLink size={10} /> Mở URL gốc (tùy chọn)
                                </a>
                              )}
                              {src.sqRationale && (
                                <p className="text-[9.5px] text-slate-500 font-mono">{src.sqRationale}</p>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-slate-400 font-medium">Chưa có source mapping.</p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t">
                    <strong className="block text-slate-400 font-bold uppercase text-[9px]">
                      Trạng thái nguồn (source_access_status):
                    </strong>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-vsf-50 text-vsf-800 border border-vsf-100 text-xs font-semibold font-mono">
                      {task.sourceStatus || "Chưa đánh giá"}
                    </span>
                  </div>

                  {task.sourceNote && (
                    <div className="space-y-1.5">
                      <strong className="block text-slate-400 font-bold uppercase text-[9px]">Ghi chú nguồn (Source note):</strong>
                      <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-100 text-[11px]">
                        {task.sourceNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 font-bold space-y-3">
                {!isReviewable && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    Task đang ở trạng thái <strong>{task.status}</strong>. Theo workflow QA, mục này chỉ còn để xem lịch sử và đối chiếu, không cho approve hoặc return lần nữa.
                  </div>
                )}
                {isReviewable && (
                  <div className="flex gap-3.5">
                    <button
                      type="button"
                      onClick={handleApproveAction}
                      data-testid={TEST_IDS.qaApprove}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-tr from-emerald-600 to-emerald-700 text-white rounded-lg text-sm hover:from-emerald-700 hover:to-emerald-800 shadow shadow-emerald-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={15} /> Phê duyệt hồ sơ (Approve)
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenReturnModal}
                      data-testid={TEST_IDS.qaReturnOpen}
                      className="flex-1 py-2.5 px-4 bg-white border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50 flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} /> Trả lại xử lý (Return)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="timeline-container space-y-6 max-w-2xl mx-auto py-2" data-testid={TEST_IDS.qaHistoryTimeline}>
              <div className="timeline-track relative pl-6 border-l-2 border-slate-200 space-y-6">
                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800">Tải tài liệu thô (Uploaded Bundle)</strong>
                    <span className="block text-slate-400 font-medium">Hệ thống ghi nhận Bundle {task.bundleId} gồm Answer PDF và Sources.</span>
                  </div>
                </div>

                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800">Trích xuất nội dung (Parsing Complete)</strong>
                    <span className="block text-slate-400 font-medium">Hoàn tất chuẩn hóa khối chữ từ bộ PDF nhập vào.</span>
                  </div>
                </div>

                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800 font-bold">Thẩm định sơ bộ (Pre-scoring Completed)</strong>
                    <span className="block text-slate-400 font-medium">
                      LLM pre-score 5 chiều + SQ từ rule engine (tier + domain từ PDF, không web search).
                    </span>
                  </div>
                </div>

                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-vsf-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800">Nộp hồ sơ (Annotator Submitted)</strong>
                    <span className="block text-slate-400 font-medium">Annotator điều chỉnh score, hoàn thiện mapping nguồn và chuyển giao cho QA Queue.</span>
                    <span className="inline-block mt-0.5 text-vsf-600 font-semibold font-mono text-[10px]">
                      {task.submittedAt || "Mới nhất"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" role="dialog" aria-modal="true" data-testid={TEST_IDS.qaReturnModal}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
            <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <h3 className="font-extrabold text-red-900 text-sm flex items-center gap-1.5">
                <AlertTriangle size={15} /> Trả Claim Task cho Annotator
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                data-testid={TEST_IDS.qaReturnClose}
                className="text-red-400 hover:text-red-700 text-xs font-bold"
              >
                Đóng
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Phân loại sai sót (Error Type) <span className="text-red-600 font-bold">*Bắt buộc</span></label>
                <select
                  value={returnErrorType}
                  onChange={(e) => setReturnErrorType(e.target.value)}
                  data-testid={TEST_IDS.qaReturnTypeSelect}
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs"
                >
                  <option value="">Chọn loại lỗi phát hiện</option>
                  <option value="Factual Error">Factual Error</option>
                  <option value="Guideline Violation">Guideline Violation</option>
                  <option value="Source Mismatch">Source Mismatch</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ý kiến phản hồi / mô tả sửa lỗi <span className="text-red-600 font-bold">*Bắt buộc</span></label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  data-testid={TEST_IDS.qaReturnCommentTextarea}
                  placeholder="Nêu rõ lý do trả hàng và những điểm cụ thể annotator cần chỉnh sửa để resubmit..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-slate-800"
                  rows={4}
                  required
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 font-bold">
              <button
                onClick={() => setShowReturnModal(false)}
                data-testid={TEST_IDS.qaReturnCancel}
                className="py-1.5 px-3 border border-slate-200 hover:bg-slate-100 text-gray-600 rounded-lg text-xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReturn}
                data-testid={TEST_IDS.qaReturnConfirm}
                className="py-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs shadow"
              >
                Xác nhận Trả Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
