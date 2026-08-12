import { AppError, JsonFileMapStore, storePathFromEnv } from "@trifold/core";
import type { Notes } from "./schemas.js";
import { NotesSchema } from "./schemas.js";

export type NotesStoreOptions = {
  /**
   * When set, load/save notes from this JSON file on every mutation so
   * separate processes (API vs CLI) share state.
   */
  filePath?: string;
};

/**
 * Notes store: in-memory by default, optional JSON file backend for demos.
 */
export class NotesStore {
  private readonly backend: JsonFileMapStore<Notes>;

  constructor(options: NotesStoreOptions = {}) {
    this.backend = new JsonFileMapStore({
      filePath: options.filePath,
      itemSchema: NotesSchema,
      collectionKey: "items",
      label: "notes store",
    });
  }

  create(input: { title: string; body?: string }): Notes {
    const item: Notes = {
      id: crypto.randomUUID(),
      title: input.title,
      createdAt: new Date().toISOString(),
      ...(input.body !== undefined ? { body: input.body } : {}),
    };
    this.backend.set(item);
    return item;
  }

  list(): Notes[] {
    return this.backend.list();
  }

  get(id: string): Notes {
    const item = this.backend.get(id);
    if (!item) {
      throw new AppError("NOT_FOUND", `Notes not found: ${id}`, { status: 404 });
    }
    return item;
  }

  clear(): void {
    this.backend.clear();
  }

  get persistencePath(): string | undefined {
    return this.backend.persistencePath;
  }
}

/** Resolve store from NOTES_STORE_PATH (or empty → memory). */
export function notesStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): NotesStore {
  const filePath = storePathFromEnv(env, "NOTES_STORE_PATH", "CLI_MCP_NOTES_STORE");
  return new NotesStore(filePath ? { filePath } : {});
}
