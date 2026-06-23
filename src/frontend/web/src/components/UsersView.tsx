import { useEffect, useState } from "react";
import { UserAccount, UserRole } from "../types";
import { TEST_IDS, toTestSlug } from "../testability";
import { Users, Shield, Award, UserPlus, X, Loader2 } from "lucide-react";
import { createUser, fetchProjectOptions } from "../api/adapters";
import { TableSkeleton } from "../shared/Skeleton";

interface UsersViewProps {
  users: UserAccount[];
  loading?: boolean;
  showToast: (msg: string) => void;
  onUserCreated: () => void;
}

type RoleOpt = Exclude<UserRole, "">;

export default function UsersView({ users, loading = false, showToast, onUserCreated }: UsersViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState<RoleOpt>("ANNOTATOR");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    fetchProjectOptions()
      .then((opts) => { if (!cancelled) setProjectOptions(opts); })
      .catch(() => { if (!cancelled) showToast("Không tải được danh sách project."); });
    return () => { cancelled = true; };
    // showToast cố ý KHÔNG đưa vào deps (recreate mỗi render → loop). Chỉ chạy khi mở form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  // Esc để đóng modal (khi không đang submit).
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) { setShowForm(false); reset(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForm, busy]);

  const toggleProject = (id: string) =>
    setProjectIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const reset = () => {
    setEmail(""); setFullName(""); setTempPassword(""); setRole("ANNOTATOR"); setProjectIds([]);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !fullName.trim()) { showToast("Email và họ tên là bắt buộc."); return; }
    if (tempPassword.length < 8) { showToast("Mật khẩu tạm phải từ 8 ký tự."); return; }
    setBusy(true);
    try {
      await createUser({ email: email.trim(), fullName: fullName.trim(), tempPassword, role, projectIds });
      showToast(`Đã tạo user ${email.trim()} (${role}).`);
      reset();
      setShowForm(false);
      onUserCreated();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Không tạo được user.");
    } finally {
      setBusy(false);
    }
  };

  const inp = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-vsf-500";

  const closeForm = () => { if (!busy) { setShowForm(false); reset(); } };

  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Users size={16} className="text-vsf-600" /> Quản Lý Vai Trò Hệ Thống (User Management RBAC)
        </h3>
        <button
          onClick={() => setShowForm(true)}
          data-testid="users-create-toggle"
          className="flex items-center gap-1.5 py-1.5 px-3 bg-vsf-600 hover:bg-vsf-700 text-white rounded-lg text-xs font-bold"
        >
          <UserPlus size={13} /> Tạo tài khoản
        </button>
      </div>

      {/* Form tạo tài khoản — popup modal, KHÔNG đẩy/đổi giao diện trang gốc. */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fade-in" onClick={closeForm} />

          <div
            className="relative w-full max-w-lg bg-white rounded-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
            role="dialog"
            aria-modal="true"
            data-testid="users-create-form"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-vsf-50 text-vsf-600 flex items-center justify-center"><UserPlus size={17} /></span>
                Tạo tài khoản mới
              </h3>
              <button onClick={closeForm} aria-label="Đóng" className="text-slate-300 hover:text-slate-500 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className={inp} placeholder="user@vsf.local" data-testid="users-create-email" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Họ và tên</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inp} data-testid="users-create-fullname" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mật khẩu tạm (≥8 ký tự)</label>
                  <input type="password" autoComplete="new-password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className={inp} data-testid="users-create-password" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Vai trò (duy nhất)</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as RoleOpt)} className={inp} data-testid="users-create-role">
                    <option value="ANNOTATOR">ANNOTATOR</option>
                    <option value="QA">QA</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Gán vào project (0..N — để trống nếu chưa thuộc project nào)</label>
                <div className="flex flex-wrap gap-2" data-testid="users-create-projects">
                  {projectOptions.length === 0 && <span className="text-xs text-slate-400">Chưa có project nào.</span>}
                  {projectOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        projectIds.includes(p.id)
                          ? "bg-vsf-600 text-white border-vsf-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button
                onClick={closeForm}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy}
                data-testid="users-create-submit"
                className="flex items-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />} Tạo user
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
       {loading ? <TableSkeleton rows={6} cols={4} /> : (
       <div className="app-table-wrap overflow-x-auto text-[11.5px] font-semibold text-gray-600">
        <table className="app-table" data-testid={TEST_IDS.usersTable}>
          <thead>
            <tr className="text-[9.5px]">
              <th>Tên đăng ký</th>
              <th>Địa chỉ Email</th>
              <th>Vai Trò (Role)</th>
              <th>Trạng thái tài khoản</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                  Chưa có tài khoản nào — bấm "Tạo tài khoản" để thêm thành viên.
                </td>
              </tr>
            )}
            {users.map((u, i) => {
              const userSlug = toTestSlug(u.email || u.name || String(i));
              return (
              <tr key={i} data-testid={TEST_IDS.usersRow(userSlug)}>
                <td className="font-bold text-slate-900">{u.name}</td>
                <td className="text-slate-500 font-mono text-[11.5px]">{u.email}</td>
                <td>
                  {u.role ? (
                    <span data-testid={TEST_IDS.usersRole(userSlug)} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded uppercase font-mono tracking-wider font-extrabold text-[10px] ${
                      u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                      u.role === "QA" ? "bg-teal-100 text-teal-700" : "bg-vsf-100 text-vsf-700"
                    }`}>
                      {u.role === "ADMIN" ? <Shield size={11} /> : <Award size={11} />}
                      {u.role}
                    </span>
                  ) : (
                    <span data-testid={TEST_IDS.usersRole(userSlug)} className="text-slate-400 font-mono" title="Role chưa xác định">—</span>
                  )}
                </td>
                <td>
                  <span data-testid={TEST_IDS.usersStatus(userSlug)} className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px] font-bold">
                    {u.status}
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
       </div>
       )}
      </div>
    </section>
  );
}
