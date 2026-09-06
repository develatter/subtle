import { Eye, EyeOff, Plus, X } from "lucide-react";
import { toggleBlockHidden } from "../../../application/editing";
import { playback } from "../../../application/playback";
import {
  bounds,
  deleteBlock,
  mergeBlock,
  type Block,
} from "../../../domain/project";
import { clock } from "../../../domain/time/timecode";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { WordChip } from "./WordChip";

type Props = {
  block: Block;
  index: number;
  selected: boolean;
  onInsertBefore: () => void;
};

export function BlockCard({ block, index, selected, onInsertBefore }: Props) {
  const { t } = useTranslation();
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const commit = useProjectStore((s) => s.commit);
  const [start, end] = bounds(block);
  const seekToStart = () => playback.seek(start);

  const mergeWithPrevious = () => {
    const project = currentProject();
    commit(mergeBlock(project, block.id));
    selectBlock(project.blocks[index - 1]?.id);
  };

  return (
    <article
      className={`text-block ${selected ? "selected" : ""} ${block.hidden ? "omitted" : ""}`}
      onClick={() => selectBlock(block.id)}
    >
      <button
        className="insert-boundary"
        title={t("transcript.addBefore")}
        onClick={onInsertBefore}
      >
        <Plus size={14} />
      </button>
      <div className="block-meta">
        <button className="block-index" onClick={seekToStart}>
          {String(index + 1).padStart(2, "0")}
        </button>
        <button className="timecode" onClick={seekToStart}>
          {clock(start)} <span>→</span> {clock(end)}
        </button>
        <button
          title={t("transcript.deleteBlock")}
          onClick={() => commit(deleteBlock(currentProject(), block.id))}
        >
          <X size={14} />
        </button>
        <button
          title={
            block.hidden ? t("transcript.showBlock") : t("transcript.omitBlock")
          }
          onClick={() => toggleBlockHidden(block.id)}
        >
          {block.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <div className="word-editor">
        {block.words.map((word, j) => (
          <WordChip
            key={word.id}
            block={block}
            blockIndex={index}
            word={word}
            wordIndex={j}
          />
        ))}
      </div>
      {selected && (
        <div className="block-foot">
          <span>
            {t("transcript.wordCount", { count: block.words.length })}{" "}
            {block.override ? t("transcript.ownStyle") : ""}
          </span>
          <button disabled={index === 0} onClick={mergeWithPrevious}>
            {t("transcript.mergeWithPrevious")}
          </button>
        </div>
      )}
    </article>
  );
}
