//! Local transcription and script alignment through the Python worker
//! (`scripts/transcribe.py`), bundled as `subtle-speech` in release builds.
use crate::i18n::{current, msg, Msg};
use crate::jobs;
use crate::media::Media;
use crate::process::{binary, resource, run, scratch_dir};
use serde_json::Value;
use std::{path::PathBuf, process::Command};
use tauri::{Manager, State};

const WORKER_SOURCE: &str = include_str!("../../scripts/transcribe.py");
const BUNDLED_WORKER: &str = "subtle-speech/subtle-speech";

/// Python interpreter for development: `SUBTLE_PYTHON`, the project venv, or the system one.
fn speech_python() -> String {
    if let Ok(path) = std::env::var("SUBTLE_PYTHON") {
        return path;
    }
    if cfg!(debug_assertions) {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.venv/bin/python");
        if path.exists() {
            return path.to_string_lossy().into_owned();
        }
    }
    binary("python3")
}

/// Whisper model directory: bundled, the project `.models` in debug, or the app cache.
fn models_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = resource("models") {
        return Ok(path);
    }
    if cfg!(debug_assertions) {
        return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.models"));
    }
    Ok(app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("models"))
}

/// Makes the FFmpeg directory visible to the worker through `PATH`.
fn with_ffmpeg_path(cmd: &mut Command) {
    let ffmpeg = binary("ffmpeg");
    if let Some(parent) = std::path::Path::new(&ffmpeg).parent() {
        let mut paths = vec![parent.to_path_buf()];
        paths.extend(std::env::split_paths(
            &std::env::var_os("PATH").unwrap_or_default(),
        ));
        if let Ok(path) = std::env::join_paths(paths) {
            cmd.env("PATH", path);
        }
    }
}

#[tauri::command]
pub async fn speech_status() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let c = if let Some(worker) = resource(BUNDLED_WORKER) {
            let mut c = Command::new(worker);
            c.arg("--check");
            c
        } else {
            let mut c = Command::new(speech_python());
            c.args(["-c", "import stable_whisper, torch"]);
            c
        };
        Ok(run(c).is_ok())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn speech(
    app: tauri::AppHandle,
    media: State<'_, Media>,
    script: String,
    id: String,
) -> Result<Value, String> {
    let input = media.require()?;
    let ticket = jobs::begin(&app, id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let work = scratch_dir(&app, "speech")?;
        let worker = work.join("transcribe.py");
        std::fs::write(&worker, WORKER_SOURCE).map_err(|e| e.to_string())?;
        let script_path = work.join("script.txt");
        std::fs::write(&script_path, &script).map_err(|e| e.to_string())?;
        let models = models_dir(&app)?;
        let mut cmd = if let Some(bundled) = resource(BUNDLED_WORKER) {
            Command::new(bundled)
        } else {
            let mut c = Command::new(speech_python());
            c.arg(worker);
            c
        };
        cmd.arg(input)
            .arg(if script.trim().is_empty() {
                String::new()
            } else {
                script_path.to_string_lossy().into_owned()
            })
            .arg(models)
            .env("SUBTLE_LOCALE", current().code());
        with_ffmpeg_path(&mut cmd);
        ticket.emit(&msg(Msg::PreparingSpeechEngine), None);
        let result = ticket.run(cmd);
        let _ = std::fs::remove_dir_all(&work);
        serde_json::from_slice(&result?).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
