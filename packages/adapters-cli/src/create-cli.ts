import {
  type OperationDef,
  type Registry,
  authorize,
  createContext,
  invokeOperation,
  isAppError,
  resolveCredentialsFromEnv,
  toAppError,
} from "@cli-mcp/core";
import { defineCommand, runMain } from "citty";
import { z } from "zod";
import { type OutputFormat, formatOutput } from "./format.js";

export type CreateCliOptions = {
  name?: string;
  version?: string;
  /** Capture stdout/stderr for tests instead of writing to process streams. */
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
};

type FlagKind = "string" | "boolean";

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, "");
}

function inputKeys(op: OperationDef): string[] {
  const shape = (op.input as z.ZodObject<z.ZodRawShape>).shape;
  if (!shape) return [];
  return Object.keys(shape);
}

function flagMeta(op: OperationDef, key: string): FlagKind {
  try {
    const shape = (op.input as z.ZodObject<z.ZodRawShape>).shape;
    let schema: z.ZodTypeAny | undefined = shape?.[key];
    if (!schema) return "string";
    while (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) {
      schema = schema._def.innerType as z.ZodTypeAny;
    }
    if (schema instanceof z.ZodBoolean) return "boolean";
  } catch {
    /* ignore */
  }
  return "string";
}

function buildInput(op: OperationDef, args: Record<string, unknown>): Record<string, unknown> {
  const positionals = op.surfaces.cli?.positional ?? [];
  const input: Record<string, unknown> = {};
  const rawArgs = (args._args as string[] | undefined) ?? [];

  positionals.forEach((key, i) => {
    if (rawArgs[i] !== undefined) input[key] = rawArgs[i];
  });

  for (const key of inputKeys(op)) {
    if (positionals.includes(key)) continue;
    const flag = kebab(key);
    if (args[flag] !== undefined) input[key] = args[flag];
    // also accept camelCase from citty
    if (args[key] !== undefined) input[key] = args[key];
  }

  return input;
}

// citty's CommandDef generics are awkward for dynamic trees; keep untyped at the edges.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = any;

function nestCommands(ops: OperationDef[], options: CreateCliOptions): AnyCommand {
  type Node = {
    children: Map<string, Node>;
    op?: OperationDef;
  };

  const root: Node = { children: new Map() };

  for (const op of ops) {
    const parts = op.surfaces.cli!.command.trim().split(/\s+/);
    let node = root;
    for (const part of parts) {
      if (!node.children.has(part)) node.children.set(part, { children: new Map() });
      node = node.children.get(part)!;
    }
    node.op = op;
  }

  function toCommand(name: string, node: Node): AnyCommand {
    if (node.op && node.children.size === 0) {
      return leafCommand(name, node.op, options);
    }

    const subCommands: Record<string, AnyCommand> = {};
    for (const [childName, child] of node.children) {
      subCommands[childName] = toCommand(childName, child);
    }

    // No `run` on intermediate nodes — citty would invoke it after the leaf.
    return defineCommand({
      meta: { name, description: name },
      subCommands,
    });
  }

  const subCommands: Record<string, AnyCommand> = {};
  for (const [name, child] of root.children) {
    subCommands[name] = toCommand(name, child);
  }

  return defineCommand({
    meta: {
      name: options.name ?? "cli-mcp",
      version: options.version ?? "0.1.0",
      description: "CLI generated from Operation Registry",
    },
    subCommands,
  });
}

function leafCommand(name: string, op: OperationDef, options: CreateCliOptions): AnyCommand {
  const positionals = op.surfaces.cli?.positional ?? [];
  const argsDef: Record<string, { type: "string" | "boolean"; description?: string }> = {
    format: { type: "string", description: "json | table | text" },
    json: { type: "boolean", description: "Shortcut for --format json" },
    verbose: { type: "boolean", description: "Verbose logging" },
  };

  for (const key of inputKeys(op)) {
    if (positionals.includes(key)) continue;
    const kind = flagMeta(op, key);
    argsDef[kebab(key)] = {
      type: kind,
      description: key,
    };
  }

  return defineCommand({
    meta: {
      name,
      description: op.summary,
    },
    args: argsDef,
    async run({ args }: { args: Record<string, unknown> }) {
      const writeOut = options.stdout ?? ((s: string) => process.stdout.write(s));
      const writeErr = options.stderr ?? ((s: string) => process.stderr.write(s));

      // citty puts positional leftovers differently; gather from process.argv after command path
      const argv = process.argv.slice(2);
      const cmdParts = op.surfaces.cli!.command.trim().split(/\s+/);
      let idx = 0;
      for (const part of cmdParts) {
        const at = argv.indexOf(part, idx);
        if (at === -1) break;
        idx = at + 1;
      }
      const positionalValues: string[] = [];
      for (let i = idx; i < argv.length; i++) {
        const a = argv[i]!;
        if (a.startsWith("-")) break;
        positionalValues.push(a);
      }

      const mergedArgs = { ...args, _args: positionalValues };
      const input = buildInput(op, mergedArgs);

      try {
        const authResult = authorize(op, resolveCredentialsFromEnv());
        const ctx = createContext({
          surface: "cli",
          actor: authResult.actor,
          auth: authResult.auth,
        });
        const result = await invokeOperation(
          // registry closed over via run wrapper — see createCli
          (op as OperationDef & { __registry?: Registry }).__registry!,
          op.id,
          input,
          ctx,
        );

        let format: OutputFormat = "table";
        if (args.json) format = "json";
        else if (typeof args.format === "string") {
          const f = args.format as string;
          if (f === "json" || f === "table" || f === "text") format = f;
        } else if (!process.stdout.isTTY) {
          format = "json";
        }

        writeOut(formatOutput(result, format));
      } catch (err) {
        const appErr = isAppError(err) ? err : toAppError(err);
        writeErr(`${appErr.code}: ${appErr.message}\n`);
        // Signal failure without rethrowing into citty (avoids stack spam).
        (globalThis as { __cliMcpExitCode?: number }).__cliMcpExitCode = 1;
      }
    },
  });
}

export function createCli(registry: Registry, options: CreateCliOptions = {}) {
  const ops = registry.listForSurface("cli").map((op) => {
    const wrapped = op as OperationDef & { __registry?: Registry };
    wrapped.__registry = registry;
    return wrapped;
  });

  const main = nestCommands(ops, options);

  return {
    main,
    async run(argv: string[]): Promise<number> {
      const prevArgv = process.argv;
      const g = globalThis as { __cliMcpExitCode?: number };
      g.__cliMcpExitCode = 0;
      process.argv = [prevArgv[0] ?? "node", prevArgv[1] ?? "cli", ...argv];
      try {
        await runMain(main);
        return g.__cliMcpExitCode ?? 0;
      } catch (err) {
        if (err && typeof err === "object" && "exitCode" in err) {
          return Number((err as { exitCode: number }).exitCode) || 1;
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (/Usage|Unknown/i.test(msg)) return 2;
        return g.__cliMcpExitCode || 1;
      } finally {
        process.argv = prevArgv;
      }
    },
  };
}
