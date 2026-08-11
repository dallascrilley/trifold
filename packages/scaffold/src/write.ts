import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertSlug, defaultTitle, toResourcePath } from "./names.js";
import { planProductFiles } from "./templates.js";
import type { ScaffoldOptions, ScaffoldResult } from "./types.js";

export function scaffoldProduct(options: ScaffoldOptions): ScaffoldResult {
  const slug = assertSlug(options.slug);
  const title = options.title?.trim() || defaultTitle(slug);
  const files = planProductFiles(slug, title);
  const root = options.root;

  // Refuse overwrite of domain package
  const domainPkg = join(root, "packages", slug, "package.json");
  if (existsSync(domainPkg) && !options.dryRun) {
    throw new Error(`Refusing to overwrite existing package: packages/${slug}`);
  }

  const written: string[] = [];
  if (!options.dryRun) {
    for (const file of files) {
      const abs = join(root, file.path);
      mkdirSync(dirname(abs), { recursive: true });
      if (existsSync(abs)) {
        throw new Error(`Refusing to overwrite existing file: ${file.path}`);
      }
      writeFileSync(abs, file.content, "utf8");
      written.push(file.path);
    }
  }

  return {
    slug,
    title,
    resource: toResourcePath(slug),
    files,
    written: options.dryRun ? [] : written,
  };
}
