/**
 * Loading and preparing video. On desktop the original is probed natively;
 * on the web a local file plays directly in the browser.
 */
import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../domain/export";
import { services } from "../infrastructure/services";
import { translate } from "../i18n";
import { useEditorStore, type Media } from "../state/editorStore";
import { currentProject, useProjectStore } from "../state/projectStore";
import { baseName } from "../state/selectors";
import type { ProbedVideo } from "./ports";
import { beginJob, endJob } from "./jobs";

const mediaFromProbe = (probe: ProbedVideo): Media => {
  const stream = probe.info.streams.find((s) => s.codec_type === "video")!;
  return {
    url: services.media!.assetUrl(probe.path),
    name: baseName(probe.path),
    duration: Number(probe.info.format.duration) || 0,
    width: stream.width,
    height: stream.height,
    native: true,
  };
};

/** Resets the transport for a new media source. */
function showMedia(media: Media | null) {
  const editor = useEditorStore.getState();
  editor.setMedia(media);
  editor.setPlaying(false);
  editor.setTime(0);
}

/**
 * Draws the waveform in the background and attaches it to the media that is
 * still loaded when it finishes. Failures are silent: the timeline simply
 * shows no waveform.
 */
function loadWaveform(url: string) {
  const gateway = services.media;
  if (!gateway) return;
  void gateway
    .waveform()
    .then((path) => {
      if (!path) return;
      useEditorStore
        .getState()
        .setMedia((m) =>
          m && m.url === url && !m.waveform
            ? { ...m, waveform: gateway.assetUrl(path) }
            : m,
        );
    })
    .catch(() => {});
}

/**
 * Opens the native picker. Links the chosen file to the project and opens the
 * import dialog unless this is a relink of a moved original.
 */
export async function pickVideo({ relink = false } = {}): Promise<void> {
  const editor = useEditorStore.getState();
  try {
    const probe = await services.media!.pickVideo();
    if (!probe) return;
    const media = mediaFromProbe(probe);
    showMedia(media);
    loadWaveform(media.url);
    useProjectStore
      .getState()
      .commit({ ...currentProject(), source: { path: probe.path } });
    if (!relink) editor.openDialog("import");
  } catch (error) {
    editor.notify(String(error));
  }
}

/** Web mode: plays a local file chosen through an `<input type="file">`. */
export function openLocalFile(file: File): void {
  showMedia({
    url: URL.createObjectURL(file),
    name: file.name,
    duration: 0,
    width: DEFAULT_VIDEO_WIDTH,
    height: DEFAULT_VIDEO_HEIGHT,
    native: false,
  });
  useEditorStore.getState().openDialog("import");
}

/** Re-probes the project's linked original after start-up or a project change. */
export async function restoreLinkedVideo(
  path: string,
  isCurrent: () => boolean,
): Promise<void> {
  try {
    const probe = await services.media!.restoreVideo(path);
    if (!isCurrent()) return;
    const media = mediaFromProbe(probe);
    useEditorStore.getState().setMedia(media);
    loadWaveform(media.url);
  } catch (error) {
    if (isCurrent()) useEditorStore.getState().notify(String(error));
  }
}

/** Encodes a lightweight proxy plus waveform and switches the preview to it. */
export async function preparePreview(): Promise<void> {
  const editor = useEditorStore.getState();
  if (!editor.media?.native || !services.media) return;
  const id = beginJob(translate("job.preparingPreview"));
  editor.openDialog("import");
  try {
    const result = await services.media.preparePreview(id);
    const media = services.media;
    editor.setMedia((m) =>
      m
        ? {
            ...m,
            url: media.assetUrl(result.path),
            proxy: true,
            waveform: result.waveform
              ? media.assetUrl(result.waveform)
              : undefined,
          }
        : m,
    );
    editor.setPlaying(false);
    editor.setTime(0);
    editor.openDialog(null);
  } catch (error) {
    editor.notify(String(error));
  } finally {
    endJob();
  }
}

/** Called once the `<video>` reports its metadata. */
export function applyVideoMetadata(video: HTMLVideoElement): void {
  useEditorStore.getState().setMedia((m) =>
    m
      ? {
          ...m,
          duration: video.duration,
          width: m.native ? m.width : video.videoWidth,
          height: m.native ? m.height : video.videoHeight,
          previewWidth: video.videoWidth,
          previewHeight: video.videoHeight,
        }
      : m,
  );
}
