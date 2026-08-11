import { createHttpApp } from "@cli-mcp/adapters-http";
import { emitOpenAPI } from "@cli-mcp/openapi";
import { createNotesRegistry } from "@cli-mcp/notes";
import { serve } from "@hono/node-server";

const { registry } = createNotesRegistry();
const openapi = emitOpenAPI(registry, { title: "Notes API", version: "0.1.0" });
const app = createHttpApp(registry, { openapiDocument: openapi });

const port = Number(process.env.PORT ?? 8788);

serve({ fetch: app.fetch, port }, (info) => {
  console.error(`Notes API listening on http://localhost:${info.port}`);
  console.error(`OpenAPI: http://localhost:${info.port}/openapi.json`);
});
