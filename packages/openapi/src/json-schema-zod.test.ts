import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonSchemaToZod } from "./json-schema-zod.js";

describe("jsonSchemaToZod", () => {
  it("maps string with minLength", () => {
    const schema = jsonSchemaToZod({ type: "string", minLength: 1 });
    expect(schema.safeParse("a").success).toBe(true);
    expect(schema.safeParse("").success).toBe(false);
  });

  it("maps object required properties", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      properties: {
        title: { type: "string", minLength: 1 },
        due: { type: "string" },
      },
      required: ["title"],
      additionalProperties: false,
    });
    expect(schema.safeParse({ title: "x" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ title: "x", extra: 1 }).success).toBe(false);
  });

  it("maps array of strings", () => {
    const schema = jsonSchemaToZod({
      type: "array",
      items: { type: "string" },
    });
    expect(schema.safeParse(["a", "b"]).success).toBe(true);
    expect(schema.safeParse([1]).success).toBe(false);
  });

  it("resolves $ref into components", () => {
    const components = {
      Task: {
        type: "object",
        properties: { id: { type: "string" }, title: { type: "string" } },
        required: ["id", "title"],
        additionalProperties: false,
      },
    };
    const schema = jsonSchemaToZod(
      { $ref: "#/components/schemas/Task" },
      { components },
    );
    expect(schema.safeParse({ id: "1", title: "t" }).success).toBe(true);
    expect(schema.safeParse({ id: "1" }).success).toBe(false);
  });

  it("maps string enum", () => {
    const schema = jsonSchemaToZod({ type: "string", enum: ["a", "b"] });
    expect(schema.safeParse("a").success).toBe(true);
    expect(schema.safeParse("c").success).toBe(false);
  });

  it("maps integer", () => {
    const schema = jsonSchemaToZod({ type: "integer", minimum: 0 });
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(1.5).success).toBe(false);
  });
});
