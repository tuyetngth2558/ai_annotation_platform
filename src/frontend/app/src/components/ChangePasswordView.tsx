import React, { useState } from "react";
import { Lock, Check, AlertCircle } from "lucide-react";
import { TEST_IDS } from "../testability";

interface ChangePasswordViewProps {
  onCancel: () => void;
  showToast: (msg: string) => void;
}

export default function ChangePasswordView({ onCancel, showToast }: ChangePasswordViewProps) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPass) {
      showToast("Vui lòng điền mật khẩu hiện tại.");
      return;
    }
    if (newPass.length < 8) {
      showToast("Mật khẩu mới phải từ 8 ký tự trở lên.");
      return;
    }
    if (newPass === currentPass) {
      showToast("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      return;
    }
    if (newPass !== confirmPass) {
      showToast("Xác nhận mật khẩu mới chưa trùng khớp.");
      return;
    }

    showToast("Đổi mật khẩu thành công (Mô phỏng nâng cấp tài khoản)!");
    onCancel();
  };

  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-150 p-6 shadow-xl space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Lock size={22} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Đổi mật khẩu tài khoản</h2>
          <p className="text-xs text-slate-500 mt-1">Cập nhật mật khẩu bảo mật nội bộ.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid={TEST_IDS.changePasswordForm}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              data-testid={TEST_IDS.currentPasswordInput}
              aria-label="Current password"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Mật khẩu mới</label>
            <input
              type="password"
              placeholder="Ít nhất 8 ký tự"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              data-testid={TEST_IDS.newPasswordInput}
              aria-label="New password"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              data-testid={TEST_IDS.confirmPasswordInput}
              aria-label="Confirm new password"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Validation helper rules */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <AlertCircle size={13} className="text-blue-500" /> Quy định đặt mật khẩu mới:
            </p>
            <div className="flex items-center gap-1.5 pl-1">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${newPass.length >= 8 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                <Check size={11} />
              </div>
              <span className={newPass.length >= 8 ? "text-emerald-700 font-medium" : ""}>Tối thiểu 8 ký tự</span>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${newPass && newPass !== currentPass ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                <Check size={11} />
              </div>
              <span className={newPass && newPass !== currentPass ? "text-emerald-700 font-medium" : ""}>Khác biệt mật khẩu hiện tại</span>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${newPass && newPass === confirmPass ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                <Check size={11} />
              </div>
              <span className={newPass && newPass === confirmPass ? "text-emerald-700 font-medium" : ""}>Mật khẩu nhập lại chính xác</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              data-testid={TEST_IDS.changePasswordCancel}
              className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              data-testid={TEST_IDS.changePasswordSubmit}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-100"
            >
              Cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
