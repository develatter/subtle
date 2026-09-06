import { uid } from "./ids";
import { DomainError } from "./errors";
import { editWord } from "./words";
import type { Block, Project, Word } from "./types";

/** `[start, end]` of a block, taken from its first and last words. */
export const bounds = (block: Block) =>
  [block.words[0]?.start ?? 0, block.words.at(-1)?.end ?? 0] as const;

const isFiniteInterval = (start: number, end: number) =>
  Number.isFinite(start) && Number.isFinite(end) && end > start;

/** Earliest allowed start for the block at `index`: the previous block's end. */
const lowerLimit = (blocks: Block[], index: number) =>
  index > 0 ? bounds(blocks[index - 1])[1] : 0;

/** Latest allowed end for the block at `index`: the next block's start. */
const upperLimit = (blocks: Block[], index: number, duration: number) =>
  index < blocks.length - 1 ? bounds(blocks[index + 1])[0] : duration;

const replaceBlock = (
  project: Project,
  id: string,
  update: (block: Block) => Block,
): Project => ({
  ...project,
  blocks: project.blocks.map((b) => (b.id === id ? update(b) : b)),
});

const shiftWords = (words: Word[], delta: number): Word[] =>
  words.map((w) => ({ ...w, start: w.start + delta, end: w.end + delta }));

/**
 * Splits a block at a word boundary. Both halves keep the original style
 * override; the second half receives a new identity.
 */
export function splitBlock(
  project: Project,
  id: string,
  index: number,
): Project {
  const block = project.blocks.find((b) => b.id === id);
  if (!block || index <= 0 || index >= block.words.length) return project;
  return {
    ...project,
    blocks: project.blocks.flatMap((b) =>
      b.id !== id
        ? [b]
        : [
            { ...b, words: b.words.slice(0, index) },
            { ...b, id: uid(), words: b.words.slice(index) },
          ],
    ),
  };
}

/**
 * Merges a block into the previous one. The first block's style wins, and a
 * hidden block becomes hidden words so no text is revealed by accident.
 */
export function mergeBlock(project: Project, id: string): Project {
  const index = project.blocks.findIndex((b) => b.id === id);
  if (index < 1) return project;
  const previous = project.blocks[index - 1];
  const current = project.blocks[index];
  const hideIfOmitted = (block: Block) =>
    block.words.map((w) => ({ ...w, hidden: w.hidden || block.hidden }));
  const merged: Block = {
    ...previous,
    hidden: false,
    words: [...hideIfOmitted(previous), ...hideIfOmitted(current)],
  };
  return {
    ...project,
    blocks: [
      ...project.blocks.slice(0, index - 1),
      merged,
      ...project.blocks.slice(index + 1),
    ],
  };
}

/**
 * Moves a block in time, keeping its internal intervals and clamping against
 * its neighbours and the media bounds.
 */
export function moveBlock(
  project: Project,
  id: string,
  delta: number,
  duration: number,
): Project {
  const index = project.blocks.findIndex((b) => b.id === id);
  if (index < 0) return project;
  const [start, end] = bounds(project.blocks[index]);
  const low = lowerLimit(project.blocks, index);
  const high = upperLimit(project.blocks, index, duration);
  const clamped = Math.max(low - start, Math.min(high - end, delta));
  return replaceBlock(project, id, (b) => ({
    ...b,
    words: shiftWords(b.words, clamped),
  }));
}

/**
 * Changes the outer bounds of a block, scaling its internal word timings
 * proportionally. Rejects overlaps with neighbours or the media bounds.
 */
export function retimeBlock(
  project: Project,
  id: string,
  start: number,
  end: number,
  duration: number,
): Project {
  const index = project.blocks.findIndex((b) => b.id === id);
  if (index < 0) return project;
  const [from, to] = bounds(project.blocks[index]);
  if (
    !isFiniteInterval(start, end) ||
    start < lowerLimit(project.blocks, index) ||
    end > upperLimit(project.blocks, index, duration)
  )
    throw new DomainError("block.retimeOutOfRange");
  const scale = (t: number) =>
    start + ((t - from) / (to - from)) * (end - start);
  return replaceBlock(project, id, (b) => ({
    ...b,
    words: b.words.map((w) => ({
      ...w,
      start: scale(w.start),
      end: scale(w.end),
    })),
  }));
}

export function deleteBlock(project: Project, id: string): Project {
  return { ...project, blocks: project.blocks.filter((b) => b.id !== id) };
}

/**
 * Inserts a new block in a free gap. Existing blocks are never moved; the
 * new words are flagged for review because their timing is approximate.
 */
export function insertBlock(
  project: Project,
  text: string,
  start: number,
  end: number,
  duration: number,
): Project {
  if (
    !text.trim() ||
    !isFiniteInterval(start, end) ||
    start < 0 ||
    end > duration
  )
    throw new DomainError("block.insertInvalid");
  const overlaps = project.blocks.some(
    (b) => start < bounds(b)[1] && end > bounds(b)[0],
  );
  if (overlaps) throw new DomainError("block.insertOverlap");
  const word: Word = {
    id: uid(),
    text,
    start,
    end,
    hidden: false,
    review: true,
  };
  const withBlock: Project = {
    ...project,
    blocks: [
      ...project.blocks,
      { id: uid(), words: [word], hidden: false },
    ].sort((a, b) => bounds(a)[0] - bounds(b)[0]),
  };
  return editWord(withBlock, word.id, text);
}
