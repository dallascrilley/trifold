#!/usr/bin/env node
import { runMcpMain } from "@cli-mcp/adapters-mcp";
import { createTasksRegistry } from "@cli-mcp/ops";

const { registry } = createTasksRegistry();
await runMcpMain({ registry, name: "tasks-mcp" });
