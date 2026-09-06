//! Saving exported subtitle files and project copies through a save dialog.
use crate::i18n::{msg, msg_with, Msg};
use tauri_plugin_dialog::DialogExt;

const MAX_DOCUMENT_BYTES: usize = 10 * 1024 * 1024;
const DEFAULT_NAME: &str = "subtle.json";

#[tauri::command]
pub async fn save_document(
    app: tauri::AppHandle,
    name: String,
    data: Vec<u8>,
) -> Result<Option<String>, String> {
    if data.len() > MAX_DOCUMENT_BYTES {
        return Err(msg(Msg::DocumentTooLarge));
    }
    tauri::async_runtime::spawn_blocking(move || {
        let name = std::path::Path::new(&name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(DEFAULT_NAME);
        let Some(file) = app.dialog().file().set_file_name(name).blocking_save_file() else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|e| e.to_string())?;
        // The dialog confirms replacements; write through a temporary file so
        // an interrupted write never leaves a truncated document behind.
        let temp = path.with_extension(format!(
            "{}.pending",
            path.extension().and_then(|e| e.to_str()).unwrap_or("tmp")
        ));
        std::fs::write(&temp, &data)
            .and_then(|_| std::fs::rename(&temp, &path))
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp);
                msg_with(Msg::SaveFailed, e)
            })?;
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}
