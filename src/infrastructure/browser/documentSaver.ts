import type { DocumentSaver } from "../../application/ports";

const REVOKE_DELAY_MS = 1000;

/** Triggers a browser download through a temporary object URL. */
export const browserDocumentSaver: DocumentSaver = {
  async save(name, data) {
    const url = URL.createObjectURL(
      new Blob([data as BlobPart], { type: "application/octet-stream" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
    return null;
  },
};
