#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
//! Subtle desktop shell. Each module exposes the Tauri commands for one
//! capability; the frontend mirrors them in `src/infrastructure/tauri/commands.ts`.
mod documents;
mod export;
mod fonts;
mod i18n;
mod jobs;
mod media;
mod persistence;
mod preview;
mod process;
mod speech;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            process::set_resource_dir(app.path().resource_dir()?);
            process::clean_scratch(app.handle());
            if let Some(config) = process::resource("media/fonts.conf") {
                std::env::set_var("FONTCONFIG_FILE", config);
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .manage(media::Media::new())
        .manage(jobs::Jobs::default())
        .manage(fonts::Fonts::default())
        .invoke_handler(tauri::generate_handler![
            media::select_video,
            media::restore_video,
            persistence::load_session,
            persistence::save_session,
            preview::prepare_preview,
            preview::waveform,
            documents::save_document,
            export::export_video,
            speech::speech,
            speech::speech_status,
            jobs::cancel_job,
            fonts::system_fonts,
            fonts::font_files,
            i18n::set_locale
        ])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Subtle");
}
