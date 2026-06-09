/**
 * LoginPage — đăng nhập. Gọi /auth/login (backend mock trả JWT) → điều hướng
 * theo role. 3 tài khoản demo hiển thị sẵn (khớp prototype + backend mock).
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, defaultRouteForRole } from "@/app/providers/AuthProvider";
import type { ApiError } from "@/shared/lib/apiClient";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { LangSwitch } from "@/shared/ui/LangSwitch";

export function LoginPage() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@vsf.local");
  const [password, setPassword] = useState("admin-demo-2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await login({ email, password });
      navigate(defaultRouteForRole(session.role), { replace: true });
    } catch (err) {
      setError((err as ApiError).message ?? t("invalid"));
    } finally {
      setLoading(false);
    }
  }

  const field: React.CSSProperties = {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    color: "var(--ink)",
  };

  return (
    <Card style={{ width: "min(100%, 420px)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
        <LangSwitch />
        <ThemeToggle />
      </div>
      <h2 style={{ marginTop: 0 }}>{t("title")}</h2>
      <p style={{ color: "var(--muted)", marginTop: 4 }}>{t("subtitle")}</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, marginTop: 8 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13 }}>
          {t("email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13 }}>
          {t("password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={field}
            required
          />
        </label>

        {error && <div style={{ color: "var(--danger)", fontSize: 14 }}>{error}</div>}

        <Button type="submit" disabled={loading}>
          {t("submit")}
        </Button>
      </form>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: "var(--radius)",
          background: "var(--surface-2)",
          fontSize: 13,
          color: "var(--muted)",
          lineHeight: 1.6,
        }}
      >
        {t("demoNote")}
        <br />
        admin@vsf.local / admin-demo-2026
        <br />
        annotator@vsf.local / annotator-demo-2026
        <br />
        qa@vsf.local / qa-demo-2026
      </div>
    </Card>
  );
}
