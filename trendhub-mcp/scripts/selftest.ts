/**
 * Source Health：真实拉取注册平台与关键辅助信源，输出机器可读健康报告。
 * 这是第三方可用性观测，不属于 release gate；单个平台临时不可用不会伪装成代码失败。
 * 运行：npm run source:health
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { getMany, listPlatforms } from "../src/sources/index.js";
import { interestOverTime, relatedQueries } from "../src/sources/googleTrends.js";
import { futureSignals } from "../src/sources/rss.js";
import { upcomingEvents } from "../src/sources/events.js";
import { sentiment } from "../src/analysis/sentiment.js";
import { listTemplates } from "../src/analysis/produce.js";
import { listSourceReliability } from "../src/store/reliability.js";
import { historyDepth } from "../src/store/history.js";

function fmt(ms: number): string {
  return `${ms}ms`;
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const rows: { name: string; status: string; detail: string }[] = [];
  const platforms = listPlatforms();
  const names = platforms.map((p) => p.platform);

  // 1) 全注册热榜平台：getMany 内部分批并行；每次结果自动进入 Reliability 观测。
  const hotStarted = Date.now();
  const hotResults = await getMany(names, 20);
  for (const r of hotResults) {
    rows.push({
      name: r.platform.padEnd(24),
      status: r.dataQuality === "ok" ? "OK  " : r.dataQuality === "degraded" ? "DEGR" : "MISS",
      detail: `n=${String(r.items.length).padStart(2)} ${r.note ? "| " + r.note.slice(0, 80) : ""}`,
    });
  }

  // 2) Google Trends
  const t1 = Date.now();
  const curve = await interestOverTime(["AI"], "US", "today 3-m");
  rows.push({ name: "gtrends-curve".padEnd(24), status: curve.dataQuality === "ok" ? "OK  " : "MISS", detail: `${fmt(Date.now() - t1)} points=${curve.points.length} ${curve.note ?? ""}`.slice(0, 110) });

  const t2 = Date.now();
  const rq = await relatedQueries("AI", "US");
  rows.push({ name: "gtrends-related".padEnd(24), status: rq.dataQuality === "ok" ? "OK  " : "DEGR", detail: `${fmt(Date.now() - t2)} top=${rq.top.length} rising=${rq.rising.length} ${rq.note ?? ""}`.slice(0, 110) });

  // 3) 未来信号 RSS
  const t4 = Date.now();
  const future = await futureSignals({ limit: 30, perSource: 4 });
  rows.push({ name: "future-rss".padEnd(24), status: future.dataQuality === "ok" ? "OK  " : future.dataQuality === "degraded" ? "DEGR" : "MISS", detail: `${fmt(Date.now() - t4)} articles=${future.total} sourcesOk=${future.sourceStatus.filter((s) => s.ok).length}/${future.sourceStatus.length}` });

  // 4) 内置确定性能力 sanity
  const ev = upcomingEvents({ daysAhead: 120 });
  rows.push({ name: "events-calendar".padEnd(24), status: ev.total ? "OK  " : "MISS", detail: `events=${ev.total}` });
  const s1 = sentiment("这个产品真的非常好用，强烈推荐！");
  const s2 = sentiment("又翻车了，质量太差，非常失望");
  rows.push({ name: "sentiment".padEnd(24), status: s1.label === "positive" && s2.label === "negative" ? "OK  " : "DEGR", detail: `pos=${s1.score} neg=${s2.score}` });
  const tpl = listTemplates();
  rows.push({ name: "templates".padEnd(24), status: tpl.length ? "OK  " : "MISS", detail: `count=${tpl.length}` });

  const reliability = listSourceReliability(names);
  const report = {
    schemaVersion: 1,
    generatedAt,
    runDurationMs: Date.now() - Date.parse(generatedAt),
    hotFetchDurationMs: Date.now() - hotStarted,
    registeredPlatformCount: platforms.length,
    hotSummary: {
      ok: hotResults.filter((r) => r.dataQuality === "ok").length,
      degraded: hotResults.filter((r) => r.dataQuality === "degraded").length,
      missing: hotResults.filter((r) => r.dataQuality === "missing").length,
    },
    reliability,
    history: names.map((platform) => ({ platform, ...historyDepth(platform) })),
    auxiliary: {
      googleTrendsCurve: { dataQuality: curve.dataQuality, points: curve.points.length },
      googleTrendsRelated: { dataQuality: rq.dataQuality, top: rq.top.length, rising: rq.rising.length },
      futureRss: { dataQuality: future.dataQuality, articles: future.total, sourceOk: future.sourceStatus.filter((s) => s.ok).length, sourceTotal: future.sourceStatus.length },
      eventCount: ev.total,
      templateCount: tpl.length,
    },
    semantics: "UP/DOWN is observed source availability, not code correctness; auth-required sources may be expected without local credentials.",
  };

  const healthDir = path.join(config.dataDir, "health");
  fs.mkdirSync(healthDir, { recursive: true });
  fs.writeFileSync(path.join(healthDir, "source-health-latest.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n================ TrendHub Source Health ================");
  for (const r of rows) console.log(`${r.status} ${r.name} ${r.detail}`);
  console.log(`\n注册平台: ${platforms.length}; hot OK=${report.hotSummary.ok} DEGRADED=${report.hotSummary.degraded} MISSING=${report.hotSummary.missing}`);
  console.log("机器可读报告: data/health/source-health-latest.json");
  console.log("说明：第三方源状态与代码发布门禁分离；缺失/登录要求/限流会被如实量化，不会伪造成功。\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("source-health failed:", e);
  process.exit(1);
});
