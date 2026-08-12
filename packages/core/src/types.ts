import type { z } from "zod";

export type SideEffect = "read" | "write" | "idempotent-write";
export type Surface = "http" | "cli" | "mcp";
export type AuthRequirement = "none" | "apiKey" | "bearer";

export type Actor = {
  id: string;
  kind: "user" | "service" | "agent" | "anonymous";
};

export type AuthInfo = {
  type: string;
  /** Non-secret reference only (e.g. last4 or env var name). Never the raw token. */
  tokenRef?: string;
};

export type Logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
};

export type RequestContext = {
  surface: Surface;
  requestId: string;
  actor?: Actor;
  auth?: AuthInfo;
  signal: AbortSignal;
  logger: Logger;
};

export type HttpSurface = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  successStatus?: number;
};

export type CliSurface = {
  command: string;
  positional?: string[];
  hidden?: boolean;
};

export type McpSurface = {
  enabled: boolean;
  toolName?: string;
  agentDescription?: string;
  scopes?: string[];
};

export type OperationSurfaces = {
  http?: HttpSurface;
  cli?: CliSurface;
  mcp?: McpSurface;
};

export type OperationMeta = {
  sideEffect: SideEffect;
  auth?: AuthRequirement;
  tags?: string[];
};

// Defaults use `any` so concrete handlers remain assignable when stored in Registry.
export type OperationDef<I = any, O = any> = {
  id: string;
  summary: string;
  description?: string;
  input: z.ZodType<I>;
  output: z.ZodType<O>;
  meta: OperationMeta;
  surfaces: OperationSurfaces;
  handler: (ctx: RequestContext, input: I) => Promise<O>;
};
