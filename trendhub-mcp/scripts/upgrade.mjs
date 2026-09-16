/**
 * TrendHub 手动升级脚本（跨平台，纯 Node，零外部依赖）。
 *
 * 前台人工升级：
 *   node scripts/upgrade.mjs
 * 后台静默升级（由 launcher 的 detached 进程调用，输出全落 logs/autoupdate.log）：
 *   node scripts/upgrade.mjs --background
 *
 * 失败安全：git 连不上 / 非 git 目录 / pull 冲突 / 安装构建失败，
 * 都不会删除或破坏当前已安装版本，当前版本仍可正常启动使用。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTOUPDATE_LOG, appendLog, updateOnce } from "./lib-trendhub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
void HERE;
const background = process.argv.includes("--background");

if (background) {
  appendLog(AUTOUPDATE_LOG, `\n===== [${new Date().toISOString()}] 后台升级进程启动 =====`);
  const r = await updateOnce({ log: (m) => appendLog(AUTOUPDATE_LOG, m), background: true });
  appendLog(AUTOUPDATE_LOG, `后台升级进程结束：${JSON.stringify(r)}`);
  process.exit(0);
}

console.log("TrendHub 手动升级：git pull(ff-only) -> 按需装依赖 -> 重新构建");
console.log("-".repeat(64));
const r = await updateOnce({ log: (m) => console.log(m), background: false });
console.log("-".repeat(64));

switch (r?.skipped) {
  case "not-git":
    console.log("当前安装不是 git 克隆（可能是网页 Download ZIP 解压），无法 git pull。");
    console.log("办法：重新 git clone 或重新下载 ZIP 覆盖安装（本地 data/ 快照与 .env 另行备份）。");
    console.log("设置 TRENTHUB_AUTOUPDATE=0 可关闭启动时的自动检查。");
    process.exit(0);
  case "unreachable":
    console.log("连不上 GitHub（国内网络常见）。当前版本完全可用，自动/手动更新只是暂未执行。");
    console.log("可稍后重试，或在网络/代理恢复后再跑一次；也可设 TRENTHUB_AUTOUPDATE=0 关闭检查。");
    process.exit(0);
  default:
    break;
}

if (r?.error) {
  console.error(`升级未完成：${r.error}。当前已装版本仍可正常使用，不影响接入。`);
  console.error("可稍后重跑 node scripts/upgrade.mjs；若为网络问题可用代理或镜像。");
  process.exit(1);
}

if (r?.updated) {
  console.log("已更新到最新版并完成构建。请完全退出并重启 AI 客户端（HTTP 模式重启 npm run start:http / ui）。");
  console.log("验证：node scripts/smoke.mjs（数秒，不联网）；排障再跑 npm run selftest（约 2 分钟，真实取数）。");
  process.exit(0);
}

console.log("已是最新版本，无需更新。");
process.exit(0);
