import { APP_VERSION } from "../../../config/constants";
import { omittedWordCount, reviewCount } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useProject } from "../../hooks/useEditor";

export function Footer() {
  const { t } = useTranslation();
  const project = useProject();
  const toReview = reviewCount(project);
  return (
    <footer>
      <span>
        <span className="local-dot" /> {t("footer.local")}
      </span>
      <span>
        {toReview > 0 && (
          <span className="review-message">
            {t("footer.toReview", { count: toReview })}{" "}
          </span>
        )}
        {t("footer.omittedWords", { count: omittedWordCount(project) })}{" "}
        <span className="footer-dot">·</span>{" "}
        {t("footer.version", { version: APP_VERSION })}
      </span>
    </footer>
  );
}
