import { AppError, JsonFileMapStore, storePathFromEnv } from "@trifold/core";
import type { Task } from "./schemas.js";
import { TaskSchema } from "./schemas.js";

export type TaskStoreOptions = {
  /**
   * When set, load/save tasks from this JSON file on every mutation so
   * separate processes (API vs CLI) share state.
   */
  filePath?: string;
};

/**
 * Task store: in-memory by default, optional JSON file backend for demos.
 */
export class TaskStore {
  private readonly backend: JsonFileMapStore<Task>;

  constructor(options: TaskStoreOptions = {}) {
    this.backend = new JsonFileMapStore({
      filePath: options.filePath,
      itemSchema: TaskSchema,
      collectionKey: "tasks",
      label: "task store",
    });
  }

  create(input: { title: string; due?: string }): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      done: false,
      ...(input.due !== undefined ? { due: input.due } : {}),
    };
    this.backend.set(task);
    return task;
  }

  list(): Task[] {
    return this.backend.list();
  }

  get(id: string): Task {
    const task = this.backend.get(id);
    if (!task) {
      throw new AppError("NOT_FOUND", `Task not found: ${id}`, { status: 404 });
    }
    return task;
  }

  complete(id: string): Task {
    const task = this.get(id);
    const updated: Task = { ...task, done: true };
    this.backend.set(updated);
    return updated;
  }

  clear(): void {
    this.backend.clear();
  }

  get persistencePath(): string | undefined {
    return this.backend.persistencePath;
  }
}

/** Resolve store from TASKS_STORE_PATH (or empty → memory). */
export function tasksStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TaskStore {
  const filePath = storePathFromEnv(env, "TASKS_STORE_PATH", "CLI_MCP_TASKS_STORE");
  return new TaskStore(filePath ? { filePath } : {});
}
