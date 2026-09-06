import { STORAGE_KEYS } from "../../config/constants";
import type { Project } from "../../domain/project";

/**
 * Browser copy of the project. It is the only persistence in web mode and the
 * migration source for desktop sessions saved by older versions.
 */
export const browserProjectStorage = {
  read(): string | null {
    return localStorage.getItem(STORAGE_KEYS.project);
  },
  /** Returns false when the browser refused to store the project. */
  write(project: Project): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.project, JSON.stringify(project));
      return true;
    } catch {
      return false;
    }
  },
};
