import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useProjectStore } from "../../../state";
import { useFilePickers } from "../../hooks/useFilePickers";

/** Offered when the project references an original that is not loaded. */
export function RelinkVideoButton() {
  const { t } = useTranslation();
  const hasSource = useProjectStore((s) => s.project.source !== undefined);
  const hydrated = useProjectStore((s) => s.hydrated);
  const hasMedia = useEditorStore((s) => s.media !== null);
  const pickers = useFilePickers();
  if (!hasSource || hasMedia || !hydrated) return null;
  return (
    <button
      className="relink-video"
      onClick={() => pickers.loadVideo({ relink: true })}
    >
      {t("notice.relinkVideo")}
    </button>
  );
}
