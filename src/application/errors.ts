import { isDomainError } from "../domain/project";
import type { Translator } from "../i18n";

/** Human-readable text for any thrown value, translating domain errors. */
export const describeError = (error: unknown, t: Translator): string =>
  isDomainError(error) ? t(`error.${error.code}`, error.params) : String(error);
