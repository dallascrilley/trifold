import {
  type Registry,
  authorize,
  createContext,
  invokeOperation,
  isAppError,
  mcpToolDescription,
  mcpToolName,
  resolveCredentialsFromEnv,
  toAppError,
} from "@cli-mcp/core";
import { zodToJsonSchema } from "@cli-mcp/openapi";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export type McpToolMeta = {
  name: string;
  description: string;
};

export function listMcpTools(registry: Registry): McpToolMeta[] {
  return registry
    .listForSurface("mcp")
    .map((op) => ({
      name: mcpToolName(op),
      description: mcpToolDescription(op),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createMcpServer(registry: Registry) {
  const server = new Server(
    { name: "cli-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = registry.listForSurface("mcp").map((op) => {
      const name = mcpToolName(op);
      return {
        name,
        description: mcpToolDescription(op),
        inputSchema: zodToJsonSchema(op.input, `${name}Input`) as {
          type: "object";
          properties?: Record<string, unknown>;
        },
      };
    });
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const op = registry.listForSurface("mcp").find((o) => mcpToolName(o) === toolName);
    if (!op) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      };
    }

    try {
      const authResult = authorize(op, resolveCredentialsFromEnv());
      const ctx = createContext({
        surface: "mcp",
        actor: authResult.actor,
        auth: authResult.auth,
      });
      const result = await invokeOperation(
        registry,
        op.id,
        request.params.arguments ?? {},
        ctx,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    } catch (err) {
      const appErr = isAppError(err) ? err : toAppError(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(appErr.toJSON()),
          },
        ],
      };
    }
  });

  return {
    server,
    listToolNames: () => listMcpTools(registry).map((t) => t.name),
    listTools: () => listMcpTools(registry),
    async start(): Promise<void> {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
