import { uid } from "./ids";
import { defaultStyle } from "./style";
import type { Block, Project, TranscribedWord, Word } from "./types";

/** Rules used to group transcribed words into blocks. */
export const SEGMENTATION = {
  /** Maximum words per block. */
  maxWordsPerBlock: 6,
  /** A silence longer than this (seconds) starts a new block. */
  maxGapSeconds: 0.5,
  /** Punctuation that closes a block. */
  sentenceEnd: /[.!?]$/,
} as const;

const isUsable = (w: TranscribedWord) =>
  !!w.word.trim() &&
  Number.isFinite(w.start) &&
  Number.isFinite(w.end) &&
  w.end > w.start;

const shouldStartNewBlock = (current: Word[], next: TranscribedWord) => {
  const last = current.at(-1);
  if (!last) return false;
  return (
    current.length >= SEGMENTATION.maxWordsPerBlock ||
    next.start - last.end > SEGMENTATION.maxGapSeconds ||
    SEGMENTATION.sentenceEnd.test(last.text)
  );
};

/** Builds a project from transcribed words, grouping them into blocks. */
export function fromWords(words: TranscribedWord[], name: string): Project {
  const blocks: Block[] = [];
  let current: Word[] = [];
  const flush = () => {
    if (current.length)
      blocks.push({ id: uid(), words: current, hidden: false });
    current = [];
  };
  for (const w of words) {
    if (!isUsable(w)) continue;
    if (shouldStartNewBlock(current, w)) flush();
    current.push({
      id: uid(),
      text: w.word.trim(),
      start: w.start,
      end: w.end,
      hidden: false,
      review: w.review ?? false,
    });
  }
  flush();
  return { version: 1, name, blocks, style: { ...defaultStyle } };
}

/**
 * Cuts transcribed words at the media end. Aligners can run past the audio;
 * a word cut short is flagged for review, and words starting after the end
 * are dropped.
 */
export function clampWordsToDuration(
  words: TranscribedWord[],
  duration: number,
): TranscribedWord[] {
  if (!Number.isFinite(duration) || duration <= 0) return words;
  const kept: TranscribedWord[] = [];
  for (const w of words) {
    if (w.start >= duration) break;
    kept.push(w.end > duration ? { ...w, end: duration, review: true } : w);
  }
  return kept;
}
