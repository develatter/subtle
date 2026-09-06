/**
 * Domain error codes. The domain never produces user-facing prose: the UI
 * translates each code into the active language.
 */
export type DomainErrorCode =
  | "block.retimeOutOfRange"
  | "word.retimeOutOfRange"
  | "block.insertInvalid"
  | "block.insertOverlap"
  | "project.invalid"
  | "project.invalidBlock"
  | "project.invalidWords"
  | "stl.unsupportedCharacter"
  | "stl.tooManyBlocks"
  | "stl.timeOutOfRange"
  | "stl.wordTooLong"
  | "stl.tooManyRows"
  | "stl.blockTooLong"
  | "stl.blockTooShort";

export type DomainErrorParams = Record<string, string | number>;

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly params: DomainErrorParams;

  constructor(code: DomainErrorCode, params: DomainErrorParams = {}) {
    super(code);
    this.name = "DomainError";
    this.code = code;
    this.params = params;
  }
}

export const isDomainError = (error: unknown): error is DomainError =>
  error instanceof DomainError;
