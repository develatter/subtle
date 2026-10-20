import test from "node:test";
import assert from "node:assert/strict";
import { fromWords, type Project } from "../src/domain/index.ts";

test("native recovery supersedes legacy storage and reports failed durable writes", async () => {
  const backup = fromWords(
    [{ word: "Recuperado", start: 0, end: 1 }],
    "Valid backup",
  );
  backup.source = { path: "/tmp/original.mp4" };
  const saved: Project[] = [];
  const storage = new Map<string, string>();
  storage.set(
    "subtle-project",
    JSON.stringify({ ...backup, name: "Copia antigua" }),
  );
  let fail = false;
  Object.assign(globalThis, {
    isTauri: true,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    window: {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: { project: Project }) => {
          if (command === "load_session")
            return [{ error: "corrupt" }, { project: backup, backup: true }];
          if (command === "save_session") {
            if (fail) throw Error("Disk full");
            saved.push(args.project);
            return;
          }
          throw Error(command);
        },
      },
    },
  });
  const { useProjectStore: useProject, flushProject } =
    await import("../src/state/index.ts");
  await flushProject();
  assert.equal(useProject.getState().project.name, "Valid backup");
  assert.deepEqual(useProject.getState().project.source, backup.source);
  fail = true;
  useProject.getState().commit({ ...backup, name: "Pending edit" });
  await assert.rejects(flushProject(), /Disk full/);
  assert.match(useProject.getState().storageIssue?.detail ?? "", /Disk full/);
  assert.equal(useProject.getState().project.name, "Pending edit");
  fail = false;
  useProject.getState().commit({ ...backup, name: "Saved edit" });
  await flushProject();
  assert.equal(saved.at(-1)?.name, "Saved edit");
  assert.equal(useProject.getState().storageIssue, null);
});
