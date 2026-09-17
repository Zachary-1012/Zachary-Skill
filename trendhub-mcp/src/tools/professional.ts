/** Professional Intelligence v2 MCP extensions (development branch). */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMany } from "../sources/index.js";
import { updateFromResults } from "../store/snapshot.js";
import { buildProfessionalIntelligence } from "../analysis/professional.js";
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

const DEFAULT_PLATFORMS = ["xiaohongshu", "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome", "hackernews", "github-trending"];
const WEB_STATE = { readOnlyHint: false, openWorldHint: true, destructiveHint: false };
const LOCAL_STATE = { readOnlyHint: false, openWorldHint: false, destructiveHint: false };

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function splitList(s?: string) {
  return s ? s.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean) : [];
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
    "Professional Intelligence v2：统一返回生命周期、速度/持续性/扩散、Source Reliability、鲁棒异常、6/24/48/72h可验证趋势预测、公开证据受众/创作者、媒体证据、专业告警与可选高管报告。所有预测都带 holdout validation 与不确定区间；历史不足时不预测。",
    {
      keyword: z.string().min(1).describe("要研究的话题/关键词"),
      platforms: z.string().optional().describe("平台调用名，逗号分隔；默认核心平台"),
      refresh: z.boolean().optional().describe("是否先刷新当前公开数据，默认 true"),
      report: z.enum(["none", "json", "markdown", "csv"]).optional().describe("附带高管报告格式，默认 json"),
    },
    WEB_STATE,
    async ({ keyword, platforms, refresh, report }) => observed("professional_intelligence", async () => {
      const names = splitList(platforms);
      const selected = names.length ? names : DEFAULT_PLATFORMS;
      if (refresh !== false) {
        const results = await getMany(selected, 30);
        updateFromResults(results);
      }
      const intelligence = buildProfessionalIntelligence(keyword, selected);
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
    "本地优先协作工作区：owner/editor/analyst/viewer RBAC、监测词 watchlist、保存查询、告警规则、成员与审计日志。只写 TrendHub 本地数据目录；不会修改任何第三方平台，也不会自动上传。公网托管 Web 不暴露该变更接口。",
    {
      action: z.enum(["list", "create", "get", "member_set", "watchlist_set", "query_save", "rule_save", "audit"]),
      principal: z.string().min(1).describe("本地身份映射，例如 local-owner 或公司 SSO 映射后的非敏感 principal"),
      workspace_id: z.string().optional(),
      name: z.string().optional(),
      member_principal: z.string().optional(),
      role: z.enum(["owner", "editor", "analyst", "viewer"]).optional(),
      keywords: z.string().optional().describe("watchlist 关键词，逗号分隔"),
      query: z.string().optional().describe("query_save 时的关键词"),
      platforms: z.string().optional(),
      geo: z.string().optional(),
      rule_json: z.string().optional().describe("rule_save 的 JSON 规则对象"),
      enabled: z.boolean().optional(),
      limit: z.number().min(1).max(1000).optional(),
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
