/**
 * Query Evidence Acquisition for Entity-first Intelligence.
 *
 * This layer is deliberately separate from hotlist adapters: a brand/company/
 * commercial-place/campaign research request must actively query public evidence
 * rather than wait for the subject to appear on a generic trending list.
 *
 * Every channel preserves its own semantics. Search relevance/publication
 * recency are evidence, never silently converted into social popularity.
 */
import Parser from "rss-parser";
import { config, USER_AGENT } from "../config.js";
import { httpGet } from "../util/http.js";

export type QueryEvidenceQuality = "ok" | "degraded" | "missing";

export interface QueryEvidenceItem {
  id: string;
  channel: string;
  source: string;
  family: "news-authority" | "web-domain" | "social-attention" | "community-discussion" | "podcast-audio";
  title: string;
  url: string | null;
  publishedAt: string | null;
  author: string | null;
  summary: string | null;
  evidenceKind: "article" | "social-post" | "podcast";
}

export interface QueryEvidenceChannel {
  id: string;
  label: string;
  family: QueryEvidenceItem["family"];
  dataQuality: QueryEvidenceQuality;
  capturedAt: string;
  query: string;
  itemCount: number;
  items: QueryEvidenceItem[];
  note: string;
}

const TIMEOUT_MS = Math.min(config.timeoutMs, 10_000);
const parser = new Parser({
  timeout: TIMEOUT_MS,
  headers: { "User-Agent": USER_AGENT },
  maxRedirects: 3,
});

function isoOrNull(value: unknown): string | null {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function uniqueItems(items: QueryEvidenceItem[]): QueryEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.url || `${item.source}|${item.title}`).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function queryExpression(primary: string, aliases: string[]): string {
  const terms = [...new Set([primary, ...aliases].map((x) => x.trim()).filter(Boolean))].slice(0, 6);
  if (terms.length <= 1) return terms[0] ?? primary;
  return terms.map((term) => `"${term.replace(/"/g, "")}"`).join(" OR ");
}

function channel(
  id: string,
  label: string,
  family: QueryEvidenceChannel["family"],
  query: string,
  items: QueryEvidenceItem[],
  note: string,
  forcedQuality?: QueryEvidenceQuality,
): QueryEvidenceChannel {
  const deduped = uniqueItems(items);
  return {
    id,
    label,
    family,
    dataQuality: forcedQuality ?? (deduped.length ? "ok" : "degraded"),
    capturedAt: new Date().toISOString(),
    query,
    itemCount: deduped.length,
    items: deduped,
    note,
  };
}

async function safeChannel(
  id: string,
  label: string,
  family: QueryEvidenceChannel["family"],
  query: string,
  fn: () => Promise<QueryEvidenceItem[]>,
  note: string,
): Promise<QueryEvidenceChannel> {
  try {
    return channel(id, label, family, query, await fn(), note);
  } catch (error) {
    return channel(
      id,
      label,
      family,
      query,
      [],
      `${note}；获取失败：${(error as Error).message}`,
      "missing",
    );
  }
}

async function googleNews(query: string, market: "CN" | "GLOBAL", limit: number): Promise<QueryEvidenceItem[]> {
  const base = new URL("https://news.google.com/rss/search");
  base.searchParams.set("q", query);
  if (market === "CN") {
    base.searchParams.set("hl", "zh-CN");
    base.searchParams.set("gl", "CN");
    base.searchParams.set("ceid", "CN:zh-Hans");
  } else {
    base.searchParams.set("hl", "en-US");
    base.searchParams.set("gl", "US");
    base.searchParams.set("ceid", "US:en");
  }
  const feed = await parser.parseURL(base.toString());
  return feed.items.slice(0, limit).map((item, index) => ({
    id: item.guid ?? item.link ?? `google-news-${market}-${index}`,
    channel: `google-news-${market.toLowerCase()}`,
    source: String(item.creator ?? "Google News"),
    family: "news-authority" as const,
    title: String(item.title ?? "").replace(/\s+/g, " ").trim(),
    url: item.link ?? null,
    publishedAt: isoOrNull(item.isoDate ?? item.pubDate),
    author: item.creator ?? null,
    summary: item.contentSnippet?.replace(/<[^>]+>/g, "").slice(0, 360) ?? null,
    evidenceKind: "article" as const,
  })).filter((item) => item.title);
}

async function gdelt(query: string, limit: number): Promise<QueryEvidenceItem[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("maxrecords", String(Math.min(limit, 100)));
  url.searchParams.set("timespan", "7d");
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("format", "json");
  const payload = await httpGet(url.toString(), { timeoutMs: TIMEOUT_MS, retries: 0 }) as {
    articles?: Array<{ url?: string; title?: string; seendate?: string; domain?: string; language?: string }>;
  };
  return (payload.articles ?? []).slice(0, limit).map((article, index) => ({
    id: article.url ?? `gdelt-${index}`,
    channel: "gdelt-query",
    source: article.domain ?? "GDELT",
    family: "news-authority" as const,
    title: String(article.title ?? "").trim(),
    url: article.url ?? null,
    publishedAt: isoOrNull(article.seendate),
    author: article.domain ?? null,
    summary: article.language ? `language: ${article.language}` : null,
    evidenceKind: "article" as const,
  })).filter((item) => item.title);
}

async function bluesky(query: string, limit: number): Promise<QueryEvidenceItem[]> {
  const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 100)));
  url.searchParams.set("sort", "latest");
  const payload = await httpGet(url.toString(), { timeoutMs: TIMEOUT_MS, retries: 0 }) as {
    posts?: Array<Record<string, unknown>>;
  };
  return (payload.posts ?? []).slice(0, limit).map((post, index) => {
    const record = (post.record ?? {}) as Record<string, unknown>;
    const author = (post.author ?? {}) as Record<string, unknown>;
    const uri = post.uri ? String(post.uri) : "";
    const rkey = uri.split("/").at(-1) ?? "";
    const handle = String(author.handle ?? author.did ?? "");
    return {
      id: uri || `bluesky-${index}`,
      channel: "bluesky-query",
      source: handle || "Bluesky",
      family: "social-attention" as const,
      title: String(record.text ?? "").replace(/\s+/g, " ").trim(),
      url: uri && handle ? `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}` : null,
      publishedAt: isoOrNull(record.createdAt),
      author: handle || null,
      summary: null,
      evidenceKind: "social-post" as const,
    };
  }).filter((item) => item.title);
}

async function applePodcasts(query: string, limit: number): Promise<QueryEvidenceItem[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("media", "podcast");
  url.searchParams.set("entity", "podcast");
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  const payload = await httpGet(url.toString(), { timeoutMs: TIMEOUT_MS, retries: 0 }) as {
    results?: Array<{
      collectionId?: number;
      collectionName?: string;
      artistName?: string;
      collectionViewUrl?: string;
      feedUrl?: string;
      releaseDate?: string;
    }>;
  };
  return (payload.results ?? []).map((podcast, index) => ({
    id: podcast.collectionId != null ? String(podcast.collectionId) : `podcast-${index}`,
    channel: "apple-podcasts-query",
    source: "Apple Podcasts",
    family: "podcast-audio" as const,
    title: String(podcast.collectionName ?? "").trim(),
    url: podcast.collectionViewUrl ?? podcast.feedUrl ?? null,
    publishedAt: isoOrNull(podcast.releaseDate),
    author: podcast.artistName ?? null,
    summary: podcast.artistName ?? null,
    evidenceKind: "podcast" as const,
  })).filter((item) => item.title);
}

export async function collectPublicQueryEvidence(
  primaryQuery: string,
  aliases: string[] = [],
  limitPerChannel = 16,
): Promise<QueryEvidenceChannel[]> {
  const expression = queryExpression(primaryQuery, aliases);
  return Promise.all([
    safeChannel(
      "google-news-cn",
      "Google News · 中文",
      "news-authority",
      expression,
      () => googleNews(expression, "CN", limitPerChannel),
      "关键词相关新闻检索；按发布时间/搜索相关性呈现，不代表社交热度。",
    ),
    safeChannel(
      "google-news-global",
      "Google News · Global",
      "news-authority",
      expression,
      () => googleNews(expression, "GLOBAL", limitPerChannel),
      "全球相关新闻检索；按发布时间/搜索相关性呈现，不代表社交热度。",
    ),
    safeChannel(
      "gdelt-query",
      "GDELT · 近7日",
      "news-authority",
      expression,
      () => gdelt(expression, limitPerChannel),
      "GDELT DOC 近实时新闻覆盖证据；报道数量不是社会关注度。",
    ),
    safeChannel(
      "bluesky-query",
      "Bluesky · Public Search",
      "social-attention",
      primaryQuery,
      () => bluesky(primaryQuery, limitPerChannel),
      "公开 AppView 搜索结果；仅表示检索到公开帖子，不代表全站热度排名。",
    ),
    safeChannel(
      "apple-podcasts-query",
      "Apple Podcasts · Search",
      "podcast-audio",
      primaryQuery,
      () => applePodcasts(primaryQuery, Math.min(limitPerChannel, 12)),
      "Apple 公共目录相关播客证据；搜索相关性不是收听量或榜单名次。",
    ),
  ]);
}
