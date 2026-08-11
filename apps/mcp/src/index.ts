#!/usr/bin/env node
import { createMcpServer } from "@cli-mcp/adapters-mcp";
import { createTasksRegistry } from "@cli-mcp/ops";

const { registry } = createTasksRegistry();
const mcp = createMcpServer(registry);
await mcp.start();
