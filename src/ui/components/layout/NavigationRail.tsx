import { FileText, Film, Subtitles } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useFilePickers } from "../../hooks/useFilePickers";

export function NavigationRail() {
  const { t } = useTranslation();
  const openDialog = useEditorStore((s) => s.openDialog);
  const pickers = useFilePickers();
  return (
    <aside className="rail">
      <button className="rail-item active" title={t("rail.subtitles")}>
        <Subtitles size={21} />
        <span>{t("rail.subtitles")}</span>
      </button>
      <button className="rail-item" onClick={() => pickers.loadVideo()}>
        <Film size={21} />
        <span>{t("rail.video")}</span>
      </button>
      <button className="rail-item" onClick={() => openDialog("import")}>
        <FileText size={21} />
        <span>{t("rail.script")}</span>
      </button>
      <div className="rail-bottom">
        <span className="local-dot" />
        {t("rail.local")}
      </div>
    </aside>
  );
}
