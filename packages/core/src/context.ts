import { createLogger } from "./logger.js";
import type { RequestContext, Surface } from "./types.js";

export function createContext(
  partial: Partial<RequestContext> & Pick<RequestContext, "surface">,
): RequestContext {
  return {
    surface: partial.surface,
    requestId: partial.requestId ?? crypto.randomUUID(),
    actor: partial.actor,
    auth: partial.auth,
    signal: partial.signal ?? new AbortController().signal,
    logger: partial.logger ?? createLogger(false),
  };
}

export function requireSurface(surface: Surface): Surface {
  return surface;
}
