import { createTasksRegistry } from "@trifold/ops";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { listMcpTools } from "./create-server.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../../../examples/tasks");
mkdirSync(root, { recursive: true });
const { registry } = createTasksRegistry();
const tools = listMcpTools(registry);
const path = join(root, "mcp-tools.snapshot.json");
writeFileSync(path, `${JSON.stringify(tools, null, 2)}\n`);
console.log(`Wrote ${path}`);
