import { AppError } from "@cli-mcp/core";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Notes } from "./schemas.js";
import { NotesSchema } from "./schemas.js";

export type NotesStoreOptions = {
  /**
   * When set, load/save notes from this JSON file on every mutation so
   * separate processes (API vs CLI) share state.
   */
  filePath?: string;
};

type FilePayload = {
  version: 1;
  items: Notes[];
};

/**
 * Notes store: in-memory by default, optional JSON file backend for demos.
 */
export class NotesStore {
  private readonly items = new Map<string, Notes>();
  private readonly filePath?: string;

  constructor(options: NotesStoreOptions = {}) {
    this.filePath = options.filePath;
    this.reload();
  }

  create(input: { title: string; body?: string }): Notes {
    this.reload();
    const item: Notes = {
      id: crypto.randomUUID(),
      title: input.title,
      createdAt: new Date().toISOString(),
      ...(input.body !== undefined ? { body: input.body } : {}),
    };
    this.items.set(item.id, item);
    this.persist();
    return item;
  }

  list(): Notes[] {
    this.reload();
    return [...this.items.values()];
  }

  get(id: string): Notes {
    this.reload();
    const item = this.items.get(id);
    if (!item) {
      throw new AppError("NOT_FOUND", `Notes not found: ${id}`, { status: 404 });
    }
    return item;
  }

  clear(): void {
    this.items.clear();
    this.persist();
  }

  get persistencePath(): string | undefined {
    return this.filePath;
  }

  private reload(): void {
    if (!this.filePath) return;
    if (!existsSync(this.filePath)) {
      this.items.clear();
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FilePayload;
      this.items.clear();
      const list = Array.isArray(parsed.items) ? parsed.items : [];
      for (const item of list) {
        const note = NotesSchema.parse(item);
        this.items.set(note.id, note);
      }
    } catch (err) {
      throw new AppError("STORE_CORRUPT", `Failed to read notes store: ${this.filePath}`, {
        status: 500,
        details: err instanceof Error ? err.message : err,
      });
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    const payload: FilePayload = {
      version: 1,
      items: [...this.items.values()],
    };
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    renameSync(tmp, this.filePath);
  }
}

/** Resolve store from NOTES_STORE_PATH (or empty → memory). */
export function notesStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): NotesStore {
  const filePath = env.NOTES_STORE_PATH?.trim() || env.CLI_MCP_NOTES_STORE?.trim();
  return new NotesStore(filePath ? { filePath } : {});
}
