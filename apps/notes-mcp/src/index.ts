#!/usr/bin/env node
import { runMcpMain } from "@trifold/adapters-mcp";
import { createNotesRegistry, notesStoreFromEnv } from "@trifold/notes";

const store = notesStoreFromEnv();
const { registry } = createNotesRegistry(store);
await runMcpMain({ registry, name: "notes-mcp" });
