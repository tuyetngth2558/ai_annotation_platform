/**
 * UsersPage — quản lý người dùng (ADMIN). Nối GET /users + POST /users.
 * Model: 1 user = 1 role duy nhất, gán vào 0..N project.
 */
import { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fetchUsers, fetchProjectOptions, createUser } from "@/shared/lib/adapters";
import type { UserAccount } from "@/shared/types/domain";
import type { Role } from "@/shared/types/auth";

const th: React.CSSProperties = { padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "var(--muted)" };
const td: React.CSSProperties = { padding: "10px 14px" };
const inp: React.CSSProperties = { padding: 10, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", width: "100%" };
const lbl: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 600, fontSize: 13 };

export function UsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState<Role>("ANNOTATOR");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    fetchUsers().then(setUsers).catch((e) => setError(e?.message ?? "Không tải được user.")).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    if (showForm) fetchProjectOptions().then(setProjects).catch(() => setProjects([]));
  }, [showForm]);

  const toggleProject = (id: string) =>
    setProjectIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function onSubmit() {
    setMsg(null);
    if (!email.trim() || !fullName.trim()) { setMsg("Email và họ tên bắt buộc."); return; }
    if (tempPassword.length < 8) { setMsg("Mật khẩu tạm ≥ 8 ký tự."); return; }
    setBusy(true);
    try {
      await createUser({ email: email.trim(), fullName: fullName.trim(), tempPassword, role, projectIds });
      setShowForm(false);
      setEmail(""); setFullName(""); setTempPassword(""); setRole("ANNOTATOR"); setProjectIds([]);
      reload();
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? "Không tạo được user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ marginTop: 0 }}>Quản lý người dùng</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Đóng" : "+ Tạo tài khoản"}</Button>
      </div>

      {showForm && (
        <Card style={{ display: "grid", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={lbl}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="user@vsf.local" /></label>
            <label style={lbl}>Họ và tên<input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inp} /></label>
            <label style={lbl}>Mật khẩu tạm (≥8)<input type="password" autoComplete="new-password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} style={inp} /></label>
            <label style={lbl}>Vai trò (duy nhất)
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={inp}>
                <option value="ANNOTATOR">ANNOTATOR</option>
                <option value="QA">QA</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
          </div>
          <div style={lbl}>
            Gán vào project (0..N — để trống nếu chưa thuộc project nào)
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {projects.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>Chưa có project.</span>}
              {projects.map((p) => (
                <button key={p.id} type="button" onClick={() => toggleProject(p.id)}
                  style={{
                    padding: "6px 12px", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: 600, fontSize: 13,
                    border: "1px solid var(--line)",
                    background: projectIds.includes(p.id) ? "var(--primary)" : "transparent",
                    color: projectIds.includes(p.id) ? "var(--on-primary)" : "var(--ink)",
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {msg && <div style={{ color: "var(--danger)", fontSize: 13 }}>{msg}</div>}
          <div><Button onClick={onSubmit} disabled={busy}>{busy ? "Đang tạo…" : "Tạo user"}</Button></div>
        </Card>
      )}

      {loading && <Card>Đang tải…</Card>}
      {error && <Card style={{ color: "var(--danger)" }}>{error}</Card>}
      {!loading && !error && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
                <th style={th}>Họ tên</th><th style={th}>Email</th><th style={th}>Vai trò</th><th style={th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{u.email}</td>
                  <td style={td}>{u.role || "—"}</td>
                  <td style={td}>{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
