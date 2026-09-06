import { toAss, toSrt, toStl, type StlFrameRate } from "../domain/export";
import type { Project } from "../domain/project";
import { services } from "../infrastructure/services";
import { translate } from "../i18n";
import { useEditorStore } from "../state/editorStore";
import { currentProject } from "../state/projectStore";
import { beginJob, endJob } from "./jobs";

/** Saves text or bytes through the platform document saver. */
export async function saveDocument(
  content: string | Uint8Array,
  name: string,
): Promise<void> {
  const { notify } = useEditorStore.getState();
  try {
    const bytes =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    const path = await services.documents.save(name, bytes);
    if (path) notify(translate("notice.saved", { path }));
  } catch (error) {
    notify(String(error));
  }
}

export type SubtitleFormat = "srt" | "ass" | "stl";

/** Serialises the project in a subtitle format. Throws domain errors for STL. */
export function renderSubtitles(
  project: Project,
  format: SubtitleFormat,
  options: { stlFps: StlFrameRate; width?: number; height?: number },
): string | Uint8Array {
  switch (format) {
    case "srt":
      return toSrt(project);
    case "ass":
      return toAss(project, options.width, options.height);
    case "stl":
      return toStl(project, options.stlFps);
  }
}

/** Burns the subtitles into the original video through FFmpeg. */
export async function exportVideo(): Promise<void> {
  const editor = useEditorStore.getState();
  const { media } = editor;
  if (!media?.native || !services.media) {
    editor.notify(translate("notice.exportNeedsDesktop"));
    return;
  }
  const id = beginJob(translate("job.exporting"));
  try {
    const project = currentProject();
    const ass = toAss(project, media.width, media.height);
    const path = await services.media.exportVideo(
      ass,
      id,
      translate("export.videoFileName", { name: project.name }),
    );
    if (path) {
      editor.openDialog(null);
      editor.notify(translate("notice.videoExported", { path }));
    }
  } catch (error) {
    editor.notify(String(error));
  } finally {
    endJob();
  }
}
