/**
 * Dependency-free robust statistics used by Professional Intelligence v2.
 * All routines are deterministic and intentionally small enough to audit.
 */

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function finite(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid]! : (xs[mid - 1]! + xs[mid]!) / 2;
}

export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const pos = clamp(q, 0, 1) * (xs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return xs[lo]!;
  const weight = pos - lo;
  return xs[lo]! * (1 - weight) + xs[hi]! * weight;
}

export function medianAbsoluteDeviation(values: number[]): { median: number | null; mad: number | null; scaledMad: number | null } {
  const center = median(values);
  if (center == null) return { median: null, mad: null, scaledMad: null };
  const mad = median(values.map((value) => Math.abs(value - center)));
  return { median: center, mad, scaledMad: mad == null ? null : mad * 1.4826 };
}

export function robustZScore(value: number, baseline: number[]): number | null {
  if (baseline.length < 5) return null;
  const stats = medianAbsoluteDeviation(baseline);
  if (stats.median == null || stats.mad == null) return null;
  if (stats.mad === 0) {
    const deviations = baseline.map((x) => Math.abs(x - stats.median!));
    const fallback = mean(deviations) ?? 0;
    if (fallback === 0) return value === stats.median ? 0 : Math.sign(value - stats.median) * 99;
    return (value - stats.median) / fallback;
  }
  return 0.67448975 * (value - stats.median) / stats.mad;
}

export function mae(actual: number[], predicted: number[]): number | null {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return null;
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.abs(actual[i]! - predicted[i]!);
  return total / n;
}

export function rmse(actual: number[], predicted: number[]): number | null {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return null;
  let total = 0;
  for (let i = 0; i < n; i++) total += (actual[i]! - predicted[i]!) ** 2;
  return Math.sqrt(total / n);
}

export function smape(actual: number[], predicted: number[]): number | null {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return null;
  let total = 0;
  let used = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(actual[i]!);
    const p = Math.abs(predicted[i]!);
    const denom = a + p;
    if (denom === 0) continue;
    total += (2 * Math.abs(actual[i]! - predicted[i]!)) / denom;
    used++;
  }
  return used ? (total / used) * 100 : 0;
}

export interface HoltParameters {
  alpha: number;
  beta: number;
  damping: number;
}

export interface HoltFit {
  parameters: HoltParameters;
  level: number;
  trend: number;
  fitted: number[];
  residuals: number[];
  forecast: number[];
}

export function dampedHolt(values: number[], horizon: number, parameters: HoltParameters): HoltFit {
  if (values.length < 2) throw new Error("dampedHolt requires at least two observations");
  const alpha = clamp(parameters.alpha, 0.01, 0.99);
  const beta = clamp(parameters.beta, 0.01, 0.99);
  const damping = clamp(parameters.damping, 0.5, 0.999);
  let level = values[0]!;
  let trend = values[1]! - values[0]!;
  const fitted = [values[0]!];
  const residuals = [0];

  for (let i = 1; i < values.length; i++) {
    const prediction = level + damping * trend;
    const previousLevel = level;
    level = alpha * values[i]! + (1 - alpha) * prediction;
    trend = beta * (level - previousLevel) + (1 - beta) * damping * trend;
    fitted.push(prediction);
    residuals.push(values[i]! - prediction);
  }

  const forecast: number[] = [];
  let dampingSum = 0;
  for (let h = 1; h <= Math.max(0, Math.floor(horizon)); h++) {
    dampingSum += damping ** h;
    forecast.push(level + trend * dampingSum);
  }
  return { parameters: { alpha, beta, damping }, level, trend, fitted, residuals, forecast };
}

export interface AutoHoltResult extends HoltFit {
  validation: {
    holdout: number;
    mae: number | null;
    rmse: number | null;
    smape: number | null;
    normalizedMae: number | null;
    grade: "insufficient" | "strong" | "usable" | "weak";
  };
  uncertaintyScale: number;
}

export function autoDampedHolt(values: number[], horizon: number): AutoHoltResult {
  if (values.length < 8) throw new Error("autoDampedHolt requires at least eight observations");
  const holdout = Math.min(12, Math.max(3, Math.floor(values.length * 0.2)));
  const train = values.slice(0, -holdout);
  const actual = values.slice(-holdout);
  const candidates: HoltParameters[] = [];
  for (const alpha of [0.2, 0.4, 0.6, 0.8]) {
    for (const beta of [0.1, 0.3, 0.5]) {
      for (const damping of [0.82, 0.9, 0.97]) candidates.push({ alpha, beta, damping });
    }
  }

  let best = candidates[0]!;
  let bestMae = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const fit = dampedHolt(train, holdout, candidate);
    const score = mae(actual, fit.forecast) ?? Number.POSITIVE_INFINITY;
    if (score < bestMae) {
      bestMae = score;
      best = candidate;
    }
  }

  const validationFit = dampedHolt(train, holdout, best);
  const validationMae = mae(actual, validationFit.forecast);
  const validationRmse = rmse(actual, validationFit.forecast);
  const validationSmape = smape(actual, validationFit.forecast);
  const scale = Math.max(10, (quantile(values, 0.9) ?? 0) - (quantile(values, 0.1) ?? 0));
  const normalizedMae = validationMae == null ? null : validationMae / scale;
  const grade: AutoHoltResult["validation"]["grade"] = normalizedMae == null
    ? "insufficient"
    : normalizedMae <= 0.12
      ? "strong"
      : normalizedMae <= 0.25
        ? "usable"
        : "weak";

  const full = dampedHolt(values, horizon, best);
  const residualStats = medianAbsoluteDeviation(full.residuals.slice(1));
  const uncertaintyScale = Math.max(1, residualStats.scaledMad ?? (validationMae ?? 1));
  return {
    ...full,
    validation: {
      holdout,
      mae: validationMae == null ? null : round(validationMae, 3),
      rmse: validationRmse == null ? null : round(validationRmse, 3),
      smape: validationSmape == null ? null : round(validationSmape, 2),
      normalizedMae: normalizedMae == null ? null : round(normalizedMae, 4),
      grade,
    },
    uncertaintyScale: round(uncertaintyScale, 3),
  };
}
