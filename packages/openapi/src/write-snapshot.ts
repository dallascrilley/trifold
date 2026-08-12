import { createTasksRegistry } from "@trifold/ops";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emitOpenAPI, stableStringify } from "./emit.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../../../examples/tasks");
mkdirSync(root, { recursive: true });
const { registry } = createTasksRegistry();
const doc = emitOpenAPI(registry, { title: "Tasks API", version: "0.1.0" });
const path = join(root, "openapi.snapshot.json");
writeFileSync(path, stableStringify(doc));
console.log(`Wrote ${path}`);
void dirname;
