/**
 * TrendHub 启动包装器（跨平台，纯 Node，零外部依赖）。
 *
 * 客户端把启动命令指向本文件（替代直接跑 dist/src/index.js）：
 *   node scripts/launcher.mjs           # stdio（默认，MCP 通道）
 *   node scripts/launcher.mjs --http    # HTTP 模式（常开主机 / 手机接入）
 *   node scripts/launcher.mjs --ui      # 控制台模式
 *
 * 行为：
 *  1) 立即启动本地已构建的服务（stdio inherit，客户端秒连），透传 --http/--ui/--port。
 *  2) 启动约 1.5s 后在后台非阻塞检查 GitHub 更新：
 *     - 仅做一次轻量 ls-remote 比较 SHA（不传对象，数秒内完成）；
 *     - 发现新版本才 detached 拉起独立的 upgrade 进程完成 pull/install/build；
 *     - 重活在独立进程，不占用、不污染 stdio，且即使关闭客户端也能完成；
 *     - 非 git 目录 / 连不上 GitHub / 超时 / 本地有改动 -> 静默跳过，本次照常用旧版；
 *     - 设置 TRENTHUB_AUTOUPDATE=0 可完全关闭自动检查。
 *  3) 转发 SIGINT/SIGTERM/SIGHUP 与退出码。
 *
 * 关键不变量：launcher 自己的 console 只可能出现在 stderr，且仅用于致命错误；
 * 所有更新相关输出一律写 logs/autoupdate.log，绝不写入 stdout（MCP JSON-RPC 通道）。
 */
import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  INDEX_JS,
  LOG_DIR,
  AUTOUPDATE_LOG,
  ensureDir,
  appendLog,
  isBuilt,
  isGitRepo,
  currentBranch,
  localHeadSha,
  remoteHeadSha,
} from "./lib-trendhub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UPGRADE_MJS = join(HERE, "upgrade.mjs");

if (!isBuilt()) {
  console.error("[TrendHub] 未检测到构建产物（dist/）。请先在本目录运行：node scripts/setup.mjs");
  process.exit(1);
}

const passArgs = process.argv.slice(2);
const child = spawn(process.execPath, [INDEX_JS, ...passArgs], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

const forwardSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
for (const sig of forwardSignals) {
  process.on(sig, () => {
    try {
      child.kill(sig);
    } catch {
      /* 忽略 */
    }
  });
}

child.on("error", (e) => {
  console.error("[TrendHub] 服务启动失败：", e && e.message ? e.message : e);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    try {
      process.kill(process.pid, signal);
      return;
    } catch {
      process.exit(1);
    }
  }
  process.exit(code ?? 0);
});

/* ------------------------- 后台非阻塞更新调度 ------------------------- */

if (process.env.TRENTHUB_AUTOUPDATE !== "0") {
  const kick = setTimeout(() => {
    scheduleBackgroundUpdate().catch((e) =>
      appendLog(AUTOUPDATE_LOG, `[${new Date().toISOString()}] launcher 调度异常（忽略，不影响使用）：${(e && e.message) || e}`),
    );
  }, 1500);
  if (typeof kick.unref === "function") kick.unref();
}

async function scheduleBackgroundUpdate() {
  if (!(await isGitRepo())) return; // ZIP 安装等：直接不检查
  const branch = await currentBranch();
  const local = await localHeadSha();
  const remote = await remoteHeadSha(branch, 6_000);
  if (!remote) return; // 连不上 GitHub（国内网络常见）：静默用本地版
  if (remote === local) return; // 已是最新

  ensureDir(LOG_DIR);
  appendLog(
    AUTOUPDATE_LOG,
    `[${new Date().toISOString()}] 检测到新版本 ${remote.slice(0, 7)}（本地 ${local.slice(0, 7)}）；本次仍运行本版，交由后台进程更新，重启客户端生效`,
  );

  // 重活交给独立 detached 进程，stdout/stderr 直接落日志文件，绝不经过 MCP 通道。
  let fd;
  try {
    fd = openSync(AUTOUPDATE_LOG, "a");
  } catch {
    fd = null;
  }
  const up = spawn(process.execPath, [UPGRADE_MJS, "--background"], {
    cwd: ROOT,
    detached: true,
    stdio: fd === null ? ["ignore", "ignore", "ignore"] : ["ignore", fd, fd],
    windowsHide: true,
    env: process.env,
  });
  up.on("error", () => {});
  if (fd !== null) {
    try {
      closeSync(fd);
    } catch {
      /* 忽略 */
    }
  }
  up.unref();
}
