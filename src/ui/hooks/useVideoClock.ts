import { useEffect, type RefObject } from "react";
import { playback } from "../../application/playback";
import { useEditorStore } from "../../state/editorStore";

/**
 * Follows the video's presentation time frame by frame, preferring
 * `requestVideoFrameCallback` and falling back to animation frames.
 */
export function useVideoClock(
  video: RefObject<HTMLVideoElement | null>,
  mediaUrl: string | undefined,
) {
  useEffect(() => {
    const node = video.current;
    if (!node || !mediaUrl) return;
    const { setTime } = useEditorStore.getState();
    let id = 0;
    if (node.requestVideoFrameCallback) {
      const frame = (_: number, metadata: VideoFrameCallbackMetadata) => {
        if (!playback.isScrubbing()) setTime(metadata.mediaTime);
        id = node.requestVideoFrameCallback(frame);
      };
      id = node.requestVideoFrameCallback(frame);
      return () => node.cancelVideoFrameCallback(id);
    }
    const frame = () => {
      if (!node.paused) setTime(node.currentTime);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [video, mediaUrl]);
}
