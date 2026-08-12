import type { Logger } from "./types.js";

export function createLogger(verbose = false): Logger {
  return {
    debug: (msg, meta) => {
      if (verbose) console.error(`[debug] ${msg}`, meta ?? "");
    },
    info: (msg, meta) => {
      if (verbose) console.error(`[info] ${msg}`, meta ?? "");
    },
    warn: (msg, meta) => {
      console.error(`[warn] ${msg}`, meta ?? "");
    },
    error: (msg, meta) => {
      console.error(`[error] ${msg}`, meta ?? "");
    },
  };
}
