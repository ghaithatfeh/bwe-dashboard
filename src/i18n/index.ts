import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "./locales/en";
import ar from "./locales/ar";

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "lang";
const DEFAULT_LANGUAGE: Language = "ar";

const isSupported = (lang: string | null): lang is Language =>
  !!lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);

const getInitialLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isSupported(stored) ? stored : DEFAULT_LANGUAGE;
};

export const getDirection = (lang: string) => (lang === "ar" ? "rtl" : "ltr");

const applyDocumentLanguage = (lang: string) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = getDirection(lang);
};

i18n.on("languageChanged", (lang) => {
  if (isSupported(lang)) localStorage.setItem(STORAGE_KEY, lang);
  applyDocumentLanguage(lang);
});

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
});

applyDocumentLanguage(i18n.language);

/** Current UI language and text direction, re-rendering on change. */
export const useLanguage = () => {
  const { i18n: instance } = useTranslation();
  const lang: Language = isSupported(instance.language) ? instance.language : DEFAULT_LANGUAGE;
  return { lang, dir: getDirection(lang) as "rtl" | "ltr" };
};

export default i18n;
