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
const sourceCatalog = await import("../dist/src/sources/professional-catalog.js");
const accessPlan = await import("../dist/src/sources/access-plan.js");
const brands = await import("../dist/src/entities/brand-catalog.js");

try {
  // Robust statistics and holdout validation.
  assert.equal(statistics.median([9, 1, 4, 2, 7]), 4);
  const rz = statistics.robustZScore(100, [10, 11, 9, 10, 10, 11, 9]);
  assert.ok(rz != null && rz > 3.5, "robust anomaly score should detect a strong spike");
  const holt = statistics.autoDampedHolt([10, 12, 13, 15, 17, 18, 20, 22, 24, 25, 27, 29, 31, 33, 35, 37], 6);
  assert.equal(holt.forecast.length, 6);
  assert.ok(["strong", "usable", "weak"].includes(holt.validation.grade));

  // Source universe: priority coverage and user-onboarding boundaries.
  const allSources = sourceCatalog.professionalSourceCatalog();
  for (const required of [
    "xiaohongshu", "douyin", "weibo", "bilibili", "zhihu", "xiaoyuzhou", "baidu-index",
    "vogue-china", "caixin", "yicai", "socialbeta", "youtube", "tiktok", "instagram", "x",
    "apple-podcasts", "spotify-podcasts", "google-trends", "reuters", "vogue-business",
    "business-of-fashion", "wwd", "adage", "brand-owned-domain",
  ]) {
    assert.ok(allSources.some((s) => s.id === required), `professional source universe missing ${required}`);
  }
  const xhs = sourceCatalog.sourceSpec("xiaohongshu");
  assert.equal(sourceCatalog.sourceUserSetup(xhs).mode, "optional-local-session");
  assert.equal(sourceCatalog.sourceUserSetup(xhs).blocksBasicUse, false);
  const baiduIndex = sourceCatalog.sourceSpec("baidu-index");
  assert.equal(sourceCatalog.sourceUserSetup(baiduIndex).mode, "required-local-session");
  const instagram = sourceCatalog.sourceSpec("instagram");
  assert.equal(sourceCatalog.sourceUserSetup(instagram).mode, "user-oauth");

  const fashionPlan = accessPlan.buildSourceAccessPlan({ verticals: ["fashion-luxury"], includePriority: "P1", maxDefaultLive: 12 });
  assert.ok(fashionPlan.zeroConfig.length > 0);
  assert.ok(fashionPlan.optionalEnhancements.some((s) => s.id === "xiaohongshu"));
  assert.ok(fashionPlan.credentialed.some((s) => s.id === "instagram"));
  assert.ok(fashionPlan.planned.some((s) => s.id === "vogue-china"));
  assert.ok(fashionPlan.defaultLivePlatforms.length >= 4 && fashionPlan.defaultLivePlatforms.length <= 12);
  for (const platform of fashionPlan.defaultLivePlatforms) {
    const spec = sourceCatalog.sourceSpec(platform);
    assert.ok(spec, `default live platform ${platform} must resolve to a source spec`);
    assert.equal(sourceCatalog.sourceUserSetup(spec).blocksBasicUse, false, `default live platform ${platform} must not require setup`);
  }

  // Brand/company entity seeds and alias resolution.
  assert.equal(brands.resolveBrandEntity("LV")?.id, "louis-vuitton");
  assert.equal(brands.resolveBrandEntity("路易威登")?.id, "louis-vuitton");
  assert.equal(brands.resolveBrandEntity("小米")?.id, "xiaomi");
  assert.equal(brands.resolveBrandEntity("Tesla")?.id, "tesla");
  assert.ok(brands.entityQueryTerms("YSL").includes("Saint Laurent"));
  assert.ok(brands.brandEntityCatalog("P1").some((x) => x.id === "xiaomi-auto"));

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
  assert.equal(intel.entityContext.matched, false);

  const brandIntel = professional.buildProfessionalIntelligence("LV", fashionPlan.defaultLivePlatforms.slice(0, 4), now);
  assert.equal(brandIntel.entityContext.entity?.id, "louis-vuitton");
  assert.ok(brandIntel.entityContext.queryTerms.includes("Louis Vuitton"));
  assert.ok(brandIntel.sourceArchitecture.selected.every((x) => x.onboardingMode !== null));

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

  const sourcesUrl = new URL("http://127.0.0.1/api/professional/sources?priority=P1&verticals=fashion-luxury");
  const sourcesResult = await professionalApi.handleProfessionalApi("/api/professional/sources", sourcesUrl, "GET", "");
  assert.equal(sourcesResult?.status, 200);
  assert.ok(sourcesResult?.data?.counts?.total > 0);
  assert.ok(sourcesResult?.data?.sources?.some((s) => s.id === "vogue-china"));

  const entitiesUrl = new URL("http://127.0.0.1/api/professional/entities?q=LV&priority=P1");
  const entitiesResult = await professionalApi.handleProfessionalApi("/api/professional/entities", entitiesUrl, "GET", "");
  assert.equal(entitiesResult?.status, 200);
  assert.equal(entitiesResult?.data?.resolved?.id, "louis-vuitton");

  const remoteWorkspaceAttempt = professionalApi.PROFESSIONAL_PUBLIC_READ_PATHS.has("/api/workspaces");
  assert.equal(remoteWorkspaceAttempt, false, "workspace mutations must never be public-read allowlisted");
  assert.equal(professionalApi.PROFESSIONAL_PUBLIC_READ_PATHS.has("/api/professional/sources"), true);
  assert.equal(professionalApi.PROFESSIONAL_PUBLIC_READ_PATHS.has("/api/professional/entities"), true);

  console.log(`PROFESSIONAL V2 TEST OK backend=${history.historyStoreInfo().backend} history=${depth.samples} forecast=${f.status}/${f.validation.grade} media=${med.evidenceCount} creators=${aud.evidence.creatorsObserved} sources=${allSources.length} entities=${brands.brandEntityCatalog("P1").length}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}