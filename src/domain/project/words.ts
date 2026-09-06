import { uid } from "./ids";
import { DomainError } from "./errors";
import type { Project, Word } from "./types";

const allWords = (project: Project): Word[] =>
  project.blocks.flatMap((b) => b.words);

/**
 * Sets the timing of a single word. It must stay between its neighbours and
 * inside the media. A manual timing clears the review flag of that word only.
 */
export function retimeWord(
  project: Project,
  id: string,
  start: number,
  end: number,
  duration: number,
): Project {
  const words = allWords(project);
  const index = words.findIndex((w) => w.id === id);
  if (index < 0) return project;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    start < (words[index - 1]?.end ?? 0) ||
    end > (words[index + 1]?.start ?? duration)
  )
    throw new DomainError("word.retimeOutOfRange");
  return {
    ...project,
    blocks: project.blocks.map((b) => ({
      ...b,
      words: b.words.map((w) =>
        w.id === id ? { ...w, start, end, review: false } : w,
      ),
    })),
  };
}

/**
 * Distributes a word's interval among the tokens that replace it, weighted by
 * token length. The first token keeps the original identity.
 */
function retokenize(word: Word, tokens: string[]): Word[] {
  const weight = tokens.reduce((n, t) => n + t.length, 0);
  let cursor = word.start;
  return tokens.map((text, i) => {
    const start = cursor;
    const isLast = i === tokens.length - 1;
    cursor = isLast
      ? word.end
      : cursor + ((word.end - word.start) * text.length) / weight;
    return {
      ...word,
      id: i === 0 ? word.id : uid(),
      text,
      start,
      end: cursor,
      review: tokens.length > 1 || word.review,
    };
  });
}

/**
 * Replaces the text of a word. Editing never shifts the following words: new
 * tokens share the original interval, and an empty text deletes the word.
 * Blocks left without words are removed.
 */
export function editWord(project: Project, id: string, text: string): Project {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  return {
    ...project,
    blocks: project.blocks
      .map((b) => ({
        ...b,
        words: b.words.flatMap((w) =>
          w.id === id ? retokenize(w, tokens) : [w],
        ),
      }))
      .filter((b) => b.words.length),
  };
}
