import { create } from "zustand";
import { STORAGE_KEYS } from "../config/constants";
import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from "./locale";
import { createTranslator, type Translator } from "./translate";

type LocaleState = {
  locale: Locale;
  t: Translator;
  setLocale: (locale: Locale) => void;
};

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.locale);
    if (isLocale(saved)) return saved;
  } catch {
    /* Storage may be unavailable; fall back to the browser language. */
  }
  return typeof navigator === "undefined"
    ? DEFAULT_LOCALE
    : detectLocale(navigator.language);
}

export const useLocaleStore = create<LocaleState>((set) => {
  const locale = initialLocale();
  return {
    locale,
    t: createTranslator(locale),
    setLocale: (next) => {
      try {
        localStorage.setItem(STORAGE_KEYS.locale, next);
      } catch {
        /* Preference simply will not persist. */
      }
      set({ locale: next, t: createTranslator(next) });
    },
  };
});

/** Translator for code that runs outside React (stores, use cases). */
export const translate: Translator = (key, params) =>
  useLocaleStore.getState().t(key, params);

export const currentLocale = (): Locale => useLocaleStore.getState().locale;
