/**
 * Evidence-bound executive reporting.
 * The report contains deterministic facts/flags only; narrative synthesis may be
 * delegated to the caller AI using the attached evidence and caveats.
 */
import type { ProfessionalIntelligence } from "../analysis/professional.js";

export interface ExecutiveReport {
  schemaVersion: "trendhub-executive-report-v2";
  title: string;
  generatedAt: string;
  keyword: string;
  subject: {
    canonicalName: string;
    resolved: boolean;
    researchMode: string;
  };
  decisionBrief: {
    currentState: string;
    whatChanged: string;
    drivers: Array<{ title: string; reason: string }>;
    opportunities: Array<{ title: string; reason: string }>;
    risks: Array<{ title: string; reason: string }>;
    evidenceGaps: Array<{ title: string; reason: string; nextStep: string }>;
    recommendedActions: Array<{ action: string; reason: string; priority: string }>;
  };
  status: {
    lifecycle: string;
    confidence: number;
    confidenceBand: string;
    evidenceReady: boolean;
    forecastReady: boolean;
  };
  keySignals: Array<{ signal: string; value: string | number | null; evidenceRef: string }>;
  opportunities: string[];
  risks: string[];
  alerts: Array<{ severity: string; title: string; reason: string; evidenceRef: string }>;
  audience: {
    creatorsObserved: number;
    platformMix: ProfessionalIntelligence["audience"]["platformMix"];
    creatorConcentration: ProfessionalIntelligence["audience"]["creatorConcentration"];
  };
  media: {
    evidenceCount: number;
    imageEvidenceCount: number;
    callerAiReady: boolean;
  };
  methodology: string[];
  caveats: string[];
  evidenceAppendix: Array<Record<string, unknown>>;
  productionPrompt: string;
}

export function buildExecutiveReport(intel: ProfessionalIntelligence): ExecutiveReport {
  const core = intel.core;
  const forecast48 = intel.forecast.forecast.find((row) => row.horizonHours === 48) ?? null;
  const keySignals: ExecutiveReport["keySignals"] = [
    { signal: "lifecycle", value: core.lifecycle, evidenceRef: "core.lifecycle" },
    { signal: "confidence", value: core.confidence, evidenceRef: "core.confidence" },
    { signal: "velocityScore", value: core.metrics.velocityScore, evidenceRef: "core.metrics.velocityScore" },
    { signal: "diffusionScore", value: core.metrics.diffusionScore, evidenceRef: "core.metrics.diffusionScore" },
    { signal: "persistenceScore", value: core.metrics.persistenceScore, evidenceRef: "core.metrics.persistenceScore" },
    { signal: "sourceReliabilityScore", value: core.metrics.sourceReliabilityScore, evidenceRef: "core.metrics.sourceReliabilityScore" },
    { signal: "anomaly", value: intel.forecast.anomaly.direction, evidenceRef: "forecast.anomaly" },
    { signal: "forecast48hDelta", value: forecast48?.deltaFromNow ?? null, evidenceRef: "forecast.forecast[48h]" },
    { signal: "forecastValidation", value: intel.forecast.validation.grade, evidenceRef: "forecast.validation" },
    { signal: "crossSignalConfirmation", value: intel.professionalSignals.crossSignalConfirmation.score, evidenceRef: "professionalSignals.crossSignalConfirmation" },
    { signal: "novelty", value: intel.professionalSignals.novelty.status, evidenceRef: "professionalSignals.novelty" },
    { signal: "volatility", value: intel.professionalSignals.volatility.coefficientOfVariation, evidenceRef: "professionalSignals.volatility" },
    { signal: "newsCanonicalClusters", value: intel.professionalSignals.news.canonicalClusters, evidenceRef: "professionalSignals.news" },
  ];

  const evidenceAppendix: Array<Record<string, unknown>> = [];
  for (const trajectory of core.trajectories) {
    evidenceAppendix.push({
      type: "platform_trajectory",
      platform: trajectory.platform,
      latestEvidenceAt: trajectory.latestEvidenceAt,
      firstSeenAt: trajectory.firstSeenAt,
      lastSeenAt: trajectory.lastSeenAt,
      latestRank: trajectory.latestRank,
      bestRank: trajectory.bestRank,
      rankVelocityPerHour: trajectory.rankVelocityPerHour,
      sourceStatus: trajectory.sourceStatus,
      reliabilityScore: trajectory.reliabilityScore,
    });
  }
  for (const item of intel.media.items.slice(0, 20)) evidenceAppendix.push({ type: "media_evidence", ...item });
  for (const creator of intel.audience.creatorSignals.slice(0, 20)) evidenceAppendix.push({ type: "creator_signal", ...creator });
  evidenceAppendix.push({ type: "professional_signal_pack", ...intel.professionalSignals });
  if (intel.research) {
    evidenceAppendix.push({
      type: "entity_research_summary",
      subject: intel.research.subject,
      currentState: intel.research.currentState,
      searchIntent: intel.research.searchIntent,
      channelAnalysis: intel.research.channelAnalysis.map((channel) => ({
        id: channel.id,
        label: channel.label,
        family: channel.family,
        dataQuality: channel.dataQuality,
        itemCount: channel.itemCount,
        conclusion: channel.conclusion,
        evidence: channel.evidence,
      })),
    });
  }

  const research = intel.research;
  const whatChanged = research?.searchIntent.direction === "rising"
    ? `搜索相对热度近期上升${research.searchIntent.changePct == null ? "" : `约 ${research.searchIntent.changePct}%`}；需结合主体证据判断驱动。`
    : research?.searchIntent.direction === "declining"
      ? `搜索相对热度近期下降${research.searchIntent.changePct == null ? "" : `约 ${Math.abs(research.searchIntent.changePct)}%`}；需结合主体证据判断原因。`
      : intel.core.lifecycle !== "insufficient_history"
        ? `历史趋势生命周期为 ${intel.core.lifecycle}；当前变化需结合 Query Evidence 与历史轨迹共同解释。`
        : "历史不足以判断变化幅度；当前以主体相关公开证据为主。";

  const report: ExecutiveReport = {
    schemaVersion: "trendhub-executive-report-v2",
    title: `TrendHub Executive Intelligence — ${intel.keyword}`,
    generatedAt: intel.generatedAt,
    keyword: intel.keyword,
    subject: {
      canonicalName: research?.subject.canonicalName ?? intel.entityContext.entity?.name ?? intel.keyword,
      resolved: Boolean(research?.subject.resolved ?? intel.entityContext.matched),
      researchMode: research?.subject.researchMode ?? "history-first-compatibility",
    },
    decisionBrief: {
      currentState: research?.currentState.conclusion ?? "Entity-first research was not executed for this compatibility call.",
      whatChanged,
      drivers: (research?.drivers ?? []).map((x) => ({ title: x.title, reason: x.reason })),
      opportunities: (research?.opportunities ?? []).map((x) => ({ title: x.title, reason: x.reason })),
      risks: (research?.risks ?? []).map((x) => ({ title: x.title, reason: x.reason })),
      evidenceGaps: (research?.evidenceGaps ?? []).map((x) => ({ title: x.title, reason: x.reason, nextStep: x.nextStep })),
      recommendedActions: (research?.recommendedActions ?? []).map((x) => ({ action: x.action, reason: x.reason, priority: x.priority })),
    },
    status: {
      lifecycle: core.lifecycle,
      confidence: core.confidence,
      confidenceBand: core.confidenceBand,
      evidenceReady: intel.decisionState.evidenceReady,
      forecastReady: intel.decisionState.forecastReady,
    },
    keySignals,
    opportunities: intel.decisionState.opportunityFlags,
    risks: intel.decisionState.riskFlags,
    alerts: intel.alerts.triggered.map((row) => ({
      severity: row.severity,
      title: row.title,
      reason: row.reason,
      evidenceRef: `alerts.${row.ruleId}`,
    })),
    audience: {
      creatorsObserved: intel.audience.evidence.creatorsObserved,
      platformMix: intel.audience.platformMix,
      creatorConcentration: intel.audience.creatorConcentration,
    },
    media: {
      evidenceCount: intel.media.evidenceCount,
      imageEvidenceCount: intel.media.imageEvidenceCount,
      callerAiReady: intel.media.multimodal.callerAiReady,
    },
    methodology: [
      "Evidence is captured from public sources and normalized without cross-platform hot-value equivalence.",
      "Lifecycle, velocity, persistence, diffusion, reliability and confidence are deterministic metrics.",
      "Forecasts use a damped Holt model selected by holdout MAE; every forecast includes validation grade and uncertainty bounds.",
      "Audience signals are public-content/creator proxies only; sensitive demographics are not inferred.",
      "AI narrative is downstream of evidence and must preserve missing/degraded states and citations.",
      "Professional signal pack adds source-normalized cross-family confirmation, first-seen/lead-lag, deduplicated media, novelty/seasonality, volatility and evidence-bound brand context.",
    ],
    caveats: [...new Set(intel.caveats)],
    evidenceAppendix,
    productionPrompt: "Using only the attached TrendHub report and evidence appendix, preserve the decisionBrief structure: current state, what changed, drivers, opportunities, risks, evidence gaps, and recommended actions. Cite evidenceRef/evidence entries for material claims. Never reinterpret MISSING/AUTH_REQUIRED as zero or absence, and never turn search relevance or publication count into social popularity.",
  };
  return report;
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function executiveReportCsv(report: ExecutiveReport): string {
  const rows: unknown[][] = [["section", "name", "value", "evidenceRef"]];
  for (const signal of report.keySignals) rows.push(["signal", signal.signal, signal.value, signal.evidenceRef]);
  for (const opportunity of report.opportunities) rows.push(["opportunity", opportunity, true, "decisionState.opportunityFlags"]);
  for (const risk of report.risks) rows.push(["risk", risk, true, "decisionState.riskFlags"]);
  for (const row of report.alerts) rows.push(["alert", row.title, `${row.severity}: ${row.reason}`, row.evidenceRef]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function executiveReportMarkdown(report: ExecutiveReport): string {
  const lines = [
    `# ${report.title}`,
    "",
    `Generated: ${report.generatedAt}`,
    `Subject: **${report.subject.canonicalName}** · Research mode: **${report.subject.researchMode}**`,
    "",
    "## Decision brief",
    "",
    `**Current state:** ${report.decisionBrief.currentState}`,
    "",
    `**What changed:** ${report.decisionBrief.whatChanged}`,
    "",
    "### Drivers",
    ...(report.decisionBrief.drivers.length ? report.decisionBrief.drivers.map((x) => `- **${x.title}** — ${x.reason}`) : ["- insufficient evidence"]),
    "",
    "### Opportunities",
    ...(report.decisionBrief.opportunities.length ? report.decisionBrief.opportunities.map((x) => `- **${x.title}** — ${x.reason}`) : ["- none evidenced"]),
    "",
    "### Risks",
    ...(report.decisionBrief.risks.length ? report.decisionBrief.risks.map((x) => `- **${x.title}** — ${x.reason}`) : ["- none evidenced"]),
    "",
    "### Evidence gaps",
    ...(report.decisionBrief.evidenceGaps.length ? report.decisionBrief.evidenceGaps.map((x) => `- **${x.title}** — ${x.reason} Next: ${x.nextStep}`) : ["- none material"]),
    "",
    "### Recommended actions",
    ...(report.decisionBrief.recommendedActions.length ? report.decisionBrief.recommendedActions.map((x) => `- **${x.priority}** ${x.action} — ${x.reason}`) : ["- gather more evidence"]),
    "",
    `Lifecycle: **${report.status.lifecycle}** · Confidence: **${report.status.confidence}/100 (${report.status.confidenceBand})**`,
    `Evidence ready: **${report.status.evidenceReady}** · Forecast ready: **${report.status.forecastReady}**`,
    "",
    "## Key signals",
    "",
    "| Signal | Value | Evidence |",
    "| --- | --- | --- |",
    ...report.keySignals.map((row) => `| ${row.signal} | ${row.value ?? "—"} | \`${row.evidenceRef}\` |`),
    "",
    "## Opportunities",
    ...(report.opportunities.length ? report.opportunities.map((x) => `- ${x}`) : ["- none evidenced"]),
    "",
    "## Risks",
    ...(report.risks.length ? report.risks.map((x) => `- ${x}`) : ["- none evidenced"]),
    "",
    "## Alerts",
    ...(report.alerts.length ? report.alerts.map((x) => `- **${x.severity}** ${x.title}: ${x.reason} (\`${x.evidenceRef}\`)`) : ["- none"]),
    "",
    "## Methodology",
    ...report.methodology.map((x) => `- ${x}`),
    "",
    "## Caveats",
    ...report.caveats.map((x) => `- ${x}`),
    "",
    "## Evidence appendix",
    "",
    "```json",
    JSON.stringify(report.evidenceAppendix, null, 2),
    "```",
  ];
  return lines.join("\n");
}
