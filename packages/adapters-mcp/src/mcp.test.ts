import { Registry } from "@cli-mcp/core";
import { createTasksRegistry } from "@cli-mcp/ops";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMcpServer, listMcpTools } from "./create-server.js";

const snapshotPath = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../examples/tasks/mcp-tools.snapshot.json",
);

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

  it("createMcpServer exposes listToolNames", () => {
    const { registry } = createTasksRegistry();
    const mcp = createMcpServer(registry);
    expect(mcp.listToolNames()).toContain("tasks_list");
    expect(mcp.listToolNames()).not.toContain("tasks_complete");
  });
});
