import { create } from "zustand";
import {
  FALLBACK_FONTS,
  INITIAL_TIME,
  STORAGE_KEYS,
  TIMELINE_HEIGHT,
} from "../config/constants";
import type { Project } from "../domain/project";
import type { StlFrameRate } from "../domain/export";
import { useProjectStore } from "./projectStore";

/** The video currently loaded in the preview. */
export type Media = {
  url: string;
  name: string;
  duration: number;
  /** Dimensions of the original, used for export and ASS rendering. */
  width: number;
  height: number;
  /** True when the file was opened through the desktop shell. */
  native: boolean;
  /** True once a lightweight proxy replaced the original in the preview. */
  proxy?: boolean;
  waveform?: string;
  /** Dimensions of the file actually playing (proxy or original). */
  previewWidth?: number;
  previewHeight?: number;
};

export type Dialog = "import" | "export";
export type RendererStatus = "loading" | "ready" | "error";
export type Insertion = { text: string; start: number; end: number };
export type Job = { id: string; stage: string; progress: number | null };

export type EditorState = {
  selectedBlockId: string;
  selectedWordId: string;
  time: number;
  playing: boolean;
  media: Media | null;
  zoom: number;
  timelineHeight: number;
  fonts: string[];
  dialog: Dialog | null;
  script: string;
  job: Job | null;
  engineReady: boolean | null;
  rendererStatus: RendererStatus;
  /** True while the video stage fills the whole window. */
  stageExpanded: boolean;
  /** Transient project shown while dragging a caption, before committing. */
  dragPreview: Project | null;
  notice: string;
  query: string;
  insertion: Insertion | null;
  stlFps: StlFrameRate;

  selectBlock: (id: string) => void;
  selectWord: (id: string) => void;
  setTime: (time: number | ((time: number) => number)) => void;
  setPlaying: (playing: boolean) => void;
  setMedia: (
    media: Media | null | ((media: Media | null) => Media | null),
  ) => void;
  setZoom: (zoom: number) => void;
  setTimelineHeight: (height: number) => void;
  setFonts: (fonts: string[]) => void;
  openDialog: (dialog: Dialog | null) => void;
  setScript: (script: string) => void;
  setJob: (job: Job | null) => void;
  updateJob: (patch: Partial<Job>) => void;
  setEngineReady: (ready: boolean | null) => void;
  setRendererStatus: (status: RendererStatus) => void;
  setStageExpanded: (expanded: boolean) => void;
  setDragPreview: (preview: Project | null) => void;
  notify: (message: string) => void;
  dismissNotice: () => void;
  setQuery: (query: string) => void;
  setInsertion: (insertion: Insertion | null) => void;
  setStlFps: (fps: StlFrameRate) => void;
};

const clampHeight = (height: number) =>
  Math.round(
    Math.max(TIMELINE_HEIGHT.min, Math.min(TIMELINE_HEIGHT.max, height)),
  );

function storedTimelineHeight(): number {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEYS.timelineHeight));
    if (Number.isFinite(saved) && saved > 0) return clampHeight(saved);
  } catch {
    /* Storage unavailable: use the default. */
  }
  return TIMELINE_HEIGHT.default;
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedBlockId: useProjectStore.getState().project.blocks[0]?.id ?? "",
  selectedWordId: "",
  time: INITIAL_TIME,
  playing: false,
  media: null,
  zoom: 1,
  timelineHeight: storedTimelineHeight(),
  fonts: FALLBACK_FONTS,
  dialog: null,
  script: "",
  job: null,
  engineReady: null,
  rendererStatus: "loading",
  stageExpanded: false,
  dragPreview: null,
  notice: "",
  query: "",
  insertion: null,
  stlFps: 25,

  selectBlock: (selectedBlockId) => set({ selectedBlockId }),
  selectWord: (selectedWordId) => set({ selectedWordId }),
  setTime: (time) =>
    set((s) => ({ time: typeof time === "function" ? time(s.time) : time })),
  setPlaying: (playing) => set({ playing }),
  setMedia: (media) =>
    set((s) => ({
      media: typeof media === "function" ? media(s.media) : media,
    })),
  setZoom: (zoom) => set({ zoom }),
  setTimelineHeight: (height) => {
    const timelineHeight = clampHeight(height);
    try {
      localStorage.setItem(STORAGE_KEYS.timelineHeight, String(timelineHeight));
    } catch {
      /* Preference simply will not persist. */
    }
    set({ timelineHeight });
  },
  setFonts: (fonts) => set({ fonts }),
  openDialog: (dialog) => set({ dialog }),
  setScript: (script) => set({ script }),
  setJob: (job) => set({ job }),
  updateJob: (patch) =>
    set((s) => (s.job ? { job: { ...s.job, ...patch } } : s)),
  setEngineReady: (engineReady) => set({ engineReady }),
  setRendererStatus: (rendererStatus) => set({ rendererStatus }),
  setStageExpanded: (stageExpanded) => set({ stageExpanded }),
  setDragPreview: (dragPreview) => set({ dragPreview }),
  notify: (notice) => set({ notice }),
  dismissNotice: () => set({ notice: "" }),
  setQuery: (query) => set({ query }),
  setInsertion: (insertion) => set({ insertion }),
  setStlFps: (stlFps) => set({ stlFps }),
}));

/** Is any native job (transcription, proxy, export) running? */
export const isBusy = (state: EditorState): boolean => state.job !== null;
