#!/usr/bin/env node
import { runMcpMain } from "@trifold/adapters-mcp";
import { createTasksRegistry, tasksStoreFromEnv } from "@trifold/ops";

const store = tasksStoreFromEnv();
const { registry } = createTasksRegistry(store);
await runMcpMain({ registry, name: "tasks-mcp" });
