/**
 * Project edits triggered from the UI. Every function reads the latest
 * project so handlers never commit on top of a stale render.
 */
import {
  editWord as editWordText,
  mergeBlock,
  splitBlock,
  type Block,
  type Project,
  type Style,
} from "../domain/project";
import { currentProject, useProjectStore } from "../state/projectStore";

const commit = (project: Project) => useProjectStore.getState().commit(project);

export function updateBlock(id: string, update: (block: Block) => Block): void {
  const project = currentProject();
  commit({
    ...project,
    blocks: project.blocks.map((b) => (b.id === id ? update(b) : b)),
  });
}

/** Patches the block's own style if it has one, otherwise the project style. */
export function updateStyle(patch: Partial<Style>, block?: Block): void {
  if (block?.override)
    updateBlock(block.id, (b) => ({
      ...b,
      override: { ...b.override!, ...patch },
    }));
  else {
    const project = currentProject();
    commit({ ...project, style: { ...project.style, ...patch } });
  }
}

/** Applies a style patch to a block's override or to the shared style. */
export function withStylePatch(
  project: Project,
  block: Block,
  patch: Partial<Style>,
): Project {
  const base = block.override ?? project.style;
  return block.override
    ? {
        ...project,
        blocks: project.blocks.map((b) =>
          b.id === block.id ? { ...b, override: { ...base, ...patch } } : b,
        ),
      }
    : { ...project, style: { ...project.style, ...patch } };
}

export function toggleBlockHidden(id: string): void {
  updateBlock(id, (b) => ({ ...b, hidden: !b.hidden }));
}

export function toggleWordHidden(blockId: string, wordId: string): void {
  updateBlock(blockId, (b) => ({
    ...b,
    words: b.words.map((w) =>
      w.id === wordId ? { ...w, hidden: !w.hidden } : w,
    ),
  }));
}

export function markWordReviewed(blockId: string, wordId: string): void {
  updateBlock(blockId, (b) => ({
    ...b,
    words: b.words.map((w) => (w.id === wordId ? { ...w, review: false } : w)),
  }));
}

/** Shift+Enter: a visual line break after the word. */
export function appendLineBreak(blockId: string, wordId: string): void {
  updateBlock(blockId, (b) => ({
    ...b,
    words: b.words.map((w) =>
      w.id === wordId ? { ...w, text: w.text + "\n" } : w,
    ),
  }));
}

export function setBlockOverride(id: string, enabled: boolean): void {
  const { style } = currentProject();
  updateBlock(id, (b) => ({
    ...b,
    override: enabled ? { ...style } : undefined,
  }));
}

export function editWord(wordId: string, text: string): void {
  commit(editWordText(currentProject(), wordId, text));
}

export function deleteWord(wordId: string): void {
  editWord(wordId, "");
}

/**
 * Enter inside a word: the text before the caret stays in this block and the
 * rest starts a new one. Returns the id of the new block, if one was created.
 */
export function splitAtCaret(
  blockId: string,
  wordId: string,
  wordIndex: number,
  before: string,
  after: string,
): string | null {
  const edited = editWordText(
    currentProject(),
    wordId,
    [before, after].filter(Boolean).join(" "),
  );
  const block = edited.blocks.find((b) => b.id === blockId);
  if (!block) {
    commit(edited);
    return null;
  }
  const originalIndex = block.words.findIndex((w) => w.id === wordId);
  const at =
    originalIndex < 0
      ? wordIndex
      : originalIndex + (before ? before.split(/\s+/).length : 0);
  const next = splitBlock(edited, blockId, at);
  commit(next);
  if (next === edited) return null;
  const blockIndex = edited.blocks.findIndex((b) => b.id === blockId);
  return next.blocks[blockIndex + 1].id;
}

/** Backspace at the start of a block: commit the text and join the previous. */
export function mergeIntoPrevious(
  blockId: string,
  wordId: string,
  text: string,
) {
  commit(mergeBlock(editWordText(currentProject(), wordId, text), blockId));
}

/** Delete at the end of a block: commit the text and absorb the next block. */
export function mergeWithNext(
  nextBlockId: string,
  wordId: string,
  text: string,
) {
  commit(mergeBlock(editWordText(currentProject(), wordId, text), nextBlockId));
}

/** Renames the project; blank names are ignored. */
export function renameProject(name: string): void {
  const trimmed = name.trim();
  const project = currentProject();
  if (trimmed && trimmed !== project.name)
    commit({ ...project, name: trimmed });
}
