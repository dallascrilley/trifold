import type { OperationDef, Registry } from "@cli-mcp/core";
import { pathParamNames } from "./paths.js";
import { zodToJsonSchema } from "./zod-schema.js";

export type OpenAPIObject = {
  openapi: "3.1.0";
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
};

function schemaName(opId: string, kind: "Input" | "Output"): string {
  return `${opId.replace(/\./g, "_")}${kind}`;
}

export function emitOpenAPI(
  registry: Registry,
  info: { title: string; version: string },
): OpenAPIObject {
  const paths: OpenAPIObject["paths"] = {};
  const schemas: Record<string, unknown> = {};
  const securitySchemes: Record<string, unknown> = {};
  let needsApiKey = false;
  let needsBearer = false;

  for (const op of registry.listForSurface("http")) {
    const http = op.surfaces.http!;
    const pathItem = (paths[http.path] ??= {});
    const inputName = schemaName(op.id, "Input");
    const outputName = schemaName(op.id, "Output");
    schemas[inputName] = zodToJsonSchema(op.input, inputName);
    schemas[outputName] = zodToJsonSchema(op.output, outputName);

    const params = pathParamNames(http.path).map((name) => ({
      name,
      in: "path" as const,
      required: true,
      schema: { type: "string" },
    }));

    const method = http.method;
    const operation: Record<string, unknown> = {
      operationId: op.id,
      summary: op.summary,
      ...(op.description ? { description: op.description } : {}),
      tags: op.meta.tags ?? [],
      parameters: params,
      responses: {
        [`${http.successStatus ?? 200}`]: {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${outputName}` },
            },
          },
        },
      },
    };

    if (method !== "get" && method !== "delete") {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${inputName}` },
          },
        },
      };
    } else if (params.length === 0) {
      // query-only reads: expose input schema properties as query params when object
      // Keep simple: no query expansion beyond path for v1 sample
    }

    const auth = op.meta.auth ?? "none";
    if (auth === "apiKey") {
      needsApiKey = true;
      operation.security = [{ ApiKeyAuth: [] }];
    } else if (auth === "bearer") {
      needsBearer = true;
      operation.security = [{ BearerAuth: [] }];
    }

    pathItem[method] = operation;
  }

  if (needsApiKey) {
    securitySchemes.ApiKeyAuth = {
      type: "apiKey",
      in: "header",
      name: "X-API-Key",
    };
  }
  if (needsBearer) {
    securitySchemes.BearerAuth = {
      type: "http",
      scheme: "bearer",
    };
  }

  return sortDeep({
    openapi: "3.1.0",
    info: { title: info.title, version: info.version },
    paths,
    components: { schemas, securitySchemes },
  }) as OpenAPIObject;
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortDeep(obj[key]);
    }
    return out;
  }
  return value;
}

/** Used by adapters-http path helper re-export avoidance */
export function listHttpOperationIds(registry: Registry): string[] {
  return registry.listForSurface("http").map((op: OperationDef) => op.id).sort();
}
