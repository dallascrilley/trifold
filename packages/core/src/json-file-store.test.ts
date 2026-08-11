import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "./errors.js";
import { JsonFileMapStore, storePathFromEnv } from "./json-file-store.js";

const Item = z.object({ id: z.string(), title: z.string() });
type Item = z.infer<typeof Item>;

const temps: string[] = [];
afterEach(() => {
  for (const t of temps.splice(0)) rmSync(t, { recursive: true, force: true });
});

describe("JsonFileMapStore", () => {
  it("shares across instances", () => {
    const dir = mkdtempSync(join(tmpdir(), "jfs-"));
    temps.push(dir);
    const filePath = join(dir, "items.json");
    const a = new JsonFileMapStore({ filePath, itemSchema: Item, label: "items" });
    a.set({ id: "1", title: "hello" });
    const b = new JsonFileMapStore({ filePath, itemSchema: Item, label: "items" });
    expect(b.list()).toEqual([{ id: "1", title: "hello" }]);
  });

  it("memory mode does not share", () => {
    const a = new JsonFileMapStore({ itemSchema: Item });
    a.set({ id: "1", title: "x" });
    const b = new JsonFileMapStore({ itemSchema: Item });
    expect(b.list()).toHaveLength(0);
  });

  it("throws STORE_CORRUPT on invalid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "jfs-"));
    temps.push(dir);
    const filePath = join(dir, "bad.json");
    writeFileSync(filePath, "not-json", "utf8");
    expect(
      () => new JsonFileMapStore({ filePath, itemSchema: Item, label: "items" }),
    ).toThrow(AppError);
    try {
      new JsonFileMapStore({ filePath, itemSchema: Item, label: "items" });
    } catch (e) {
      expect(e).toMatchObject({ code: "STORE_CORRUPT" });
    }
  });

  it("supports custom collectionKey (tasks)", () => {
    const dir = mkdtempSync(join(tmpdir(), "jfs-"));
    temps.push(dir);
    const filePath = join(dir, "tasks.json");
    const a = new JsonFileMapStore({
      filePath,
      itemSchema: Item,
      collectionKey: "tasks",
      label: "tasks",
    });
    a.set({ id: "t1", title: "do" });
    const b = new JsonFileMapStore({
      filePath,
      itemSchema: Item,
      collectionKey: "tasks",
    });
    expect(b.get("t1")?.title).toBe("do");
  });
});

describe("storePathFromEnv", () => {
  it("prefers primary then fallback", () => {
    expect(storePathFromEnv({ TASKS_STORE_PATH: " a " }, "TASKS_STORE_PATH")).toBe("a");
    expect(storePathFromEnv({ CLI_MCP_STORE_PATH: "b" }, "TASKS_STORE_PATH")).toBe("b");
    expect(storePathFromEnv({}, "TASKS_STORE_PATH")).toBeUndefined();
  });
});
