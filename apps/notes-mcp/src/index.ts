#!/usr/bin/env node
import { createMcpServer } from "@cli-mcp/adapters-mcp";
import { createNotesRegistry } from "@cli-mcp/notes";

const { registry } = createNotesRegistry();
const mcp = createMcpServer(registry);
await mcp.start();
