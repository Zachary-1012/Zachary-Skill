import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/definitions.js";
import { registerProfessionalTools } from "./tools/professional.js";
import { registerAgentResources } from "./agent-native/resources.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "1.6.2";

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
        "TrendHub is an evidence-first, agent-native professional trend intelligence MCP. TrendHub v1.6 adds protocol-native MCP Resources, a canonical trendhub.* / trendhub:// namespace, Unified Evidence Contract v1, and Skill 2.0 while keeping the stable 21-tool compatibility facade. Prefer trendhub://namespace, trendhub://contracts/evidence, trendhub://capabilities, trendhub://sources and trendhub://skill/trendhub for machine-readable context. Use the stable tools for current hotlists, Xiaohongshu evidence, source reliability, cross-platform resonance, lifecycle/velocity/persistence/diffusion/confidence, lead-time benchmarks, Google Trends, future signals, event calendars, topic analysis, and content briefs. Professional Intelligence v2 adds robust anomaly detection, backtested 6/24/48/72h directional forecasts with uncertainty, evidence-only audience/creator signals, media evidence, alerts and executive reports; workspace_manage adds local-only RBAC/watchlists/saved queries/rules/audit. Missing/degraded data is explicit and must never be fabricated; NOT_COLLECTED/UNAVAILABLE/STALE/OFFLINE/AUTH_REQUIRED/RATE_LIMITED are distinct from observed zero/absence. Use get_trending for raw current lists, trend_intelligence for lifecycle, analyze_topic for a research pack, and professional_intelligence for unified decision support. Forecasts are not probabilities. Sensitive demographics are never inferred. Interpretation and final narrative generation are performed by the caller AI.",
    },
  );
  registerTools(server);
  registerProfessionalTools(server);
  registerAgentResources(server);
  return server;
}
