const pad = (n: number, width: number) => n.toString().padStart(width, "0");

/** `mm:ss.cc` clock used across the editor UI. */
export const clock = (seconds: number): string =>
  `${pad(Math.floor(seconds / 60), 2)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;

type TimestampFormat = {
  /** Sub-second units per second (1000 for SRT, 100 for ASS). */
  base: number;
  hourDigits: number;
  separator: string;
  fractionDigits: number;
};

const SRT_FORMAT: TimestampFormat = {
  base: 1000,
  hourDigits: 2,
  separator: ",",
  fractionDigits: 3,
};
const ASS_FORMAT: TimestampFormat = {
  base: 100,
  hourDigits: 1,
  separator: ".",
  fractionDigits: 2,
};

function formatTimestamp(seconds: number, format: TimestampFormat): string {
  const { base } = format;
  const units = Math.round(seconds * base);
  const hours = Math.floor(units / (3600 * base));
  const minutes = Math.floor(units / (60 * base)) % 60;
  const secs = Math.floor(units / base) % 60;
  const fraction = units % base;
  return `${pad(hours, format.hourDigits)}:${pad(minutes, 2)}:${pad(secs, 2)}${format.separator}${pad(fraction, format.fractionDigits)}`;
}

/** `hh:mm:ss,mmm` */
export const srtTimestamp = (seconds: number): string =>
  formatTimestamp(seconds, SRT_FORMAT);

/** `h:mm:ss.cc` */
export const assTimestamp = (seconds: number): string =>
  formatTimestamp(seconds, ASS_FORMAT);
