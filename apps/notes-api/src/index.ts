import { createHttpApp } from "@cli-mcp/adapters-http";
import { emitOpenAPI } from "@cli-mcp/openapi";
import { createNotesRegistry, notesStoreFromEnv } from "@cli-mcp/notes";
import { serve } from "@hono/node-server";

const store = notesStoreFromEnv();
const { registry } = createNotesRegistry(store);
const openapi = emitOpenAPI(registry, { title: "Notes API", version: "0.1.0" });
const app = createHttpApp(registry, { openapiDocument: openapi });

const port = Number(process.env.PORT ?? 8788);

serve({ fetch: app.fetch, port }, (info) => {
  console.error(`Notes API listening on http://localhost:${info.port}`);
  console.error(`OpenAPI: http://localhost:${info.port}/openapi.json`);
  if (store.persistencePath) {
    console.error(`Notes store: ${store.persistencePath}`);
  } else {
    console.error("Notes store: memory (set NOTES_STORE_PATH to share with CLI)");
  }
});
