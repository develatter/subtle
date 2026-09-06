import { en } from "./messages/en";
import { es, type MessageKey, type Messages } from "./messages/es";
import type { Locale } from "./locale";

export type { MessageKey };
export type MessageParams = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: MessageParams) => string;

const catalogs: Record<Locale, Messages> = { es, en };

const interpolate = (template: string, params?: MessageParams) =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    : template;

/** Creates a translator bound to one locale. */
export const createTranslator =
  (locale: Locale): Translator =>
  (key, params) =>
    interpolate(catalogs[locale][key] ?? catalogs.es[key] ?? key, params);
