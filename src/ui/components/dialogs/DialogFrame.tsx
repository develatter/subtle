import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cancelJob } from "../../../application/jobs";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";

type Props = {
  label: string;
  title: string;
  children: ReactNode;
};

/** Modal chrome shared by the import and export dialogs, with job status. */
export function DialogFrame({ label, title, children }: Props) {
  const { t } = useTranslation();
  const job = useEditorStore((s) => s.job);
  const openDialog = useEditorStore((s) => s.openDialog);
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <button
          className="modal-close"
          disabled={job !== null}
          aria-label={t("dialog.close")}
          onClick={() => openDialog(null)}
        >
          <X size={18} />
        </button>
        {job && (
          <div className="job-status" role="status">
            <span>{job.stage}</span>
            <progress
              aria-label={t("job.progress")}
              value={job.progress ?? undefined}
              max="100"
            />
            <button onClick={() => void cancelJob()}>{t("job.cancel")}</button>
          </div>
        )}
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}
