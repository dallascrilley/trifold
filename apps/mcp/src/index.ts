#!/usr/bin/env node
import { runMcpMain } from "@cli-mcp/adapters-mcp";
import { createTasksRegistry, tasksStoreFromEnv } from "@cli-mcp/ops";

const store = tasksStoreFromEnv();
const { registry } = createTasksRegistry(store);
await runMcpMain({ registry, name: "tasks-mcp" });
