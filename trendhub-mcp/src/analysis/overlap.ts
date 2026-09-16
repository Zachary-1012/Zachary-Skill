/**
 * 跨平台共振分析：
 * - crossPlatformOverlap：给定关键词/话题，看它在多少平台同时上榜（人工选题验证）
 * - discoverClusters：无关键词，自动发现在多平台共振的话题（保守，输出原始命中供 AI 复核）
 */
import type { HotItem, HotResult } from "../util/schema.js";
import { getMany } from "../sources/index.js";
import { isSameTopic, keywordHit, normalize } from "./text.js";

export interface OverlapHit {
  platform: string;
  label: string;
  rank: number | null;
  title: string;
  url: string | null;
  hot: number | null;
}

export async function crossPlatformOverlap(keyword: string, platforms?: string[], limit = 40) {
  const defaultPlatforms = ["xiaohongshu", "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "thepaper", "qq-news", "36kr", "ithome", "hackernews", "reddit-worldnews"];
  const results: HotResult[] = await getMany(platforms?.length ? platforms : defaultPlatforms, limit);
  const hits: OverlapHit[] = [];
  const checkedPlatforms: { platform: string; label: string; dataQuality: string; items: number }[] = [];

  for (const r of results) {
    checkedPlatforms.push({ platform: r.platform, label: r.label, dataQuality: r.dataQuality, items: r.items.length });
    for (const it of r.items) {
      if (keywordHit(it.title, keyword) || (it.desc ? keywordHit(it.desc, keyword) : false)) {
        hits.push({ platform: r.platform, label: r.label, rank: it.rank, title: it.title, url: it.url, hot: it.hot });
      }
    }
  }
  const byPlatform = new Map<string, OverlapHit[]>();
  for (const h of hits) {
    if (!byPlatform.has(h.platform)) byPlatform.set(h.platform, []);
    byPlatform.get(h.platform)!.push(h);
  }
  const resonanceScore = byPlatform.size * 20 + hits.length * 2;
  return {
    keyword,
    capturedAt: new Date().toISOString(),
    platformsHit: byPlatform.size,
    totalMentions: hits.length,
    resonanceScore,
    scoreNote: "自定义共振分 = 命中平台数×20 + 命中条目数×2，非平台官方指标",
    platforms: [...byPlatform.entries()].map(([p, list]) => ({
      platform: p,
      label: list[0].label,
      count: list.length,
      bestRank: list.reduce((m, x) => (x.rank == null ? m : Math.min(m, x.rank)), 999),
      items: list.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 5),
    })),
    checkedPlatforms,
    interpretationHint: byPlatform.size >= 3 ? "多平台共振，具备全网话题潜力" : byPlatform.size === 2 ? "跨两处出现，建议观察是否扩散" : "仅单点出现，尚非全网热点",
  };
}

export interface Cluster {
  topic: string;
  platforms: string[];
  platformCount: number;
  resonanceScore: number;
  members: { platform: string; label: string; title: string; rank: number | null; url: string | null }[];
}

/** 自动发现跨平台共振话题（标题相似度聚类） */
export async function discoverClusters(platforms?: string[], minPlatforms = 2, limit = 20): Promise<{ clusters: Cluster[]; note: string }> {
  const anchorPlatforms = ["xiaohongshu", "weibo", "zhihu", "baidu", "toutiao", "thepaper", "qq-news", "bilibili", "douyin", "36kr", "ithome"];
  const results: HotResult[] = await getMany(platforms?.length ? platforms : anchorPlatforms, limit);
  const ok = results.filter((r) => r.dataQuality === "ok");

  // 以每个条目中位数较短的标题为锚，聚合跨平台相似标题
  const clusters: Cluster[] = [];
  const used = new Set<string>();
  for (const r of ok) {
    for (const it of r.items.slice(0, limit)) {
      const key = `${r.platform}::${normalize(it.title)}`;
      if (used.has(key)) continue;
      const members: Cluster["members"] = [{ platform: r.platform, label: r.label, title: it.title, rank: it.rank, url: it.url }];
      const memberKeys = [key];
      for (const r2 of ok) {
        if (r2.platform === r.platform) continue;
        for (const it2 of r2.items.slice(0, limit)) {
          if (isSameTopic(it.title, it2.title)) {
            const k2 = `${r2.platform}::${normalize(it2.title)}`;
            if (!memberKeys.includes(k2)) {
              members.push({ platform: r2.platform, label: r2.label, title: it2.title, rank: it2.rank, url: it2.url });
              memberKeys.push(k2);
            }
          }
        }
      }
      memberKeys.forEach((k) => used.add(k));
      const plats = [...new Set(members.map((m) => m.platform))];
      if (plats.length >= minPlatforms) {
        clusters.push({
          topic: it.title,
          platforms: plats,
          platformCount: plats.length,
          resonanceScore: plats.length * 20 + members.length * 2,
          members,
        });
      }
    }
  }
  clusters.sort((a, b) => b.resonanceScore - a.resonanceScore);
  return {
    clusters: clusters.slice(0, 30),
    note: "基于标题相似度的规则聚类，可能合并/遗漏近义话题，主题归纳请由调用方大模型复核",
  };
}
