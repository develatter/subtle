/**
 * Core project model.
 *
 * Every word keeps its own identity, timing and visibility. Blocks are only a
 * grouping of consecutive words; omitting a word or block never deletes or
 * shifts timings.
 */
export type Animation = "normal" | "progressive" | "word";

export type Word = {
  id: string;
  text: string;
  /** Seconds from the start of the media. */
  start: number;
  end: number;
  hidden: boolean;
  /** Approximate timing that should be reviewed by hand. */
  review?: boolean;
};

export type Style = {
  /** Maximum caption width as a percentage of the video width. */
  width?: number;
  font: string;
  /** Font size expressed for a 1920px tall video. */
  size: number;
  /** `#rrggbb` */
  color: string;
  /** 0–100 */
  opacity: number;
  outline: number;
  shadow: number;
  /** Horizontal centre as a percentage of the video width. */
  x: number;
  /** Vertical centre as a percentage of the video height. */
  y: number;
  animation: Animation;
};

export type Block = {
  id: string;
  words: Word[];
  hidden: boolean;
  /** A complete, independent style for this block only. */
  override?: Style;
};

export type ProjectSource = { path: string };

export type Project = {
  source?: ProjectSource;
  version: 1;
  name: string;
  blocks: Block[];
  style: Style;
};

/** A raw transcription token, as produced by the speech engine. */
export type TranscribedWord = {
  word: string;
  start: number;
  end: number;
  review?: boolean;
};
