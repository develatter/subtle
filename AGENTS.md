# Subtle · guide for agents and contributors

Local subtitle editor for vertical videos. Desktop app with Tauri 2 (Rust), React 19 + TypeScript interface, Python transcription worker (stable-ts/Whisper), FFmpeg/ffprobe and libass (native for export, WASM for the preview).

## Commands

```sh
npm run desktop            # desktop app in development (detects .venv and .models)
npm run dev                # web interface only at http://127.0.0.1:1420
npm test                   # domain and persistence tests (node:test)
npm run test:ui            # Playwright smoke test of the interface
npm run build              # tsc + vite
npm run check:export       # real export with FFmpeg
npm run format             # prettier
cargo clippy --manifest-path src-tauri/Cargo.toml   # no warnings
cargo test --manifest-path src-tauri/Cargo.toml
python3 scripts/check-speech.py                     # from scripts/
```

Before calling something done: `npm test`, `npm run build`, clippy and `cargo test` green, and Prettier applied.

## Architecture (frontend)

Dependencies only point inwards: `ui → application → domain`.

| Layer          | Path                      | Rule                                                                                         |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| Domain         | `src/domain/`             | Pure. No React, Tauri, DOM or interface text. Errors are `DomainError` with a code.          |
| Application    | `src/application/`        | Use cases and ports (`ports.ts`). Talks to the environment only through the ports.           |
| Infrastructure | `src/infrastructure/`     | Port implementations. `tauri/commands.ts` is the only place that knows native command names. |
| State          | `src/state/`              | Zustand stores: project (with history and persistence) and interface.                        |
| UI             | `src/ui/`                 | Components per panel, hooks, styles per area in `ui/styles/`.                                |
| i18n           | `src/i18n/`               | `es.ts` defines the keys; `en.ts` must have the same ones.                                   |
| Config         | `src/config/constants.ts` | Limits, storage keys, asset paths. Nothing magic in components.                              |

Rust backend in `src-tauri/src/`, one module per capability (`media`, `preview`, `export`, `speech`, `fonts`, `documents`, `persistence`, `jobs`, `process`, `i18n`). A new command is registered in `main.rs` and mirrored in `commands.ts` and the ports.

## Rules

- **Do not break the project format** (`version: 1`), native command names or the worker protocol (`@subtle` on stderr, JSON on stdout) without updating validation, tests and the README.
- **No interface text outside i18n.** Frontend: `t("key")`, or `translate()` outside React. Rust: `Msg` in `i18n.rs`. Python: `MESSAGES` in `transcribe.py`. Add the key in both languages.
- **Word timings are sacred.** Editing, hiding or splitting never shifts neighbouring words. Every new domain operation needs a test in `tests/`.
- **Export:** the original's timestamps are preserved; the only documented exception is the `video_filter` shift for originals without an edit list. Changes to `export-args.json` go through `npm run check:export` and `check-export-variants.mjs`.
- **Nothing blocks the UI:** native work goes through `jobs::Ticket` with progress and cancellation, one job at a time.
- **Persistence:** temporary write + rename, validated backup. Never write user files without going through a dialog.
- **Style:** default Prettier, strict TypeScript, no `any`, no comments that repeat the code; comment the why. Rust with `cargo fmt` and clean clippy. Everything in English except the translated interface texts.
- **Commits:** only when asked. Imperative mood, one-line summary.
