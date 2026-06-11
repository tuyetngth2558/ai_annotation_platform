/** LangSwitch — đổi vi/en. */
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/i18n/config";
import { Button } from "./Button";

export function LangSwitch() {
  const { i18n, t } = useTranslation("common");
  const next = i18n.language === "vi" ? "en" : "vi";
  return (
    <Button
      variant="ghost"
      onClick={() => changeLanguage(next)}
      aria-label={t("lang.switch")}
      title={t("lang.switch")}
    >
      {i18n.language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
    </Button>
  );
}
