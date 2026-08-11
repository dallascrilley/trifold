import {
  type Credentials,
  type Registry,
  authorize,
  createContext,
  invokeOperation,
  isAppError,
  toAppError,
} from "@cli-mcp/core";
import { Hono } from "hono";
import { bindHttpInput, toHonoPath } from "./bind-input.js";

export type CreateHttpAppOptions = {
  openapiDocument?: unknown;
  /** Override credential extraction (tests). */
  getCredentials?: (c: {
    req: { header: (name: string) => string | undefined };
  }) => Credentials;
};

function defaultCredentials(c: {
  req: { header: (name: string) => string | undefined };
}): Credentials {
  const apiKey = c.req.header("x-api-key") ?? undefined;
  const auth = c.req.header("authorization");
  let bearer: string | undefined;
  if (auth?.toLowerCase().startsWith("bearer ")) {
    bearer = auth.slice(7).trim();
  }
  return { apiKey: apiKey ?? bearer, bearer };
}

export function createHttpApp(
  registry: Registry,
  options: CreateHttpAppOptions = {},
): Hono {
  const app = new Hono();
  const getCredentials = options.getCredentials ?? defaultCredentials;

  app.get("/healthz", (c) => c.json({ ok: true }));

  if (options.openapiDocument !== undefined) {
    app.get("/openapi.json", (c) => c.json(options.openapiDocument));
  }

  for (const op of registry.listForSurface("http")) {
    const http = op.surfaces.http!;
    const method = http.method;
    const path = toHonoPath(http.path);
    const successStatus = http.successStatus ?? 200;

    app[method](path, async (c) => {
      try {
        const creds = getCredentials(c);
        const authResult = authorize(op, creds);
        const ctx = createContext({
          surface: "http",
          requestId: c.req.header("x-request-id") ?? crypto.randomUUID(),
          actor: authResult.actor,
          auth: authResult.auth,
          signal: c.req.raw.signal,
        });
        const input = await bindHttpInput(http, c);
        const result = await invokeOperation(registry, op.id, input, ctx);
        return c.json(result, successStatus as 200);
      } catch (err) {
        const appErr = isAppError(err) ? err : toAppError(err);
        return c.json(appErr.toJSON(), appErr.status as 400);
      }
    });
  }

  return app;
}
