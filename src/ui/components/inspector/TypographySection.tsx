import { updateStyle } from "../../../application/editing";
import {
  clampStyleValue,
  STYLE_LIMITS,
  type Block,
  type Style,
} from "../../../domain/project";
import { useTranslation, type MessageKey } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";

type Props = { block: Block | undefined; style: Style };

const SLIDERS: {
  key: "opacity" | "outline" | "shadow";
  label: MessageKey;
  unit: string;
}[] = [
  { key: "opacity", label: "inspector.opacity", unit: "%" },
  { key: "outline", label: "inspector.outline", unit: "px" },
  { key: "shadow", label: "inspector.shadow", unit: "px" },
];

export function TypographySection({ block, style }: Props) {
  const { t } = useTranslation();
  const fonts = useEditorStore((s) => s.fonts);
  const patch = (value: Partial<Style>) => updateStyle(value, block);
  return (
    <section className="settings-section">
      <h3>{t("inspector.typography")}</h3>
      <label>
        {t("inspector.font")}
        <select
          value={style.font}
          onChange={(e) => patch({ font: e.target.value })}
        >
          {[...new Set([style.font, ...fonts])].map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
      </label>
      <div className="field-pair">
        <label>
          {t("inspector.size")}
          <input
            aria-label={t("inspector.size")}
            type="number"
            min={STYLE_LIMITS.size.min}
            max={STYLE_LIMITS.size.max}
            value={style.size}
            onChange={(e) =>
              patch({ size: clampStyleValue("size", Number(e.target.value)) })
            }
          />
        </label>
        <label>
          {t("inspector.color")}
          <div className="color-input">
            <input
              aria-label={t("inspector.color")}
              type="color"
              value={style.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
            <span>{style.color.toUpperCase()}</span>
          </div>
        </label>
      </div>
      {SLIDERS.map(({ key, label, unit }) => (
        <label className="slider-field" key={key}>
          <span>
            {t(label)}
            <output>
              {style[key]} {unit}
            </output>
          </span>
          <input
            aria-label={t(label)}
            type="range"
            min={STYLE_LIMITS[key].min}
            max={STYLE_LIMITS[key].max}
            value={style[key]}
            onChange={(e) => patch({ [key]: Number(e.target.value) })}
          />
        </label>
      ))}
    </section>
  );
}
