# Subtle

Editor local de subtítulos para shorts, con Tauri 2, React, TypeScript y Rust.

## Desarrollo

Requisitos: Node 22+, Rust estable, FFmpeg con libass y ffprobe. En Linux también hacen falta los [prerrequisitos de Tauri](https://v2.tauri.app/start/prerequisites/) (WebKitGTK 4.1, GTK, etc.).

```sh
npm install
npm run desktop
```

`npm run dev` abre únicamente la interfaz web en http://127.0.0.1:1420. Permite probar el editor con la demo o un vídeo compatible, pero los comandos nativos requieren Tauri.

```sh
npm run build
npm test
npm run test:ui          # prueba de humo de la interfaz (requiere `npx playwright install chromium`)
cargo check --manifest-path src-tauri/Cargo.toml
node --import tsx scripts/check-export.mjs
```

Las reglas del repositorio (arquitectura, estilo, qué no romper) están en `AGENTS.md`.

Para generar una app de desarrollo en Mac: `npm run desktop -- build --debug --bundles app`. Los paquetes Linux deben compilarse y probarse en Linux; no se han validado en este equipo.

## Idiomas

La interfaz está disponible en español e inglés. El idioma se elige en la barra superior, se guarda en el navegador (`subtle-locale`) y por defecto sigue el idioma del sistema. Los mensajes nativos (Rust) y los del motor de voz (Python, mediante `SUBTLE_LOCALE`) usan el mismo idioma. Para añadir un idioma: crear `src/i18n/messages/<código>.ts` con las mismas claves que `es.ts`, registrarlo en `src/i18n/locale.ts` y `translate.ts`, y añadir la variante en `src-tauri/src/i18n.rs` y en `scripts/transcribe.py`.

## Arquitectura

El frontend sigue una separación por capas; las dependencias solo apuntan hacia dentro (UI → aplicación → dominio):

| Capa            | Ruta                      | Contenido                                                                                                                                                                                                             |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dominio         | `src/domain/`             | Modelo del proyecto, operaciones de edición (dividir, unir, mover, retemporizar), validación, segmentación y exportadores SRT/ASS/STL. Sin React ni Tauri; los errores son códigos (`DomainError`) que la UI traduce. |
| Aplicación      | `src/application/`        | Casos de uso (carga de vídeo, transcripción, exportación, edición) y los puertos (`ports.ts`) que necesitan del entorno.                                                                                              |
| Infraestructura | `src/infrastructure/`     | Implementaciones de los puertos: comandos Tauri (`tauri/commands.ts` es el único sitio que conoce sus nombres) y alternativas de navegador.                                                                           |
| Estado          | `src/state/`              | Store del proyecto con historial y persistencia (navegador + sesión nativa) y store de la interfaz.                                                                                                                   |
| Interfaz        | `src/ui/`                 | Componentes por panel (transcripción, preview, inspector, línea de tiempo, diálogos), hooks de ciclo de vida y estilos por área.                                                                                      |
| i18n            | `src/i18n/`               | Diccionarios y traductor tipado.                                                                                                                                                                                      |
| Configuración   | `src/config/constants.ts` | Límites, claves de almacenamiento, rutas de assets y otros valores antes dispersos.                                                                                                                                   |

El backend Rust (`src-tauri/src/`) está dividido por capacidad: `media`, `preview`, `export`, `speech`, `fonts`, `documents`, `persistence`, `jobs`, `process` (binarios y ejecución) e `i18n` (mensajes y comando `set_locale`).

## Modelo de edición

Cada palabra conserva su identidad, inicio, fin y visibilidad. Los bloques son agrupaciones de palabras. Omitir no elimina ni desplaza tiempos. Enter divide en un límite de palabra; retroceso al inicio une con el bloque anterior. Suprimir al final une con el siguiente; Shift+Enter añade un salto visual. Una división dentro de una palabra se ajusta al límite de esa palabra: no se inventa su sincronización interna.

La casilla «Solo este bloque» crea un estilo completo independiente. Al dividir se copia; al unir prevalece el primero. La ocultación de un bloque se convierte en ocultación de palabras al unirlo para no revelar texto accidentalmente. Mover un bloque en la línea de tiempo conserva sus intervalos internos y se limita por los vecinos. Cambiar sus extremos en el inspector escala proporcionalmente sus tiempos internos.

En escritorio, el proyecto se guarda en el directorio de datos de Subtle como `session.json`, mediante escritura temporal, sincronización a disco y sustitución atómica. `session.backup.json` conserva la revisión válida anterior. Al arrancar se valida el guardado y, si falla, se intenta recuperar la copia; el almacenamiento del navegador sirve como migración de versiones anteriores. Los fallos de guardado se muestran al usuario. El cierre de ventana espera al guardado pendiente y pide terminar o cancelar un trabajo en curso.

El JSON de proyecto incluye la ruta del original. Al reiniciar o abrir un proyecto se vuelve a cargar el vídeo; si se ha movido, «Localizar vídeo original» permite enlazarlo conservando los subtítulos. El historial de deshacer sigue siendo de sesión (100 operaciones). Guardar una copia manual exporta el JSON y no sobrescribe archivos existentes.

## Transcripción y alineación

El comando nativo ejecuta `scripts/transcribe.py`: Whisper small mediante stable-ts, transcripción con detección de idioma y alineación de guion en español. Se necesita preparar el motor durante el desarrollo:

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
npm run desktop
```

El lanzador y la aplicación de desarrollo de Mac detectan `.venv/bin/python` dentro de este proyecto. El modelo small ya está descargado en `.models/` en este equipo. No es necesario reinstalarlo para probar la app aquí. También puede configurarse `SUBTLE_PYTHON` con una ruta absoluta. La primera ejecución descarga el modelo; el audio y el guion se procesan localmente. El motor se ha probado con un vídeo real de 63 segundos. Los intervalos de duración cero o solapados se redistribuyen localmente entre las palabras afectadas y se marcan como aproximados para revisión; no se eliminan palabras. El inspector permite ajustar los tiempos de cada palabra o marcarlos como revisados. No incluye detección fiable de discrepancias entre guion y voz: los nombres propios deben contrastarse con el guion.

## Exportación

- SRT: texto y tiempos por bloque.
- ASS: estilos, posición y tres modos (normal, progresivo y palabra a palabra).
- EBU STL (Tech 3264): subtítulos abiertos en español, Latin ISO 6937, base de tiempo seleccionable 25/30 fps. Dos líneas de hasta 42 caracteres; rechaza caracteres no implementados y bloques demasiado largos. No incluye animaciones ni estilos avanzados. No altera el vídeo; los tiempos del archivo se cuantizan a la base elegida. Pendiente comprobar interoperabilidad con aplicaciones de broadcast.
- MP4: recodifica **el original**, H.264 CRF 14 preset slow, conserva timestamps de presentación mediante `fps_mode passthrough` y `enc_time_base demux`, copia audio y metadatos de color disponibles. Es una política inicial de alta calidad, no una garantía universal de equivalencia perceptual.

Si el original no tiene lista de edición y su primer fotograma lleva un desplazamiento de composición positivo (grabaciones de Android/WhatsApp), los reproductores de Apple lo muestran desde 0 mientras FFmpeg escribiría un tramo vacío: fotograma negro inicial y vídeo retrasado respecto al audio. En ese caso el vídeo se desplaza para presentar el primer fotograma en 0, conservando los intervalos entre fotogramas y el audio intacto (`video_filter` en `src-tauri/src/process.rs`). Los originales con lista de edición se exportan con sus tiempos exactos.

La exportación de vídeo inicial admite SDR de 8 bits `yuv420p`, sin metadatos de rotación. HDR, 10 bits y formatos distintos se rechazan explícitamente. Un audio incompatible con MP4 provoca error; nunca se recodifica silenciosamente. Se publica la salida una vez completada y no se sobrescriben archivos existentes. Las rutas se pasan como argumentos, sin shell.

La prueba de exportación genera un vídeo sintético y compara resolución, formatos, etiquetas de color, timestamps de cada fotograma y hash del audio comprimido. No sustituye pruebas visuales con material real ni validación HDR/VFR amplia.

## Pendiente antes de una versión distribuible

- Validar el paquete autónomo en un Mac limpio y preparar su equivalente Linux. Los trabajos tienen progreso y cancelación; el cierre de ventana espera a que terminen o se cancelen.
- Ampliar las pruebas de equivalencia de render entre libass nativo y libass WASM. Ambos reciben el mismo ASS y la preview nativa carga las fuentes reales seleccionadas. El navegador usa una fuente libre de respaldo. La preview utiliza solo libass; ante un fallo lo indica sin sustituir la tipografía por un render CSS.
- Automatizar la elección de proxy. El botón «Crear proxy + onda» ya genera H.264 ligero y una forma de onda real; la exportación sigue usando el original y sus dimensiones.
- Recorrido de color HDR/10 bits, orientación y formatos de audio/contenedor adicionales, con fixtures representativos.
- Revisión de desajustes guion/audio y experiencia de corrección de frases completas.
- Validar Linux y distribuir instaladores firmados; incluir licencias de motores y fuentes que se distribuyan.

Fuentes técnicas: [Tauri](https://v2.tauri.app/), [FFmpeg](https://ffmpeg.org/ffmpeg.html), [stable-ts](https://github.com/jianfch/stable-ts), [libass](https://github.com/libass/libass), [EBU Tech 3264](https://tech.ebu.ch/docs/tech/tech3264.pdf).

## Prueba local del vídeo aportado

Los archivos de prueba están en `.local-tests/`, excluidos de Git. El original no se ha modificado. La exportación mantiene los 1.893 fotogramas y sus timestamps, 1080×1920, 30 fps, base temporal 1/19200, yuv420p, BT.709 y rango TV. El hash de los paquetes de audio coincide. El SSIM de la parte superior (60%, sin subtítulos) es 0,995181. La transcripción automática contiene 216 palabras y 42 bloques, con cuatro intervalos marcados para revisar; no es una transcripción editorialmente corregida.

La app de desarrollo está en `src-tauri/target/debug/bundle/macos/Subtle.app`. La compilación autónoma de producción se genera por separado en `src-tauri/target/release/bundle/macos/Subtle.app`.

## Paquete autónomo macOS

```sh
.venv/bin/pip install -r scripts/requirements-macos-arm64.lock.txt
npm run release:mac
```

El proceso empaqueta el worker con Python y sus módulos, FFmpeg/ffprobe con sus bibliotecas y el modelo small ya descargado. La app busca primero los recursos internos. No debe depender de Homebrew, de `.venv` ni de `.models` en ejecución. Se conserva el identificador para mantener los proyectos anteriores. La compilación local actual es **Apple Silicon, macOS 26 o superior**: ese mínimo procede de las bibliotecas instaladas que se han empaquetado. Ampliar la compatibilidad requiere compilar las dependencias contra una versión anterior, no basta con cambiar el número del instalador.

## Firma y notarización

El proceso completo (certificado Developer ID, credenciales de notarización, variables de entorno y verificación en un Mac limpio) está en [`docs/firma-y-notarizacion.md`](docs/firma-y-notarizacion.md).

## Licencias del paquete autónomo

El FFmpeg empaquetado procede de Homebrew y está compilado con `--enable-gpl --enable-version3` (x264, x265, xvid) y sin `--enable-nonfree`, así que ese binario se distribuye bajo GPLv3. Subtle lo ejecuta como proceso independiente y no enlaza con él; aun así, al distribuir hay que incluir los textos de licencia (ya se copian en `runtime/media/licenses/`) y ofrecer el código fuente de FFmpeg y de las bibliotecas GPL correspondientes a las versiones exactas empaquetadas. Whisper y stable-ts son MIT; el modelo `small` se distribuye bajo la licencia de OpenAI Whisper (MIT). La tipografía de respaldo de la preview es Noto Sans (OFL). `runtime/python-licenses/packages.json` inventaría los paquetes Python; `torchaudio`, `Jinja2` y `pyinstaller-hooks-contrib` no declaran licencia en sus metadatos (BSD, BSD y Apache 2.0 respectivamente en sus repositorios).

Subtle es software propietario (ver `LICENSE`); las licencias de terceros del paquete se incluyen con él. Se incluyen inventarios y archivos de licencia disponibles. Antes de distribución pública quedan la revisión de las obligaciones de redistribución y fuentes correspondientes, firma Developer ID y notarización. La firma ad hoc de bibliotecas permite pruebas locales, no acredita una distribución firmada por Apple. El flujo del worker sigue la [documentación de PyInstaller](https://www.pyinstaller.org/en/stable/usage.html).

Verificación local: `npm test`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run check:export` y `node --import tsx scripts/check-export-variants.mjs` (este último usa el FFmpeg empaquetado). Las variantes comprueban timestamps de vídeo/audio con FPS fraccional, VFR y audio retrasado. El informe de un original concreto puede generarse con `scripts/verify-video.py`.

El desfase y el fotograma negro reportados se han reproducido en el archivo afectado (vídeo con inicio en 0,1667 s y sin lista de edición) y quedan corregidos con el desplazamiento descrito en «Exportación». Esto no acredita compatibilidad Linux ni interoperabilidad STL en herramientas externas.
