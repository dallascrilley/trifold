import type { OperationDef, Surface } from "./types.js";
import { isMcpEnabled } from "./mcp.js";

export class Registry {
  private readonly ops = new Map<string, OperationDef>();

  register(op: OperationDef): void {
    if (this.ops.has(op.id)) {
      throw new Error(`Operation already registered: ${op.id}`);
    }
    if (isMcpEnabled(op)) {
      const side = op.meta.sideEffect;
      if (side !== "read" && !op.surfaces.mcp?.agentDescription) {
        throw new Error(
          `MCP-enabled write operation ${op.id} requires surfaces.mcp.agentDescription`,
        );
      }
    }
    this.ops.set(op.id, op);
  }

  get(id: string): OperationDef {
    const op = this.ops.get(id);
    if (!op) throw new Error(`Unknown operation: ${id}`);
    return op;
  }

  has(id: string): boolean {
    return this.ops.has(id);
  }

  list(): OperationDef[] {
    return [...this.ops.values()];
  }

  listForSurface(surface: Surface): OperationDef[] {
    return this.list().filter((op) => {
      if (surface === "http") return Boolean(op.surfaces.http);
      if (surface === "cli") return Boolean(op.surfaces.cli) && !op.surfaces.cli?.hidden;
      if (surface === "mcp") return isMcpEnabled(op);
      return false;
    });
  }
}
