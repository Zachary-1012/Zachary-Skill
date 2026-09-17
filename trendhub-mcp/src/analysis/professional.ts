/**
 * Professional Intelligence v2 aggregator.
 * One evidence-bound contract joins lifecycle, forecast, anomaly, audience,
 * media and alerts without asking an LLM to invent missing facts.
 */
import { analyzeTrendIntelligence, type TrendIntelligence } from "./intelligence.js";
import { forecastTrend, type TrendForecast } from "./forecast.js";
import { analyzeAudienceSignals, type AudienceSignals } from "./audience.js";
import { collectMediaEvidence, type MediaEvidence } from "./media.js";
import { evaluateProfessionalAlerts, type AlertEvaluation } from "../alerts/engine.js";
import { historyStoreInfo } from "../store/history.js";

export interface ProfessionalIntelligence {
  methodologyVersion: "professional-intelligence-v2";
  keyword: string;
  generatedAt: string;
  decisionState: {
    evidenceReady: boolean;
    forecastReady: boolean;
    alertCount: number;
    riskFlags: string[];
    opportunityFlags: string[];
  };
  core: TrendIntelligence;
  forecast: TrendForecast;
  audience: AudienceSignals;
  media: MediaEvidence;
  alerts: AlertEvaluation;
  storage: ReturnType<typeof historyStoreInfo>;
  evidenceSummary: {
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    platformsCurrent: number;
    platformsObservableNow: number;
    totalHistorySamples: number;
    mediaItems: number;
    creatorsObserved: number;
  };
  caveats: string[];
}

export function buildProfessionalIntelligence(
  keyword: string,
  platforms: string[],
  now = new Date(),
): ProfessionalIntelligence {
  const core = analyzeTrendIntelligence(keyword, platforms, now);
  const forecast = forecastTrend(keyword, platforms, now);
  const audience = analyzeAudienceSignals(keyword, platforms, now);
  const media = collectMediaEvidence(keyword, platforms, now);
  const alerts = evaluateProfessionalAlerts(keyword, core, forecast, undefined, now);

  const riskFlags: string[] = [];
  const opportunityFlags: string[] = [];
  if (core.metrics.sourceReliabilityScore != null && core.metrics.sourceReliabilityScore < 60) riskFlags.push("source_reliability_low");
  if (core.evidence.platformsUnavailableOrStale > 0) riskFlags.push("sources_unavailable_or_stale");
  if (forecast.status === "weak_backtest") riskFlags.push("forecast_backtest_weak");
  if (forecast.status === "insufficient_history") riskFlags.push("forecast_history_insufficient");
  if (core.lifecycle === "declining") riskFlags.push("lifecycle_declining");
  if (forecast.anomaly.direction === "drop") riskFlags.push("negative_anomaly");

  if (core.lifecycle === "emerging") opportunityFlags.push("early_signal");
  if (core.lifecycle === "accelerating") opportunityFlags.push("accelerating_signal");
  if ((core.metrics.diffusionScore ?? 0) >= 60) opportunityFlags.push("cross_platform_diffusion");
  if (forecast.anomaly.direction === "spike") opportunityFlags.push("positive_anomaly");
  if (forecast.forecast.some((row) => row.horizonHours <= 48 && row.deltaFromNow >= 15) && forecast.validation.grade !== "weak") {
    opportunityFlags.push("validated_forward_momentum");
  }

  const evidenceReady = core.lifecycle !== "insufficient_history" && core.evidence.platformsObservableNow > 0;
  const forecastReady = forecast.status === "ok" && forecast.validation.grade !== "weak";
  return {
    methodologyVersion: "professional-intelligence-v2",
    keyword,
    generatedAt: now.toISOString(),
    decisionState: {
      evidenceReady,
      forecastReady,
      alertCount: alerts.triggered.length,
      riskFlags,
      opportunityFlags,
    },
    core,
    forecast,
    audience,
    media,
    alerts,
    storage: historyStoreInfo(),
    evidenceSummary: {
      firstSeenAt: core.evidence.firstSeenAt,
      lastSeenAt: core.evidence.lastSeenAt,
      platformsCurrent: core.evidence.platformsCurrent,
      platformsObservableNow: core.evidence.platformsObservableNow,
      totalHistorySamples: core.evidence.totalHistorySamples,
      mediaItems: media.evidenceCount,
      creatorsObserved: audience.evidence.creatorsObserved,
    },
    caveats: [
      ...core.caveats,
      ...forecast.caveats,
      ...audience.caveats,
      ...media.caveats,
      "Professional Intelligence v2 is an evidence and decision-support layer. It does not substitute public adapters for licensed firehose data or proprietary demographic panels.",
    ],
  };
}
