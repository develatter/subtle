import { DomainError } from "./errors";
import { isValidStyle } from "./style";
import { editWord } from "./words";
import type { Block, Project, ProjectSource, Word } from "./types";

/** Tolerance (seconds) allowed between a word's start and the previous end. */
const TIMING_TOLERANCE = 0.001;

const isValidSource = (source: unknown): source is ProjectSource => {
  const s = source as ProjectSource;
  return (
    !!s &&
    typeof s.path === "string" &&
    s.path.startsWith("/") &&
    !s.path.includes("\0")
  );
};

const hasValidShape = (value: unknown): value is Project => {
  const p = value as Project;
  return (
    !!p &&
    p.version === 1 &&
    (p.source === undefined || isValidSource(p.source)) &&
    typeof p.name === "string" &&
    isValidStyle(p.style) &&
    Array.isArray(p.blocks)
  );
};

const isValidWord = (w: Word, ids: Set<string>, last: number) =>
  typeof w.id === "string" &&
  !ids.has(w.id) &&
  typeof w.text === "string" &&
  typeof w.hidden === "boolean" &&
  (w.review === undefined || typeof w.review === "boolean") &&
  Number.isFinite(w.start) &&
  Number.isFinite(w.end) &&
  w.start >= last - TIMING_TOLERANCE &&
  w.end > w.start;

const isValidBlockShape = (b: Block, ids: Set<string>) =>
  typeof b.id === "string" &&
  !ids.has(b.id) &&
  typeof b.hidden === "boolean" &&
  Array.isArray(b.words) &&
  b.words.length > 0 &&
  (!b.override || isValidStyle(b.override));

/**
 * Older versions could store several words inside one token. Split them,
 * retaining the original span so later words are not shifted.
 */
const repairMultiwordTokens = (project: Project): Project =>
  project.blocks
    .flatMap((b) => b.words)
    .reduce(
      (current, w) =>
        w.text.trim().split(/\s+/).length > 1
          ? editWord(current, w.id, w.text)
          : current,
      project,
    );

/**
 * Validates an untrusted value as a project: shape, style ranges, unique
 * identities and monotonic timings. Throws a `DomainError` when invalid.
 */
export function validateProject(value: unknown): Project {
  if (!hasValidShape(value)) throw new DomainError("project.invalid");
  const ids = new Set<string>();
  let last = 0;
  for (const block of value.blocks) {
    if (!isValidBlockShape(block, ids))
      throw new DomainError("project.invalidBlock");
    ids.add(block.id);
    for (const word of block.words) {
      if (!isValidWord(word, ids, last))
        throw new DomainError("project.invalidWords");
      ids.add(word.id);
      last = word.end;
    }
  }
  return repairMultiwordTokens(value);
}
