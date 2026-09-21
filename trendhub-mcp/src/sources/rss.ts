/**
 * 未来趋势信号：高质量科技 / AI / 商业 / 营销信源 RSS 聚合。
 * 工具只提供"信号素材"，趋势判断与成文由调用方 AI 完成。
 */
import fs from "node:fs";
import Parser from "rss-parser";
import { config } from "../config.js";
import { readSeedJson } from "../util/paths.js";
import { nowIso } from "../util/schema.js";
import type { RssArticle } from "../util/schema.js";
import { assertSafeHttpUrl, assertSafeRemoteUrl } from "../security/url.js";
import { stripHtml } from "../security/html.js";

interface SourceDef {
  name: string;
  category: string;
  url: string;
}

const builtInSources = readSeedJson<{ sources: SourceDef[] }>("future-sources.json", { sources: [] }).sources;
const builtInUrls = new Set(builtInSources.map((source) => source.url));
const INDUSTRY_CATEGORIES = new Set(["strategy", "marketing", "advertising", "media", "commerce", "operations"]);

let parser: Parser | null = null;
function getParser(): Parser {
  if (!parser) parser = new Parser({ timeout: config.timeoutMs, headers: { "User-Agent": "TrendHubMCP/1.0 (+https://github.com)" }, maxRedirects: 3 });
  return parser;
}

export function loadSources(): SourceDef[] {
  if (config.rssSourcesFile && fs.existsSync(config.rssSourcesFile)) {
    try {
      const j = JSON.parse(fs.readFileSync(config.rssSourcesFile, "utf-8"));
      if (Array.isArray(j.sources)) return j.sources.filter((source: unknown): source is SourceDef => {
        const candidate = source as Partial<SourceDef>;
        try { assertSafeHttpUrl(String(candidate?.url ?? "")); return Boolean(candidate?.name && candidate?.category); } catch { return false; }
      });
    } catch {
      /* 落到内置 */
    }
  }
  return builtInSources;
}

async function fetchOne(src: SourceDef, perSource: number): Promise<{ articles: RssArticle[]; error?: string }> {
  try {
    // Built-in feeds are code-reviewed, fixed HTTPS endpoints. Custom feed files
    // still require DNS-level SSRF checks. This distinction also keeps built-ins
    // usable behind enterprise/test DNS proxies that map public hosts to 198.18/15.
    const safeUrl = builtInUrls.has(src.url) ? assertSafeHttpUrl(src.url) : await assertSafeRemoteUrl(src.url);
    const feed = await getParser().parseURL(safeUrl.toString());
    const articles: RssArticle[] = feed.items.slice(0, perSource).map((it) => ({
      title: String(it.title ?? "").trim(),
      url: it.link ?? null,
      publishedAt: it.isoDate ? new Date(it.isoDate).toISOString() : null,
      source: src.name,
      category: src.category,
      summary: it.contentSnippet ? stripHtml(it.contentSnippet).slice(0, 280) : null,
    })).filter((a) => a.title);
    return { articles };
  } catch (e) {
    return { articles: [], error: `${src.name}: ${(e as Error).message}` };
  }
}

export interface FutureResult {
  capturedAt: string;
  dataQuality: "ok" | "degraded" | "missing";
  total: number;
  articles: RssArticle[];
  sourceStatus: { name: string; category: string; ok: boolean; error?: string }[];
}

export async function futureSignals(opts: { category?: string; keyword?: string; limit?: number; perSource?: number } = {}): Promise<FutureResult> {
  const { category, keyword, limit = 40, perSource = 6 } = opts;
  let sources = loadSources();
  if (category === "industry") sources = sources.filter((s) => INDUSTRY_CATEGORIES.has(s.category));
  else if (category && category !== "all") sources = sources.filter((s) => s.category === category);

  // 限流并发（每批 5 个）
  const status: FutureResult["sourceStatus"] = [];
  let articles: RssArticle[] = [];
  const BATCH = 5;
  for (let i = 0; i < sources.length; i += BATCH) {
    const results = await Promise.all(sources.slice(i, i + BATCH).map((s) => fetchOne(s, perSource)));
    results.forEach((r, idx) => {
      const s = sources[i + idx];
      status.push({ name: s.name, category: s.category, ok: !r.error, error: r.error });
      articles.push(...r.articles);
    });
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    articles = articles.filter((a) => a.title.toLowerCase().includes(kw) || (a.summary ?? "").toLowerCase().includes(kw));
  }
  articles.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  articles = articles.slice(0, limit);

  const okCount = status.filter((s) => s.ok).length;
  return {
    capturedAt: nowIso(),
    dataQuality: okCount === 0 ? "missing" : okCount < status.length / 2 ? "degraded" : "ok",
    total: articles.length,
    articles,
    sourceStatus: status,
  };
}

export function futureCategories(): string[] {
  return ["industry", ...Array.from(new Set(loadSources().map((s) => s.category)))];
}
