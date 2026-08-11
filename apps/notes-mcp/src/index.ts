#!/usr/bin/env node
import { runMcpMain } from "@cli-mcp/adapters-mcp";
import { createNotesRegistry, notesStoreFromEnv } from "@cli-mcp/notes";

const store = notesStoreFromEnv();
const { registry } = createNotesRegistry(store);
await runMcpMain({ registry, name: "notes-mcp" });
