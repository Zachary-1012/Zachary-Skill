/**
 * Evidence-based audience / creator signals.
 *
 * TrendHub deliberately does NOT infer sensitive demographics from names,
 * avatars, language, images or behavior. Professional audience output is built
 * only from explicit public content/creator evidence that the source returned.
 */
import { keywordHit, normalize } from "./text.js";
import { readHistory } from "../store/history.js";

export interface AudienceSignals {
  methodologyVersion: "audience-signals-v1";
  keyword: string;
  generatedAt: string;
  scope: "public-content-proxy";
  evidence: {
    matchedItems: number;
    platformsWithEvidence: number;
    creatorsObserved: number;
    lookbackHours: number;
  };
  platformMix: Array<{ platform: string; mentions: number; share: number }>;
  creatorSignals: Array<{
    creator: string;
    mentions: number;
    platforms: string[];
    bestRank: number | null;
    latestSeenAt: string;
    sampleTitles: string[];
  }>;
  contentFormats: Array<{ kind: string; mentions: number; share: number }>;
  coTerms: Array<{ term: string; mentions: number }>;
  creatorConcentration: {
    top1Share: number | null;
    top5Share: number | null;
    interpretation: "insufficient" | "concentrated" | "mixed" | "distributed";
  };
  demographics: {
    status: "not_inferred";
    reason: string;
  };
  caveats: string[];
}

const STOP_LATIN = new Set([
  "the", "and", "for", "with", "from", "this", "that", "you", "your", "are", "was", "were", "have", "has",
  "into", "about", "after", "before", "how", "why", "what", "new", "video", "official",
]);
const STOP_CJK = new Set(["这个", "那个", "我们", "你们", "他们", "一个", "什么", "怎么", "为什么", "真的", "今天", "最新", "官方", "视频"]);

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function extractTerms(title: string, keyword: string): string[] {
  const terms = new Set<string>();
  const keywordNorm = normalize(keyword);

  for (const hashtag of title.matchAll(/#([^#\s，。！？、；;:：]{2,20})/g)) {
    const term = hashtag[1]?.trim();
    if (term && normalize(term) !== keywordNorm) terms.add(term);
  }
  for (const token of title.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]{2,24}/g) ?? []) {
    if (!STOP_LATIN.has(token) && normalize(token) !== keywordNorm) terms.add(token);
  }
  const cjkChunks = title.match(/[\u4e00-\u9fff]{2,10}/g) ?? [];
  for (const chunk of cjkChunks) {
    if (STOP_CJK.has(chunk) || normalize(chunk) === keywordNorm) continue;
    if (chunk.length <= 6) terms.add(chunk);
    else {
      for (let i = 0; i + 4 <= chunk.length; i += 2) {
        const term = chunk.slice(i, i + 4);
        if (!STOP_CJK.has(term) && !normalize(term).includes(keywordNorm)) terms.add(term);
      }
    }
  }
  return [...terms].slice(0, 12);
}

export function analyzeAudienceSignals(
  keyword: string,
  platforms: string[],
  now = new Date(),
  lookbackHours = 24 * 90,
): AudienceSignals {
  const platformCounts = new Map<string, number>();
  const formatCounts = new Map<string, number>();
  const termCounts = new Map<string, number>();
  const creators = new Map<string, {
    mentions: number;
    platforms: Set<string>;
    bestRank: number | null;
    latestSeenAt: string;
    sampleTitles: string[];
  }>();

  let matchedItems = 0;
  for (const platform of platforms) {
    for (const point of readHistory(platform, lookbackHours, now)) {
      if (point.dataQuality === "missing") continue;
      for (const item of point.items) {
        if (!keywordHit(item.title, keyword)) continue;
        matchedItems++;
        platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
        const kind = (item.kind ?? "unspecified").trim() || "unspecified";
        formatCounts.set(kind, (formatCounts.get(kind) ?? 0) + 1);
        for (const term of extractTerms(item.title, keyword)) termCounts.set(term, (termCounts.get(term) ?? 0) + 1);

        const creator = item.author?.trim();
        if (!creator) continue;
        let state = creators.get(creator);
        if (!state) {
          state = { mentions: 0, platforms: new Set(), bestRank: null, latestSeenAt: point.capturedAt, sampleTitles: [] };
          creators.set(creator, state);
        }
        state.mentions++;
        state.platforms.add(platform);
        if (item.rank != null && (state.bestRank == null || item.rank < state.bestRank)) state.bestRank = item.rank;
        if (Date.parse(point.capturedAt) > Date.parse(state.latestSeenAt)) state.latestSeenAt = point.capturedAt;
        if (state.sampleTitles.length < 3 && !state.sampleTitles.includes(item.title)) state.sampleTitles.push(item.title);
      }
    }
  }

  const platformMix = [...platformCounts.entries()]
    .map(([platform, mentions]) => ({ platform, mentions, share: matchedItems ? round(mentions / matchedItems) : 0 }))
    .sort((a, b) => b.mentions - a.mentions);
  const contentFormats = [...formatCounts.entries()]
    .map(([kind, mentions]) => ({ kind, mentions, share: matchedItems ? round(mentions / matchedItems) : 0 }))
    .sort((a, b) => b.mentions - a.mentions);
  const coTerms = [...termCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([term, mentions]) => ({ term, mentions }))
    .sort((a, b) => b.mentions - a.mentions || a.term.localeCompare(b.term))
    .slice(0, 30);
  const creatorSignals = [...creators.entries()]
    .map(([creator, state]) => ({
      creator,
      mentions: state.mentions,
      platforms: [...state.platforms].sort(),
      bestRank: state.bestRank,
      latestSeenAt: state.latestSeenAt,
      sampleTitles: state.sampleTitles,
    }))
    .sort((a, b) => b.mentions - a.mentions || (a.bestRank ?? 999) - (b.bestRank ?? 999))
    .slice(0, 30);

  const creatorMentions = [...creators.values()].map((x) => x.mentions).sort((a, b) => b - a);
  const creatorTotal = creatorMentions.reduce((sum, x) => sum + x, 0);
  const top1Share = creatorTotal ? creatorMentions[0]! / creatorTotal : null;
  const top5Share = creatorTotal ? creatorMentions.slice(0, 5).reduce((sum, x) => sum + x, 0) / creatorTotal : null;
  const interpretation: AudienceSignals["creatorConcentration"]["interpretation"] = creatorTotal < 5
    ? "insufficient"
    : (top1Share ?? 0) >= 0.45
      ? "concentrated"
      : (top5Share ?? 0) >= 0.7
        ? "mixed"
        : "distributed";

  return {
    methodologyVersion: "audience-signals-v1",
    keyword,
    generatedAt: now.toISOString(),
    scope: "public-content-proxy",
    evidence: {
      matchedItems,
      platformsWithEvidence: platformCounts.size,
      creatorsObserved: creators.size,
      lookbackHours,
    },
    platformMix,
    creatorSignals,
    contentFormats,
    coTerms,
    creatorConcentration: {
      top1Share: top1Share == null ? null : round(top1Share),
      top5Share: top5Share == null ? null : round(top5Share),
      interpretation,
    },
    demographics: {
      status: "not_inferred",
      reason: "TrendHub does not infer age, gender, ethnicity, religion, health, political views or other sensitive attributes from public content. Licensed panels or explicit first-party demographic data are required for defensible demographic analysis.",
    },
    caveats: [
      "Audience output is a public-content/creator proxy, not a population-representative demographic panel.",
      "Creator counts can include repeated appearances across snapshots; use them as attention/concentration signals rather than unique-person reach.",
      "Missing author or content-format fields remain missing and are not inferred.",
    ],
  };
}
