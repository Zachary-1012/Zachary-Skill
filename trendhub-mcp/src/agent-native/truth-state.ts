/**
 * Explicit truth-state vocabulary shared by Agent-native evidence and local closed-loop records.
 * A numeric value of 0 is still an observed value. NULL/missing is never silently converted to 0.
 */
export const TRUTH_STATES = [
  "OBSERVED",
  "UNKNOWN",
  "NOT_AVAILABLE",
  "NOT_COLLECTED",
  "STALE",
  "OFFLINE",
  "ERROR",
  "BLOCKED",
  "PENDING",
  "SCHEDULED",
] as const;

export type TruthState = (typeof TRUTH_STATES)[number];

export function isTruthState(value: unknown): value is TruthState {
  return typeof value === "string" && (TRUTH_STATES as readonly string[]).includes(value);
}

export function truthStateFromDataQuality(value: unknown): TruthState {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "ok" || s === "observed" || s === "live") return "OBSERVED";
  if (s === "degraded" || s === "stale") return "STALE";
  if (s === "offline" || s === "down") return "OFFLINE";
  if (s === "blocked" || s === "auth_required" || s === "rate_limited") return "BLOCKED";
  if (s === "error" || s === "failed") return "ERROR";
  if (s === "pending") return "PENDING";
  if (s === "scheduled") return "SCHEDULED";
  if (s === "missing" || s === "not_available") return "NOT_AVAILABLE";
  if (s === "not_collected") return "NOT_COLLECTED";
  return "UNKNOWN";
}

export function truthStateCounts(states: readonly TruthState[]): Partial<Record<TruthState, number>> {
  const out: Partial<Record<TruthState, number>> = {};
  for (const state of states) out[state] = (out[state] ?? 0) + 1;
  return out;
}

export const TRUTH_POLICY =
  "0 is a valid observed value; NULL/missing remains explicit. UNKNOWN, NOT_AVAILABLE, NOT_COLLECTED, STALE, OFFLINE, ERROR, BLOCKED, PENDING and SCHEDULED must never be rewritten as success or zero.";
