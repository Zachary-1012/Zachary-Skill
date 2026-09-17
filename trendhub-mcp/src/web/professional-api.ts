/** Professional Intelligence v2 local/read-only HTTP API extensions. */
import { getMany } from "../sources/index.js";
import { buildSourceAccessPlan, defaultLivePlatformIds } from "../sources/access-plan.js";
import { professionalSourceCatalog, sourceUserSetup, type SourceVertical } from "../sources/professional-catalog.js";
import { brandEntityCatalog, resolveBrandEntity } from "../entities/brand-catalog.js";
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

const VERTICALS = new Set<SourceVertical>([
  "general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive",
  "finance-markets", "marketing-advertising", "retail-commerce", "culture-entertainment",
]);

export const PROFESSIONAL_PUBLIC_READ_PATHS = new Set([
  "/api/professional",
  "/api/professional/report",
  "/api/professional/audience",
  "/api/professional/media",
  "/api/professional/sources",
  "/api/professional/entities",
  "/api/observability",
]);

export const PROFESSIONAL_LOCAL_PATHS = new Set([
  ...PROFESSIONAL_PUBLIC_READ_PATHS,
  "/api/workspaces",
]);

function splitList(s: string | null): string[] {
  return s ? s.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean) : [];
}

function splitVerticals(s: string | null): SourceVertical[] {
  return splitList(s).filter((x): x is SourceVertical => VERTICALS.has(x as SourceVertical));
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
    if (pathname === "/api/observability") {
      if (method !== "GET") return bad("method not allowed", 405);
      return { status: 200, data: localObservabilitySnapshot() };
    }

    if (pathname === "/api/professional/sources") {
      if (method !== "GET") return bad("method not allowed", 405);
      const verticals = splitVerticals(url.searchParams.get("verticals"));
      const priorityRaw = url.searchParams.get("priority");
      const priority = priorityRaw === "P2" || priorityRaw === "P1" ? priorityRaw : "P0";
      const plan = buildSourceAccessPlan({ verticals, includePriority: priority, maxDefaultLive: 12 });
      const catalog = professionalSourceCatalog()
        .filter((source) => priority === "P2" || source.priority !== "P2")
        .filter((source) => priority !== "P0" || source.priority === "P0")
        .filter((source) => !verticals.length || (source.verticals ?? ["general"]).some((v) => v === "general" || verticals.includes(v)))
        .map((source) => ({ ...source, onboarding: sourceUserSetup(source) }));
      return {
        status: 200,
        data: {
          generatedAt: new Date().toISOString(),
          verticals,
          priority,
          counts: {
            total: catalog.length,
            zeroConfig: plan.zeroConfig.length,
            optionalEnhancements: plan.optionalEnhancements.length,
            credentialed: plan.credentialed.length,
            licensed: plan.licensed.length,
            planned: plan.planned.length,
          },
          defaultLivePlatforms: plan.defaultLivePlatforms,
          rules: plan.rules,
          sources: catalog,
        },
      };
    }

    if (pathname === "/api/professional/entities") {
      if (method !== "GET") return bad("method not allowed", 405);
      const query = url.searchParams.get("q")?.trim() ?? "";
      const priorityRaw = url.searchParams.get("priority");
      const priority = priorityRaw === "P2" || priorityRaw === "P0" ? priorityRaw : "P1";
      const entities = brandEntityCatalog(priority)
        .filter((entity) => {
          const sector = url.searchParams.get("sector")?.trim();
          return !sector || entity.sector === sector;
        });
      return {
        status: 200,
        data: {
          generatedAt: new Date().toISOString(),
          query: query || null,
          resolved: query ? resolveBrandEntity(query) : null,
          entities,
          extensibility: "Seed catalog only. Workspaces may add arbitrary brands/companies/products/aliases; the product must not treat this list as a closed whitelist.",
        },
      };
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
    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    if (!keyword) return bad("keyword is required");

    const selected = splitList(url.searchParams.get("platforms"));
    const verticals = splitVerticals(url.searchParams.get("verticals"));
    const platforms = selected.length ? selected : defaultLivePlatformIds({ max: 12, verticals });

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
