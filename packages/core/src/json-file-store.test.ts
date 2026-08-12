import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "./errors.js";
import { JsonFileMapStore, resolveStorePath, storePathFromEnv } from "./json-file-store.js";

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
    const init = { INIT_CWD: "/workspace-root" };
    expect(storePathFromEnv({ ...init, TASKS_STORE_PATH: " a " }, "TASKS_STORE_PATH")).toBe(
      "/workspace-root/a",
    );
    expect(storePathFromEnv({ ...init, CLI_MCP_STORE_PATH: "b" }, "TASKS_STORE_PATH")).toBe(
      "/workspace-root/b",
    );
    expect(storePathFromEnv({}, "TASKS_STORE_PATH")).toBeUndefined();
  });

  it("keeps absolute paths untouched", () => {
    const abs = join(tmpdir(), "abs-tasks.json");
    expect(storePathFromEnv({ TASKS_STORE_PATH: abs, INIT_CWD: "/elsewhere" }, "TASKS_STORE_PATH"))
      .toBe(abs);
  });

  // Regression: `pnpm --filter <pkg> start` runs with the package directory as
  // cwd, so a relative path must anchor on INIT_CWD or the API and the CLI each
  // get their own store. SHARED_RELATIVE_STORE_EXPECTATION is asserted from a
  // second vitest process (packages/ops) with a different cwd; both must agree.
  it("anchors a relative path on INIT_CWD, not the per-package cwd", () => {
    const resolved = storePathFromEnv(
      { TASKS_STORE_PATH: ".data/tasks.json", INIT_CWD: "/workspace-root" },
      "TASKS_STORE_PATH",
    );
    expect(resolved).toBe("/workspace-root/.data/tasks.json");
    expect(resolved).not.toBe(resolve(process.cwd(), ".data/tasks.json"));
    expect(process.cwd()).not.toBe("/workspace-root");
  });

  it("falls back to process.cwd() when INIT_CWD is absent", () => {
    expect(storePathFromEnv({ TASKS_STORE_PATH: ".data/tasks.json" }, "TASKS_STORE_PATH")).toBe(
      resolve(process.cwd(), ".data/tasks.json"),
    );
  });
});

describe("resolveStorePath", () => {
  it("resolves the same relative path identically for two different cwds", () => {
    const env = { INIT_CWD: "/workspace-root" };
    // Simulates apps/api and apps/cli: same env, different process cwd.
    expect(resolveStorePath(".data/tasks.json", env)).toBe(
      resolveStorePath("./.data/tasks.json", env),
    );
    expect(resolveStorePath(".data/tasks.json", env)).toBe("/workspace-root/.data/tasks.json");
  });
});
