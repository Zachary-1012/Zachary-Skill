/**
 * 自检：真实拉取每个数据源，输出可用性/条数/耗时，用于安装验证与排障。
 * 运行：npm run selftest
 */
import { getHot, listPlatforms } from "../src/sources/index.js";
import { interestOverTime, relatedQueries } from "../src/sources/googleTrends.js";
import { futureSignals } from "../src/sources/rss.js";
import { upcomingEvents } from "../src/sources/events.js";
import { sentiment } from "../src/analysis/sentiment.js";
import { listTemplates } from "../src/analysis/produce.js";

const PLATFORMS = [
  "weibo", "zhihu", "baidu", "bilibili", "douyin", "toutiao", "ithome",
  "juejin", "csdn", "v2ex", "thepaper", "qq-news",
  "hackernews", "github-trending", "producthunt", "reddit-technology",
];

function fmt(ms: number): string {
  return `${ms}ms`;
}

async function main(): Promise<void> {
  const rows: { name: string; status: string; detail: string }[] = [];

  // 1) 热榜平台
  for (const p of PLATFORMS) {
    const t = Date.now();
    const r = await getHot(p, 20);
    rows.push({
      name: p.padEnd(18),
      status: r.dataQuality === "ok" ? "OK  " : r.dataQuality === "degraded" ? "DEGR" : "MISS",
      detail: `${fmt(Date.now() - t).padStart(7)} n=${String(r.items.length).padStart(2)} ${r.note ? "| " + r.note.slice(0, 60) : ""}`,
    });
  }

  // 2) Google Trends
  const t1 = Date.now();
  const curve = await interestOverTime(["AI"], "US", "today 3-m");
  rows.push({ name: "gtrends-curve".padEnd(18), status: curve.dataQuality === "ok" ? "OK  " : "MISS", detail: `${fmt(Date.now() - t1)} points=${curve.points.length} ${curve.note ?? ""}`.slice(0, 90) });

  const t2 = Date.now();
  const rq = await relatedQueries("AI", "US");
  rows.push({ name: "gtrends-related".padEnd(18), status: rq.dataQuality === "ok" ? "OK  " : "DEGR", detail: `${fmt(Date.now() - t2)} top=${rq.top.length} rising=${rq.rising.length} ${rq.note ?? ""}`.slice(0, 90) });

  // 3) 未来信号 RSS
  const t4 = Date.now();
  const fs = await futureSignals({ limit: 30, perSource: 4 });
  rows.push({ name: "future-rss".padEnd(18), status: fs.dataQuality, detail: `${fmt(Date.now() - t4)} articles=${fs.total} sourcesOk=${fs.sourceStatus.filter((s) => s.ok).length}/${fs.sourceStatus.length}` });

  // 4) 节点日历
  const ev = upcomingEvents({ daysAhead: 120 });
  rows.push({ name: "events-calendar".padEnd(18), status: ev.total ? "OK  " : "MISS", detail: `events=${ev.total}` });

  // 5) 情感引擎
  const s1 = sentiment("这个产品真的非常好用，强烈推荐！");
  const s2 = sentiment("又翻车了，质量太差，非常失望");
  const sentOk = s1.label === "positive" && s2.label === "negative";
  rows.push({ name: "sentiment".padEnd(18), status: sentOk ? "OK  " : "DEGR", detail: `pos=${s1.score} neg=${s2.score}` });

  // 6) 模板库
  const tpl = listTemplates();
  rows.push({ name: "templates".padEnd(18), status: tpl.length ? "OK  " : "MISS", detail: `count=${tpl.length}` });

  console.log("\n================ TrendHub 自检报告 ================");
  for (const r of rows) console.log(`${r.status} ${r.name} ${r.detail}`);
  const ok = rows.filter((r) => r.status.trim() === "OK").length;
  console.log(`\n平台总数(注册表): ${listPlatforms().length}`);
  console.log(`通过 ${ok}/${rows.length}。MISS 多为当前网络无法访问该平台或上游临时变动，不影响其他工具。`);
  console.log("==================================================\n");
  // 主动退出：聚合源可能持有连接池/定时器，避免进程挂住
  process.exit(0);
}

main().catch((e) => {
  console.error("selftest failed:", e);
  process.exit(1);
});
