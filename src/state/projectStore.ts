import { create } from "zustand";
import { HISTORY_LIMIT } from "../config/constants";
import { demo, validateProject, type Project } from "../domain/project";
import { browserProjectStorage } from "../infrastructure/browser/projectStorage";
import { isDesktop } from "../infrastructure/platform";

/** Persistence problems reported to the user; translated by the UI. */
export type StorageIssue =
  | { kind: "autosaveFailed" }
  | { kind: "diskWriteFailed"; detail: string }
  | { kind: "backupRestored" }
  | { kind: "diskUnreadable" }
  | { kind: "recoveryFailed"; detail: string };

export type ProjectState = {
  /** False until the desktop session has been read from disk. */
  hydrated: boolean;
  storageIssue: StorageIssue | null;
  project: Project;
  past: Project[];
  future: Project[];
  /** Records a new revision. Identical references are ignored. */
  commit: (project: Project) => void;
  undo: () => void;
  redo: () => void;
};

function restoreFromBrowser(): Project {
  try {
    const saved = browserProjectStorage.read();
    return saved ? validateProject(JSON.parse(saved)) : demo;
  } catch {
    return demo;
  }
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: restoreFromBrowser(),
  hydrated: !isDesktop(),
  storageIssue: null,
  past: [],
  future: [],
  commit: (project) =>
    set((s) =>
      project === s.project
        ? s
        : {
            project,
            past: [...s.past.slice(-(HISTORY_LIMIT - 1)), s.project],
            future: [],
          },
    ),
  undo: () =>
    set((s) =>
      !s.past.length
        ? s
        : {
            project: s.past.at(-1)!,
            past: s.past.slice(0, -1),
            future: [s.project, ...s.future],
          },
    ),
  redo: () =>
    set((s) =>
      !s.future.length
        ? s
        : {
            project: s.future[0],
            past: [...s.past, s.project],
            future: s.future.slice(1),
          },
    ),
}));

/** Latest project, for handlers that must not read a stale render. */
export const currentProject = (): Project => useProjectStore.getState().project;
