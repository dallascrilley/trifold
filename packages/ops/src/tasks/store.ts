import { AppError } from "@cli-mcp/core";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Task } from "./schemas.js";
import { TaskSchema } from "./schemas.js";

export type TaskStoreOptions = {
  /**
   * When set, load/save tasks from this JSON file on every mutation so
   * separate processes (API vs CLI) share state.
   */
  filePath?: string;
};

type FilePayload = {
  version: 1;
  tasks: Task[];
};

/**
 * Task store: in-memory by default, optional JSON file backend for demos.
 *
 * File mode reloads from disk before each read/write so concurrent CLI/API
 * processes see each other's updates (last-writer-wins; sufficient for samples).
 */
export class TaskStore {
  private readonly tasks = new Map<string, Task>();
  private readonly filePath?: string;

  constructor(options: TaskStoreOptions = {}) {
    this.filePath = options.filePath;
    this.reload();
  }

  create(input: { title: string; due?: string }): Task {
    this.reload();
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      done: false,
      ...(input.due !== undefined ? { due: input.due } : {}),
    };
    this.tasks.set(task.id, task);
    this.persist();
    return task;
  }

  list(): Task[] {
    this.reload();
    return [...this.tasks.values()];
  }

  get(id: string): Task {
    this.reload();
    const task = this.tasks.get(id);
    if (!task) {
      throw new AppError("NOT_FOUND", `Task not found: ${id}`, { status: 404 });
    }
    return task;
  }

  complete(id: string): Task {
    this.reload();
    const task = this.get(id);
    const updated: Task = { ...task, done: true };
    this.tasks.set(id, updated);
    this.persist();
    return updated;
  }

  clear(): void {
    this.tasks.clear();
    this.persist();
  }

  /** Path used for persistence, if any. */
  get persistencePath(): string | undefined {
    return this.filePath;
  }

  private reload(): void {
    if (!this.filePath) return;
    if (!existsSync(this.filePath)) {
      this.tasks.clear();
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FilePayload;
      this.tasks.clear();
      const list = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      for (const item of list) {
        const task = TaskSchema.parse(item);
        this.tasks.set(task.id, task);
      }
    } catch (err) {
      throw new AppError("STORE_CORRUPT", `Failed to read task store: ${this.filePath}`, {
        status: 500,
        details: err instanceof Error ? err.message : err,
      });
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const payload: FilePayload = {
      version: 1,
      tasks: [...this.tasks.values()],
    };
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    renameSync(tmp, this.filePath);
  }
}

/** Resolve store from TASKS_STORE_PATH (or empty → memory). */
export function tasksStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TaskStore {
  const filePath = env.TASKS_STORE_PATH?.trim() || env.CLI_MCP_TASKS_STORE?.trim();
  return new TaskStore(filePath ? { filePath } : {});
}
