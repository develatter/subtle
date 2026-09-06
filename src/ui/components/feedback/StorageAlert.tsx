import { useTranslation, type Translator } from "../../../i18n";
import { useProjectStore, type StorageIssue } from "../../../state";

export function describeStorageIssue(issue: StorageIssue, t: Translator) {
  switch (issue.kind) {
    case "autosaveFailed":
      return t("storage.autosaveFailed");
    case "diskWriteFailed":
      return t("storage.diskWriteFailed", { error: issue.detail });
    case "backupRestored":
      return t("storage.backupRestored");
    case "diskUnreadable":
      return t("storage.diskUnreadable");
    case "recoveryFailed":
      return t("storage.recoveryFailed", { error: issue.detail });
  }
}

/** Persistent alert about autosave or recovery problems. */
export function StorageAlert() {
  const { t } = useTranslation();
  const issue = useProjectStore((s) => s.storageIssue);
  if (!issue) return null;
  return (
    <div className="storage-alert" role="alert">
      {describeStorageIssue(issue, t)}
    </div>
  );
}
