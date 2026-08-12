import {
  AppError,
  type AuthRequirement,
  type OperationDef,
  type Registry,
  type SideEffect,
} from "@cli-mcp/core";
import { z, type ZodTypeAny } from "zod";
import { jsonSchemaToZod } from "./json-schema-zod.js";
import { pathParamNames } from "./paths.js";

/** Loose OpenAPI 3.x document (only fields we read). */
export type LooseOpenAPI = {
  openapi?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, unknown> | undefined>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
};

export type ImportOpenAPIOptions = {
  /** Default auth when security is not declared on an operation. */
  defaultAuth?: AuthRequirement;
  /**
   * When true, enable MCP tools for imported ops (writes still need agentDescription
   * which we set from summary — default false to keep curation).
   */
  enableMcp?: boolean;
  /** Tag filter: only import operations that include at least one of these tags. */
  tags?: string[];
};

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function isHttpMethod(m: string): m is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(m);
}

function deriveId(method: string, path: string, operationId?: string): string {
  if (operationId && operationId.trim()) {
    return operationId.trim().replace(/\s+/g, "_");
  }
  const slug = path
    .replace(/^\//, "")
    .replace(/\{([^}]+)\}/g, "$1")
    .replace(/\//g, ".")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${method}.${slug || "root"}`;
}

function sideEffectFor(method: HttpMethod): SideEffect {
  if (method === "get") return "read";
  if (method === "put" || method === "patch") return "idempotent-write";
  return "write";
}

function successStatus(op: Record<string, unknown>): number | undefined {
  const responses = op.responses as Record<string, unknown> | undefined;
  if (!responses) return undefined;
  for (const code of Object.keys(responses).sort()) {
    const n = Number(code);
    if (n >= 200 && n < 300) return n;
  }
  return undefined;
}

function authFromSecurity(
  op: Record<string, unknown>,
  doc: LooseOpenAPI,
  fallback: AuthRequirement,
): AuthRequirement {
  const security = (op.security ?? (doc as { security?: unknown }).security) as
    | Array<Record<string, unknown>>
    | undefined;
  if (!security || security.length === 0) {
    // empty array means optional auth in OAS — treat as none
    if (Array.isArray(op.security) && op.security.length === 0) return "none";
    return fallback;
  }
  const schemes = doc.components?.securitySchemes ?? {};
  for (const req of security) {
    for (const name of Object.keys(req)) {
      const scheme = schemes[name] as { type?: string; scheme?: string } | undefined;
      if (!scheme) continue;
      if (scheme.type === "apiKey") return "apiKey";
      if (scheme.type === "http" && (scheme.scheme === "bearer" || scheme.scheme === "Bearer")) {
        return "bearer";
      }
      if (scheme.type === "http") return "bearer";
    }
  }
  return fallback;
}

function schemaFromParameter(p: Record<string, unknown>, components?: Record<string, unknown>): ZodTypeAny {
  const schema = (p.schema as unknown) ?? { type: "string" };
  let field = jsonSchemaToZod(schema, { components });
  if (!p.required) field = field.optional();
  return field;
}

function requestBodySchema(
  op: Record<string, unknown>,
  components?: Record<string, unknown>,
): ZodTypeAny | undefined {
  const body = op.requestBody as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return undefined;
  const content = body.content as Record<string, { schema?: unknown }> | undefined;
  const json =
    content?.["application/json"] ??
    content?.["application/*+json"] ??
    Object.values(content ?? {})[0];
  if (!json?.schema) return undefined;
  return jsonSchemaToZod(json.schema, { components });
}

function responseBodySchema(
  op: Record<string, unknown>,
  components?: Record<string, unknown>,
): ZodTypeAny {
  const responses = op.responses as Record<string, unknown> | undefined;
  if (!responses) return z.unknown();
  for (const code of Object.keys(responses).sort()) {
    const n = Number(code);
    if (!(n >= 200 && n < 300) && code !== "default") continue;
    const resp = responses[code] as Record<string, unknown>;
    const content = resp?.content as Record<string, { schema?: unknown }> | undefined;
    const json =
      content?.["application/json"] ??
      content?.["application/*+json"] ??
      Object.values(content ?? {})[0];
    if (json?.schema) return jsonSchemaToZod(json.schema, { components });
  }
  return z.unknown();
}

function inputSchemaFor(
  path: string,
  method: HttpMethod,
  op: Record<string, unknown>,
  components?: Record<string, unknown>,
): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};
  for (const name of pathParamNames(path)) {
    shape[name] = z.string().min(1);
  }

  const parameters = op.parameters as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(parameters)) {
    for (const p of parameters) {
      const name = String(p.name ?? "");
      if (!name) continue;
      if (p.in === "path") {
        // Prefer OpenAPI schema for path params when present
        shape[name] = p.schema
          ? jsonSchemaToZod(p.schema, { components })
          : z.string().min(1);
        continue;
      }
      if (p.in === "query" || p.in === "header") {
        shape[name] = schemaFromParameter(p, components);
      }
    }
  }

  const bodyZod = requestBodySchema(op, components);
  if (bodyZod) {
    // Prefer merging object bodies with path/query fields
    if (bodyZod instanceof z.ZodObject) {
      const bodyShape = bodyZod.shape as Record<string, ZodTypeAny>;
      return z.object({ ...shape, ...bodyShape });
    }
    if (Object.keys(shape).length === 0) return bodyZod;
    // Non-object body + path params: wrap
    return z.object({ ...shape, body: bodyZod });
  }

  if (method !== "get" && method !== "delete") {
    return Object.keys(shape).length
      ? z.object(shape).passthrough()
      : z.object({}).passthrough();
  }
  if (Object.keys(shape).length === 0) {
    return z.object({}).passthrough();
  }
  return z.object(shape);
}

function stubHandler(id: string) {
  return async () => {
    throw new AppError("NOT_IMPLEMENTED", `Handler not implemented for imported operation: ${id}`, {
      status: 501,
    });
  };
}

function cliCommandFromId(id: string): string {
  // tasks.create → tasks create; get.users.id → get users id
  return id.replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Convert OpenAPI paths/operations into OperationDef stubs.
 * Handlers throw NOT_IMPLEMENTED until replaced.
 */
export function openApiToOperations(
  doc: LooseOpenAPI,
  options: ImportOpenAPIOptions = {},
): OperationDef[] {
  const paths = doc.paths ?? {};
  const ops: OperationDef[] = [];
  const defaultAuth = options.defaultAuth ?? "none";
  const tagFilter = options.tags?.length ? new Set(options.tags) : null;

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const [methodRaw, opRaw] of Object.entries(pathItem)) {
      const method = methodRaw.toLowerCase();
      if (!isHttpMethod(method)) continue;
      if (!opRaw || typeof opRaw !== "object") continue;
      const op = opRaw as Record<string, unknown>;

      const tags = Array.isArray(op.tags) ? (op.tags as string[]) : [];
      if (tagFilter) {
        if (!tags.some((t) => tagFilter.has(t))) continue;
      }

      const id = deriveId(method, path, typeof op.operationId === "string" ? op.operationId : undefined);
      const summary =
        (typeof op.summary === "string" && op.summary) ||
        (typeof op.description === "string" && op.description) ||
        `${method.toUpperCase()} ${path}`;
      const description = typeof op.description === "string" ? op.description : undefined;
      const sideEffect = sideEffectFor(method);
      const auth = authFromSecurity(op, doc, defaultAuth);
      const status = successStatus(op);

      const components = doc.components?.schemas;
      const def: OperationDef = {
        id,
        summary,
        ...(description ? { description } : {}),
        input: inputSchemaFor(path, method, op, components),
        output: responseBodySchema(op, components),
        meta: {
          sideEffect,
          auth,
          ...(tags.length ? { tags } : {}),
        },
        surfaces: {
          http: {
            method,
            path,
            ...(status !== undefined ? { successStatus: status } : {}),
          },
          cli: {
            command: cliCommandFromId(id),
            positional: pathParamNames(path),
          },
          ...(options.enableMcp
            ? {
                mcp: {
                  enabled: true,
                  agentDescription: summary,
                },
              }
            : {}),
        },
        handler: stubHandler(id),
      };
      ops.push(def);
    }
  }

  return ops.sort((a, b) => a.id.localeCompare(b.id));
}

/** Register imported stubs on a registry. Returns the operations registered. */
export function registerOpenApiStubs(
  registry: Registry,
  doc: LooseOpenAPI,
  options: ImportOpenAPIOptions = {},
): OperationDef[] {
  const ops = openApiToOperations(doc, options);
  for (const op of ops) {
    registry.register(op);
  }
  return ops;
}

/**
 * Emit a TypeScript skeleton for implementing imported handlers.
 */
export function emitHandlerSkeleton(ops: OperationDef[]): string {
  const ids = ops.map((o) => o.id);
  const table = ops
    .map(
      (o) =>
        `// - ${o.id}: ${o.surfaces.http?.method?.toUpperCase()} ${o.surfaces.http?.path} — ${o.summary}`,
    )
    .join("\n");

  return `// Generated from OpenAPI import — implement handlers below.
// Operations:
${table}

import { Registry } from "@cli-mcp/core";
import { openApiToOperations, parseOpenAPIJson } from "@cli-mcp/openapi";
import { readFileSync } from "node:fs";

export const importedOperationIds = ${JSON.stringify(ids, null, 2)} as const;

export function buildRegistryFromOpenAPI(openapiPath: string): Registry {
  const doc = parseOpenAPIJson(readFileSync(openapiPath, "utf8"));
  const registry = new Registry();
  for (const stub of openApiToOperations(doc)) {
    registry.register({
      ...stub,
      handler: async (ctx, input) => {
        // TODO: implement \${stub.id}
        void ctx;
        void input;
        throw new Error(\`Not implemented: \${stub.id}\`);
      },
    });
  }
  return registry;
}
`;
}

/** Load OpenAPI JSON from a string. */
export function parseOpenAPIJson(text: string): LooseOpenAPI {
  const doc = JSON.parse(text) as LooseOpenAPI;
  if (!doc || typeof doc !== "object") {
    throw new Error("OpenAPI document must be a JSON object");
  }
  if (!doc.paths || typeof doc.paths !== "object") {
    throw new Error("OpenAPI document missing paths");
  }
  return doc;
}
