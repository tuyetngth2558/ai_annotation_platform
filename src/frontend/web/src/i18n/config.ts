/**
 * i18n config — namespace theo feature.
 *
 * Tự động nạp:
 *  - common: src/i18n/locales/common/{vi,en}.json
 *  - mỗi feature: src/features/<feature>/locales/{vi,en}.json  → namespace = <feature>
 *
 * Dùng Vite glob import nên thêm feature mới KHÔNG cần sửa file này.
 * Dùng trong component: useTranslation("auth") / t("common:nav.dashboard").
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

type Dict = Record<string, unknown>;
type Resources = Record<string, Record<string, Dict>>; // lang -> namespace -> dict

const STORAGE_KEY = "vsf-lang";
const FALLBACK = "vi";

// common namespace
const commonModules = import.meta.glob("./locales/common/*.json", { eager: true });
// feature namespaces
const featureModules = import.meta.glob("../features/*/locales/*.json", { eager: true });

function buildResources(): Resources {
  const resources: Resources = { vi: {}, en: {} };

  for (const [path, mod] of Object.entries(commonModules)) {
    const lang = path.includes("/en.") ? "en" : "vi";
    resources[lang].common = (mod as { default: Dict }).default;
  }

  for (const [path, mod] of Object.entries(featureModules)) {
    // path: ../features/<feature>/locales/<lang>.json
    const match = path.match(/features\/([^/]+)\/locales\/(vi|en)\.json$/);
    if (!match) continue;
    const [, feature, lang] = match;
    resources[lang][feature] = (mod as { default: Dict }).default;
  }

  return resources;
}

const savedLang = localStorage.getItem(STORAGE_KEY) ?? FALLBACK;

void i18n.use(initReactI18next).init({
  resources: buildResources(),
  lng: savedLang,
  fallbackLng: FALLBACK,
  defaultNS: "common",
  ns: ["common"],
  interpolation: { escapeValue: false },
});

export function changeLanguage(lang: "vi" | "en") {
  localStorage.setItem(STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
}

export default i18n;
