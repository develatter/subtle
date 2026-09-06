import { useEffect, useRef, type RefObject } from "react";
import { applyVideoMetadata } from "../../../application/media";
import { playback } from "../../../application/playback";
import { blockAt, effectiveStyle, visibleWords } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { frameOf } from "../../../state/selectors";
import { useProject } from "../../hooks/useEditor";
import { useVideoClock } from "../../hooks/useVideoClock";
import { CaptionOverlay } from "./CaptionOverlay";
import { DemoBackdrop } from "./DemoBackdrop";
import { SubtitleCanvas } from "./SubtitleCanvas";

type Props = { stage: RefObject<HTMLDivElement | null> };

/** Video (or demo backdrop) with the libass canvas and the caption overlay. */
export function VideoStage({ stage }: Props) {
  const { t } = useTranslation();
  const project = useProject();
  const media = useEditorStore((s) => s.media);
  const time = useEditorStore((s) => s.time);
  const playing = useEditorStore((s) => s.playing);
  const dragPreview = useEditorStore((s) => s.dragPreview);
  const selectedId = useEditorStore((s) => s.selectedBlockId);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const setTime = useEditorStore((s) => s.setTime);
  const setRendererStatus = useEditorStore((s) => s.setRendererStatus);
  const notify = useEditorStore((s) => s.notify);
  const video = useRef<HTMLVideoElement>(null);

  useVideoClock(video, media?.url);
  useEffect(() => {
    playback.attach(video.current);
    return () => playback.attach(null);
  }, [media?.url]);

  const frame = frameOf(media);
  const active = blockAt(project, time);
  const previewStyle =
    dragPreview && active
      ? active.override
        ? dragPreview.blocks.find((b) => b.id === active.id)?.override
        : dragPreview.style
      : undefined;
  const activeStyle = previewStyle ?? effectiveStyle(project, active);
  const words = visibleWords(active);
  const aspectRatio = media
    ? `${media.previewWidth ?? media.width}/${media.previewHeight ?? media.height}`
    : "9/16";

  return (
    <div
      className={`video-stage ${media ? "has-video" : ""}`}
      ref={stage}
      style={{ aspectRatio }}
    >
      {media ? (
        <video
          ref={video}
          src={media.url}
          onLoadedMetadata={(e) => applyVideoMetadata(e.currentTarget)}
          onTimeUpdate={(e) => {
            if (!playing && !playback.isScrubbing())
              setTime(e.currentTarget.currentTime);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => notify(t("preview.unsupportedFormat"))}
          playsInline
        />
      ) : (
        <DemoBackdrop />
      )}
      <SubtitleCanvas
        project={dragPreview ?? project}
        time={time}
        width={frame.width}
        height={frame.height}
        onStatus={setRendererStatus}
      />
      {active && words.length > 0 && (
        <CaptionOverlay
          block={active}
          style={activeStyle}
          words={words}
          time={time}
          selected={active.id === selectedId}
          stage={stage}
          frame={frame}
        />
      )}
    </div>
  );
}
