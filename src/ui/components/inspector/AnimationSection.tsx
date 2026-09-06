import { updateStyle } from "../../../application/editing";
import type { Animation, Block, Style } from "../../../domain/project";
import { useTranslation, type MessageKey } from "../../../i18n";

type Props = { block: Block | undefined; style: Style };

const OPTIONS: {
  value: Animation;
  icon: string;
  label: MessageKey;
  help: MessageKey;
}[] = [
  {
    value: "normal",
    icon: "Aa",
    label: "inspector.animationNormal",
    help: "inspector.animationNormalHelp",
  },
  {
    value: "progressive",
    icon: "A a",
    label: "inspector.animationProgressive",
    help: "inspector.animationProgressiveHelp",
  },
  {
    value: "word",
    icon: "A",
    label: "inspector.animationWord",
    help: "inspector.animationWordHelp",
  },
];

export function AnimationSection({ block, style }: Props) {
  const { t } = useTranslation();
  const current = OPTIONS.find((o) => o.value === style.animation)!;
  return (
    <section className="settings-section">
      <h3>{t("inspector.animation")}</h3>
      <div className="animations">
        {OPTIONS.map(({ value, icon, label }) => (
          <button
            key={value}
            className={style.animation === value ? "chosen" : ""}
            onClick={() => updateStyle({ animation: value }, block)}
          >
            <span>{icon}</span>
            {t(label)}
          </button>
        ))}
      </div>
      <p className="help">{t(current.help)}</p>
    </section>
  );
}
