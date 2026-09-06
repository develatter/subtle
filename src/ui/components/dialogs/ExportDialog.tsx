import {
  ArrowDownToLine,
  FileText,
  LoaderCircle,
  Subtitles,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { describeError } from "../../../application/errors";
import {
  exportVideo,
  renderSubtitles,
  saveDocument,
  type SubtitleFormat,
} from "../../../application/exporting";
import { STL_FRAME_RATES, type StlFrameRate } from "../../../domain/export";
import { useTranslation, type MessageKey } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";
import { currentProject } from "../../../state/projectStore";
import { DialogFrame } from "./DialogFrame";

/** Subtitle file formats and the burnt-in video export. */
export function ExportDialog() {
  const { t } = useTranslation();
  const media = useEditorStore((s) => s.media);
  const job = useEditorStore((s) => s.job);
  const stlFps = useEditorStore((s) => s.stlFps);
  const setStlFps = useEditorStore((s) => s.setStlFps);
  const notify = useEditorStore((s) => s.notify);
  const busy = job !== null;

  const exportSubtitles = (format: SubtitleFormat) => {
    const project = currentProject();
    try {
      const content = renderSubtitles(project, format, {
        stlFps,
        width: media?.width,
        height: media?.height,
      });
      void saveDocument(content, `${project.name}.${format}`);
    } catch (error) {
      notify(describeError(error, t));
    }
  };

  const options: {
    format: SubtitleFormat;
    icon: ReactNode;
    title: MessageKey;
    hint: string;
  }[] = [
    {
      format: "stl",
      icon: <FileText />,
      title: "export.stl",
      hint: t("export.stlHint", { fps: stlFps }),
    },
    {
      format: "srt",
      icon: <FileText />,
      title: "export.srt",
      hint: t("export.srtHint"),
    },
    {
      format: "ass",
      icon: <Subtitles />,
      title: "export.ass",
      hint: t("export.assHint"),
    },
  ];

  return (
    <DialogFrame label={t("export.dialogLabel")} title={t("export.title")}>
      <p>{t("export.intro")}</p>
      <label className="stl-rate">
        {t("export.stlRate")}{" "}
        <select
          value={stlFps}
          onChange={(e) => setStlFps(Number(e.target.value) as StlFrameRate)}
        >
          {STL_FRAME_RATES.map((fps) => (
            <option key={fps} value={fps}>
              {t("export.fps", { fps })}
            </option>
          ))}
        </select>
      </label>
      <div className="export-options">
        {options.map(({ format, icon, title, hint }) => (
          <button
            key={format}
            disabled={busy}
            onClick={() => exportSubtitles(format)}
          >
            {icon}
            <span>
              <strong>{t(title)}</strong>
              <small>{hint}</small>
            </span>
            <ArrowDownToLine size={18} />
          </button>
        ))}
      </div>
      <p className="help">{t("export.videoHelp")}</p>
      <button
        className="primary full"
        disabled={busy || !media?.native}
        onClick={() => void exportVideo()}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Upload size={16} />
        )}{" "}
        {job?.stage || t("export.video")}
      </button>
      {!media?.native && <p className="help">{t("export.needsDesktop")}</p>}
    </DialogFrame>
  );
}
