import { describe, expect, it } from "vitest";
import { z } from "zod";
import { authorize } from "./auth.js";
import { createContext } from "./context.js";
import { AppError } from "./errors.js";
import { invokeOperation } from "./invoke.js";
import { isMcpEnabled } from "./mcp.js";
import { Registry } from "./registry.js";
import type { OperationDef } from "./types.js";

function makeOp(overrides: Partial<OperationDef> & Pick<OperationDef, "id" | "handler">): OperationDef {
  return {
    summary: overrides.summary ?? "test",
    input: overrides.input ?? z.object({ n: z.number().optional() }).default({}),
    output: overrides.output ?? z.object({ ok: z.boolean() }),
    meta: overrides.meta ?? { sideEffect: "read", auth: "none" },
    surfaces: overrides.surfaces ?? {},
    ...overrides,
  };
}

describe("Registry", () => {
  it("registers and retrieves operations", () => {
    const reg = new Registry();
    reg.register(
      makeOp({
        id: "demo.ping",
        handler: async () => ({ ok: true }),
      }),
    );
    expect(reg.get("demo.ping").id).toBe("demo.ping");
    expect(reg.list()).toHaveLength(1);
  });

  it("rejects duplicate ids", () => {
    const reg = new Registry();
    const op = makeOp({ id: "demo.ping", handler: async () => ({ ok: true }) });
    reg.register(op);
    expect(() => reg.register(op)).toThrow(/already registered/);
  });

  it("rejects MCP write without agentDescription", () => {
    const reg = new Registry();
    expect(() =>
      reg.register(
        makeOp({
          id: "demo.write",
          meta: { sideEffect: "write", auth: "none" },
          surfaces: { mcp: { enabled: true } },
          handler: async () => ({ ok: true }),
        }),
      ),
    ).toThrow(/agentDescription/);
  });

  it("listForSurface filters mcp tools", () => {
    const reg = new Registry();
    reg.register(
      makeOp({
        id: "demo.on",
        surfaces: {
          http: { method: "get", path: "/on" },
          mcp: { enabled: true, agentDescription: "on tool" },
        },
        handler: async () => ({ ok: true }),
      }),
    );
    reg.register(
      makeOp({
        id: "demo.off",
        surfaces: { http: { method: "get", path: "/off" } },
        handler: async () => ({ ok: true }),
      }),
    );
    expect(reg.listForSurface("mcp").map((o) => o.id)).toEqual(["demo.on"]);
    expect(reg.listForSurface("http")).toHaveLength(2);
  });
});

describe("invokeOperation", () => {
  it("invokes handler with validated input", async () => {
    const reg = new Registry();
    reg.register(
      makeOp({
        id: "demo.add",
        input: z.object({ n: z.number() }),
        output: z.object({ ok: z.boolean(), n: z.number() }),
        handler: async (_ctx, input) => ({ ok: true, n: (input as { n: number }).n + 1 }),
      }),
    );
    const result = await invokeOperation(
      reg,
      "demo.add",
      { n: 1 },
      createContext({ surface: "cli" }),
    );
    expect(result).toEqual({ ok: true, n: 2 });
  });

  it("maps invalid input to VALIDATION_ERROR", async () => {
    const reg = new Registry();
    reg.register(
      makeOp({
        id: "demo.add",
        input: z.object({ n: z.number() }),
        output: z.object({ ok: z.boolean() }),
        handler: async () => ({ ok: true }),
      }),
    );
    await expect(
      invokeOperation(reg, "demo.add", { n: "x" }, createContext({ surface: "cli" })),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("propagates AppError from handler", async () => {
    const reg = new Registry();
    reg.register(
      makeOp({
        id: "demo.fail",
        handler: async () => {
          throw new AppError("NOT_FOUND", "missing", { status: 404 });
        },
      }),
    );
    await expect(
      invokeOperation(reg, "demo.fail", {}, createContext({ surface: "http" })),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("wraps unknown throws as INTERNAL", async () => {
    const reg = new Registry();
    reg.register(
      makeOp({
        id: "demo.boom",
        handler: async () => {
          throw new Error("boom");
        },
      }),
    );
    await expect(
      invokeOperation(reg, "demo.boom", {}, createContext({ surface: "http" })),
    ).rejects.toMatchObject({ code: "INTERNAL", status: 500 });
  });
});

describe("auth + mcp helpers", () => {
  it("authorize none allows anonymous", () => {
    const op = makeOp({
      id: "demo.open",
      meta: { sideEffect: "read", auth: "none" },
      handler: async () => ({ ok: true }),
    });
    const result = authorize(op, {});
    expect(result.actor?.kind).toBe("anonymous");
  });

  it("authorize apiKey rejects missing key", () => {
    const op = makeOp({
      id: "demo.secure",
      meta: { sideEffect: "write", auth: "apiKey" },
      handler: async () => ({ ok: true }),
    });
    expect(() => authorize(op, {})).toThrow(AppError);
  });

  it("authorize apiKey accepts dev-key by default outside production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    const op = makeOp({
      id: "demo.secure",
      meta: { sideEffect: "write", auth: "apiKey" },
      handler: async () => ({ ok: true }),
    });
    const result = authorize(op, { apiKey: "dev-key" });
    expect(result.actor?.kind).toBe("service");
    process.env.NODE_ENV = prev;
  });

  it("authorize does not invent dev-key in production", () => {
    const prev = process.env.NODE_ENV;
    const prevKey = process.env.APP_API_KEY;
    const prevKeys = process.env.APP_API_KEYS;
    process.env.NODE_ENV = "production";
    delete process.env.APP_API_KEY;
    delete process.env.APP_API_KEYS;
    const op = makeOp({
      id: "demo.secure",
      meta: { sideEffect: "write", auth: "apiKey" },
      handler: async () => ({ ok: true }),
    });
    expect(() => authorize(op, { apiKey: "dev-key" })).toThrow(AppError);
    process.env.NODE_ENV = prev;
    if (prevKey !== undefined) process.env.APP_API_KEY = prevKey;
    if (prevKeys !== undefined) process.env.APP_API_KEYS = prevKeys;
  });

  it("isMcpEnabled requires explicit flag", () => {
    const off = makeOp({ id: "a", handler: async () => ({ ok: true }) });
    const on = makeOp({
      id: "b",
      surfaces: { mcp: { enabled: true } },
      handler: async () => ({ ok: true }),
    });
    expect(isMcpEnabled(off)).toBe(false);
    expect(isMcpEnabled(on)).toBe(true);
  });
});
