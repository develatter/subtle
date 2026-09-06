/**
 * Store bootstrap. Importing this module wires persistence once, so any
 * consumer (UI or tests) gets a durable project store.
 */
import { services } from "../infrastructure/services";
import { startProjectPersistence } from "./projectPersistence";

export { useProjectStore, currentProject } from "./projectStore";
export type { ProjectState, StorageIssue } from "./projectStore";

const persistence = startProjectPersistence(services.session);

/** Waits for hydration and pending writes; rejects if the last write failed. */
export const flushProject = (): Promise<void> => persistence.flush();
