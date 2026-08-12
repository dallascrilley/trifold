#!/usr/bin/env node
import { createCli } from "@trifold/adapters-cli";
import { createTasksRegistry, tasksStoreFromEnv } from "@trifold/ops";

const store = tasksStoreFromEnv();
const { registry } = createTasksRegistry(store);
const cli = createCli(registry, { name: "trifold", version: "0.1.0" });

const code = await cli.run(process.argv.slice(2));
process.exit(code);
