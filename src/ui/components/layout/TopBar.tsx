import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  FolderOpen,
  Subtitles,
  Upload,
} from "lucide-react";
import { ProjectName } from "./ProjectName";
import { saveProjectCopy } from "../../../application/projectFiles";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { useFilePickers } from "../../hooks/useFilePickers";
import { LanguageSwitch } from "../common/LanguageSwitch";

export function TopBar() {
  const { t } = useTranslation();
  const openDialog = useEditorStore((s) => s.openDialog);
  const pickers = useFilePickers();
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="Subtle">
        <span className="brand-mark">
          <Subtitles size={21} />
        </span>
        subtle<span className="beta">STUDIO</span>
      </a>
      <span className="top-divider" />
      <ProjectName />
      <span className="save-state">
        <Check size={12} /> {t("topbar.savedLocally")}
      </span>
      <div className="top-actions">
        <LanguageSwitch />
        <button title={t("topbar.openProject")} onClick={pickers.openProject}>
          <FolderOpen size={16} />
        </button>
        <button
          title={t("topbar.saveProject")}
          onClick={() => void saveProjectCopy()}
        >
          <ArrowDownToLine size={16} />
        </button>
        <span className="top-divider" />
        <button className="export" onClick={() => openDialog("export")}>
          <Upload size={15} /> {t("topbar.export")} <ChevronDown size={13} />
        </button>
      </div>
    </header>
  );
}
