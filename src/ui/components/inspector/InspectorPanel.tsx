import { Layers, Settings2 } from "lucide-react";
import { setBlockOverride } from "../../../application/editing";
import { useTranslation } from "../../../i18n";
import { useSelection } from "../../hooks/useEditor";
import { AnimationSection } from "./AnimationSection";
import { BlockTimingSection } from "./BlockTimingSection";
import { LayoutSection } from "./LayoutSection";
import { TypographySection } from "./TypographySection";
import { WordSection } from "./WordSection";

export function InspectorPanel() {
  const { t } = useTranslation();
  const { block, style, word } = useSelection();
  const hasOverride = !!block?.override;
  return (
    <aside className="inspector">
      <div className="panel-title">
        <h2>{t("inspector.title")}</h2>
        <Settings2 size={16} />
      </div>
      <div className="scope">
        <Layers size={16} />
        <div>
          <strong>
            {hasOverride ? t("inspector.scopeBlock") : t("inspector.scopeAll")}
          </strong>
          <small>
            {hasOverride
              ? t("inspector.scopeBlockHint")
              : t("inspector.scopeAllHint")}
          </small>
        </div>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          disabled={!block}
          checked={hasOverride}
          onChange={(e) =>
            block && setBlockOverride(block.id, e.target.checked)
          }
        />{" "}
        {t("inspector.onlyThisBlock")}
      </label>
      <TypographySection block={block} style={style} />
      <AnimationSection block={block} style={style} />
      <LayoutSection block={block} style={style} />
      {block && word && <WordSection block={block} word={word} />}
      {block && <BlockTimingSection block={block} />}
    </aside>
  );
}
