import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import pt from "./locales/pt.json";
import es from "./locales/es.json";

/** Maps app language code → Intl locale for date/number formatting */
export const INTL_LOCALE: Record<string, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-MX",
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
