/** Professional Intelligence v2 MCP extensions. */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMany } from "../sources/index.js";
import { defaultLivePlatformIds } from "../sources/access-plan.js";
import { INDUSTRY_DEFAULT_VERTICALS } from "../sources/industry-focus.js";
import type { SourceVertical } from "../sources/professional-catalog.js";
import { updateFromResults } from "../store/snapshot.js";
import { buildProfessionalIntelligence } from "../analysis/professional.js";
import { buildEntityResearch } from "../analysis/entity-research.js";
import { buildExecutiveReport, executiveReportCsv, executiveReportMarkdown } from "../reports/executive.js";
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
import { recordToolObservation } from "../observability/local.js";

const WEB_STATE = { readOnlyHint: false, openWorldHint: true, destructiveHint: false };
const LOCAL_STATE = { readOnlyHint: false, openWorldHint: false, destructiveHint: false };
const VERTICALS = new Set<SourceVertical>([
  "general", "fashion-luxury", "beauty", "business-corporate", "technology", "automotive",
  "finance-markets", "marketing-advertising", "retail-commerce", "culture-entertainment",
]);

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function splitList(s?: string) {
  return s ? s.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean) : [];
}
function splitVerticals(s?: string): SourceVertical[] {
  return splitList(s).filter((x): x is SourceVertical => VERTICALS.has(x as SourceVertical));
}

async function observed<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    recordToolObservation(name, Date.now() - started, true);
    return result;
  } catch (error) {
    recordToolObservation(name, Date.now() - started, false);
    throw error;
  }
}

export function registerProfessionalTools(server: McpServer): void {
  server.tool(
    "professional_intelligence",
    "Professional Intelligence v3：品牌、公司、商业体、产品、Campaign 的 Entity-first 决策入口。先主动检索主体相关公开证据，再结合生命周期、Source Reliability、Evidence Truth State、异常、6/24/48/72h验证预测、媒体/受众、机会风险与高管报告。品牌/实体研究优先用本工具；纯话题趋势研究才用 analyze_topic；只看当前榜单才用 get_trending。",
    {
      keyword: z.string().min(1).describe("要研究的品牌、公司、商业体、产品、Campaign 或商业主体，例如 广州太古汇 / LV / 小米 / Tesla"),
      platforms: z.string().optional().describe("可选平台调用名，逗号分隔；留空时由专业 Source Planner 自动选择零配置核心源"),
      verticals: z.string().optional().describe("可选行业/场景，逗号分隔：fashion-luxury,beauty,business-corporate,technology,automotive,finance-markets,marketing-advertising,retail-commerce,culture-entertainment"),
      refresh: z.boolean().optional().describe("是否先刷新当前公开数据，默认 true"),
      geo: z.string().optional().describe("Entity-first 搜索趋势地区，默认 CN；如 CN/HK/US"),
      timeframe: z.string().optional().describe("Entity-first 搜索趋势时间窗，默认 today 3-m"),
      days_ahead: z.number().min(7).max(365).optional().describe("未来节点窗口，默认60天"),
      report: z.enum(["none", "json", "markdown", "csv"]).optional().describe("附带高管报告格式，默认 json"),
    },
    WEB_STATE,
    async ({ keyword, platforms, verticals, refresh, report, geo, timeframe, days_ahead }) => observed("professional_intelligence", async () => {
      const names = splitList(platforms);
      const requestedVerticals = splitVerticals(verticals);
      const selected = names.length ? names : defaultLivePlatformIds({
        max: 12,
        verticals: requestedVerticals.length ? requestedVerticals : INDUSTRY_DEFAULT_VERTICALS,
      });
      if (refresh !== false) {
        const results = await getMany(selected, 30);
        updateFromResults(results);
      }
      const research = await buildEntityResearch(keyword, { geo: geo ?? "CN", timeframe: timeframe ?? "today 3-m", daysAhead: days_ahead ?? 60 });
      const intelligence = buildProfessionalIntelligence(keyword, selected, new Date(), research);
      const mode = report ?? "json";
      if (mode === "none") return json({ intelligence });
      const executive = buildExecutiveReport(intelligence);
      return json({
        intelligence,
        report: mode === "markdown"
          ? { format: "markdown", content: executiveReportMarkdown(executive) }
          : mode === "csv"
            ? { format: "csv", content: executiveReportCsv(executive) }
            : { format: "json", content: executive },
      });
    }),
  );

  server.tool(
    "workspace_manage",
    "管理 TrendHub 本地工作区状态：创建/读取 workspace，维护 owner/editor/analyst/viewer 成员、watchlist、saved query、alert rule 与 audit。只写本地数据目录，不修改第三方平台、不自动上传；公网托管 Web 不暴露该变更接口。list/create 不需要 workspace_id，其余 action 必须提供 workspace_id。",
    {
      action: z.enum(["list", "create", "get", "member_set", "watchlist_set", "query_save", "rule_save", "audit"]).describe("操作：list/create/get/member_set/watchlist_set/query_save/rule_save/audit"),
      principal: z.string().min(1).describe("本地身份映射，例如 local-owner 或公司 SSO 映射后的非敏感 principal"),
      workspace_id: z.string().optional().describe("工作区 ID；除 list/create 外均必填"),
      name: z.string().optional().describe("create 的工作区名，或 saved query / alert rule 的显示名"),
      member_principal: z.string().optional().describe("member_set 要新增/更新的非敏感 principal"),
      role: z.enum(["owner", "editor", "analyst", "viewer"]).optional().describe("member_set 的目标角色"),
      keywords: z.string().optional().describe("watchlist 关键词，逗号分隔"),
      query: z.string().optional().describe("query_save 时的关键词"),
      platforms: z.string().optional().describe("query_save 的平台调用名，逗号分隔"),
      geo: z.string().optional().describe("query_save 的地区/geo 过滤"),
      rule_json: z.string().optional().describe("rule_save 的 JSON 规则对象"),
      enabled: z.boolean().optional().describe("rule_save 是否启用，默认 true"),
      limit: z.number().min(1).max(1000).optional().describe("audit 返回条数，默认 200，最大 1000"),
    },
    LOCAL_STATE,
    async ({ action, principal, workspace_id, name, member_principal, role, keywords, query, platforms, geo, rule_json, enabled, limit }) => observed("workspace_manage", async () => {
      if (action === "list") return json({ workspaces: listWorkspaces(principal) });
      if (action === "create") return json({ workspace: createWorkspace(name ?? "TrendHub Workspace", principal) });
      if (!workspace_id) throw new Error("workspace_id is required for this action");
      if (action === "get") return json({ workspace: readWorkspace(workspace_id, principal) });
      if (action === "audit") return json({ audit: readAudit(workspace_id, principal, limit ?? 200) });
      if (action === "member_set") {
        if (!member_principal || !role) throw new Error("member_principal and role are required");
        return json({ workspace: upsertMember(workspace_id, principal, member_principal, role as WorkspaceRole) });
      }
      if (action === "watchlist_set") return json({ workspace: setWatchlist(workspace_id, principal, splitList(keywords)) });
      if (action === "query_save") {
        if (!query) throw new Error("query is required");
        return json({ savedQuery: saveQuery(workspace_id, principal, {
          name: name ?? query,
          keyword: query,
          platforms: splitList(platforms),
          geo,
        }) });
      }
      if (action === "rule_save") {
        if (!query) throw new Error("query is required as the rule keyword");
        let rule: Record<string, unknown> = {};
        if (rule_json) {
          const parsed = JSON.parse(rule_json);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("rule_json must be a JSON object");
          rule = parsed as Record<string, unknown>;
        }
        return json({ alertRule: saveAlertRule(workspace_id, principal, {
          name: name ?? `${query} alert`,
          keyword: query,
          rule,
          enabled: enabled !== false,
        }) });
      }
      throw new Error(`unsupported action: ${action}`);
    }),
  );
}
