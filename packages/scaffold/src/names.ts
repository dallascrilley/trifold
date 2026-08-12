export function assertSlug(slug: string): string {
  const raw = slug.trim();
  // Require already-kebab-case (no uppercase) so product ids stay stable in paths.
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(raw)) {
    throw new Error(
      `Invalid slug '${slug}': use kebab-case starting with a letter (e.g. notes, order-items)`,
    );
  }
  if (raw === "ops" || raw === "core" || raw === "scaffold" || raw === "smoke" || raw === "openapi") {
    throw new Error(`Slug '${raw}' is reserved for infrastructure packages`);
  }
  return raw;
}

/** notes → Notes; order-items → OrderItems */
export function toPascal(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/** notes → notes; order-items → order_items for op ids if needed */
export function toSnake(slug: string): string {
  return slug.replace(/-/g, "_");
}

/** Plural resource path segment (simple English +s) */
export function toResourcePath(slug: string): string {
  if (slug.endsWith("s")) return slug;
  if (slug.endsWith("y") && slug.length > 1) {
    return `${slug.slice(0, -1)}ies`;
  }
  return `${slug}s`;
}

export function defaultTitle(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
