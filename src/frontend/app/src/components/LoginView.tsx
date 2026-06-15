import React, { useState } from "react";
import { UserRole } from "../types";
import { TEST_IDS } from "../testability";
import { Eye, EyeOff, Lock, User, CheckCircle2 } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (email: string, role: UserRole) => void;
  showToast: (msg: string) => void;
}

export default function LoginView({ onLoginSuccess, showToast }: LoginViewProps) {
  const [email, setEmail] = useState("admin@vsf.local");
  const [password, setPassword] = useState("admin-demo-2026");
  const [showPassword, setShowPassword] = useState(false);

  const demoAccounts = [
    { email: "admin@vsf.local", label: "Admin Account", pass: "admin-demo-2026", role: "ADMIN" },
    { email: "annotator@vsf.local", label: "Annotator Account", pass: "annotator-demo-2026", role: "ANNOTATOR" },
    { email: "qa@vsf.local", label: "QA Specialist", pass: "qa-demo-2026", role: "QA" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Email đăng nhập chưa hợp lệ.");
      return;
    }
    if (!password) {
      showToast("Vui lòng nhập mật khẩu.");
      return;
    }

    // Role detection matching
    let detectedRole: UserRole | null = null;
    if (email === "admin@vsf.local" && password === "admin-demo-2026") {
      detectedRole = "ADMIN";
    } else if (email === "annotator@vsf.local" && password === "annotator-demo-2026") {
      detectedRole = "ANNOTATOR";
    } else if (email === "qa@vsf.local" && password === "qa-demo-2026") {
      detectedRole = "QA";
    }

    if (!detectedRole) {
      showToast("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại tài khoản demo.");
      return;
    }

    onLoginSuccess(email, detectedRole);
    showToast(`Đăng nhập thành công với vai trò ${detectedRole}!`);
  };

  const selectDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    showToast(`Đã điền tự động tài khoản demo: ${demoEmail}`);
  };

  return (
    <div className="min-y-screen flex items-center justify-center p-2 md:p-8" id="login_screen" data-testid={TEST_IDS.view("login")}>
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
                <button
                  type="button"
                  onClick={() => showToast("Chức năng quên mật khẩu chưa được kết nối backend thật.")}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </button>
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg text-sm hover:indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:ring-4 focus:ring-blue-100 transition-all shadow-md shadow-blue-200"
            >
              Vào Workspace
            </button>
          </form>

          {/* Quick select buttons */}
          <div className="mt-6 pt-5 border-t border-slate-200/60">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tài khoản Demo (Nhấp để điền nhanh):</p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => selectDemoAccount(account.email, account.pass)}
                  data-testid={TEST_IDS.loginDemoAccount(account.role)}
                  aria-label={`Use ${account.role} demo account`}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs text-left transition-all border ${
                    email === account.email
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-white border-slate-150 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <span className="font-bold block text-slate-900 text-xs">{account.label}</span>
                    <span className="text-[11px] text-slate-400 block">{account.email}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                    account.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    account.role === "QA" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
