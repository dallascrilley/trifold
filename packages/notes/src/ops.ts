import { type OperationDef, Registry } from "@trifold/core";
import {
  CreateNotesInput,
  GetNotesInput,
  ListNotesInput,
  ListNotesOutput,
  NotesSchema,
} from "./schemas.js";
import { NotesStore } from "./store.js";

export function registerNotes(registry: Registry, store: NotesStore): void {
  const list: OperationDef = {
    id: "notes.list",
    summary: "List notes",
    description: "Return all notes",
    input: ListNotesInput,
    output: ListNotesOutput,
    meta: { sideEffect: "read", auth: "none", tags: ["notes"] },
    surfaces: {
      http: { method: "get", path: "/notes" },
      cli: { command: "notes list" },
      mcp: {
        enabled: true,
        agentDescription: "List all notes. Use for inventory.",
      },
    },
    handler: async () => ({ items: store.list() }),
  };

  const get: OperationDef = {
    id: "notes.get",
    summary: "Get a notes by id",
    input: GetNotesInput,
    output: NotesSchema,
    meta: { sideEffect: "read", auth: "none", tags: ["notes"] },
    surfaces: {
      http: { method: "get", path: "/notes/{id}" },
      cli: { command: "notes get", positional: ["id"] },
      mcp: {
        enabled: true,
        agentDescription: "Fetch one notes by id.",
      },
    },
    handler: async (_ctx, input) => store.get(input.id),
  };

  const create: OperationDef = {
    id: "notes.create",
    summary: "Create a notes",
    input: CreateNotesInput,
    output: NotesSchema,
    meta: { sideEffect: "write", auth: "apiKey", tags: ["notes"] },
    surfaces: {
      http: { method: "post", path: "/notes", successStatus: 201 },
      cli: { command: "notes create", positional: ["title"] },
      mcp: {
        enabled: true,
        agentDescription:
          "Create a notes with a title and optional body. New items only.",
      },
    },
    handler: async (_ctx, input) => store.create(input),
  };

  registry.register(list);
  registry.register(get);
  registry.register(create);
}

export function createNotesRegistry(store = new NotesStore()): {
  registry: Registry;
  store: NotesStore;
} {
  const registry = new Registry();
  registerNotes(registry, store);
  return { registry, store };
}
