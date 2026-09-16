/**
 * 本地控制台只读 / 触发 JSON API（仅绑定 127.0.0.1）。
 * 与 MCP 工具复用同一套 sources / analysis / store 逻辑，不重复实现；
 * 不接任何大模型——创作类接口只返回证据与 productionPrompt，成稿交给调用方 AI。
 * 本插件零遥测、零数据回传：这些接口只服务本机浏览器，不向任何外部端点发送数据。
 */
import { config } from "../config.js";
import { SERVER_VERSION } from "../server.js";
import { PLATFORMS, listPlatforms, categories, getMany, getByCategory } from "../sources/index.js";
import { crossPlatformOverlap, discoverClusters } from "../analysis/overlap.js";
import { takeSnapshots, updateFromResults, diffPlatform } from "../store/snapshot.js";
import { interestOverTime, relatedQueries } from "../sources/googleTrends.js";
import { futureSignals, futureCategories } from "../sources/rss.js";
import { upcomingEvents, eventCategories } from "../sources/events.js";
import { analyzeTopic } from "../analysis/topic.js";
import { listTemplates, getTemplate, getContentBrief } from "../analysis/produce.js";
import { fetchXiaohongshu, fetchXiaohongshuHotlist } from "../sources/xiaohongshu.js";
import { extractXhsTopics } from "../analysis/xhsTopics.js";
import { xhsClient } from "../sources/xhs/guest.js";

const DEFAULT_PLATFORMS = ["xiaohongshu", "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome", "hackernews", "github-trending"];

export interface ApiResponse {
  status: number;
  data: unknown;
}

function splitList(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,，、\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function intParam(s: string | null, def: number, min = 1, max = 100): number {
  const n = Number.parseInt(s ?? "", 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

async function handled(fn: () => unknown | Promise<unknown>): Promise<ApiResponse> {
  try {
    return { status: 200, data: await fn() };
  } catch (e) {
    return { status: 500, data: { error: (e as Error).message, dataQuality: "missing" } };
  }
}

function bad(msg: string): ApiResponse {
  return { status: 400, data: { error: msg } };
}

export async function handleApi(pathname: string, url: URL, method: string, body: string): Promise<ApiResponse> {
  const q = (k: string) => url.searchParams.get(k);

  // ---- 健康检查 ----
  if (pathname === "/api/health") {
    return {
      status: 200,
      data: {
        ok: true,
        service: "trendhub-mcp",
        version: SERVER_VERSION,
        platformCount: PLATFORMS.length,
        categoryCount: categories().length,
        dataDir: config.dataDir,
        httpEndpoint: `http://${config.httpHost}:${config.httpPort}/mcp`,
        time: new Date().toISOString(),
      },
    };
  }

  // 只有快照接口允许 POST，其余只读 GET
  if (method !== "GET" && !(pathname === "/api/snapshot" && method === "POST")) {
    return bad("该端点仅支持 GET（/api/snapshot 为 POST）");
  }

  switch (pathname) {
    case "/api/platforms":
      return handled(() => ({ platforms: listPlatforms() }));

    case "/api/categories":
      return handled(() => ({
        platformCategories: categories(),
        futureSignalCategories: futureCategories(),
        eventCategories: eventCategories(),
        templateTypes: ["script", "copy", "plan"],
      }));

    case "/api/trending": {
      const platform = q("platform");
      const category = q("category");
      const n = intParam(q("limit"), 20, 5, 50);
      return handled(async () => {
        let results;
        let scope;
        if (category && category !== "all") {
          results = await getByCategory(category, n);
          scope = `category:${category}`;
        } else if (platform) {
          results = await getMany([platform], n);
          scope = platform;
        } else {
          results = await getMany(DEFAULT_PLATFORMS, n);
          scope = "default-core";
        }
        updateFromResults(results);
        return {
          generatedAt: new Date().toISOString(),
          scope,
          platformCount: results.length,
          okCount: results.filter((r) => r.dataQuality === "ok").length,
          degradedOrMissing: results.filter((r) => r.dataQuality !== "ok").map((r) => ({ platform: r.platform, dataQuality: r.dataQuality, note: r.note })),
          results,
        };
      });
    }

    case "/api/overlap": {
      const keyword = q("keyword");
      if (!keyword) return bad("缺少 keyword 参数");
      const limit = intParam(q("limit"), 40, 1, 50);
      return handled(() => crossPlatformOverlap(keyword, splitList(q("platforms")), limit));
    }

    case "/api/clusters": {
      const minPlatforms = intParam(q("min_platforms"), 2, 2, 6);
      const limit = intParam(q("limit"), 20, 5, 40);
      return handled(() => discoverClusters(splitList(q("platforms")), minPlatforms, limit));
    }

    case "/api/changes": {
      const names = splitList(q("platforms"));
      const list = names.length ? names : DEFAULT_PLATFORMS;
      return handled(() => {
        const diffs = list.map((p) => diffPlatform(p));
        return {
          generatedAt: new Date().toISOString(),
          withHistory: diffs
            .filter((d) => d.hasHistory)
            .map((d) => ({
              platform: d.platform,
              latestAt: d.latestAt,
              previousAt: d.previousAt,
              newTopics: d.changes.filter((c) => c.type === "new"),
              rising: d.changes.filter((c) => c.type === "risen"),
              dropped: d.changes.filter((c) => c.type === "dropped"),
            })),
          noHistoryYet: diffs.filter((d) => !d.hasHistory).map((d) => d.platform),
          hint: "noHistoryYet 中的平台需再查询/快照一次后才有对比基准",
        };
      });
    }

    case "/api/snapshot": {
      if (method !== "POST") return bad("快照接口为 POST");
      let platforms = splitList(q("platforms"));
      if (!platforms.length && body) {
        try {
          const j = JSON.parse(body);
          if (Array.isArray(j.platforms)) platforms = j.platforms.map(String);
        } catch {
          /* 忽略非法 body */
        }
      }
      return handled(async () => ({ capturedAt: new Date().toISOString(), report: await takeSnapshots(platforms.length ? platforms : undefined) }));
    }

    case "/api/curve": {
      const keywords = splitList(q("keywords"));
      if (!keywords.length) return bad("缺少 keywords 参数（逗号分隔，1-5 个）");
      return handled(() => interestOverTime(keywords.slice(0, 5), q("geo") ?? "", q("timeframe") ?? "today 12-m"));
    }

    case "/api/related": {
      const keyword = q("keyword");
      if (!keyword) return bad("缺少 keyword 参数");
      return handled(() => relatedQueries(keyword, q("geo") ?? ""));
    }

    case "/api/signals": {
      const limit = intParam(q("limit"), 40, 5, 100);
      const category = q("category");
      const keyword = q("keyword");
      return handled(() => futureSignals({ category: category && category !== "all" ? category : undefined, keyword: keyword ?? undefined, limit }));
    }

    case "/api/events": {
      const daysAhead = intParam(q("days_ahead"), 90, 1, 365);
      const category = q("category");
      return handled(() => upcomingEvents({ daysAhead, category: category && category !== "all" ? category : undefined }));
    }

    case "/api/topic": {
      const keyword = q("keyword");
      if (!keyword) return bad("缺少 keyword 参数");
      return handled(() => analyzeTopic(keyword, { geo: q("geo") ?? "", timeframe: q("timeframe") ?? undefined }));
    }

    case "/api/templates": {
      const type = q("type");
      const platform = q("platform");
      return handled(() => ({
        templates: listTemplates(type ?? undefined, platform ?? undefined).map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          platforms: t.platforms,
          bestFor: t.bestFor,
        })),
      }));
    }

    case "/api/template": {
      const id = q("id");
      if (!id) return bad("缺少 id 参数");
      const t = getTemplate(id);
      return t ? { status: 200, data: t } : { status: 404, data: { error: `未找到模板 ${id}` } };
    }

    case "/api/brief": {
      const topic = q("topic");
      if (!topic) return bad("缺少 topic 参数");
      return handled(() =>
        getContentBrief(topic, {
          templateId: q("template_id") ?? undefined,
          platform: q("platform") ?? undefined,
          goal: q("goal") ?? undefined,
          audience: q("audience") ?? undefined,
          geo: q("geo") ?? undefined,
        })
      );
    }

    // ---- 小红书主打专区 ----
    case "/api/xhs/status":
      return handled(() => {
        const loggedIn = xhsClient.hasLoginCookie();
        return {
          loggedIn,
          mode: loggedIn ? "cookie" : "guest",
          platform: "xiaohongshu",
          capabilities: { homeFeed: true, derivedTopics: true, officialHotlist: loggedIn, keywordSearch: loggedIn },
          note: loggedIn
            ? "已检测到 XHS_COOKIE：热门推荐流、官方热搜词榜、关键词搜索均可用。"
            : "游客模式：首页热门推荐流与派生词可用；官方热搜词榜 / 关键词搜索需配置 XHS_COOKIE。",
        };
      });

    case "/api/xhs/topics": {
      const n = intParam(q("limit"), 30, 5, 40);
      const tn = intParam(q("topic_limit"), 20, 5, 50);
      return handled(async () => {
        const feed = await fetchXiaohongshu(n);
        const derivedTopics = extractXhsTopics(feed.items.map((i) => i.title), tn);
        const loggedIn = xhsClient.hasLoginCookie();
        const officialHotlist = loggedIn ? await fetchXiaohongshuHotlist(20) : null;
        updateFromResults([feed, ...(officialHotlist ? [officialHotlist] : [])]);
        return {
          generatedAt: new Date().toISOString(),
          mode: loggedIn ? "cookie" : "guest",
          loggedIn,
          feed,
          derivedTopics,
          officialHotlist,
        };
      });
    }

    default:
      return { status: 404, data: { error: `未知接口 ${pathname}` } };
  }
}
