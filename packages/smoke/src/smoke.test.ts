import { createCli } from "@trifold/adapters-cli";
import { createHttpApp } from "@trifold/adapters-http";
import { createMcpServer } from "@trifold/adapters-mcp";
import { emitOpenAPI } from "@trifold/openapi";
import { createTasksRegistry } from "@trifold/ops";
import { describe, expect, it } from "vitest";

describe("e2e smoke — all three surfaces", () => {
  it("HTTP + CLI + MCP share one registry", async () => {
    const { registry } = createTasksRegistry();
    const openapi = emitOpenAPI(registry, { title: "Tasks API", version: "0.1.0" });
    const app = createHttpApp(registry, { openapiDocument: openapi });

    const createRes = await app.request("/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "dev-key",
      },
      body: JSON.stringify({ title: "Smoke task" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const listRes = await app.request("/tasks");
    const listed = (await listRes.json()) as { tasks: { id: string }[] };
    expect(listed.tasks.some((t) => t.id === created.id)).toBe(true);

    const oa = await app.request("/openapi.json");
    expect(oa.status).toBe(200);
    const doc = (await oa.json()) as { openapi: string };
    expect(doc.openapi).toBe("3.1.0");

    process.env.APP_API_KEY = "dev-key";
    const out: string[] = [];
    const cli = createCli(registry, {
      stdout: (s) => out.push(s),
      stderr: () => {},
    });
    const code = await cli.run(["tasks", "list", "--json"]);
    expect(code).toBe(0);
    expect(out.join("")).toContain("Smoke task");

    const mcp = createMcpServer(registry);
    expect(mcp.listToolNames()).toEqual(
      expect.arrayContaining(["tasks_list", "tasks_get", "tasks_create"]),
    );
    expect(mcp.listToolNames()).not.toContain("tasks_complete");
  });
});
