import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, delimiter, join } from "node:path";
const python = resolve(".venv/bin/python");
const env = {
  ...process.env,
  PATH: [join(homedir(), ".cargo/bin"), process.env.PATH].join(delimiter),
};
if (!env.SUBTLE_PYTHON && existsSync(python)) env.SUBTLE_PYTHON = python;
const args = process.argv.slice(2);
const child = spawn(
  resolve("node_modules/.bin/tauri"),
  args.length ? args : ["dev"],
  { stdio: "inherit", env },
);
child.on("error", (e) => {
  console.error(e.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
