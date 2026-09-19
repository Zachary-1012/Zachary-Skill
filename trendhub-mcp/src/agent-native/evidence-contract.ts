/** Stable evidence envelope for Agent-native capabilities.
 * Legacy tools intentionally keep their existing response shape for compatibility.
 */
import { TRUTH_POLICY, truthStateCounts, type TruthState } from "./truth-state.js";

export type ReliabilityStatus = "observed" | "insufficient" | "degraded";

export interface EvidenceRef {
  id: string;
  source: string;
  evidenceType: "live" | "history" | "methodology" | "catalog";
  observedAt: string;
  uri?: string | null;
  title?: string | null;
  excerpt?: string | null;
  reliability?: number | null;
  truthState?: TruthState;
  lineage?: {
    provider?: string | null;
    sourceId?: string | null;
    capturedAt?: string | null;
    parentEvidenceIds?: string[];
  };
}

export interface TrendHubResult<T> {
  resultType: "complete";
  data: T;
  evidence: EvidenceRef[];
  reliability: { status: ReliabilityStatus; score: number | null; explanation: string };
  confidence: { score: number | null; label: "high" | "medium" | "low" | "unknown"; explanation: string };
  truth: {
    states: Partial<Record<TruthState, number>>;
    observedEvidence: number;
    nonObservedEvidence: number;
    policy: string;
  };
  limitations: string[];
  trace: {
    capability: string;
    generatedAt: string;
    mode: "local-first" | "live";
    sources: string[];
    evidenceIds: string[];
  };
}

export function completeResult<T>(input: {
  data: T;
  capability: string;
  evidence?: EvidenceRef[];
  reliability?: Partial<TrendHubResult<T>["reliability"]>;
  confidence?: Partial<TrendHubResult<T>["confidence"]>;
  limitations?: string[];
  mode?: "local-first" | "live";
}): TrendHubResult<T> {
  const evidence = (input.evidence ?? []).map((item) => ({
    ...item,
    truthState: item.truthState ?? "OBSERVED" as TruthState,
  }));
  const score = input.confidence?.score ?? (evidence.length ? Math.min(1, evidence.length / 3) : null);
  const label = input.confidence?.label ?? (score == null ? "unknown" : score >= 0.8 ? "high" : score >= 0.5 ? "medium" : "low");
  const states = truthStateCounts(evidence.map((item) => item.truthState ?? "UNKNOWN"));
  const observedEvidence = states.OBSERVED ?? 0;
  return {
    resultType: "complete",
    data: input.data,
    evidence,
    reliability: {
      status: input.reliability?.status ?? (evidence.length ? "observed" : "insufficient"),
      score: input.reliability?.score ?? null,
      explanation: input.reliability?.explanation ?? "Reliability is reported only when local observations or source metadata support it.",
    },
    confidence: { score, label, explanation: input.confidence?.explanation ?? "Confidence is bounded by evidence coverage and source quality." },
    truth: {
      states,
      observedEvidence,
      nonObservedEvidence: evidence.length - observedEvidence,
      policy: TRUTH_POLICY,
    },
    limitations: input.limitations ?? [],
    trace: {
      capability: input.capability,
      generatedAt: new Date().toISOString(),
      mode: input.mode ?? "local-first",
      sources: [...new Set(evidence.map((x) => x.source))].sort(),
      evidenceIds: evidence.map((x) => x.id),
    },
  };
}
