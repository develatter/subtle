import { bounds } from "./blocks";
import type { Block, Project, Style, Word } from "./types";

/** Minimum timeline length shown when no media is loaded. */
export const MIN_TIMELINE_SECONDS = 14;

export const findBlock = (project: Project, id: string): Block | undefined =>
  project.blocks.find((b) => b.id === id);

export const blockIndex = (project: Project, id: string): number =>
  project.blocks.findIndex((b) => b.id === id);

/** Style that applies to a block: its override or the project style. */
export const effectiveStyle = (project: Project, block?: Block): Style =>
  block?.override ?? project.style;

/** The block shown at a given instant, if any. */
export const blockAt = (project: Project, time: number): Block | undefined =>
  project.blocks.find((b) => {
    const [start, end] = bounds(b);
    return time >= start && time < end;
  });

export const visibleWords = (block?: Block): Word[] =>
  !block || block.hidden ? [] : block.words.filter((w) => !w.hidden);

export const visibleText = (block: Block): string =>
  visibleWords({ ...block, hidden: false })
    .map((w) => w.text)
    .join(" ");

/** End of the last block, or a minimum length for the empty timeline. */
export const projectDuration = (project: Project): number =>
  Math.max(MIN_TIMELINE_SECONDS, ...project.blocks.map((b) => bounds(b)[1]));

export const reviewCount = (project: Project): number =>
  project.blocks.flatMap((b) => b.words).filter((w) => w.review && !w.hidden)
    .length;

export const omittedWordCount = (project: Project): number =>
  project.blocks.reduce(
    (sum, b) => sum + b.words.filter((w) => w.hidden || b.hidden).length,
    0,
  );

export const matchesQuery = (block: Block, query: string): boolean =>
  block.words.some((w) => w.text.toLowerCase().includes(query.toLowerCase()));

/** Start of the previous block before `time`, or the media start. */
export const previousBlockStart = (project: Project, time: number): number =>
  [...project.blocks].reverse().find((b) => bounds(b)[0] < time - 0.1)?.words[0]
    .start ?? 0;

/** Start of the next block after `time`, or the media end. */
export const nextBlockStart = (
  project: Project,
  time: number,
  duration: number,
): number =>
  project.blocks.find((b) => bounds(b)[0] > time + 0.1)?.words[0].start ??
  duration;

/** Gap available for a new block inserted before `index`. */
export function insertionGap(
  project: Project,
  index: number,
  duration: number,
): { start: number; end: number } {
  const start = index ? bounds(project.blocks[index - 1])[1] : 0;
  const limit = project.blocks[index]
    ? bounds(project.blocks[index])[0]
    : duration;
  const length = limit > start ? Math.min(2, limit - start) : 1;
  return { start, end: Math.min(duration, start + length) };
}

/** Index of the first word starting at or after `time`. */
export const wordIndexAt = (block: Block, time: number): number =>
  block.words.findIndex((w) => w.start >= time);
