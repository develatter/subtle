import { useEffect } from "react";
import { deleteBlock } from "../../domain/project";
import { playback } from "../../application/playback";
import { useEditorStore } from "../../state/editorStore";
import { currentProject, useProjectStore } from "../../state/projectStore";

const isTyping = (target: EventTarget | null) =>
  !!(target as HTMLElement | null)?.closest(
    "input,textarea,[contenteditable=true]",
  );

/**
 * Global shortcuts: ⌘/Ctrl+Z undo (Shift to redo), Backspace/Delete removes
 * the selected block, Space toggles playback, Escape leaves the expanded
 * preview. Text fields keep their keys.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);
      const editor = useEditorStore.getState();
      const { undo, redo, commit } = useProjectStore.getState();
      const overlayOpen = editor.dialog !== null || editor.insertion !== null;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (
        !typing &&
        !overlayOpen &&
        editor.job === null &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (e.key === "Backspace" || e.key === "Delete")
      ) {
        e.preventDefault();
        if (!e.repeat && editor.selectedBlockId)
          commit(deleteBlock(currentProject(), editor.selectedBlockId));
      } else if (e.key === "Escape" && editor.stageExpanded) {
        e.preventDefault();
        editor.setStageExpanded(false);
      } else if (e.code === "Space" && !typing && !overlayOpen) {
        e.preventDefault();
        playback.toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
