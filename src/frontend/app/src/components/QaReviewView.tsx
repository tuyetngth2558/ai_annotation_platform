import { useState } from "react";
import { ClaimTask, Dimension } from "../types";
import { TEST_IDS } from "../testability";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  MessageSquare,
  AlertTriangle,
  History,
  Info,
  CheckSquare
} from "lucide-react";

interface QaReviewViewProps {
  task: ClaimTask;
  onBackToQueue: () => void;
  onApprove: (id: string) => void;
  onReturn: (id: string, errorType: string, comment: string) => void;
  showToast: (msg: string) => void;
}

export default function QaReviewView({
  task,
  onBackToQueue,
  onApprove,
  onReturn,
  showToast
}: QaReviewViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"review" | "history">("review");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnErrorType, setReturnReturnErrorType] = useState("");
  const [returnComment, setReturnComment] = useState("");

  const dimensions: Dimension[] = ["SF", "SC", "NH", "SQ", "REL", "COMP"];

  const getCompositeAverage = (scores: Record<Dimension, number>) => {
    const total = dimensions.reduce((sum, dim) => sum + (scores[dim] || 0), 0);
    return total / 6;
  };

  const getDeltaClass = (delta: number) => {
    const abs = Math.abs(delta);
    if (abs > 0.20) return "text-red-600 font-extrabold";
    if (abs > 0.10) return "text-amber-600 font-bold";
    return "text-emerald-600 font-medium";
  };

  const handleApproveAction = () => {
    onApprove(task.id);
    showToast(`Task ${task.id} đã được chấp thuận (Approved) thành công!`);
    onBackToQueue();
  };

  const handleOpenReturnModal = () => {
    setReturnReturnErrorType("");
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
      
      {/* Top action context banner */}
      <section className="bg-white rounded-xl border border-slate-100 p-4 shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500" data-testid={TEST_IDS.qaReviewBreadcrumb}>
            <button onClick={onBackToQueue} data-testid={TEST_IDS.qaBackQueue} className="hover:underline font-bold text-blue-600 flex items-center gap-0.5">
              <ArrowLeft size={12} /> Quay lại Queue
            </button>
            <span>/</span>
            <span>QA Review Workspace</span>
            <span>/</span>
            <span>{task.id}</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">
            Thẩm Định Task: <span className="font-mono text-blue-600">{task.id}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            Annotator: {task.annotator}
          </span>
          <span data-testid={TEST_IDS.qaReviewStatusBadge} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold font-mono">
            {task.status}
          </span>
        </div>
      </section>

      {/* Tabs navigation options */}
      <div className="bg-white rounded-xl border border-slate-150 overflow-hidden shadow">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveSubTab("review")}
            data-testid={TEST_IDS.qaReviewTab("review")}
            className={`py-3 px-5 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeSubTab === "review"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText size={16} /> Chi tiết chấm điểm (Review)
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            data-testid={TEST_IDS.qaReviewTab("history")}
            className={`py-3 px-5 text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeSubTab === "history"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <History size={16} /> Lịch sử chỉnh sửa (History)
          </button>
        </div>

        <div className="p-5">
          {activeSubTab === "review" ? (
            <div className="space-y-6">
              
              {/* Score comparisons panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs">
                
                {/* Column 1: AI Baseline */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm" data-testid={TEST_IDS.qaBaselinePanel}>
                  <strong className="block text-slate-400 font-extrabold uppercase text-[10px]">LLM Baseline Scores</strong>
                  <div className="space-y-1 text-slate-700">
                    {dimensions.map((dim) => (
                      <div key={dim} className="flex justify-between items-center py-0.5 border-b border-slate-50 font-semibold px-2">
                        <span>{dim}:</span>
                        <span className="font-mono">{task.pre[dim].toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 font-bold px-2 text-slate-900 border-t border-dashed mt-2">
                      <span>Composite:</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{getCompositeAverage(task.pre).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Annotator Output */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm" data-testid={TEST_IDS.qaAnnotatorOutputPanel}>
                  <strong className="block text-slate-400 font-extrabold uppercase text-[10px]">Annotator Scores</strong>
                  <div className="space-y-1 text-slate-700">
                    {dimensions.map((dim) => (
                      <div key={dim} className="flex justify-between items-center py-0.5 border-b border-slate-50 font-semibold px-2">
                        <span>{dim}:</span>
                        <span className="font-mono">{task.ann[dim].toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 font-bold px-2 text-blue-800 border-t border-dashed mt-2">
                      <span>Composite:</span>
                      <span className="bg-blue-50 px-2 py-0.5 rounded font-mono">{getCompositeAverage(task.ann).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Live Delta calculation */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm" data-testid={TEST_IDS.qaDeltaPanel}>
                  <strong className="block text-slate-400 font-extrabold uppercase text-[10px]">Độ lệch (Delta)</strong>
                  <div className="space-y-1 text-slate-700">
                    {dimensions.map((dim) => {
                      const deltaVal = task.ann[dim] - task.pre[dim];
                      return (
                        <div key={dim} className="flex justify-between items-center py-0.5 border-b border-slate-50 px-2">
                          <span>{dim}:</span>
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

              {/* Specific metadata details & comments rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                
                {/* Visual claim definition */}
                <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3" data-testid={TEST_IDS.qaClaimDetailPanel}>
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Info size={14} className="text-blue-600" /> Nhận Định Được Bản Địa Hóa {task.edited && <span className="bg-blue-100 text-blue-800 text-[9px] px-1 rounded ml-1 uppercase">Đã Sửa</span>}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">{task.articleCode}</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">{task.sectionName}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">{task.bundleId}</span>
                  </div>
                  <p className="p-3 bg-white border border-slate-150 rounded-lg text-slate-800 leading-relaxed font-semibold">
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

                {/* Assigned source reference values */}
                <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3" data-testid={TEST_IDS.qaSourceDetailPanel}>
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-teal-600" /> Bản đồ nguồn thô (Sources mapping)
                  </h4>
                  <div className="space-y-2">
                    {task.sources && task.sources.length > 0 ? (
                      task.sources.map((src) => (
                        <div key={src.order} className="bg-white p-2 rounded-lg border border-slate-150 text-[11px] space-y-1">
                          <strong className="block text-slate-800">[{src.order}] {src.title}</strong>
                          <span className="block text-slate-400 text-[10.5px] font-mono">
                            {src.file} · {src.tier} {src.url ? `· ${src.url}` : " · URL not in PDF"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 font-medium">Chưa có source mapping.</p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t">
                    <strong className="block text-slate-400 font-bold uppercase text-[9px]">KẾT LUẬN NGUỒN (SOURCE STATUS):</strong>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-150 text-xs font-semibold">
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

              {/* Action buttons */}
              <div className="flex gap-3.5 pt-4 border-t border-slate-100 font-bold">
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

            </div>
          ) : (
            /* Tab HISTORY TIMELINE */
            <div className="timeline-container space-y-6 max-w-2xl mx-auto py-2" data-testid={TEST_IDS.qaHistoryTimeline}>
              <div className="timeline-track relative pl-6 border-l-2 border-slate-200 space-y-6">
                
                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800">Tải Tài Liệu Thô (Uploaded Bundle)</strong>
                    <span className="block text-slate-400 font-medium">Hệ thống ghi nhận Bundle {task.bundleId} gồm Answer PDF và Sources.</span>
                  </div>
                </div>

                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800">Trích Xuất Nội Dung (Parsing Complete)</strong>
                    <span className="block text-slate-400 font-medium">Hoàn tất chuẩn hóa khối chữ từ ODA Document và danh mục References.</span>
                  </div>
                </div>

                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800 font-bold">Thẩm định Sơ bộ (LLM Pre-scoring Completed)</strong>
                    <span className="block text-slate-400 font-medium">Gemini Evaluator hoàn thành phân rã 6 dimensions và map citations.</span>
                  </div>
                </div>

                <div className="timeline-node relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                  <div className="text-xs space-y-1">
                    <strong className="block text-slate-800">Nộp hồ sơ (Annotator Submitted)</strong>
                    <span className="block text-slate-400 font-medium">Annotator hạch toán điều chỉnh score, hoàn thiện mapping nguồn và chuyển giao cho QA Queue.</span>
                    <span className="inline-block mt-0.5 text-blue-600 font-semibold font-mono text-[10px]">
                      {task.submittedAt || "Mới nhất"}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Modal (Dialog) */}
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
                <label className="text-xs font-bold text-slate-700">Phân Loại Sai Sót (Error Type) <span className="text-red-650 font-bold">*Bắt buộc</span></label>
                <select
                  value={returnErrorType}
                  onChange={(e) => setReturnReturnErrorType(e.target.value)}
                  data-testid={TEST_IDS.qaReturnTypeSelect}
                  className="w-full px-3 py-2 border border-slate-250 bg-white rounded-lg text-xs"
                >
                  <option value="">Chọn loại lỗi phát hiện</option>
                  <option value="Factual Error">Factual Error (Sai lệch dữ kiện thực tế)</option>
                  <option value="Guideline Violation">Guideline Violation (Vi phạm hướng dẫn)</option>
                  <option value="Source Mismatch">Source Mismatch (Không khớp tài liệu nguồn)</option>
                  <option value="Incomplete">Incomplete (Chưa hoàn thiện đầy đủ)</option>
                  <option value="Other">Other (Khác)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ý kiến phản hồi / Mô tả sửa lỗi <span className="text-red-650 font-bold">*Bắt buộc</span></label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  data-testid={TEST_IDS.qaReturnCommentTextarea}
                  placeholder="Nêu rõ lý do trả hàng và những điểm cụ thể annotator cần chỉnh sửa để resubmit..."
                  className="w-full border border-slate-250 rounded-lg p-2.5 text-xs text-slate-800"
                  rows={4}
                  required
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 font-bold">
              <button
                onClick={() => setShowReturnModal(false)}
                data-testid={TEST_IDS.qaReturnCancel}
                className="py-1.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-650 rounded-lg text-xs"
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
