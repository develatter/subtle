//! Locating bundled or system binaries and running them synchronously.
use crate::i18n::{msg_with, Msg};
use serde_json::Value;
use std::{path::PathBuf, process::Command};

static RESOURCES: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

/// Remembers the application resource directory once at start-up.
pub fn set_resource_dir(dir: PathBuf) {
    let _ = RESOURCES.set(dir);
}

/// A file inside the bundled `runtime` directory, if it exists.
pub fn resource(path: &str) -> Option<PathBuf> {
    RESOURCES
        .get()
        .map(|root| root.join("runtime").join(path))
        .filter(|p| p.exists())
}

const SYSTEM_BIN_DIRS: [&str; 3] = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];

/// Path of a tool: bundled first, then `SUBTLE_<NAME>`, then well-known
/// system directories, and finally the bare name for `PATH` lookup.
pub fn binary(name: &str) -> String {
    if let Some(path) = resource(&format!("media/bin/{name}")) {
        return path.to_string_lossy().into_owned();
    }
    if let Ok(path) = std::env::var(format!("SUBTLE_{}", name.to_uppercase())) {
        return path;
    }
    for base in SYSTEM_BIN_DIRS {
        let p = format!("{base}/{name}");
        if std::path::Path::new(&p).exists() {
            return p;
        }
    }
    name.to_string()
}

/// Number of trailing stderr characters kept in error messages.
const STDERR_TAIL: usize = 2500;

pub fn tail(text: &str) -> String {
    text.chars()
        .rev()
        .take(STDERR_TAIL)
        .collect::<String>()
        .chars()
        .rev()
        .collect()
}

/// Runs a command to completion, returning stdout or the tail of stderr.
pub fn run(mut c: Command) -> Result<Vec<u8>, String> {
    let output = c
        .output()
        .map_err(|e| msg_with(Msg::ProcessStartFailed, e))?;
    if !output.status.success() {
        return Err(tail(&String::from_utf8_lossy(&output.stderr)));
    }
    Ok(output.stdout)
}

/// `ffprobe` stream and format information as JSON.
pub fn probe(path: &std::path::Path) -> Result<Value, String> {
    let mut c = Command::new(binary("ffprobe"));
    c.args([
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
    ])
    .arg(path);
    serde_json::from_slice(&run(c)?).map_err(|e| e.to_string())
}

/// Unique scratch directory under the app cache for one job.
pub fn scratch_dir(app: &tauri::AppHandle, prefix: &str) -> Result<PathBuf, String> {
    use tauri::Manager;
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let dir = cache.join(format!("{prefix}-{stamp}"));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Prefixes of per-session scratch directories under the app cache.
const SCRATCH_PREFIXES: [&str; 4] = ["waveform-", "preview-", "speech-", "export-"];

/// Removes scratch directories left by previous sessions (proxies, waveforms
/// and the work directories of jobs interrupted by a crash).
pub fn clean_scratch(app: &tauri::AppHandle) {
    use tauri::Manager;
    let Ok(cache) = app.path().app_cache_dir() else {
        return;
    };
    let Ok(entries) = std::fs::read_dir(cache) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let stale = name
            .to_str()
            .is_some_and(|n| SCRATCH_PREFIXES.iter().any(|p| n.starts_with(p)));
        if stale && entry.path().is_dir() {
            let _ = std::fs::remove_dir_all(entry.path());
        }
    }
}

pub fn has_stream(info: &Value, codec_type: &str) -> bool {
    info["streams"]
        .as_array()
        .is_some_and(|streams| streams.iter().any(|s| s["codec_type"] == codec_type))
}

/// Start time (seconds) of the first video stream, optionally ignoring the
/// container's edit list to see the raw composition times.
pub fn video_start(path: &std::path::Path, ignore_editlist: bool) -> Result<Option<f64>, String> {
    let mut c = Command::new(binary("ffprobe"));
    c.args(["-v", "error"]);
    if ignore_editlist {
        c.args(["-ignore_editlist", "1"]);
    }
    c.args([
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=start_time",
        "-of",
        "json",
    ])
    .arg(path);
    let value: Value = serde_json::from_slice(&run(c)?).map_err(|e| e.to_string())?;
    Ok(value["streams"][0]["start_time"]
        .as_str()
        .and_then(|s| s.parse().ok()))
}

/// Decides whether the video must be shifted so its first frame presents at 0.
///
/// Files without an edit list whose first frame carries a positive
/// composition offset (typical of Android/WhatsApp recordings) are played by
/// Apple players from that first frame, while FFmpeg honours the offset and
/// would write an empty edit: a black lead-in and video late against the
/// audio. When the start is identical with and without the edit list, no edit
/// list is in effect, and a positive start must be removed to match playback.
pub fn needs_start_shift(with_editlist: Option<f64>, without_editlist: Option<f64>) -> bool {
    const EPSILON: f64 = 0.0005;
    match (with_editlist, without_editlist) {
        (Some(a), Some(b)) => (a - b).abs() < EPSILON && a > EPSILON,
        _ => false,
    }
}

/// Video filter chain, prefixed with a start shift when the source needs it.
pub fn video_filter(path: &std::path::Path, filters: &str) -> Result<String, String> {
    let shift = needs_start_shift(video_start(path, false)?, video_start(path, true)?);
    Ok(if shift {
        format!("setpts=PTS-STARTPTS,{filters}")
    } else {
        filters.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::needs_start_shift;
    #[test]
    fn shifts_only_positive_starts_without_an_edit_list() {
        assert!(needs_start_shift(Some(0.166667), Some(0.166667)));
        assert!(!needs_start_shift(Some(0.0), Some(0.0)));
        assert!(!needs_start_shift(Some(0.033333), Some(0.066667)));
        assert!(!needs_start_shift(Some(0.0), Some(0.033333)));
        assert!(!needs_start_shift(None, Some(0.1)));
    }
}
