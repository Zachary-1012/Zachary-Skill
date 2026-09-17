/**
 * Evidence-bound executive reporting.
 * The report contains deterministic facts/flags only; narrative synthesis may be
 * delegated to the caller AI using the attached evidence and caveats.
 */
import type { ProfessionalIntelligence } from "../analysis/professional.js";

export interface ExecutiveReport {
  schemaVersion: "trendhub-executive-report-v1";
  title: string;
  generatedAt: string;
  keyword: string;
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

  const report: ExecutiveReport = {
    schemaVersion: "trendhub-executive-report-v1",
    title: `TrendHub Executive Intelligence — ${intel.keyword}`,
    generatedAt: intel.generatedAt,
    keyword: intel.keyword,
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
    productionPrompt: "Using only the attached TrendHub report and evidence appendix, write an executive decision brief with: current state, what changed, why it matters, opportunities, risks, recommended next actions, and what must be verified next. Cite evidenceRef fields for every material claim. Do not invent missing demographics, source facts, causal explanations, or forecast certainty.",
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
