/**
 * 国内 / 中文平台热榜采集
 * 直接在进程内调用开源 MIT 项目 dailyhot-api 的 Hono app（app.fetch），不起额外端口、不发外部 HTTP。
 * 上游为各平台公开页面/接口的聚合抓取；任一平台失效只影响该平台，绝不影响整体。
 */
import type { HotItem, HotResult } from "../util/schema.js";
import { missingResult, nowIso } from "../util/schema.js";
import { TtlCache } from "../util/http.js";
import { config } from "../config.js";

/**
 * dailyhot-api 聚合库体积较大，改为首次真正抓取国内聚合源时才动态加载，
 * 避免在 MCP 冷启动 / tools-list 握手阶段就加载整个聚合库，显著加快接入速度。
 * 类型见 src/types/dailyhot-api.d.ts。
 */
type DailyHotApp = { fetch: (request: Request, ...rest: unknown[]) => Promise<Response> };
let dailyHotAppPromise: Promise<DailyHotApp> | null = null;
function loadDailyHotApp(): Promise<DailyHotApp> {
  if (!dailyHotAppPromise) {
    dailyHotAppPromise = import("dailyhot-api/dist/app.js").then((m) => {
      const mod = m as { default?: DailyHotApp } & Partial<DailyHotApp>;
      return mod.default ?? (mod as DailyHotApp);
    });
  }
  return dailyHotAppPromise;
}

export interface PlatformMeta {
  name: string;
  label: string;
  category: string;
}

/** 精选常用平台元数据（dailyhot 还支持更多，可用 list_platforms 的 all 模式查看） */
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

/** 各平台热度字段名不统一，按候选键提取数值 */
function extractHot(item: Record<string, unknown>): { hot: number | null; hotText: string | null } {
  const numKeys = ["hot", "hotScore", "hot_score", "heat", "number", "view_count", "diggCount", "playCount", "score", "index"];
  for (const k of numKeys) {
    const v = item[k];
    if (typeof v === "number" && Number.isFinite(v)) return { hot: v, hotText: String(v) };
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(/[^\d.]/g, ""));
      if (Number.isFinite(n) && v.trim() !== "") return { hot: n, hotText: v };
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
  return metaByName.has(name) || true; // dailyhot 任意路由名都可尝试
}

/** 拉取单个国内平台热榜 */
export async function fetchDomestic(name: string, limit = 50): Promise<HotResult> {
  const meta = metaByName.get(name);
  const label = meta?.label ?? name;
  const category = meta?.category ?? "domestic";
  const cacheKey = `dom:${name}:${limit}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  try {
    const req = new Request(`http://127.0.0.1/${encodeURIComponent(name)}?limit=${limit}&cache=false`);
    const dailyHotApp = await loadDailyHotApp();
    const res = await dailyHotApp.fetch(req);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      const r = missingResult(name, label, category, `上游返回非 JSON（HTTP ${res.status}），该平台可能暂时失效`);
      return r;
    }
    const json = (await res.json()) as Record<string, unknown>;
    if (json.code !== 200 || !Array.isArray(json.data)) {
      return missingResult(name, label, category, `上游返回异常 code=${String(json.code)} ${(json.message as string) ?? ""}`.trim());
    }
    const items = (json.data as Record<string, unknown>[]).map((raw, i) => mapItem(raw, i + 1)).filter((x) => x.title);
    const result: HotResult = {
      platform: name,
      label,
      category,
      capturedAt: nowIso(),
      sourceUpdatedAt: (json.update_time as string) ?? (json.timestamp as string) ?? null,
      dataQuality: items.length ? "ok" : "degraded",
      items: items.slice(0, limit),
      note: items.length ? undefined : "榜单为空，可能处于更新窗口",
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
