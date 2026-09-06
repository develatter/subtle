//! One native job at a time, with progress events and cooperative cancellation.
use crate::i18n::{msg, msg_with, Msg};
use crate::process::tail;
use serde_json::{json, Value};
use std::{
    collections::VecDeque,
    io::{BufRead, BufReader, Read},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{Emitter, Manager};
/// The running job, if any.
#[derive(Default)]
pub struct Jobs(pub Mutex<Option<Arc<Job>>>);
pub struct Job {
    pub id: String,
    cancelled: AtomicBool,
}
/// Handle owned by a running command; releases the slot when dropped.
pub struct Ticket {
    pub job: Arc<Job>,
    app: tauri::AppHandle,
}
impl Drop for Ticket {
    fn drop(&mut self) {
        if let Ok(mut slot) = self.app.state::<Jobs>().0.lock() {
            if slot.as_ref().is_some_and(|j| j.id == self.job.id) {
                *slot = None
            }
        }
    }
}
/// Claims the job slot for `id`, failing if another job is running.
pub fn begin(app: &tauri::AppHandle, id: String) -> Result<Ticket, String> {
    if id.len() > 100 || id.is_empty() {
        return Err(msg(Msg::InvalidJobId));
    }
    let state = app.state::<Jobs>();
    let mut slot = state.0.lock().map_err(|e| e.to_string())?;
    if slot.is_some() {
        return Err(msg(Msg::JobAlreadyRunning));
    }
    let job = Arc::new(Job {
        id,
        cancelled: AtomicBool::new(false),
    });
    *slot = Some(job.clone());
    Ok(Ticket {
        job,
        app: app.clone(),
    })
}
#[tauri::command]
pub fn cancel_job(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<Jobs>();
    let slot = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(job) = slot.as_ref().filter(|j| j.id == id) {
        job.cancelled.store(true, Ordering::SeqCst);
    }
    Ok(())
}
/// Global FFmpeg options that write progress lines to stderr. They must come
/// before the output file, so callers add them when building the command.
pub const FFMPEG_PROGRESS_ARGS: [&str; 4] = ["-progress", "pipe:2", "-stats_period", "0.5"];

/// Progress reporting for an FFmpeg run of known duration.
struct Tracking {
    stage: String,
    duration: f64,
}

impl Tracking {
    /// Percentage for an `out_time_us=<microseconds>` line, capped at 99.
    fn progress(&self, line: &str) -> Option<f64> {
        let micros = line
            .strip_prefix("out_time_us=")?
            .trim()
            .parse::<f64>()
            .ok()?;
        if self.duration <= 0.0 || micros < 0.0 {
            return None;
        }
        Some(
            (micros / 1_000_000.0 / self.duration * 100.0)
                .clamp(0.0, 99.0)
                .round(),
        )
    }
}

/// `key=value` lines written by `-progress`, kept out of the error tail.
fn is_ffmpeg_progress(line: &str) -> bool {
    line.split_once('=').is_some_and(|(key, _)| {
        !key.is_empty()
            && key
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '.')
    })
}

impl Ticket {
    /// Reports a stage change to the frontend.
    pub fn emit(&self, stage: &str, progress: Option<f64>) {
        let _ = self.app.emit(
            "job-progress",
            json!({"id":self.job.id,"stage":stage,"progress":progress}),
        );
    }
    /// Runs a command, forwarding `@subtle` progress lines from stderr and
    /// killing the whole process group on cancellation.
    pub fn run(&self, cmd: Command) -> Result<Vec<u8>, String> {
        self.run_tracked(cmd, None)
    }

    /// Runs FFmpeg started with `FFMPEG_PROGRESS_ARGS`, turning its
    /// `out_time_us` lines into a percentage of `duration` seconds.
    pub fn run_ffmpeg(&self, cmd: Command, stage: &str, duration: f64) -> Result<Vec<u8>, String> {
        self.emit(stage, Some(0.0));
        self.run_tracked(
            cmd,
            Some(Tracking {
                stage: stage.to_string(),
                duration,
            }),
        )
    }

    fn run_tracked(&self, mut cmd: Command, tracking: Option<Tracking>) -> Result<Vec<u8>, String> {
        if self.job.cancelled.load(Ordering::SeqCst) {
            return Err(msg(Msg::JobCancelled));
        }
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }
        let mut child = cmd
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| msg_with(Msg::EngineStartFailed, e))?;
        let mut stdout = child
            .stdout
            .take()
            .ok_or_else(|| msg(Msg::NoEngineOutput))?;
        let stderr = child.stderr.take().ok_or_else(|| msg(Msg::NoEngineLog))?;
        let output = std::thread::spawn(move || {
            let mut data = Vec::new();
            stdout.read_to_end(&mut data).map(|_| data)
        });
        let app = self.app.clone();
        let id = self.job.id.clone();
        let errors = std::thread::spawn(move || {
            let mut tail = VecDeque::new();
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                if let Some(payload) = line.strip_prefix("@subtle ") {
                    if let Ok(mut event) = serde_json::from_str::<Value>(payload) {
                        event["id"] = json!(id);
                        let _ = app.emit("job-progress", event);
                    }
                } else if let Some(t) = tracking.as_ref().filter(|_| is_ffmpeg_progress(&line)) {
                    if let Some(progress) = t.progress(&line) {
                        let _ = app.emit(
                            "job-progress",
                            json!({"id": id, "stage": t.stage, "progress": progress}),
                        );
                    }
                } else {
                    if tail.len() >= 15 {
                        tail.pop_front();
                    }
                    tail.push_back(line);
                }
            }
            tail.into_iter().collect::<Vec<_>>().join("\n")
        });
        let status = loop {
            if self.job.cancelled.load(Ordering::SeqCst) {
                #[cfg(unix)]
                unsafe {
                    libc::kill(-(child.id() as i32), libc::SIGKILL);
                }
                #[cfg(not(unix))]
                {
                    let _ = child.kill();
                }
                let _ = child.wait();
                let _ = output.join();
                let _ = errors.join();
                return Err(msg(Msg::JobCancelled));
            }
            if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                break status;
            }
            std::thread::sleep(Duration::from_millis(60));
        };
        let data = output
            .join()
            .map_err(|_| msg(Msg::ResultReadError))?
            .map_err(|e| e.to_string())?;
        let message = errors.join().unwrap_or_default();
        if !status.success() {
            return Err(tail(&message));
        }
        Ok(data)
    }
}
