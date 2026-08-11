import { z, type ZodTypeAny } from "zod";

export type JsonSchema = {
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  additionalProperties?: boolean | JsonSchema;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  nullable?: boolean;
  [key: string]: unknown;
};

export type JsonSchemaToZodOptions = {
  /** components.schemas map for $ref resolution */
  components?: Record<string, unknown>;
  /** Max $ref depth (cycle guard). Default 8. */
  maxDepth?: number;
};

function unwrapRef(
  schema: JsonSchema,
  components: Record<string, unknown> | undefined,
  stack: string[],
): JsonSchema {
  if (!schema.$ref) return schema;
  const ref = schema.$ref;
  if (!ref.startsWith("#/components/schemas/")) {
    return schema; // unsupported ref — leave as unknown later
  }
  const name = ref.slice("#/components/schemas/".length);
  if (stack.includes(name)) {
    return { type: "object", additionalProperties: true };
  }
  const target = components?.[name];
  if (!target || typeof target !== "object") {
    return { type: "object", additionalProperties: true };
  }
  return unwrapRef(target as JsonSchema, components, [...stack, name]);
}

function withNullable(schema: ZodTypeAny, nullable: boolean | undefined): ZodTypeAny {
  return nullable ? schema.nullable() : schema;
}

/**
 * Convert a subset of JSON Schema / OpenAPI schema objects into Zod.
 * Unsupported constructs fall back to z.unknown() or passthrough objects.
 */
export function jsonSchemaToZod(
  schema: unknown,
  options: JsonSchemaToZodOptions = {},
  depth = 0,
): ZodTypeAny {
  const maxDepth = options.maxDepth ?? 8;
  if (depth > maxDepth) return z.unknown();
  if (!schema || typeof schema !== "object") return z.unknown();

  let s = schema as JsonSchema;
  s = unwrapRef(s, options.components, []);

  if (s.const !== undefined) {
    return withNullable(z.literal(s.const as string | number | boolean), s.nullable);
  }

  if (Array.isArray(s.enum) && s.enum.length > 0) {
    const allStrings = s.enum.every((v) => typeof v === "string");
    if (allStrings) {
      const [first, ...rest] = s.enum as string[];
      return withNullable(z.enum([first!, ...rest] as [string, ...string[]]), s.nullable);
    }
    const literals = s.enum.map((v) => z.literal(v as string | number | boolean));
    if (literals.length === 1) return withNullable(literals[0]!, s.nullable);
    return withNullable(
      z.union(literals as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]),
      s.nullable,
    );
  }

  if (Array.isArray(s.anyOf) && s.anyOf.length > 0) {
    const parts = s.anyOf.map((p) => jsonSchemaToZod(p, options, depth + 1));
    if (parts.length === 1) return withNullable(parts[0]!, s.nullable);
    return withNullable(
      z.union(parts as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]),
      s.nullable,
    );
  }

  if (Array.isArray(s.oneOf) && s.oneOf.length > 0) {
    const parts = s.oneOf.map((p) => jsonSchemaToZod(p, options, depth + 1));
    if (parts.length === 1) return withNullable(parts[0]!, s.nullable);
    return withNullable(
      z.union(parts as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]),
      s.nullable,
    );
  }

  if (Array.isArray(s.allOf) && s.allOf.length > 0) {
    // Prefer merging object shapes when possible
    const objects = s.allOf.filter((p) => {
      const u = unwrapRef(p as JsonSchema, options.components, []);
      return !u.type || u.type === "object" || u.properties;
    });
    if (objects.length === s.allOf.length) {
      const merged: JsonSchema = { type: "object", properties: {}, required: [] };
      for (const part of s.allOf) {
        const u = unwrapRef(part as JsonSchema, options.components, []);
        merged.properties = { ...merged.properties, ...(u.properties ?? {}) };
        merged.required = [...(merged.required ?? []), ...(u.required ?? [])];
      }
      return jsonSchemaToZod(merged, options, depth + 1);
    }
    let acc = jsonSchemaToZod(s.allOf[0], options, depth + 1);
    for (let i = 1; i < s.allOf.length; i++) {
      acc = z.intersection(acc, jsonSchemaToZod(s.allOf[i], options, depth + 1));
    }
    return withNullable(acc, s.nullable);
  }

  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : [];
  const primary =
    types.find((t) => t !== "null") ??
    (s.properties || s.additionalProperties !== undefined ? "object" : undefined) ??
    (s.items ? "array" : undefined);

  if (types.includes("null") && primary) {
    return jsonSchemaToZod({ ...s, type: primary, nullable: true }, options, depth);
  }

  switch (primary) {
    case "string": {
      let zs = z.string();
      if (typeof s.minLength === "number") zs = zs.min(s.minLength);
      if (typeof s.maxLength === "number") zs = zs.max(s.maxLength);
      return withNullable(zs, s.nullable);
    }
    case "number": {
      let zn = z.number();
      if (typeof s.minimum === "number") zn = zn.min(s.minimum);
      if (typeof s.maximum === "number") zn = zn.max(s.maximum);
      return withNullable(zn, s.nullable);
    }
    case "integer": {
      let zi = z.number().int();
      if (typeof s.minimum === "number") zi = zi.min(s.minimum);
      if (typeof s.maximum === "number") zi = zi.max(s.maximum);
      return withNullable(zi, s.nullable);
    }
    case "boolean":
      return withNullable(z.boolean(), s.nullable);
    case "array": {
      const item = s.items
        ? jsonSchemaToZod(s.items, options, depth + 1)
        : z.unknown();
      return withNullable(z.array(item), s.nullable);
    }
    case "object":
    default: {
      if (primary && primary !== "object" && !s.properties) {
        return z.unknown();
      }
      const props = s.properties ?? {};
      const required = new Set(s.required ?? []);
      const shape: Record<string, ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(props)) {
        let field = jsonSchemaToZod(propSchema, options, depth + 1);
        if (!required.has(key)) field = field.optional();
        shape[key] = field;
      }

      if (Object.keys(shape).length === 0) {
        if (s.additionalProperties === false) {
          return withNullable(z.object({}), s.nullable);
        }
        if (s.additionalProperties && typeof s.additionalProperties === "object") {
          const val = jsonSchemaToZod(s.additionalProperties, options, depth + 1);
          return withNullable(z.record(val), s.nullable);
        }
        return withNullable(z.record(z.unknown()), s.nullable);
      }

      const base = z.object(shape);
      let obj: ZodTypeAny = base;
      if (s.additionalProperties === true) {
        obj = base.passthrough();
      } else if (s.additionalProperties === false || s.additionalProperties === undefined) {
        // OpenAPI often omits additionalProperties; strict rejects unknowns
        obj = base.strict();
      } else if (typeof s.additionalProperties === "object") {
        obj = base.passthrough();
      }
      return withNullable(obj, s.nullable);
    }
  }
}

/** Resolve a schema that may be inline or $ref. */
export function resolveSchema(
  schema: unknown,
  components?: Record<string, unknown>,
): unknown {
  if (!schema || typeof schema !== "object") return schema;
  return unwrapRef(schema as JsonSchema, components, []);
}
