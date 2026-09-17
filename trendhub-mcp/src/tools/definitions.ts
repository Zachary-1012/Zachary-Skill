/**
 * TrendHub MCP 工具注册层。
 * 工具只返回结构化数据 / 确定性分析 / 创作脚手架；语言生成与深度解读由调用方大模型完成。
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getByCategory, getHot, getMany, listPlatforms, categories } from "../sources/index.js";
import { crossPlatformOverlap, discoverClusters } from "../analysis/overlap.js";
import { analyzeTopic } from "../analysis/topic.js";
import { analyzeTrendIntelligence, benchmarkTrendLead } from "../analysis/intelligence.js";
import { getContentBrief, getTemplate, listTemplates } from "../analysis/produce.js";
import { interestOverTime, relatedQueries } from "../sources/googleTrends.js";
import { futureSignals, futureCategories } from "../sources/rss.js";
import { upcomingEvents, eventCategories } from "../sources/events.js";
import { diffPlatform, takeSnapshots, updateFromResults } from "../store/snapshot.js";
import { historyDepth } from "../store/history.js";
import { listSourceReliability } from "../store/reliability.js";
import { XHS_PLATFORM, XHS_HOTLIST_PLATFORM } from "../sources/xiaohongshu.js";
import { extractXhsTopics } from "../analysis/xhsTopics.js";
import { xhsClient } from "../sources/xhs/guest.js";

const DEFAULT_PLATFORMS = ["xiaohongshu", "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome", "hackernews", "github-trending"];

// MCP annotations are part of the public tool contract. They are intentionally
// conservative: any tool that may refresh/write TrendHub's local evidence state
// is not advertised as read-only, even though it never writes to a third-party
// service. No TrendHub tool performs a destructive external action.
const LOCAL_READ = { readOnlyHint: true, openWorldHint: false, destructiveHint: false };
const WEB_READ = { readOnlyHint: true, openWorldHint: true, destructiveHint: false };
const WEB_STATE = { readOnlyHint: false, openWorldHint: true, destructiveHint: false };

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function splitList(s?: string) {
  return s ? s.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean) : [];
}
function platformNames(input?: string): string[] {
  const names = splitList(input);
  return names.length ? names : DEFAULT_PLATFORMS;
}

export function registerTools(server: McpServer): void {
  /* ---------- 发现 ---------- */
  server.tool("list_platforms", "列出可查询的全部热点平台（调用名、中文名、分类、数据来源）", {}, LOCAL_READ, async () =>
    json({ platforms: listPlatforms() }));

  server.tool("list_categories", "列出平台分类与内容/模板分类", {}, LOCAL_READ, async () =>
    json({ platformCategories: categories(), futureSignalCategories: futureCategories(), eventCategories: eventCategories(), templateTypes: ["script", "copy", "plan"] }));

  /* ---------- 当下热点 ---------- */
  server.tool(
    "get_trending",
    "获取当下热点榜单。可按 platform（逗号分隔多个平台调用名）或 category（social/video/news/tech/dev/ai/global）查询；都不传则返回跨平台核心榜单。每次查询会在本地积累快照和有界历史，用于趋势变化、生命周期与 benchmark。",
    {
      platform: z.string().optional().describe("平台调用名，多个用逗号分隔，如 weibo,zhihu,bilibili,hackernews"),
      category: z.string().optional().describe("分类：social/video/news/tech/dev/ai/global"),
      limit: z.number().min(5).max(50).optional().describe("每个平台返回条数，默认20"),
    },
    WEB_STATE,
    async ({ platform, category, limit }) => {
      const n = limit ?? 20;
      let results;
      let scope;
      if (category && category !== "all") {
        results = await getByCategory(category, n);
        scope = `category:${category}`;
      } else {
        const names = splitList(platform);
        results = await getMany(names.length ? names : DEFAULT_PLATFORMS, n);
        scope = names.length ? names.join(",") : "default-core";
      }
      updateFromResults(results);
      const okCount = results.filter((r) => r.dataQuality === "ok").length;
      return json({
        generatedAt: new Date().toISOString(),
        scope,
        platformCount: results.length,
        okCount,
        degradedOrMissing: results.filter((r) => r.dataQuality !== "ok").map((r) => ({ platform: r.platform, dataQuality: r.dataQuality, note: r.note })),
        results,
      });
    }
  );

  server.tool(
    "xhs_hot_topics",
    "小红书热点聚合（主打平台）：一次性返回官方首页『热门推荐流』笔记（含封面/作者/点赞展示值/原文链接）、由热门标题词频派生的高频话题词（非官方热搜词榜）、当前会话模式（游客/登录）。配置环境变量 XHS_COOKIE 后额外返回官方『热搜词榜』。游客零配置即可用热门推荐流。",
    {
      limit: z.number().min(5).max(40).optional().describe("热门笔记条数，默认30，最多40"),
      topic_limit: z.number().min(5).max(50).optional().describe("派生话题词数量，默认20"),
      with_hotlist: z.boolean().optional().describe("登录态下是否同时取官方热搜词榜，默认 true"),
    },
    WEB_STATE,
    async ({ limit, topic_limit, with_hotlist }) => {
      const n = limit ?? 30;
      const feed = await getHot(XHS_PLATFORM, n);
      const derivedTopics = extractXhsTopics(feed.items.map((i) => i.title), topic_limit ?? 20);
      const loggedIn = xhsClient.hasLoginCookie();
      let officialHotlist = null;
      if (with_hotlist !== false && loggedIn) officialHotlist = await getHot(XHS_HOTLIST_PLATFORM, 20);
      updateFromResults([feed, ...(officialHotlist ? [officialHotlist] : [])]);
      return json({
        generatedAt: new Date().toISOString(),
        platform: XHS_PLATFORM,
        mode: loggedIn ? "cookie（登录态）" : "guest（游客）",
        loggedIn,
        feed,
        derivedTopics,
        officialHotlist,
        hints: loggedIn
          ? ["已使用 XHS_COOKIE 登录态：热门推荐流 + 官方热搜词榜均可用；关键词爆款见 analyze_topic / get_content_brief。"]
          : [
              "游客模式：热门推荐流真实可取（平台推荐序，非官方热搜词榜）。",
              "官方热搜词榜与关键词搜索对游客关闭（平台 -104）；配置 XHS_COOKIE（含 a1 与 web_session）后解锁。",
              "liked_count 为平台展示近似值（如 4.1万/10万+），非精确整数。",
            ],
      });
    }
  );

  server.tool(
    "cross_platform_overlap",
    "分析某个关键词/话题当前在多少个平台同时上榜（跨平台共振），给出各平台命中条目、最佳排名与共振分。用于判断一个话题是否具备全网热度。",
    {
      keyword: z.string().describe("关键词或话题，如 'AI眼镜'、'英伟达'"),
      platforms: z.string().optional().describe("可选，限定平台调用名，逗号分隔"),
    },
    WEB_READ,
    async ({ keyword, platforms }) => json(await crossPlatformOverlap(keyword, splitList(platforms)))
  );

  server.tool(
    "discover_trending_topics",
    "无需关键词，自动聚类发现当前在多个平台共振的话题（基于标题相似度，结果需大模型复核归纳）。",
    {
      min_platforms: z.number().min(2).max(6).optional().describe("至少在几个平台出现，默认2"),
      platforms: z.string().optional().describe("可选，限定平台，逗号分隔"),
      topic: z.string().optional().describe("可选，按话题/关键词筛选聚类结果；支持品牌、campaign、行业议题或平台标签"),
    },
    WEB_READ,
    async ({ min_platforms, platforms, topic }) => json(await discoverClusters(splitList(platforms), min_platforms ?? 2, 20, topic))
  );

  server.tool(
    "trend_change_alerts",
    "对比历史快照，输出各平台新晋上榜、排名飙升(≥3位)、掉榜的话题。需要先有两次以上快照（get_trending 会自动积累，或用 take_snapshot）。",
    { platforms: z.string().optional().describe("可选，限定平台，逗号分隔；默认核心平台") },
    LOCAL_READ,
    async ({ platforms }) => {
      const names = platformNames(platforms);
      const diffs = names.map((p) => diffPlatform(p));
      return json({
        generatedAt: new Date().toISOString(),
        withHistory: diffs.filter((d) => d.hasHistory).map((d) => ({
          platform: d.platform,
          latestAt: d.latestAt,
          previousAt: d.previousAt,
          newTopics: d.changes.filter((c) => c.type === "new"),
          rising: d.changes.filter((c) => c.type === "risen"),
          dropped: d.changes.filter((c) => c.type === "dropped"),
        })),
        noHistoryYet: diffs.filter((d) => !d.hasHistory).map((d) => d.platform),
        hint: "noHistoryYet 中的平台需再查询/快照一次后才有对比基准",
      });
    }
  );

  server.tool(
    "take_snapshot",
    "立即对各平台落一次历史快照（也可由系统定时调用以持续监测）。",
    { platforms: z.string().optional().describe("可选，限定平台，逗号分隔") },
    WEB_STATE,
    async ({ platforms }) => json({ capturedAt: new Date().toISOString(), report: await takeSnapshots(splitList(platforms)) })
  );

  /* ---------- Source Reliability ---------- */
  server.tool(
    "source_reliability",
    "量化数据源稳定性：UP/DEGRADED/DOWN/AUTH_REQUIRED/RATE_LIMITED、24h/7d/30d ok/usable rate、P50/P95延迟、连续失败、schema drift 信号与历史深度。默认只读本地观测；refresh=true 时先真实刷新一次指定平台。",
    {
      platforms: z.string().optional().describe("平台调用名，逗号分隔；默认核心平台"),
      refresh: z.boolean().optional().describe("是否先联网刷新一次，默认 false"),
    },
    WEB_STATE,
    async ({ platforms, refresh }) => {
      const names = platformNames(platforms);
      if (refresh === true) {
        const results = await getMany(names, 10);
        updateFromResults(results);
      }
      return json({
        generatedAt: new Date().toISOString(),
        methodology: "quality ok=1/degraded=0.5/missing=0; 7d reliability score weights okRate 55%, usableRate 25%, average quality 20%",
        privacy: "local operational metadata only; no query text, cookies, user content, hostname or account identifiers are stored",
        sources: listSourceReliability(names).map((r) => ({ ...r, history: historyDepth(r.platform) })),
      });
    },
  );

  /* ---------- 趋势走势（Google Trends） ---------- */
  server.tool(
    "keyword_trend_curve",
    "获取关键词在 Google Trends 上的相对热度时间序列（0-100，非绝对搜索量），支持1-5个关键词对比。",
    {
      keywords: z.string().describe("关键词，多个用逗号分隔，如 'AI眼镜,VR头显'"),
      geo: z.string().optional().describe("地区代码，US/CN/TW/HK，留空=全球"),
      timeframe: z.string().optional().describe("如 today 1-m / today 3-m / today 12-m / now 7-d，默认 today 12-m"),
    },
    WEB_READ,
    async ({ keywords, geo, timeframe }) => json(await interestOverTime(splitList(keywords), geo ?? "", timeframe ?? "today 12-m"))
  );

  server.tool(
    "related_queries",
    "获取关键词在 Google Trends 的相关搜索词：top（长期热门）与 rising（近期飙升），用于选题与 SEO/搜索流量。",
    { keyword: z.string(), geo: z.string().optional() },
    WEB_READ,
    async ({ keyword, geo }) => json(await relatedQueries(keyword, geo ?? ""))
  );

  /* ---------- 未来趋势 & 节点 ---------- */
  server.tool(
    "future_signals",
    "聚合高质量科技/AI/商业/营销信源的最新文章（未来趋势信号素材），可按分类或关键词过滤。趋势判断由调用方大模型完成。",
    {
      category: z.string().optional().describe("信源分类，可用 list_categories 查看；all=全部"),
      keyword: z.string().optional().describe("按关键词过滤标题/摘要"),
      limit: z.number().min(5).max(100).optional(),
    },
    WEB_READ,
    async ({ category, keyword, limit }) => json(await futureSignals({ category, keyword, limit: limit ?? 40 }))
  );

  server.tool(
    "upcoming_events",
    "查询未来 N 天的趋势节点（科技展会/财报季/政策/电商大促/节假日），含距今天数与预热等级，用于提前布局内容。",
    {
      days_ahead: z.number().min(1).max(365).optional().describe("未来天数窗口，默认90"),
      category: z.string().optional().describe("节点分类，如 tech-event/earnings/ecommerce/holiday-cn/policy"),
    },
    LOCAL_READ,
    async ({ days_ahead, category }) => json(upcomingEvents({ daysAhead: days_ahead ?? 90, category }))
  );

  /* ---------- 深度分析 ---------- */
  server.tool(
    "analyze_topic",
    "话题深度情报包：一次性聚合跨平台共振、搜索热度曲线与动量、相关词、未来信号、临近节点、规则情感，供大模型做定性/阶段判断/机会风险分析。",
    {
      keyword: z.string().describe("要分析的话题"),
      geo: z.string().optional().describe("Google Trends 地区，留空全球"),
      timeframe: z.string().optional().describe("趋势时间窗，默认 today 3-m"),
    },
    WEB_READ,
    async ({ keyword, geo, timeframe }) => json(await analyzeTopic(keyword, { geo, timeframe }))
  );

  server.tool(
    "trend_intelligence",
    "Trend Intelligence Engine：基于本地真实历史计算生命周期(emerging/accelerating/mainstream/saturating/declining)、排名速度、持续性、跨平台扩散、数据源可靠度和置信度。默认先刷新当前核心平台；历史不足会明确返回 insufficient_history。",
    {
      keyword: z.string().min(1).describe("要评估生命周期的关键词/话题"),
      platforms: z.string().optional().describe("可选平台，逗号分隔；默认核心平台"),
      refresh: z.boolean().optional().describe("是否先刷新当前数据，默认 true"),
    },
    WEB_STATE,
    async ({ keyword, platforms, refresh }) => {
      const names = platformNames(platforms);
      if (refresh !== false) {
        const results = await getMany(names, 30);
        updateFromResults(results);
      }
      return json(analyzeTrendIntelligence(keyword, names));
    },
  );

  server.tool(
    "benchmark_trend_lead",
    "真实场景 Lead-time Benchmark：把 TrendHub 本地历史的最早命中，与用户提供的外部事实 reference_time 对比，计算是否提前24h/72h发现。reference_time 必须来自官方公告、主流爆发点或团队约定的外部 ground truth，TrendHub 不会自己编造基准时间。",
    {
      keyword: z.string().min(1).describe("Benchmark 话题/关键词"),
      reference_time: z.string().describe("外部 ground-truth ISO-8601 时间，例如 2026-09-20T09:00:00+08:00"),
      platforms: z.string().optional().describe("可选平台；默认核心平台"),
    },
    LOCAL_READ,
    async ({ keyword, reference_time, platforms }) => json(benchmarkTrendLead(keyword, reference_time, platformNames(platforms))),
  );

  /* ---------- 内容生产（脚本/文案/方案） ---------- */
  server.tool(
    "list_templates",
    "列出内置专家内容模板（短视频分镜脚本/小红书/微博/公众号/X线程/直播脚本/营销方案/内容日历/新品发布/标题钩子）。",
    {
      type: z.string().optional().describe("script=脚本 copy=文案 plan=方案"),
      platform: z.string().optional().describe("平台，如 douyin/xiaohongshu/weibo/wechat/twitter"),
    },
    LOCAL_READ,
    async ({ type, platform }) => json({ templates: listTemplates(type, platform).map((t) => ({ id: t.id, name: t.name, type: t.type, platforms: t.platforms, bestFor: t.bestFor })) })
  );

  server.tool(
    "get_template",
    "获取某个模板的完整结构（章节/目的/写作指引/填空位/checklist）。",
    { id: z.string().describe("模板 id，如 short-video-script / xiaohongshu-note / marketing-plan") },
    LOCAL_READ,
    async ({ id }) => {
      const t = getTemplate(id);
      return t ? json(t) : json({ error: `未找到模板 ${id}，可用 list_templates 查看` });
    }
  );

  server.tool(
    "get_content_brief",
    "专家创作简报：围绕主题聚合真实热点证据、相关搜索词、情感信号、同平台真实爆款样本，并匹配模板，输出逐格填充指引与可直接交给大模型的 productionPrompt。脚本/文案/方案的成稿由调用方大模型完成。",
    {
      topic: z.string().describe("创作主题/要蹭的热点"),
      template_id: z.string().optional().describe("模板 id；不传则按 platform 自动匹配"),
      platform: z.string().optional().describe("目标平台，如 douyin/xiaohongshu/weibo/wechat/twitter/douyin-live；all=通用"),
      goal: z.string().optional().describe("目标，如 涨粉/带货转化/品牌曝光/线索收集"),
      audience: z.string().optional().describe("目标人群画像"),
      geo: z.string().optional().describe("搜索趋势地区"),
    },
    WEB_READ,
    async ({ topic, template_id, platform, goal, audience, geo }) =>
      json(await getContentBrief(topic, { templateId: template_id, platform, goal, audience, geo }))
  );
}
