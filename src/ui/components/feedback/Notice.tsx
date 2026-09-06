import { X } from "lucide-react";
import { useTranslation } from "../../../i18n";
import { useEditorStore } from "../../../state/editorStore";

/** Transient message at the bottom of the window. */
export function Notice() {
  const { t } = useTranslation();
  const notice = useEditorStore((s) => s.notice);
  const dismiss = useEditorStore((s) => s.dismissNotice);
  if (!notice) return null;
  return (
    <div className="notice" role="status">
      <span>{notice}</span>
      <button aria-label={t("notice.close")} onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
