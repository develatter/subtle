/**
 * The single place that knows native command names and their payloads.
 * Keep this in sync with `src-tauri/src/main.rs`.
 */
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Project, TranscribedWord } from "../../domain/project";
import type {
  JobProgress,
  PreviewResult,
  ProbedVideo,
  SessionCandidate,
} from "../../application/ports";

export const commands = {
  selectVideo: () => invoke<ProbedVideo | null>("select_video"),
  restoreVideo: (path: string) =>
    invoke<ProbedVideo>("restore_video", { path }),
  waveform: () => invoke<string | null>("waveform"),
  preparePreview: (id: string) =>
    invoke<PreviewResult>("prepare_preview", { id }),
  exportVideo: (ass: string, id: string, name: string) =>
    invoke<string | null>("export_video", { ass, id, name }),
  saveDocument: (name: string, data: number[]) =>
    invoke<string | null>("save_document", { name, data }),
  speechStatus: () => invoke<boolean>("speech_status"),
  speech: (script: string, id: string) =>
    invoke<TranscribedWord[]>("speech", { script, id }),
  cancelJob: (id: string) => invoke<void>("cancel_job", { id }),
  systemFonts: () => invoke<string[]>("system_fonts"),
  fontFiles: (families: string[]) =>
    invoke<string[]>("font_files", { families }),
  loadSession: () => invoke<SessionCandidate[]>("load_session"),
  saveSession: (project: Project) => invoke<void>("save_session", { project }),
  setLocale: (locale: string) => invoke<void>("set_locale", { locale }),
};

export const events = {
  onJobProgress: (listener: (event: JobProgress) => void) =>
    listen<JobProgress>("job-progress", ({ payload }) => listener(payload)),
};

export const assetUrl = (path: string): string => convertFileSrc(path);

export const window = {
  onCloseRequested: (handler: () => Promise<void>) =>
    getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      await handler();
    }),
  destroy: () => getCurrentWindow().destroy(),
};
