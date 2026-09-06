import { createContext, useContext, useRef, type ReactNode } from "react";
import { openLocalFile, pickVideo } from "../../application/media";
import { describeError } from "../../application/errors";
import {
  importScriptFile,
  openProjectFile,
} from "../../application/projectFiles";
import { services } from "../../infrastructure/services";
import { useTranslation } from "../../i18n";
import { useEditorStore } from "../../state/editorStore";

export type FilePickers = {
  /** Native picker on desktop, file input on the web. */
  loadVideo: (options?: { relink?: boolean }) => void;
  openProject: () => void;
  importScript: () => void;
};

const FilePickersContext = createContext<FilePickers | null>(null);

/** Hosts the hidden file inputs used by the web build. */
export function FilePickersProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const videoInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const scriptInput = useRef<HTMLInputElement>(null);
  const pickers: FilePickers = {
    loadVideo: (options) => {
      if (services.media) void pickVideo(options);
      else videoInput.current?.click();
    },
    openProject: () => projectInput.current?.click(),
    importScript: () => scriptInput.current?.click(),
  };
  const firstFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    return file;
  };
  return (
    <FilePickersContext.Provider value={pickers}>
      {children}
      <input
        ref={videoInput}
        hidden
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = firstFile(e);
          if (file) openLocalFile(file);
        }}
      />
      <input
        ref={scriptInput}
        hidden
        type="file"
        accept=".txt"
        onChange={(e) => {
          const file = firstFile(e);
          if (file) void importScriptFile(file);
        }}
      />
      <input
        ref={projectInput}
        hidden
        type="file"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          try {
            if (file) await openProjectFile(file);
          } catch (error) {
            useEditorStore.getState().notify(describeError(error, t));
          }
          e.target.value = "";
        }}
      />
    </FilePickersContext.Provider>
  );
}

export function useFilePickers(): FilePickers {
  const pickers = useContext(FilePickersContext);
  if (!pickers) throw Error("useFilePickers requires FilePickersProvider");
  return pickers;
}
