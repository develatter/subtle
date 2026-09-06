import { describeError } from "../../../application/errors";
import { playback } from "../../../application/playback";
import { insertBlock } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { useDuration } from "../../hooks/useEditor";

/** Manual insertion of a block in a free gap. */
export function InsertBlockDialog() {
  const { t } = useTranslation();
  const insertion = useEditorStore((s) => s.insertion);
  const setInsertion = useEditorStore((s) => s.setInsertion);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const notify = useEditorStore((s) => s.notify);
  const commit = useProjectStore((s) => s.commit);
  const duration = useDuration();
  if (!insertion) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const project = currentProject();
      const next = insertBlock(
        project,
        insertion.text,
        insertion.start,
        insertion.end,
        duration,
      );
      const added = next.blocks.find(
        (b) => !project.blocks.some((old) => old.id === b.id),
      );
      commit(next);
      if (added) selectBlock(added.id);
      playback.seek(insertion.start);
      setInsertion(null);
      notify(t("notice.blockAdded"));
    } catch (error) {
      notify(describeError(error, t));
    }
  };

  return (
    <div className="modal-backdrop">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t("insert.title")}
        className="modal"
        onSubmit={submit}
      >
        <h2>{t("insert.title")}</h2>
        <p>{t("insert.help")}</p>
        <textarea
          autoFocus
          aria-label={t("insert.textLabel")}
          placeholder={t("insert.textPlaceholder")}
          value={insertion.text}
          onChange={(e) => setInsertion({ ...insertion, text: e.target.value })}
        />
        <label>
          {t("insert.start")}
          <input
            type="number"
            min="0"
            step="0.01"
            value={insertion.start}
            onChange={(e) =>
              setInsertion({ ...insertion, start: Number(e.target.value) })
            }
          />
        </label>
        <label>
          {t("insert.end")}
          <input
            type="number"
            min="0"
            step="0.01"
            value={insertion.end}
            onChange={(e) =>
              setInsertion({ ...insertion, end: Number(e.target.value) })
            }
          />
        </label>
        <button type="button" onClick={() => setInsertion(null)}>
          {t("insert.cancel")}
        </button>
        <button type="submit">{t("insert.submit")}</button>
      </form>
    </div>
  );
}
