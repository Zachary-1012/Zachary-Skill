import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listPlatforms } from "../sources/index.js";
import { professionalSourceCatalog, sourceSpec } from "../sources/professional-catalog.js";
import { getSourceReliability } from "../store/reliability.js";
import { historyDepth, readHistory } from "../store/history.js";
import { capabilityRegistry, listCapabilities } from "./capability-registry.js";
import { completeResult, evidenceContract } from "./evidence-contract.js";
import { namespaceContract } from "./namespace.js";
import { skillContract } from "./skill-contract.js";

const jsonResource = (uri: string, value: unknown) => ({
  contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }],
});
const markdown = (uri: string, text: string) => ({ contents: [{ uri, mimeType: "text/markdown", text }] });
const safe = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\\/?#]/.test(value);
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function registerAgentResources(server: McpServer): void {
  server.registerResource(
    "methodology",
    "trendhub://methodology",
    { title: "TrendHub methodology", description: "Evidence, reliability and forecast boundaries", mimeType: "text/markdown" },
    async (uri) => markdown(uri.href, `# TrendHub methodology

TrendHub is evidence-first and local-first. Missing data remains missing; NOT_COLLECTED/UNAVAILABLE/STALE/OFFLINE/AUTH_REQUIRED/RATE_LIMITED never become zero or observed topic absence; planned or licensed sources are not counted as live coverage. Forecasts are directional, require sufficient history, and are never probabilities. Source reliability is calculated from actual observations.

Production/runtime evidence outranks documentation claims. IMPLEMENTED, TESTED, VERIFIED, RELEASED and OPERATING are separate states. Acquisition adapters provide evidence but never own canonical truth.

Agent-native capabilities use the TrendHub Evidence Contract v1 with data, evidence, source, timestamp, reliability, confidence, limitations and trace.`),
  );

  server.registerResource(
    "sources",
    "trendhub://sources",
    { title: "TrendHub source universe", description: "Live platform inventory and professional source access modes", mimeType: "application/json" },
    async (uri) => jsonResource(uri.href, { live: listPlatforms(), professional: professionalSourceCatalog() }),
  );

  server.registerResource(
    "capabilities",
    "trendhub://capabilities",
    { title: "TrendHub capability registry", description: "Canonical capability owners, lifecycle and compatibility facade", mimeType: "application/json" },
    async (uri) => jsonResource(uri.href, capabilityRegistry()),
  );

  server.registerResource(
    "source-health",
    "trendhub://reliability",
    { title: "TrendHub source reliability", description: "Local reliability observations; no telemetry export", mimeType: "application/json" },
    async (uri) => jsonResource(uri.href, { sources: listPlatforms().map((p) => getSourceReliability(p.platform)) }),
  );

  server.registerResource(
    "namespace",
    "trendhub://namespace",
    { title: "TrendHub namespace", description: "Canonical capability IDs, resource URI scheme and 21-tool compatibility boundary", mimeType: "application/json" },
    async (uri) => jsonResource(uri.href, namespaceContract()),
  );

  server.registerResource(
    "evidence-contract",
    "trendhub://contracts/evidence",
    { title: "TrendHub Evidence Contract v1", description: "Unified result/evidence/truth semantics for agent-native consumers", mimeType: "application/json" },
    async (uri) => jsonResource(uri.href, evidenceContract()),
  );

  server.registerResource(
    "skill-contract",
    "trendhub://skill/trendhub",
    { title: "TrendHub Skill 2.0", description: "Progressive-disclosure workflows, policies and execution boundaries", mimeType: "application/json" },
    async (uri) => jsonResource(uri.href, skillContract()),
  );

  const platformTemplate = new ResourceTemplate("trendhub://platform/{platform}/history", {
    list: async () => ({
      resources: listPlatforms().map((p) => ({
        uri: `trendhub://platform/${encodeURIComponent(p.platform)}/history`,
        name: `${p.label} history`,
        mimeType: "application/json",
      })),
    }),
    complete: { platform: async (value) => listPlatforms().map((p) => p.platform).filter((p) => p.startsWith(value)) },
  });

  server.registerResource(
    "platform-history",
    platformTemplate,
    { title: "Platform trend history", description: "Read bounded local history for one live platform", mimeType: "application/json" },
    async (uri, variables) => {
      const platform = one(variables.platform);
      if (!safe(platform) || !listPlatforms().some((p) => p.platform === platform)) throw new Error("unknown platform");
      const depth = historyDepth(platform);
      const history = readHistory(platform, 720).map((point) => ({
        capturedAt: point.capturedAt,
        dataQuality: point.dataQuality,
        items: point.items.slice(0, 20),
      }));
      const latestObservedAt = history.at(-1)?.capturedAt;
      const result = completeResult({
        data: { platform, depth, history },
        capability: "trendhub.history.topic",
        evidence: latestObservedAt ? [{
          id: `history:${platform}:${latestObservedAt}`,
          source: platform,
          evidenceType: "history",
          observedAt: latestObservedAt,
          uri: uri.href,
          reliability: getSourceReliability(platform).score,
        }] : [],
        limitations: history.length ? [] : ["No local history has been collected for this platform."],
        mode: "local-first",
      });
      return jsonResource(uri.href, result);
    },
  );

  const capabilityTemplate = new ResourceTemplate("trendhub://capability/{capability}", {
    list: async () => ({
      resources: listCapabilities().map((c) => ({
        uri: `trendhub://capability/${encodeURIComponent(c.id)}`,
        name: c.id,
        description: c.description,
        mimeType: "application/json",
      })),
    }),
    complete: { capability: async (value) => listCapabilities().map((c) => c.id).filter((id) => id.startsWith(value)) },
  });

  server.registerResource(
    "capability-detail",
    capabilityTemplate,
    { title: "TrendHub capability", description: "Read one canonical capability owner/routing/lifecycle descriptor", mimeType: "application/json" },
    async (uri, variables) => {
      const capability = one(variables.capability);
      if (!safe(capability)) throw new Error("invalid capability");
      const descriptor = listCapabilities().find((c) => c.id === capability);
      if (!descriptor) throw new Error("unknown capability");
      return jsonResource(uri.href, descriptor);
    },
  );

  const sourceTemplate = new ResourceTemplate("trendhub://source/{source}", {
    list: async () => ({
      resources: professionalSourceCatalog().map((s) => ({
        uri: `trendhub://source/${encodeURIComponent(s.id)}`,
        name: s.label,
        description: `${s.region} · ${s.access} · ${s.status ?? (s.livePlatformId ? "live" : "planned")}`,
        mimeType: "application/json",
      })),
    }),
    complete: { source: async (value) => professionalSourceCatalog().map((s) => s.id).filter((id) => id.startsWith(value)) },
  });

  server.registerResource(
    "source-detail",
    sourceTemplate,
    { title: "TrendHub source contract", description: "Read declared source access mode, provenance and live/planned boundary", mimeType: "application/json" },
    async (uri, variables) => {
      const source = one(variables.source);
      if (!safe(source)) throw new Error("invalid source");
      const spec = sourceSpec(source);
      if (!spec) throw new Error("unknown source");
      return jsonResource(uri.href, spec);
    },
  );
}
