import { fromWords } from "./segmentation";
import type { Project } from "./types";

/** Text and name of the demo project shown before importing a video. */
export const DEMO_TEXT =
  "Great ideas deserve to be heard. Make every word count. Less time editing. More time creating.";
export const DEMO_NAME = "A little inspiration";
const DEMO_FIRST_WORD = 0.7;
const DEMO_WORD_STEP = 0.6;
const DEMO_WORD_LENGTH = 0.53;

export const createDemoProject = (): Project =>
  fromWords(
    DEMO_TEXT.split(" ").map((word, i) => ({
      word,
      start: DEMO_FIRST_WORD + i * DEMO_WORD_STEP,
      end: DEMO_FIRST_WORD + DEMO_WORD_LENGTH + i * DEMO_WORD_STEP,
    })),
    DEMO_NAME,
  );

/** Shared demo instance so the store and the UI reference the same object. */
export const demo: Project = createDemoProject();
