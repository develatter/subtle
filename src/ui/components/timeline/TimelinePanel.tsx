import { Film, Subtitles } from "lucide-react";
import { useRef } from "react";
import { playback } from "../../../application/playback";
import { RULER_INTERVAL_SECONDS } from "../../../config/constants";
import { clock } from "../../../domain/time/timecode";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useDuration } from "../../hooks/useEditor";
import { Playhead } from "./Playhead";
import { SubtitleTrack } from "./SubtitleTrack";
import { TimelineToolbar } from "./TimelineToolbar";

function Ruler({ duration }: { duration: number }) {
  const marks = Math.ceil(duration / RULER_INTERVAL_SECONDS) + 1;
  return (
    <div className="ruler">
      {Array.from({ length: marks }, (_, i) => {
        const seconds = i * RULER_INTERVAL_SECONDS;
        return (
          <span key={i} style={{ left: (seconds / duration) * 100 + "%" }}>
            {clock(seconds).slice(0, 5)}
          </span>
        );
      })}
    </div>
  );
}

export function TimelinePanel() {
  const { t } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const hasMedia = useEditorStore((s) => s.media !== null);
  const waveform = useEditorStore((s) => s.media?.waveform);
  const duration = useDuration();
  const timeline = useRef<HTMLDivElement>(null);
  return (
    <section className="timeline-panel">
      <TimelineToolbar />
      <div className="tracks">
        <div className="track-labels">
          <span />
          <span>
            <Subtitles size={15} /> {t("timeline.subtitlesTrack")}
          </span>
          <span>
            <Film size={15} /> {t("timeline.videoTrack")}
          </span>
        </div>
        <div className="timeline-scroll">
          <div
            className="timeline-content"
            ref={timeline}
            style={{ width: `${zoom * 100}%` }}
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              playback.seek(((e.clientX - rect.left) / rect.width) * duration);
            }}
          >
            <Ruler duration={duration} />
            <SubtitleTrack timeline={timeline} />
            <div className="video-track">
              <div className="media-strip">
                {waveform && <img className="waveform" src={waveform} alt="" />}
                {!hasMedia && <span>{t("timeline.demoMedia")}</span>}
              </div>
            </div>
            <Playhead timeline={timeline} />
          </div>
        </div>
      </div>
    </section>
  );
}
