/**
 * Professional Intelligence v2 aggregator.
 * One evidence-bound contract joins lifecycle, forecast, anomaly, audience,
 * media, source-family coverage, brand/entity context and alerts without asking an LLM to invent missing facts.
 */
import { analyzeTrendIntelligence, type TrendIntelligence } from "./intelligence.js";
import { forecastTrend, type TrendForecast } from "./forecast.js";
import { analyzeAudienceSignals, type AudienceSignals } from "./audience.js";
import { collectMediaEvidence, type MediaEvidence } from "./media.js";
import { evaluateProfessionalAlerts, type AlertEvaluation } from "../alerts/engine.js";
import { historyStoreInfo } from "../store/history.js";
import { sourceFamilyCoverage, sourceSpec, sourceUserSetup } from "../sources/professional-catalog.js";
import { entityQueryTerms, resolveBrandEntity, type BrandEntity } from "../entities/brand-catalog.js";
import { buildProfessionalSignalPack, type ProfessionalSignalPack } from "./professional-signals.js";
import { TRUTH_POLICY, TRUTH_STATES, type TruthState } from "../agent-native/truth-state.js";

export interface ProfessionalIntelligence {
  methodologyVersion: "professional-intelligence-v2";
  keyword: string;
  generatedAt: string;
  entityContext: {
    matched: boolean;
    entity: BrandEntity | null;
    queryTerms: string[];
    rule: string;
  };
  truthContract: {
    vocabulary: readonly TruthState[];
    currentEvidenceStates: TruthState[];
    policy: string;
  };
  lineage: Array<{
    stage: "Source" | "Evidence" | "Canonical Signal" | "Metric" | "Decision Support";
    status: "READY" | "PARTIAL" | "BLOCKED";
    truthState: TruthState;
    detail: string;
  }>;
  decisionState: {
    evidenceReady: boolean;
    forecastReady: boolean;
    alertCount: number;
    signalFamiliesCovered: number;
    riskFlags: string[];
    opportunityFlags: string[];
  };
  core: TrendIntelligence;
  forecast: TrendForecast;
  audience: AudienceSignals;
  media: MediaEvidence;
  professionalSignals: ProfessionalSignalPack;
  alerts: AlertEvaluation;
  storage: ReturnType<typeof historyStoreInfo>;
  sourceArchitecture: {
    selected: Array<{
      requestedId: string;
      catalogId: string | null;
      label: string | null;
      region: string | null;
      families: string[];
      verticals: string[];
      access: string | null;
      onboardingMode: string | null;
      blocksBasicUse: boolean | null;
      userAction: string | null;
    }>;
    familyCoverage: ReturnType<typeof sourceFamilyCoverage>;
    rule: string;
  };
  evidenceSummary: {
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    platformsCurrent: number;
    platformsObservableNow: number;
    totalHistorySamples: number;
    mediaItems: number;
    creatorsObserved: number;
    signalFamiliesCovered: number;
  };
  caveats: string[];
}

export function buildProfessionalIntelligence(
  keyword: string,
  platforms: string[],
  now = new Date(),
): ProfessionalIntelligence {
  const entity = resolveBrandEntity(keyword);
  const queryTerms = entityQueryTerms(keyword);
  const core = analyzeTrendIntelligence(keyword, platforms, now);
  const forecast = forecastTrend(keyword, platforms, now);
  const audience = analyzeAudienceSignals(keyword, platforms, now);
  const media = collectMediaEvidence(keyword, platforms, now);
  const alerts = evaluateProfessionalAlerts(keyword, core, forecast, undefined, now);
  const professionalSignals = buildProfessionalSignalPack(keyword, platforms, entity, now, forecast.validation);
  const familyCoverage = sourceFamilyCoverage(platforms);
  const selectedSources = platforms.map((requestedId) => {
    const spec = sourceSpec(requestedId);
    const onboarding = spec ? sourceUserSetup(spec) : null;
    return {
      requestedId,
      catalogId: spec?.id ?? null,
      label: spec?.label ?? null,
      region: spec?.region ?? null,
      families: spec?.families ?? [],
      verticals: spec?.verticals ?? [],
      access: spec?.access ?? null,
      onboardingMode: onboarding?.mode ?? null,
      blocksBasicUse: onboarding?.blocksBasicUse ?? null,
      userAction: onboarding?.userAction ?? null,
    };
  });

  const riskFlags: string[] = [];
  const opportunityFlags: string[] = [];
  if (core.metrics.sourceReliabilityScore != null && core.metrics.sourceReliabilityScore < 60) riskFlags.push("source_reliability_low");
  if (core.evidence.platformsUnavailableOrStale > 0) riskFlags.push("sources_unavailable_or_stale");
  if (forecast.status === "weak_backtest") riskFlags.push("forecast_backtest_weak");
  if (forecast.status === "insufficient_history") riskFlags.push("forecast_history_insufficient");
  if (core.lifecycle === "declining") riskFlags.push("lifecycle_declining");
  if (forecast.anomaly.direction === "drop") riskFlags.push("negative_anomaly");
  if (familyCoverage.length < 2) riskFlags.push("signal_family_coverage_narrow");
  if (selectedSources.some((x) => x.blocksBasicUse === true)) riskFlags.push("selected_sources_need_user_setup");

  if (core.lifecycle === "emerging") opportunityFlags.push("early_signal");
  if (core.lifecycle === "accelerating") opportunityFlags.push("accelerating_signal");
  if ((core.metrics.diffusionScore ?? 0) >= 60) opportunityFlags.push("cross_platform_diffusion");
  if (familyCoverage.length >= 3) opportunityFlags.push("multi_signal_family_confirmation");
  if (forecast.anomaly.direction === "spike") opportunityFlags.push("positive_anomaly");
  if (entity) opportunityFlags.push("resolved_brand_entity");
  if (forecast.forecast.some((row) => row.horizonHours <= 48 && row.deltaFromNow >= 15) && forecast.validation.grade !== "weak") {
    opportunityFlags.push("validated_forward_momentum");
  }

  const evidenceReady = core.lifecycle !== "insufficient_history" && core.evidence.platformsObservableNow > 0;
  const forecastReady = forecast.status === "ok" && forecast.validation.grade !== "weak";
  const currentEvidenceStates: TruthState[] = [];
  if (core.evidence.platformsObservableNow > 0) currentEvidenceStates.push("OBSERVED");
  if (core.evidence.platformsUnavailableOrStale > 0) currentEvidenceStates.push("STALE");
  if (!currentEvidenceStates.length) currentEvidenceStates.push("NOT_COLLECTED");
  const sourceTruth: TruthState = core.evidence.platformsObservableNow > 0
    ? "OBSERVED"
    : core.evidence.platformsUnavailableOrStale > 0 ? "STALE" : "NOT_COLLECTED";
  const analysisTruth: TruthState = evidenceReady ? "OBSERVED" : "PENDING";
  const lineage: ProfessionalIntelligence["lineage"] = [
    { stage: "Source", status: sourceTruth === "OBSERVED" ? "READY" : sourceTruth === "STALE" ? "PARTIAL" : "BLOCKED", truthState: sourceTruth, detail: `${core.evidence.platformsObservableNow} source(s) observable now; ${core.evidence.platformsUnavailableOrStale} unavailable/stale.` },
    { stage: "Evidence", status: core.evidence.totalHistorySamples > 0 ? "READY" : "PARTIAL", truthState: core.evidence.totalHistorySamples > 0 ? "OBSERVED" : "NOT_COLLECTED", detail: `${core.evidence.totalHistorySamples} historical sample(s) preserve source/time provenance.` },
    { stage: "Canonical Signal", status: evidenceReady ? "READY" : "PARTIAL", truthState: analysisTruth, detail: "Signals preserve per-source units and source-family boundaries; incomparable platform values are not summed." },
    { stage: "Metric", status: evidenceReady ? "READY" : "PARTIAL", truthState: analysisTruth, detail: "Lifecycle, velocity, persistence, diffusion and reliability are deterministic derivatives of captured evidence." },
    { stage: "Decision Support", status: evidenceReady ? "READY" : "BLOCKED", truthState: analysisTruth, detail: forecastReady ? "Evidence and forecast validation are sufficient for bounded decision support." : "Decision support remains bounded by evidence/history and forecast validation." },
  ];
  return {
    methodologyVersion: "professional-intelligence-v2",
    keyword,
    generatedAt: now.toISOString(),
    entityContext: {
      matched: entity !== null,
      entity,
      queryTerms,
      rule: "Entity aliases are used for resolution/context only until each source adapter explicitly supports alias-expanded retrieval; parent/child entities are kept distinct to avoid group/brand double counting.",
    },
    truthContract: {
      vocabulary: TRUTH_STATES,
      currentEvidenceStates,
      policy: TRUTH_POLICY,
    },
    lineage,
    decisionState: {
      evidenceReady,
      forecastReady,
      alertCount: alerts.triggered.length,
      signalFamiliesCovered: familyCoverage.length,
      riskFlags,
      opportunityFlags,
    },
    core,
    forecast,
    audience,
    media,
    professionalSignals,
    alerts,
    storage: historyStoreInfo(),
    sourceArchitecture: {
      selected: selectedSources,
      familyCoverage,
      rule: "Cross-platform claims must preserve per-source units and be confirmed across source families; raw ranks/hot/search values are never summed as one global unit. Zero-config sources are preferred; optional auth enriches evidence but must not block the basic workflow.",
    },
    evidenceSummary: {
      firstSeenAt: core.evidence.firstSeenAt,
      lastSeenAt: core.evidence.lastSeenAt,
      platformsCurrent: core.evidence.platformsCurrent,
      platformsObservableNow: core.evidence.platformsObservableNow,
      totalHistorySamples: core.evidence.totalHistorySamples,
      mediaItems: media.evidenceCount,
      creatorsObserved: audience.evidence.creatorsObserved,
      signalFamiliesCovered: familyCoverage.length,
    },
    caveats: [
      ...core.caveats,
      ...forecast.caveats,
      ...audience.caveats,
      ...media.caveats,
      "Cross-platform coverage is evaluated by signal family as well as source count; incomparable platform ranks, views, likes and search-index values are never silently treated as one unit.",
      "Brand/company entity aliases improve resolution but do not manufacture missing platform evidence; unavailable sources remain unavailable.",
      "Professional Intelligence v2 is an evidence and decision-support layer. It does not substitute public adapters for licensed firehose data or proprietary demographic panels.",
    ],
  };
}
