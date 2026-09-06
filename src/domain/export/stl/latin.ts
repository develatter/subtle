import { DomainError } from "../../project";

/** EBU Tech 3264 control code for a line break inside a TTI block. */
const LINE_BREAK = 0x8a;

/** ISO 6937 combining diacritics, written before the base letter. */
const DIACRITICS: Record<string, number> = {
  "\u0300": 0xc1, // grave
  "\u0301": 0xc2, // acute
  "\u0302": 0xc3, // circumflex
  "\u0303": 0xc4, // tilde
  "\u0308": 0xc8, // diaeresis
  "\u030a": 0xca, // ring
  "\u0327": 0xcb, // cedilla
};

const SPANISH_PUNCTUATION: Record<string, number> = {
  "¡": 0xa1,
  "¿": 0xbf,
};

/**
 * Encodes text as Latin ISO 6937 (EBU character table 00). Only ASCII,
 * Spanish punctuation and accented Latin letters are supported; anything else
 * is rejected instead of being silently replaced.
 */
export function encodeLatin(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    if (ch === "\n") {
      out.push(LINE_BREAK);
      continue;
    }
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0x7e) {
      out.push(code);
      continue;
    }
    if (ch in SPANISH_PUNCTUATION) {
      out.push(SPANISH_PUNCTUATION[ch]);
      continue;
    }
    const decomposed = ch.normalize("NFD");
    const diacritic = DIACRITICS[decomposed[1]];
    if (decomposed.length === 2 && diacritic && /[a-z]/i.test(decomposed[0])) {
      out.push(diacritic, decomposed.charCodeAt(0));
      continue;
    }
    throw new DomainError("stl.unsupportedCharacter", { character: ch });
  }
  return out;
}
