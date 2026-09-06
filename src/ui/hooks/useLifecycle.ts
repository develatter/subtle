/**
 * Application-level effects: session recovery, native window close, the
 * demo clock, system fonts, native job events and locale synchronisation.
 */
import { useEffect } from "react";
import { DEMO_CLOCK_INTERVAL_MS } from "../../config/constants";
import { isJobRunning, subscribeToJobProgress } from "../../application/jobs";
import { restoreLinkedVideo } from "../../application/media";
import { checkSpeechEngine } from "../../application/transcription";
import { services } from "../../infrastructure/services";
import { useTranslation } from "../../i18n";
import { flushProject, useProjectStore } from "../../state";
import { useEditorStore } from "../../state/editorStore";
import { useDuration } from "./useEditor";

/** Re-probes the linked original whenever the project source changes. */
export function useLinkedVideo() {
  const hydrated = useProjectStore((s) => s.hydrated);
  const path = useProjectStore((s) => s.project.source?.path);
  useEffect(() => {
    if (!hydrated || !services.media) return;
    let alive = true;
    const editor = useEditorStore.getState();
    editor.setPlaying(false);
    editor.setMedia(null);
    editor.setTime(0);
    if (path) void restoreLinkedVideo(path, () => alive);
    return () => {
      alive = false;
    };
  }, [hydrated, path]);
}

/** Waits for pending saves before the desktop window closes. */
export function useWindowClose() {
  const { t } = useTranslation();
  useEffect(() => {
    const lifecycle = services.window;
    if (!lifecycle) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void lifecycle
      .onCloseRequested(async () => {
        const { notify } = useEditorStore.getState();
        if (isJobRunning()) {
          notify(t("notice.jobRunningOnClose"));
          return;
        }
        try {
          await flushProject();
          await lifecycle.destroy();
        } catch (error) {
          notify(t("notice.saveBeforeCloseFailed", { error: String(error) }));
        }
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [t]);
}

/** Advances the playhead when playing the demo without media. */
export function useDemoClock() {
  const playing = useEditorStore((s) => s.playing);
  const hasMedia = useEditorStore((s) => s.media !== null);
  const duration = useDuration();
  useEffect(() => {
    if (!playing || hasMedia) return;
    const { setTime, setPlaying } = useEditorStore.getState();
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      setTime((t) => {
        const next = t + (now - last) / 1000;
        if (next >= duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      last = now;
    }, DEMO_CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, hasMedia, duration]);
}

/** Releases object URLs created for local files in web mode. */
export function useObjectUrlCleanup() {
  const url = useEditorStore((s) => s.media?.url);
  useEffect(
    () => () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    },
    [url],
  );
}

/** Loads the system font catalogue on desktop. */
export function useSystemFonts() {
  useEffect(() => {
    if (!services.fonts) return;
    services.fonts
      .families()
      .then((families) => {
        if (families.length) useEditorStore.getState().setFonts(families);
      })
      .catch(() => {});
  }, []);
}

/** Subscribes to native job progress and checks the speech engine once. */
export function useNativeJobs() {
  useEffect(() => {
    if (!services.jobs) return;
    let alive = true;
    let dispose: (() => void) | undefined;
    subscribeToJobProgress().then((fn) => {
      if (alive) dispose = fn;
      else fn();
    });
    void checkSpeechEngine();
    return () => {
      alive = false;
      dispose?.();
    };
  }, []);
}

/** Keeps the selection on an existing block. */
export function useSelectionGuard() {
  const project = useProjectStore((s) => s.project);
  const selected = useEditorStore((s) => s.selectedBlockId);
  useEffect(() => {
    if (!project.blocks.some((b) => b.id === selected))
      useEditorStore.getState().selectBlock(project.blocks[0]?.id ?? "");
  }, [project, selected]);
}

/** Mirrors the locale into the document and the native side. */
export function useLocaleEffects() {
  const { locale, t } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("app.title");
    services.locale?.set(locale).catch(() => {});
  }, [locale, t]);
}
