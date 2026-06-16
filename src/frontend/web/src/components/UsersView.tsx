import { UserAccount } from "../types";
import { TEST_IDS, toTestSlug } from "../testability";
import { Users, Shield, Award } from "lucide-react";

interface UsersViewProps {
  users: UserAccount[];
}

export default function UsersView({ users }: UsersViewProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Users size={16} className="text-blue-600" /> Quản Lý Vai Trò Hệ Thống (User Management RBAC)
        </h3>
        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
          4 Active roles
        </span>
      </div>

      <div className="overflow-x-auto text-[11.5px] font-semibold text-slate-650">
        <table className="w-full text-left" data-testid={TEST_IDS.usersTable}>
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-205 text-slate-400 font-bold uppercase text-[9.5px]">
              <th className="py-2.5 px-3">Tên đăng ký</th>
              <th className="py-2.5 px-3">Địa chỉ Email</th>
              <th className="py-2.5 px-3">Vai Trò (Role)</th>
              <th className="py-2.5 px-3">Trạng thái tài khoản</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u, i) => {
              const userSlug = toTestSlug(u.email || u.name || String(i));

              return (
              <tr key={i} className="hover:bg-slate-50/40" data-testid={TEST_IDS.usersRow(userSlug)}>
                <td className="py-3 px-3 font-bold text-slate-900">{u.name}</td>
                <td className="py-3 px-3 text-slate-500 font-mono text-[11.5px]">{u.email}</td>
                <td className="py-3 px-3">
                  <span data-testid={TEST_IDS.usersRole(userSlug)} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded uppercase font-mono tracking-wider font-extrabold text-[10px] ${
                    u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    u.role === "QA" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {u.role === "ADMIN" ? <Shield size={11} /> : <Award size={11} />}
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-3">
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
    </section>
  );
}
