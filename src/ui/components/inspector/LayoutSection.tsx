import { updateStyle } from "../../../application/editing";
import {
  captionWidth,
  clampStyleValue,
  STYLE_LIMITS,
  type Block,
  type Style,
} from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { frameOf } from "../../../state/selectors";
import { minimumCaptionWidth } from "../../captionMetrics";
import { useProject } from "../../hooks/useEditor";

type Props = { block: Block | undefined; style: Style };

export function LayoutSection({ block, style }: Props) {
  const { t } = useTranslation();
  const project = useProject();
  const media = useEditorStore((s) => s.media);
  const patch = (value: Partial<Style>) => updateStyle(value, block);
  return (
    <section className="settings-section">
      <h3>{t("inspector.layout")}</h3>
      <label>
        {t("inspector.maxWidth")}
        <input
          aria-label={t("inspector.maxWidthLabel")}
          type="number"
          min={STYLE_LIMITS.width.min}
          max={STYLE_LIMITS.width.max}
          value={Math.round(captionWidth(style))}
          onChange={(e) =>
            patch({
              width: Math.max(
                minimumCaptionWidth(project, style, block, frameOf(media)),
                Math.min(STYLE_LIMITS.width.max, Number(e.target.value)),
              ),
            })
          }
        />
      </label>
      <div className="field-pair">
        {(["x", "y"] as const).map((axis) => (
          <label key={axis}>
            {t("inspector.axis", { axis: axis.toUpperCase() })}
            <input
              type="number"
              min={STYLE_LIMITS[axis].min}
              max={STYLE_LIMITS[axis].max}
              value={Math.round(style[axis])}
              onChange={(e) =>
                patch({ [axis]: clampStyleValue(axis, Number(e.target.value)) })
              }
            />
          </label>
        ))}
      </div>
      <p className="help">{t("inspector.dragHelp")}</p>
    </section>
  );
}
