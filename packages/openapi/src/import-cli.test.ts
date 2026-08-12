import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const repoRoot = join(packageRoot, "../..");
const tsx = join(packageRoot, "node_modules/.bin/tsx");
const script = join(repoRoot, "scripts/openapi-import.ts");

function runImport(args: string[]) {
  return spawnSync(tsx, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("scripts/openapi-import.ts CLI", () => {
  it("fails with a one-line message and no stack trace when the file is missing", () => {
    const result = runImport(["--", "./does-not-exist.json", "--skeleton"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no such OpenAPI file");
    expect(result.stderr).toContain("does-not-exist.json");
    // A crash, not a handled error, would surface a Node stack trace.
    expect(result.stderr).not.toContain("ENOENT");
    expect(result.stderr).not.toMatch(/^\s+at /m);
    expect(result.stderr.trim().split("\n")).toHaveLength(1);
    expect(result.stdout).toBe("");
  }, 30_000);

  it("still imports an existing OpenAPI document", () => {
    const result = runImport(["--", "examples/tasks/openapi.snapshot.json", "--json"]);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as { count: number };
    expect(parsed.count).toBeGreaterThan(0);
  }, 30_000);
});
