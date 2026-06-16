import React, { useState } from "react";
import { UserRole } from "../types";
import { TEST_IDS } from "../testability";
import { apiClient, authToken } from "../api/client";
import { Eye, EyeOff, Lock, User } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (email: string, role: UserRole) => void;
  showToast: (msg: string) => void;
}

export default function LoginView({ onLoginSuccess, showToast }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Email đăng nhập chưa hợp lệ.");
      return;
    }
    if (!password) {
      showToast("Vui lòng nhập mật khẩu.");
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await apiClient.login(email, password);
      authToken.set(session.access_token);
      onLoginSuccess(session.email, session.role);
      showToast(`Đăng nhập thành công với vai trò ${session.role}!`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể kết nối backend đăng nhập.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 md:p-8" id="login_screen" data-testid={TEST_IDS.view("login")}>
      <div className="w-full max-w-4xl grid md:grid-cols-12 gap-8 items-center bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden p-6 md:p-10">
        
        {/* Intro pane */}
        <div className="md:col-span-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-extrabold text-lg shadow-lg">
              VSF
            </div>
            <div>
              <strong className="block text-slate-800 text-lg font-bold tracking-tight">AI Annotation Platform</strong>
              <span className="block text-xs text-slate-400 font-medium tracking-wide">Vivipedia MVP v1.0</span>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
              VSF AI Annotation Platform
            </h1>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Workspace nội bộ cho Vivipedia MVP: import PDF Bundle, review claim-level, chấm điểm chất lượng nguồn và export CSV theo vai trò.
            </p>
          </div>

          <ul className="space-y-3" aria-label="Tính năng chính">
            <li className="flex items-center gap-3 text-slate-600 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">✓</span>
              <span><strong>QUẢN TRỊ (ADMIN):</strong> Tạo Project, upload & validate PDF, phân chia bài.</span>
            </li>
            <li className="flex items-center gap-3 text-slate-600 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">✓</span>
              <span><strong>ANNOTATION:</strong> Đối chiếu Claim, chấm 6 tiêu chí, mapping source.</span>
            </li>
            <li className="flex items-center gap-3 text-slate-600 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">✓</span>
              <span><strong>QA REVIEW:</strong> Đánh giá so sánh Baseline, duyệt hoặc trả về (Return).</span>
            </li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="md:col-span-6 bg-slate-50/50 rounded-xl p-6 border border-slate-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Đăng nhập</h2>
            <p className="text-xs text-slate-400 mt-1">Sử dụng tài khoản hệ thống để truy cập workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="loginEmail" className="block text-xs font-bold text-slate-700">Email hệ thống</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User size={16} />
                </span>
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid={TEST_IDS.loginEmail}
                  aria-label="Login email"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="loginPassword" className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid={TEST_IDS.loginPassword}
                  aria-label="Login password"
                  className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid={TEST_IDS.loginSubmit}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg text-sm hover:indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:ring-4 focus:ring-blue-100 transition-all shadow-md shadow-blue-200"
            >
              {isSubmitting ? "Đang kết nối backend..." : "Đăng Nhập"}
            </button>
          </form>

          <p className="mt-5 pt-4 border-t border-slate-200/60 text-[11px] leading-relaxed text-slate-500">
            Tài khoản và phân quyền được xác thực bởi backend qua <span className="font-mono">/api/v1/auth/login</span>.
          </p>
        </div>

      </div>
    </div>
  );
}
