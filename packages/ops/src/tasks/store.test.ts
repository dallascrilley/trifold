import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createContext, invokeOperation } from "@trifold/core";
import { createTasksRegistry } from "./ops.js";
import { TaskStore, tasksStoreFromEnv } from "./store.js";

const temps: string[] = [];

afterEach(() => {
  for (const t of temps.splice(0)) {
    rmSync(t, { recursive: true, force: true });
  }
});

describe("TaskStore file persistence", () => {
  it("shares data across store instances (simulates API vs CLI processes)", () => {
    const dir = mkdtempSync(join(tmpdir(), "tasks-store-"));
    temps.push(dir);
    const filePath = join(dir, "tasks.json");

    const apiStore = new TaskStore({ filePath });
    const created = apiStore.create({ title: "From API" });

    const cliStore = new TaskStore({ filePath });
    const listed = cliStore.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect(listed[0]?.title).toBe("From API");
  });

  it("registry ops share file backend across registries", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tasks-store-"));
    temps.push(dir);
    const filePath = join(dir, "tasks.json");

    const { registry: apiReg } = createTasksRegistry(new TaskStore({ filePath }));
    const ctx = createContext({ surface: "http" });
    const created = (await invokeOperation(
      apiReg,
      "tasks.create",
      { title: "Shared" },
      ctx,
    )) as { id: string };

    const { registry: cliReg } = createTasksRegistry(new TaskStore({ filePath }));
    const listed = (await invokeOperation(
      cliReg,
      "tasks.list",
      {},
      createContext({ surface: "cli" }),
    )) as { tasks: { id: string; title: string }[] };

    expect(listed.tasks.some((t) => t.id === created.id && t.title === "Shared")).toBe(
      true,
    );
  });

  it("tasksStoreFromEnv uses TASKS_STORE_PATH", () => {
    const dir = mkdtempSync(join(tmpdir(), "tasks-store-"));
    temps.push(dir);
    const filePath = join(dir, "env-tasks.json");
    const store = tasksStoreFromEnv({ TASKS_STORE_PATH: filePath });
    expect(store.persistencePath).toBe(filePath);
    store.create({ title: "env" });
    const again = tasksStoreFromEnv({ TASKS_STORE_PATH: filePath });
    expect(again.list()).toHaveLength(1);
  });

  it("anchors a relative TASKS_STORE_PATH on INIT_CWD (API and CLI share one file)", () => {
    // Mirrors the assertion in packages/core/src/json-file-store.test.ts. That
    // suite runs in a different vitest process with a different cwd; both must
    // land on the same absolute path, which is what `pnpm --filter` breaks when
    // the value is resolved against process.cwd().
    const env = { TASKS_STORE_PATH: ".data/tasks.json", INIT_CWD: "/workspace-root" };
    expect(tasksStoreFromEnv(env).persistencePath).toBe("/workspace-root/.data/tasks.json");
    expect(process.cwd()).not.toBe("/workspace-root");
  });

  it("shares data between API-style and CLI-style processes via a relative path", () => {
    const dir = mkdtempSync(join(tmpdir(), "tasks-store-"));
    temps.push(dir);
    // Both "processes" get the documented relative value plus the INIT_CWD that
    // pnpm/npm set to the directory the command was launched from.
    const env = { TASKS_STORE_PATH: ".data/tasks.json", INIT_CWD: dir };

    const apiStore = tasksStoreFromEnv(env);
    expect(apiStore.persistencePath).toBe(join(dir, ".data/tasks.json"));
    const created = apiStore.create({ title: "From API" });

    const cliStore = tasksStoreFromEnv(env);
    expect(cliStore.persistencePath).toBe(apiStore.persistencePath);
    expect(cliStore.list().map((t) => t.id)).toEqual([created.id]);
    expect(existsSync(join(dir, ".data/tasks.json"))).toBe(true);
  });

  it("memory mode does not share across instances", () => {
    const a = new TaskStore();
    a.create({ title: "only-a" });
    const b = new TaskStore();
    expect(b.list()).toHaveLength(0);
  });
});
