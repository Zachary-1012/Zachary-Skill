#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-intelligence-test-"));
process.env.TRENTHUB_DATA_DIR = temp;

const { appendHistory, closeHistoryStore, readHistory } = await import("../dist/src/store/history.js");
const { recordSourceObservation, getSourceReliability, classifyFailure } = await import("../dist/src/store/reliability.js");
const { analyzeTrendIntelligence, benchmarkTrendLead } = await import("../dist/src/analysis/intelligence.js");

const now = new Date();
const at = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
const result = (platform, capturedAt, rank) => ({
  platform,
  label: platform,
  category: "test",
  capturedAt,
  sourceUpdatedAt: null,
  dataQuality: "ok",
  items: [{ rank, title: "AI眼镜新品趋势", url: `https://example.test/${platform}/${rank}`, hot: 100 - rank, hotText: null, desc: null, author: null, externalId: null }],
});

const fixtures = [
  result("p1", at(48), 30), result("p1", at(24), 15), result("p1", at(0), 5),
  result("p2", at(24), 25), result("p2", at(0), 10),
  result("p3", at(0), 20),
];
for (const r of fixtures) {
  appendHistory(r);
  recordSourceObservation(r, 100 + (r.items[0].rank ?? 0));
}

// A deliberately future-dated point must never leak into an earlier evaluation time.
appendHistory(result("p1", new Date(now.getTime() + 3_600_000).toISOString(), 1));
const bounded = readHistory("p1", 168, now);
assert.equal(bounded.length, 3, "readHistory must exclude observations after the evaluation time");
assert.equal(bounded.at(-1)?.items[0]?.rank, 5, "future evidence must not replace current point-in-time evidence");

assert.equal(classifyFailure("HTTP 429 rate limited", "missing"), "rate_limited");
assert.equal(classifyFailure("Cookie expired, login required", "missing"), "auth_required");
assert.equal(classifyFailure("response schema unrecognized", "degraded"), "schema_drift");

const rel = getSourceReliability("p1", now);
assert.equal(rel.status, "UP");
assert.equal(rel.score, 100);
assert.equal(rel.samples, 3);

const intel = analyzeTrendIntelligence("AI眼镜", ["p1", "p2", "p3"], now);
assert.equal(intel.lifecycle, "accelerating");
assert.equal(intel.evidence.platformsCurrent, 3);
assert.ok((intel.metrics.velocityScore ?? 0) > 50);
assert.ok(intel.confidence >= 70);

const benchmark = benchmarkTrendLead("AI眼镜", now.toISOString(), ["p1", "p2", "p3"], now);
assert.equal(benchmark.verdict, "detected_before_reference");
assert.ok((benchmark.leadHours ?? 0) >= 47.9);
assert.equal(benchmark.detected24hAhead, true);
assert.equal(benchmark.detected72hAhead, false);

closeHistoryStore();
fs.rmSync(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
console.log(`INTELLIGENCE TEST OK lifecycle=${intel.lifecycle} confidence=${intel.confidence} leadHours=${benchmark.leadHours} lookahead=blocked`);
