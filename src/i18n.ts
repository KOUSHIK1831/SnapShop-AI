import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import teTranslation from './locales/te/translation.json';
import hiTranslation from './locales/hi/translation.json';

const resources = {
  en: { translation: enTranslation },
  te: { translation: teTranslation },
  hi: { translation: hiTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

/**
 * A safe wrapper for the t function that prevents crashes and provides
 * graceful fallbacks if a translation key or variable is missing.
 */
export const safeT = (key: string, options?: any): string => {
  try {
    return i18n.t(key, options);
  } catch (error) {
    console.error(`i18n translation error for key: ${key}`, error);
    return key;
  }
};

export default i18n;
