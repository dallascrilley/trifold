#!/usr/bin/env node
/**
 * Import OpenAPI → OperationDef stubs (handlers NOT_IMPLEMENTED).
 *
 * Usage:
 *   pnpm openapi:import -- path/to/openapi.json
 *   pnpm openapi:import -- path/to/openapi.json --json
 *   pnpm openapi:import -- path/to/openapi.json --skeleton > handlers.ts
 *   pnpm openapi:import -- path/to/openapi.json --mcp --tags tasks
 */
import {
  emitHandlerSkeleton,
  openApiToOperations,
  parseOpenAPIJson,
} from "../packages/openapi/src/index.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function usage(): never {
  console.error(`Usage: pnpm openapi:import -- <openapi.json> [options]

Options:
  --json       Print machine-readable stub summary
  --skeleton   Print TypeScript handler skeleton
  --mcp        Enable MCP surfaces on imported ops (default off)
  --tags a,b   Only import operations with these tags
  --help
`);
  process.exit(2);
}

const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length === 0 || args.includes("-h") || args.includes("--help")) usage();

let file: string | undefined;
let asJson = false;
let skeleton = false;
let enableMcp = false;
let tags: string[] | undefined;

for (let i = 0; i < args.length; i++) {
  const a = args[i]!;
  if (a === "--json") {
    asJson = true;
    continue;
  }
  if (a === "--skeleton") {
    skeleton = true;
    continue;
  }
  if (a === "--mcp") {
    enableMcp = true;
    continue;
  }
  if (a === "--tags") {
    tags = (args[++i] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    continue;
  }
  if (a.startsWith("-")) {
    console.error(`Unknown flag: ${a}`);
    usage();
  }
  if (file) {
    console.error("Only one OpenAPI file allowed");
    usage();
  }
  file = a;
}

if (!file) usage();

const abs = resolve(file);
const doc = parseOpenAPIJson(readFileSync(abs, "utf8"));
const stubs = openApiToOperations(doc, { enableMcp, tags });

if (skeleton) {
  process.stdout.write(emitHandlerSkeleton(stubs));
  process.exit(0);
}

const summary = stubs.map((s) => ({
  id: s.id,
  summary: s.summary,
  method: s.surfaces.http?.method,
  path: s.surfaces.http?.path,
  successStatus: s.surfaces.http?.successStatus,
  sideEffect: s.meta.sideEffect,
  auth: s.meta.auth ?? "none",
  tags: s.meta.tags ?? [],
  mcp: Boolean(s.surfaces.mcp?.enabled),
  cli: s.surfaces.cli?.command,
}));

if (asJson) {
  console.log(JSON.stringify({ file: abs, count: summary.length, operations: summary }, null, 2));
} else {
  console.error(`Imported ${summary.length} operation stub(s) from ${abs}`);
  for (const s of summary) {
    const method = (s.method ?? "?").toUpperCase().padEnd(6);
    console.log(
      `${s.id.padEnd(24)} ${method} ${s.path}  auth=${s.auth}  ${s.sideEffect}${s.mcp ? "  mcp" : ""}`,
    );
  }
  console.error("\nHandlers are NOT_IMPLEMENTED until you register with custom handlers.");
  console.error("Tip: pnpm openapi:import -- <file> --skeleton > handlers.stub.ts");
}
