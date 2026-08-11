/**
 * Shared CLI entry for MCP apps: choose stdio (default) or Streamable HTTP.
 *
 * Env:
 *   MCP_TRANSPORT=stdio|http   (default stdio)
 *   MCP_HOST=127.0.0.1
 *   MCP_PORT=8790
 *   MCP_PATH=/mcp
 *
 * Args:
 *   --http | --transport http|stdio
 *   --port <n>  --host <host>  --path <path>
 */
import type { Registry } from "@cli-mcp/core";
import { createMcpServer } from "./create-server.js";

export type RunMcpMainOptions = {
  registry: Registry;
  name?: string;
  argv?: string[];
};

function parseArgs(argv: string[]) {
  let transport: "stdio" | "http" | undefined;
  let host: string | undefined;
  let port: number | undefined;
  let path: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--http") {
      transport = "http";
      continue;
    }
    if (a === "--stdio") {
      transport = "stdio";
      continue;
    }
    if (a === "--transport") {
      const v = argv[++i];
      if (v === "http" || v === "stdio") transport = v;
      else throw new Error(`Invalid --transport ${v} (use stdio|http)`);
      continue;
    }
    if (a === "--host") {
      host = argv[++i];
      continue;
    }
    if (a === "--port") {
      port = Number(argv[++i]);
      continue;
    }
    if (a === "--path") {
      path = argv[++i];
      continue;
    }
    if (a === "--help" || a === "-h") {
      console.error(`Usage: mcp [--transport stdio|http] [--http] [--host H] [--port N] [--path /mcp]
Env: MCP_TRANSPORT, MCP_HOST, MCP_PORT, MCP_PATH`);
      process.exit(0);
    }
  }

  const envTransport = process.env.MCP_TRANSPORT?.toLowerCase();
  if (!transport && (envTransport === "http" || envTransport === "stdio")) {
    transport = envTransport;
  }
  transport ??= "stdio";

  host ??= process.env.MCP_HOST ?? "127.0.0.1";
  port ??= process.env.MCP_PORT ? Number(process.env.MCP_PORT) : 8790;
  path ??= process.env.MCP_PATH ?? "/mcp";

  return { transport, host, port, path };
}

export async function runMcpMain(options: RunMcpMainOptions): Promise<void> {
  const argv = options.argv ?? process.argv.slice(2).filter((a) => a !== "--");
  const { transport, host, port, path } = parseArgs(argv);
  const mcp = createMcpServer(options.registry, { name: options.name });

  if (transport === "stdio") {
    await mcp.startStdio();
    return;
  }

  const handle = await mcp.startHttp({ host, port, path });
  console.error(`MCP Streamable HTTP listening on ${handle.url}`);
  console.error(`Health: http://${handle.host}:${handle.port}/healthz`);

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}
