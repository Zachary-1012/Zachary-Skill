import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/definitions.js";
import { registerProfessionalTools } from "./tools/professional.js";
import { registerAgentResources } from "./agent-native/resources.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "2.0.0";

/** 创建一个 MCP server 实例并注册全部工具（stateless HTTP 模式下每请求新建） */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "TrendHub 2.0 is an evidence-first AI content workspace and professional trend intelligence MCP. It keeps the stable 21-tool compatibility facade, Entity-first research, Decision View, Unified Evidence Contract and trendhub:// Resources, then turns verified research into persistent briefs, editable artifacts, review stages, publishing preparation and evaluation. The Skill page uses the current host AI when available and can connect to a user-controlled OpenAI-compatible local model; TrendHub never stores the user's model credential. Prefer commercially usable open-weight models that fit the task and runtime, while keeping model output replaceable and separate from factual Evidence. Missing/degraded data is explicit and never fabricated; NOT_COLLECTED/UNAVAILABLE/STALE/OFFLINE/AUTH_REQUIRED/RATE_LIMITED are distinct from observed zero or absence. Use professional_intelligence for business entities, analyze_topic for topics, get_trending for raw rankings, and get_content_brief for evidence-backed creation context. Forecasts are not probabilities and unknown factual claims remain unknown.",
    },
  );
  registerTools(server);
  registerProfessionalTools(server);
  registerAgentResources(server);
  return server;
}
