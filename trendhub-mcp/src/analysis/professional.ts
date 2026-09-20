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
import type { EntityResearchPack } from "./entity-research.js";
import { summarizeTruthState, truthStateFromTrajectory, type EvidenceTruthAssessment, type EvidenceTruthState } from "../agent-native/truth-state.js";

export interface ProfessionalIntelligence {
  methodologyVersion: "professional-intelligence-v3";
  compatibilityBase: "professional-intelligence-v2";
  keyword: string;
  generatedAt: string;
  research: EntityResearchPack | null;
  entityContext: {
    matched: boolean;
    entity: BrandEntity | null;
    queryTerms: string[];
    rule: string;
  };
  decisionState: {
    evidenceReady: boolean;
    forecastReady: boolean;
    alertCount: number;
    signalFamiliesCovered: number;
    riskFlags: string[];
    opportunityFlags: string[];
    researchReady: boolean;
    currentVisibility: string | null;
  };
  evidenceState: { overall: EvidenceTruthState; observedPresent: number; observedAbsent: number; undetermined: number; sources: EvidenceTruthAssessment[]; rule: string; };
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
  research: EntityResearchPack | null = null,
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
  const truthAssessments = core.trajectories.map((trajectory) => truthStateFromTrajectory(trajectory));
  const overallTruthState = summarizeTruthState(truthAssessments);
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
  if (overallTruthState !== "AVAILABLE") riskFlags.push(`evidence_state_${overallTruthState.toLowerCase()}`);

  if (core.lifecycle === "emerging") opportunityFlags.push("early_signal");
  if (core.lifecycle === "accelerating") opportunityFlags.push("accelerating_signal");
  if ((core.metrics.diffusionScore ?? 0) >= 60) opportunityFlags.push("cross_platform_diffusion");
  if (familyCoverage.length >= 3) opportunityFlags.push("multi_signal_family_confirmation");
  if (forecast.anomaly.direction === "spike") opportunityFlags.push("positive_anomaly");
  if (entity) opportunityFlags.push("resolved_brand_entity");
  if (research?.currentState.evidenceStrength === "strong") opportunityFlags.push("entity_research_strong");
  if (research?.currentState.visibility === "active-subject-evidence") opportunityFlags.push("entity_evidence_without_hotlist_hype");
  if (research?.evidenceGaps.length) riskFlags.push("entity_research_evidence_gaps");
  if (forecast.forecast.some((row) => row.horizonHours <= 48 && row.deltaFromNow >= 15) && forecast.validation.grade !== "weak") {
    opportunityFlags.push("validated_forward_momentum");
  }

  const evidenceReady = core.lifecycle !== "insufficient_history" && core.evidence.platformsObservableNow > 0;
  const forecastReady = forecast.status === "ok" && forecast.validation.grade !== "weak";
  return {
    methodologyVersion: "professional-intelligence-v3",
    compatibilityBase: "professional-intelligence-v2",
    keyword,
    research,
    generatedAt: now.toISOString(),
    entityContext: {
      matched: entity !== null,
      entity,
      queryTerms,
      rule: "Entity aliases are used for resolution/context only until each source adapter explicitly supports alias-expanded retrieval; parent/child entities are kept distinct to avoid group/brand double counting.",
    },
    decisionState: {
      evidenceReady,
      forecastReady,
      alertCount: alerts.triggered.length,
      signalFamiliesCovered: familyCoverage.length,
      riskFlags,
      opportunityFlags,
      researchReady: Boolean(research && research.currentState.evidenceStrength !== "insufficient"),
      currentVisibility: research?.currentState.visibility ?? null,
    },
    evidenceState: { overall: overallTruthState, observedPresent: truthAssessments.filter((x) => x.presence === "PRESENT").length, observedAbsent: truthAssessments.filter((x) => x.presence === "ABSENT").length, undetermined: truthAssessments.filter((x) => x.presence === "UNDETERMINED").length, sources: truthAssessments, rule: "ABSENT is asserted only from fresh usable observations. Missing/unavailable states never become zero or topic absence." },
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
      "Professional Intelligence v3 uses Entity-first Query Evidence Acquisition before trend interpretation; generic hotlists are only one secondary signal and are never treated as the whole market conversation.",
      "Professional Intelligence v3 is an evidence and decision-support layer. It does not substitute public adapters for licensed firehose data or proprietary demographic panels.",
    ],
  };
}
