#!/usr/bin/env node
import { createCli } from "@cli-mcp/adapters-cli";
import { createNotesRegistry, notesStoreFromEnv } from "@cli-mcp/notes";

const store = notesStoreFromEnv();
const { registry } = createNotesRegistry(store);
const cli = createCli(registry, { name: "notes-cli", version: "0.1.0" });

const code = await cli.run(process.argv.slice(2));
process.exit(code);
