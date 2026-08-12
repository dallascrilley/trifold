import { AppError } from "@cli-mcp/core";
import type { Task } from "./schemas.js";

export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  create(input: { title: string; due?: string }): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      done: false,
      ...(input.due !== undefined ? { due: input.due } : {}),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  list(): Task[] {
    return [...this.tasks.values()];
  }

  get(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new AppError("NOT_FOUND", `Task not found: ${id}`, { status: 404 });
    }
    return task;
  }

  complete(id: string): Task {
    const task = this.get(id);
    const updated: Task = { ...task, done: true };
    this.tasks.set(id, updated);
    return updated;
  }

  clear(): void {
    this.tasks.clear();
  }
}
