import { bounds, visibleText, type Project } from "../project";
import { srtTimestamp } from "../time/timecode";

/** Blocks that carry at least one visible word. */
export const exportableBlocks = (project: Project) =>
  project.blocks.filter((b) => !b.hidden && b.words.some((w) => !w.hidden));

/** SubRip: plain text and timings per block, hidden text omitted. */
export function toSrt(project: Project): string {
  return exportableBlocks(project)
    .map((b, i) => {
      const [start, end] = bounds(b);
      return `${i + 1}\n${srtTimestamp(start)} --> ${srtTimestamp(end)}\n${visibleText(b)}\n`;
    })
    .join("\n");
}
