/**
 * Professional trend forecasting and anomaly detection.
 *
 * The model is intentionally deterministic and evidence-bound. It forecasts a
 * normalized 0-100 TrendHub signal derived from within-platform ranks/presence;
 * it never claims absolute demand, probability of success, or cross-platform
 * hot-value comparability.
 */
import { keywordHit } from "./text.js";
import { autoDampedHolt, clamp, robustZScore, round } from "./statistics.js";
import { readHistory, type HistoryPoint } from "../store/history.js";

export type ForecastStatus = "ok" | "insufficient_history" | "weak_backtest";

export interface TrendSignalPoint {
  at: string;
  value: number;
  observedPlatforms: number;
  requestedPlatforms: number;
}

export interface TrendForecast {
  methodologyVersion: "trend-forecast-v2";
  keyword: string;
  generatedAt: string;
  status: ForecastStatus;
  signalScale: "0-100-normalized-rank-presence";
  bucketHours: number;
  history: {
    points: number;
    firstAt: string | null;
    lastAt: string | null;
    spanHours: number;
    requestedPlatforms: number;
    latestValue: number | null;
  };
  anomaly: {
    detected: boolean;
    direction: "spike" | "drop" | "none";
    robustZ: number | null;
    latestValue: number | null;
    baselinePoints: number;
  };
  validation: {
    holdout: number;
    mae: number | null;
    rmse: number | null;
    smape: number | null;
    normalizedMae: number | null;
    grade: "insufficient" | "strong" | "usable" | "weak";
  };
  forecast: Array<{
    horizonHours: number;
    value: number;
    lower: number;
    upper: number;
    deltaFromNow: number;
  }>;
  recentSeries: TrendSignalPoint[];
  caveats: string[];
}

function signalForPoint(point: HistoryPoint, keyword: string): number {
  const matches = point.items.filter((item) => keywordHit(item.title, keyword));
  if (!matches.length) return 0;
  const ranked = matches
    .map((item) => item.rank)
    .filter((rank): rank is number => typeof rank === "number" && Number.isFinite(rank) && rank > 0);
  if (!ranked.length) return 55;
  const bestRank = Math.min(...ranked);
  // Rank 1 = 100; rank 50 ~= 2. This stays within-platform and only becomes a
  // normalized evidence signal after aggregation.
  return clamp(102 - bestRank * 2, 2, 100);
}

function chooseBucketHours(spanHours: number): number {
  if (spanHours <= 7 * 24) return 1;
  if (spanHours <= 30 * 24) return 3;
  if (spanHours <= 120 * 24) return 6;
  return 24;
}

function rawObservations(keyword: string, platforms: string[], hours: number, now: Date) {
  const rows: Array<{ platform: string; at: number; value: number }> = [];
  let minAt = Number.POSITIVE_INFINITY;
  let maxAt = 0;
  for (const platform of platforms) {
    for (const point of readHistory(platform, hours, now)) {
      if (point.dataQuality === "missing") continue;
      const at = Date.parse(point.capturedAt);
      if (!Number.isFinite(at)) continue;
      const qualityWeight = point.dataQuality === "ok" ? 1 : 0.6;
      rows.push({ platform, at, value: signalForPoint(point, keyword) * qualityWeight });
      minAt = Math.min(minAt, at);
      maxAt = Math.max(maxAt, at);
    }
  }
  return { rows, minAt, maxAt };
}

function bucketize(
  rows: Array<{ platform: string; at: number; value: number }>,
  platforms: string[],
  bucketHours: number,
): TrendSignalPoint[] {
  const bucketMs = bucketHours * 3_600_000;
  const buckets = new Map<number, Map<string, { at: number; value: number }>>();
  for (const row of rows) {
    const bucket = Math.floor(row.at / bucketMs) * bucketMs;
    let byPlatform = buckets.get(bucket);
    if (!byPlatform) {
      byPlatform = new Map();
      buckets.set(bucket, byPlatform);
    }
    const existing = byPlatform.get(row.platform);
    // Keep the latest observation per platform within a bucket.
    if (!existing || row.at >= existing.at) byPlatform.set(row.platform, { at: row.at, value: row.value });
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, byPlatform]) => {
      const values = [...byPlatform.values()].map((x) => x.value);
      const observedCoverage = platforms.length ? byPlatform.size / platforms.length : 0;
      const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      // Do not interpret missing sources as topic absence. Coverage influences
      // the signal gently rather than driving it to zero.
      const coverageWeight = 0.75 + 0.25 * observedCoverage;
      return {
        at: new Date(bucket).toISOString(),
        value: round(clamp(average * coverageWeight, 0, 100), 2),
        observedPlatforms: byPlatform.size,
        requestedPlatforms: platforms.length,
      };
    });
}

function insufficient(keyword: string, platforms: string[], series: TrendSignalPoint[], bucketHours: number, now: Date): TrendForecast {
  const firstAt = series[0]?.at ?? null;
  const lastAt = series.at(-1)?.at ?? null;
  const spanHours = firstAt && lastAt ? Math.max(0, (Date.parse(lastAt) - Date.parse(firstAt)) / 3_600_000) : 0;
  return {
    methodologyVersion: "trend-forecast-v2",
    keyword,
    generatedAt: now.toISOString(),
    status: "insufficient_history",
    signalScale: "0-100-normalized-rank-presence",
    bucketHours,
    history: {
      points: series.length,
      firstAt,
      lastAt,
      spanHours: round(spanHours, 2),
      requestedPlatforms: platforms.length,
      latestValue: series.at(-1)?.value ?? null,
    },
    anomaly: {
      detected: false,
      direction: "none",
      robustZ: null,
      latestValue: series.at(-1)?.value ?? null,
      baselinePoints: Math.max(0, series.length - 1),
    },
    validation: { holdout: 0, mae: null, rmse: null, smape: null, normalizedMae: null, grade: "insufficient" },
    forecast: [],
    recentSeries: series.slice(-120),
    caveats: [
      "Forecast withheld: TrendHub requires at least 12 normalized time buckets spanning at least 24 hours.",
      "Missing or unavailable sources are excluded rather than treated as topic absence.",
    ],
  };
}

export function forecastTrend(keyword: string, platforms: string[], now = new Date(), lookbackHours = 24 * 365): TrendForecast {
  const raw = rawObservations(keyword, platforms, lookbackHours, now);
  const spanHours = Number.isFinite(raw.minAt) && raw.maxAt >= raw.minAt
    ? (raw.maxAt - raw.minAt) / 3_600_000
    : 0;
  const bucketHours = chooseBucketHours(spanHours);
  const series = bucketize(raw.rows, platforms, bucketHours);
  if (series.length < 12 || spanHours < 24) return insufficient(keyword, platforms, series, bucketHours, now);

  const values = series.map((point) => point.value);
  const maxHorizonHours = 72;
  const maxSteps = Math.max(1, Math.ceil(maxHorizonHours / bucketHours));
  const model = autoDampedHolt(values, maxSteps);
  const latest = values.at(-1)!;
  const baseline = values.slice(Math.max(0, values.length - 25), -1);
  const z = robustZScore(latest, baseline);
  const anomalyDetected = z != null && Math.abs(z) >= 3.5;
  const horizons = [6, 24, 48, 72];
  const forecast = horizons.map((horizonHours) => {
    const step = Math.min(model.forecast.length, Math.max(1, Math.ceil(horizonHours / bucketHours)));
    const value = clamp(model.forecast[step - 1] ?? latest, 0, 100);
    const uncertainty = model.uncertaintyScale * Math.sqrt(step) * (model.validation.grade === "weak" ? 1.5 : 1);
    return {
      horizonHours,
      value: round(value, 2),
      lower: round(clamp(value - uncertainty, 0, 100), 2),
      upper: round(clamp(value + uncertainty, 0, 100), 2),
      deltaFromNow: round(value - latest, 2),
    };
  });

  const firstAt = series[0]?.at ?? null;
  const lastAt = series.at(-1)?.at ?? null;
  const status: ForecastStatus = model.validation.grade === "weak" ? "weak_backtest" : "ok";
  const caveats = [
    "Forecast is a deterministic extrapolation of TrendHub's normalized evidence signal, not a probability or absolute-demand forecast.",
    "Cross-platform raw hot values are never treated as directly comparable; the model uses within-platform rank/presence normalization.",
    "Forecast reliability depends on captured history and source availability; the backtest grade is returned with every result.",
  ];
  if (model.validation.grade === "weak") caveats.push("Holdout error is weak; treat the forward curve as directional only.");

  return {
    methodologyVersion: "trend-forecast-v2",
    keyword,
    generatedAt: now.toISOString(),
    status,
    signalScale: "0-100-normalized-rank-presence",
    bucketHours,
    history: {
      points: series.length,
      firstAt,
      lastAt,
      spanHours: round(spanHours, 2),
      requestedPlatforms: platforms.length,
      latestValue: round(latest, 2),
    },
    anomaly: {
      detected: anomalyDetected,
      direction: anomalyDetected ? (z! > 0 ? "spike" : "drop") : "none",
      robustZ: z == null ? null : round(z, 3),
      latestValue: round(latest, 2),
      baselinePoints: baseline.length,
    },
    validation: model.validation,
    forecast,
    recentSeries: series.slice(-120),
    caveats,
  };
}
