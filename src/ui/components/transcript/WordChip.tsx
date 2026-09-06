import { Eye, EyeOff, X } from "lucide-react";
import {
  appendLineBreak,
  deleteWord,
  editWord,
  mergeIntoPrevious,
  mergeWithNext,
  splitAtCaret,
  toggleWordHidden,
} from "../../../application/editing";
import type { Block, Word } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject } from "../../../state/projectStore";

type Props = {
  block: Block;
  blockIndex: number;
  word: Word;
  wordIndex: number;
};

/** Focuses the first word of a block once it has rendered. */
export const focusBlock = (id: string) =>
  setTimeout(
    () => document.querySelector<HTMLElement>(`[data-block="${id}"]`)?.focus(),
    0,
  );

/**
 * One editable word. Enter splits the block at the caret, Shift+Enter adds a
 * visual line break, Backspace at the start merges with the previous block and
 * Delete at the end merges with the next one.
 */
export function WordChip({ block, blockIndex, word, wordIndex }: Props) {
  const { t } = useTranslation();
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const selectWord = useEditorStore((s) => s.selectWord);
  const isFirst = wordIndex === 0;
  const isLast = wordIndex === block.words.length - 1;

  const onKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    const selection = window.getSelection();
    const offset = selection?.anchorOffset ?? 0;
    const raw = e.currentTarget.textContent ?? "";
    const blocks = currentProject().blocks;
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        appendLineBreak(block.id, word.id);
        return;
      }
      const nextId = splitAtCaret(
        block.id,
        word.id,
        wordIndex,
        raw.slice(0, offset).trim(),
        raw.slice(offset).trim(),
      );
      if (nextId) {
        selectBlock(nextId);
        focusBlock(nextId);
      }
    }
    if (
      e.key === "Backspace" &&
      selection?.isCollapsed &&
      isFirst &&
      offset === 0 &&
      blockIndex > 0
    ) {
      e.preventDefault();
      mergeIntoPrevious(block.id, word.id, raw);
      selectBlock(blocks[blockIndex - 1].id);
    }
    if (
      e.key === "Delete" &&
      selection?.isCollapsed &&
      isLast &&
      offset === word.text.length &&
      blockIndex < blocks.length - 1
    ) {
      e.preventDefault();
      mergeWithNext(blocks[blockIndex + 1].id, word.id, raw);
    }
  };

  return (
    <span
      className={`word ${word.review ? "review-word" : ""} ${word.hidden ? "hidden-word" : ""}`}
      title={word.review ? t("transcript.approximateTiming") : ""}
    >
      <span
        role="textbox"
        aria-label={t("transcript.wordLabel", { text: word.text })}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => {
          selectBlock(block.id);
          selectWord(word.id);
        }}
        onBlur={(e) => {
          const text = e.currentTarget.textContent?.trim() ?? "";
          if (text !== word.text) editWord(word.id, text);
        }}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          e.preventDefault();
          e.currentTarget.textContent = e.clipboardData.getData("text/plain");
        }}
        data-block={isFirst ? block.id : undefined}
      >
        {word.text}
      </span>
      <button
        className="word-delete"
        title={t("transcript.deleteWord")}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => deleteWord(word.id)}
      >
        <X size={10} />
      </button>
      <button
        className="word-eye"
        title={
          word.hidden ? t("transcript.showWord") : t("transcript.omitWord")
        }
        onClick={() => toggleWordHidden(block.id, word.id)}
      >
        {word.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
      </button>
    </span>
  );
}
