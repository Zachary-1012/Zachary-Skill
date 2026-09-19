/** Professional Intelligence v2 MCP extensions (development branch). */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMany } from "../sources/index.js";
import { defaultLivePlatformIds } from "../sources/access-plan.js";
import type { SourceVertical } from "../sources/professional-catalog.js";
import { updateFromResults } from "../store/snapshot.js";
import { buildProfessionalIntelligence } from "../analysis/professional.js";
import { buildExecutiveReport, executiveReportCsv, executiveReportMarkdown } from "../reports/executive.js";
import {
  createWorkspace,
  listWorkspaces,
  recordApplicationTrace,
  appendOutcome,
  recordEvaluation,
  listLearningAssets,
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
    "Professional Intelligence v2：统一返回生命周期、速度/持续性/扩散、Source Reliability、鲁棒异常、6/24/48/72h可验证趋势预测、品牌/公司实体解析、公开证据受众/创作者、媒体证据、专业告警与可选高管报告。默认优先零配置且可用的高优先级信源；用户明确选择需要授权的平台时才提示 API/OAuth/本地会话。历史不足时不预测。",
    {
      keyword: z.string().min(1).describe("要研究的话题、品牌、公司或关键词，例如 LV / 小米 / Tesla"),
      platforms: z.string().optional().describe("可选平台调用名，逗号分隔；留空时由专业 Source Planner 自动选择零配置核心源"),
      verticals: z.string().optional().describe("可选行业/场景，逗号分隔：fashion-luxury,beauty,business-corporate,technology,automotive,finance-markets,marketing-advertising,retail-commerce,culture-entertainment"),
      refresh: z.boolean().optional().describe("是否先刷新当前公开数据，默认 true"),
      report: z.enum(["none", "json", "markdown", "csv"]).optional().describe("附带高管报告格式，默认 json"),
    },
    WEB_STATE,
    async ({ keyword, platforms, verticals, refresh, report }) => observed("professional_intelligence", async () => {
      const names = splitList(platforms);
      const selected = names.length ? names : defaultLivePlatformIds({ max: 12, verticals: splitVerticals(verticals) });
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
    "本地优先协作与学习闭环：RBAC、watchlist、保存查询、告警规则、Application Trace、append-only outcome、Evaluation 与 Learning Asset。只写本地数据目录；不会修改第三方平台或自动上传。公网 Remote MCP 通过 effect fence 禁止任何 workspace 读取/写入。",
    {
      action: z.enum(["list", "create", "get", "member_set", "watchlist_set", "query_save", "rule_save", "trace_record", "outcome_append", "evaluation_record", "learning_list", "audit"]),
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
      topic: z.string().optional().describe("trace_record 的主题/品牌/议题"),
      capability: z.string().optional().describe("产生该应用轨迹的能力名，默认 get_content_brief"),
      trace_id: z.string().optional().describe("application trace id"),
      artifact_id: z.string().optional().describe("可选外部成稿/资产 id"),
      evidence_refs: z.string().optional().describe("证据引用 id/URL，逗号分隔"),
      learning_asset_ids: z.string().optional().describe("关联 learning asset id，逗号分隔"),
      outcome_json: z.string().optional().describe("outcome_append 的 JSON 指标对象；值只能是有限数字或 null"),
      truth_json: z.string().optional().describe("可选 truth-state JSON；null 不得标为 OBSERVED"),
      observed_at: z.string().optional().describe("outcome 观测时间 ISO-8601"),
      outcome_ids: z.string().optional().describe("evaluation_record 关联 outcome id，逗号分隔"),
      evaluation: z.enum(["SUPPORTED", "CONTRADICTED", "INSUFFICIENT"]).optional(),
      rationale: z.string().optional(),
      learning_asset_id: z.string().optional(),
    },
    LOCAL_STATE,
    async ({ action, principal, workspace_id, name, member_principal, role, keywords, query, platforms, geo, rule_json, enabled, limit, topic, capability, trace_id, artifact_id, evidence_refs, learning_asset_ids, outcome_json, truth_json, observed_at, outcome_ids, evaluation, rationale, learning_asset_id }) => observed("workspace_manage", async () => {
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
      if (action === "trace_record") {
        if (!topic) throw new Error("topic is required");
        return json({ applicationTrace: recordApplicationTrace(workspace_id, principal, {
          traceId: trace_id,
          topic,
          capability,
          artifactId: artifact_id ?? null,
          evidenceRefs: splitList(evidence_refs),
          learningAssetIds: splitList(learning_asset_ids),
        }) });
      }
      if (action === "outcome_append") {
        if (!trace_id || !outcome_json) throw new Error("trace_id and outcome_json are required");
        const parsedMetrics = JSON.parse(outcome_json) as Record<string, number | null>;
        const parsedTruth = truth_json ? JSON.parse(truth_json) as Record<string, import("../agent-native/truth-state.js").TruthState> : undefined;
        return json({ outcome: appendOutcome(workspace_id, principal, {
          traceId: trace_id,
          observedAt: observed_at,
          metrics: parsedMetrics,
          truth: parsedTruth,
        }) });
      }
      if (action === "evaluation_record") {
        if (!trace_id || !evaluation || !rationale) throw new Error("trace_id, evaluation and rationale are required");
        return json({ evaluation: recordEvaluation(workspace_id, principal, {
          traceId: trace_id,
          result: evaluation,
          rationale,
          outcomeIds: splitList(outcome_ids),
          evidenceRefs: splitList(evidence_refs),
          learningAssetId: learning_asset_id,
          title: name,
        }) });
      }
      if (action === "learning_list") return json({ learningAssets: listLearningAssets(workspace_id, principal) });
      throw new Error(`unsupported action: ${action}`);
    }),
  );
}
