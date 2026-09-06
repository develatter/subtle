//! Durable session storage: atomic writes, a validated backup and recovery.
use crate::i18n::{msg, Msg};
use serde_json::{json, Value};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::Path,
    sync::Mutex,
};
use tauri::Manager;
/// Serialises session writes and reads.
static LOCK: Mutex<()> = Mutex::new(());
const MAX_PROJECT_BYTES: usize = 10_000_000;
const SESSION_FILE: &str = "session.json";
const BACKUP_FILE: &str = "session.backup.json";
/// Mirrors the frontend style validation so a corrupt file is never adopted.
fn style_ok(s: &Value) -> bool {
    let color = s["color"].as_str().unwrap_or("");
    s["font"].as_str().is_some_and(|v| v.len() < 200)
        && color.len() == 7
        && color.starts_with('#')
        && color[1..].chars().all(|c| c.is_ascii_hexdigit())
        && matches!(
            s["animation"].as_str(),
            Some("normal" | "progressive" | "word")
        )
        && [
            ("size", 12., 160.),
            ("opacity", 0., 100.),
            ("outline", 0., 12.),
            ("shadow", 0., 20.),
            ("x", 0., 100.),
            ("y", 0., 100.),
        ]
        .iter()
        .all(|(key, a, b)| s[key].as_f64().is_some_and(|v| v >= *a && v <= *b))
        && (s.get("width").is_none()
            || s["width"]
                .as_f64()
                .is_some_and(|v| (10. ..=100.).contains(&v)))
}
/// Parses and validates a serialised project.
fn valid(data: &[u8]) -> Result<Value, String> {
    if data.len() > MAX_PROJECT_BYTES {
        return Err(msg(Msg::ProjectTooLarge));
    }
    let value: Value = serde_json::from_slice(data).map_err(|e| e.to_string())?;
    if value["version"] != 1
        || !value["name"].is_string()
        || !value["blocks"].is_array()
        || !style_ok(&value["style"])
    {
        return Err(msg(Msg::InvalidProject));
    }
    if let Some(source) = value.get("source") {
        if !source["path"]
            .as_str()
            .is_some_and(|p| p.starts_with('/') && !p.contains('\0'))
        {
            return Err(msg(Msg::InvalidVideoPath));
        }
    }
    let mut ids = std::collections::HashSet::new();
    let mut last = 0.;
    for block in value["blocks"].as_array().unwrap() {
        let id = block["id"]
            .as_str()
            .ok_or_else(|| msg(Msg::InvalidBlockId))?;
        if !ids.insert(id)
            || !block["hidden"].is_boolean()
            || block.get("override").is_some_and(|s| !style_ok(s))
        {
            return Err(msg(Msg::InvalidBlock));
        }
        let words = block["words"]
            .as_array()
            .ok_or_else(|| msg(Msg::InvalidWords))?;
        if words.is_empty() {
            return Err(msg(Msg::EmptyBlock));
        }
        for word in words {
            let id = word["id"].as_str().ok_or_else(|| msg(Msg::InvalidWordId))?;
            let start = word["start"]
                .as_f64()
                .ok_or_else(|| msg(Msg::InvalidStart))?;
            let end = word["end"].as_f64().ok_or_else(|| msg(Msg::InvalidEnd))?;
            if !ids.insert(id)
                || !word["text"].is_string()
                || !word["hidden"].is_boolean()
                || word.get("review").is_some_and(|r| !r.is_boolean())
                || start < last - 0.001
                || end <= start
            {
                return Err(msg(Msg::InvalidWordsOrTimes));
            }
            last = end;
        }
    }
    Ok(value)
}
/// Writes through a temporary file, syncs it and renames it into place.
fn write_atomic(path: &Path, data: &[u8]) -> Result<(), String> {
    let temp = path.with_extension("pending");
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&temp)
        .map_err(|e| e.to_string())?;
    file.write_all(data)
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())?;
    fs::rename(&temp, path).map_err(|e| e.to_string())?;
    File::open(path.parent().ok_or_else(|| msg(Msg::InvalidPath))?)
        .and_then(|d| d.sync_all())
        .map_err(|e| e.to_string())
}
/// Saves the project, keeping the previous valid revision as backup.
fn save(dir: &Path, data: &Value) -> Result<(), String> {
    let bytes = serde_json::to_vec(data).map_err(|e| e.to_string())?;
    valid(&bytes)?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = dir.join(SESSION_FILE);
    if let Ok(previous) = fs::read(&path) {
        if valid(&previous).is_ok() {
            write_atomic(&dir.join(BACKUP_FILE), &previous)?;
        }
    }
    write_atomic(&path, &bytes)
}
#[tauri::command]
pub async fn save_session(app: tauri::AppHandle, project: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = LOCK.lock().map_err(|e| e.to_string())?;
        save(&dir, &project)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn load_session(app: tauri::AppHandle) -> Result<Value, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = LOCK.lock().map_err(|e| e.to_string())?;
        let mut candidates = Vec::new();
        for name in [SESSION_FILE, BACKUP_FILE] {
            let path = dir.join(name);
            if !path.exists() {
                continue;
            }
            match fs::read(path)
                .map_err(|e| e.to_string())
                .and_then(|data| valid(&data))
            {
                Ok(project) => {
                    candidates.push(json!({"project": project, "backup": name.contains("backup")}))
                }
                Err(error) => candidates.push(json!({"error": error})),
            }
        }
        Ok(json!(candidates))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn durable_save_preserves_last_valid_backup() {
        let dir = std::env::temp_dir().join(format!("subtle-save-{}", std::process::id()));
        let a = json!({"version":1,"style":{"font":"Arial","size":64,"color":"#ffffff","opacity":100,"outline":3,"shadow":4,"x":50,"y":74,"animation":"normal"},"blocks":[],"name":"a"});
        let mut b = a.clone();
        b["name"] = json!("b");
        save(&dir, &a).unwrap();
        save(&dir, &b).unwrap();
        assert_eq!(
            valid(&fs::read(dir.join("session.backup.json")).unwrap()).unwrap(),
            a
        );
        fs::write(dir.join("session.json"), b"broken").unwrap();
        save(&dir, &b).unwrap();
        assert_eq!(
            valid(&fs::read(dir.join("session.backup.json")).unwrap()).unwrap(),
            a
        );
        assert!(save(&dir, &json!({})).is_err());
        fs::remove_dir_all(dir).unwrap();
    }
}
