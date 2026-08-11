import { Registry } from "@cli-mcp/core";
import { createTasksRegistry } from "@cli-mcp/ops";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createMcpServer, listMcpTools } from "./create-server.js";

const snapshotPath = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../examples/tasks/mcp-tools.snapshot.json",
);

const httpHandles: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  while (httpHandles.length) {
    const h = httpHandles.pop()!;
    await h.close().catch(() => {});
  }
});

describe("MCP adapter", () => {
  it("lists curated tools matching snapshot", () => {
    const { registry } = createTasksRegistry();
    const tools = listMcpTools(registry);
    expect(tools.map((t) => t.name)).not.toContain("tasks_complete");
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["tasks_create", "tasks_get", "tasks_list"].sort(),
    );
    const expected = readFileSync(snapshotPath, "utf8");
    expect(`${JSON.stringify(tools, null, 2)}\n`).toBe(expected);
  });

  it("rejects MCP write without agentDescription at register", () => {
    const reg = new Registry();
    expect(() =>
      reg.register({
        id: "bad.write",
        summary: "bad",
        input: z.object({}),
        output: z.object({ ok: z.boolean() }),
        meta: { sideEffect: "write", auth: "none" },
        surfaces: { mcp: { enabled: true } },
        handler: async () => ({ ok: true }),
      }),
    ).toThrow(/agentDescription/);
  });

  it("createMcpServer exposes listToolNames (stdio path API)", () => {
    const { registry } = createTasksRegistry();
    const mcp = createMcpServer(registry);
    expect(mcp.listToolNames()).toContain("tasks_list");
    expect(mcp.listToolNames()).not.toContain("tasks_complete");
  });

  it("HTTP streamable transport lists tools via client", async () => {
    const { registry } = createTasksRegistry();
    const mcp = createMcpServer(registry, { name: "tasks-mcp-test" });
    const handle = await mcp.startHttp({ host: "127.0.0.1", port: 0 });
    httpHandles.push(handle);

    const client = new Client({ name: "test-client", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(handle.url));
    await client.connect(transport);

    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name).sort();
    expect(names).toEqual(["tasks_create", "tasks_get", "tasks_list"].sort());

    await client.close();
    await transport.close();
  });

  it("healthz reports tools over HTTP", async () => {
    const { registry } = createTasksRegistry();
    const mcp = createMcpServer(registry);
    const handle = await mcp.startHttp({ host: "127.0.0.1", port: 0 });
    httpHandles.push(handle);

    const healthUrl = `http://${handle.host}:${handle.port}/healthz`;
    const res = await fetch(healthUrl);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; tools: string[] };
    expect(body.ok).toBe(true);
    expect(body.tools).toContain("tasks_list");
  });
});
