import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/register.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "1.3.0";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  }, {
    instructions:
      "TrendHub is an evidence-first trend intelligence MCP. Use its tools for current hotlists, cross-platform resonance, trend change, Google Trends, future signals, event calendars, topic analysis, and content briefs. Missing/degraded data is explicit; do not fabricate unavailable evidence. The caller LLM performs interpretation and generation.",
  });
  registerTools(server);
  return server;
}
