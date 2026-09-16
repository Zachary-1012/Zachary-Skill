/**
 * 国际平台热榜采集（自研，使用各平台官方/公开端点）：
 * - Hacker News：官方 Firebase API（免费、稳定、无需 key）
 * - GitHub Trending：公开页面解析（cheerio）
 * - Reddit：公开 .rss（.json 被反爬，RSS 不含票数故 hot 如实置 null）
 * - Product Hunt：官方公开 RSS
 */
import { load } from "cheerio";
import Parser from "rss-parser";
import type { HotItem, HotResult } from "../util/schema.js";
import { missingResult, nowIso } from "../util/schema.js";
import { httpGet, TtlCache } from "../util/http.js";
import { config } from "../config.js";

const cache = new TtlCache<HotResult>(config.cacheTtlSec);
const rssParser = new Parser({ timeout: config.timeoutMs, headers: { "User-Agent": "TrendHubMCP/1.0" } });

async function mapAndCache(key: string, platform: string, label: string, category: string,
  items: HotItem[], note?: string): Promise<HotResult> {
  const result: HotResult = {
    platform, label, category,
    capturedAt: nowIso(),
    sourceUpdatedAt: null,
    dataQuality: items.length ? "ok" : "degraded",
    items,
    note,
  };
  cache.set(key, result);
  return result;
}

/* ---------------- Hacker News（官方 API） ---------------- */
async function fetchHackerNews(limit: number): Promise<HotResult> {
  const key = `int:hn:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const ids = (await httpGet("https://hacker-news.firebaseio.com/v0/topstories.json")) as number[];
    const top = ids.slice(0, limit);
    // 分批并发，避免一次性打满
    const items: HotItem[] = [];
    const BATCH = 8;
    for (let i = 0; i < top.length; i += BATCH) {
      const chunk = await Promise.all(
        top.slice(i, i + BATCH).map(async (id, j) => {
          const rank = i + j + 1;
          try {
            const it = (await httpGet(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)) as Record<string, unknown>;
            if (!it || it.dead || it.deleted) return null;
            return {
              rank,
              title: String(it.title ?? ""),
              url: it.url ? String(it.url) : `https://news.ycombinator.com/item?id=${id}`,
              hot: typeof it.score === "number" ? it.score : null,
              hotText: it.score != null ? `${it.score} points · ${it.descendants ?? 0} comments` : null,
              desc: it.descendants != null ? `${it.descendants} comments` : null,
              author: it.by ? String(it.by) : null,
              externalId: String(id),
            } as HotItem;
          } catch {
            return null;
          }
        })
      );
      items.push(...chunk.filter((x): x is HotItem => x !== null));
    }
    items.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    return mapAndCache(key, "hackernews", "Hacker News", "tech", items);
  } catch (e) {
    return missingResult("hackernews", "Hacker News", "tech", `抓取失败：${(e as Error).message}`);
  }
}

/* ---------------- GitHub Trending（页面解析） ---------------- */
async function fetchGithubTrending(limit: number, since: string, language?: string): Promise<HotResult> {
  const key = `int:gh:${since}:${language ?? "all"}:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const path = language ? `/${encodeURIComponent(language)}` : "";
    const url = `https://github.com/trending${path}?since=${since}`;
    const html = (await httpGet(url, { as: "text" })) as string;
    const $ = load(html);
    const items: HotItem[] = [];
    $("article.Box-row").each((i, el) => {
      if (i >= limit) return;
      const $el = $(el);
      const a = $el.find("h2 a").first();
      const repo = a.attr("href")?.replace(/^\//, "").trim() ?? "";
      const title = repo.replace(/\s+/g, " ");
      const desc = $el.find("p").first().text().trim() || null;
      const langText = $el.find('[itemprop="programmingLanguage"]').first().text().trim();
      const stars = $el.find('a[href$="/stargazers"]').first().text().replace(/\s+/g, "").trim();
      const today = $el.find("span.d-inline-block.float-sm-right").first().text().replace(/\s+/g, " ").trim();
      items.push({
        rank: i + 1,
        title,
        url: repo ? `https://github.com/${repo}` : null,
        hot: today ? Number(today.replace(/[^\d]/g, "")) || null : null,
        hotText: today || (stars ? `${stars} stars` : null),
        desc: [desc, langText ? `lang: ${langText}` : null, stars ? `total stars: ${stars}` : null].filter(Boolean).join(" | "),
        author: repo.split("/")[0] || null,
        externalId: repo || null,
      });
    });
    return mapAndCache(key, "github-trending", `GitHub Trending (${since})`, "dev", items,
      items.length ? undefined : "页面结构可能已变化，需更新选择器");
  } catch (e) {
    return missingResult("github-trending", "GitHub Trending", "dev", `抓取失败：${(e as Error).message}`);
  }
}

/* ---------------- Reddit（公开 RSS） ---------------- */
const REDDIT_SUBS: Record<string, string> = {
  technology: "r/technology",
  worldnews: "r/worldnews",
  programming: "r/programming",
  MachineLearning: "r/MachineLearning",
  ArtificialInteligence: "r/artificial",
  business: "r/business",
  marketing: "r/marketing",
};

async function fetchReddit(limit: number, sub: string): Promise<HotResult> {
  const subName = sub.replace(/^r\//, "");
  const key = `int:reddit:${subName}:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    // Reddit 对 .json 端点加强反爬，公开 .rss 更稳定；RSS 不含票数，hot 如实置 null
    const feed = await rssParser.parseURL(`https://www.reddit.com/r/${encodeURIComponent(subName)}/hot/.rss?limit=${limit}`);
    const items: HotItem[] = feed.items.slice(0, limit).map((it, i) => ({
      rank: i + 1,
      title: String(it.title ?? "").trim(),
      url: it.link ?? null,
      hot: null,
      hotText: it.isoDate ? new Date(it.isoDate).toISOString().slice(0, 10) : null,
      desc: it.contentSnippet ? it.contentSnippet.replace(/<[^>]+>/g, "").slice(0, 200) : null,
      author: it.creator ? `u/${it.creator}` : null,
      externalId: it.guid ?? null,
    })).filter((x) => x.title);
    return mapAndCache(key, `reddit-${subName}`, `Reddit ${REDDIT_SUBS[subName] ?? `r/${subName}`}`, "community", items,
      items.length ? undefined : "RSS 未返回条目，可能被限流");
  } catch (e) {
    return missingResult(`reddit-${subName}`, `Reddit r/${subName}`, "community", `抓取失败：${(e as Error).message}`);
  }
}

/* ---------------- Product Hunt（官方 RSS） ---------------- */
async function fetchProductHunt(limit: number): Promise<HotResult> {
  const key = `int:ph:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const feed = await rssParser.parseURL("https://www.producthunt.com/feed");
    const items: HotItem[] = feed.items
      .filter((it) => it.link && it.link.includes("/products/") && it.title && !/project feed/i.test(it.title))
      .slice(0, limit)
      .map((it, i) => ({
        rank: i + 1,
        title: String(it.title ?? "").replace(/\s+/g, " ").trim(),
        url: it.link ?? null,
        hot: null,
        hotText: it.isoDate ? new Date(it.isoDate).toISOString().slice(0, 10) : null,
        desc: it.contentSnippet ? it.contentSnippet.replace(/<[^>]+>/g, "").slice(0, 200) : null,
        author: it.creator ?? null,
        externalId: it.guid ?? null,
      }));
    return mapAndCache(key, "producthunt", "Product Hunt", "tech", items);
  } catch (e) {
    return missingResult("producthunt", "Product Hunt", "tech", `抓取失败：${(e as Error).message}`);
  }
}

export interface IntlSpec {
  platform: string;
  label: string;
  category: string;
  fetch: (limit: number, arg?: string) => Promise<HotResult>;
  arg?: string;
}

export const INTERNATIONAL: IntlSpec[] = [
  { platform: "hackernews", label: "Hacker News", category: "tech", fetch: (l) => fetchHackerNews(l) },
  { platform: "github-trending", label: "GitHub Trending", category: "dev", fetch: (l) => fetchGithubTrending(l, "daily") },
  { platform: "producthunt", label: "Product Hunt", category: "tech", fetch: (l) => fetchProductHunt(l) },
  { platform: "reddit-technology", label: "Reddit r/technology", category: "tech", fetch: (l) => fetchReddit(l, "technology") },
  { platform: "reddit-programming", label: "Reddit r/programming", category: "dev", fetch: (l) => fetchReddit(l, "programming") },
  { platform: "reddit-MachineLearning", label: "Reddit r/MachineLearning", category: "ai", fetch: (l) => fetchReddit(l, "MachineLearning") },
  { platform: "reddit-worldnews", label: "Reddit r/worldnews", category: "news", fetch: (l) => fetchReddit(l, "worldnews") },
  { platform: "reddit-marketing", label: "Reddit r/marketing", category: "marketing", fetch: (l) => fetchReddit(l, "marketing") },
];

export async function fetchInternational(platform: string, limit = 30): Promise<HotResult> {
  if (platform === "github-trending-weekly") return fetchGithubTrending(limit, "weekly");
  if (platform === "github-trending-monthly") return fetchGithubTrending(limit, "monthly");
  if (platform.startsWith("reddit:")) return fetchReddit(limit, platform.slice(7));
  const spec = INTERNATIONAL.find((s) => s.platform === platform);
  if (!spec) return missingResult(platform, platform, "international", `未知国际平台: ${platform}`);
  return spec.fetch(limit, spec.arg);
}
