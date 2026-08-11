import { createHttpApp } from "@cli-mcp/adapters-http";
import { emitOpenAPI } from "@cli-mcp/openapi";
import { createTasksRegistry, tasksStoreFromEnv } from "@cli-mcp/ops";
import { serve } from "@hono/node-server";

const store = tasksStoreFromEnv();
const { registry } = createTasksRegistry(store);
const openapi = emitOpenAPI(registry, { title: "Tasks API", version: "0.1.0" });
const app = createHttpApp(registry, { openapiDocument: openapi });

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.error(`API listening on http://localhost:${info.port}`);
  console.error(`OpenAPI: http://localhost:${info.port}/openapi.json`);
  if (store.persistencePath) {
    console.error(`Tasks store: ${store.persistencePath}`);
  } else {
    console.error("Tasks store: memory (set TASKS_STORE_PATH to share with CLI)");
  }
});
