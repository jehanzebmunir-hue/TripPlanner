import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { es } from "./es";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "language";

function isSupportedLanguage(value: string | null): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

// Defaults to English rather than guessing from the browser's locale --
// deterministic (no surprise language switch for a Spanish-configured
// browser that actually wants English, and no test-environment dependence
// on navigator.language) and matches this app's existing "explicit,
// user-driven" pattern for other locale-ish choices like home currency.
const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
const initialLanguage: Language = isSupportedLanguage(stored) ? stored : "en";

i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes -- double-escaping would corrupt "&" etc. in real strings
});

export function setLanguage(lang: Language): void {
  localStorage.setItem(STORAGE_KEY, lang);
  i18next.changeLanguage(lang);
}

export default i18next;
