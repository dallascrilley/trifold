#!/usr/bin/env node
import { createCli } from "@cli-mcp/adapters-cli";
import { createTasksRegistry, tasksStoreFromEnv } from "@cli-mcp/ops";

const store = tasksStoreFromEnv();
const { registry } = createTasksRegistry(store);
const cli = createCli(registry, { name: "cli-mcp", version: "0.1.0" });

const code = await cli.run(process.argv.slice(2));
process.exit(code);
