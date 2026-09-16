/**
 * Trend Intelligence Engine v1.
 * Deterministic lifecycle/velocity/persistence/diffusion/confidence metrics built from local evidence history.
 * It does not ask an LLM to invent stages or probabilities; insufficient/stale evidence stays explicit.
 */
import { keywordHit } from "./text.js";
import { readHistory, type HistoryPoint } from "../store/history.js";
import { getSourceReliability, type SourceReliability } from "../store/reliability.js";

export type TrendLifecycle = "insufficient_history" | "emerging" | "accelerating" | "mainstream" | "saturating" | "declining";

const CURRENT_EVIDENCE_MAX_AGE_HOURS = 12;

export interface PlatformTrajectory {
  platform: string;
  historySamples: number;
  matchedSamples: number;
  observableNow: boolean;
  current: boolean;
  sourceStatus: SourceReliability["status"];
  latestEvidenceAt: string | null;
  latestEvidenceAgeHours: number | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  persistence: number | null;
  firstRank: number | null;
  latestRank: number | null;
  bestRank: number | null;
  rankVelocityPerHour: number | null;
  reliabilityScore: number | null;
}

export interface TrendIntelligence {
  methodologyVersion: "trend-intelligence-v1";
  keyword: string;
  generatedAt: string;
  lifecycle: TrendLifecycle;
  confidence: number;
  confidenceBand: "low" | "medium" | "high";
  evidence: {
    platformsRequested: number;
    platformsWithHistory: number;
    platformsObservableNow: number;
    platformsUnavailableOrStale: number;
    platformsEverSeen: number;
    platformsCurrent: number;
    totalHistorySamples: number;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    ageHours: number | null;
  };
  metrics: {
    velocityScore: number | null;
    averageRankVelocityPerHour: number | null;
    spreadVelocityPlatformsPerHour: number | null;
    persistenceScore: number | null;
    diffusionScore: number | null;
    sourceReliabilityScore: number | null;
    historySufficiencyScore: number;
  };
  trajectories: PlatformTrajectory[];
  caveats: string[];
}

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}
function round(v: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
function hoursBetween(a: string, b: string): number {
  return Math.max(0, (Date.parse(b) - Date.parse(a)) / 3_600_000);
}
function hitInPoint(point: HistoryPoint, keyword: string) {
  const items = point.items.filter((x) => keywordHit(x.title, keyword));
  if (!items.length) return null;
  const ranked = items.filter((x) => x.rank != null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return ranked[0] ?? items[0];
}

function trajectory(platform: string, keyword: string, now: Date): PlatformTrajectory {
  const history = readHistory(platform, 168, now);
  const matched = history
    .map((point) => ({ point, item: hitInPoint(point, keyword) }))
    .filter((x) => x.item !== null) as Array<{ point: HistoryPoint; item: NonNullable<ReturnType<typeof hitInPoint>> }>;
  const first = matched[0] ?? null;
  const last = matched.at(-1) ?? null;
  const latestPoint = history.at(-1) ?? null;
  const latestEvidenceAgeHours = latestPoint ? round(hoursBetween(latestPoint.capturedAt, now.toISOString()), 2) : null;
  const rel = getSourceReliability(platform, now);
  const sourceUsableNow = rel.status === "UP" || rel.status === "DEGRADED";
  const evidenceFresh = latestEvidenceAgeHours != null && latestEvidenceAgeHours <= CURRENT_EVIDENCE_MAX_AGE_HOURS;
  const observableNow = sourceUsableNow && evidenceFresh;
  const latestHit = observableNow && latestPoint ? hitInPoint(latestPoint, keyword) : null;
  const ranks = matched.map((x) => x.item.rank).filter((x): x is number => x != null);
  let rankVelocityPerHour: number | null = null;
  if (first && last && first !== last && first.item.rank != null && last.item.rank != null) {
    const h = hoursBetween(first.point.capturedAt, last.point.capturedAt);
    if (h >= 0.25) rankVelocityPerHour = round((first.item.rank - last.item.rank) / h);
  }
  return {
    platform,
    historySamples: history.length,
    matchedSamples: matched.length,
    observableNow,
    current: latestHit !== null,
    sourceStatus: rel.status,
    latestEvidenceAt: latestPoint?.capturedAt ?? null,
    latestEvidenceAgeHours,
    firstSeenAt: first?.point.capturedAt ?? null,
    lastSeenAt: last?.point.capturedAt ?? null,
    persistence: history.length ? round(matched.length / history.length) : null,
    firstRank: first?.item.rank ?? null,
    latestRank: latestHit?.rank ?? null,
    bestRank: ranks.length ? Math.min(...ranks) : null,
    rankVelocityPerHour,
    reliabilityScore: rel.score,
  };
}

function classifyLifecycle(input: {
  totalHistorySamples: number;
  firstSeenAt: string | null;
  observablePlatforms: number;
  currentPlatforms: number;
  observableEverPlatforms: number;
  persistence: number;
  avgRankVelocity: number | null;
  spreadVelocity: number | null;
  now: Date;
}): TrendLifecycle {
  if (input.totalHistorySamples < 4 || !input.firstSeenAt || input.observablePlatforms === 0) return "insufficient_history";
  if (input.currentPlatforms === 0) return "declining";
  const ageHours = hoursBetween(input.firstSeenAt, input.now.toISOString());
  const diffusionRetention = input.observableEverPlatforms ? input.currentPlatforms / input.observableEverPlatforms : 1;
  if ((input.avgRankVelocity ?? 0) < -0.25 || (input.observableEverPlatforms >= 3 && diffusionRetention < 0.5)) return "declining";
  if (ageHours <= 24 && input.currentPlatforms <= 2) return "emerging";
  if (input.currentPlatforms >= 2 && (input.spreadVelocity ?? 0) > 0.04 && (input.avgRankVelocity ?? 0) > 0.08) return "accelerating";
  if (input.currentPlatforms >= 3 && input.persistence >= 0.6 && (input.avgRankVelocity ?? 0) < 0.08) return "saturating";
  if (input.currentPlatforms >= 3 && input.persistence >= 0.4) return "mainstream";
  return ageHours <= 36 ? "emerging" : "mainstream";
}

export function analyzeTrendIntelligence(keyword: string, platforms: string[], now = new Date()): TrendIntelligence {
  const trajectories = platforms.map((p) => trajectory(p, keyword, now));
  const withHistory = trajectories.filter((x) => x.historySamples > 0);
  const observable = trajectories.filter((x) => x.observableNow);
  const unavailableOrStale = trajectories.filter((x) => !x.observableNow);
  const ever = trajectories.filter((x) => x.firstSeenAt !== null);
  const observableEver = observable.filter((x) => x.firstSeenAt !== null);
  const current = trajectories.filter((x) => x.current);
  const totalHistorySamples = trajectories.reduce((a, x) => a + x.historySamples, 0);
  const seenTimes = ever.map((x) => x.firstSeenAt as string).sort((a, b) => Date.parse(a) - Date.parse(b));
  const lastTimes = ever.map((x) => x.lastSeenAt as string).sort((a, b) => Date.parse(a) - Date.parse(b));
  const firstSeenAt = seenTimes[0] ?? null;
  const lastSeenAt = lastTimes.at(-1) ?? null;
  const ageHours = firstSeenAt ? round(hoursBetween(firstSeenAt, now.toISOString()), 2) : null;

  const persistenceValues = withHistory.map((x) => x.persistence).filter((x): x is number => x != null);
  const persistence = persistenceValues.length ? persistenceValues.reduce((a, x) => a + x, 0) / persistenceValues.length : 0;
  const velocities = trajectories.map((x) => x.rankVelocityPerHour).filter((x): x is number => x != null);
  const avgRankVelocity = velocities.length ? velocities.reduce((a, x) => a + x, 0) / velocities.length : null;
  const spreadVelocity = firstSeenAt && ever.length > 1 && ageHours != null && ageHours >= 0.25
    ? round((ever.length - 1) / ageHours)
    : null;
  const reliabilityValues = observable.map((x) => x.reliabilityScore).filter((x): x is number => x != null);
  const sourceReliabilityScore = reliabilityValues.length
    ? Math.round(reliabilityValues.reduce((a, x) => a + x, 0) / reliabilityValues.length)
    : null;

  const historySufficiency = clamp(totalHistorySamples / Math.max(8, platforms.length * 4));
  const diffusion = observable.length ? current.length / observable.length : 0;
  const evidenceCoverage = observable.length ? Math.min(1, current.length / Math.min(3, observable.length)) : 0;
  const observabilityCoverage = platforms.length ? observable.length / platforms.length : 0;
  const confidence = Math.round(100 * clamp(
    evidenceCoverage * 0.2 +
    clamp(persistence) * 0.2 +
    clamp(diffusion) * 0.15 +
    (sourceReliabilityScore == null ? 0.5 : sourceReliabilityScore / 100) * 0.2 +
    historySufficiency * 0.15 +
    observabilityCoverage * 0.1,
  ));

  const velocityScore = avgRankVelocity == null && spreadVelocity == null
    ? null
    : Math.round(clamp(0.5 + (avgRankVelocity ?? 0) * 0.08 + (spreadVelocity ?? 0) * 0.35) * 100);
  const lifecycle = classifyLifecycle({
    totalHistorySamples,
    firstSeenAt,
    observablePlatforms: observable.length,
    currentPlatforms: current.length,
    observableEverPlatforms: observableEver.length,
    persistence,
    avgRankVelocity,
    spreadVelocity,
    now,
  });

  const caveats: string[] = [
    "All scores are deterministic heuristics over locally captured public evidence; they are not probability forecasts.",
    "Cross-platform ranks and hot values are not treated as directly comparable absolute quantities.",
    `Current diffusion uses only sources with usable evidence no older than ${CURRENT_EVIDENCE_MAX_AGE_HOURS} hours; stale/unavailable sources are excluded rather than treated as topic absence.`,
  ];
  if (lifecycle === "insufficient_history") caveats.push("More fresh snapshots are required before lifecycle claims are reliable.");
  if (sourceReliabilityScore == null) caveats.push("Source reliability history is not yet sufficient; confidence uses a neutral reliability prior.");
  if (unavailableOrStale.length) caveats.push(`${unavailableOrStale.length} selected source(s) are unavailable or stale and were excluded from current diffusion.`);

  return {
    methodologyVersion: "trend-intelligence-v1",
    keyword,
    generatedAt: now.toISOString(),
    lifecycle,
    confidence,
    confidenceBand: confidence >= 75 ? "high" : confidence >= 50 ? "medium" : "low",
    evidence: {
      platformsRequested: platforms.length,
      platformsWithHistory: withHistory.length,
      platformsObservableNow: observable.length,
      platformsUnavailableOrStale: unavailableOrStale.length,
      platformsEverSeen: ever.length,
      platformsCurrent: current.length,
      totalHistorySamples,
      firstSeenAt,
      lastSeenAt,
      ageHours,
    },
    metrics: {
      velocityScore,
      averageRankVelocityPerHour: avgRankVelocity == null ? null : round(avgRankVelocity),
      spreadVelocityPlatformsPerHour: spreadVelocity,
      persistenceScore: withHistory.length ? Math.round(clamp(persistence) * 100) : null,
      diffusionScore: observable.length ? Math.round(clamp(diffusion) * 100) : null,
      sourceReliabilityScore,
      historySufficiencyScore: Math.round(historySufficiency * 100),
    },
    trajectories,
    caveats,
  };
}

export function benchmarkTrendLead(keyword: string, referenceAt: string, platforms: string[], now = new Date()) {
  const referenceMs = Date.parse(referenceAt);
  if (!Number.isFinite(referenceMs)) throw new Error("reference_time must be a valid ISO-8601 timestamp");
  const detections: Array<{ platform: string; detectedAt: string; title: string; rank: number | null; url: string | null }> = [];
  for (const platform of platforms) {
    for (const point of readHistory(platform, 720, now)) {
      const item = hitInPoint(point, keyword);
      if (item) {
        detections.push({ platform, detectedAt: point.capturedAt, title: item.title, rank: item.rank, url: item.url });
        break;
      }
    }
  }
  detections.sort((a, b) => Date.parse(a.detectedAt) - Date.parse(b.detectedAt));
  const first = detections[0] ?? null;
  const leadHours = first ? round((referenceMs - Date.parse(first.detectedAt)) / 3_600_000, 2) : null;
  return {
    methodologyVersion: "trend-lead-benchmark-v1",
    keyword,
    referenceAt: new Date(referenceMs).toISOString(),
    firstTrendHubDetectionAt: first?.detectedAt ?? null,
    firstPlatform: first?.platform ?? null,
    leadHours,
    detected24hAhead: leadHours != null ? leadHours >= 24 : false,
    detected72hAhead: leadHours != null ? leadHours >= 72 : false,
    platformsDetected: detections.length,
    detections,
    verdict: first === null ? "insufficient_evidence" : leadHours! >= 0 ? "detected_before_reference" : "detected_after_reference",
    note: "The reference timestamp must come from an external, documented ground-truth event selected independently of TrendHub output. TrendHub never invents the reference.",
  };
}
