import test from "node:test";
import assert from "node:assert/strict";
import {
  bounds,
  defaultStyle,
  fromWords,
  mergeBlock,
  moveBlock,
  retimeBlock,
  splitBlock,
  toAss,
  toSrt,
  validateProject,
} from "../src/domain/index.ts";
const sample = () =>
  fromWords(
    "uno dos Google cuatro cinco seis"
      .split(" ")
      .map((word, i) => ({ word, start: i, end: i + 0.8 })),
    "Prueba",
  );
test("split and merge preserve every identity and timestamp, including omitted words", () => {
  const p = sample();
  p.blocks[0].words[2].hidden = true;
  const words = structuredClone(p.blocks[0].words);
  const s = splitBlock(p, p.blocks[0].id, 3);
  assert.equal(s.blocks.length, 2);
  assert.deepEqual(
    s.blocks.flatMap((b) => b.words),
    words,
  );
  const m = mergeBlock(s, s.blocks[1].id);
  assert.equal(m.blocks.length, 1);
  assert.deepEqual(m.blocks[0].words, words);
});
test("merging an omitted block does not reveal its words or hide its neighbour", () => {
  let p = sample();
  p = splitBlock(p, p.blocks[0].id, 3);
  p.blocks[1].hidden = true;
  const merged = mergeBlock(p, p.blocks[1].id);
  assert.deepEqual(
    merged.blocks[0].words.map((w) => w.hidden),
    [false, false, false, true, true, true],
  );
  assert.equal(merged.blocks[0].hidden, false);
});
test("split copies local style and merge uses first style", () => {
  let p = sample();
  p.blocks[0].override = { ...defaultStyle, color: "#ff0000" };
  p = splitBlock(p, p.blocks[0].id, 3);
  assert.deepEqual(p.blocks[0].override, p.blocks[1].override);
  p.blocks[1].override = { ...defaultStyle, color: "#00ff00" };
  assert.equal(
    mergeBlock(p, p.blocks[1].id).blocks[0].override?.color,
    "#ff0000",
  );
});
test("omission keeps later word timing and export excludes only omitted text", () => {
  const p = sample();
  p.blocks[0].words[2].hidden = true;
  assert.match(toSrt(p), /00:00:00,000 --> 00:00:05,800/);
  assert.doesNotMatch(toSrt(p), /Google/);
  p.style.animation = "word";
  const ass = toAss(p);
  assert.doesNotMatch(ass, /Google/);
  assert.match(ass, /0:00:03.00,0:00:03.80/);
});
test("moving a block clamps against neighbours and start of media", () => {
  let p = sample();
  p = splitBlock(p, p.blocks[0].id, 3);
  const m = moveBlock(p, p.blocks[1].id, -10, 6);
  assert.equal(bounds(m.blocks[1])[0], bounds(p.blocks[0])[1]);
  assert.deepEqual(m.blocks[0], p.blocks[0]);
  assert.equal(bounds(moveBlock(p, p.blocks[0].id, -10, 6).blocks[0])[0], 0);
});
test("retiming rejects overlap and preserves proportional word positions", () => {
  const p = sample();
  const retimed = retimeBlock(p, p.blocks[0].id, 1, 12.6, 20);
  assert.equal(retimed.blocks[0].words[1].start, 3);
  assert.throws(() => retimeBlock(p, p.blocks[0].id, -1, 3, 20));
});
test("project import rejects invalid timestamps and unsafe styles", () => {
  const p = sample();
  assert.deepEqual(validateProject(p), p);
  p.blocks[0].words[1].start = -2;
  assert.throws(() => validateProject(p));
  const q = sample();
  q.style.color = "invalid";
  assert.throws(() => validateProject(q));
});
test("ASS escapes override injection and progressive reserves future text", () => {
  const p = sample();
  p.blocks[0].words[0].text = "{\\pos(0,0)}";
  const ass = toAss(p);
  assert.doesNotMatch(ass, /\{\\pos\(0,0\)\}/);
  assert.match(ass, /\\alpha&HFF&.*dos/);
});
import { toStl } from "../src/domain/index.ts";
test("STL writes GSI and binary TTI with Spanish diacritics and stable timing", () => {
  const p = sample();
  p.blocks[0].words[0].text = "sí";
  p.blocks[0].words[2].hidden = true;
  const bytes = toStl(p);
  assert.equal(bytes.length, 1152);
  assert.equal(new TextDecoder().decode(bytes.slice(3, 11)), "STL25.01");
  assert.equal(bytes[1027], 255);
  assert.deepEqual([...bytes.slice(1033, 1037)], [0, 0, 5, 20]);
  assert.ok([...bytes.slice(1040)].includes(0xc2));
  assert.doesNotMatch(new TextDecoder().decode(bytes), /Google/);
});
import { retimeWord } from "../src/domain/index.ts";
test("uncertain words survive segmentation and manual timing clears only their review flag", () => {
  const p = fromWords(
    [
      { word: "uno", start: 0, end: 0.3, review: true },
      { word: "dos", start: 0.5, end: 1, review: true },
    ],
    "test",
  );
  assert.equal(p.blocks[0].words[0].review, true);
  const changed = retimeWord(p, p.blocks[0].words[0].id, 0.1, 0.4, 2);
  assert.equal(changed.blocks[0].words[0].review, false);
  assert.equal(changed.blocks[0].words[1].review, true);
  assert.throws(() => retimeWord(p, p.blocks[0].words[0].id, 0.1, 0.8, 2));
});
