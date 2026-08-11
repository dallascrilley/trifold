#!/usr/bin/env node
import { runMcpMain } from "@cli-mcp/adapters-mcp";
import { createNotesRegistry } from "@cli-mcp/notes";

const { registry } = createNotesRegistry();
await runMcpMain({ registry, name: "notes-mcp" });
