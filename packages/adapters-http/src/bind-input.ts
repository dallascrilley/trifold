import type { HttpSurface } from "@trifold/core";

export function pathParamNames(path: string): string[] {
  const names: string[] = [];
  for (const match of path.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) {
    if (match[1]) names.push(match[1]);
  }
  return names;
}

/** Convert OpenAPI-style `/tasks/{id}` to Hono `/tasks/:id`. */
export function toHonoPath(path: string): string {
  return path.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, ":$1");
}

export async function bindHttpInput(
  surface: HttpSurface,
  c: {
    req: {
      param: () => Record<string, string>;
      query: () => Record<string, string>;
      json: () => Promise<unknown>;
    };
  },
): Promise<Record<string, unknown>> {
  const pathParams = c.req.param();
  const method = surface.method.toUpperCase();

  if (method === "GET" || method === "DELETE") {
    return { ...c.req.query(), ...pathParams };
  }

  let body: unknown = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    body = {};
  }
  return { ...(body as Record<string, unknown>), ...pathParams };
}
