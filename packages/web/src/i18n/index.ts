import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import plPL from "./locales/pl-PL.json";
import enGB from "./locales/en-GB.json";

const STORAGE_KEY = "sm.language";
const SUPPORTED = ["pl-PL", "en-GB"] as const;
type Lang = (typeof SUPPORTED)[number];

function loadLang(): Lang {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw && (SUPPORTED as readonly string[]).includes(raw)
    ? (raw as Lang)
    : "pl-PL";
}

void i18n.use(initReactI18next).init({
  resources: {
    "pl-PL": { translation: plPL },
    "en-GB": { translation: enGB },
  },
  lng: loadLang(),
  fallbackLng: "pl-PL",
  supportedLngs: SUPPORTED,
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
