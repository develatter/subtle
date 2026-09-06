import { ChevronDown, Minimize } from "lucide-react";
import { useRef } from "react";
import { preparePreview } from "../../../application/media";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useIsBusy } from "../../hooks/useEditor";
import { TransportBar } from "./TransportBar";
import { VideoStage } from "./VideoStage";

export function PreviewPanel() {
  const { t } = useTranslation();
  const media = useEditorStore((s) => s.media);
  const rendererStatus = useEditorStore((s) => s.rendererStatus);
  const busy = useIsBusy();
  const expanded = useEditorStore((s) => s.stageExpanded);
  const setExpanded = useEditorStore((s) => s.setStageExpanded);
  const stage = useRef<HTMLDivElement>(null);

  const source = media
    ? media.proxy
      ? t("preview.sourceProxy")
      : t("preview.sourceOriginal")
    : t("preview.sourceDemo");
  const rendererLabel =
    rendererStatus === "ready"
      ? t("preview.rendererReady", { source })
      : rendererStatus === "error"
        ? t("preview.rendererError")
        : t("preview.rendererLoading");

  return (
    <main className="preview-panel">
      <div className="preview-toolbar">
        <span>{t("preview.title")}</span>
        {media?.native && !media.proxy && (
          <button
            className="preview-tag"
            disabled={busy}
            onClick={() => void preparePreview()}
          >
            {t("preview.createProxy")}
          </button>
        )}
        <span className="preview-tag">
          {rendererLabel} <ChevronDown size={11} />
        </span>
      </div>
      <div className={`preview-area ${expanded ? "expanded" : ""}`}>
        <VideoStage stage={stage} />
        {expanded && (
          <button
            className="collapse-stage"
            title={t("preview.collapse")}
            onClick={() => setExpanded(false)}
          >
            <Minimize size={16} />
          </button>
        )}
      </div>
      <TransportBar />
    </main>
  );
}
