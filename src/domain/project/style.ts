import type { Animation, Style } from "./types";

export const ANIMATIONS: readonly Animation[] = [
  "normal",
  "progressive",
  "word",
];

/** Inclusive numeric ranges accepted for each style property. */
export const STYLE_LIMITS = {
  width: { min: 10, max: 100 },
  size: { min: 12, max: 160 },
  opacity: { min: 0, max: 100 },
  outline: { min: 0, max: 12 },
  shadow: { min: 0, max: 20 },
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 },
} as const;

export const MAX_FONT_NAME_LENGTH = 200;

/** Caption width applied when a project predates the `width` property. */
export const DEFAULT_CAPTION_WIDTH = 84;

/** Reference height the `size`, `outline` and `shadow` values are expressed for. */
export const REFERENCE_HEIGHT = 1920;

export const defaultStyle: Style = {
  width: DEFAULT_CAPTION_WIDTH,
  font: "Arial",
  size: 64,
  color: "#ffffff",
  opacity: 100,
  outline: 3,
  shadow: 4,
  x: 50,
  y: 74,
  animation: "progressive",
};

export const captionWidth = (style: Style): number =>
  style.width ?? DEFAULT_CAPTION_WIDTH;

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const clampStyleValue = (
  key: keyof typeof STYLE_LIMITS,
  value: number,
): number => clamp(value, STYLE_LIMITS[key].min, STYLE_LIMITS[key].max);

const isWithin = (value: unknown, min: number, max: number): boolean =>
  Number.isFinite(value) && Number(value) >= min && Number(value) <= max;

export function isValidStyle(style: unknown): style is Style {
  const s = style as Style;
  if (!s) return false;
  if (
    s.width !== undefined &&
    !isWithin(s.width, STYLE_LIMITS.width.min, STYLE_LIMITS.width.max)
  )
    return false;
  if (typeof s.font !== "string" || s.font.length >= MAX_FONT_NAME_LENGTH)
    return false;
  if (!/^#[0-9a-f]{6}$/i.test(s.color)) return false;
  if (!ANIMATIONS.includes(s.animation)) return false;
  return (["size", "opacity", "outline", "shadow", "x", "y"] as const).every(
    (key) => isWithin(s[key], STYLE_LIMITS[key].min, STYLE_LIMITS[key].max),
  );
}
