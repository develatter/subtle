/**
 * Ports: capabilities the editor needs from its environment. The desktop
 * build implements them with Tauri commands; the web build provides
 * browser-only fallbacks where possible.
 */
import type { Project, TranscribedWord } from "../domain/project";

export type ProbeStream = {
  codec_type: string;
  width: number;
  height: number;
};

export type ProbedVideo = {
  path: string;
  info: {
    streams: ProbeStream[];
    format: { duration: string };
  };
};

export type PreviewResult = { path: string; waveform: string | null };

export type JobProgress = {
  id: string;
  stage: string;
  progress: number | null;
};

export type SessionCandidate = {
  project?: unknown;
  backup?: boolean;
  error?: string;
};

export interface MediaGateway {
  /** Opens a native picker and probes the chosen file. */
  pickVideo(): Promise<ProbedVideo | null>;
  /** Re-probes a previously linked file. */
  restoreVideo(path: string): Promise<ProbedVideo>;
  /** Draws the waveform of the loaded video; null when it has no audio. */
  waveform(): Promise<string | null>;
  /** Encodes a lightweight proxy and a waveform image for the loaded video. */
  preparePreview(jobId: string): Promise<PreviewResult>;
  /**
   * Burns the given ASS track into the original, suggesting `fileName` in the
   * save dialog. Resolves to the output path.
   */
  exportVideo(
    ass: string,
    jobId: string,
    fileName: string,
  ): Promise<string | null>;
  /** URL the embedded browser can load for a local file. */
  assetUrl(path: string): string;
}

export interface SpeechEngine {
  isReady(): Promise<boolean>;
  transcribe(script: string, jobId: string): Promise<TranscribedWord[]>;
}

export interface FontCatalog {
  families(): Promise<string[]>;
  /** Font file URLs for the given families, for the WASM renderer. */
  files(families: string[]): Promise<string[]>;
}

export interface DocumentSaver {
  /** Saves bytes under a suggested name. Resolves to the path when known. */
  save(name: string, data: Uint8Array): Promise<string | null>;
}

export interface SessionRepository {
  load(): Promise<SessionCandidate[]>;
  save(project: Project): Promise<void>;
}

export interface JobMonitor {
  cancel(id: string): Promise<void>;
  onProgress(listener: (event: JobProgress) => void): Promise<() => void>;
}

export interface WindowLifecycle {
  /** Registers a close handler. The handler decides whether to `destroy()`. */
  onCloseRequested(handler: () => Promise<void>): Promise<() => void>;
  destroy(): Promise<void>;
}

export interface LocaleSync {
  /** Tells the native side which language to use for its messages. */
  set(locale: string): Promise<void>;
}
