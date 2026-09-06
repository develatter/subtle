/**
 * Native jobs (transcription, proxy, export) run one at a time. Each job has
 * an id so progress events can be matched and the job can be cancelled.
 */
import { uid } from "../domain/project";
import { services } from "../infrastructure/services";
import { translate } from "../i18n";
import { useEditorStore } from "../state/editorStore";

/** Registers a job and returns its id. */
export function beginJob(stage: string): string {
  const id = uid();
  useEditorStore.getState().setJob({ id, stage, progress: null });
  return id;
}

export function endJob() {
  useEditorStore.getState().setJob(null);
}

export async function cancelJob() {
  const { job, updateJob, notify } = useEditorStore.getState();
  if (!job || !services.jobs) return;
  updateJob({ stage: translate("job.cancelling") });
  await services.jobs.cancel(job.id).catch((error) => notify(String(error)));
}

/** Forwards progress events for the running job to the store. */
export function subscribeToJobProgress(): Promise<() => void> {
  if (!services.jobs) return Promise.resolve(() => {});
  return services.jobs.onProgress((event) => {
    const { job, updateJob } = useEditorStore.getState();
    if (job && event.id === job.id)
      updateJob({ stage: event.stage, progress: event.progress });
  });
}

export const isJobRunning = (): boolean =>
  useEditorStore.getState().job !== null;
