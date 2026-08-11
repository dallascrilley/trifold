import { AppError, Registry, createContext, invokeOperation } from "@cli-mcp/core";
import { createTasksRegistry } from "@cli-mcp/ops";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitOpenAPI } from "./emit.js";
import {
  emitHandlerSkeleton,
  openApiToOperations,
  parseOpenAPIJson,
  registerOpenApiStubs,
} from "./import.js";

const snapshotPath = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../examples/tasks/openapi.snapshot.json",
);

describe("openApiToOperations", () => {
  it("round-trips tasks OpenAPI snapshot into http stubs", () => {
    const doc = parseOpenAPIJson(readFileSync(snapshotPath, "utf8"));
    const stubs = openApiToOperations(doc);
    const ids = stubs.map((s) => s.id).sort();
    expect(ids).toEqual(
      ["tasks.complete", "tasks.create", "tasks.get", "tasks.list"].sort(),
    );

    const list = stubs.find((s) => s.id === "tasks.list")!;
    expect(list.surfaces.http).toEqual({
      method: "get",
      path: "/tasks",
      successStatus: 200,
    });
    expect(list.meta.sideEffect).toBe("read");
    expect(list.surfaces.mcp).toBeUndefined();

    const create = stubs.find((s) => s.id === "tasks.create")!;
    expect(create.surfaces.http?.method).toBe("post");
    expect(create.surfaces.http?.successStatus).toBe(201);
    expect(create.meta.auth).toBe("apiKey");
    expect(create.meta.sideEffect).toBe("write");
  });

  it("imports from live emitOpenAPI output", () => {
    const { registry } = createTasksRegistry();
    const doc = emitOpenAPI(registry, { title: "Tasks API", version: "0.1.0" });
    const stubs = openApiToOperations(doc);
    expect(stubs.map((s) => s.id)).toContain("tasks.get");
    const get = stubs.find((s) => s.id === "tasks.get")!;
    expect(get.surfaces.http?.path).toBe("/tasks/{id}");
    expect(get.surfaces.cli?.positional).toEqual(["id"]);
  });

  it("registers stubs that throw NOT_IMPLEMENTED", async () => {
    const reg = new Registry();
    const doc = parseOpenAPIJson(readFileSync(snapshotPath, "utf8"));
    registerOpenApiStubs(reg, doc);
    await expect(
      invokeOperation(reg, "tasks.list", {}, createContext({ surface: "http" })),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED", status: 501 });
    expect(AppError).toBeDefined();
  });

  it("enableMcp marks tools", () => {
    const doc = parseOpenAPIJson(readFileSync(snapshotPath, "utf8"));
    const stubs = openApiToOperations(doc, { enableMcp: true });
    expect(stubs.every((s) => s.surfaces.mcp?.enabled === true)).toBe(true);
  });

  it("filters by tags", () => {
    const doc = parseOpenAPIJson(readFileSync(snapshotPath, "utf8"));
    const stubs = openApiToOperations(doc, { tags: ["tasks"] });
    expect(stubs.length).toBe(4);
    const none = openApiToOperations(doc, { tags: ["nope"] });
    expect(none).toHaveLength(0);
  });

  it("emitHandlerSkeleton lists operation ids", () => {
    const doc = parseOpenAPIJson(readFileSync(snapshotPath, "utf8"));
    const stubs = openApiToOperations(doc);
    const src = emitHandlerSkeleton(stubs);
    expect(src).toContain("tasks.list");
    expect(src).toContain("openApiToOperations");
  });
});
