import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { renameProject } from "../../../application/editing";
import { useTranslation } from "../../../i18n";
import { useProject } from "../../hooks/useEditor";

/** Project title in the top bar; click to rename it inline. */
export function ProjectName() {
  const { t } = useTranslation();
  const name = useProject().name;
  const [editing, setEditing] = useState(false);

  if (editing)
    return (
      <input
        className="project-name-input"
        aria-label={t("topbar.projectName")}
        autoFocus
        defaultValue={name}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          renameProject(e.currentTarget.value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = name;
            e.currentTarget.blur();
          }
        }}
      />
    );

  return (
    <button
      className="project-name"
      title={t("topbar.renameProject")}
      onClick={() => setEditing(true)}
    >
      {name}
      <ChevronDown size={13} />
    </button>
  );
}
