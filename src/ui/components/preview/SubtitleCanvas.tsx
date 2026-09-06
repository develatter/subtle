import { useEffect, useRef, useState } from "react";
import SubtitlesOctopus from "libass-wasm";
import { LIBASS_ASSETS } from "../../../config/constants";
import { toAss } from "../../../domain/export";
import type { Project } from "../../../domain/project";
import { services } from "../../../infrastructure/services";
import { useTranslation } from "../../../i18n";
import type { RendererStatus } from "../../../state/editorStore";

type Props = {
  project: Project;
  time: number;
  width: number;
  height: number;
  onStatus: (status: RendererStatus) => void;
};

/** libass needs a tiny offset to render the frame at an exact cue start. */
const TIME_EPSILON = 0.001;

/** Sorted, de-duplicated font families used by the project. */
const fontFamilies = (project: Project): string[] =>
  [
    ...new Set([
      project.style.font,
      ...project.blocks.map((b) => b.override?.font).filter(Boolean),
    ]),
  ].sort() as string[];

/**
 * Renders the project's ASS track with libass (WASM) on top of the video.
 * The same track feeds the native export, so the preview matches the output.
 */
export function SubtitleCanvas({
  project,
  time,
  width,
  height,
  onStatus,
}: Props) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<SubtitlesOctopus | null>(null);
  const readyRef = useRef(false);
  const lastTrack = useRef("");
  const pendingFrame = useRef<number | null>(null);
  const latest = useRef({ project, time, width, height, onStatus });
  latest.current = { project, time, width, height, onStatus };

  const families = JSON.stringify(fontFamilies(project));
  const [fontPaths, setFontPaths] = useState<{
    families: string;
    paths: string[];
  } | null>(null);

  // Resolve font files whenever the set of families changes.
  useEffect(() => {
    let alive = true;
    onStatus("loading");
    const ready = (paths: string[]) => {
      if (alive) setFontPaths({ families, paths });
    };
    if (services.fonts)
      services.fonts
        .files(JSON.parse(families))
        .then(ready)
        .catch(() => {
          if (alive) onStatus("error");
        });
    else ready([]);
    return () => {
      alive = false;
    };
  }, [families]);

  // Create the renderer once fonts are known; recreate on size changes.
  useEffect(() => {
    if (!canvas.current || fontPaths?.families !== families) return;
    let alive = true;
    let ready = false;
    const node = canvas.current;
    readyRef.current = false;
    latest.current.onStatus("loading");
    node.width = width;
    node.height = height;
    const instance = new SubtitlesOctopus({
      canvas: node,
      subContent: toAss(latest.current.project, width, height),
      fonts: fontPaths.paths,
      fallbackFont: LIBASS_ASSETS.fallbackFont,
      workerUrl: LIBASS_ASSETS.workerUrl,
      legacyWorkerUrl: LIBASS_ASSETS.legacyWorkerUrl,
      targetFps: LIBASS_ASSETS.targetFps,
      onReady: () => {
        if (!alive) return;
        ready = true;
        readyRef.current = true;
        lastTrack.current = toAss(latest.current.project, width, height);
        instance.setTrack(lastTrack.current);
        instance.setCurrentTime(latest.current.time + TIME_EPSILON);
        latest.current.onStatus("ready");
      },
      onError: () => {
        if (alive) {
          readyRef.current = false;
          latest.current.onStatus("error");
        }
      },
    });
    renderer.current = instance;
    const observer = new ResizeObserver(() => {
      if (ready) {
        instance.resize(width, height);
        instance.setCurrentTime(latest.current.time + TIME_EPSILON);
      }
    });
    observer.observe(node);
    return () => {
      alive = false;
      readyRef.current = false;
      if (pendingFrame.current !== null)
        cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = null;
      observer.disconnect();
      renderer.current = null;
      instance.dispose();
    };
  }, [fontPaths, families, width, height]);

  // Coalesce pointer events and commits into one track update per frame.
  // Replacing the same ASS track again needlessly discards the layout.
  useEffect(() => {
    if (!readyRef.current || pendingFrame.current !== null) return;
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      const instance = renderer.current;
      if (!instance || !readyRef.current) return;
      const current = latest.current;
      const track = toAss(current.project, current.width, current.height);
      if (track !== lastTrack.current) {
        instance.setTrack(track);
        lastTrack.current = track;
      }
      instance.setCurrentTime(current.time + TIME_EPSILON);
    });
  }, [project, width, height]);

  useEffect(() => {
    if (readyRef.current) renderer.current?.setCurrentTime(time + TIME_EPSILON);
  }, [time]);

  return (
    <canvas
      ref={canvas}
      className="subtitle-canvas"
      aria-label={t("preview.canvasLabel")}
    />
  );
}
