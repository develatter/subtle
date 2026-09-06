import { mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
mkdirSync("public/libass", { recursive: true });
for (const name of [
  "subtitles-octopus-worker.js",
  "subtitles-octopus-worker-legacy.js",
  "subtitles-octopus-worker.wasm",
  "COPYRIGHT",
])
  copyFileSync(
    resolve("node_modules/libass-wasm/dist/js", name),
    resolve("public/libass", name),
  );

copyFileSync(
  resolve(
    "node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2",
  ),
  resolve("public/libass/fallback.woff2"),
);
copyFileSync(
  resolve("node_modules/@fontsource/noto-sans/LICENSE"),
  resolve("public/libass/FONT-LICENSE"),
);
