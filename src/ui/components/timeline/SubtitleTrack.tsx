import { GripVertical } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { playback } from "../../../application/playback";
import {
  bounds,
  moveBlock,
  visibleText,
  type Block,
} from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { useDuration, useProject } from "../../hooks/useEditor";

type Props = { timeline: RefObject<HTMLDivElement | null> };

/** Blocks laid out on the timeline; dragging moves a block in time. */
export function SubtitleTrack({ timeline }: Props) {
  const { t } = useTranslation();
  const project = useProject();
  const duration = useDuration();
  const selectedId = useEditorStore((s) => s.selectedBlockId);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const commit = useProjectStore((s) => s.commit);

  const dragBlock = (e: ReactPointerEvent, block: Block) => {
    e.preventDefault();
    e.stopPropagation();
    selectBlock(block.id);
    playback.seek(bounds(block)[0]);
    const node = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const width = timeline.current!.getBoundingClientRect().width;
    node.focus();
    node.setPointerCapture(e.pointerId);
    let delta = 0;
    const move = (ev: PointerEvent) => {
      delta = ((ev.clientX - startX) / width) * duration;
      node.style.transform = `translateX(${ev.clientX - startX}px)`;
    };
    const up = () => {
      node.style.transform = "";
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      commit(moveBlock(currentProject(), block.id, delta, duration));
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
  };

  return (
    <div className="subtitle-track">
      {project.blocks.map((block) => {
        const [start, end] = bounds(block);
        return (
          <button
            key={block.id}
            className={`timeline-block ${block.id === selectedId ? "selected" : ""} ${block.hidden ? "muted" : ""}`}
            style={{
              left: (start / duration) * 100 + "%",
              width: ((end - start) / duration) * 100 + "%",
            }}
            onPointerDown={(e) => dragBlock(e, block)}
          >
            <GripVertical size={12} />
            {visibleText(block) || t("timeline.omitted")}
          </button>
        );
      })}
    </div>
  );
}
