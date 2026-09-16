/**
 * 数据源统一调度：自研核心源(优先) + dailyhot-api(MIT, 国内长尾) + 国际源。
 * 对调用方只暴露 getHot / listPlatforms / getByCategory，屏蔽来源差异。
 */
import type { HotResult } from "../util/schema.js";
import { DOMESTIC_PLATFORMS, fetchDomestic } from "./domestic.js";
import { INTERNATIONAL, fetchInternational } from "./international.js";
import { fetchWeibo, fetchZhihu, fetchBaidu } from "./overrides.js";
import {
  fetchXiaohongshu,
  fetchXiaohongshuHotlist,
  XHS_PLATFORM,
  XHS_HOTLIST_PLATFORM,
  XHS_LABEL,
  XHS_HOTLIST_LABEL,
  XHS_CATEGORY,
} from "./xiaohongshu.js";

export interface PlatformInfo {
  platform: string;
  label: string;
  category: string;
  source: "self" | "dailyhot" | "self-intl";
}

const OVERRIDES: Record<string, (limit: number) => Promise<HotResult>> = {
  [XHS_PLATFORM]: fetchXiaohongshu,
  [XHS_HOTLIST_PLATFORM]: fetchXiaohongshuHotlist,
  weibo: fetchWeibo,
  zhihu: fetchZhihu,
  baidu: fetchBaidu,
};

/** 国内核心 + 长尾平台（小红书置顶，其后 dailyhot name） */
export const PLATFORMS: PlatformInfo[] = [
  { platform: XHS_PLATFORM, label: XHS_LABEL, category: XHS_CATEGORY, source: "self" },
  { platform: XHS_HOTLIST_PLATFORM, label: XHS_HOTLIST_LABEL, category: XHS_CATEGORY, source: "self" },
  ...DOMESTIC_PLATFORMS.map((p) => ({
    platform: p.name,
    label: p.label,
    category: p.category,
    source: (p.name in OVERRIDES ? "self" : "dailyhot") as PlatformInfo["source"],
  })),
  ...INTERNATIONAL.map((s) => ({ platform: s.platform, label: s.label, category: s.category, source: "self-intl" as const })),
  { platform: "github-trending-weekly", label: "GitHub Trending (weekly)", category: "dev", source: "self-intl" },
  { platform: "github-trending-monthly", label: "GitHub Trending (monthly)", category: "dev", source: "self-intl" },
];

export function listPlatforms(): PlatformInfo[] {
  return PLATFORMS;
}

function isInternational(platform: string): boolean {
  return (
    platform === "hackernews" ||
    platform === "producthunt" ||
    platform === "github-trending" ||
    platform.startsWith("github-trending-") ||
    platform.startsWith("reddit") ||
    platform.startsWith("reddit:")
  );
}

/** 拉取单个平台热榜（自动选择最优源 + 兜底） */
export async function getHot(platform: string, limit = 50): Promise<HotResult> {
  // 1) 自研核心源优先，失败回退 dailyhot
  const ov = OVERRIDES[platform];
  if (ov) {
    const r = await ov(limit);
    if (r.dataQuality === "ok") return r;
    // 仅当聚合源确实支持该平台时才回退（小红书为纯自研源，聚合源无此平台，不做无效回退）
    const aggregatorHas = DOMESTIC_PLATFORMS.some((p) => p.name === platform);
    if (aggregatorHas) {
      const fb = await fetchDomestic(platform, limit);
      if (fb.dataQuality === "ok") {
        fb.note = `自研源不可用，已回退聚合源。${r.note ?? ""}`.trim();
        return fb;
      }
      // 两个都失败，返回自研的（带原因），并附回退原因
      r.note = `${r.note ?? ""}；聚合源也不可用：${fb.note ?? ""}`.replace(/^；/, "");
    }
    return r;
  }
  // 2) 国际源
  if (isInternational(platform)) {
    return fetchInternational(platform, platform.startsWith("reddit") ? 25 : Math.min(limit, 30));
  }
  // 3) dailyhot 国内长尾
  return fetchDomestic(platform, limit);
}

export async function getMany(platforms: string[], limit = 30): Promise<HotResult[]> {
  const out: HotResult[] = [];
  const BATCH = 6;
  for (let i = 0; i < platforms.length; i += BATCH) {
    const chunk = await Promise.all(
      platforms.slice(i, i + BATCH).map((p) => getHot(p, limit).catch((e) => ({
        platform: p, label: p, category: "unknown", capturedAt: new Date().toISOString(),
        sourceUpdatedAt: null, dataQuality: "missing" as const, items: [], note: e.message,
      })))
    );
    out.push(...chunk);
  }
  return out;
}

const CATEGORY_DEFAULT: Record<string, string[]> = {
  social: ["xiaohongshu", "weibo", "zhihu", "baidu", "tieba", "hupu"],
  video: ["bilibili", "douyin", "kuaishou"],
  news: ["toutiao", "thepaper", "qq-news", "netease-news", "sina-news"],
  tech: ["36kr", "ithome", "huxiu", "sspai", "ifanr", "hackernews", "producthunt"],
  dev: ["juejin", "csdn", "v2ex", "hellogithub", "github-trending", "reddit-programming"],
  ai: ["ithome", "juejin", "hackernews", "reddit-MachineLearning"],
  global: ["hackernews", "github-trending", "producthunt", "reddit-technology", "reddit-worldnews"],
};

export async function getByCategory(category: string, limit = 25): Promise<HotResult[]> {
  const names = CATEGORY_DEFAULT[category];
  if (!names) return [];
  return getMany(names, limit);
}

export function categories(): string[] {
  return Object.keys(CATEGORY_DEFAULT);
}
