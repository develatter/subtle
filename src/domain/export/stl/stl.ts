import { bounds, DomainError, type Block, type Project } from "../../project";
import { exportableBlocks } from "../srt";
import { encodeLatin } from "./latin";

// EBU Tech 3264: open subtitles, Latin ISO 6937, non-cumulative, 25/30 fps.
// https://tech.ebu.ch/docs/tech/tech3264.pdf

export type StlFrameRate = 25 | 30;
export const STL_FRAME_RATES: readonly StlFrameRate[] = [25, 30];

const GSI_SIZE = 1024;
const TTI_SIZE = 128;
const TTI_TEXT_OFFSET = 16;
const TTI_TEXT_CAPACITY = TTI_SIZE - TTI_TEXT_OFFSET;
const MAX_ROW_LENGTH = 42;
const MAX_ROWS = 2;
const MAX_BLOCKS = 65535;
const SECONDS_PER_DAY = 86400;
const FILLER = 0x8f;
const SPACE = 0x20;

type Timecode = [
  hours: number,
  minutes: number,
  seconds: number,
  frames: number,
];

const timecode = (seconds: number, fps: StlFrameRate): Timecode => {
  const frames = Math.round(seconds * fps);
  if (frames < 0 || frames >= SECONDS_PER_DAY * fps)
    throw new DomainError("stl.timeOutOfRange");
  return [
    Math.floor(frames / (3600 * fps)),
    Math.floor(frames / (60 * fps)) % 60,
    Math.floor(frames / fps) % 60,
    frames % fps,
  ];
};

/** Splits a block's visible words into at most two 42-character rows. */
function layoutRows(block: Block): string[] {
  const words = block.words
    .filter((w) => !w.hidden)
    .map((w) => w.text)
    .join(" ")
    .split(/\s+/);
  const rows = [""];
  for (const word of words) {
    if (word.length > MAX_ROW_LENGTH) throw new DomainError("stl.wordTooLong");
    const current = rows[rows.length - 1];
    if (current.length + word.length + 1 > MAX_ROW_LENGTH) rows.push(word);
    else rows[rows.length - 1] = current + (current ? " " : "") + word;
  }
  if (rows.length > MAX_ROWS) throw new DomainError("stl.tooManyRows");
  return rows;
}

/** Title for the GSI block: ASCII only, 32 characters. */
const asciiTitle = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?")
    .slice(0, 32);

function writeGsi(
  target: Uint8Array,
  project: Project,
  blocks: Block[],
  fps: StlFrameRate,
) {
  target.fill(SPACE, 0, GSI_SIZE);
  const put = (offset: number, text: string) =>
    target.set(
      Array.from(text, (c) => c.charCodeAt(0)),
      offset,
    );
  const count = String(blocks.length).padStart(5, "0");
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  put(0, "850"); // Code page number
  put(3, `STL${fps}.01`); // Disk format code
  put(11, "0000A"); // Display standard, character code table, language (Spanish)
  put(16, asciiTitle(project.name));
  put(224, date); // Creation date
  put(230, date); // Revision date
  put(236, "00"); // Revision number
  put(238, count); // Total number of TTI blocks
  put(243, count); // Total number of subtitles
  put(248, "001"); // Total number of subtitle groups
  put(251, String(MAX_ROW_LENGTH)); // Maximum characters per row
  put(253, "23"); // Maximum rows
  put(255, "1"); // Time code status
  put(256, "00000000"); // Start of programme
  put(
    264,
    timecode(blocks[0] ? bounds(blocks[0])[0] : 0, fps)
      .map((n) => String(n).padStart(2, "0"))
      .join(""),
  ); // First in cue
  put(272, "11ESP"); // Disks, disk sequence, country
  put(277, "Subtle"); // Publisher
}

function writeTti(
  target: Uint8Array,
  index: number,
  block: Block,
  fps: StlFrameRate,
) {
  const text = encodeLatin(layoutRows(block).join("\n"));
  if (text.length > TTI_TEXT_CAPACITY)
    throw new DomainError("stl.blockTooLong");
  const [start, end] = bounds(block);
  if (Math.round(start * fps) >= Math.round(end * fps))
    throw new DomainError("stl.blockTooShort");
  const offset = GSI_SIZE + index * TTI_SIZE;
  const view = new DataView(target.buffer);
  target[offset] = 0; // Subtitle group number
  view.setUint16(offset + 1, index, true); // Subtitle number
  target[offset + 3] = 255; // Extension block number: last block
  target[offset + 4] = 0; // Cumulative status: not cumulative
  target.set(timecode(start, fps), offset + 5);
  target.set(timecode(end, fps), offset + 9);
  target[offset + 13] = 20; // Vertical position
  target[offset + 14] = 2; // Justification: centred
  target[offset + 15] = 0; // Comment flag
  target.fill(FILLER, offset + TTI_TEXT_OFFSET, offset + TTI_SIZE);
  target.set(text, offset + TTI_TEXT_OFFSET);
}

/** Binary EBU STL file with a GSI header and one TTI block per subtitle. */
export function toStl(project: Project, fps: StlFrameRate = 25): Uint8Array {
  const blocks = exportableBlocks(project);
  if (blocks.length > MAX_BLOCKS) throw new DomainError("stl.tooManyBlocks");
  const result = new Uint8Array(GSI_SIZE + blocks.length * TTI_SIZE);
  writeGsi(result, project, blocks, fps);
  blocks.forEach((block, i) => writeTti(result, i, block, fps));
  return result;
}
