import { Film, LoaderCircle, Sparkles } from "lucide-react";
import { transcribe } from "../../../application/transcription";
import { demo } from "../../../domain/project";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject, useProjectStore } from "../../../state/projectStore";
import { useFilePickers } from "../../hooks/useFilePickers";
import { DialogFrame } from "./DialogFrame";

/** Video selection plus optional script for transcription or alignment. */
export function ImportDialog() {
  const { t } = useTranslation();
  const media = useEditorStore((s) => s.media);
  const script = useEditorStore((s) => s.script);
  const setScript = useEditorStore((s) => s.setScript);
  const job = useEditorStore((s) => s.job);
  const engineReady = useEditorStore((s) => s.engineReady);
  const openDialog = useEditorStore((s) => s.openDialog);
  const commit = useProjectStore((s) => s.commit);
  const pickers = useFilePickers();
  const busy = job !== null;

  const engineStatus =
    engineReady === true
      ? t("import.engineReady")
      : engineReady === false
        ? t("import.engineMissing")
        : t("import.engineChecking");

  const continueEditing = () => {
    openDialog(null);
    if (!currentProject().blocks.length) commit(demo);
  };

  return (
    <DialogFrame label={t("import.dialogLabel")} title={t("import.title")}>
      <p>{t("import.intro")}</p>
      <button
        className="import-drop"
        disabled={busy}
        onClick={() => pickers.loadVideo()}
      >
        <Film size={22} />
        {media?.name ?? t("import.selectVideo")}
        <span>{t("import.formats")}</span>
      </button>
      <div className="script-label">
        <label htmlFor="script">{t("import.scriptLabel")}</label>
        <button onClick={pickers.importScript}>{t("import.importTxt")}</button>
      </div>
      <textarea
        id="script"
        placeholder={t("import.scriptPlaceholder")}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        disabled={busy}
      />
      <p className="help">
        {t("import.replacesBlocks")} {engineStatus}
      </p>
      <button
        className="primary full"
        disabled={busy || !media || engineReady !== true}
        onClick={() => void transcribe()}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Sparkles size={16} />
        )}{" "}
        {job?.stage ||
          (script.trim()
            ? t("import.alignScript")
            : t("import.transcribeAudio"))}
      </button>
      <button className="text-button" disabled={busy} onClick={continueEditing}>
        {t("import.continueEditing")}
      </button>
    </DialogFrame>
  );
}
