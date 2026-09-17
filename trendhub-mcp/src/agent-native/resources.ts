import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listPlatforms } from "../sources/index.js";
import { professionalSourceCatalog } from "../sources/professional-catalog.js";
import { getSourceReliability } from "../store/reliability.js";
import { historyDepth, readHistory } from "../store/history.js";
import { capabilityRegistry } from "./capability-registry.js";
import { completeResult } from "./evidence-contract.js";

const json = (value: unknown) => ({ contents: [{ uri: "", mimeType: "application/json", text: JSON.stringify(value, null, 2) }] });
const markdown = (uri: string, text: string) => ({ contents: [{ uri, mimeType: "text/markdown", text }] });
const safe = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 160 && !/[\\/?#]/.test(value);

export function registerAgentResources(server: McpServer): void {
  server.registerResource("methodology", "trendhub://methodology", { title: "TrendHub methodology", description: "Evidence, reliability and forecast boundaries", mimeType: "text/markdown" }, async (uri) => markdown(uri.href, `# TrendHub methodology\n\nTrendHub is evidence-first and local-first. Missing data remains missing; planned or licensed sources are not counted as live coverage. Forecasts are directional, require sufficient history, and are never probabilities. Source reliability is calculated from local observations only.\n\nNew Agent-native capabilities use the TrendHubResult envelope with data, evidence, reliability, confidence, limitations and trace.`));
  server.registerResource("sources", "trendhub://sources", { title: "TrendHub source universe", description: "Live platform inventory and professional source access modes", mimeType: "application/json" }, async (uri) => ({ ...json({ live: listPlatforms(), professional: professionalSourceCatalog() }), contents: [{ ...(json({}).contents[0]), uri: uri.href }] }));
  server.registerResource("capabilities", "trendhub://capabilities", { title: "TrendHub capability registry", description: "Canonical namespaces and compatibility facade", mimeType: "application/json" }, async (uri) => ({ ...json(capabilityRegistry()), contents: [{ ...json(capabilityRegistry()).contents[0], uri: uri.href }] }));
  server.registerResource("source-health", "trendhub://reliability", { title: "TrendHub source reliability", description: "Local reliability observations; no telemetry export", mimeType: "application/json" }, async (uri) => ({ ...json({ sources: listPlatforms().map((p) => getSourceReliability(p.platform)) }), contents: [{ ...json({}).contents[0], uri: uri.href }] }));

  const platformTemplate = new ResourceTemplate("trendhub://platform/{platform}/history", {
    list: async () => ({ resources: listPlatforms().map((p) => ({ uri: `trendhub://platform/${encodeURIComponent(p.platform)}/history`, name: `${p.label} history`, mimeType: "application/json" })) }),
    complete: { platform: async (value) => listPlatforms().map((p) => p.platform).filter((p) => p.startsWith(value)) },
  });
  server.registerResource("platform-history", platformTemplate, { title: "Platform trend history", description: "Read bounded local history for one live platform", mimeType: "application/json" }, async (uri, variables) => {
    const platform = Array.isArray(variables.platform) ? variables.platform[0] : variables.platform;
    if (!safe(platform) || !listPlatforms().some((p) => p.platform === platform)) throw new Error("unknown platform");
    const depth = historyDepth(platform);
    const history = readHistory(platform, 720).map((point) => ({ capturedAt: point.capturedAt, dataQuality: point.dataQuality, items: point.items.slice(0, 20) }));
    const result = completeResult({ data: { platform, depth, history }, capability: "trendhub.history.topic", evidence: [{ id: `history:${platform}`, source: platform, evidenceType: "history", observedAt: new Date().toISOString(), uri: uri.href, reliability: getSourceReliability(platform).score }], limitations: history.length ? [] : ["No local history has been collected for this platform."], mode: "local-first" });
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(result, null, 2) }] };
  });
}
