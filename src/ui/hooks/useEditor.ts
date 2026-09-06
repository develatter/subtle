import { useShallow } from "zustand/react/shallow";
import {
  effectiveStyle,
  findBlock,
  type Block,
  type Style,
  type Word,
} from "../../domain/project";
import { useEditorStore } from "../../state/editorStore";
import { useProjectStore } from "../../state/projectStore";
import { durationOf } from "../../state/selectors";

export const useProject = () => useProjectStore((s) => s.project);

/** Timeline length for the current media or project. */
export function useDuration(): number {
  const media = useEditorStore((s) => s.media);
  return durationOf(media, useProject());
}

/** The selected block, its effective style and the selected word. */
export function useSelection(): {
  block: Block | undefined;
  style: Style;
  word: Word | undefined;
} {
  const project = useProject();
  const { selectedBlockId, selectedWordId } = useEditorStore(
    useShallow((s) => ({
      selectedBlockId: s.selectedBlockId,
      selectedWordId: s.selectedWordId,
    })),
  );
  const block = findBlock(project, selectedBlockId);
  return {
    block,
    style: effectiveStyle(project, block),
    word: block?.words.find((w) => w.id === selectedWordId),
  };
}

export const useIsBusy = () => useEditorStore((s) => s.job !== null);
