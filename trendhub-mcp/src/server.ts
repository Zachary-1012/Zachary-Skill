import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/definitions.js";
import { registerProfessionalTools } from "./tools/professional.js";
import { registerAgentResources } from "./agent-native/resources.js";

export const SERVER_NAME = "trendhub-mcp";
export const SERVER_VERSION = "1.7.3";

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
        "TrendHub is an evidence-first, agent-native professional trend intelligence MCP. TrendHub v1.7 adds Entity-first Query Evidence Acquisition and a Decision-first Intelligence Workspace on top of the protocol-native Resources, canonical trendhub.* / trendhub:// namespace, Unified Evidence Contract v1 and Skill 2.0, while keeping the stable 21-tool compatibility facade. Prefer trendhub://namespace, trendhub://contracts/evidence, trendhub://capabilities, trendhub://sources and trendhub://skill/trendhub for machine-readable context. Use the stable tools for current hotlists, Xiaohongshu evidence, source reliability, cross-platform resonance, lifecycle/velocity/persistence/diffusion/confidence, lead-time benchmarks, Google Trends, future signals, event calendars, topic analysis, and content briefs. Professional Intelligence v3 is the canonical entry for brands, companies, commercial places, products and campaigns: it actively acquires subject-specific public evidence before interpreting lifecycle, anomaly, backtested 6/24/48/72h forecasts, audience/creator signals, media evidence, risks, opportunities and decision briefs; workspace_manage adds local-only RBAC/watchlists/saved queries/rules/audit. Missing/degraded data is explicit and must never be fabricated; NOT_COLLECTED/UNAVAILABLE/STALE/OFFLINE/AUTH_REQUIRED/RATE_LIMITED are distinct from observed zero/absence. Use professional_intelligence for brand/entity/campaign/business-subject research; use analyze_topic for topic/hotspot research; use get_trending only for raw current lists; use trend_intelligence for lifecycle-only longitudinal analysis. Never use hotlist absence as proof that a business entity has no discussion. Forecasts are not probabilities. Sensitive demographics are never inferred. Interpretation and final narrative generation are performed by the caller AI.",
    },
  );
  registerTools(server);
  registerProfessionalTools(server);
  registerAgentResources(server);
  return server;
}
