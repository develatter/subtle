//! The original video linked to the project: selection and re-linking.
use crate::i18n::{msg, Msg};
use crate::process::{has_stream, probe};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

/// Path of the currently loaded original, shared by export and speech jobs.
pub struct Media(pub Mutex<Option<PathBuf>>);

impl Media {
    pub fn new() -> Self {
        Media(Mutex::new(None))
    }
    pub fn set(&self, path: Option<PathBuf>) -> Result<(), String> {
        *self.0.lock().map_err(|e| e.to_string())? = path;
        Ok(())
    }
    /// The loaded original, or an error asking the user to import one.
    pub fn require(&self) -> Result<PathBuf, String> {
        self.0
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or_else(|| msg(Msg::ImportVideoFirst))
    }
}

pub const VIDEO_EXTENSIONS: [&str; 5] = ["mp4", "mov", "mkv", "webm", "m4v"];

#[tauri::command]
pub async fn select_video(
    app: tauri::AppHandle,
    media: State<'_, Media>,
) -> Result<Option<Value>, String> {
    let a = app.clone();
    let result = tauri::async_runtime::spawn_blocking(
        move || -> Result<Option<(PathBuf, Value)>, String> {
            let Some(file) = a
                .dialog()
                .file()
                .add_filter(msg(Msg::VideoFilter), &VIDEO_EXTENSIONS)
                .blocking_pick_file()
            else {
                return Ok(None);
            };
            let path = file.into_path().map_err(|e| e.to_string())?;
            let info = probe(&path)?;
            a.asset_protocol_scope()
                .allow_file(&path)
                .map_err(|e| e.to_string())?;
            Ok(Some((path, info)))
        },
    )
    .await
    .map_err(|e| e.to_string())??;
    match result {
        Some((path, info)) => {
            media.set(Some(path.clone()))?;
            Ok(Some(json!({"path": path, "info": info})))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn restore_video(
    app: tauri::AppHandle,
    media: State<'_, Media>,
    path: String,
) -> Result<Value, String> {
    media.set(None)?;
    let input = PathBuf::from(path);
    let (input, info) = tauri::async_runtime::spawn_blocking(move || -> Result<_, String> {
        if !input.is_absolute() || !input.is_file() {
            return Err(msg(Msg::VideoNotFound));
        }
        let info = probe(&input)?;
        if !has_stream(&info, "video") {
            return Err(msg(Msg::NoVideoStream));
        }
        Ok((input, info))
    })
    .await
    .map_err(|e| e.to_string())??;
    app.asset_protocol_scope()
        .allow_file(&input)
        .map_err(|e| e.to_string())?;
    media.set(Some(input.clone()))?;
    Ok(json!({"path": input, "info": info}))
}
