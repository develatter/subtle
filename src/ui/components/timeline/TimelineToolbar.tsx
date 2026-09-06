import { Redo2, Scissors, Undo2 } from "lucide-react";
import { TIMELINE_ZOOM } from "../../../config/constants";
import { splitBlock, wordIndexAt } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { useSelection } from "../../hooks/useEditor";

export function TimelineToolbar() {
  const { t } = useTranslation();
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const { undo, redo, commit } = useProjectStore.getState();
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const { block } = useSelection();

  const splitAtPlayhead = () => {
    if (!block) return;
    const time = useEditorStore.getState().time;
    commit(splitBlock(currentProject(), block.id, wordIndexAt(block, time)));
  };

  return (
    <div className="timeline-toolbar">
      <div>
        <button disabled={!canUndo} title={t("timeline.undo")} onClick={undo}>
          <Undo2 size={16} />
        </button>
        <button disabled={!canRedo} title={t("timeline.redo")} onClick={redo}>
          <Redo2 size={16} />
        </button>
        <span className="top-divider" />
        <button
          title={t("timeline.splitAtPlayhead")}
          disabled={!block}
          onClick={splitAtPlayhead}
        >
          <Scissors size={16} />
        </button>
        <span className="timeline-caption">{t("timeline.title")}</span>
      </div>
      <div>
        <span className="help">{t("timeline.zoom")}</span>
        <input
          aria-label={t("timeline.zoomLabel")}
          type="range"
          min={TIMELINE_ZOOM.min}
          max={TIMELINE_ZOOM.max}
          step={TIMELINE_ZOOM.step}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
