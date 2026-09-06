import { describeError } from "../../../application/errors";
import { bounds, retimeBlock, type Block } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { useDuration } from "../../hooks/useEditor";

type Props = { block: Block };

/** Outer bounds of the selected block; internal timings scale proportionally. */
export function BlockTimingSection({ block }: Props) {
  const { t } = useTranslation();
  const commit = useProjectStore((s) => s.commit);
  const notify = useEditorStore((s) => s.notify);
  const duration = useDuration();
  const [start, end] = bounds(block);

  const applyBounds = (edge: 0 | 1, input: HTMLInputElement) => {
    const value = Number(input.value);
    try {
      commit(
        retimeBlock(
          currentProject(),
          block.id,
          edge ? start : value,
          edge ? value : end,
          duration,
        ),
      );
    } catch (error) {
      notify(describeError(error, t));
      input.value = bounds(block)[edge].toFixed(2);
    }
  };

  return (
    <section className="settings-section">
      <h3>{t("inspector.blockTiming")}</h3>
      <div className="field-pair">
        {([0, 1] as const).map((edge) => (
          <label key={`${block.id}-${edge}-${bounds(block)[edge]}`}>
            {edge ? t("inspector.end") : t("inspector.start")}
            <input
              type="number"
              step="0.01"
              defaultValue={bounds(block)[edge].toFixed(2)}
              onBlur={(e) => applyBounds(edge, e.target)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
