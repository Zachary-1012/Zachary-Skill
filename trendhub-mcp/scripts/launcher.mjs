/**
 * TrendHub 启动包装器（跨平台，纯 Node，零外部依赖）。
 *
 * 行为：
 *  1) 立即启动本地已构建服务，保证 AI 客户端秒连。
 *  2) 启动约 1.5s 后后台检查 GitHub 最新 Stable Release：
 *     - 只比较正式 release 版本，不追 main HEAD；
 *     - 仅发现更高 stable 版本时才拉起独立 upgrade 进程；
 *     - 更新失败会尽力回滚，不污染 MCP stdout；
 *     - TRENTHUB_AUTOUPDATE=0 可关闭。
 *  3) 转发 SIGINT/SIGTERM/SIGHUP 与退出码。
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
  latestStableRelease,
  currentPackageVersion,
  compareStableVersions,
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

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    try {
      child.kill(sig);
    } catch {
      /* ignore */
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

if (process.env.TRENTHUB_AUTOUPDATE !== "0") {
  const kick = setTimeout(() => {
    scheduleBackgroundUpdate().catch((e) =>
      appendLog(AUTOUPDATE_LOG, `[${new Date().toISOString()}] launcher 调度异常（忽略，不影响使用）：${(e && e.message) || e}`),
    );
  }, 1500);
  if (typeof kick.unref === "function") kick.unref();
}

async function scheduleBackgroundUpdate() {
  if (!(await isGitRepo())) return;
  const release = await latestStableRelease(6_000);
  if (!release) return;

  const current = currentPackageVersion();
  const cmp = compareStableVersions(release.version, current);
  if (cmp === null || cmp <= 0) return;

  ensureDir(LOG_DIR);
  appendLog(
    AUTOUPDATE_LOG,
    `[${new Date().toISOString()}] 检测到 Stable Release ${release.tag}（当前 ${current}）；本次继续运行当前版本，后台安全更新，重启客户端后生效`,
  );

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
      /* ignore */
    }
  }
  up.unref();
}
