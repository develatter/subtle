import { LOCALES, useTranslation, type Locale } from "../../../i18n";

/** Compact language selector shown in the top bar. */
export function LanguageSwitch() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <select
      className="language-switch"
      aria-label={t("app.language")}
      title={t("app.language")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      {LOCALES.map((code) => (
        <option key={code} value={code}>
          {t(`language.${code}`)}
        </option>
      ))}
    </select>
  );
}
