declare module "libass-wasm" {
  export default class SubtitlesOctopus {
    constructor(options: {
      canvas: HTMLCanvasElement;
      subContent: string;
      workerUrl: string;
      legacyWorkerUrl: string;
      fonts?: string[];
      fallbackFont?: string;
      onReady?: () => void;
      onError?: (error: unknown) => void;
      debug?: boolean;
      targetFps?: number;
    });
    setTrack(content: string): void;
    setCurrentTime(seconds: number): void;
    resize(width: number, height: number, top?: number, left?: number): void;
    dispose(): void;
  }
}
