import { createContext, invokeOperation } from "@trifold/core";
import { describe, expect, it } from "vitest";
import { createTasksRegistry } from "./ops.js";

describe("tasks domain", () => {
  it("create, list, get, complete", async () => {
    const { registry, store } = createTasksRegistry();
    const ctx = createContext({ surface: "cli" });

    const created = (await invokeOperation(
      registry,
      "tasks.create",
      { title: "Buy milk" },
      ctx,
    )) as { id: string; title: string; done: boolean };

    expect(created.title).toBe("Buy milk");
    expect(created.done).toBe(false);

    const listed = (await invokeOperation(registry, "tasks.list", {}, ctx)) as {
      tasks: { id: string }[];
    };
    expect(listed.tasks).toHaveLength(1);

    const got = (await invokeOperation(
      registry,
      "tasks.get",
      { id: created.id },
      ctx,
    )) as { id: string };
    expect(got.id).toBe(created.id);

    const done = (await invokeOperation(
      registry,
      "tasks.complete",
      { id: created.id },
      ctx,
    )) as { done: boolean };
    expect(done.done).toBe(true);
    expect(store.get(created.id).done).toBe(true);
  });

  it("get missing throws NOT_FOUND", async () => {
    const { registry } = createTasksRegistry();
    await expect(
      invokeOperation(
        registry,
        "tasks.get",
        { id: "missing" },
        createContext({ surface: "http" }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("does not expose complete over MCP", () => {
    const { registry } = createTasksRegistry();
    const mcpIds = registry.listForSurface("mcp").map((o) => o.id);
    expect(mcpIds).toContain("tasks.create");
    expect(mcpIds).toContain("tasks.list");
    expect(mcpIds).toContain("tasks.get");
    expect(mcpIds).not.toContain("tasks.complete");
  });
});
