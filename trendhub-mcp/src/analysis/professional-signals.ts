/**
 * Evidence-bound Professional Intelligence signal pack.
 *
 * This module deliberately works with observations that already exist in the
 * local history store. It never turns missing source families into zeroes and
 * never presents ordering between families as proof of causality.
 */
import { keywordHit, normalize } from "./text.js";
import { mean, median, round } from "./statistics.js";
import { readHistory, type HistoryItem } from "../store/history.js";
import { getSourceReliability } from "../store/reliability.js";
import { brandEntityCatalog, entityQueryTerms, type BrandEntity } from "../entities/brand-catalog.js";
import { sourceSpec, type SignalFamily, type SourceRegion } from "../sources/professional-catalog.js";

type EvidenceRef = { platform: string; capturedAt: string; itemKey: string };

interface Observation extends EvidenceRef {
  family: SignalFamily;
  region: SourceRegion | "UNKNOWN";
  title: string;
  url: string | null;
  rank: number | null;
  hot: number | null;
  author: string | null;
}

export interface ProfessionalSignalPack {
  methodologyVersion: "professional-signals-v1";
  sourceSignals: Array<{
    platform: string;
    family: SignalFamily;
    region: SourceRegion | "UNKNOWN";
    observations: number;
    totalItems: number;
    mentionRate: number | null;
    normalizedAttention: number | null;
    shareOfVoice: number | null;
    reliabilityScore: number | null;
    evidenceRefs: EvidenceRef[];
  }>;
  crossSignalConfirmation: {
    score: number | null;
    status: "confirmed" | "partial" | "insufficient_evidence";
    familiesObserved: SignalFamily[];
    weightedFamilies: number;
    evidenceRefs: EvidenceRef[];
  };
  firstSeen: {
    firstSeenAt: string | null;
    firstConfirmedAt: string | null;
    firstCrossFamilyAt: string | null;
    byFamily: Array<{ family: SignalFamily; firstSeenAt: string; evidenceRef: EvidenceRef }>;
  };
  novelty: {
    status: "new" | "recurring" | "insufficient_evidence";
    recurrenceCount: number;
    recurrenceRate: number | null;
    firstSeenAgeHours: number | null;
    explanation: string;
  };
  seasonality: {
    status: "available" | "insufficient_evidence";
    baselinePoints: number;
    recentIndex: number | null;
    matchedBaselineIndex: number | null;
    explanation: string;
  };
  news: {
    status: "available" | "insufficient_evidence";
    rawMentions: number;
    canonicalClusters: number;
    duplicateSuppressed: number;
    publisherDomains: string[];
    evidenceRefs: EvidenceRef[];
  };
  leadLag: Array<{
    from: SignalFamily;
    to: SignalFamily;
    lagHours: number | null;
    status: "observed_ordering" | "insufficient_evidence";
    evidenceRefs: EvidenceRef[];
  }>;
  spread: {
    nodes: Array<{ id: string; type: "platform" | "family"; observedAt: string }>;
    edges: Array<{ from: string; to: string; lagHours: number; evidenceRefs: EvidenceRef[] }>;
    note: string;
  };
  metaTrends: Array<{
    label: string;
    memberCount: number;
    evidenceRefs: EvidenceRef[];
  }>;
  volatility: {
    status: "available" | "insufficient_evidence";
    observations: number;
    meanSignal: number | null;
    standardDeviation: number | null;
    coefficientOfVariation: number | null;
    stability: "stable" | "volatile" | "insufficient_evidence";
  };
  forecastCalibration: {
    status: "insufficient_evidence" | "available";
    backtestSamples: number;
    latestGrade: "insufficient" | "strong" | "usable" | "weak";
    mae: number | null;
    normalizedMae: number | null;
    note: string;
  };
  brand: {
    matched: boolean;
    entityId: string | null;
    sovByFamily: Array<{ family: SignalFamily; share: number; observations: number; evidenceRefs: EvidenceRef[] }>;
    competitorAssociations: Array<{ entityId: string; coMentions: number; evidenceRefs: EvidenceRef[] }>;
    campaignAssociations: Array<{ label: string; mentions: number; evidenceRefs: EvidenceRef[] }>;
    creatorSpread: { creators: number; platforms: number; concentration: "concentrated" | "distributed" | "insufficient" };
    searchSocialDivergence: number | null;
    editorialConfirmationLift: number | null;
    riskOpportunityState: { risk: string[]; opportunity: string[] };
  };
  scoreExplanations: Array<{
    score: string;
    value: number | null;
    inputs: string[];
    transformation: string;
    missingData: string[];
    confidence: "low" | "medium" | "high";
    evidenceRefs: EvidenceRef[];
  }>;
  caveats: string[];
}

const MAX_LOOKBACK_HOURS = 24 * 730;
const MAX_REFS = 24;
const FAMILY_FALLBACK: SignalFamily = "community-discussion";

function clamp(value: number, min = 0, max = 1): number { return Math.max(min, Math.min(max, value)); }
function ageHours(at: string, now: Date): number | null {
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? Math.max(0, (now.getTime() - ms) / 3_600_000) : null;
}
function keyFor(platform: string, item: HistoryItem): string {
  return item.externalId ?? item.url ?? `${platform}:${normalize(item.title)}`;
}
function sourceFamily(platform: string): { family: SignalFamily; region: SourceRegion | "UNKNOWN" } {
  const source = sourceSpec(platform);
  return { family: source?.families[0] ?? FAMILY_FALLBACK, region: source?.region ?? "UNKNOWN" };
}
function refs(rows: Observation[]): EvidenceRef[] {
  return rows.slice(0, MAX_REFS).map(({ platform, capturedAt, itemKey }) => ({ platform, capturedAt, itemKey }));
}
function canonicalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|spm$|from$)/i.test(key)) parsed.searchParams.delete(key);
    }
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname.replace(/\/+$/, "")}${parsed.search ? parsed.search : ""}`.toLowerCase();
  } catch { return url.trim().toLowerCase(); }
}
function titleKey(title: string): string {
  return normalize(title).replace(/[^\p{L}\p{N}]+/gu, "");
}
function domainOf(url: string | null): string | null {
  try { return url ? new URL(url).hostname.toLowerCase() : null; } catch { return null; }
}
function sampleTokens(title: string, keyword: string): string[] {
  const stop = new Set(["the", "and", "for", "with", "official", "new", "video", "今天", "这个", "那个", "官方", "最新"]);
  const q = normalize(keyword);
  const raw = [
    ...(title.match(/#[^#\s，。！？、；;:：]{2,24}/g) ?? []),
    ...(title.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]{2,24}/g) ?? []),
    ...(title.match(/[\u4e00-\u9fff]{2,8}/g) ?? []),
  ];
  return [...new Set(raw.map((x) => x.trim()).filter((x) => x && !stop.has(x.toLowerCase()) && normalize(x) !== q))];
}
function scoreFor(item: HistoryItem, sourceItems: HistoryItem[]): number {
  const ranked = sourceItems.map((x) => x.rank).filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0);
  const maxRank = Math.max(50, ...(ranked.length ? ranked : [50]));
  const rankScore = item.rank == null ? 0.5 : clamp(1 - (item.rank - 1) / maxRank);
  const hots = sourceItems.map((x) => x.hot).filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0);
  const maxHot = Math.max(...hots, 0);
  const hotScore = item.hot != null && maxHot > 0 ? clamp(item.hot / maxHot) : 0.5;
  return 0.65 * rankScore + 0.35 * hotScore;
}
function stddev(values: number[]): number | null {
  const avg = mean(values);
  if (avg == null) return null;
  return Math.sqrt(mean(values.map((x) => (x - avg) ** 2)) ?? 0);
}

function collect(keywords: string[], platforms: string[], now: Date): { observations: Observation[]; totalByPlatform: Map<string, number>; points: Map<string, Map<string, number>> } {
  const observations: Observation[] = [];
  const totalByPlatform = new Map<string, number>();
  const points = new Map<string, Map<string, number>>();
  for (const platform of platforms) {
    const history = readHistory(platform, MAX_LOOKBACK_HOURS, now);
    const sourcePoints = new Map<string, number>();
    for (const point of history) {
      if (point.dataQuality === "missing") continue;
      const matched = point.items.filter((item) => keywords.some((keyword) => keywordHit(item.title, keyword)));
      totalByPlatform.set(platform, (totalByPlatform.get(platform) ?? 0) + point.items.length);
      if (matched.length) sourcePoints.set(point.capturedAt, matched.reduce((best, item) => Math.max(best, scoreFor(item, point.items)), 0));
      const source = sourceFamily(platform);
      for (const item of matched) observations.push({
        platform,
        capturedAt: point.capturedAt,
        itemKey: keyFor(platform, item),
        family: source.family,
        region: source.region,
        title: item.title,
        url: item.url,
        rank: item.rank,
        hot: item.hot,
        author: item.author ?? null,
      });
    }
    points.set(platform, sourcePoints);
  }
  observations.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  return { observations, totalByPlatform, points };
}

function buildBrand(keyword: string, observations: Observation[], entity: BrandEntity | null, sourceSignals: ProfessionalSignalPack["sourceSignals"]): ProfessionalSignalPack["brand"] {
  const matched = Boolean(entity);
  const byFamily = new Map<SignalFamily, Observation[]>();
  for (const row of observations) byFamily.set(row.family, [...(byFamily.get(row.family) ?? []), row]);
  const total = observations.length;
  const sovByFamily = [...byFamily.entries()].map(([family, rows]) => ({ family, share: total ? round(rows.length / total) : 0, observations: rows.length, evidenceRefs: refs(rows) })).sort((a, b) => b.observations - a.observations);
  const competitors = new Map<string, Observation[]>();
  const entities = brandEntityCatalog("P1").filter((x) => x.id !== entity?.id);
  for (const row of observations) {
    for (const candidate of entities) {
      const terms = [candidate.name, ...candidate.aliases];
      if (terms.some((term) => keywordHit(row.title, term))) competitors.set(candidate.id, [...(competitors.get(candidate.id) ?? []), row]);
    }
  }
  const competitorAssociations = [...competitors.entries()].map(([entityId, rows]) => ({ entityId, coMentions: rows.length, evidenceRefs: refs(rows) })).sort((a, b) => b.coMentions - a.coMentions).slice(0, 10);
  const campaigns = new Map<string, Observation[]>();
  for (const row of observations) for (const token of sampleTokens(row.title, keyword).filter((x) => x.startsWith("#"))) campaigns.set(token, [...(campaigns.get(token) ?? []), row]);
  const campaignAssociations = [...campaigns.entries()].map(([label, rows]) => ({ label, mentions: rows.length, evidenceRefs: refs(rows) })).sort((a, b) => b.mentions - a.mentions).slice(0, 10);
  const creators = new Map<string, Set<string>>();
  for (const row of observations) if (row.author) creators.set(row.author, new Set([...(creators.get(row.author) ?? []), row.platform]));
  const creatorPlatforms = new Set([...creators.values()].flatMap((x) => [...x])).size;
  const creatorCount = creators.size;
  const search = byFamily.get("search-intent")?.length ?? 0;
  const social = (byFamily.get("social-attention")?.length ?? 0) + (byFamily.get("short-video")?.length ?? 0) + (byFamily.get("community-discussion")?.length ?? 0);
  const searchSocialDivergence = search && social ? round(Math.abs(search / total - social / total)) : null;
  const editorial = byFamily.get("news-authority")?.length ?? 0;
  const editorialConfirmationLift = editorial && total ? round(editorial / total) : null;
  return {
    matched,
    entityId: entity?.id ?? null,
    sovByFamily,
    competitorAssociations,
    campaignAssociations,
    creatorSpread: { creators: creatorCount, platforms: creatorPlatforms, concentration: creatorCount < 3 ? "insufficient" : creatorPlatforms <= 2 ? "concentrated" : "distributed" },
    searchSocialDivergence,
    editorialConfirmationLift,
    riskOpportunityState: {
      risk: editorial ? ["editorial_confirmation_present"] : [],
      opportunity: social > 0 && creatorPlatforms >= 2 ? ["distributed_creator_spread"] : [],
    },
  };
}

export function buildProfessionalSignalPack(keyword: string, platforms: string[], entity: BrandEntity | null, now = new Date(), forecastValidation?: { grade: "insufficient" | "strong" | "usable" | "weak"; mae: number | null; normalizedMae: number | null }): ProfessionalSignalPack {
  const { observations, totalByPlatform, points } = collect(entity ? entityQueryTerms(keyword) : [keyword], platforms, now);
  const grouped = new Map<string, Observation[]>();
  for (const row of observations) grouped.set(row.platform, [...(grouped.get(row.platform) ?? []), row]);
  const totalMatches = observations.length;
  const sourceSignals = platforms.map((platform) => {
    const rows = grouped.get(platform) ?? [];
    const first = rows[0];
    const family = sourceFamily(platform);
    const sourceItems = rows.map((row) => ({ rank: row.rank, hot: row.hot, title: row.title } as HistoryItem));
    const normalizedAttention = rows.length ? Math.round((mean(rows.map((row) => scoreFor(row, sourceItems))) ?? 0) * 100) : null;
    const totalItems = totalByPlatform.get(platform) ?? 0;
    const rel = getSourceReliability(platform, now);
    return { platform, family: family.family, region: family.region, observations: rows.length, totalItems, mentionRate: totalItems ? round(rows.length / totalItems) : null, normalizedAttention, shareOfVoice: totalMatches ? round(rows.length / totalMatches) : null, reliabilityScore: rel.score, evidenceRefs: first ? refs(rows) : [] };
  });
  const familyRows = new Map<SignalFamily, Observation[]>();
  for (const row of observations) familyRows.set(row.family, [...(familyRows.get(row.family) ?? []), row]);
  const familiesObserved = [...familyRows.keys()].sort();
  const weightedFamilies = [...familyRows.entries()].reduce((sum, [, rows]) => sum + (getSourceReliability(rows[0]!.platform, now).score ?? 50) / 100, 0);
  const confirmationScore = familiesObserved.length ? Math.round(clamp(weightedFamilies / Math.max(3, familiesObserved.length + 1)) * 100) : null;

  const firstSeenAt = observations[0]?.capturedAt ?? null;
  const byFamily = [...familyRows.entries()].map(([family, rows]) => ({ family, firstSeenAt: rows[0]!.capturedAt, evidenceRef: refs(rows)[0]! })).sort((a, b) => Date.parse(a.firstSeenAt) - Date.parse(b.firstSeenAt));
  const firstConfirmed = observations.length >= 2 ? observations[1]?.capturedAt ?? null : null;
  const firstCrossFamilyAt = byFamily.length >= 2 ? byFamily[1]!.firstSeenAt : null;
  const recurrenceCount = observations.length;
  const recurrenceRate = totalMatches ? round(new Set(observations.map((x) => `${x.platform}|${x.capturedAt}`)).size / totalMatches) : null;
  const age = firstSeenAt ? ageHours(firstSeenAt, now) : null;
  const noveltyStatus: ProfessionalSignalPack["novelty"]["status"] = !observations.length ? "insufficient_evidence" : recurrenceCount <= 2 && (age ?? 999) <= 72 ? "new" : "recurring";

  const dayHour = (at: string) => { const date = new Date(at); return `${date.getUTCDay()}-${date.getUTCHours()}`; };
  const pointCounts = [...points.values()].flatMap((source) => [...source.entries()].map(([at, value]) => ({ at, value })));
  const recent = pointCounts.filter((x) => ageHours(x.at, now) != null && ageHours(x.at, now)! <= 24);
  const matchedBaseline = pointCounts.filter((x) => { const d = new Date(x.at); return !recent.some((r) => r.at === x.at) && dayHour(x.at) === dayHour(recent[0]?.at ?? x.at); });
  const recentIndex = recent.length ? round((mean(recent.map((x) => x.value)) ?? 0) * 100) : null;
  const baselineIndex = matchedBaseline.length ? round((mean(matchedBaseline.map((x) => x.value)) ?? 0) * 100) : null;
  const seasonalityAvailable = pointCounts.length >= 14;

  const newsRows = observations.filter((x) => x.family === "news-authority" || x.family === "web-domain");
  const canonical = new Map<string, Observation[]>();
  for (const row of newsRows) { const key = canonicalUrl(row.url) ?? titleKey(row.title); canonical.set(key, [...(canonical.get(key) ?? []), row]); }
  const publisherDomains = [...new Set(newsRows.map((x) => domainOf(x.url)).filter((x): x is string => Boolean(x)))].sort();
  const lagFamilies: SignalFamily[] = ["search-intent", "social-attention", "short-video", "community-discussion", "podcast-audio", "news-authority"];
  const firstFamily = new Map(lagFamilies.map((family) => [family, familyRows.get(family)?.[0] ?? null]));
  const leadLag: ProfessionalSignalPack["leadLag"] = [];
  for (const from of lagFamilies) for (const to of lagFamilies) {
    if (from === to) continue;
    const a = firstFamily.get(from); const b = firstFamily.get(to);
    const lagHours = a && b ? round((Date.parse(b.capturedAt) - Date.parse(a.capturedAt)) / 3_600_000, 2) : null;
    leadLag.push({ from, to, lagHours: lagHours != null && lagHours >= 0 ? lagHours : null, status: lagHours != null && lagHours >= 0 ? "observed_ordering" : "insufficient_evidence", evidenceRefs: a && b ? refs([a, b]) : [] });
  }
  const spreadRows = [...new Map(observations.map((x) => [`${x.platform}|${x.family}`, x])).values()].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  const spreadEdges: ProfessionalSignalPack["spread"]["edges"] = [];
  for (let i = 0; i < spreadRows.length; i++) for (let j = i + 1; j < spreadRows.length; j++) {
    const lag = (Date.parse(spreadRows[j]!.capturedAt) - Date.parse(spreadRows[i]!.capturedAt)) / 3_600_000;
    if (lag >= 0 && lag <= 72 && spreadRows[i]!.platform !== spreadRows[j]!.platform) spreadEdges.push({ from: spreadRows[i]!.platform, to: spreadRows[j]!.platform, lagHours: round(lag, 2), evidenceRefs: refs([spreadRows[i]!, spreadRows[j]!]) });
  }
  const meta = new Map<string, Observation[]>();
  for (const row of observations) for (const token of sampleTokens(row.title, keyword)) meta.set(token, [...(meta.get(token) ?? []), row]);
  const metaTrends = [...meta.entries()].filter(([, rows]) => rows.length >= 2).map(([label, rows]) => ({ label, memberCount: rows.length, evidenceRefs: refs(rows) })).sort((a, b) => b.memberCount - a.memberCount || a.label.localeCompare(b.label)).slice(0, 12);
  const series = pointCounts.map((x) => x.value);
  const seriesMean = mean(series);
  const deviation = stddev(series);
  const cv = seriesMean && deviation != null ? round(deviation / seriesMean) : null;
  const sourceSignalsForBrand = sourceSignals;
  const brand = buildBrand(keyword, observations, entity, sourceSignalsForBrand);
  const scoreExplanations: ProfessionalSignalPack["scoreExplanations"] = [
    { score: "crossSignalConfirmation", value: confirmationScore, inputs: [`${familiesObserved.length} observed signal families`, `reliability-weighted family evidence=${round(weightedFamilies)}`], transformation: "Weighted family count divided by max(3, family count + 1), clamped to 0–100.", missingData: familiesObserved.length < 2 ? ["A second independent signal family is missing."] : [], confidence: familiesObserved.length >= 3 ? "high" : familiesObserved.length >= 2 ? "medium" : "low", evidenceRefs: refs(observations) },
    { score: "searchSocialDivergence", value: brand.searchSocialDivergence, inputs: ["search-intent share", "social/community/short-video share"], transformation: "Absolute difference between observed family shares; no demand or reach inference.", missingData: brand.searchSocialDivergence == null ? ["Both search and social evidence are required."] : [], confidence: brand.searchSocialDivergence == null ? "low" : "medium", evidenceRefs: refs(observations) },
    { score: "volatility", value: cv == null ? null : Math.round(cv * 100), inputs: [`${series.length} normalized point signals`], transformation: "Coefficient of variation = standard deviation / mean; source-local normalized evidence only.", missingData: series.length < 6 ? ["At least six time points are required."] : [], confidence: series.length >= 14 ? "high" : series.length >= 6 ? "medium" : "low", evidenceRefs: refs(observations) },
  ];
  return {
    methodologyVersion: "professional-signals-v1",
    sourceSignals,
    crossSignalConfirmation: { score: confirmationScore, status: familiesObserved.length >= 3 ? "confirmed" : familiesObserved.length >= 2 ? "partial" : "insufficient_evidence", familiesObserved, weightedFamilies: round(weightedFamilies), evidenceRefs: refs(observations) },
    firstSeen: { firstSeenAt, firstConfirmedAt: firstConfirmed, firstCrossFamilyAt, byFamily },
    novelty: { status: noveltyStatus, recurrenceCount, recurrenceRate, firstSeenAgeHours: age == null ? null : round(age, 2), explanation: noveltyStatus === "new" ? "首次或低频出现且在最近 72 小时内；不是对未来流行的保证。" : noveltyStatus === "recurring" ? "历史中出现过多次，需结合 seasonality 判断是否为周期性复现。" : "没有足够的匹配证据判断新颖性。" },
    seasonality: { status: seasonalityAvailable ? "available" : "insufficient_evidence", baselinePoints: pointCounts.length, recentIndex: seasonalityAvailable ? recentIndex : null, matchedBaselineIndex: seasonalityAvailable ? baselineIndex : null, explanation: seasonalityAvailable ? "按历史时间点的 UTC 星期-小时组合构造可重复基线；不是因果解释。" : "历史时间点不足，seasonality 保持 insufficient_evidence。" },
    news: { status: newsRows.length ? "available" : "insufficient_evidence", rawMentions: newsRows.length, canonicalClusters: canonical.size, duplicateSuppressed: Math.max(0, newsRows.length - canonical.size), publisherDomains, evidenceRefs: refs(newsRows) },
    leadLag,
    spread: { nodes: spreadRows.map((x) => ({ id: x.platform, type: "platform", observedAt: x.capturedAt })), edges: spreadEdges.slice(0, 100), note: "传播图只表达已观测 source/platform 时间顺序，不表达用户级传播链或因果关系。" },
    metaTrends,
    volatility: { status: series.length >= 6 ? "available" : "insufficient_evidence", observations: series.length, meanSignal: seriesMean == null ? null : round(seriesMean * 100), standardDeviation: deviation == null ? null : round(deviation * 100), coefficientOfVariation: cv, stability: series.length < 6 ? "insufficient_evidence" : (cv ?? 0) >= 0.5 ? "volatile" : "stable" },
    forecastCalibration: forecastValidation ? { status: forecastValidation.grade === "insufficient" ? "insufficient_evidence" : "available", backtestSamples: forecastValidation.grade === "insufficient" ? 0 : 1, latestGrade: forecastValidation.grade, mae: forecastValidation.mae, normalizedMae: forecastValidation.normalizedMae, note: "当前为单次 holdout/backtest 结果；长期真实预测准确率必须等待未来观测，不能由本地回测替代。" } : { status: "insufficient_evidence", backtestSamples: 0, latestGrade: "insufficient", mae: null, normalizedMae: null, note: "未提供预测回测结果。" },
    brand,
    scoreExplanations,
    caveats: [
      "所有数值只基于本地已捕获、公开或授权证据；缺失信号族不会被静默当作 0。",
      "跨来源指标先在来源内部归一化；不把不同平台原始热度、播放量、排名相加。",
      "lead-lag/spread 只表示观测顺序，不证明传播因果；news canonical cluster 只抑制重复计数，不恢复付费全文。",
      "forecast calibration 需要持续的未来真实观测；当前结果不等同于长期准确率。",
    ],
  };
}
