/**
 * Browser smoke test of the web build: demo project, language switch, word
 * editing, split/merge, undo, inspector, insertion, exports and persistence.
 *
 * Requires `npm run build` and a Playwright Chromium
 * (`npx playwright install chromium`). Set PLAYWRIGHT_EXECUTABLE to use
 * another Chromium binary.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { chromium } from "playwright";

const HOST = "127.0.0.1";

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error(`Server did not start: ${url}`);
}

const port = await freePort();
const server = spawn(
  "npx",
  ["vite", "preview", "--host", HOST, "--port", String(port), "--strictPort"],
  { stdio: "ignore" },
);
const url = `http://${HOST}:${port}/`;
const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};

try {
  await waitFor(url);
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const text = async () =>
    (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const blocks = () => page.locator(".text-block").count();
  const blur = () => page.evaluate(() => document.activeElement?.blur());

  check((await blocks()) === 4, "demo renders 4 blocks");
  check((await text()).includes("Guardado local"), "Spanish UI by default");
  await page.waitForTimeout(1500);
  check(
    /libass · Demo/.test(
      await page.locator(".preview-toolbar .preview-tag").last().innerText(),
    ),
    "libass renderer ready",
  );

  await page.selectOption(".language-switch", "en");
  check(
    (await text()).includes("Generate subtitles"),
    "English UI after switch",
  );
  check(
    (await page.evaluate(() => localStorage.getItem("subtle-locale"))) === "en",
    "locale persisted",
  );
  await page.selectOption(".language-switch", "es");

  const first = page
    .locator(".text-block")
    .first()
    .locator("[contenteditable]")
    .first();
  await first.click();
  await first.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.type("XYZ");
  await blur();
  check((await first.innerText()) === "LasXYZ", "word edit committed on blur");
  check(
    (await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("subtle-project")).blocks[0].words[0]
          .text,
    )) === "LasXYZ",
    "autosave to localStorage",
  );
  await page.keyboard.press("Meta+z");
  check((await first.innerText()) === "Las", "undo restores word");

  const third = page
    .locator(".text-block")
    .first()
    .locator("[contenteditable]")
    .nth(2);
  await third.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  check((await blocks()) === 5, "Enter splits the block");
  const newFirst = page
    .locator(".text-block")
    .nth(1)
    .locator("[contenteditable]")
    .first();
  await newFirst.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Backspace");
  check((await blocks()) === 4, "Backspace merges back");

  await blur();
  await page.locator(".text-block").nth(3).locator(".block-index").click();
  await blur();
  await page.keyboard.press("Delete");
  check((await blocks()) === 3, "Delete removes the selected block");
  await page.keyboard.press("Meta+z");
  check((await blocks()) === 4, "undo restores the block");

  await page.locator(".text-block").first().locator(".word").first().hover();
  await page
    .locator(".text-block")
    .first()
    .locator(".word-eye")
    .first()
    .click();
  check(
    (await text()).includes("1 palabras omitidas"),
    "footer counts omitted words",
  );

  await page.locator('input[aria-label="Tamaño"]').fill("80");
  check(
    (await page.evaluate(
      () => JSON.parse(localStorage.getItem("subtle-project")).style.size,
    )) === 80,
    "size change persisted",
  );
  await page.locator(".animations button").nth(2).click();
  check((await text()).includes("Una sola palabra"), "animation help updates");

  await page.locator(".insert-block").last().click();
  await page
    .locator('textarea[aria-label="Texto del nuevo bloque"]')
    .fill("nuevo bloque final");
  await page.locator('button[type="submit"]').click();
  check((await blocks()) === 5, "insert dialog adds a block");

  await page.locator(".insert-block").first().click();
  await page.locator('textarea[aria-label="Texto del nuevo bloque"]').fill("x");
  await page.locator('.modal input[type="number"]').nth(1).fill("1");
  await page.locator('button[type="submit"]').click();
  check(
    (await text()).includes("Ese intervalo ya tiene subtítulos"),
    "domain error translated",
  );
  await page.locator('.modal button[type="button"]').click();

  await page.locator("button.export").click();
  const [srt] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(".export-options button").nth(1).click(),
  ]);
  check(srt.suggestedFilename().endsWith(".srt"), "srt download");
  check(
    readFileSync(await srt.path(), "utf8").startsWith("1\n00:00:00,700 --> "),
    "srt content",
  );
  const [stl] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(".export-options button").nth(0).click(),
  ]);
  check(stl.suggestedFilename().endsWith(".stl"), "stl download");
  await page.locator(".modal-close").click();

  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  await page.keyboard.press("Space");
  const time = await page.locator(".current-time").innerText();
  check(!time.startsWith("00:00.70"), "space toggles demo playback");

  await page.locator(".transport button").last().click();
  check(
    (await page.locator(".preview-area.expanded").count()) === 1,
    "stage expands",
  );
  await page.keyboard.press("Escape");
  check(
    (await page.locator(".preview-area.expanded").count()) === 0,
    "Escape collapses",
  );

  await page.reload({ waitUntil: "networkidle" });
  check((await blocks()) === 5, "project persisted across reload");
  check(errors.length === 0, `no console errors ${errors.join(" | ")}`);
  await browser.close();
} finally {
  server.kill();
}
if (failures.length) {
  console.error(`${failures.length} failure(s)`);
  process.exit(1);
}
console.log("UI smoke test passed");
