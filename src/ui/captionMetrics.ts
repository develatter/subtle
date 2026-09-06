import {
  captionWidth,
  REFERENCE_HEIGHT,
  STYLE_LIMITS,
  type Block,
  type Project,
  type Style,
} from "../domain/project";

/** Horizontal padding (px) added around the longest word, at video scale. */
const CAPTION_PADDING = 12;
/** Font weight used by the CSS caption, matching the ASS style. */
const CAPTION_WEIGHT = 800;

/**
 * Smallest caption width (percent) that still fits the longest visible word
 * on one line, so a narrower box never breaks words apart. Measures with the
 * browser's text metrics for the given font and size.
 */
export function minimumCaptionWidth(
  project: Project,
  style: Style,
  block: Block | undefined,
  frame: { width: number; height: number },
): number {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return STYLE_LIMITS.width.min;
  const fontSize = (style.size * frame.height) / REFERENCE_HEIGHT;
  const family = style.font.replace(/["\\]/g, "");
  context.font = `${CAPTION_WEIGHT} ${fontSize}px "${family}"`;
  const blocks = block?.override
    ? [block]
    : project.blocks.filter((b) => !b.override);
  let longest = 0;
  for (const b of blocks)
    for (const word of b.words) {
      if (b.hidden || word.hidden) continue;
      for (const token of word.text.split(/\s+/))
        longest = Math.max(longest, context.measureText(token).width);
    }
  const needed =
    ((longest + 2 * style.outline + CAPTION_PADDING) / frame.width) * 100;
  return Math.min(
    STYLE_LIMITS.width.max,
    Math.max(STYLE_LIMITS.width.min, needed),
  );
}

export { captionWidth };
