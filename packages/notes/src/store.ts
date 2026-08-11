import { AppError } from "@cli-mcp/core";
import type { Notes } from "./schemas.js";

export class NotesStore {
  private readonly items = new Map<string, Notes>();

  create(input: { title: string; body?: string }): Notes {
    const item: Notes = {
      id: crypto.randomUUID(),
      title: input.title,
      createdAt: new Date().toISOString(),
      ...(input.body !== undefined ? { body: input.body } : {}),
    };
    this.items.set(item.id, item);
    return item;
  }

  list(): Notes[] {
    return [...this.items.values()];
  }

  get(id: string): Notes {
    const item = this.items.get(id);
    if (!item) {
      throw new AppError("NOT_FOUND", `Notes not found: ${id}`, { status: 404 });
    }
    return item;
  }

  clear(): void {
    this.items.clear();
  }
}
