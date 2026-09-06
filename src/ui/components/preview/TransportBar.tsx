import {
  ArrowLeft,
  ArrowRight,
  Maximize,
  Minimize,
  Pause,
  Play,
} from "lucide-react";
import { playback } from "../../../application/playback";
import { nextBlockStart, previousBlockStart } from "../../../domain/project";
import { clock } from "../../../domain/time/timecode";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject } from "../../../state/projectStore";
import { useDuration } from "../../hooks/useEditor";

export function TransportBar() {
  const { t } = useTranslation();
  const time = useEditorStore((s) => s.time);
  const playing = useEditorStore((s) => s.playing);
  const duration = useDuration();
  const expanded = useEditorStore((s) => s.stageExpanded);
  const setExpanded = useEditorStore((s) => s.setStageExpanded);
  return (
    <div className="transport">
      <span className="current-time">
        {clock(time)} <span>/ {clock(duration)}</span>
      </span>
      <div className="play-controls">
        <button
          title={t("preview.previousBlock")}
          onClick={() =>
            playback.seek(previousBlockStart(currentProject(), time))
          }
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="play"
          aria-label={playing ? t("preview.pause") : t("preview.play")}
          onClick={playback.toggle}
        >
          {playing ? (
            <Pause size={18} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
        <button
          title={t("preview.nextBlock")}
          onClick={() =>
            playback.seek(nextBlockStart(currentProject(), time, duration))
          }
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <button
        title={expanded ? t("preview.collapse") : t("preview.expand")}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <Minimize size={15} /> : <Maximize size={15} />}
      </button>
    </div>
  );
}
