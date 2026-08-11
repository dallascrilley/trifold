import { type OperationDef, Registry } from "@cli-mcp/core";
import {
  CompleteTaskInput,
  CreateTaskInput,
  GetTaskInput,
  ListTasksInput,
  ListTasksOutput,
  TaskSchema,
} from "./schemas.js";
import { TaskStore } from "./store.js";

export function registerTasks(registry: Registry, store: TaskStore): void {
  const list: OperationDef = {
    id: "tasks.list",
    summary: "List tasks",
    description: "Return all tasks in the store",
    input: ListTasksInput,
    output: ListTasksOutput,
    meta: { sideEffect: "read", auth: "none", tags: ["tasks"] },
    surfaces: {
      http: { method: "get", path: "/tasks" },
      cli: { command: "tasks list" },
      mcp: {
        enabled: true,
        agentDescription: "List all tasks. Use when you need the current task inventory.",
      },
    },
    handler: async () => ({ tasks: store.list() }),
  };

  const get: OperationDef = {
    id: "tasks.get",
    summary: "Get a task by id",
    input: GetTaskInput,
    output: TaskSchema,
    meta: { sideEffect: "read", auth: "none", tags: ["tasks"] },
    surfaces: {
      http: { method: "get", path: "/tasks/{id}" },
      cli: { command: "tasks get", positional: ["id"] },
      mcp: {
        enabled: true,
        agentDescription: "Fetch one task by its id.",
      },
    },
    handler: async (_ctx, input) => store.get(input.id),
  };

  const create: OperationDef = {
    id: "tasks.create",
    summary: "Create a task",
    input: CreateTaskInput,
    output: TaskSchema,
    meta: { sideEffect: "write", auth: "apiKey", tags: ["tasks"] },
    surfaces: {
      http: { method: "post", path: "/tasks", successStatus: 201 },
      cli: { command: "tasks create", positional: ["title"] },
      mcp: {
        enabled: true,
        agentDescription:
          "Create a task with a title and optional due date string. Use only for new work items.",
      },
    },
    handler: async (_ctx, input) => store.create(input),
  };

  const complete: OperationDef = {
    id: "tasks.complete",
    summary: "Mark a task complete",
    input: CompleteTaskInput,
    output: TaskSchema,
    meta: { sideEffect: "write", auth: "apiKey", tags: ["tasks"] },
    surfaces: {
      http: { method: "post", path: "/tasks/{id}/complete" },
      cli: { command: "tasks complete", positional: ["id"] },
      // Intentionally no MCP — proves curation (writes not auto-exposed)
    },
    handler: async (_ctx, input) => store.complete(input.id),
  };

  registry.register(list);
  registry.register(get);
  registry.register(create);
  registry.register(complete);
}

export function createTasksRegistry(store = new TaskStore()): {
  registry: Registry;
  store: TaskStore;
} {
  const registry = new Registry();
  registerTasks(registry, store);
  return { registry, store };
}
