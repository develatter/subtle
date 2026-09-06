/**
 * Keeps the project store durable: a browser copy on every change and, on
 * desktop, an atomic write to the session file. On desktop start-up the disk
 * session (or its backup) supersedes the browser copy.
 */
import { validateProject, type Project } from "../domain/project";
import type { SessionCandidate, SessionRepository } from "../application/ports";
import { browserProjectStorage } from "../infrastructure/browser/projectStorage";
import { useProjectStore, type StorageIssue } from "./projectStore";

type Persistence = {
  flush: () => Promise<void>;
};

function recover(candidates: SessionCandidate[]): {
  project?: Project;
  issue: StorageIssue | null;
} {
  for (const candidate of candidates) {
    try {
      if (!candidate.project) continue;
      const project = validateProject(candidate.project);
      return {
        project,
        issue: candidate.backup ? { kind: "backupRestored" } : null,
      };
    } catch {
      /* Try the backup, then the legacy browser copy. */
    }
  }
  return {
    issue: candidates.length ? { kind: "diskUnreadable" } : null,
  };
}

export function startProjectPersistence(
  repository: SessionRepository | null,
): Persistence {
  const store = useProjectStore;
  let writes = Promise.resolve();
  let hydration = Promise.resolve();
  let writeError: string | null = null;
  let revision = 0;

  const saveNative = (project: Project) => {
    if (!repository) return;
    writes = writes.then(async () => {
      try {
        await repository.save(project);
        writeError = null;
        store.setState({ storageIssue: null });
      } catch (error) {
        writeError = String(error);
        store.setState({
          storageIssue: { kind: "diskWriteFailed", detail: String(error) },
        });
      }
    });
  };

  store.subscribe((state, previous) => {
    if (state.project === previous.project) return;
    revision++;
    const stored = browserProjectStorage.write(state.project);
    if (!stored && !repository)
      store.setState({ storageIssue: { kind: "autosaveFailed" } });
    if (repository && state.hydrated) saveNative(state.project);
  });

  if (repository) {
    const initialRevision = revision;
    hydration = repository
      .load()
      .then((candidates) => {
        const { project, issue } = recover(candidates);
        const untouched = initialRevision === revision;
        if (project && untouched)
          store.setState({ project, past: [], future: [] });
        store.setState({ hydrated: true, storageIssue: issue });
        // Migrate legacy storage only when there is no disk project to recover.
        if (!candidates.length || !untouched)
          saveNative(store.getState().project);
      })
      .catch((error) =>
        store.setState({
          hydrated: true,
          storageIssue: { kind: "recoveryFailed", detail: String(error) },
        }),
      );
  }

  return {
    async flush() {
      await hydration;
      await writes;
      if (writeError) throw Error(writeError);
    },
  };
}
