import type { OperationDef } from "./types.js";

export function isMcpEnabled(op: OperationDef): boolean {
  return op.surfaces.mcp?.enabled === true;
}

export function mcpToolName(op: OperationDef): string {
  return op.surfaces.mcp?.toolName ?? op.id.replace(/\./g, "_");
}

export function mcpToolDescription(op: OperationDef): string {
  return (
    op.surfaces.mcp?.agentDescription ??
    op.description ??
    op.summary
  );
}
