import { createTasksRegistry } from "@cli-mcp/ops";
import { describe, expect, it } from "vitest";
import { createCli } from "./create-cli.js";
import { formatOutput } from "./format.js";

describe("formatOutput", () => {
  it("formats json", () => {
    expect(formatOutput({ a: 1 }, "json")).toContain('"a": 1');
  });
});

describe("CLI adapter", () => {
  it("creates and lists tasks", async () => {
    const { registry } = createTasksRegistry();
    const chunks: string[] = [];
    const errs: string[] = [];
    const cli = createCli(registry, {
      stdout: (s) => chunks.push(s),
      stderr: (s) => errs.push(s),
    });

    process.env.APP_API_KEY = "dev-key";
    const createCode = await cli.run(["tasks", "create", "Buy milk", "--json"]);
    expect(createCode).toBe(0);
    expect(chunks.join("")).toContain("Buy milk");

    chunks.length = 0;
    const listCode = await cli.run(["tasks", "list", "--json"]);
    expect(listCode).toBe(0);
    expect(chunks.join("")).toContain("Buy milk");
  });

  it("rejects create without api key", async () => {
    const { registry } = createTasksRegistry();
    const errs: string[] = [];
    const cli = createCli(registry, {
      stdout: () => {},
      stderr: (s) => errs.push(s),
    });
    const prev = process.env.APP_API_KEY;
    delete process.env.APP_API_KEY;
    // still has dev-key default in authorize — set empty keys to force fail
    process.env.APP_API_KEYS = "only-real-key";
    const code = await cli.run(["tasks", "create", "Nope", "--json"]);
    expect(code).toBe(1);
    expect(errs.join("")).toMatch(/UNAUTHORIZED/);
    delete process.env.APP_API_KEYS;
    if (prev !== undefined) process.env.APP_API_KEY = prev;
    else delete process.env.APP_API_KEY;
  });
});
