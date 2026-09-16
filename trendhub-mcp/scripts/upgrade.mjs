/**
 * TrendHub 手动 / 后台升级脚本。
 *
 * 只升级到 GitHub 最新 Stable Release，不跟随 main HEAD。
 * 更新失败时共享库会尽力回滚到升级前版本。
 */
import { AUTOUPDATE_LOG, appendLog, updateOnce } from "./lib-trendhub.mjs";

const background = process.argv.includes("--background");

if (background) {
  appendLog(AUTOUPDATE_LOG, `\n===== [${new Date().toISOString()}] 后台 Stable Release 升级进程启动 =====`);
  const r = await updateOnce({ log: (m) => appendLog(AUTOUPDATE_LOG, m), background: true });
  appendLog(AUTOUPDATE_LOG, `后台升级进程结束：${JSON.stringify(r)}`);
  process.exit(0);
}

console.log("TrendHub 手动升级：GitHub Stable Release -> 锁定依赖 -> 构建");
console.log("-".repeat(68));
const r = await updateOnce({ log: (m) => console.log(m), background: false });
console.log("-".repeat(68));

switch (r?.skipped) {
  case "not-git":
    console.log("当前安装不是 git clone（可能来自 Download ZIP），无法自动切换 Stable Release。");
    console.log("请重新 git clone 仓库后执行 node scripts/setup.mjs；本地 data/ 与环境变量请自行保留。");
    process.exit(0);
  case "dirty-worktree":
    console.log("检测到已跟踪文件有本地修改，为避免覆盖修改，本次升级已跳过。");
    process.exit(0);
  case "unreachable-or-no-release":
    console.log("暂时无法读取 GitHub Stable Release（网络受限、超时或尚未发布）。当前版本继续可用。");
    process.exit(0);
  case "invalid-version":
    console.log("本地或远端版本号不是稳定版 x.y.z 格式，本次不自动升级。当前版本继续可用。");
    process.exit(0);
  default:
    break;
}

if (r?.error) {
  console.error(`升级未完成：${r.error}。${r.rolledBack ? "已回滚到升级前版本。" : "请检查 logs/autoupdate.log 或当前 git 状态。"}`);
  process.exit(1);
}

if (r?.updated) {
  console.log(`已安全更新到 ${r.tag} 并完成构建。请完全退出并重启 AI 客户端。`);
  console.log("验证：npm test && npm run smoke；外部信源体检另运行 npm run source:health。");
  process.exit(0);
}

console.log(`已在当前或更新版本（${r?.version ?? "unknown"}），无需升级。`);
process.exit(0);
