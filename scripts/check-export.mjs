import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { fromWords, toAss } from "../src/domain/index.ts";
const dir = mkdtempSync(join(tmpdir(), "subtle-export-"));
const ff = (args) =>
  execFileSync("ffmpeg", ["-v", "error", "-nostdin", ...args], { cwd: dir });
const probe = (file) =>
  JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_streams",
        "-show_frames",
        "-select_streams",
        "v:0",
        "-of",
        "json",
        join(dir, file),
      ],
      { maxBuffer: 10_000_000 },
    ),
  );
ff([
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=360x640:rate=30:duration=3",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=440:sample_rate=48000:duration=3",
  "-c:v",
  "libx264",
  "-crf",
  "12",
  "-pix_fmt",
  "yuv420p",
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-colorspace",
  "bt709",
  "-color_range",
  "tv",
  "-c:a",
  "aac",
  "source.mp4",
]);
const p = fromWords(
  [
    { word: "Cada", start: 0.2, end: 0.7 },
    { word: "palabra", start: 0.8, end: 1.4 },
    { word: "cuenta", start: 1.6, end: 2.5 },
  ],
  "Test",
);
writeFileSync(join(dir, "subtitles.ass"), toAss(p, 360, 640));
ff([
  "-n",
  "-noautorotate",
  "-i",
  "source.mp4",
  ...JSON.parse(
    readFileSync(
      new URL("../src-tauri/export-args.json", import.meta.url),
      "utf8",
    ),
  ),
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-colorspace",
  "bt709",
  "-color_range",
  "tv",
  "output.mp4",
]);
const a = probe("source.mp4"),
  b = probe("output.mp4");
for (const k of [
  "width",
  "height",
  "pix_fmt",
  "color_range",
  "color_space",
  "color_transfer",
  "color_primaries",
  "r_frame_rate",
])
  assert.equal(b.streams[0][k], a.streams[0][k], k);
assert.deepEqual(
  b.frames.map((f) => f.best_effort_timestamp_time),
  a.frames.map((f) => f.best_effort_timestamp_time),
);
const audio = (file) =>
  ff([
    "-i",
    file,
    "-map",
    "0:a:0",
    "-c",
    "copy",
    "-f",
    "hash",
    "-hash",
    "sha256",
    "-",
  ]).toString();
assert.equal(audio("source.mp4"), audio("output.mp4"));
console.log(
  JSON.stringify({
    result: "PASS",
    frames: a.frames.length,
    audio: "identical packet payload hash",
    color: "tags preserved",
    size: "360x640",
    directory: dir,
  }),
);

const packets = (file) =>
  JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_packets",
      "-show_entries",
      "packet=pts_time,duration_time,side_data_list",
      "-of",
      "json",
      join(dir, file),
    ]),
  ).packets;
assert.deepEqual(
  packets("source.mp4"),
  packets("output.mp4"),
  "audio timing / decoder priming changed",
);
const stats = ff([
  "-i",
  "output.mp4",
  "-frames:v",
  "1",
  "-vf",
  "scale=1:1",
  "-pix_fmt",
  "rgb24",
  "-f",
  "rawvideo",
  "-",
]);
assert.ok(
  [...stats].some((x) => x > 25),
  "first exported frame is black",
);
console.log(
  "PASS: first frame contains picture; audio timestamps and priming preserved",
);

// Sources without an edit list whose first frame has a positive composition
// offset (Android/WhatsApp recordings). Apple players show their first frame
// at 0, so the export shifts the video to match; see `video_filter` in
// src-tauri/src/process.rs, whose decision rule is mirrored here.
const withoutEditList = (from, to) => {
  const bytes = readFileSync(join(dir, from));
  for (let i = 4; i + 4 <= bytes.length; i++)
    if (bytes.toString("latin1", i, i + 4) === "elst")
      bytes.write("skip", i, "latin1");
  writeFileSync(join(dir, to), bytes);
};
withoutEditList("source.mp4", "noelst.mp4");
const videoStart = (file, ignoreEditList) =>
  Number(
    JSON.parse(
      execFileSync("ffprobe", [
        "-v",
        "error",
        ...(ignoreEditList ? ["-ignore_editlist", "1"] : []),
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=start_time",
        "-of",
        "json",
        join(dir, file),
      ]),
    ).streams[0].start_time,
  );
const rawStart = videoStart("noelst.mp4", true);
assert.ok(
  rawStart > 0.001,
  "fixture should start after 0 without an edit list",
);
assert.equal(
  videoStart("noelst.mp4", false),
  rawStart,
  "no edit list in effect",
);
const exportArgs = JSON.parse(
  readFileSync(
    new URL("../src-tauri/export-args.json", import.meta.url),
    "utf8",
  ),
);
exportArgs[exportArgs.indexOf("-vf") + 1] =
  "setpts=PTS-STARTPTS," + exportArgs[exportArgs.indexOf("-vf") + 1];
ff([
  "-n",
  "-noautorotate",
  "-i",
  "noelst.mp4",
  ...exportArgs,
  "noelst-export.mp4",
]);
const shifted = probe("noelst-export.mp4");
assert.equal(videoStart("noelst-export.mp4", false), 0, "video starts at 0");
const rawTimes = JSON.parse(
  execFileSync("ffprobe", [
    "-v",
    "error",
    "-ignore_editlist",
    "1",
    "-show_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "frame=best_effort_timestamp_time",
    "-of",
    "json",
    join(dir, "noelst.mp4"),
  ]),
).frames.map((f) => Number(f.best_effort_timestamp_time));
assert.deepEqual(
  shifted.frames.map((f) => Number(f.best_effort_timestamp_time).toFixed(4)),
  rawTimes.map((t) => (t - rawStart).toFixed(4)),
  "frame intervals preserved after the constant shift",
);
assert.deepEqual(
  packets("noelst.mp4"),
  packets("noelst-export.mp4"),
  "audio untouched when shifting video",
);
console.log(
  `PASS: source without edit list shifted by ${rawStart.toFixed(4)}s, no black lead-in`,
);
