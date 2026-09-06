import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { fromWords, toAss } from "../src/domain/index.ts";
const dir = mkdtempSync(join(tmpdir(), "subtle-variants-"));
const bundled = new URL("../src-tauri/runtime/media/bin/", import.meta.url)
  .pathname;
const ff = (args) =>
  execFileSync(bundled + "ffmpeg", ["-v", "error", "-nostdin", ...args], {
    cwd: dir,
  });
const probe = (file, type, entries) =>
  JSON.parse(
    execFileSync(bundled + "ffprobe", [
      "-v",
      "error",
      "-select_streams",
      type,
      "-show_packets",
      "-show_entries",
      entries,
      "-of",
      "json",
      join(dir, file),
    ]),
  );
const args = JSON.parse(
  readFileSync(
    new URL("../src-tauri/export-args.json", import.meta.url),
    "utf8",
  ),
);
writeFileSync(
  join(dir, "subtitles.ass"),
  toAss(
    fromWords([{ word: "Prueba", start: 0.2, end: 1.5 }], "Prueba"),
    360,
    640,
  ),
);
for (const variant of ["fractional", "delayed-audio", "vfr"]) {
  const source = variant + ".mp4",
    output = variant + "-export.mp4";
  ff([
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=360x640:rate=${variant === "fractional" ? "30000/1001" : "30"}:duration=2`,
    ...(variant === "delayed-audio" ? ["-itsoffset", "0.2"] : []),
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100:duration=2",
    ...(variant === "vfr"
      ? ["-vf", "select=not(eq(mod(n\\,5)\\,0))", "-fps_mode", "vfr"]
      : []),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    source,
  ]);
  ff(["-noautorotate", "-i", source, ...args, output]);
  const frameTimes = (file) =>
    JSON.parse(
      execFileSync(bundled + "ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_frames",
        "-show_entries",
        "frame=best_effort_timestamp_time",
        "-of",
        "json",
        join(dir, file),
      ]),
    ).frames.map((f) => f.best_effort_timestamp_time);
  assert.deepEqual(
    frameTimes(output),
    frameTimes(source),
    variant + " video timestamps",
  );
  assert.deepEqual(
    probe(output, "a:0", "packet=pts_time,duration_time,side_data_list"),
    probe(source, "a:0", "packet=pts_time,duration_time,side_data_list"),
    variant + " audio timestamps",
  );
  console.log("PASS:", variant);
}
console.log("Fixtures:", dir);
