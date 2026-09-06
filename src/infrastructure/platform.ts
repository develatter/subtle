import { isTauri } from "@tauri-apps/api/core";

/** True when running inside the Tauri desktop shell. */
export const isDesktop = (): boolean => isTauri();
