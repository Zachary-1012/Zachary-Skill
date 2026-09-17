#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-professional-"));
process.env.TRENTHUB_DATA_DIR = temp;
process.env.TRENTHUB_AUTOUPDATE = "0";

const statistics = await import("../dist/src/analysis/statistics.js");
const history = await import("../dist/src/store/history.js");
const forecast = await import("../dist/src/analysis/forecast.js");
const audience = await import("../dist/src/analysis/audience.js");
const media = await import("../dist/src/analysis/media.js");
const professional = await import("../dist/src/analysis/professional.js");
const reports = await import("../dist/src/reports/executive.js");
const workspace = await import("../dist/src/collaboration/workspace.js");
const observability = await import("../dist/src/observability/local.js");
const professionalApi = await import("../dist/src/web/professional-api.js");

try {
  // Robust statistics and holdout validation.
  assert.equal(statistics.median([9, 1, 4, 2, 7]), 4);
  const rz = statistics.robustZScore(100, [10, 11, 9, 10, 10, 11, 9]);
  assert.ok(rz != null && rz > 3.5, "robust anomaly score should detect a strong spike");
  const holt = statistics.autoDampedHolt([10, 12, 13, 15, 17, 18, 20, 22, 24, 25, 27, 29, 31, 33, 35, 37], 6);
  assert.equal(holt.forecast.length, 6);
  assert.ok(["strong", "usable", "weak"].includes(holt.validation.grade));

  // Seed 48 hours of evidence across two platforms. Rank improves over time.
  const now = new Date();
  for (let h = 47; h >= 0; h--) {
    const capturedAt = new Date(now.getTime() - h * 3_600_000).toISOString();
    const step = 47 - h;
    for (const [platform, offset] of [["alpha", 0], ["beta", 3]]) {
      const rank = Math.max(1, 45 - Math.floor(step * 0.7) + offset);
      history.appendHistory({
        platform,
        label: platform,
        category: "test",
        capturedAt,
        sourceUpdatedAt: capturedAt,
        dataQuality: "ok",
        items: [{
          rank,
          title: `Alpha trend professional evidence ${step}`,
          url: `https://example.com/${platform}/${step}`,
          hot: 1000 + step * 10,
          hotText: String(1000 + step * 10),
          desc: "public evidence",
          author: step % 2 ? "creator-a" : "creator-b",
          externalId: `${platform}-${step}`,
          imageUrl: `https://example.com/images/${platform}-${step}.jpg`,
          kind: step % 3 === 0 ? "video" : "normal",
        }],
      });
    }
  }

  const depth = history.historyDepth("alpha");
  assert.equal(depth.samples, 48);
  assert.ok(history.historyStoreInfo().retentionDays >= 730);

  const f = forecast.forecastTrend("Alpha trend", ["alpha", "beta"], now);
  assert.notEqual(f.status, "insufficient_history");
  assert.equal(f.forecast.length, 4);
  assert.ok(f.validation.holdout >= 3);
  assert.ok(f.forecast.every((row) => row.lower <= row.value && row.value <= row.upper));

  const aud = audience.analyzeAudienceSignals("Alpha trend", ["alpha", "beta"], now);
  assert.equal(aud.demographics.status, "not_inferred");
  assert.ok(aud.evidence.creatorsObserved >= 2);
  assert.ok(aud.creatorSignals.length >= 2);

  const med = media.collectMediaEvidence("Alpha trend", ["alpha", "beta"], now);
  assert.ok(med.evidenceCount > 0);
  assert.equal(med.multimodal.callerAiReady, true);

  const intel = professional.buildProfessionalIntelligence("Alpha trend", ["alpha", "beta"], now);
  assert.equal(intel.methodologyVersion, "professional-intelligence-v2");
  assert.ok(Array.isArray(intel.alerts.triggered));
  assert.ok(intel.evidenceSummary.totalHistorySamples >= 96);

  const report = reports.buildExecutiveReport(intel);
  assert.ok(report.keySignals.some((row) => row.signal === "forecastValidation"));
  assert.ok(report.evidenceAppendix.length > 0);
  assert.match(reports.executiveReportMarkdown(report), /Evidence appendix/);
  assert.match(reports.executiveReportCsv(report), /evidenceRef/);

  // Local-first RBAC, watchlist, saved query and audit.
  const ws = workspace.createWorkspace("Professional QA", "owner@example.test");
  workspace.upsertMember(ws.id, "owner@example.test", "analyst@example.test", "analyst");
  workspace.setWatchlist(ws.id, "analyst@example.test", ["Alpha trend", "AI"]);
  workspace.saveQuery(ws.id, "analyst@example.test", { name: "Alpha", keyword: "Alpha trend", platforms: ["alpha", "beta"] });
  workspace.saveAlertRule(ws.id, "analyst@example.test", { name: "Alpha spike", keyword: "Alpha trend", rule: { type: "anomaly", threshold: 3.5 }, enabled: true });
  assert.equal(workspace.readWorkspace(ws.id, "owner@example.test").watchlist.length, 2);
  assert.ok(workspace.readAudit(ws.id, "owner@example.test").length >= 5);
  assert.throws(() => workspace.upsertMember(ws.id, "analyst@example.test", "x@example.test", "viewer"), /access denied/);

  observability.recordApiObservation("/api/test", 12, 200);
  observability.recordToolObservation("professional_intelligence", 25, true);
  const obs = observability.localObservabilitySnapshot();
  assert.equal(obs.privacy.remoteExport, false);
  assert.ok(obs.apiRoutes.some((row) => row.name === "/api/test"));

  // Professional HTTP API can render from stored evidence without a network refresh.
  const apiUrl = new URL("http://127.0.0.1/api/professional?keyword=Alpha%20trend&platforms=alpha,beta&refresh=0");
  const apiResult = await professionalApi.handleProfessionalApi("/api/professional", apiUrl, "GET", "");
  assert.equal(apiResult?.status, 200);
  assert.equal(apiResult?.data?.methodologyVersion, "professional-intelligence-v2");

  const remoteWorkspaceAttempt = professionalApi.PROFESSIONAL_PUBLIC_READ_PATHS.has("/api/workspaces");
  assert.equal(remoteWorkspaceAttempt, false, "workspace mutations must never be public-read allowlisted");

  console.log(`PROFESSIONAL V2 TEST OK backend=${history.historyStoreInfo().backend} history=${depth.samples} forecast=${f.status}/${f.validation.grade} media=${med.evidenceCount} creators=${aud.evidence.creatorsObserved}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
