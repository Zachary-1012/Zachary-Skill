/**
 * Local-only observability with OpenTelemetry-compatible semantic shape.
 * No exporter is configured by default and nothing leaves the installation.
 */
import process from "node:process";
import { historyStoreInfo } from "../store/history.js";
import { workspaceStoreInfo } from "../collaboration/workspace.js";

interface RouteMetric {
  count: number;
  errors: number;
  totalMs: number;
  maxMs: number;
  lastAt: string | null;
}

interface ToolMetric extends RouteMetric {}

const startedAt = new Date();
const routes = new Map<string, RouteMetric>();
const tools = new Map<string, ToolMetric>();

function update(map: Map<string, RouteMetric>, key: string, durationMs: number, ok: boolean): void {
  const row = map.get(key) ?? { count: 0, errors: 0, totalMs: 0, maxMs: 0, lastAt: null };
  row.count++;
  if (!ok) row.errors++;
  row.totalMs += Math.max(0, durationMs);
  row.maxMs = Math.max(row.maxMs, Math.max(0, durationMs));
  row.lastAt = new Date().toISOString();
  map.set(key, row);
}

export function recordApiObservation(route: string, durationMs: number, status: number): void {
  update(routes, route, durationMs, status >= 200 && status < 500);
}

export function recordToolObservation(tool: string, durationMs: number, ok: boolean): void {
  update(tools, tool, durationMs, ok);
}

function rows(map: Map<string, RouteMetric>) {
  return [...map.entries()]
    .map(([name, row]) => ({
      name,
      count: row.count,
      errors: row.errors,
      errorRate: row.count ? Math.round((row.errors / row.count) * 10_000) / 10_000 : 0,
      meanMs: row.count ? Math.round((row.totalMs / row.count) * 10) / 10 : 0,
      maxMs: Math.round(row.maxMs * 10) / 10,
      lastAt: row.lastAt,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function localObservabilitySnapshot() {
  const memory = process.memoryUsage();
  const now = new Date();
  return {
    schema: "trendhub-otel-compatible-v1",
    generatedAt: now.toISOString(),
    privacy: {
      telemetry: false,
      exporterConfigured: false,
      remoteExport: false,
      excludes: ["ip", "hostname", "username", "query_text", "cookies", "content_body", "account_identifier"],
    },
    resource: {
      "service.name": "trendhub-mcp",
      "service.instance.scope": "local-process",
      "process.runtime.name": "node",
      "process.runtime.version": process.version,
    },
    gauges: {
      "process.uptime.seconds": Math.round(process.uptime()),
      "process.memory.rss.bytes": memory.rss,
      "process.memory.heap.used.bytes": memory.heapUsed,
      "process.memory.heap.total.bytes": memory.heapTotal,
      "trendhub.history.retention.days": historyStoreInfo().retentionDays,
      "trendhub.history.max_points_per_platform": historyStoreInfo().maxPointsPerPlatform,
      "trendhub.workspace.count": workspaceStoreInfo().workspaces,
      "trendhub.audit.event.count": workspaceStoreInfo().auditEvents,
    },
    storage: historyStoreInfo(),
    collaboration: workspaceStoreInfo(),
    apiRoutes: rows(routes),
    mcpTools: rows(tools),
    startedAt: startedAt.toISOString(),
    uptimeMs: now.getTime() - startedAt.getTime(),
    note: "Metric names intentionally resemble OpenTelemetry semantic conventions; no OpenTelemetry exporter or remote telemetry is enabled by default.",
  };
}
