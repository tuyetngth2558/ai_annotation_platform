import React, { useState } from "react";
import { ClaimTask, ExportJob, Project } from "../types";
import { TEST_IDS } from "../testability";
import {
  Download,
  Play,
  History,
  FileCheck2
} from "lucide-react";

interface ExportViewProps {
  project: Project;
  tasks: ClaimTask[];
  exportJobs: ExportJob[];
  onAddExportJob: (job: ExportJob) => void | Promise<void>;
  showToast: (msg: string) => void;
  userName: string;
}

export default function ExportView({
  project,
  tasks,
  exportJobs,
  onAddExportJob,
  showToast,
  userName
}: ExportViewProps) {
  const [selectedProject, setSelectedProject] = useState(project.name);
  const [selectedBatch, setSelectedBatch] = useState("BAT-001");
  const [selectedStatus, setSelectedStatus] = useState("Approved");
  const [selectedFormat, setSelectedFormat] = useState("CSV claim-level");

  // Determine eligible task counts
  const eligibleTasks = tasks.filter((t) => t.status === "Approved");

  const triggerDownload = (job: ExportJob) => {
    showToast(`UI sẽ tải CSV từ backend endpoint /api/v1/exports/${job.id}/download khi endpoint sẵn sàng.`);
  };

  const handleCreateExportJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eligibleTasks.length === 0) {
      showToast("Hiện chưa có task nào hoàn thiện duyệt (status Approved) để thực hiện xuất.");
      return;
    }

    const nextIdNum = exportJobs.length + 1;
    const nextCode = `EXP-2026-${String(nextIdNum).padStart(3, "0")}`;

    const newJob: ExportJob = {
      id: nextCode,
      project: selectedProject,
      bundleId: project.bundleId,
      status: "Done",
      count: eligibleTasks.length,
      by: userName,
      time: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour12: false }),
      answerPdf: project.answerPdf,
      sourceRefPdf: project.sourceRefPdf
    };

    await onAddExportJob(newJob);
  };

  return (
    <div className="space-y-6">
      
      {/* Top statistical intel banner */}
      <section className="bg-white rounded-xl border border-slate-100 p-5 shadow flex justify-between items-center flex-wrap gap-4 bg-gradient-to-r from-slate-50 to-white">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900">Chiết Xuất Kết Quả CSV (Export CSV claim-level)</h2>
          <p className="text-xs text-slate-400">Export lưu trữ cấu trúc dạng bảng trace-marked lưu giữ đầy đủ mã hồ sơ thô ban đầu.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Task đủ điều kiện xuất:</span>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${
            eligibleTasks.length ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-amber-100 border-amber-300 text-amber-800"
          }`}>
            {eligibleTasks.length} Claims
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* Creating job card */}
        <section className="md:col-span-6 bg-white p-5 rounded-xl border border-slate-150 shadow space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 border-b pb-2">
            <Play size={15} className="text-blue-600" /> Cấu hình xuất kết quả (Create Export Job)
          </h3>

          <form onSubmit={handleCreateExportJob} className="grid grid-cols-2 gap-3.5 text-xs text-slate-700 font-semibold" data-testid={TEST_IDS.exportCreateForm}>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tên dự án</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                data-testid={TEST_IDS.exportProjectSelect}
                aria-label="Export project"
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
              >
                <option value={project.name}>{project.name}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lựa chọn Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                data-testid={TEST_IDS.exportBatchSelect}
                aria-label="Export batch"
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
              >
                <option value="BAT-001">BAT-001</option>
                <option value="all">Tất cả batches</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Trạng Thái Lọc</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                data-testid={TEST_IDS.exportStatusSelect}
                aria-label="Export status filter"
                className="w-full px-2.5 py-1 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
              >
                <option value="Approved">Approved (Chỉ xuất tệp đã duyệt)</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Định dạng file xuất</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                data-testid={TEST_IDS.exportFormatSelect}
                aria-label="Export format"
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
              >
                <option value="CSV claim-level">CSV claim-level (Traceable và truy vết đầy đủ)</option>
                <option disabled>JSON Format (Giai đoạn 2)</option>
              </select>
            </div>

            <div className="col-span-2 bg-blue-50/40 p-3 rounded-xl border border-blue-150 text-[11px] text-blue-800 leading-relaxed font-semibold">
              <strong>Hướng dẫn bảo mật:</strong> Chỉ có những hạng mục có kết luận duyệt <strong>Approved</strong> từ QA Specialist mới được hạch toán xuất tệp. File tải về sẽ giữ nguyên tên tài liệu PDF gốc phục vụ đối chiếu sau này.
            </div>

            <div className="col-span-2 pt-2">
              <button
                type="submit"
                data-testid={TEST_IDS.exportSubmit}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1.5"
              >
                <FileCheck2 size={14} /> Chạy tiến trình xuất (Export Job)
              </button>
            </div>
          </form>
        </section>

        {/* History log card */}
        <section className="md:col-span-6 bg-white p-5 rounded-xl border border-slate-150 shadow space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 border-b pb-2">
            <History size={15} className="text-teal-600" /> Nhật ký chiết xuất (Export History)
          </h3>

          <div className="overflow-x-auto text-[11px] font-semibold text-slate-650" data-testid={TEST_IDS.exportHistoryTable}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-[9.5px]">
                  <th className="py-2">Mã Job</th>
                  <th className="py-2">Dấu PDF truy vết</th>
                  <th className="py-2 text-center">SL</th>
                  <th className="py-2">Kiểm soát</th>
                  <th className="py-2 text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exportJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-900">
                      {job.id}
                      <span className="block text-[9.5px] text-emerald-600 font-extrabold">✓ Done</span>
                    </td>
                    <td className="py-3">
                      <span className="text-slate-800 font-bold">{job.answerPdf}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{job.sourceRefPdf}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                        {job.count}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="block text-slate-700">{job.by}</span>
                      <span className="block text-[9.5px] text-slate-450 mt-0.5">{job.time}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => triggerDownload(job)}
                        data-testid={TEST_IDS.exportDownloadButton(job.id)}
                        aria-label={`Download CSV for ${job.id}`}
                        className="p-1 px-2 border hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1 text-[10.5px] font-bold"
                      >
                        <Download size={11} /> CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
