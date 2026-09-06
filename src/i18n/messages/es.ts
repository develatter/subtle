/**
 * Spanish messages. This file defines the set of message keys; every other
 * language must provide the same keys.
 */
export const es = {
  "app.title": "Subtle — subtítulos, sin complicaciones",
  "app.language": "Idioma",
  "language.es": "Español",
  "language.en": "English",

  // Top bar
  "topbar.savedLocally": "Guardado local",
  "topbar.renameProject": "Renombrar proyecto",
  "topbar.projectName": "Nombre del proyecto",
  "topbar.openProject": "Abrir proyecto",
  "topbar.saveProject": "Guardar proyecto",
  "topbar.export": "Exportar",

  // Navigation rail
  "rail.subtitles": "Subtítulos",
  "rail.video": "Vídeo",
  "rail.script": "Guion",
  "rail.local": "LOCAL",

  // Transcript panel
  "transcript.title": "Subtítulos",
  "transcript.importOrTranscribe": "Importar o transcribir",
  "transcript.generate": "Generar subtítulos",
  "transcript.searchLabel": "Buscar subtítulos",
  "transcript.searchPlaceholder": "Buscar en el texto…",
  "transcript.addAtStart": "Añadir bloque al inicio",
  "transcript.addAtEnd": "Añadir bloque al final",
  "transcript.addBefore": "Añadir bloque antes",
  "transcript.deleteBlock": "Eliminar bloque",
  "transcript.showBlock": "Mostrar bloque",
  "transcript.omitBlock": "Omitir bloque",
  "transcript.approximateTiming": "Tiempo aproximado: revisar",
  "transcript.wordLabel": "Palabra {text}",
  "transcript.deleteWord": "Eliminar palabra",
  "transcript.showWord": "Mostrar palabra",
  "transcript.omitWord": "Omitir palabra",
  "transcript.wordCount": "{count} palabras",
  "transcript.ownStyle": "· Estilo propio",
  "transcript.mergeWithPrevious": "Unir al anterior",
  "transcript.hintSplit": "dividir",
  "transcript.hintMerge": "unir al inicio",

  // Preview
  "preview.title": "PREVISUALIZACIÓN",
  "preview.createProxy": "Crear proxy + onda",
  "preview.rendererReady": "libass · {source}",
  "preview.sourceProxy": "Proxy",
  "preview.sourceOriginal": "Original",
  "preview.sourceDemo": "Demo",
  "preview.rendererError": "No se pudieron renderizar los subtítulos",
  "preview.rendererLoading": "Preparando preview…",
  "preview.canvasLabel": "Subtítulos renderizados con libass",
  "preview.demoEyebrow": "UN ESPACIO PARA TUS IDEAS",
  "preview.demoTitle": "Hazlo",
  "preview.demoTitleEmphasis": "tuyo.",
  "preview.demoImport": "Importar tu vídeo",
  "preview.demoLabel": "SUBTLE / CREATIVE STUDIO",
  "preview.resizeFromLeft": "Ajustar ancho desde izquierda",
  "preview.resizeFromRight": "Ajustar ancho desde derecha",
  "preview.scaleFromCorner": "Escalar texto desde esquina",
  "preview.expand": "Ampliar la preview",
  "preview.collapse": "Volver al editor",
  "preview.previousBlock": "Bloque anterior",
  "preview.nextBlock": "Bloque siguiente",
  "preview.play": "Reproducir",
  "preview.pause": "Pausar",
  "preview.unplayable":
    "Este vídeo no se puede reproducir en el navegador integrado. Prueba un MP4 compatible.",
  "preview.unsupportedFormat":
    "Formato de preview no compatible. Usa «Crear proxy + onda» para reproducirlo.",

  // Inspector
  "inspector.title": "Estilo",
  "inspector.scopeBlock": "Solo este bloque",
  "inspector.scopeAll": "Todos los subtítulos",
  "inspector.scopeBlockHint": "Cambios independientes",
  "inspector.scopeAllHint": "Un estilo, todo tu vídeo",
  "inspector.onlyThisBlock": "Solo este bloque",
  "inspector.typography": "TIPOGRAFÍA",
  "inspector.font": "Fuente",
  "inspector.size": "Tamaño",
  "inspector.color": "Color",
  "inspector.opacity": "Opacidad",
  "inspector.outline": "Contorno",
  "inspector.shadow": "Sombra",
  "inspector.animation": "ANIMACIÓN",
  "inspector.animationNormal": "Normal",
  "inspector.animationProgressive": "Progresivo",
  "inspector.animationWord": "Palabra",
  "inspector.animationNormalHelp": "El bloque completo permanece en pantalla.",
  "inspector.animationProgressiveHelp":
    "Cada palabra aparece a tiempo. La frase mantiene su posición.",
  "inspector.animationWordHelp": "Una sola palabra, sincronizada con la voz.",
  "inspector.layout": "POSICIÓN Y ANCHO",
  "inspector.maxWidth": "Ancho máximo · %",
  "inspector.maxWidthLabel": "Ancho máximo",
  "inspector.axis": "{axis} · %",
  "inspector.dragHelp": "Arrastra el texto sobre el vídeo para colocarlo.",
  "inspector.word": "PALABRA · {text}",
  "inspector.wordReview":
    "Tiempo aproximado. Escucha este fragmento y ajusta sus límites.",
  "inspector.goToWord": "Ir a la palabra",
  "inspector.wordStart": "Inicio de palabra",
  "inspector.wordEnd": "Fin de palabra",
  "inspector.markReviewed": "Marcar tiempo revisado",
  "inspector.blockTiming": "TIEMPOS DEL BLOQUE · SEGUNDOS",
  "inspector.start": "Inicio",
  "inspector.end": "Fin",

  // Timeline
  "timeline.undo": "Deshacer",
  "timeline.redo": "Rehacer",
  "timeline.splitAtPlayhead": "Dividir en el cabezal",
  "timeline.title": "Línea de tiempo",
  "timeline.zoom": "Zoom",
  "timeline.zoomLabel": "Zoom de línea de tiempo",
  "timeline.resize": "Cambiar la altura de la línea de tiempo",
  "timeline.subtitlesTrack": "Subtítulos",
  "timeline.videoTrack": "Vídeo",
  "timeline.omitted": "Omitido",
  "timeline.demoMedia":
    "Vídeo de demostración · importa un original para empezar",
  "timeline.playhead": "Cabezal de reproducción",

  // Footer
  "footer.local": "Todo sucede en tu equipo",
  "footer.toReview": "{count} palabras con tiempo aproximado",
  "footer.toReviewHint":
    "La sincronización no pudo situar estas palabras con precisión. Pulsa para ir a la siguiente y ajustar sus tiempos en el inspector.",
  "footer.allReviewed": "Todos los tiempos revisados",
  "footer.version": "Subtle {version}",

  // Notices and alerts
  "notice.close": "Cerrar aviso",
  "notice.saved": "Guardado: {path}",
  "notice.videoExported": "Vídeo exportado: {path}",
  "notice.blockAdded":
    "Bloque añadido. Revisa los tiempos aproximados de sus palabras.",
  "notice.subtitlesGenerated":
    "Subtítulos generados. {count} palabras con tiempo aproximado, marcadas para revisar.",
  "notice.noWords": "No se han encontrado palabras.",
  "notice.transcriptionNeedsDesktop":
    "La transcripción local está disponible al abrir Subtle con Tauri.",
  "notice.exportNeedsDesktop":
    "Importa el original en la aplicación de escritorio para exportar vídeo.",
  "notice.jobRunningOnClose":
    "Hay un trabajo en curso. Espera a que termine o cancélalo antes de cerrar.",
  "notice.saveBeforeCloseFailed":
    "No se ha podido guardar antes de cerrar: {error}. Guarda una copia del proyecto.",
  "notice.relinkVideo": "Localizar vídeo original",

  // Storage
  "storage.autosaveFailed":
    "No se pudo autoguardar. Guarda una copia del proyecto.",
  "storage.diskWriteFailed":
    "No se pudo guardar en disco: {error}. Guarda una copia del proyecto.",
  "storage.backupRestored":
    "Se ha recuperado la copia de seguridad del proyecto.",
  "storage.diskUnreadable":
    "No se pudo abrir el guardado en disco. Se conserva la copia local; guarda una copia del proyecto.",
  "storage.recoveryFailed": "No se pudo leer la recuperación: {error}",

  // Jobs
  "job.cancelling": "Cancelando…",
  "job.cancel": "Cancelar trabajo",
  "job.progress": "Progreso",
  "job.preparingPreview": "Preparando una preview ligera…",
  "job.aligningScript": "Sincronizando el guion con el audio…",
  "job.transcribing": "Transcribiendo el audio…",
  "job.exporting": "Exportando desde el original…",

  // Insert dialog
  "insert.title": "Añadir subtítulo",
  "insert.help":
    "Los bloques existentes conservan sus tiempos. Si no hay un hueco, ajusta primero el final o inicio del bloque vecino.",
  "insert.textLabel": "Texto del nuevo bloque",
  "insert.textPlaceholder": "Escribe el subtítulo…",
  "insert.start": "Inicio (s)",
  "insert.end": "Final (s)",
  "insert.cancel": "Cancelar",
  "insert.submit": "Añadir bloque",

  // Import dialog
  "import.dialogLabel": "Generar subtítulos",
  "import.title": "Cada palabra, en su sitio.",
  "import.intro":
    "Importa un vídeo y añade tu guion para sincronizarlo, o deja el campo vacío para transcribir el audio.",
  "import.selectVideo": "Seleccionar vídeo",
  "import.formats": "MP4, MOV, MKV o WebM",
  "import.scriptLabel": "Guion opcional · español",
  "import.importTxt": "Importar TXT",
  "import.scriptPlaceholder": "Pega aquí lo que se dice en el vídeo…",
  "import.replacesBlocks":
    "La generación sustituye los bloques actuales y se puede deshacer.",
  "import.engineReady": "Motor local listo. El audio permanece en este equipo.",
  "import.engineMissing": "El motor de voz no está instalado en este equipo.",
  "import.engineChecking": "Comprobando el motor local…",
  "import.alignScript": "Sincronizar guion",
  "import.transcribeAudio": "Transcribir audio",
  "import.continueEditing": "Continuar editando",
  "dialog.close": "Cerrar",

  // Export dialog
  "export.dialogLabel": "Exportar",
  "export.title": "Listo para compartir.",
  "export.intro":
    "Los subtítulos ocultos se omiten. Sus tiempos originales se mantienen en el proyecto.",
  "export.stlRate": "STL · base de tiempo",
  "export.fps": "{fps} fps",
  "export.stl": "Subtítulos .stl · EBU",
  "export.stlHint": "Texto y tiempos · {fps} fps · sin animaciones",
  "export.srt": "Subtítulos .srt",
  "export.srtHint": "Texto y tiempos, sin estilos",
  "export.ass": "Subtítulos .ass",
  "export.assHint": "Estilos y animaciones",
  "export.videoHelp":
    "Vídeo: exportación inicial SDR 8 bits, H.264 de alta calidad y audio copiado. HDR y originales con rotación requieren soporte adicional. Preview de texto aproximada.",
  "export.video": "Exportar vídeo subtitulado",
  "export.videoFileName": "{name}-subtitulado.mp4",
  "export.needsDesktop":
    "Abre la aplicación de escritorio e importa un vídeo para exportarlo.",

  // Crash screen
  "crash.title": "Algo ha fallado en la interfaz.",
  "crash.help":
    "El proyecto se guarda automáticamente con cada cambio, así que puedes recargar sin perder nada.",
  "crash.reload": "Recargar",

  // Domain errors
  "error.block.retimeOutOfRange":
    "Los tiempos deben estar dentro del vídeo y no solaparse con otros bloques.",
  "error.word.retimeOutOfRange":
    "El tiempo de la palabra debe estar entre sus vecinas y dentro del vídeo.",
  "error.block.insertInvalid":
    "Introduce texto y un intervalo válido dentro del vídeo.",
  "error.block.insertOverlap":
    "Ese intervalo ya tiene subtítulos. Ajusta los tiempos de los bloques vecinos para dejar espacio.",
  "error.project.invalid": "Proyecto no válido.",
  "error.project.invalidBlock": "Bloque no válido.",
  "error.project.invalidWords": "Palabras o tiempos no válidos.",
  "error.stl.unsupportedCharacter":
    "El exportador STL inicial no admite «{character}». Usa SRT o corrige ese carácter.",
  "error.stl.tooManyBlocks": "Demasiados bloques para STL.",
  "error.stl.timeOutOfRange": "STL requiere tiempos inferiores a 24 horas.",
  "error.stl.wordTooLong": "STL: una palabra supera 42 caracteres.",
  "error.stl.tooManyRows":
    "STL: divide el bloque en un máximo de dos líneas de 42 caracteres.",
  "error.stl.blockTooLong": "STL: bloque demasiado largo.",
  "error.stl.blockTooShort": "STL: bloque más corto que un fotograma.",
} as const;

export type MessageKey = keyof typeof es;
export type Messages = Record<MessageKey, string>;
