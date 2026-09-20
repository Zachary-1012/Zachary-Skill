/**
 * Source Reliability — local-only operational observations for each source.
 * Stores no query text, cookies, user content, hostnames, or account identifiers.
 * Each observation is limited to quality, latency, item count, and a coarse failure class.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import type { DataQuality, HotResult } from "../util/schema.js";

export type FailureClass = "none" | "auth_required" | "rate_limited" | "schema_drift" | "network" | "upstream" | "other";

export interface SourceObservation {
  at: string;
  quality: DataQuality;
  latencyMs: number;
  itemCount: number;
  failureClass: FailureClass;
}

interface ReliabilityFile {
  version: 1;
  platform: string;
  observations: SourceObservation[];
}

export interface ReliabilityWindow {
  hours: number;
  samples: number;
  okRate: number | null;
  usableRate: number | null;
  avgQualityScore: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
}

export interface SourceReliability {
  platform: string;
  status: "UP" | "DEGRADED" | "DOWN" | "AUTH_REQUIRED" | "RATE_LIMITED" | "UNKNOWN";
  score: number | null;
  samples: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  schemaDriftSignals: number;
  lastFailureClass: FailureClass | null;
  actionHints: string[];
  windows: ReliabilityWindow[];
}

const DIR = path.join(config.dataDir, "reliability");
const MAX_OBSERVATIONS = 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function safeName(p: string): string {
  return p.replace(/[^a-zA-Z0-9_.:-]/g, "_");
}
function fileFor(platform: string): string {
  return path.join(DIR, `${safeName(platform)}.json`);
}
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
function round(v: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const idx = Math.min(xs.length - 1, Math.max(0, Math.ceil(xs.length * p) - 1));
  return Math.round(xs[idx]);
}

export function classifyFailure(note: string | undefined, quality: DataQuality): FailureClass {
  if (quality === "ok") return "none";
  const s = (note ?? "").toLowerCase();
  if (/cookie|登录|login|auth|unauthor|forbidden|401|403|web_session/.test(s)) return "auth_required";
  if (/429|rate.?limit|too many|频率|风控|risk|限流/.test(s)) return "rate_limited";
  if (/结构|schema|parse|解析|unrecognized|unexpected|data keys/.test(s)) return "schema_drift";
  if (/timeout|timed out|network|fetch failed|econn|enotfound|dns|socket|网络/.test(s)) return "network";
  if (/http 5\d\d|upstream|gateway|server error|服务/.test(s)) return "upstream";
  return "other";
}

function readFile(platform: string): ReliabilityFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(fileFor(platform), "utf8")) as ReliabilityFile;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.observations)) return parsed;
  } catch {
    // first run / corrupt local operational cache => start clean
  }
  return { version: 1, platform, observations: [] };
}

function writeFile(data: ReliabilityFile): void {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(fileFor(data.platform), JSON.stringify(data, null, 2), "utf8");
}

/** Record one source attempt. Never throws into the product request path. */
export function recordSourceObservation(result: HotResult, latencyMs: number): void {
  try {
    const data = readFile(result.platform);
    const now = Date.now();
    data.observations.push({
      at: result.capturedAt || new Date(now).toISOString(),
      quality: result.dataQuality,
      latencyMs: Math.max(0, Math.round(latencyMs)),
      itemCount: Math.max(0, result.items.length),
      failureClass: classifyFailure(result.note, result.dataQuality),
    });
    data.observations = data.observations
      .filter((x) => Number.isFinite(Date.parse(x.at)) && now - Date.parse(x.at) <= MAX_AGE_MS)
      .slice(-MAX_OBSERVATIONS);
    writeFile(data);
  } catch {
    // Reliability accounting must never make a source request fail.
  }
}

function summarizeWindow(observations: SourceObservation[], hours: number, nowMs: number): ReliabilityWindow {
  const cutoff = nowMs - hours * 60 * 60 * 1000;
  const xs = observations.filter((x) => Date.parse(x.at) >= cutoff);
  if (!xs.length) {
    return { hours, samples: 0, okRate: null, usableRate: null, avgQualityScore: null, p50LatencyMs: null, p95LatencyMs: null };
  }
  const qualityScore = (q: DataQuality) => q === "ok" ? 1 : q === "degraded" ? 0.5 : 0;
  return {
    hours,
    samples: xs.length,
    okRate: round(xs.filter((x) => x.quality === "ok").length / xs.length),
    usableRate: round(xs.filter((x) => x.quality !== "missing").length / xs.length),
    avgQualityScore: round(xs.reduce((a, x) => a + qualityScore(x.quality), 0) / xs.length),
    p50LatencyMs: percentile(xs.map((x) => x.latencyMs), 0.5),
    p95LatencyMs: percentile(xs.map((x) => x.latencyMs), 0.95),
  };
}

export function actionHintsForReliability(input:{failureClass:FailureClass|null;consecutiveFailures:number;p95LatencyMs:number|null}):string[]{const h:string[]=[];if(input.failureClass==="auth_required")h.push("Observed authorization failure: request user-authorized access only when required.");if(input.failureClass==="rate_limited")h.push("Observed rate-limit/risk response: back off before retrying.");if(input.failureClass==="schema_drift")h.push("Observed schema drift: validate the adapter before trusting fresh coverage.");if(input.failureClass==="network")h.push("Observed network/timeout failure: verify network/DNS/timeout boundaries; do not convert failure to zero demand.");if(input.failureClass==="upstream")h.push("Observed upstream failure: retain last valid evidence with freshness labels instead of treating failure as topic absence.");if(input.consecutiveFailures>=3)h.push("Repeated observed failures: reduce source weight until a successful observation resets the streak.");if(input.p95LatencyMs!=null&&input.p95LatencyMs>=10000)h.push("Observed high P95 source latency: isolate this adapter from latency-sensitive default routing.");return h;}
export function getSourceReliability(platform: string, now = new Date()): SourceReliability {
  const observations = readFile(platform).observations;
  const latest = observations.at(-1) ?? null;
  const lastSuccess = [...observations].reverse().find((x) => x.quality === "ok") ?? null;
  let consecutiveFailures = 0;
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].quality === "ok") break;
    consecutiveFailures++;
  }
  const windows = [24, 168, 720].map((h) => summarizeWindow(observations, h, now.getTime()));
  const w7 = windows[1];
  const score = w7.samples
    ? Math.round(100 * clamp01((w7.okRate ?? 0) * 0.55 + (w7.usableRate ?? 0) * 0.25 + (w7.avgQualityScore ?? 0) * 0.2))
    : null;

  let status: SourceReliability["status"] = "UNKNOWN";
  if (latest) {
    if (latest.failureClass === "auth_required" && latest.quality !== "ok") status = "AUTH_REQUIRED";
    else if (latest.failureClass === "rate_limited" && latest.quality !== "ok") status = "RATE_LIMITED";
    else if (latest.quality === "ok") status = "UP";
    else if (latest.quality === "degraded") status = "DEGRADED";
    else status = "DOWN";
  }

  return {
    platform,
    status,
    score,
    samples: observations.length,
    lastAttemptAt: latest?.at ?? null,
    lastSuccessAt: lastSuccess?.at ?? null,
    consecutiveFailures,
    schemaDriftSignals: observations.filter((x) => x.failureClass === "schema_drift").length,
    lastFailureClass: latest?.failureClass ?? null,
    actionHints: actionHintsForReliability({ failureClass: latest?.failureClass ?? null, consecutiveFailures, p95LatencyMs: windows[1]?.p95LatencyMs ?? null }),
    windows,
  };
}

export function listSourceReliability(platforms: string[]): SourceReliability[] {
  return platforms.map((p) => getSourceReliability(p)).sort((a, b) => {
    const av = a.score ?? -1;
    const bv = b.score ?? -1;
    return av - bv || a.platform.localeCompare(b.platform);
  });
}
