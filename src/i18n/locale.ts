export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** Picks the closest supported locale for a BCP 47 language tag. */
export function detectLocale(languageTag: string | undefined): Locale {
  const language = languageTag?.toLowerCase().split("-")[0];
  return isLocale(language) ? language : DEFAULT_LOCALE;
}
