//! Messages shown to the user by native commands. The frontend picks the
//! language and reports it through `set_locale`; every message produced after
//! that uses the selected language.
use std::sync::RwLock;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lang {
    Es,
    En,
}

impl Lang {
    pub fn code(self) -> &'static str {
        match self {
            Lang::Es => "es",
            Lang::En => "en",
        }
    }
    fn parse(code: &str) -> Option<Lang> {
        match code.to_ascii_lowercase().split('-').next() {
            Some("es") => Some(Lang::Es),
            Some("en") => Some(Lang::En),
            _ => None,
        }
    }
}

static LANG: RwLock<Lang> = RwLock::new(Lang::Es);

pub fn current() -> Lang {
    LANG.read().map(|l| *l).unwrap_or(Lang::Es)
}

#[tauri::command]
pub fn set_locale(locale: String) -> Result<(), String> {
    let lang = Lang::parse(&locale).ok_or_else(|| msg(Msg::UnsupportedLocale))?;
    *LANG.write().map_err(|e| e.to_string())? = lang;
    Ok(())
}

#[derive(Clone, Copy, Debug)]
pub enum Msg {
    UnsupportedLocale,
    ProcessStartFailed,
    VideoFilter,
    VideoNotFound,
    NoVideoStream,
    ImportVideoFirst,
    NoStreams,
    NoVideo,
    UnsupportedColor,
    RotationUnsupported,
    Mp4Extension,
    ExportFileName,
    Exporting,
    DocumentTooLarge,
    SaveFailed,
    PreparingPreview,
    DrawingWaveform,
    PreparingSpeechEngine,
    FontNotFound,
    InvalidJobId,
    JobAlreadyRunning,
    JobCancelled,
    EngineStartFailed,
    NoEngineOutput,
    NoEngineLog,
    ResultReadError,
    ProjectTooLarge,
    InvalidProject,
    InvalidVideoPath,
    InvalidBlockId,
    InvalidBlock,
    InvalidWords,
    EmptyBlock,
    InvalidWordId,
    InvalidStart,
    InvalidEnd,
    InvalidWordsOrTimes,
    InvalidPath,
}

fn spanish(m: Msg) -> &'static str {
    use Msg::*;
    match m {
        UnsupportedLocale => "Idioma no admitido.",
        ProcessStartFailed => "No se pudo iniciar el proceso: {0}",
        VideoFilter => "Vídeo",
        VideoNotFound => "No se encuentra el vídeo. Usa Localizar vídeo para volver a enlazarlo.",
        NoVideoStream => "El archivo no contiene vídeo",
        ImportVideoFirst => "Importa un vídeo primero.",
        NoStreams => "No hay pistas.",
        NoVideo => "No hay vídeo.",
        UnsupportedColor => "Esta primera versión exporta SDR de 8 bits yuv420p. Este original requiere un recorrido de color todavía no disponible; no se convertirá automáticamente.",
        RotationUnsupported => "La exportación de originales con metadatos de rotación aún no está disponible.",
        Mp4Extension => "La salida debe tener extensión .mp4.",
        ExportFileName => "subtle-subtitulado.mp4",
        Exporting => "Exportando desde el original…",
        DocumentTooLarge => "El documento es demasiado grande.",
        SaveFailed => "No se pudo guardar: {0}",
        PreparingPreview => "Preparando una preview ligera…",
        DrawingWaveform => "Dibujando la forma de onda…",
        PreparingSpeechEngine => "Preparando el motor de voz…",
        FontNotFound => "No se encuentra la fuente {0}. Selecciona una fuente instalada.",
        InvalidJobId => "Identificador de trabajo no válido.",
        JobAlreadyRunning => "Ya hay un trabajo en curso. Espera o cancélalo.",
        JobCancelled => "Trabajo cancelado.",
        EngineStartFailed => "No se pudo iniciar el motor: {0}",
        NoEngineOutput => "No hay salida del motor.",
        NoEngineLog => "No hay registro del motor.",
        ResultReadError => "Error leyendo el resultado.",
        ProjectTooLarge => "Proyecto demasiado grande",
        InvalidProject => "Proyecto no válido",
        InvalidVideoPath => "Ruta de vídeo no válida",
        InvalidBlockId => "Identificador de bloque no válido",
        InvalidBlock => "Bloque no válido",
        InvalidWords => "Palabras no válidas",
        EmptyBlock => "Bloque vacío",
        InvalidWordId => "Identificador de palabra no válido",
        InvalidStart => "Inicio no válido",
        InvalidEnd => "Final no válido",
        InvalidWordsOrTimes => "Palabras o tiempos no válidos",
        InvalidPath => "Ruta inválida",
    }
}

fn english(m: Msg) -> &'static str {
    use Msg::*;
    match m {
        UnsupportedLocale => "Unsupported language.",
        ProcessStartFailed => "Could not start the process: {0}",
        VideoFilter => "Video",
        VideoNotFound => "The video cannot be found. Use Locate video to link it again.",
        NoVideoStream => "The file does not contain video",
        ImportVideoFirst => "Import a video first.",
        NoStreams => "No streams found.",
        NoVideo => "No video found.",
        UnsupportedColor => "This first version exports 8-bit SDR yuv420p. This original needs a colour pipeline that is not available yet; it will not be converted automatically.",
        RotationUnsupported => "Exporting originals with rotation metadata is not available yet.",
        Mp4Extension => "The output must have the .mp4 extension.",
        ExportFileName => "subtle-subtitled.mp4",
        Exporting => "Exporting from the original…",
        DocumentTooLarge => "The document is too large.",
        SaveFailed => "Could not save: {0}",
        PreparingPreview => "Preparing a lightweight preview…",
        DrawingWaveform => "Drawing the waveform…",
        PreparingSpeechEngine => "Preparing the speech engine…",
        FontNotFound => "Font {0} cannot be found. Select an installed font.",
        InvalidJobId => "Invalid job identifier.",
        JobAlreadyRunning => "A job is already running. Wait or cancel it.",
        JobCancelled => "Job cancelled.",
        EngineStartFailed => "Could not start the engine: {0}",
        NoEngineOutput => "No output from the engine.",
        NoEngineLog => "No log from the engine.",
        ResultReadError => "Error reading the result.",
        ProjectTooLarge => "Project too large",
        InvalidProject => "Invalid project",
        InvalidVideoPath => "Invalid video path",
        InvalidBlockId => "Invalid block identifier",
        InvalidBlock => "Invalid block",
        InvalidWords => "Invalid words",
        EmptyBlock => "Empty block",
        InvalidWordId => "Invalid word identifier",
        InvalidStart => "Invalid start",
        InvalidEnd => "Invalid end",
        InvalidWordsOrTimes => "Invalid words or timings",
        InvalidPath => "Invalid path",
    }
}

/// Message in the current language.
pub fn msg(m: Msg) -> String {
    match current() {
        Lang::Es => spanish(m),
        Lang::En => english(m),
    }
    .to_string()
}

/// Message with its `{0}` placeholder replaced.
pub fn msg_with(m: Msg, detail: impl std::fmt::Display) -> String {
    msg(m).replace("{0}", &detail.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_message_exists_in_both_languages() {
        for m in [Msg::FontNotFound, Msg::ProcessStartFailed] {
            assert!(spanish(m).contains("{0}") && english(m).contains("{0}"));
        }
        assert_eq!(Lang::parse("en-US"), Some(Lang::En));
        assert_eq!(Lang::parse("fr"), None);
    }
}
