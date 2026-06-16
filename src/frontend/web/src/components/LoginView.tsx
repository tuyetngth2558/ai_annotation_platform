import React, { useState } from "react";
import { UserRole } from "../types";
import { TEST_IDS } from "../testability";
import { apiClient, authToken } from "../api/client";
import BrandLogo from "./BrandLogo";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Shield, BarChart3, FileCheck } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (email: string, role: UserRole) => void;
  showToast: (msg: string) => void;
}

const BENEFITS = [
  { icon: <FileCheck size={18} className="text-brand-400" />, title: "Đánh giá claim từ PDF", desc: "Import tài liệu, đối chiếu nguồn, chấm điểm 6 tiêu chí chất lượng." },
  { icon: <Shield size={18} className="text-teal-500" />, title: "QA chéo đảm bảo chất lượng", desc: "Mỗi claim được reviewer kiểm duyệt trước khi xuất dữ liệu." },
  { icon: <BarChart3 size={18} className="text-blue-400" />, title: "Theo dõi tiến độ", desc: "Dashboard tổng quan cho admin, annotator và QA reviewer." },
];

export default function LoginView({ onLoginSuccess, showToast }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Vui lòng nhập email hợp lệ.");
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
      showToast(`Đăng nhập thành công — ${session.role}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-canvas" id="login_screen" data-testid={TEST_IDS.view("login")}>
      {/* Hero panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      >
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 70% 20%, #dc2626 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #0d9488 0%, transparent 50%)" }}
        />

        <div className="relative z-10">
          <BrandLogo variant="hero" className="mb-14" />
          <h1 className="login-hero-title">
            Nền tảng đánh giá<br />chất lượng dữ liệu
          </h1>
          <p className="login-hero-subtitle">
            Công cụ nội bộ VinSmart Future hỗ trợ quy trình kiểm định claim Vivipedia — chuẩn hóa, chính xác, có thể truy vết.
          </p>
        </div>

        <div className="relative z-10 space-y-3 mt-auto">
          {BENEFITS.map((b) => (
            <div key={b.title} className="benefit-card">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{b.icon}</div>
                <div>
                  <strong className="text-white text-[13px] font-semibold">{b.title}</strong>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-[11px] text-gray-600 mt-8">© 2026 VinSmart Future · Nội bộ</p>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-10 flex justify-center">
            <BrandLogo variant="compact" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Đăng nhập</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Sử dụng tài khoản nội bộ để truy cập workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid={TEST_IDS.loginEmail}
                  aria-label="Login email"
                  placeholder="name@vsf.local"
                  className="field-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid={TEST_IDS.loginPassword}
                  aria-label="Login password"
                  className="field-input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" data-testid={TEST_IDS.loginSubmit} disabled={isSubmitting} className="btn-primary w-full !py-3 mt-2">
              {isSubmitting ? "Đang kết nối..." : "Đăng nhập"}
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 leading-relaxed"
            data-testid="login-demo-note"
          >
            <strong className="text-gray-700 font-semibold block mb-2">Tài khoản thử nghiệm</strong>
            <div className="space-y-1 font-mono text-[11px] text-gray-500">
              <p><span className="text-gray-700">admin@vsf.local</span> · admin-demo-2026</p>
              <p><span className="text-gray-700">annotator@vsf.local</span> · annotator-demo-2026</p>
              <p><span className="text-gray-700">qa@vsf.local</span> · qa-demo-2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
