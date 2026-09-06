import { validateProject } from "../domain/project";
import { useEditorStore } from "../state/editorStore";
import { currentProject, useProjectStore } from "../state/projectStore";
import { saveDocument } from "./exporting";

export const PROJECT_FILE_SUFFIX = ".subtle.json";

/** Exports the project as JSON without touching the autosaved session. */
export function saveProjectCopy(): Promise<void> {
  const project = currentProject();
  return saveDocument(
    JSON.stringify(project, null, 2),
    `${project.name}${PROJECT_FILE_SUFFIX}`,
  );
}

/** Loads a project JSON chosen by the user. Throws a domain error if invalid. */
export async function openProjectFile(file: File): Promise<void> {
  const project = validateProject(JSON.parse(await file.text()));
  useProjectStore.getState().commit(project);
}

/** Replaces the script textarea with the contents of a text file. */
export async function importScriptFile(file: File): Promise<void> {
  useEditorStore.getState().setScript(await file.text());
}
