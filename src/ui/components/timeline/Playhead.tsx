import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { playback } from "../../../application/playback";
import { PLAYHEAD_STEP } from "../../../config/constants";
import { clock } from "../../../domain/time/timecode";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useDuration } from "../../hooks/useEditor";

type Props = { timeline: RefObject<HTMLDivElement | null> };

/** Draggable, keyboard-accessible playhead. */
export function Playhead({ timeline }: Props) {
  const { t } = useTranslation();
  const time = useEditorStore((s) => s.time);
  const duration = useDuration();

  const dragPlayhead = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !timeline.current) return;
    e.preventDefault();
    e.stopPropagation();
    const node = e.currentTarget;
    const wasPlaying = useEditorStore.getState().playing;
    playback.setScrubbing(true);
    playback.pause();
    node.focus();
    node.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = timeline.current?.getBoundingClientRect();
      if (rect && rect.width > 0)
        playback.seek(((ev.clientX - rect.left) / rect.width) * duration);
    };
    const finish = (ev: PointerEvent) => {
      if (ev.type === "pointerup") move(ev);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", finish);
      node.removeEventListener("pointercancel", finish);
      node.removeEventListener("lostpointercapture", finish);
      playback.setScrubbing(false);
      if (wasPlaying && ev.type === "pointerup") playback.resume();
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", finish);
    node.addEventListener("pointercancel", finish);
    node.addEventListener("lostpointercapture", finish);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Home") playback.seek(0);
    else if (e.key === "End") playback.seek(duration);
    else {
      const step = e.shiftKey ? PLAYHEAD_STEP.second : PLAYHEAD_STEP.frame;
      playback.seek(time + (e.key === "ArrowLeft" ? -1 : 1) * step);
    }
  };

  return (
    <div
      className="playhead"
      role="slider"
      tabIndex={0}
      aria-label={t("timeline.playhead")}
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={time}
      aria-valuetext={clock(time)}
      onPointerDown={dragPlayhead}
      onKeyDown={onKeyDown}
      style={{ left: (time / duration) * 100 + "%" }}
    >
      <i />
    </div>
  );
}
