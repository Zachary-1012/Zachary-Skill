import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/definitions.js";
import { registerProfessionalTools } from "./tools/professional.js";
import { registerAgentResources } from "./agent-native/resources.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "1.5.3";

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
        "TrendHub is an evidence-first, agent-native professional trend intelligence MCP. Use the stable tools for current hotlists, Xiaohongshu evidence, source reliability, cross-platform resonance, lifecycle/velocity/persistence/diffusion/confidence, lead-time benchmarks, Google Trends, future signals, event calendars, topic analysis, and content briefs. Professional Intelligence v2 adds robust anomaly detection, backtested 6/24/48/72h directional forecasts with uncertainty, evidence-only audience/creator signals, media evidence, alerts and executive reports; workspace_manage adds local-only RBAC/watchlists/saved queries/rules/audit plus an Evidence→Outcome→Evaluation→Learning loop; public Remote workspace access is effect-fenced. Missing/degraded data is explicit and must never be fabricated. Forecasts are not probabilities. Sensitive demographics are never inferred. Interpretation and final narrative generation are performed by the caller AI.",
    },
  );
  registerTools(server);
  registerProfessionalTools(server);
  registerAgentResources(server);
  return server;
}
