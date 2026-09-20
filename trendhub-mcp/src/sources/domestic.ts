/**
 * 国内 / 中文平台热榜采集。
 *
 * TrendHub 只按需加载 dailyhot-api 的具体 route handler，不再导入其整套 Hono app。
 * 这样避免上游 app 在嵌入式运行时尝试挂载自己的 ./public 静态目录，也让第三方
 * Web 壳与 TrendHub 的 Source Adapter 边界保持分离。
 */
import type { HotItem, HotResult } from "../util/schema.js";
import { missingResult, nowIso } from "../util/schema.js";
import { TtlCache } from "../util/http.js";
import { config } from "../config.js";

type DailyHotRouteContext = {
  req: {
    query: (key: string) => string | undefined;
  };
};

type DailyHotRouteModule = {
  handleRoute: (context: DailyHotRouteContext, noCache: boolean) => Promise<Record<string, unknown>>;
};

const routePromises = new Map<string, Promise<DailyHotRouteModule>>();

function routeContext(): DailyHotRouteContext {
  return { req: { query: () => undefined } };
}

function loadDailyHotRoute(name: string): Promise<DailyHotRouteModule> {
  if (!/^[a-z0-9-]+$/i.test(name)) {
    return Promise.reject(new Error("invalid dailyhot route name"));
  }
  const existing = routePromises.get(name);
  if (existing) return existing;
  const promise = import(`dailyhot-api/dist/routes/${name}.js`).then((mod) => {
    if (typeof mod.handleRoute !== "function") throw new Error(`dailyhot route ${name} has no handleRoute`);
    return mod as DailyHotRouteModule;
  });
  routePromises.set(name, promise);
  return promise;
}

export interface PlatformMeta {
  name: string;
  label: string;
  category: string;
}

export const DOMESTIC_PLATFORMS: PlatformMeta[] = [
  { name: "weibo", label: "微博热搜", category: "social" },
  { name: "zhihu", label: "知乎热榜", category: "social" },
  { name: "baidu", label: "百度热搜", category: "social" },
  { name: "tieba", label: "贴吧热议", category: "social" },
  { name: "hupu", label: "虎扑步行街", category: "social" },
  { name: "bilibili", label: "B站热门", category: "video" },
  { name: "douyin", label: "抖音热点", category: "video" },
  { name: "kuaishou", label: "快手热点", category: "video" },
  { name: "toutiao", label: "今日头条", category: "news" },
  { name: "thepaper", label: "澎湃新闻", category: "news" },
  { name: "qq-news", label: "腾讯新闻", category: "news" },
  { name: "netease-news", label: "网易新闻", category: "news" },
  { name: "sina-news", label: "新浪新闻", category: "news" },
  { name: "36kr", label: "36氪", category: "tech" },
  { name: "ithome", label: "IT之家", category: "tech" },
  { name: "huxiu", label: "虎嗅", category: "tech" },
  { name: "sspai", label: "少数派", category: "tech" },
  { name: "ifanr", label: "爱范儿", category: "tech" },
  { name: "juejin", label: "稀土掘金", category: "dev" },
  { name: "csdn", label: "CSDN", category: "dev" },
  { name: "51cto", label: "51CTO", category: "dev" },
  { name: "v2ex", label: "V2EX", category: "dev" },
  { name: "hellogithub", label: "HelloGitHub", category: "dev" },
  { name: "coolapk", label: "酷安", category: "community" },
  { name: "weread", label: "微信读书飙升", category: "reading" },
  { name: "history", label: "历史上的今天", category: "culture" },
];

const metaByName = new Map(DOMESTIC_PLATFORMS.map((p) => [p.name, p]));
const cache = new TtlCache<HotResult>(config.cacheTtlSec);

function extractHot(item: Record<string, unknown>): { hot: number | null; hotText: string | null } {
  const numKeys = ["hot", "hotScore", "hot_score", "heat", "number", "view_count", "diggCount", "playCount", "score", "index"];
  for (const k of numKeys) {
    const v = item[k];
    if (typeof v === "number" && Number.isFinite(v)) return { hot: v, hotText: String(v) };
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(/[^\d.]/g, ""));
      if (Number.isFinite(n)) return { hot: n, hotText: v };
    }
  }
  const strKeys = ["hotScoreStr", "hot_str", "label", "tag"];
  for (const k of strKeys) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) return { hot: null, hotText: v };
  }
  return { hot: null, hotText: null };
}

function mapItem(raw: Record<string, unknown>, rank: number): HotItem {
  const { hot, hotText } = extractHot(raw);
  const url = (raw.url as string) || (raw.mobileUrl as string) || null;
  return {
    rank,
    title: (raw.title as string) ?? "",
    url,
    hot,
    hotText,
    desc: (raw.desc as string) ?? null,
    author: (raw.author as string) ?? (raw.source as string) ?? null,
    externalId: raw.id !== undefined && raw.id !== null ? String(raw.id) : null,
  };
}

export function isDomestic(name: string): boolean {
  return metaByName.has(name);
}

export async function fetchDomestic(name: string, limit = 50): Promise<HotResult> {
  const meta = metaByName.get(name);
  const label = meta?.label ?? name;
  const category = meta?.category ?? "domestic";
  if (!meta) return missingResult(name, label, category, "未注册的国内聚合源");

  const cacheKey = `dom:${name}:${limit}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  try {
    const route = await loadDailyHotRoute(name);
    const payload = await route.handleRoute(routeContext(), true);
    const rows = Array.isArray(payload.data) ? payload.data as Record<string, unknown>[] : [];
    const items = rows.map((raw, i) => mapItem(raw, i + 1)).filter((x) => x.title).slice(0, limit);
    const sourceUpdatedAt =
      typeof payload.updateTime === "string" ? payload.updateTime :
      typeof payload.update_time === "string" ? payload.update_time :
      typeof payload.timestamp === "string" ? payload.timestamp :
      null;
    const result: HotResult = {
      platform: name,
      label,
      category,
      capturedAt: nowIso(),
      sourceUpdatedAt,
      dataQuality: items.length ? "ok" : "degraded",
      items,
      note: items.length ? undefined : "榜单为空，可能处于更新窗口或上游暂时不可用",
    };
    cache.set(cacheKey, result);
    return result;
  } catch (e) {
    return missingResult(name, label, category, `抓取失败：${(e as Error).message}`);
  }
}

export async function fetchDomesticMany(names: string[], limit = 50): Promise<HotResult[]> {
  const out: HotResult[] = [];
  for (const n of names) {
    try {
      out.push(await fetchDomestic(n, limit));
    } catch (e) {
      const meta = metaByName.get(n);
      out.push(missingResult(n, meta?.label ?? n, meta?.category ?? "domestic", (e as Error).message));
    }
  }
  return out;
}
