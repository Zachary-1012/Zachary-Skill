/** Public zero-key adapters for editorial/search evidence sources. */
import Parser from "rss-parser";
import type { HotItem, HotResult } from "../util/schema.js";
import { missingResult, nowIso } from "../util/schema.js";
import { httpGet, TtlCache } from "../util/http.js";
import { config } from "../config.js";

const parser = new Parser({ timeout: config.timeoutMs, headers: { "User-Agent": "TrendHubMCP/1.5 (+https://github.com/Zachary-1012/Zachary-Skill)" }, maxRedirects: 3 });
const cache = new TtlCache<HotResult>(config.cacheTtlSec);
type FeedSpec = { platform: string; label: string; category: string; url: string };

/** Public feeds used as publication evidence, never represented as social popularity ranks. */
export const PUBLIC_RSS_SOURCES: FeedSpec[] = [
  { platform: "techcrunch", label: "TechCrunch", category: "tech", url: "https://techcrunch.com/feed/" },
  { platform: "the-verge", label: "The Verge", category: "tech", url: "https://www.theverge.com/rss/index.xml" },
  { platform: "wired", label: "WIRED", category: "tech", url: "https://www.wired.com/feed/rss" },
  { platform: "ars-technica", label: "Ars Technica", category: "tech", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { platform: "stratechery", label: "Stratechery", category: "business", url: "https://stratechery.com/feed/" },
  { platform: "search-engine-land", label: "Search Engine Land", category: "marketing", url: "https://searchengineland.com/feed" },
  { platform: "social-media-today", label: "Social Media Today", category: "marketing", url: "https://www.socialmediatoday.com/feeds/news/" },
  { platform: "cnbeta", label: "cnBeta", category: "tech", url: "https://www.cnbeta.com.tw/backend.php" },
  { platform: "geekpark", label: "极客公园", category: "tech", url: "https://www.geekpark.net/rss" },
  { platform: "solidot", label: "Solidot", category: "tech", url: "https://www.solidot.org/index.rss" },
];

function rssItem(item: Parser.Item, rank: number): HotItem {
  return { rank, title: String(item.title ?? "").replace(/\s+/g, " ").trim(), url: item.link ?? null, hot: null,
    hotText: item.isoDate ? new Date(item.isoDate).toISOString() : null,
    desc: item.contentSnippet?.replace(/<[^>]+>/g, "").slice(0, 280) ?? null,
    author: item.creator ?? null, externalId: item.guid ?? item.link ?? null };
}

async function fetchRss(spec: FeedSpec, limit: number): Promise<HotResult> {
  const key = `public-rss:${spec.platform}:${limit}`;
  const cached = cache.get(key); if (cached) return cached;
  try {
    const feed = await parser.parseURL(spec.url);
    const items = feed.items.slice(0, limit).map(rssItem).filter((item) => item.title);
    const result: HotResult = { platform: spec.platform, label: spec.label, category: spec.category, capturedAt: nowIso(),
      sourceUpdatedAt: feed.lastBuildDate ? new Date(feed.lastBuildDate).toISOString() : null,
      dataQuality: items.length ? "ok" : "degraded", items,
      note: "公开 RSS/Atom 编辑部发布证据；按发布时间排序，不代表平台热度排名。" };
    cache.set(key, result); return result;
  } catch (error) { return missingResult(spec.platform, spec.label, spec.category, `公开 Feed 抓取失败：${(error as Error).message}`); }
}

type GdeltArticle = { url?: string; title?: string; seendate?: string; domain?: string; language?: string };
async function fetchGdelt(limit: number): Promise<HotResult> {
  const query = process.env.TRENTHUB_GDELT_QUERY?.trim() || "(AI OR technology OR marketing)";
  const key = `gdelt:${query}:${limit}`; const cached = cache.get(key); if (cached) return cached;
  try {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.searchParams.set("query", query); url.searchParams.set("mode", "artlist");
    url.searchParams.set("maxrecords", String(Math.min(limit, 250))); url.searchParams.set("timespan", "1d");
    url.searchParams.set("sort", "datedesc"); url.searchParams.set("format", "json");
    const payload = await httpGet(url.toString()) as { articles?: GdeltArticle[] };
    const items = (payload.articles ?? []).slice(0, limit).map((article, index) => ({ rank: index + 1,
      title: String(article.title ?? "").trim(), url: article.url ?? null, hot: null,
      hotText: article.seendate ? `seen ${article.seendate}` : "near-real-time global news coverage",
      desc: article.domain ? `domain: ${article.domain}${article.language ? ` · language: ${article.language}` : ""}` : null,
      author: article.domain ?? null, externalId: article.url ?? null })).filter((item) => item.title);
    const result: HotResult = { platform: "gdelt", label: "GDELT global news", category: "news", capturedAt: nowIso(), sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded", items,
      note: `GDELT DOC article evidence for query=${query}; coverage volume is not a social-platform popularity rank.` };
    cache.set(key, result); return result;
  } catch (error) { return missingResult("gdelt", "GDELT global news", "news", `GDELT 查询失败：${(error as Error).message}`); }
}

type ItunesResult = { collectionId?: number; collectionName?: string; artistName?: string; feedUrl?: string; collectionViewUrl?: string; releaseDate?: string };
async function fetchApplePodcasts(limit: number): Promise<HotResult> {
  const query = process.env.TRENTHUB_APPLE_PODCAST_QUERY?.trim() || "AI";
  const key = `apple-podcasts:${query}:${limit}`; const cached = cache.get(key); if (cached) return cached;
  try {
    const url = new URL("https://itunes.apple.com/search"); url.searchParams.set("term", query); url.searchParams.set("media", "podcast");
    url.searchParams.set("entity", "podcast"); url.searchParams.set("limit", String(Math.min(limit, 200)));
    const payload = await httpGet(url.toString()) as { results?: ItunesResult[] };
    const items = (payload.results ?? []).map((podcast, index) => ({ rank: index + 1, title: String(podcast.collectionName ?? "").trim(),
      url: podcast.collectionViewUrl ?? podcast.feedUrl ?? null, hot: null,
      hotText: podcast.releaseDate ? `catalog result · ${podcast.releaseDate.slice(0, 10)}` : "Apple public catalog result",
      desc: podcast.artistName ?? null, author: podcast.artistName ?? null,
      externalId: podcast.collectionId != null ? String(podcast.collectionId) : null })).filter((item) => item.title);
    const result: HotResult = { platform: "apple-podcasts", label: "Apple Podcasts public catalog", category: "podcast", capturedAt: nowIso(), sourceUpdatedAt: null,
      dataQuality: items.length ? "ok" : "degraded", items,
      note: `Apple public Search API catalog evidence for query=${query}; search relevance is not a chart rank or listener count.` };
    cache.set(key, result); return result;
  } catch (error) { return missingResult("apple-podcasts", "Apple Podcasts public catalog", "podcast", `Apple Podcasts 查询失败：${(error as Error).message}`); }
}

export const PUBLIC_ADAPTER_PLATFORMS = [...PUBLIC_RSS_SOURCES.map(({ platform, label, category }) => ({ platform, label, category })),
  { platform: "gdelt", label: "GDELT global news", category: "news" },
  { platform: "apple-podcasts", label: "Apple Podcasts public catalog", category: "podcast" }];
export function isPublicAdapterPlatform(platform: string): boolean { return PUBLIC_ADAPTER_PLATFORMS.some((source) => source.platform === platform); }
export async function fetchPublicAdapter(platform: string, limit = 30): Promise<HotResult> {
  if (platform === "gdelt") return fetchGdelt(limit); if (platform === "apple-podcasts") return fetchApplePodcasts(limit);
  const spec = PUBLIC_RSS_SOURCES.find((source) => source.platform === platform);
  return spec ? fetchRss(spec, limit) : missingResult(platform, platform, "public", "未知公开适配器");
}
