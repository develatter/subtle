# Subtle · guía para agentes y colaboradores

Editor local de subtítulos para vídeos verticales. Escritorio con Tauri 2 (Rust), interfaz React 19 + TypeScript, worker de transcripción en Python (stable-ts/Whisper), FFmpeg/ffprobe y libass (nativo en exportación, WASM en la preview).

## Comandos

```sh
npm run desktop            # app de escritorio en desarrollo (detecta .venv y .models)
npm run dev                # solo la interfaz web en http://127.0.0.1:1420
npm test                   # tests de dominio y persistencia (node:test)
npm run test:ui            # prueba de humo de la interfaz con Playwright
npm run build              # tsc + vite
npm run check:export       # exportación real con FFmpeg
npm run format             # prettier
cargo clippy --manifest-path src-tauri/Cargo.toml   # sin avisos
cargo test --manifest-path src-tauri/Cargo.toml
python3 scripts/check-speech.py                     # desde scripts/
```

Antes de dar algo por terminado: `npm test`, `npm run build`, clippy y `cargo test` en verde, y Prettier aplicado.

## Arquitectura (frontend)

Dependencias solo hacia dentro: `ui → application → domain`.

| Capa            | Ruta                      | Regla                                                                                                          |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Dominio         | `src/domain/`             | Puro. Sin React, Tauri, DOM ni texto de interfaz. Los errores son `DomainError` con código.                    |
| Aplicación      | `src/application/`        | Casos de uso y puertos (`ports.ts`). Habla con el entorno solo a través de los puertos.                        |
| Infraestructura | `src/infrastructure/`     | Implementaciones de los puertos. `tauri/commands.ts` es el único sitio que conoce nombres de comandos nativos. |
| Estado          | `src/state/`              | Stores zustand: proyecto (con historial y persistencia) e interfaz.                                            |
| Interfaz        | `src/ui/`                 | Componentes por panel, hooks, estilos por área en `ui/styles/`.                                                |
| i18n            | `src/i18n/`               | `es.ts` define las claves; `en.ts` debe tener las mismas.                                                      |
| Config          | `src/config/constants.ts` | Límites, claves de almacenamiento, rutas de assets. Nada mágico en los componentes.                            |

Backend Rust en `src-tauri/src/`, un módulo por capacidad (`media`, `preview`, `export`, `speech`, `fonts`, `documents`, `persistence`, `jobs`, `process`, `i18n`). Un comando nuevo se registra en `main.rs` y se refleja en `commands.ts` y en los puertos.

## Reglas

- **No romper el formato de proyecto** (`version: 1`), los nombres de comandos nativos ni el protocolo del worker (`@subtle` en stderr, JSON en stdout) sin actualizar validación, tests y README.
- **Sin texto de interfaz fuera de i18n.** Frontend: `t("clave")` o `translate()` fuera de React. Rust: `Msg` en `i18n.rs`. Python: `MESSAGES` en `transcribe.py`. Añadir la clave en los dos idiomas.
- **Tiempos de las palabras son sagrados.** Editar, omitir o dividir nunca desplaza palabras vecinas. Cualquier operación nueva del dominio necesita test en `tests/`.
- **Exportación:** los timestamps del original se conservan; la única excepción documentada es el desplazamiento de `video_filter` para originales sin edit list. Cambios en `export-args.json` pasan por `npm run check:export` y `check-export-variants.mjs`.
- **Nada bloquea la UI:** los trabajos nativos van por `jobs::Ticket` con progreso y cancelación; uno a la vez.
- **Persistencia:** escritura temporal + rename, copia de seguridad validada. No escribir archivos de usuario sin pasar por un diálogo.
- **Estilo:** Prettier por defecto, TypeScript estricto, sin `any`, sin comentarios que repitan el código; comentar el porqué. Rust con `cargo fmt` y clippy limpio. Español en textos de usuario y README; inglés en código, comentarios e identificadores.
- **Commits:** solo cuando se pidan. Mensajes en imperativo, una línea de resumen.
