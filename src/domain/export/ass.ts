import {
  bounds,
  captionWidth,
  REFERENCE_HEIGHT,
  type Project,
  type Style,
  type Word,
} from "../project";
import { assTimestamp } from "../time/timecode";

export const DEFAULT_VIDEO_WIDTH = 1080;
export const DEFAULT_VIDEO_HEIGHT = 1920;

/** Strips override tags and turns newlines into ASS line breaks. */
export const escapeAssText = (text: string): string =>
  text.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\r?\n/g, "\\N");

const header = (width: number, height: number) =>
  `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,3,4,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

/** `#rrggbb` → ASS `bbggrr`. */
const assColor = (hex: string) => {
  const rgb = hex.slice(1);
  return rgb.slice(4, 6) + rgb.slice(2, 4) + rgb.slice(0, 2);
};

/** Opacity percentage → ASS alpha byte (`00` opaque, `FF` transparent). */
const assAlpha = (opacity: number) =>
  Math.round((100 - opacity) * 2.55)
    .toString(16)
    .padStart(2, "0");

const HIDDEN_ALPHA = "FF";

type Frame = { width: number; height: number };

/** Inline override tags that position and style a block. */
function styleTags(style: Style, frame: Frame, alpha: string): string {
  const scale = (value: number) => (value * frame.height) / REFERENCE_HEIGHT;
  const font = escapeAssText(style.font).replace(/,/g, "");
  return (
    `{\\an5\\pos(${(frame.width * style.x) / 100},${(frame.height * style.y) / 100})` +
    `\\fn${font}\\fs${scale(style.size)}\\c&H${assColor(style.color)}&` +
    `\\alpha&H${alpha}&\\bord${scale(style.outline)}\\shad${scale(style.shadow)}}`
  );
}

type Event = readonly [start: number, end: number, text: string];

/**
 * Dialogue events for a block in each animation mode. `blockStart`/`blockEnd`
 * are the bounds of the whole block, hidden words included, so omitting a
 * word never shifts the block on screen.
 */
function animate(
  words: Word[],
  style: Style,
  blockStart: number,
  blockEnd: number,
  alpha: string,
): Event[] {
  switch (style.animation) {
    case "normal":
      return [
        [
          blockStart,
          blockEnd,
          words.map((w) => escapeAssText(w.text)).join(" "),
        ],
      ];
    case "word":
      return words.map((w) => [w.start, w.end, escapeAssText(w.text)]);
    case "progressive":
      return words.map((w, i) => [
        w.start,
        words[i + 1]?.start ?? blockEnd,
        words
          .map(
            (x, j) =>
              `{\\alpha&H${j <= i ? alpha : HIDDEN_ALPHA}&}${escapeAssText(x.text)}`,
          )
          .join(" "),
      ]);
  }
}

/**
 * Advanced SubStation Alpha with per-block styles, positions and the three
 * animation modes. The same output feeds the WASM preview and the export.
 */
export function toAss(
  project: Project,
  width = DEFAULT_VIDEO_WIDTH,
  height = DEFAULT_VIDEO_HEIGHT,
): string {
  const frame = { width, height };
  const lines: string[] = [];
  for (const block of project.blocks.filter((b) => !b.hidden)) {
    const style = block.override ?? project.style;
    const words = block.words.filter((w) => !w.hidden);
    if (!words.length) continue;
    const [blockStart, blockEnd] = bounds(block);
    const alpha = assAlpha(style.opacity);
    const tags = styleTags(style, frame, alpha);
    const margin = Math.round((width * (100 - captionWidth(style))) / 200);
    for (const [start, end, text] of animate(
      words,
      style,
      blockStart,
      blockEnd,
      alpha,
    ))
      lines.push(
        `Dialogue: 0,${assTimestamp(start)},${assTimestamp(end)},Default,,${margin},${margin},0,,${tags}${text}`,
      );
  }
  return header(width, height) + lines.join("\n") + "\n";
}
