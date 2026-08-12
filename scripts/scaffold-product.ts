#!/usr/bin/env node
/**
 * Scaffold a new product domain + api/cli/mcp apps into this monorepo.
 *
 * Usage:
 *   pnpm scaffold -- notes
 *   pnpm scaffold -- order-items --title "Order Items"
 *   pnpm scaffold -- widgets --dry-run
 */
import { scaffoldProduct } from "../packages/scaffold/src/index.ts";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function usage(): never {
  console.error(`Usage: pnpm scaffold -- <slug> [--title "Title"] [--dry-run]

  slug     kebab-case product id (e.g. notes, order-items)
  --title  optional display title
  --dry-run  print planned files without writing

After scaffolding:
  pnpm install
  pnpm --filter @trifold/<slug> test
  pnpm --filter @trifold-app/<slug>-api dev
  pnpm --filter @trifold-app/<slug>-cli start -- <slug> list --json
`);
  process.exit(2);
}

// pnpm/npm may pass a bare "--" separator; strip it.
const args = process.argv.slice(2).filter((a) => a !== "--");
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  usage();
}

let slug: string | undefined;
let title: string | undefined;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i]!;
  if (a === "--dry-run") {
    dryRun = true;
    continue;
  }
  if (a === "--title") {
    title = args[++i];
    continue;
  }
  if (a.startsWith("-")) {
    console.error(`Unknown flag: ${a}`);
    usage();
  }
  if (slug) {
    console.error("Only one slug allowed");
    usage();
  }
  slug = a;
}

if (!slug) usage();

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

try {
  const result = scaffoldProduct({ root, slug, title, dryRun });
  if (dryRun) {
    console.log(`Would create ${result.files.length} files for '${result.slug}' (${result.title}):`);
    for (const f of result.files) console.log(`  ${f.path}`);
  } else {
    console.log(`Scaffolded product '${result.slug}' (${result.title})`);
    console.log(`  domain: packages/${result.slug}  (@trifold/${result.slug})`);
    console.log(`  apps:   ${result.slug}-api | ${result.slug}-cli | ${result.slug}-mcp`);
    console.log(`  wrote ${result.written.length} files`);
    console.log("");
    console.log("Next:");
    console.log("  pnpm install");
    console.log(`  pnpm --filter @trifold/${result.slug} test`);
    console.log(`  pnpm --filter @trifold-app/${result.slug}-api dev`);
    console.log(`  APP_API_KEY=dev-key pnpm --filter @trifold-app/${result.slug}-cli start -- ${result.slug} create "First item" --json`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
