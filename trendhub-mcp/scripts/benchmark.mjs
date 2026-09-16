#!/usr/bin/env node
/**
 * Batch real-world lead-time benchmark.
 * Reads externally curated ground-truth cases and compares them with local TrendHub history.
 * No network calls, telemetry, or synthetic reference timestamps.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const inputArg = argValue("--file") ?? argValue("-f");
if (!inputArg) {
  console.error("Usage: npm run benchmark:lead -- --file <benchmark-cases.json>");
  console.error("Each case: { id?, keyword, referenceTime, platforms?[] , referenceSource? }");
  process.exit(2);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const cases = Array.isArray(raw) ? raw : raw.cases;
if (!Array.isArray(cases) || cases.length === 0) {
  throw new Error("benchmark file must contain a non-empty array or { cases: [...] }");
}

const { analyzeTrendIntelligence, benchmarkTrendLead } = await import("../dist/src/analysis/intelligence.js");
const { listPlatforms } = await import("../dist/src/sources/index.js");
const defaultPlatforms = ["xiaohongshu", "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome", "hackernews", "github-trending"];
const known = new Set(listPlatforms().map((x) => x.platform));

const results = [];
for (let i = 0; i < cases.length; i++) {
  const c = cases[i] ?? {};
  const keyword = String(c.keyword ?? "").trim();
  const referenceTime = String(c.referenceTime ?? c.reference_time ?? "").trim();
  if (!keyword || !referenceTime || !Number.isFinite(Date.parse(referenceTime))) {
    throw new Error(`case ${i + 1} must include keyword and a valid referenceTime`);
  }
  const requested = Array.isArray(c.platforms) && c.platforms.length ? c.platforms.map(String) : defaultPlatforms;
  const platforms = requested.filter((p) => known.has(p));
  if (!platforms.length) throw new Error(`case ${i + 1} has no valid registered platforms`);

  const lead = benchmarkTrendLead(keyword, referenceTime, platforms);
  const intelligence = analyzeTrendIntelligence(keyword, platforms);
  results.push({
    id: c.id ?? `case-${i + 1}`,
    keyword,
    referenceTime: new Date(Date.parse(referenceTime)).toISOString(),
    referenceSource: c.referenceSource ?? c.reference_source ?? null,
    platforms,
    lead,
    intelligenceAtEvaluation: {
      lifecycle: intelligence.lifecycle,
      confidence: intelligence.confidence,
      evidence: intelligence.evidence,
      metrics: intelligence.metrics,
    },
  });
}

const withEvidence = results.filter((x) => x.lead.verdict !== "insufficient_evidence");
const before = withEvidence.filter((x) => x.lead.verdict === "detected_before_reference");
const ahead24 = withEvidence.filter((x) => x.lead.detected24hAhead);
const ahead72 = withEvidence.filter((x) => x.lead.detected72hAhead);
const leadValues = withEvidence.map((x) => x.lead.leadHours).filter((x) => typeof x === "number");
const averageLeadHours = leadValues.length ? Math.round((leadValues.reduce((a, x) => a + x, 0) / leadValues.length) * 100) / 100 : null;

const report = {
  schemaVersion: 1,
  methodologyVersion: "trend-lead-benchmark-v1",
  generatedAt: new Date().toISOString(),
  inputFile: path.basename(inputPath),
  groundTruthPolicy: "referenceTime must be externally documented and selected independently of TrendHub output",
  summary: {
    totalCases: results.length,
    casesWithEvidence: withEvidence.length,
    detectedBeforeReference: before.length,
    detected24hAhead: ahead24.length,
    detected72hAhead: ahead72.length,
    beforeReferenceRate: withEvidence.length ? Math.round((before.length / withEvidence.length) * 1000) / 1000 : null,
    ahead24Rate: withEvidence.length ? Math.round((ahead24.length / withEvidence.length) * 1000) / 1000 : null,
    ahead72Rate: withEvidence.length ? Math.round((ahead72.length / withEvidence.length) * 1000) / 1000 : null,
    averageLeadHours,
  },
  results,
};

const outDir = path.join(ROOT, "data", "benchmarks");
fs.mkdirSync(outDir, { recursive: true });
const stamp = report.generatedAt.replace(/[:.]/g, "-");
const out = path.join(outDir, `lead-benchmark-${stamp}.json`);
fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.error(`[benchmark] local report written: data/benchmarks/${path.basename(out)}`);
console.error("[benchmark] no network upload performed; preserve the external ground-truth source independently.");
