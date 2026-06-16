/** PageHeader — tiêu đề + ghi chú TODO cho trang skeleton. */
import { useTranslation } from "react-i18next";
import { Card } from "./Card";

interface Props {
  /** Key i18n cho tiêu đề (khuyến nghị — không hardcode). Vd "nav.dashboard". */
  titleKey: string;
  /** Mô tả tài liệu nghiệp vụ liên quan — GHI CHÚ DEV (không cần i18n). */
  docsRef?: string;
}

export function PageHeader({ titleKey, docsRef }: Props) {
  const { t } = useTranslation("common");
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t(titleKey)}</h1>
      <Card style={{ background: "var(--surface-2)", borderStyle: "dashed" }}>
        <strong>TODO</strong> — {t("states.todo")}
        {docsRef && (
          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 14 }}>📄 {docsRef}</div>
        )}
      </Card>
    </div>
  );
}
