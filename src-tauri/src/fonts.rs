//! System font catalogue, so the WASM preview renders the same files libass uses on export.
use crate::i18n::{msg_with, Msg};
use crate::process::run;
use std::{process::Command, sync::Mutex};
use tauri::Manager;

/// `(family, file path)` pairs, cached after the first scan.
#[derive(Default)]
pub struct Fonts(Mutex<Option<Vec<(String, String)>>>);

#[cfg(target_os = "macos")]
fn scan() -> Result<Vec<(String, String)>, String> {
    let mut cmd = Command::new("/usr/sbin/system_profiler");
    cmd.args(["SPFontsDataType", "-json"]);
    let value: serde_json::Value = serde_json::from_slice(&run(cmd)?).map_err(|e| e.to_string())?;
    let mut fonts = Vec::new();
    if let Some(files) = value["SPFontsDataType"].as_array() {
        for file in files {
            if let (Some(path), Some(faces)) = (file["path"].as_str(), file["typefaces"].as_array())
            {
                for face in faces {
                    if let Some(family) = face["family"].as_str() {
                        fonts.push((family.to_string(), path.to_string()))
                    }
                }
            }
        }
    }
    Ok(fonts)
}

#[cfg(target_os = "linux")]
fn scan() -> Result<Vec<(String, String)>, String> {
    let mut cmd = Command::new("fc-list");
    cmd.args(["--format", "%{family}\t%{file}\n"]);
    let mut fonts = Vec::new();
    for line in String::from_utf8_lossy(&run(cmd)?).lines() {
        if let Some((families, path)) = line.split_once('\t') {
            for family in families.split(',') {
                fonts.push((family.to_string(), path.to_string()))
            }
        }
    }
    Ok(fonts)
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn scan() -> Result<Vec<(String, String)>, String> {
    Ok(Vec::new())
}

fn font_catalog(app: &tauri::AppHandle) -> Result<Vec<(String, String)>, String> {
    let state = app.state::<Fonts>();
    let mut cache = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(fonts) = cache.as_ref() {
        return Ok(fonts.clone());
    }
    let mut fonts = scan()?;
    fonts.sort();
    fonts.dedup();
    *cache = Some(fonts.clone());
    Ok(fonts)
}

#[tauri::command]
pub async fn system_fonts(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut fonts = font_catalog(&app)?
            .into_iter()
            .map(|(name, _)| name)
            .collect::<Vec<_>>();
        fonts.sort();
        fonts.dedup();
        Ok(fonts)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn font_files(
    app: tauri::AppHandle,
    families: Vec<String>,
) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let catalog = font_catalog(&app)?;
        let mut paths = Vec::new();
        for family in families {
            let found = catalog
                .iter()
                .filter(|(name, _)| name.eq_ignore_ascii_case(&family))
                .collect::<Vec<_>>();
            if found.is_empty() {
                return Err(msg_with(Msg::FontNotFound, family));
            }
            for (_, path) in found {
                app.asset_protocol_scope()
                    .allow_file(path)
                    .map_err(|e| e.to_string())?;
                paths.push(path.clone())
            }
        }
        paths.sort();
        paths.dedup();
        Ok(paths)
    })
    .await
    .map_err(|e| e.to_string())?
}
