export type OutputFormat = "json" | "table" | "text";

export function formatOutput(value: unknown, format: OutputFormat): string {
  if (format === "json") {
    return `${JSON.stringify(value, null, 2)}\n`;
  }

  if (format === "text") {
    if (typeof value === "string") return `${value}\n`;
    return `${JSON.stringify(value)}\n`;
  }

  // table
  if (Array.isArray(value)) {
    return formatTable(value);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.tasks)) return formatTable(obj.tasks as unknown[]);
    return formatTable([obj]);
  }
  return `${String(value)}\n`;
}

function formatTable(rows: unknown[]): string {
  if (rows.length === 0) return "(empty)\n";
  const objects = rows.map((r) =>
    r && typeof r === "object" ? (r as Record<string, unknown>) : { value: r },
  );
  const keys = [...new Set(objects.flatMap((o) => Object.keys(o)))];
  const header = keys.join("\t");
  const lines = objects.map((o) => keys.map((k) => stringifyCell(o[k])).join("\t"));
  return `${header}\n${lines.join("\n")}\n`;
}

function stringifyCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
