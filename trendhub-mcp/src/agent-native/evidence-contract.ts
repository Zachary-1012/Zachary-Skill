import type { EvidenceTruthState } from "./truth-state.js";

export const EVIDENCE_CONTRACT_VERSION = "trendhub-evidence-contract-v1" as const;
export type ReliabilityStatus = "observed" | "insufficient" | "degraded";
export type ResultType = "complete" | "partial" | "unavailable";

export interface EvidenceRef {
  id: string;
  source: string;
  evidenceType: "live" | "history" | "methodology" | "catalog" | "contract" | "capability" | "skill";
  observedAt: string;
  uri?: string | null;
  title?: string | null;
  excerpt?: string | null;
  reliability?: number | null;
  truthState?: EvidenceTruthState;
}

export interface TrendHubResult<T> {
  contractVersion: typeof EVIDENCE_CONTRACT_VERSION;
  resultType: ResultType;
  truthState: EvidenceTruthState;
  data: T;
  evidence: EvidenceRef[];
  source: {
    primary: string | null;
    ids: string[];
    mode: "local-first" | "live";
  };
  timestamp: {
    generatedAt: string;
    observedAtRange: { first: string | null; last: string | null };
  };
  reliability: {
    status: ReliabilityStatus;
    score: number | null;
    explanation: string;
  };
  confidence: {
    score: number | null;
    label: "high" | "medium" | "low" | "unknown";
    explanation: string;
  };
  limitations: string[];
  lineage: {
    evidenceIds: string[];
    sources: string[];
    observedAtRange: { first: string | null; last: string | null };
  };
  trace: {
    capability: string;
    generatedAt: string;
    mode: "local-first" | "live";
    sources: string[];
  };
}

export function evidenceContract() {
  return {
    schema: EVIDENCE_CONTRACT_VERSION,
    requiredTopLevel: ["data", "evidence", "source", "timestamp", "reliability", "confidence", "limitations", "trace"],
    compatibilityFields: ["resultType", "truthState", "lineage"],
    evidenceRequired: ["id", "source", "evidenceType", "observedAt"],
    truthRule: "Only fresh usable observations can establish PRESENT/ABSENT. Missing, unavailable, stale, auth-required or rate-limited evidence never becomes zero.",
    stateSeparation: "IMPLEMENTED, TESTED, VERIFIED, RELEASED and OPERATING are distinct evidence states.",
    ownershipRule: "Acquisition adapters provide evidence but never own canonical truth.",
  } as const;
}

export function completeResult<T>(input: {
  data: T;
  capability: string;
  evidence?: EvidenceRef[];
  resultType?: ResultType;
  truthState?: EvidenceTruthState;
  reliability?: Partial<TrendHubResult<T>["reliability"]>;
  confidence?: Partial<TrendHubResult<T>["confidence"]>;
  limitations?: string[];
  mode?: "local-first" | "live";
}): TrendHubResult<T> {
  const evidence = input.evidence ?? [];
  const times = evidence.map((x) => x.observedAt).filter((x) => Number.isFinite(Date.parse(x))).sort((a, b) => Date.parse(a) - Date.parse(b));
  const sources = [...new Set(evidence.map((x) => x.source))].sort();
  const mode = input.mode ?? "local-first";
  const generatedAt = new Date().toISOString();
  const observedAtRange = { first: times[0] ?? null, last: times.at(-1) ?? null };
  const score = input.confidence?.score ?? (evidence.length ? Math.min(1, evidence.length / 4) : null);
  const label = input.confidence?.label ?? (score == null ? "unknown" : score >= 0.8 ? "high" : score >= 0.5 ? "medium" : "low");
  const truthState = input.truthState ?? (evidence.length ? "AVAILABLE" : "NOT_COLLECTED");
  const resultType = input.resultType ?? (truthState === "AVAILABLE" ? "complete" : truthState === "NOT_COLLECTED" ? "unavailable" : "partial");

  return {
    contractVersion: EVIDENCE_CONTRACT_VERSION,
    resultType,
    truthState,
    data: input.data,
    evidence,
    source: { primary: sources[0] ?? null, ids: sources, mode },
    timestamp: { generatedAt, observedAtRange },
    reliability: {
      status: input.reliability?.status ?? (evidence.length ? "observed" : "insufficient"),
      score: input.reliability?.score ?? null,
      explanation: input.reliability?.explanation ?? "Reliability is reported only when evidence supports it.",
    },
    confidence: {
      score,
      label,
      explanation: input.confidence?.explanation ?? "Confidence is bounded by evidence coverage and source quality; it is not a probability.",
    },
    limitations: input.limitations ?? [],
    lineage: { evidenceIds: evidence.map((x) => x.id), sources, observedAtRange },
    trace: { capability: input.capability, generatedAt, mode, sources },
  };
}
