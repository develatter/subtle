import { fromWords, validateProject } from "../domain/project";
import { services } from "../infrastructure/services";
import { translate } from "../i18n";
import { useEditorStore } from "../state/editorStore";
import { currentProject, useProjectStore } from "../state/projectStore";
import { stripExtension } from "../state/selectors";
import { beginJob, endJob } from "./jobs";
import { playback } from "./playback";

/**
 * Transcribes the loaded original, or aligns the given script with it, and
 * replaces the current blocks. The previous project stays in the undo history.
 */
export async function transcribe(): Promise<void> {
  const editor = useEditorStore.getState();
  const { media, script } = editor;
  if (!media?.native || !services.speech) {
    editor.notify(translate("notice.transcriptionNeedsDesktop"));
    return;
  }
  const aligning = script.trim().length > 0;
  const id = beginJob(
    translate(aligning ? "job.aligningScript" : "job.transcribing"),
  );
  try {
    const words = await services.speech.transcribe(script, id);
    if (!words.length) throw Error(translate("notice.noWords"));
    const next = fromWords(words, stripExtension(media.name));
    next.source = currentProject().source;
    validateProject(next);
    useProjectStore.getState().commit(next);
    editor.selectBlock(next.blocks[0].id);
    playback.seek(0);
    editor.openDialog(null);
    editor.notify(
      translate("notice.subtitlesGenerated", {
        count: words.filter((w) => w.review).length,
      }),
    );
  } catch (error) {
    editor.notify(String(error));
  } finally {
    endJob();
  }
}

/** Checks whether the local speech engine can run. */
export async function checkSpeechEngine(): Promise<void> {
  if (!services.speech) return;
  const { setEngineReady } = useEditorStore.getState();
  await services.speech
    .isReady()
    .then(setEngineReady)
    .catch(() => setEngineReady(false));
}
