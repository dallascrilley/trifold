import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertSlug, toPascal, toResourcePath } from "./names.js";
import { planProductFiles } from "./templates.js";
import { scaffoldProduct } from "./write.js";

const temps: string[] = [];

afterEach(() => {
  for (const t of temps.splice(0)) {
    rmSync(t, { recursive: true, force: true });
  }
});

describe("names", () => {
  it("validates slug", () => {
    expect(assertSlug("notes")).toBe("notes");
    expect(assertSlug("order-items")).toBe("order-items");
    expect(() => assertSlug("Notes")).toThrow();
    expect(() => assertSlug("core")).toThrow(/reserved/);
  });

  it("pascal and resource", () => {
    expect(toPascal("order-items")).toBe("OrderItems");
    expect(toResourcePath("note")).toBe("notes");
    expect(toResourcePath("notes")).toBe("notes");
  });
});

describe("planProductFiles", () => {
  it("plans domain + three apps with sample ops", () => {
    const files = planProductFiles("notes", "Notes");
    const paths = files.map((f) => f.path);
    expect(paths).toContain("packages/notes/src/ops.ts");
    expect(paths).toContain("packages/notes/src/notes.test.ts");
    expect(paths).toContain("apps/notes-api/src/index.ts");
    expect(paths).toContain("apps/notes-cli/src/index.ts");
    expect(paths).toContain("apps/notes-mcp/src/index.ts");

    const ops = files.find((f) => f.path.endsWith("ops.ts"))!.content;
    expect(ops).toContain('id: "notes.list"');
    expect(ops).toContain('id: "notes.create"');
    expect(ops).toContain('path: "/notes"');
  });
});

describe("scaffoldProduct", () => {
  it("writes files to disk", () => {
    const root = mkdtempSync(join(tmpdir(), "cli-mcp-scaffold-"));
    temps.push(root);
    const result = scaffoldProduct({ root, slug: "notes" });
    expect(result.written.length).toBeGreaterThan(10);
    const pkg = readFileSync(join(root, "packages/notes/package.json"), "utf8");
    expect(JSON.parse(pkg).name).toBe("@cli-mcp/notes");
  });

  it("dryRun writes nothing", () => {
    const root = mkdtempSync(join(tmpdir(), "cli-mcp-scaffold-"));
    temps.push(root);
    const result = scaffoldProduct({ root, slug: "widgets", dryRun: true });
    expect(result.written).toEqual([]);
    expect(result.files.length).toBeGreaterThan(5);
  });

  it("refuses overwrite", () => {
    const root = mkdtempSync(join(tmpdir(), "cli-mcp-scaffold-"));
    temps.push(root);
    scaffoldProduct({ root, slug: "notes" });
    expect(() => scaffoldProduct({ root, slug: "notes" })).toThrow(/overwrite/);
  });
});
