/**
 * Google Trends 趋势走势（自研，Node 无同质量开源库；对标维护中的 Python trendspy/trendspyg）。
 * 管线：首页 warmup 取 cookie → explore 拿 widget token → widgetdata 取时间序列/相关词。
 * 重要口径：返回 0-100 相对热度（区间峰值=100），不是绝对搜索量；非官方端点，可能随 Google 调整失效。
 */
import { USER_AGENT } from "../config.js";
import type { DataQuality, RelatedQuery, TrendCurve, TrendPoint } from "../util/schema.js";

let cookieCache: { cookie: string; at: number } | null = null;
const COOKIE_TTL_MS = 25 * 60 * 1000;

async function warmup(): Promise<string> {
  if (cookieCache && Date.now() - cookieCache.at < COOKIE_TTL_MS) return cookieCache.cookie;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch("https://trends.google.com/trends/?hl=en-US&geo=US", {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    const sc = res.headers.getSetCookie?.() ?? [];
    let cookie = sc.map((c) => c.split(";")[0]).join("; ");
    if (!cookie) cookie = cookieCache?.cookie ?? "";
    cookieCache = { cookie, at: Date.now() };
    return cookie;
  } finally {
    clearTimeout(timer);
  }
}

async function trendsGet(url: string, referer: string, cookie: string, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Referer: referer,
        Cookie: cookie,
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (res.status === 429) throw new Error("Google Trends 限流(429)，请稍后再试或降低频率");
    if (!res.ok) throw new Error(`Google Trends HTTP ${res.status}`);
    const txt = await res.text();
    return JSON.parse(txt.replace(/^\)\]\}',?\n?/, ""));
  } finally {
    clearTimeout(timer);
  }
}

function normTimeframe(tf: string): string {
  const allowed = /^(now\s+\d+-H|today\s+\d+-[myd]|all|\d{4}-\d{2}-\d{2}\s\d{4}-\d{2}-\d{2})$/;
  return allowed.test(tf) ? tf : "today 12-m";
}

async function explore(keywords: string[], geo: string, timeframe: string, cookie: string, property = ""): Promise<any[]> {
  const comparisonItem = keywords.map((keyword) => ({ keyword, geo, time: timeframe }));
  const req = encodeURIComponent(JSON.stringify({ comparisonItem, category: 0, property }));
  const tz = -new Date().getTimezoneOffset();
  const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=${tz}&req=${req}&tz=${tz}`;
  const j = await trendsGet(url, "https://trends.google.com/trends/explore", cookie);
  if (!Array.isArray(j.widgets)) throw new Error("未能解析 Trends widgets（可能被限流或地区不可用）");
  return j.widgets;
}

/** 关键词相对热度时间序列（支持 1-5 个关键词对比） */
export async function interestOverTime(keywords: string[], geo = "", timeframe = "today 12-m"): Promise<TrendCurve & { series?: Record<string, TrendPoint[]> }> {
  const kw = keywords.slice(0, 5);
  const tf = normTimeframe(timeframe);
  const scaleNote = "Google Trends 相对热度 0-100（所选时间窗内峰值=100），非绝对搜索量；跨关键词对比时共用同一刻度";
  try {
    const cookie = await warmup();
    const widgets = await explore(kw, geo, tf, cookie);
    const ts = widgets.find((w) => w.id === "TIMESERIES");
    if (!ts) return { keyword: kw.join(","), geo: geo || "WORLD", timeframe: tf, scaleNote, dataQuality: "missing", points: [], note: "无 TIMESERIES 组件" };
    const tz = -new Date().getTimezoneOffset();
    const url = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=${tz}&req=${encodeURIComponent(JSON.stringify(ts.request))}&token=${encodeURIComponent(ts.token)}`;
    const j2 = await trendsGet(url, "https://trends.google.com/trends/explore", cookie);
    const rows = j2?.default?.timelineData ?? [];
    const points: TrendPoint[] = rows.map((r: any) => ({
      date: r.formattedAxisTime ?? new Date(Number(r.time) * 1000).toISOString().slice(0, 10),
      value: Array.isArray(r.value) && r.value.length ? (r.value[0] === null ? null : Math.round(r.value[0])) : null,
    }));
    // 多关键词对比
    let series: Record<string, TrendPoint[]> | undefined;
    if (kw.length > 1) {
      series = {};
      kw.forEach((k, idx) => {
        series![k] = rows.map((r: any) => ({
          date: r.formattedAxisTime ?? new Date(Number(r.time) * 1000).toISOString().slice(0, 10),
          value: Array.isArray(r.value) && r.value[idx] != null ? Math.round(r.value[idx]) : null,
        }));
      });
    }
    const dq: DataQuality = points.length ? "ok" : "degraded";
    return { keyword: kw.join(","), geo: geo || "WORLD", timeframe: tf, scaleNote, dataQuality: dq, points, series, note: points.length ? undefined : "时间序列为空" };
  } catch (e) {
    return { keyword: kw.join(","), geo: geo || "WORLD", timeframe: tf, scaleNote, dataQuality: "missing", points: [], note: (e as Error).message };
  }
}

/** 相关搜索词（top 热门 / rising 飙升） */
export async function relatedQueries(keyword: string, geo = ""): Promise<{ keyword: string; geo: string; dataQuality: DataQuality; top: RelatedQuery[]; rising: RelatedQuery[]; note?: string }> {
  try {
    const cookie = await warmup();
    const widgets = await explore([keyword], geo, "today 12-m", cookie);
    const rq = widgets.find((w) => w.id === "RELATED_QUERIES");
    if (!rq) return { keyword, geo: geo || "WORLD", dataQuality: "degraded", top: [], rising: [], note: "无相关词组件（数据量不足）" };
    const tz = -new Date().getTimezoneOffset();
    const url = `https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=en-US&tz=${tz}&req=${encodeURIComponent(JSON.stringify(rq.request))}&token=${encodeURIComponent(rq.token)}`;
    const j = await trendsGet(url, "https://trends.google.com/trends/explore", cookie);
    const lists = j?.default?.rankedList ?? [];
    const map = (arr: any[], kind: "top" | "rising"): RelatedQuery[] =>
      (arr ?? []).map((x) => ({ query: String(x.query ?? ""), value: x.formattedValue ?? (x.value != null ? String(x.value) : null), kind })).filter((x) => x.query);
    const top = map(lists[0]?.rankedKeyword, "top");
    const rising = map(lists[1]?.rankedKeyword, "rising");
    return { keyword, geo: geo || "WORLD", dataQuality: top.length || rising.length ? "ok" : "degraded", top, rising };
  } catch (e) {
    return { keyword, geo: geo || "WORLD", dataQuality: "missing", top: [], rising: [], note: (e as Error).message };
  }
}

// 说明：Google 旧版 dailytrends / realtimetrends 公开端点（含 RSS）已于 2024-2025 年陆续下线
// （官方 alpha API 明确不提供 Trending Now）。"此刻正在爆发的热点"改由各平台原生实时热榜
// （get_trending / discover_trending_topics）覆盖，不再请求已失效端点，避免 404 与假数据。
