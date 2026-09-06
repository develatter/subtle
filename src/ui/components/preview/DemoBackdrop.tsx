import { Plus } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { useFilePickers } from "../../hooks/useFilePickers";

/** Decorative stage shown until a video is imported. */
export function DemoBackdrop() {
  const { t } = useTranslation();
  const pickers = useFilePickers();
  return (
    <>
      <div className="demo-orb orb-one" />
      <div className="demo-orb orb-two" />
      <div className="demo-grid" />
      <div className="demo-eyebrow">{t("preview.demoEyebrow")}</div>
      <div className="demo-title">
        {t("preview.demoTitle")}
        <br />
        <em>{t("preview.demoTitleEmphasis")}</em>
      </div>
      <button className="demo-import" onClick={() => pickers.loadVideo()}>
        <Plus size={14} /> {t("preview.demoImport")}
      </button>
      <span className="demo-label">{t("preview.demoLabel")}</span>
    </>
  );
}
