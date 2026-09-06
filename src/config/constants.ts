import { version } from "../../package.json";

/** Application version shown in the footer, taken from package.json. */
export const APP_VERSION: string = version;

export const STORAGE_KEYS = {
  /** Browser copy of the project; also the migration source for older versions. */
  project: "subtle-project",
  locale: "subtle-locale",
} as const;

/** Undo history depth kept in memory per session. */
export const HISTORY_LIMIT = 100;

/** Fonts offered when the system catalogue is unavailable (web mode). */
export const FALLBACK_FONTS = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Courier New",
];

/** Assets copied by scripts/prepare-renderer.mjs into public/libass. */
export const LIBASS_ASSETS = {
  workerUrl: "/libass/subtitles-octopus-worker.js",
  legacyWorkerUrl: "/libass/subtitles-octopus-worker-legacy.js",
  fallbackFont: "/libass/fallback.woff2",
  targetFps: 60,
} as const;

/** Keyboard step for the playhead: one frame at 30 fps, or one second with Shift. */
export const PLAYHEAD_STEP = { frame: 1 / 30, second: 1 } as const;

/** Timeline zoom range. */
export const TIMELINE_ZOOM = { min: 1, max: 5, step: 0.25 } as const;

/** Seconds between ruler marks on the timeline. */
export const RULER_INTERVAL_SECONDS = 2;

/** Tick interval for the demo clock when no media is loaded. */
export const DEMO_CLOCK_INTERVAL_MS = 30;

/** Initial playhead position, aligned with the first demo word. */
export const INITIAL_TIME = 0.7;

/** Caption position limits while dragging on the preview (percent). */
export const CAPTION_DRAG_LIMITS = { min: 5, max: 95 } as const;

/** Seconds of lead-in when jumping to a word. */
export const WORD_LEAD_IN = 0.3;
