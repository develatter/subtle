import type {
  DocumentSaver,
  FontCatalog,
  JobMonitor,
  LocaleSync,
  MediaGateway,
  SessionRepository,
  SpeechEngine,
  WindowLifecycle,
} from "../../application/ports";
import { assetUrl, commands, events, window } from "./commands";

export const tauriMediaGateway: MediaGateway = {
  pickVideo: commands.selectVideo,
  restoreVideo: commands.restoreVideo,
  waveform: commands.waveform,
  preparePreview: commands.preparePreview,
  exportVideo: commands.exportVideo,
  assetUrl,
};

export const tauriSpeechEngine: SpeechEngine = {
  isReady: commands.speechStatus,
  transcribe: commands.speech,
};

export const tauriFontCatalog: FontCatalog = {
  families: commands.systemFonts,
  files: async (families) => (await commands.fontFiles(families)).map(assetUrl),
};

export const tauriDocumentSaver: DocumentSaver = {
  save: (name, data) => commands.saveDocument(name, Array.from(data)),
};

export const tauriSessionRepository: SessionRepository = {
  load: commands.loadSession,
  save: commands.saveSession,
};

export const tauriJobMonitor: JobMonitor = {
  cancel: commands.cancelJob,
  onProgress: events.onJobProgress,
};

export const tauriWindowLifecycle: WindowLifecycle = window;

export const tauriLocaleSync: LocaleSync = { set: commands.setLocale };
