import { Film, Subtitles } from "lucide-react";
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { playback } from "../../../application/playback";
import {
  RULER_INTERVAL_SECONDS,
  TIMELINE_WHEEL_ZOOM_RATE,
  TIMELINE_ZOOM,
} from "../../../config/constants";
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

/**
 * Ctrl/⌘ + wheel (and trackpad pinch, which browsers deliver as a wheel event
 * with ctrlKey) zooms the timeline around the pointer, keeping the instant
 * under the cursor in place.
 */
function useWheelZoom(scroll: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { zoom, setZoom } = useEditorStore.getState();
      const next = Math.max(
        TIMELINE_ZOOM.min,
        Math.min(
          TIMELINE_ZOOM.max,
          zoom * Math.exp(-e.deltaY * TIMELINE_WHEEL_ZOOM_RATE),
        ),
      );
      if (next === zoom) return;
      const x = e.clientX - node.getBoundingClientRect().left;
      const anchor = (node.scrollLeft + x) / zoom;
      setZoom(next);
      requestAnimationFrame(() => {
        node.scrollLeft = anchor * next - x;
      });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [scroll]);
}

/** Drag the top edge to change the panel height; the waveform grows with it. */
function ResizeHandle() {
  const { t } = useTranslation();
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const node = e.currentTarget;
    const { timelineHeight, setTimelineHeight } = useEditorStore.getState();
    const startY = e.clientY;
    node.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) =>
      setTimelineHeight(timelineHeight + (startY - ev.clientY));
    const finish = () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", finish);
      node.removeEventListener("pointercancel", finish);
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", finish);
    node.addEventListener("pointercancel", finish);
  };
  return (
    <div
      className="timeline-resize"
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("timeline.resize")}
      title={t("timeline.resize")}
      onPointerDown={onPointerDown}
    />
  );
}

export function TimelinePanel() {
  const { t } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const height = useEditorStore((s) => s.timelineHeight);
  const scroll = useRef<HTMLDivElement>(null);
  useWheelZoom(scroll);
  const hasMedia = useEditorStore((s) => s.media !== null);
  const waveform = useEditorStore((s) => s.media?.waveform);
  const duration = useDuration();
  const timeline = useRef<HTMLDivElement>(null);
  return (
    <section className="timeline-panel" style={{ height }}>
      <ResizeHandle />
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
        <div className="timeline-scroll" ref={scroll}>
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
