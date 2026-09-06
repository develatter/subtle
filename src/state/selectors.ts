import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../domain/export";
import { projectDuration, type Project } from "../domain/project";
import type { Media } from "./editorStore";

/** Timeline length: the media duration, or the project extent for the demo. */
export const durationOf = (media: Media | null, project: Project): number =>
  media?.duration || projectDuration(project);

/** Frame the subtitles are rendered for. */
export const frameOf = (media: Media | null) => ({
  width: media?.width ?? DEFAULT_VIDEO_WIDTH,
  height: media?.height ?? DEFAULT_VIDEO_HEIGHT,
});

export const stripExtension = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, "");

export const baseName = (path: string): string => path.split("/").at(-1)!;
