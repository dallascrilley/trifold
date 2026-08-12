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
} from "@trifold/core";
import { zodToJsonSchema } from "@trifold/openapi";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Server as HttpServer } from "node:http";

export type McpToolMeta = {
  name: string;
  description: string;
};

export type McpHttpOptions = {
  /** Bind host. Default 127.0.0.1 (DNS rebinding protection enabled). */
  host?: string;
  /** TCP port. Default 8790. Use 0 for an ephemeral port (tests). */
  port?: number;
  /** HTTP path for MCP. Default /mcp */
  path?: string;
};

export type McpHttpHandle = {
  url: string;
  host: string;
  port: number;
  path: string;
  close: () => Promise<void>;
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

function createProtocolServer(registry: Registry, name = "cli-mcp"): Server {
  const server = new Server(
    { name, version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = registry.listForSurface("mcp").map((op) => {
      const toolName = mcpToolName(op);
      return {
        name: toolName,
        description: mcpToolDescription(op),
        inputSchema: zodToJsonSchema(op.input, `${toolName}Input`) as {
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

  return server;
}

export function createMcpServer(registry: Registry, options?: { name?: string }) {
  // One long-lived Server for stdio; HTTP creates per-request servers (stateless).
  const stdioServer = createProtocolServer(registry, options?.name ?? "cli-mcp");

  return {
    server: stdioServer,
    listToolNames: () => listMcpTools(registry).map((t) => t.name),
    listTools: () => listMcpTools(registry),

    /** Default transport: stdio (local agents / Claude Desktop). */
    async startStdio(): Promise<void> {
      const transport = new StdioServerTransport();
      await stdioServer.connect(transport);
    },

    /** Alias for startStdio — backward compatible. */
    async start(): Promise<void> {
      await this.startStdio();
    },

    /**
     * Streamable HTTP MCP (stateless). Supports POST /mcp JSON-RPC;
     * Streamable HTTP may use SSE under the hood for streaming responses.
     */
    async startHttp(httpOptions: McpHttpOptions = {}): Promise<McpHttpHandle> {
      const host = httpOptions.host ?? "127.0.0.1";
      const port = httpOptions.port ?? 8790;
      const path = httpOptions.path ?? "/mcp";

      const app = createMcpExpressApp({ host });

      app.post(path, async (req, res) => {
        const server = createProtocolServer(registry, options?.name ?? "cli-mcp");
        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless
          });
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
          res.on("close", () => {
            void transport.close();
            void server.close();
          });
        } catch (error) {
          console.error("MCP HTTP request error:", error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal server error" },
              id: null,
            });
          }
        }
      });

      // Stateless: GET/DELETE not used for session management
      app.get(path, (_req, res) => {
        res.status(405).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed (use POST for Streamable HTTP)." },
          id: null,
        });
      });
      app.delete(path, (_req, res) => {
        res.status(405).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed (stateless mode)." },
          id: null,
        });
      });

      app.get("/healthz", (_req, res) => {
        res.json({ ok: true, transport: "http", tools: listMcpTools(registry).map((t) => t.name) });
      });

      const httpServer: HttpServer = await new Promise((resolve, reject) => {
        const s = app.listen(port, host, () => resolve(s));
        s.on("error", reject);
      });

      const address = httpServer.address();
      const boundPort =
        address && typeof address === "object" ? address.port : port;
      const url = `http://${host}:${boundPort}${path}`;

      return {
        url,
        host,
        port: boundPort,
        path,
        close: () =>
          new Promise((resolve, reject) => {
            httpServer.close((err) => (err ? reject(err) : resolve()));
          }),
      };
    },
  };
}

export type McpServerHandle = ReturnType<typeof createMcpServer>;
