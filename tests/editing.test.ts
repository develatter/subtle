import test from "node:test";
import assert from "node:assert/strict";
import {
  fromWords,
  editWord,
  deleteBlock,
  insertBlock,
  validateProject,
  toAss,
} from "../src/domain/index.ts";
const sample = () =>
  fromWords(
    [
      { word: "han", start: 0, end: 0.2 },
      { word: "lanzado", start: 0.2, end: 1 },
      { word: "hoy", start: 2, end: 3 },
    ],
    "Prueba",
  );
test("deleting a word leaves all neighbouring identities and timestamps unchanged", () => {
  const p = sample();
  const next = editWord(p, p.blocks[0].words[0].id, "");
  assert.deepEqual(next.blocks[0].words, p.blocks[0].words.slice(1));
  assert.equal(validateProject(next), next);
  assert.equal(deleteBlock(next, next.blocks[0].id).blocks.length, 1);
});
test("extra words receive separate identities and local approximate timings", () => {
  const p = sample(),
    word = p.blocks[0].words[1];
  const next = editWord(p, word.id, "lanzan respectivamente");
  const ws = next.blocks[0].words;
  assert.equal(ws.length, 3);
  assert.equal(ws[1].start, word.start);
  assert.equal(ws[2].end, word.end);
  assert.equal(ws[1].end, ws[2].start);
  assert.notEqual(ws[1].id, ws[2].id);
  assert.ok(ws[1].review && ws[2].review);
  assert.deepEqual(next.blocks[1], p.blocks[1]);
  next.style.animation = "word";
  assert.ok(!toAss(next).includes("lanzan respectivamente"));
  validateProject(next);
});
test("manual insertion fills a gap without moving neighbours and supports an empty project", () => {
  const p = sample();
  const next = insertBlock(p, "nuevo texto", 1, 2, 4);
  assert.equal(next.blocks.length, 3);
  assert.deepEqual(next.blocks[0], p.blocks[0]);
  assert.deepEqual(next.blocks[2], p.blocks[1]);
  assert.equal(next.blocks[1].words.length, 2);
  validateProject(next);
  assert.throws(() => insertBlock(p, "solapado", 0.5, 2, 4));
  assert.equal(
    insertBlock({ ...p, blocks: [] }, "solo", 0, 1, 4).blocks.length,
    1,
  );
});
test("width is shared with ASS export, overrides are independent and old projects load", () => {
  const p = sample();
  delete p.style.width;
  validateProject(p);
  p.style.width = 50;
  assert.match(toAss(p), /Default,,270,270,0,,/);
  p.blocks[0].override = { ...p.style, width: 80 };
  assert.match(toAss(p), /Default,,108,108,0,,/);
  p.style.width = 0;
  assert.throws(() => validateProject(p));
});
test("legacy multiword tokens are repaired on load without shifting subsequent words", () => {
  const p = sample();
  p.blocks[0].words[1].text = "lanzan respectivamente";
  const next = validateProject(p);
  assert.equal(next.blocks[0].words.length, 3);
  assert.deepEqual(next.blocks[1], p.blocks[1]);
});
import { clampWordsToDuration } from "../src/domain/index.ts";
test("transcribed words are cut at the media end and flagged, never extended", () => {
  const words = clampWordsToDuration(
    [
      { word: "a", start: 0, end: 1 },
      { word: "b", start: 1, end: 2.5 },
      { word: "c", start: 2.6, end: 3 },
    ],
    2.2,
  );
  assert.deepEqual(words, [
    { word: "a", start: 0, end: 1 },
    { word: "b", start: 1, end: 2.2, review: true },
  ]);
  assert.equal(clampWordsToDuration(words, 0).length, 2);
});
