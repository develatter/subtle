//! Burns an ASS track into the original with FFmpeg, publishing the output
//! atomically and never overwriting an existing file.
use crate::i18n::{msg, Msg};
use crate::jobs;
use crate::media::Media;
use crate::process::{binary, probe, scratch_dir, video_filter};
use serde_json::Value;
use std::process::Command;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

/// Encoder arguments shared with `scripts/check-export.mjs`.
const EXPORT_ARGS: &str = include_str!("../export-args.json");

/// Colour metadata copied from the source when it is known.
const COLOR_FLAGS: [(&str, &str); 4] = [
    ("color_primaries", "-color_primaries"),
    ("color_transfer", "-color_trc"),
    ("color_space", "-colorspace"),
    ("color_range", "-color_range"),
];

/// Container duration in seconds, or 0 when unknown.
pub fn duration_of(info: &Value) -> f64 {
    info["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse().ok())
        .unwrap_or(0.0)
}

/// The initial export only supports 8-bit SDR `yuv420p` without rotation.
fn check_supported(video: &Value) -> Result<(), String> {
    let pix = video["pix_fmt"].as_str().unwrap_or("");
    let hdr = video["color_transfer"] == "smpte2084"
        || video["color_transfer"] == "arib-std-b67"
        || video["color_primaries"] == "bt2020";
    if pix != "yuv420p" || hdr {
        return Err(msg(Msg::UnsupportedColor));
    }
    let rotated = video["side_data_list"].as_array().is_some_and(|list| {
        list.iter()
            .any(|s| s["rotation"].as_i64().unwrap_or(0) != 0)
    });
    if rotated || video["tags"]["rotate"].as_str().is_some_and(|r| r != "0") {
        return Err(msg(Msg::RotationUnsupported));
    }
    Ok(())
}

#[tauri::command]
pub async fn export_video(
    app: tauri::AppHandle,
    media: State<'_, Media>,
    ass: String,
    id: String,
    name: String,
) -> Result<Option<String>, String> {
    let input = media.require()?;
    let ticket = jobs::begin(&app, id)?;
    tauri::async_runtime::spawn_blocking(move || -> Result<Option<String>, String> {
        let info = probe(&input)?;
        let streams = info["streams"]
            .as_array()
            .ok_or_else(|| msg(Msg::NoStreams))?;
        let video = streams
            .iter()
            .find(|v| v["codec_type"] == "video")
            .ok_or_else(|| msg(Msg::NoVideo))?;
        check_supported(video)?;
        // Only the final component is honoured; the dialog chooses the folder.
        let suggested = std::path::Path::new(&name)
            .file_name()
            .and_then(|n| n.to_str())
            .filter(|n| !n.trim().is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| msg(Msg::ExportFileName));
        let Some(file) = app
            .dialog()
            .file()
            .set_file_name(suggested)
            .add_filter("MP4", &["mp4"])
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let output = file.into_path().map_err(|e| e.to_string())?;
        // The system dialog already asked before choosing an existing file.
        let replacing = output.exists();
        if output.extension().and_then(|s| s.to_str()) != Some("mp4") {
            return Err(msg(Msg::Mp4Extension));
        }
        let work = scratch_dir(&app, "export")?;
        std::fs::write(work.join("subtitles.ass"), ass).map_err(|e| e.to_string())?;
        let stamp = work
            .file_name()
            .and_then(|n| n.to_str())
            .and_then(|n| n.strip_prefix("export-"))
            .unwrap_or("tmp")
            .to_string();
        let temp = output.with_file_name(format!(".subtle-{stamp}.mp4"));
        let mut args =
            serde_json::from_str::<Vec<String>>(EXPORT_ARGS).map_err(|e| e.to_string())?;
        if let Some(filters) = args.iter().position(|a| a == "-vf").map(|i| i + 1) {
            args[filters] = video_filter(&input, &args[filters])?;
        }
        let mut c = Command::new(binary("ffmpeg"));
        c.current_dir(&work)
            .args(jobs::FFMPEG_PROGRESS_ARGS)
            .args(["-v", "error", "-nostdin", "-n", "-noautorotate", "-i"])
            .arg(&input)
            .args(args);
        for (key, flag) in COLOR_FLAGS {
            if let Some(s) = video[key]
                .as_str()
                .filter(|s| *s != "unknown" && *s != "unspecified")
            {
                c.args([flag, s]);
            }
        }
        c.arg(&temp);
        let result = ticket.run_ffmpeg(c, &msg(Msg::Exporting), duration_of(&info));
        let _ = std::fs::remove_dir_all(&work);
        if let Err(e) = result {
            let _ = std::fs::remove_file(&temp);
            return Err(e);
        }
        // Publish atomically. A confirmed replacement is renamed over the old
        // file; otherwise a hard link refuses to clobber anything created while
        // FFmpeg was working.
        let published = if replacing {
            std::fs::rename(&temp, &output)
        } else {
            std::fs::hard_link(&temp, &output)
        };
        if let Err(e) = published {
            let _ = std::fs::remove_file(&temp);
            return Err(e.to_string());
        }
        let _ = std::fs::remove_file(&temp);
        Ok(Some(output.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}
