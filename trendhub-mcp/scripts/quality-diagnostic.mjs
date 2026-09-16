#!/usr/bin/env node
/**
 * Voluntary, local-only quality diagnostic.
 * No network upload is performed. The report intentionally excludes hostname, username,
 * absolute paths, cookies, query text, content bodies, IP addresses and account identifiers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const { listPlatforms } = await import("../dist/src/sources/index.js");
const { listSourceReliability } = await import("../dist/src/store/reliability.js");
const { historyDepth } = await import("../dist/src/store/history.js");

const names = listPlatforms().map((x) => x.platform);
const reliability = listSourceReliability(names);
const histories = names.map((platform) => ({ platform, ...historyDepth(platform) }));
const scored = reliability.filter((x) => x.score != null);
const statusCounts = reliability.reduce((acc, x) => {
  acc[x.status] = (acc[x.status] ?? 0) + 1;
  return acc;
}, {});
const totalHistorySamples = histories.reduce((a, x) => a + x.samples, 0);

const report = {
  schemaVersion: 1,
  kind: "trendhub-voluntary-quality-diagnostic",
  generatedAt: new Date().toISOString(),
  product: {
    version: pkg.version,
    nodeMajor: Number(process.versions.node.split(".")[0]),
    osFamily: process.platform,
    toolCount: Array.isArray(manifest.tools) ? manifest.tools.length : null,
    platformCount: names.length,
  },
  quality: {
    reliabilityScoredSources: scored.length,
    averageReliabilityScore: scored.length ? Math.round(scored.reduce((a, x) => a + x.score, 0) / scored.length) : null,
    statusCounts,
    historySourcesWithSamples: histories.filter((x) => x.samples > 0).length,
    totalHistorySamples,
    benchmarkReadySources: histories.filter((x) => x.samples >= 4).length,
  },
  privacy: {
    autoUpload: false,
    telemetry: false,
    containsHostname: false,
    containsUsername: false,
    containsAbsolutePaths: false,
    containsCookies: false,
    containsQueryText: false,
    containsContentBodies: false,
    sharing: "manual opt-in only",
  },
  sourceSummary: reliability.map((x) => ({
    platform: x.platform,
    status: x.status,
    score: x.score,
    samples: x.samples,
    consecutiveFailures: x.consecutiveFailures,
    schemaDriftSignals: x.schemaDriftSignals,
  })),
};

const outDir = path.join(ROOT, "data", "diagnostics");
fs.mkdirSync(outDir, { recursive: true });
const stamp = report.generatedAt.replace(/[:.]/g, "-");
const out = path.join(outDir, `quality-${stamp}.json`);
fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
console.error(`[quality] local report written: data/diagnostics/${path.basename(out)}`);
console.error("[quality] nothing was uploaded; share this file only if you explicitly choose to.");
