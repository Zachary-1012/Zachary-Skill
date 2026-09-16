import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/definitions.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "1.3.0";

/** 创建一个 MCP server 实例并注册全部工具（stateless HTTP 模式下每请求新建） */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        "TrendHub is an evidence-first trend intelligence MCP: use its tools for current hotlists, Xiaohongshu evidence, cross-platform resonance, trend changes, Google Trends, future signals, event calendars, topic analysis, and content briefs. Missing/degraded data is explicit and must not be fabricated; interpretation and final generation are performed by the caller AI.",
    },
  );
  registerTools(server);
  return server;
}
