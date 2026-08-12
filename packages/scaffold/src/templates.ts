import { defaultTitle, toPascal, toResourcePath } from "./names.js";
import type { PlannedFile } from "./types.js";

export function planProductFiles(slug: string, title?: string): PlannedFile[] {
  const name = title?.trim() || defaultTitle(slug);
  const pascal = toPascal(slug);
  const resource = toResourcePath(slug); // notes, items
  const pkgName = `@trifold/${slug}`;
  // operation ids: notes.list style — use first segment or full with underscore
  const opId = slug.replace(/-/g, "_"); // notes, order_items
  const envStoreKey = `${slug.replace(/-/g, "_").toUpperCase()}_STORE_PATH`; // NOTES_STORE_PATH
  // NotesStore → notesStoreFromEnv
  const storeFromEnv = `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}StoreFromEnv`;

  const files: PlannedFile[] = [];

  // Domain package
  files.push({
    path: `packages/${slug}/package.json`,
    content: JSON.stringify(
      {
        name: pkgName,
        version: "0.1.0",
        private: true,
        type: "module",
        exports: {
          ".": {
            types: "./src/index.ts",
            import: "./src/index.ts",
          },
        },
        scripts: {
          typecheck: "tsc -p tsconfig.json --noEmit",
          test: "vitest run",
          build: "tsc -p tsconfig.json --noEmit",
        },
        dependencies: {
          "@trifold/core": "workspace:*",
          zod: "^3.24.2",
        },
        devDependencies: {
          typescript: "^5.8.2",
          vitest: "^3.0.9",
        },
      },
      null,
      2,
    ) + "\n",
  });

  files.push({
    path: `packages/${slug}/tsconfig.json`,
    content: `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
`,
  });

  files.push({
    path: `packages/${slug}/vitest.config.ts`,
    content: `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
`,
  });

  files.push({
    path: `packages/${slug}/src/schemas.ts`,
    content: `import { z } from "zod";

export const ${pascal}Schema = z.object({
  id: z.string(),
  title: z.string().min(1),
  body: z.string().optional(),
  createdAt: z.string(),
});

export type ${pascal} = z.infer<typeof ${pascal}Schema>;

export const Create${pascal}Input = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

export const List${pascal}Input = z.object({});

export const List${pascal}Output = z.object({
  items: z.array(${pascal}Schema),
});

export const Get${pascal}Input = z.object({
  id: z.string().min(1),
});
`,
  });

  files.push({
    path: `packages/${slug}/src/store.ts`,
    content: `import { AppError, JsonFileMapStore, storePathFromEnv } from "@trifold/core";
import type { ${pascal} } from "./schemas.js";
import { ${pascal}Schema } from "./schemas.js";

export type ${pascal}StoreOptions = {
  /** JSON file path for multi-process sharing (API/CLI/MCP). */
  filePath?: string;
};

export class ${pascal}Store {
  private readonly backend: JsonFileMapStore<${pascal}>;

  constructor(options: ${pascal}StoreOptions = {}) {
    this.backend = new JsonFileMapStore({
      filePath: options.filePath,
      itemSchema: ${pascal}Schema,
      collectionKey: "items",
      label: "${slug} store",
    });
  }

  create(input: { title: string; body?: string }): ${pascal} {
    const item: ${pascal} = {
      id: crypto.randomUUID(),
      title: input.title,
      createdAt: new Date().toISOString(),
      ...(input.body !== undefined ? { body: input.body } : {}),
    };
    this.backend.set(item);
    return item;
  }

  list(): ${pascal}[] {
    return this.backend.list();
  }

  get(id: string): ${pascal} {
    const item = this.backend.get(id);
    if (!item) {
      throw new AppError("NOT_FOUND", \`${pascal} not found: \${id}\`, { status: 404 });
    }
    return item;
  }

  clear(): void {
    this.backend.clear();
  }

  get persistencePath(): string | undefined {
    return this.backend.persistencePath;
  }
}

/** Resolve store from ${envStoreKey} (or empty → memory). */
export function ${storeFromEnv}(
  env: NodeJS.ProcessEnv = process.env,
): ${pascal}Store {
  const filePath = storePathFromEnv(env, "${envStoreKey}", "CLI_MCP_STORE_PATH");
  return new ${pascal}Store(filePath ? { filePath } : {});
}
`,
  });

  files.push({
    path: `packages/${slug}/src/ops.ts`,
    content: `import { type OperationDef, Registry } from "@trifold/core";
import {
  Create${pascal}Input,
  Get${pascal}Input,
  List${pascal}Input,
  List${pascal}Output,
  ${pascal}Schema,
} from "./schemas.js";
import { ${pascal}Store } from "./store.js";

export function register${pascal}(registry: Registry, store: ${pascal}Store): void {
  const list: OperationDef = {
    id: "${opId}.list",
    summary: "List ${resource}",
    description: "Return all ${resource}",
    input: List${pascal}Input,
    output: List${pascal}Output,
    meta: { sideEffect: "read", auth: "none", tags: ["${slug}"] },
    surfaces: {
      http: { method: "get", path: "/${resource}" },
      cli: { command: "${slug} list" },
      mcp: {
        enabled: true,
        agentDescription: "List all ${resource}. Use for inventory.",
      },
    },
    handler: async () => ({ items: store.list() }),
  };

  const get: OperationDef = {
    id: "${opId}.get",
    summary: "Get a ${slug} by id",
    input: Get${pascal}Input,
    output: ${pascal}Schema,
    meta: { sideEffect: "read", auth: "none", tags: ["${slug}"] },
    surfaces: {
      http: { method: "get", path: "/${resource}/{id}" },
      cli: { command: "${slug} get", positional: ["id"] },
      mcp: {
        enabled: true,
        agentDescription: "Fetch one ${slug} by id.",
      },
    },
    handler: async (_ctx, input) => store.get(input.id),
  };

  const create: OperationDef = {
    id: "${opId}.create",
    summary: "Create a ${slug}",
    input: Create${pascal}Input,
    output: ${pascal}Schema,
    meta: { sideEffect: "write", auth: "apiKey", tags: ["${slug}"] },
    surfaces: {
      http: { method: "post", path: "/${resource}", successStatus: 201 },
      cli: { command: "${slug} create", positional: ["title"] },
      mcp: {
        enabled: true,
        agentDescription:
          "Create a ${slug} with a title and optional body. New items only.",
      },
    },
    handler: async (_ctx, input) => store.create(input),
  };

  registry.register(list);
  registry.register(get);
  registry.register(create);
}

export function create${pascal}Registry(store = new ${pascal}Store()): {
  registry: Registry;
  store: ${pascal}Store;
} {
  const registry = new Registry();
  register${pascal}(registry, store);
  return { registry, store };
}
`,
  });

  files.push({
    path: `packages/${slug}/src/index.ts`,
    content: `export { ${pascal}Store, ${storeFromEnv}, type ${pascal}StoreOptions } from "./store.js";
export {
  Create${pascal}Input,
  Get${pascal}Input,
  List${pascal}Input,
  List${pascal}Output,
  ${pascal}Schema,
  type ${pascal},
} from "./schemas.js";
export { create${pascal}Registry, register${pascal} } from "./ops.js";
`,
  });

  files.push({
    path: `packages/${slug}/src/${slug}.test.ts`,
    content: `import { createContext, invokeOperation } from "@trifold/core";
import { describe, expect, it } from "vitest";
import { create${pascal}Registry } from "./ops.js";

describe("${slug} domain", () => {
  it("create, list, get", async () => {
    const { registry } = create${pascal}Registry();
    const ctx = createContext({ surface: "cli" });

    const created = (await invokeOperation(
      registry,
      "${opId}.create",
      { title: "Hello ${name}" },
      ctx,
    )) as { id: string; title: string };

    expect(created.title).toBe("Hello ${name}");

    const listed = (await invokeOperation(registry, "${opId}.list", {}, ctx)) as {
      items: { id: string }[];
    };
    expect(listed.items).toHaveLength(1);

    const got = (await invokeOperation(
      registry,
      "${opId}.get",
      { id: created.id },
      ctx,
    )) as { id: string };
    expect(got.id).toBe(created.id);
  });

  it("get missing throws NOT_FOUND", async () => {
    const { registry } = create${pascal}Registry();
    await expect(
      invokeOperation(
        registry,
        "${opId}.get",
        { id: "missing" },
        createContext({ surface: "http" }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
});
`,
  });

  // Apps: api, cli, mcp
  for (const kind of ["api", "cli", "mcp"] as const) {
    const appName = `@trifold-app/${slug}-${kind}`;
    const appDir = `apps/${slug}-${kind}`;

    if (kind === "api") {
      files.push({
        path: `${appDir}/package.json`,
        content: JSON.stringify(
          {
            name: appName,
            version: "0.1.0",
            private: true,
            type: "module",
            scripts: {
              dev: "tsx src/index.ts",
              start: "tsx src/index.ts",
              typecheck: "tsc -p tsconfig.json --noEmit",
              build: "tsc -p tsconfig.json --noEmit",
              test: "vitest run --passWithNoTests",
            },
            dependencies: {
              "@trifold/adapters-http": "workspace:*",
              "@trifold/openapi": "workspace:*",
              [pkgName]: "workspace:*",
              "@hono/node-server": "^1.14.1",
              hono: "^4.7.4",
            },
            devDependencies: {
              tsx: "^4.19.3",
              typescript: "^5.8.2",
              vitest: "^3.0.9",
            },
          },
          null,
          2,
        ) + "\n",
      });
      files.push({
        path: `${appDir}/tsconfig.json`,
        content: `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
`,
      });
      files.push({
        path: `${appDir}/src/index.ts`,
        content: `import { createHttpApp } from "@trifold/adapters-http";
import { emitOpenAPI } from "@trifold/openapi";
import { create${pascal}Registry, ${storeFromEnv} } from "${pkgName}";
import { serve } from "@hono/node-server";

const store = ${storeFromEnv}();
const { registry } = create${pascal}Registry(store);
const openapi = emitOpenAPI(registry, { title: "${name} API", version: "0.1.0" });
const app = createHttpApp(registry, { openapiDocument: openapi });

const port = Number(process.env.PORT ?? 8788);

serve({ fetch: app.fetch, port }, (info) => {
  console.error(\`${name} API listening on http://localhost:\${info.port}\`);
  console.error(\`OpenAPI: http://localhost:\${info.port}/openapi.json\`);
  if (store.persistencePath) {
    console.error(\`Store: \${store.persistencePath}\`);
  } else {
    console.error("Store: memory (set ${envStoreKey} to share with CLI)");
  }
});
`,
      });
    }

    if (kind === "cli") {
      files.push({
        path: `${appDir}/package.json`,
        content: JSON.stringify(
          {
            name: appName,
            version: "0.1.0",
            private: true,
            type: "module",
            bin: {
              [`${slug}-cli`]: "./src/index.ts",
            },
            scripts: {
              start: "tsx src/index.ts",
              typecheck: "tsc -p tsconfig.json --noEmit",
              build: "tsc -p tsconfig.json --noEmit",
              test: "vitest run --passWithNoTests",
            },
            dependencies: {
              "@trifold/adapters-cli": "workspace:*",
              [pkgName]: "workspace:*",
            },
            devDependencies: {
              tsx: "^4.19.3",
              typescript: "^5.8.2",
              vitest: "^3.0.9",
            },
          },
          null,
          2,
        ) + "\n",
      });
      files.push({
        path: `${appDir}/tsconfig.json`,
        content: `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
`,
      });
      files.push({
        path: `${appDir}/src/index.ts`,
        content: `#!/usr/bin/env node
import { createCli } from "@trifold/adapters-cli";
import { create${pascal}Registry, ${storeFromEnv} } from "${pkgName}";

const store = ${storeFromEnv}();
const { registry } = create${pascal}Registry(store);
const cli = createCli(registry, { name: "${slug}-cli", version: "0.1.0" });

const code = await cli.run(process.argv.slice(2));
process.exit(code);
`,
      });
    }

    if (kind === "mcp") {
      files.push({
        path: `${appDir}/package.json`,
        content: JSON.stringify(
          {
            name: appName,
            version: "0.1.0",
            private: true,
            type: "module",
            scripts: {
              start: "tsx src/index.ts",
              typecheck: "tsc -p tsconfig.json --noEmit",
              build: "tsc -p tsconfig.json --noEmit",
              test: "vitest run --passWithNoTests",
            },
            dependencies: {
              "@trifold/adapters-mcp": "workspace:*",
              [pkgName]: "workspace:*",
            },
            devDependencies: {
              tsx: "^4.19.3",
              typescript: "^5.8.2",
              vitest: "^3.0.9",
            },
          },
          null,
          2,
        ) + "\n",
      });
      files.push({
        path: `${appDir}/tsconfig.json`,
        content: `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
`,
      });
      files.push({
        path: `${appDir}/src/index.ts`,
        content: `#!/usr/bin/env node
import { runMcpMain } from "@trifold/adapters-mcp";
import { create${pascal}Registry, ${storeFromEnv} } from "${pkgName}";

const store = ${storeFromEnv}();
const { registry } = create${pascal}Registry(store);
await runMcpMain({ registry, name: "${slug}-mcp" });
`,
      });
    }
  }

  return files;
}
