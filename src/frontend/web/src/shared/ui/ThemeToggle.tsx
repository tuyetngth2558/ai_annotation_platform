/** ThemeToggle — đổi dark/light. */
import { useTranslation } from "react-i18next";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Button } from "./Button";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation("common");
  return (
    <Button variant="ghost" onClick={toggle} aria-label={t("theme.toggle")} title={t("theme.toggle")}>
      {theme === "dark" ? "☀️ " + t("theme.light") : "🌙 " + t("theme.dark")}
    </Button>
  );
}
