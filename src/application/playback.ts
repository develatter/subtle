/**
 * Transport control. Owns the reference to the `<video>` element so any
 * component or use case can seek without threading refs around.
 */
import { useEditorStore } from "../state/editorStore";
import { currentProject } from "../state/projectStore";
import { durationOf } from "../state/selectors";
import { translate } from "../i18n";

let video: HTMLVideoElement | null = null;
/** True while the user drags the playhead; frame callbacks are ignored. */
let scrubbing = false;

export const playback = {
  attach(element: HTMLVideoElement | null) {
    video = element;
  },
  element: () => video,
  isScrubbing: () => scrubbing,
  setScrubbing(value: boolean) {
    scrubbing = value;
  },
  duration(): number {
    return durationOf(useEditorStore.getState().media, currentProject());
  },
  seek(time: number) {
    const clamped = Math.max(0, Math.min(playback.duration(), time));
    useEditorStore.getState().setTime(clamped);
    if (video) video.currentTime = clamped;
  },
  pause() {
    video?.pause();
    useEditorStore.getState().setPlaying(false);
  },
  /** Resumes after scrubbing; a refused play simply leaves the player paused. */
  resume() {
    const { setPlaying } = useEditorStore.getState();
    if (video) void video.play().catch(() => setPlaying(false));
    else setPlaying(true);
  },
  toggle() {
    const { media, playing, setPlaying, notify } = useEditorStore.getState();
    if (media && video) {
      if (playing) video.pause();
      else video.play().catch(() => notify(translate("preview.unplayable")));
    } else setPlaying(!playing);
  },
};
