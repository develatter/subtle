import { Plus, Sparkles } from "lucide-react";
import { insertionGap, matchesQuery } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useDuration, useProject } from "../../hooks/useEditor";
import { BlockCard } from "./BlockCard";

export function TranscriptPanel() {
  const { t } = useTranslation();
  const project = useProject();
  const duration = useDuration();
  const selectedId = useEditorStore((s) => s.selectedBlockId);
  const query = useEditorStore((s) => s.query);
  const setQuery = useEditorStore((s) => s.setQuery);
  const openDialog = useEditorStore((s) => s.openDialog);
  const setInsertion = useEditorStore((s) => s.setInsertion);

  /** Opens the insert dialog with a free gap before the block at `index`. */
  const addAt = (index: number) =>
    setInsertion({ text: "", ...insertionGap(project, index, duration) });

  return (
    <section className="transcript">
      <div className="panel-title">
        <h2>
          {t("transcript.title")} <span>{project.blocks.length}</span>
        </h2>
        <button
          title={t("transcript.importOrTranscribe")}
          onClick={() => openDialog("import")}
        >
          <Plus size={17} />
        </button>
      </div>
      <div className="transcript-tools">
        <button className="generate" onClick={() => openDialog("import")}>
          <Sparkles size={15} /> {t("transcript.generate")}
        </button>
        <input
          aria-label={t("transcript.searchLabel")}
          placeholder={t("transcript.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="block-list">
        <button className="insert-block" onClick={() => addAt(0)}>
          <Plus size={14} /> {t("transcript.addAtStart")}
        </button>
        {project.blocks
          .filter((block) => matchesQuery(block, query))
          .map((block) => {
            const index = project.blocks.indexOf(block);
            return (
              <BlockCard
                key={block.id}
                block={block}
                index={index}
                selected={selectedId === block.id}
                onInsertBefore={() => addAt(index)}
              />
            );
          })}
        <button
          className="insert-block"
          onClick={() => addAt(project.blocks.length)}
        >
          <Plus size={14} /> {t("transcript.addAtEnd")}
        </button>
      </div>
      <div className="editor-hint">
        <kbd>↵</kbd> {t("transcript.hintSplit")} <span>·</span> <kbd>⌫</kbd>{" "}
        {t("transcript.hintMerge")}
      </div>
    </section>
  );
}
