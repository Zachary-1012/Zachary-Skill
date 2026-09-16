/**
 * TrendHub MCP 工具注册层。
 * 工具只返回结构化数据 / 确定性分析 / 创作脚手架；语言生成与深度解读由调用方大模型完成。
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getByCategory, getMany, listPlatforms, categories } from "../sources/index.js";
import { crossPlatformOverlap, discoverClusters } from "../analysis/overlap.js";
import { analyzeTopic } from "../analysis/topic.js";
import { getContentBrief, getTemplate, listTemplates } from "../analysis/produce.js";
import { interestOverTime, relatedQueries } from "../sources/googleTrends.js";
import { futureSignals, futureCategories } from "../sources/rss.js";
import { upcomingEvents, eventCategories } from "../sources/events.js";
import { diffPlatform, takeSnapshots, updateFromResults } from "../store/snapshot.js";

const DEFAULT_PLATFORMS = ["weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome", "hackernews", "github-trending"];

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function splitList(s?: string) {
  return s ? s.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean) : [];
}

export function registerTools(server: McpServer): void {
  /* ---------- 发现 ---------- */
  server.tool("list_platforms", "列出可查询的全部热点平台（调用名、中文名、分类、数据来源）", {}, async () =>
    json({ platforms: listPlatforms() }));

  server.tool("list_categories", "列出平台分类与内容/模板分类", {}, async () =>
    json({ platformCategories: categories(), futureSignalCategories: futureCategories(), eventCategories: eventCategories(), templateTypes: ["script", "copy", "plan"] }));

  /* ---------- 当下热点 ---------- */
  server.tool(
    "get_trending",
    "获取当下热点榜单。可按 platform（逗号分隔多个平台调用名）或 category（social/video/news/tech/dev/ai/global）查询；都不传则返回跨平台核心榜单。每次查询会在本地积累快照用于趋势变化分析。",
    {
      platform: z.string().optional().describe("平台调用名，多个用逗号分隔，如 weibo,zhihu,bilibili,hackernews"),
      category: z.string().optional().describe("分类：social/video/news/tech/dev/ai/global"),
      limit: z.number().min(5).max(50).optional().describe("每个平台返回条数，默认20"),
    },
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
    "cross_platform_overlap",
    "分析某个关键词/话题当前在多少个平台同时上榜（跨平台共振），给出各平台命中条目、最佳排名与共振分。用于判断一个话题是否具备全网热度。",
    {
      keyword: z.string().describe("关键词或话题，如 'AI眼镜'、'英伟达'"),
      platforms: z.string().optional().describe("可选，限定平台调用名，逗号分隔"),
    },
    async ({ keyword, platforms }) => json(await crossPlatformOverlap(keyword, splitList(platforms)))
  );

  server.tool(
    "discover_trending_topics",
    "无需关键词，自动聚类发现当前在多个平台共振的话题（基于标题相似度，结果需大模型复核归纳）。",
    {
      min_platforms: z.number().min(2).max(6).optional().describe("至少在几个平台出现，默认2"),
      platforms: z.string().optional().describe("可选，限定平台，逗号分隔"),
    },
    async ({ min_platforms, platforms }) => json(await discoverClusters(splitList(platforms), min_platforms ?? 2))
  );

  server.tool(
    "trend_change_alerts",
    "对比历史快照，输出各平台新晋上榜、排名飙升(≥3位)、掉榜的话题。需要先有两次以上快照（get_trending 会自动积累，或用 take_snapshot）。",
    { platforms: z.string().optional().describe("可选，限定平台，逗号分隔；默认核心平台") },
    async ({ platforms }) => {
      const names = splitList(platforms).length ? splitList(platforms) : DEFAULT_PLATFORMS;
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
    async ({ platforms }) => json({ capturedAt: new Date().toISOString(), report: await takeSnapshots(splitList(platforms)) })
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
    async ({ keywords, geo, timeframe }) => json(await interestOverTime(splitList(keywords), geo ?? "", timeframe ?? "today 12-m"))
  );

  server.tool(
    "related_queries",
    "获取关键词在 Google Trends 的相关搜索词：top（长期热门）与 rising（近期飙升），用于选题与 SEO/搜索流量。",
    { keyword: z.string(), geo: z.string().optional() },
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
    async ({ category, keyword, limit }) => json(await futureSignals({ category, keyword, limit: limit ?? 40 }))
  );

  server.tool(
    "upcoming_events",
    "查询未来 N 天的趋势节点（科技展会/财报季/政策/电商大促/节假日），含距今天数与预热等级，用于提前布局内容。",
    {
      days_ahead: z.number().min(1).max(365).optional().describe("未来天数窗口，默认90"),
      category: z.string().optional().describe("节点分类，如 tech-event/earnings/ecommerce/holiday-cn/policy"),
    },
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
    async ({ keyword, geo, timeframe }) => json(await analyzeTopic(keyword, { geo, timeframe }))
  );

  /* ---------- 内容生产（脚本/文案/方案） ---------- */
  server.tool(
    "list_templates",
    "列出内置专家内容模板（短视频分镜脚本/小红书/微博/公众号/X线程/直播脚本/营销方案/内容日历/新品发布/标题钩子）。",
    {
      type: z.string().optional().describe("script=脚本 copy=文案 plan=方案"),
      platform: z.string().optional().describe("平台，如 douyin/xiaohongshu/weibo/wechat/twitter"),
    },
    async ({ type, platform }) => json({ templates: listTemplates(type, platform).map((t) => ({ id: t.id, name: t.name, type: t.type, platforms: t.platforms, bestFor: t.bestFor })) })
  );

  server.tool(
    "get_template",
    "获取某个模板的完整结构（章节/目的/写作指引/填空位/checklist）。",
    { id: z.string().describe("模板 id，如 short-video-script / xiaohongshu-note / marketing-plan") },
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
    async ({ topic, template_id, platform, goal, audience, geo }) =>
      json(await getContentBrief(topic, { templateId: template_id, platform, goal, audience, geo }))
  );
}
