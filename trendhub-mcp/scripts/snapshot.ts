/**
 * 定时快照 CLI：拉取核心平台榜单并落本地快照，供 trend_change_alerts 做新晋/飙升/掉榜对比。
 * 运行：npm run snapshot
 * 建议挂系统计划任务（如每 1-2 小时一次）；不挂也能用——get_trending 查询时会自动积累快照。
 */
import { takeSnapshots } from "../src/store/snapshot.js";

async function main(): Promise<void> {
  const platforms = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const report = await takeSnapshots(platforms.length ? platforms : undefined);
  const ok = report.filter((r) => r.ok).length;
  for (const r of report) {
    console.log(`${r.ok ? "OK  " : "FAIL"} ${r.platform.padEnd(20)} items=${r.items}`);
  }
  console.log(`\n快照完成：${ok}/${report.length} 个平台成功，时间 ${new Date().toISOString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
