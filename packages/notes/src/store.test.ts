import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NotesStore, notesStoreFromEnv } from "./store.js";

const temps: string[] = [];

afterEach(() => {
  for (const t of temps.splice(0)) {
    rmSync(t, { recursive: true, force: true });
  }
});

describe("NotesStore file persistence", () => {
  it("shares data across store instances", () => {
    const dir = mkdtempSync(join(tmpdir(), "notes-store-"));
    temps.push(dir);
    const filePath = join(dir, "notes.json");

    const api = new NotesStore({ filePath });
    const created = api.create({ title: "From API" });

    const cli = new NotesStore({ filePath });
    expect(cli.list()).toHaveLength(1);
    expect(cli.get(created.id).title).toBe("From API");
  });

  it("notesStoreFromEnv uses NOTES_STORE_PATH", () => {
    const dir = mkdtempSync(join(tmpdir(), "notes-store-"));
    temps.push(dir);
    const filePath = join(dir, "env-notes.json");
    const a = notesStoreFromEnv({ NOTES_STORE_PATH: filePath });
    a.create({ title: "env" });
    const b = notesStoreFromEnv({ NOTES_STORE_PATH: filePath });
    expect(b.list()).toHaveLength(1);
  });
});
