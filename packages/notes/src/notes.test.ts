import { createContext, invokeOperation } from "@trifold/core";
import { describe, expect, it } from "vitest";
import { createNotesRegistry } from "./ops.js";

describe("notes domain", () => {
  it("create, list, get", async () => {
    const { registry } = createNotesRegistry();
    const ctx = createContext({ surface: "cli" });

    const created = (await invokeOperation(
      registry,
      "notes.create",
      { title: "Hello Notes" },
      ctx,
    )) as { id: string; title: string };

    expect(created.title).toBe("Hello Notes");

    const listed = (await invokeOperation(registry, "notes.list", {}, ctx)) as {
      items: { id: string }[];
    };
    expect(listed.items).toHaveLength(1);

    const got = (await invokeOperation(
      registry,
      "notes.get",
      { id: created.id },
      ctx,
    )) as { id: string };
    expect(got.id).toBe(created.id);
  });

  it("get missing throws NOT_FOUND", async () => {
    const { registry } = createNotesRegistry();
    await expect(
      invokeOperation(
        registry,
        "notes.get",
        { id: "missing" },
        createContext({ surface: "http" }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
});
