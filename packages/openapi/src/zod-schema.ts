import type { z } from "zod";
import { zodToJsonSchema as convert } from "zod-to-json-schema";

export function zodToJsonSchema(schema: z.ZodTypeAny, name: string): Record<string, unknown> {
  const json = convert(schema, {
    name,
    target: "openApi3",
    $refStrategy: "none",
  }) as Record<string, unknown>;

  // zod-to-json-schema may wrap under definitions[name]
  if (json.definitions && typeof json.definitions === "object") {
    const defs = json.definitions as Record<string, unknown>;
    if (defs[name] && typeof defs[name] === "object") {
      return defs[name] as Record<string, unknown>;
    }
  }
  if (json.$ref && json.definitions) {
    const defs = json.definitions as Record<string, unknown>;
    const key = Object.keys(defs)[0];
    if (key && defs[key]) return defs[key] as Record<string, unknown>;
  }
  const { $schema, definitions, ...rest } = json;
  void $schema;
  void definitions;
  return rest;
}
