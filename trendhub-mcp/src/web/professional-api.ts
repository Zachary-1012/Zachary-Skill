/** Professional Intelligence v2 local/read-only HTTP API extensions. */
import { getMany } from "../sources/index.js";
import { updateFromResults } from "../store/snapshot.js";
import { buildProfessionalIntelligence } from "../analysis/professional.js";
import { analyzeAudienceSignals } from "../analysis/audience.js";
import { collectMediaEvidence } from "../analysis/media.js";
import { buildExecutiveReport, executiveReportCsv, executiveReportMarkdown } from "../reports/executive.js";
import { localObservabilitySnapshot, recordApiObservation } from "../observability/local.js";
import {
  createWorkspace,
  listWorkspaces,
  readWorkspace,
  readAudit,
  saveAlertRule,
  saveQuery,
  setWatchlist,
  upsertMember,
  type WorkspaceRole,
} from "../collaboration/workspace.js";

export interface ProfessionalApiResponse {
  status: number;
  data: unknown;
}

const DEFAULT_PLATFORMS = ["xiaohongshu", "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome", "hackernews", "github-trending"];

export const PROFESSIONAL_PUBLIC_READ_PATHS = new Set([
  "/api/professional",
  "/api/professional/report",
  "/api/professional/audience",
  "/api/professional/media",
  "/api/observability",
]);

export const PROFESSIONAL_LOCAL_PATHS = new Set([
  ...PROFESSIONAL_PUBLIC_READ_PATHS,
  "/api/workspaces",
]);

function splitList(s: string | null): string[] {
  return s ? s.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean) : [];
}

function bad(message: string, status = 400): ProfessionalApiResponse {
  return { status, data: { error: message } };
}

function principal(req: URL): string {
  return req.searchParams.get("principal")?.trim() || "local-owner";
}

function asObject(body: string): Record<string, unknown> {
  if (!body.trim()) return {};
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON body must be an object");
  return parsed as Record<string, unknown>;
}

async function measured(pathname: string, fn: () => Promise<ProfessionalApiResponse> | ProfessionalApiResponse): Promise<ProfessionalApiResponse> {
  const started = Date.now();
  try {
    const result = await fn();
    recordApiObservation(pathname, Date.now() - started, result.status);
    return result;
  } catch (error) {
    recordApiObservation(pathname, Date.now() - started, 500);
    return { status: 500, data: { error: (error as Error).message, dataQuality: "missing" } };
  }
}

export async function handleProfessionalApi(pathname: string, url: URL, method: string, body: string): Promise<ProfessionalApiResponse | null> {
  if (!PROFESSIONAL_LOCAL_PATHS.has(pathname)) return null;
  return measured(pathname, async () => {
    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const selected = splitList(url.searchParams.get("platforms"));
    const platforms = selected.length ? selected : DEFAULT_PLATFORMS;

    if (pathname === "/api/observability") {
      if (method !== "GET") return bad("method not allowed", 405);
      return { status: 200, data: localObservabilitySnapshot() };
    }

    if (pathname === "/api/workspaces") {
      if (method === "GET") {
        const workspaceId = url.searchParams.get("workspace_id")?.trim();
        const p = principal(url);
        if (!workspaceId) return { status: 200, data: { workspaces: listWorkspaces(p) } };
        const audit = url.searchParams.get("audit") === "1";
        return { status: 200, data: audit ? { audit: readAudit(workspaceId, p) } : { workspace: readWorkspace(workspaceId, p) } };
      }
      if (method !== "POST") return bad("method not allowed", 405);
      const input = asObject(body);
      const action = String(input.action ?? "");
      const p = String(input.principal ?? "local-owner");
      if (action === "create") return { status: 200, data: { workspace: createWorkspace(String(input.name ?? "TrendHub Workspace"), p) } };
      const workspaceId = String(input.workspaceId ?? "").trim();
      if (!workspaceId) return bad("workspaceId is required");
      if (action === "member_set") {
        return { status: 200, data: { workspace: upsertMember(workspaceId, p, String(input.memberPrincipal ?? ""), String(input.role ?? "viewer") as WorkspaceRole) } };
      }
      if (action === "watchlist_set") {
        const values = Array.isArray(input.keywords) ? input.keywords.map(String) : splitList(String(input.keywords ?? ""));
        return { status: 200, data: { workspace: setWatchlist(workspaceId, p, values) } };
      }
      if (action === "query_save") {
        return { status: 200, data: { savedQuery: saveQuery(workspaceId, p, {
          name: String(input.name ?? input.keyword ?? "Saved query"),
          keyword: String(input.keyword ?? ""),
          platforms: Array.isArray(input.platforms) ? input.platforms.map(String) : splitList(String(input.platforms ?? "")),
          geo: input.geo == null ? undefined : String(input.geo),
        }) } };
      }
      if (action === "rule_save") {
        return { status: 200, data: { alertRule: saveAlertRule(workspaceId, p, {
          name: String(input.name ?? "Alert rule"),
          keyword: String(input.keyword ?? ""),
          rule: input.rule && typeof input.rule === "object" && !Array.isArray(input.rule) ? input.rule as Record<string, unknown> : {},
          enabled: input.enabled !== false,
        }) } };
      }
      return bad(`unsupported workspace action: ${action}`);
    }

    if (method !== "GET") return bad("method not allowed", 405);
    if (!keyword) return bad("keyword is required");

    if (url.searchParams.get("refresh") !== "0" && pathname !== "/api/professional/audience" && pathname !== "/api/professional/media") {
      const results = await getMany(platforms, 30);
      updateFromResults(results);
    }

    if (pathname === "/api/professional/audience") {
      return { status: 200, data: analyzeAudienceSignals(keyword, platforms) };
    }
    if (pathname === "/api/professional/media") {
      return { status: 200, data: collectMediaEvidence(keyword, platforms) };
    }

    const intelligence = buildProfessionalIntelligence(keyword, platforms);
    if (pathname === "/api/professional") return { status: 200, data: intelligence };

    const report = buildExecutiveReport(intelligence);
    const format = url.searchParams.get("format") ?? "json";
    if (format === "markdown") return { status: 200, data: { format, content: executiveReportMarkdown(report) } };
    if (format === "csv") return { status: 200, data: { format, content: executiveReportCsv(report) } };
    return { status: 200, data: { format: "json", content: report } };
  });
}
