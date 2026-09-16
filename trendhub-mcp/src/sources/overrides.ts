/**
 * 核心平台自研采集（优先于 dailyhot，失败再回退 dailyhot）。
 * - 微博：weibo.com ajax 热搜（已验证，比 m.weibo.cn container 稳定）
 * - 知乎：官方 hot-lists（部分海外网络不可达，失败由上层回退/标记）
 * - 百度：top.baidu.com 实时榜（部分海外网络不可达，失败由上层回退/标记）
 */
import type { HotItem, HotResult } from "../util/schema.js";
import { missingResult, nowIso } from "../util/schema.js";
import { httpGet, TtlCache } from "../util/http.js";
import { config } from "../config.js";

const cache = new TtlCache<HotResult>(config.cacheTtlSec);

/* ---------------- 微博 ---------------- */
export async function fetchWeibo(limit: number): Promise<HotResult> {
  const key = `ov:weibo:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const j = (await httpGet("https://weibo.com/ajax/side/hotSearch", {
      headers: { Referer: "https://weibo.com", Accept: "application/json" },
      timeoutMs: 8000,
    })) as any;
    const rows: any[] = j?.data?.realtime ?? [];
    const items: HotItem[] = rows
      .filter((r) => r && r.note && r.word)
      .slice(0, limit)
      .map((r, i) => ({
        rank: typeof r.realpos === "number" && r.realpos > 0 ? r.realpos : i + 1,
        title: String(r.note),
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(r.word)}&t=31&Refer=top`,
        hot: typeof r.num === "number" ? r.num : null,
        hotText: typeof r.num === "number" ? formatWan(r.num) : (r.label_name ?? null),
        desc: r.label_name ? `标签：${r.label_name}` : null,
        author: null,
        externalId: r.word ? String(r.word) : null,
      }))
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    const res: HotResult = {
      platform: "weibo", label: "微博热搜", category: "social",
      capturedAt: nowIso(), sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded", items,
      note: items.length ? undefined : "微博接口未返回热搜",
    };
    cache.set(key, res);
    return res;
  } catch (e) {
    return missingResult("weibo", "微博热搜", "social", `自研接口失败：${(e as Error).message}`);
  }
}

/* ---------------- 知乎 ---------------- */
export async function fetchZhihu(limit: number): Promise<HotResult> {
  const key = `ov:zhihu:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const j = (await httpGet(`https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=${limit}&desktop=true`, {
      headers: { Referer: "https://www.zhihu.com/hot", Accept: "application/json" },
      timeoutMs: 8000,
      retries: 0,
    })) as any;
    const rows: any[] = j?.data ?? [];
    const items: HotItem[] = rows.map((row, i) => {
      const t = row?.target ?? {};
      const url = t.url ? (String(t.url).startsWith("http") ? t.url : `https://www.zhihu.com${t.url}`) : `https://www.zhihu.com/question/${t.id ?? ""}`;
      return {
        rank: i + 1,
        title: String(t.title ?? ""),
        url,
        hot: parseHotNum(row?.detail_text),
        hotText: row?.detail_text ?? null,
        desc: t.excerpt ? String(t.excerpt).slice(0, 200) : null,
        author: t.author?.name ?? null,
        externalId: t.id ? String(t.id) : null,
      };
    }).filter((x) => x.title);
    const res: HotResult = {
      platform: "zhihu", label: "知乎热榜", category: "social",
      capturedAt: nowIso(), sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded", items,
      note: items.length ? undefined : "知乎接口未返回数据",
    };
    cache.set(key, res);
    return res;
  } catch (e) {
    return missingResult("zhihu", "知乎热榜", "social", `自研接口失败（海外网络可能不可达）：${(e as Error).message}`);
  }
}

/* ---------------- 百度 ---------------- */
export async function fetchBaidu(limit: number): Promise<HotResult> {
  const key = `ov:baidu:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const j = (await httpGet("https://top.baidu.com/api/board?platform=wise&tab=realtime", {
      headers: { Referer: "https://top.baidu.com", Accept: "application/json" },
      timeoutMs: 8000,
      retries: 0,
    })) as any;
    const content: any[] = j?.data?.cards?.find((c: any) => Array.isArray(c.content))?.content ?? [];
    const items: HotItem[] = content.slice(0, limit).map((c, i) => ({
      rank: typeof c.index === "number" ? c.index : i + 1,
      title: String(c.word ?? c.query ?? ""),
      url: c.url ? String(c.url) : `https://www.baidu.com/s?wd=${encodeURIComponent(c.word ?? "")}`,
      hot: typeof c.hotScore === "number" ? c.hotScore : null,
      hotText: c.hotScore ? String(c.hotScore) : null,
      desc: c.desc ? String(c.desc).slice(0, 200) : null,
      author: null,
      externalId: c.id ? String(c.id) : null,
    })).filter((x) => x.title);
    const res: HotResult = {
      platform: "baidu", label: "百度热搜", category: "social",
      capturedAt: nowIso(), sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded", items,
      note: items.length ? undefined : "百度接口未返回数据",
    };
    cache.set(key, res);
    return res;
  } catch (e) {
    return missingResult("baidu", "百度热搜", "social", `自研接口失败（海外网络可能不可达）：${(e as Error).message}`);
  }
}

function formatWan(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n);
}
function parseHotNum(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = text.match(/([\d.]+)\s*(万|亿|w|W)?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = m[2];
  if (unit === "万" || unit === "w" || unit === "W") return Math.round(n * 10000);
  if (unit === "亿") return Math.round(n * 100000000);
  return Math.round(n);
}
