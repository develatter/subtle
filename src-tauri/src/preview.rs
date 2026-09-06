//! Lightweight H.264 proxy and waveform image for smooth playback.
use crate::i18n::{msg, Msg};
use crate::jobs;
use crate::media::Media;
use crate::process::{binary, has_stream, probe, run, scratch_dir, video_filter};
use serde_json::{json, Value};
use std::process::Command;
use tauri::{Manager, State};

const PROXY_SCALE: &str = "scale=540:960:force_original_aspect_ratio=decrease:force_divisible_by=2";
const PROXY_ARGS: [&str; 20] = [
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-fps_mode",
    "passthrough",
    "-enc_time_base",
    "demux",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
];
const WAVEFORM_FILTER: &str = "[0:a:0]showwavespic=s=1600x60:colors=0xbda2e6:scale=sqrt[wave]";

fn waveform_command(input: &std::path::Path, output: &std::path::Path) -> Command {
    let mut cmd = Command::new(binary("ffmpeg"));
    cmd.args(["-v", "error", "-nostdin", "-n", "-i"])
        .arg(input)
        .args([
            "-filter_complex",
            WAVEFORM_FILTER,
            "-map",
            "[wave]",
            "-frames:v",
            "1",
        ])
        .arg(output);
    cmd
}

/// Draws the waveform of the loaded original. Runs outside the job slot so it
/// never blocks transcription or export; returns `null` without audio.
#[tauri::command]
pub async fn waveform(
    app: tauri::AppHandle,
    media: State<'_, Media>,
) -> Result<Option<String>, String> {
    let input = media.require()?;
    tauri::async_runtime::spawn_blocking(move || {
        if !has_stream(&probe(&input)?, "audio") {
            return Ok(None);
        }
        let dir = scratch_dir(&app, "waveform")?;
        let wave = dir.join("waveform.png");
        if let Err(e) = run(waveform_command(&input, &wave)) {
            let _ = std::fs::remove_dir_all(&dir);
            return Err(e);
        }
        app.asset_protocol_scope()
            .allow_file(&wave)
            .map_err(|e| e.to_string())?;
        Ok(Some(wave.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn prepare_preview(
    app: tauri::AppHandle,
    media: State<'_, Media>,
    id: String,
) -> Result<Value, String> {
    let input = media.require()?;
    let ticket = jobs::begin(&app, id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let info = probe(&input)?;
        let dir = scratch_dir(&app, "preview")?;
        let output = dir.join("proxy.mp4");
        let wave = dir.join("waveform.png");
        let mut cmd = Command::new(binary("ffmpeg"));
        cmd.args(jobs::FFMPEG_PROGRESS_ARGS)
            .args(["-v", "error", "-nostdin", "-n", "-i"])
            .arg(&input)
            .args(["-vf", &video_filter(&input, PROXY_SCALE)?])
            .args(PROXY_ARGS)
            .args(["-movflags", "+faststart+negative_cts_offsets"])
            .arg(&output);
        if let Err(e) = ticket.run_ffmpeg(
            cmd,
            &msg(Msg::PreparingPreview),
            crate::export::duration_of(&info),
        ) {
            let _ = std::fs::remove_dir_all(&dir);
            return Err(e);
        }
        let has_audio = has_stream(&info, "audio");
        if has_audio {
            ticket.emit(&msg(Msg::DrawingWaveform), None);
            let mut cmd = Command::new(binary("ffmpeg"));
            cmd.args(["-v", "error", "-nostdin", "-n", "-i"])
                .arg(&input)
                .args([
                    "-filter_complex",
                    WAVEFORM_FILTER,
                    "-map",
                    "[wave]",
                    "-frames:v",
                    "1",
                ])
                .arg(&wave);
            if let Err(e) = ticket.run(cmd) {
                let _ = std::fs::remove_dir_all(&dir);
                return Err(e);
            }
            app.asset_protocol_scope()
                .allow_file(&wave)
                .map_err(|e| e.to_string())?;
        }
        app.asset_protocol_scope()
            .allow_file(&output)
            .map_err(|e| e.to_string())?;
        Ok(json!({"path": output, "waveform": if has_audio { Some(wave) } else { None }}))
    })
    .await
    .map_err(|e| e.to_string())?
}
