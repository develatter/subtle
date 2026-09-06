import { APP_VERSION, WORD_LEAD_IN } from "../../../config/constants";
import { playback } from "../../../application/playback";
import { nextReviewWord, reviewCount } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useProject } from "../../hooks/useEditor";

export function Footer() {
  const { t } = useTranslation();
  const project = useProject();
  const toReview = reviewCount(project);
  const selectedWordId = useEditorStore((s) => s.selectedWordId);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const selectWord = useEditorStore((s) => s.selectWord);

  /** Jumps to the next word with approximate timing, cycling through them. */
  const goToNextReview = () => {
    const next = nextReviewWord(project, selectedWordId);
    if (!next) return;
    selectBlock(next.block.id);
    selectWord(next.word.id);
    playback.seek(Math.max(0, next.word.start - WORD_LEAD_IN));
  };

  return (
    <footer>
      <span>
        <span className="local-dot" /> {t("footer.local")}
      </span>
      <span>
        {toReview > 0 ? (
          <button
            className="review-message review-jump"
            title={t("footer.toReviewHint")}
            onClick={goToNextReview}
          >
            {t("footer.toReview", { count: toReview })}
          </button>
        ) : (
          t("footer.allReviewed")
        )}
        <span className="footer-dot">·</span>
        {t("footer.version", { version: APP_VERSION })}
      </span>
    </footer>
  );
}
