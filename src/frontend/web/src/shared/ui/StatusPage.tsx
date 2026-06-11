/** StatusPage — trang trạng thái dùng chung (404, 403). */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "./Card";

export function NotFoundPage() {
  const { t } = useTranslation("common");
  return <StatusCard code="404" message={t("errors.notFound")} />;
}

export function ForbiddenPage() {
  const { t } = useTranslation("common");
  return <StatusCard code="403" message={t("errors.forbidden")} />;
}

function StatusCard({ code, message }: { code: string; message: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <Card style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "var(--primary)" }}>{code}</div>
        <p style={{ color: "var(--muted)" }}>{message}</p>
        <Link to="/">← Home</Link>
      </Card>
    </div>
  );
}
