import { Check, Play } from "lucide-react";
import { markWordReviewed } from "../../../application/editing";
import { describeError } from "../../../application/errors";
import { playback } from "../../../application/playback";
import { WORD_LEAD_IN } from "../../../config/constants";
import { retimeWord, type Block, type Word } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { useDuration } from "../../hooks/useEditor";

type Props = { block: Block; word: Word };

/** Manual timing of the selected word. */
export function WordSection({ block, word }: Props) {
  const { t } = useTranslation();
  const commit = useProjectStore((s) => s.commit);
  const notify = useEditorStore((s) => s.notify);
  const duration = useDuration();

  const applyTiming = (key: "start" | "end", input: HTMLInputElement) => {
    const value = Number(input.value);
    try {
      commit(
        retimeWord(
          currentProject(),
          word.id,
          key === "start" ? value : word.start,
          key === "end" ? value : word.end,
          duration,
        ),
      );
    } catch (error) {
      notify(describeError(error, t));
      input.value = String(word[key]);
    }
  };

  return (
    <section className="settings-section">
      <h3>{t("inspector.word", { text: word.text })}</h3>
      {word.review && (
        <p className="review-message">{t("inspector.wordReview")}</p>
      )}
      <button
        onClick={() => playback.seek(Math.max(0, word.start - WORD_LEAD_IN))}
      >
        <Play size={12} /> {t("inspector.goToWord")}
      </button>
      <div className="field-pair">
        {(["start", "end"] as const).map((key) => (
          <label key={`${word.id}-${key}-${word[key]}`}>
            {key === "start"
              ? t("inspector.wordStart")
              : t("inspector.wordEnd")}
            <input
              type="number"
              step="0.01"
              defaultValue={word[key].toFixed(3)}
              onBlur={(e) => applyTiming(key, e.target)}
            />
          </label>
        ))}
      </div>
      {word.review && (
        <button onClick={() => markWordReviewed(block.id, word.id)}>
          <Check size={12} /> {t("inspector.markReviewed")}
        </button>
      )}
    </section>
  );
}
