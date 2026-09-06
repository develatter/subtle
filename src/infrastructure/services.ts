/**
 * Composition of the ports for the current platform. Desktop-only
 * capabilities are `null` on the web so callers can degrade explicitly.
 */
import type {
  DocumentSaver,
  FontCatalog,
  JobMonitor,
  LocaleSync,
  MediaGateway,
  SessionRepository,
  SpeechEngine,
  WindowLifecycle,
} from "../application/ports";
import { browserDocumentSaver } from "./browser/documentSaver";
import { isDesktop } from "./platform";
import {
  tauriDocumentSaver,
  tauriFontCatalog,
  tauriJobMonitor,
  tauriLocaleSync,
  tauriMediaGateway,
  tauriSessionRepository,
  tauriSpeechEngine,
  tauriWindowLifecycle,
} from "./tauri/services";

export type Services = {
  media: MediaGateway | null;
  speech: SpeechEngine | null;
  fonts: FontCatalog | null;
  documents: DocumentSaver;
  session: SessionRepository | null;
  jobs: JobMonitor | null;
  window: WindowLifecycle | null;
  locale: LocaleSync | null;
};

const desktop = isDesktop();

export const services: Services = desktop
  ? {
      media: tauriMediaGateway,
      speech: tauriSpeechEngine,
      fonts: tauriFontCatalog,
      documents: tauriDocumentSaver,
      session: tauriSessionRepository,
      jobs: tauriJobMonitor,
      window: tauriWindowLifecycle,
      locale: tauriLocaleSync,
    }
  : {
      media: null,
      speech: null,
      fonts: null,
      documents: browserDocumentSaver,
      session: null,
      jobs: null,
      window: null,
      locale: null,
    };
