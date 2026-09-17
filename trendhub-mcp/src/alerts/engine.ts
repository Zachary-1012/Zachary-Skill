/**
 * Deterministic professional alert engine.
 * Rules are transport-neutral; delivery adapters can route triggered alerts to
 * email/webhook/Slack/Teams without coupling analytical logic to a vendor.
 */
import { createHash } from "node:crypto";
import type { TrendIntelligence } from "../analysis/intelligence.js";
import type { TrendForecast } from "../analysis/forecast.js";

export type AlertSeverity = "info" | "medium" | "high" | "critical";
export type AlertRuleType =
  | "lifecycle"
  | "velocity"
  | "diffusion"
  | "anomaly"
  | "forecast_delta"
  | "source_reliability";

export interface AlertRule {
  id: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  enabled?: boolean;
  threshold?: number;
  lifecycle?: Array<TrendIntelligence["lifecycle"]>;
  horizonHours?: 6 | 24 | 48 | 72;
  cooldownMinutes?: number;
  note?: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  keyword: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  title: string;
  reason: string;
  observedValue: number | string | null;
  threshold: number | string | null;
  fingerprint: string;
  cooldownMinutes: number;
  generatedAt: string;
  evidence: Record<string, unknown>;
}

export interface AlertEvaluation {
  methodologyVersion: "professional-alerts-v1";
  keyword: string;
  generatedAt: string;
  evaluatedRules: number;
  triggered: TriggeredAlert[];
  deliveryContract: {
    transports: Array<"webhook" | "email" | "slack" | "teams" | "local">;
    mode: "adapter-based";
    note: string;
  };
}

export const DEFAULT_PROFESSIONAL_RULES: AlertRule[] = [
  { id: "anomaly-spike", type: "anomaly", severity: "high", threshold: 3.5, cooldownMinutes: 60 },
  { id: "accelerating", type: "lifecycle", severity: "high", lifecycle: ["accelerating"], cooldownMinutes: 120 },
  { id: "high-diffusion", type: "diffusion", severity: "medium", threshold: 60, cooldownMinutes: 120 },
  { id: "high-velocity", type: "velocity", severity: "medium", threshold: 65, cooldownMinutes: 120 },
  { id: "forecast-growth-48h", type: "forecast_delta", severity: "medium", threshold: 15, horizonHours: 48, cooldownMinutes: 180 },
  { id: "source-risk", type: "source_reliability", severity: "medium", threshold: 55, cooldownMinutes: 180 },
];

function fingerprint(ruleId: string, keyword: string, reason: string): string {
  return createHash("sha256").update(`${ruleId}\n${keyword}\n${reason}`).digest("hex").slice(0, 24);
}

function alert(
  rule: AlertRule,
  keyword: string,
  now: Date,
  title: string,
  reason: string,
  observedValue: number | string | null,
  threshold: number | string | null,
  evidence: Record<string, unknown>,
): TriggeredAlert {
  const fp = fingerprint(rule.id, keyword, reason);
  return {
    id: `${rule.id}:${fp}`,
    ruleId: rule.id,
    keyword,
    type: rule.type,
    severity: rule.severity,
    title,
    reason,
    observedValue,
    threshold,
    fingerprint: fp,
    cooldownMinutes: rule.cooldownMinutes ?? 120,
    generatedAt: now.toISOString(),
    evidence,
  };
}

export function evaluateProfessionalAlerts(
  keyword: string,
  intelligence: TrendIntelligence,
  forecast: TrendForecast,
  rules: AlertRule[] = DEFAULT_PROFESSIONAL_RULES,
  now = new Date(),
): AlertEvaluation {
  const triggered: TriggeredAlert[] = [];
  const active = rules.filter((rule) => rule.enabled !== false);

  for (const rule of active) {
    if (rule.type === "lifecycle") {
      const allowed = rule.lifecycle ?? ["accelerating"];
      if (allowed.includes(intelligence.lifecycle)) {
        triggered.push(alert(
          rule,
          keyword,
          now,
          `Lifecycle changed to ${intelligence.lifecycle}`,
          `TrendHub lifecycle is ${intelligence.lifecycle} with confidence ${intelligence.confidence}.`,
          intelligence.lifecycle,
          allowed.join(","),
          { lifecycle: intelligence.lifecycle, confidence: intelligence.confidence, evidence: intelligence.evidence },
        ));
      }
      continue;
    }

    if (rule.type === "velocity") {
      const value = intelligence.metrics.velocityScore;
      const threshold = rule.threshold ?? 65;
      if (value != null && value >= threshold) {
        triggered.push(alert(rule, keyword, now, "Trend velocity threshold crossed", `Velocity score ${value} >= ${threshold}.`, value, threshold, {
          averageRankVelocityPerHour: intelligence.metrics.averageRankVelocityPerHour,
          spreadVelocityPlatformsPerHour: intelligence.metrics.spreadVelocityPlatformsPerHour,
        }));
      }
      continue;
    }

    if (rule.type === "diffusion") {
      const value = intelligence.metrics.diffusionScore;
      const threshold = rule.threshold ?? 60;
      if (value != null && value >= threshold) {
        triggered.push(alert(rule, keyword, now, "Cross-platform diffusion threshold crossed", `Diffusion score ${value} >= ${threshold}.`, value, threshold, {
          platformsCurrent: intelligence.evidence.platformsCurrent,
          platformsObservableNow: intelligence.evidence.platformsObservableNow,
        }));
      }
      continue;
    }

    if (rule.type === "anomaly") {
      const value = forecast.anomaly.robustZ;
      const threshold = Math.abs(rule.threshold ?? 3.5);
      if (forecast.anomaly.detected && value != null && Math.abs(value) >= threshold) {
        triggered.push(alert(rule, keyword, now, `Trend ${forecast.anomaly.direction} anomaly`, `Robust z-score ${value} exceeded ±${threshold}.`, value, threshold, {
          direction: forecast.anomaly.direction,
          latestValue: forecast.anomaly.latestValue,
          baselinePoints: forecast.anomaly.baselinePoints,
        }));
      }
      continue;
    }

    if (rule.type === "forecast_delta") {
      const horizon = rule.horizonHours ?? 48;
      const row = forecast.forecast.find((x) => x.horizonHours === horizon);
      const threshold = rule.threshold ?? 15;
      if (row && forecast.validation.grade !== "weak" && row.deltaFromNow >= threshold) {
        triggered.push(alert(rule, keyword, now, `${horizon}h forward signal rising`, `Forecast delta ${row.deltaFromNow} >= ${threshold} on a ${forecast.validation.grade} holdout grade.`, row.deltaFromNow, threshold, {
          horizonHours: horizon,
          forecast: row,
          validation: forecast.validation,
        }));
      }
      continue;
    }

    if (rule.type === "source_reliability") {
      const value = intelligence.metrics.sourceReliabilityScore;
      const threshold = rule.threshold ?? 55;
      if (value != null && value < threshold) {
        triggered.push(alert(rule, keyword, now, "Source reliability degraded", `Average observable-source reliability ${value} < ${threshold}.`, value, threshold, {
          trajectories: intelligence.trajectories.map((x) => ({ platform: x.platform, sourceStatus: x.sourceStatus, reliabilityScore: x.reliabilityScore })),
        }));
      }
    }
  }

  const severityOrder: Record<AlertSeverity, number> = { critical: 4, high: 3, medium: 2, info: 1 };
  triggered.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity] || a.ruleId.localeCompare(b.ruleId));
  return {
    methodologyVersion: "professional-alerts-v1",
    keyword,
    generatedAt: now.toISOString(),
    evaluatedRules: active.length,
    triggered,
    deliveryContract: {
      transports: ["webhook", "email", "slack", "teams", "local"],
      mode: "adapter-based",
      note: "The analytical engine only emits evidence-bound alert objects. Delivery adapters must enforce explicit user configuration, retries, cooldown and secret isolation.",
    },
  };
}
