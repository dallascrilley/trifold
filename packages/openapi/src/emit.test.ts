import { createTasksRegistry } from "@trifold/ops";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitOpenAPI, stableStringify } from "./emit.js";

const snapshotPath = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../examples/tasks/openapi.snapshot.json",
);

describe("emitOpenAPI", () => {
  it("includes all http operations including complete", () => {
    const { registry } = createTasksRegistry();
    const doc = emitOpenAPI(registry, { title: "Tasks API", version: "0.1.0" });
    const ids: string[] = [];
    for (const pathItem of Object.values(doc.paths)) {
      for (const op of Object.values(pathItem)) {
        if (op && typeof op === "object" && "operationId" in op) {
          ids.push(String((op as { operationId: string }).operationId));
        }
      }
    }
    expect(ids.sort()).toEqual(
      ["tasks.complete", "tasks.create", "tasks.get", "tasks.list"].sort(),
    );
  });

  it("matches committed snapshot", () => {
    const { registry } = createTasksRegistry();
    const doc = emitOpenAPI(registry, { title: "Tasks API", version: "0.1.0" });
    const expected = readFileSync(snapshotPath, "utf8");
    expect(stableStringify(doc)).toBe(expected);
  });
});
