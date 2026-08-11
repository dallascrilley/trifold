import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { z } from "zod";
import { AppError } from "./errors.js";

export type JsonFileMapStoreOptions<T extends { id: string }> = {
  /** When set, reload/persist this JSON file for multi-process sharing. */
  filePath?: string;
  /** Zod schema for each row. */
  itemSchema: z.ZodType<T>;
  /** Property name for the array in the on-disk document. Default: "items". */
  collectionKey?: string;
  /** Human label for error messages. Default: "store". */
  label?: string;
};

type FilePayload = {
  version: 1;
  [key: string]: unknown;
};

/**
 * Map-backed collection with optional JSON file persistence.
 * Reloads from disk before reads/writes so separate processes share state
 * (last-writer-wins — demo-grade, not a database).
 */
export class JsonFileMapStore<T extends { id: string }> {
  private readonly map = new Map<string, T>();
  private readonly filePath?: string;
  private readonly itemSchema: z.ZodType<T>;
  private readonly collectionKey: string;
  private readonly label: string;

  constructor(options: JsonFileMapStoreOptions<T>) {
    this.filePath = options.filePath;
    this.itemSchema = options.itemSchema;
    this.collectionKey = options.collectionKey ?? "items";
    this.label = options.label ?? "store";
    this.reload();
  }

  get persistencePath(): string | undefined {
    return this.filePath;
  }

  /** Reload from disk (no-op in memory mode). */
  reload(): void {
    if (!this.filePath) return;
    if (!existsSync(this.filePath)) {
      this.map.clear();
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FilePayload;
      this.map.clear();
      const list = parsed[this.collectionKey];
      if (!Array.isArray(list)) return;
      for (const row of list) {
        const item = this.itemSchema.parse(row);
        this.map.set(item.id, item);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("STORE_CORRUPT", `Failed to read ${this.label}: ${this.filePath}`, {
        status: 500,
        details: err instanceof Error ? err.message : err,
      });
    }
  }

  /** Persist to disk (no-op in memory mode). */
  persist(): void {
    if (!this.filePath) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    const payload: FilePayload = {
      version: 1,
      [this.collectionKey]: [...this.map.values()],
    };
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    renameSync(tmp, this.filePath);
  }

  list(): T[] {
    this.reload();
    return [...this.map.values()];
  }

  get(id: string): T | undefined {
    this.reload();
    return this.map.get(id);
  }

  /** Insert or replace by id. */
  set(item: T): void {
    this.reload();
    this.map.set(item.id, item);
    this.persist();
  }

  delete(id: string): boolean {
    this.reload();
    const ok = this.map.delete(id);
    if (ok) this.persist();
    return ok;
  }

  clear(): void {
    this.map.clear();
    this.persist();
  }

  /** In-memory size without forcing reload (tests). Prefer list().length. */
  get size(): number {
    return this.map.size;
  }
}

/** Read a single env path for stores: PRIMARY or fallback CLI_MCP_STORE_PATH. */
export function storePathFromEnv(
  env: NodeJS.ProcessEnv,
  primaryKey: string,
  fallbackKey = "CLI_MCP_STORE_PATH",
): string | undefined {
  const primary = env[primaryKey]?.trim();
  if (primary) return primary;
  const fallback = env[fallbackKey]?.trim();
  return fallback || undefined;
}
