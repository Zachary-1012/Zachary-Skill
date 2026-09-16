/**
 * TrendHub 安装 / 升级 / 启动包装器共享库（纯 Node ESM，零外部依赖）。
 *
 * 设计原则：
 *  - 跨平台（Windows / macOS / Linux），不依赖 shell 语法（&&、管道等）。
 *  - 所有网络操作都带硬超时；git 禁止交互式凭据提示，避免挂起。
 *  - 任何更新失败都不得抛出到调用方之外：updateOnce 永远返回结构化结果。
 *  - 后台更新绝不占用 MCP 的 stdio：子进程输出要么捕获、要么写日志文件，
 *    绝不 inherit 到正在跑 JSON-RPC 的 stdout。
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** 向上查找包含 package.json 且含 data/templates.json 的目录作为包根。 */
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "data", "templates.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(HERE, "..");
}

export const ROOT = findRoot(HERE);
export const INDEX_JS = join(ROOT, "dist", "src", "index.js");
export const LOG_DIR = join(ROOT, "logs");
export const AUTOUPDATE_LOG = join(LOG_DIR, "autoupdate.log");
export const PACKAGE_JSON = join(ROOT, "package.json");

const REGISTRY_OFFICIAL = "https://registry.npmjs.org/";
const REGISTRY_CN = "https://registry.npmmirror.com/";

function nowIso() {
  return new Date().toISOString();
}

/** 确保目录存在（静默）。 */
export function ensureDir(dir) {
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* 已存在或无权限，忽略 */
  }
}

/** 追加一行文本到日志文件（失败静默，日志绝不能影响主流程）。 */
export function appendLog(file, line) {
  try {
    ensureDir(dirname(file));
    appendFileSync(file, `${line}\n`, { encoding: "utf8" });
  } catch {
    /* 忽略日志错误 */
  }
}

/**
 * 统一执行外部命令。
 * @returns Promise<{code,stdout,stderr,durationMs,ok,timedOut}>
 *   mode: "capture"(默认,收集文本) | "inherit"(前台直连) | "ignore"(丢弃) | "log"(追加到 opts.logPath)
 */
export function exec(cmd, args = [], opts = {}) {
  const mode = opts.mode || "capture";
  const cwd = opts.cwd || ROOT;
  const timeoutMs = opts.timeoutMs || 60_000;
  const isWin = process.platform === "win32";
  // Windows 下 npm 是 npm.cmd，需要 shell 才能稳定拉起。
  const useShell = isWin && (cmd === "npm" || cmd === "npm.cmd");
  const realCmd = isWin && cmd === "npm" ? "npm.cmd" : cmd;

  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0", // 禁止 git 弹出用户名/密码而挂起
    GCM_INTERACTIVE: "never",
    npm_config_audit: "false",
    npm_config_fund: "false",
    ...(opts.env || {}),
  };

  const stdio =
    mode === "inherit"
      ? ["inherit", "inherit", "inherit"]
      : mode === "ignore"
        ? ["ignore", "ignore", "ignore"]
        : ["ignore", "pipe", "pipe"];

  return new Promise((resolvePromise) => {
    const started = Date.now();
    let child;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    try {
      child = spawn(realCmd, args, { cwd, env, shell: useShell, stdio, windowsHide: true });
    } catch (e) {
      resolvePromise({
        code: -1,
        ok: false,
        stdout: "",
        stderr: String((e && e.message) || e),
        durationMs: 0,
        timedOut: false,
      });
      return;
    }

    const pushText = (text, isErr) => {
      if (mode === "log" && opts.logPath) {
        appendFileSync(opts.logPath, text, { encoding: "utf8" });
        return;
      }
      if (mode === "capture") {
        if (isErr) {
          stderr += text;
          if (stderr.length > 200_000) stderr = stderr.slice(-64_000);
        } else {
          stdout += text;
          if (stdout.length > 200_000) stdout = stdout.slice(-64_000);
        }
      }
    };

    if (child.stdout) child.stdout.on("data", (b) => pushText(b.toString(), false));
    if (child.stderr) child.stderr.on("data", (b) => pushText(b.toString(), true));

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill(isWin ? undefined : "SIGTERM");
        if (isWin) {
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        }
      } catch {
        /* 忽略 */
      }
    }, timeoutMs);
    if (typeof timer.unref === "function") timer.unref();

    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({
        code: code === null ? -1 : code,
        ok: code === 0,
        stdout,
        stderr,
        durationMs: Date.now() - started,
        timedOut,
      });
    };

    child.on("error", () => finish(-1));
    child.on("close", finish);
  });
}

/* ------------------------------ git 相关 ------------------------------ */

export async function isGitRepo() {
  const r = await exec("git", ["rev-parse", "--is-inside-work-tree"], { mode: "capture", timeoutMs: 8_000 });
  return r.ok && r.stdout.trim() === "true";
}

export async function currentBranch() {
  const r = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { mode: "capture", timeoutMs: 8_000 });
  const b = r.ok ? r.stdout.trim() : "";
  return b && b !== "HEAD" ? b : "main";
}

export async function localHeadSha() {
  const r = await exec("git", ["rev-parse", "HEAD"], { mode: "capture", timeoutMs: 8_000 });
  return r.ok ? r.stdout.trim() : "";
}

/** 一次轻量 ls-remote 取远端 HEAD sha（不传对象，比 fetch 快）。 */
export async function remoteHeadSha(branch, timeoutMs = 8_000) {
  const r = await exec("git", ["ls-remote", "origin", `refs/heads/${branch}`], {
    mode: "capture",
    timeoutMs,
  });
  if (!r.ok) return null;
  const line = r.stdout.split(/\r?\n/).find((l) => l.includes(`refs/heads/${branch}`));
  if (!line) return null;
  const sha = line.trim().split(/\s+/)[0];
  return /^[0-9a-f]{40}$/.test(sha || "") ? sha : null;
}

export async function fastForwardPull(branch, timeoutMs = 60_000, mode = "capture", logPath) {
  return exec("git", ["pull", "--ff-only", "origin", branch], { mode, logPath, timeoutMs });
}

/* ------------------------------ npm 相关 ------------------------------ */

function pingRegistry(url, timeoutMs) {
  const base = url.endsWith("/") ? url : `${url}/`;
  const started = Date.now();
  return fetch(`${base}-/ping?write=true`, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  })
    .then((res) => ({ url, ok: res.status < 500, ms: Date.now() - started }))
    .catch(() =>
      // 某些镜像不支持 /-/ping，回退探测根路径
      fetch(base, { method: "HEAD", signal: AbortSignal.timeout(timeoutMs) })
        .then((res) => ({ url, ok: res.status < 500, ms: Date.now() - started }))
        .catch(() => ({ url, ok: false, ms: Number.POSITIVE_INFINITY })),
    );
}

/**
 * 选择最快且可达的 npm registry。
 * @param prefer "auto"(默认) | "cn" | "global" | 具体 registry URL
 * @returns registry URL，或 null（使用系统默认，不追加 --registry）
 */
export async function selectRegistry(prefer = "auto", timeoutMs = 4_000) {
  if (prefer === "cn") return REGISTRY_CN;
  if (prefer === "global") return REGISTRY_OFFICIAL;
  if (prefer && prefer.startsWith("http")) return prefer;
  // 已显式配置 registry（环境变量 / .npmrc）时予以尊重，不覆盖。
  if (process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY) return null;

  const [official, cn] = await Promise.all([
    pingRegistry(REGISTRY_OFFICIAL, timeoutMs),
    pingRegistry(REGISTRY_CN, timeoutMs),
  ]);
  if (official.ok && cn.ok) return official.ms <= cn.ms ? REGISTRY_OFFICIAL : REGISTRY_CN;
  if (cn.ok) return REGISTRY_CN;
  if (official.ok) return REGISTRY_OFFICIAL;
  return null; // 都探测不到：交给 npm 系统默认，避免选源逻辑反而阻断安装
}

export function npmInstallArgs(registry) {
  const args = ["install", "--no-audit", "--no-fund", "--no-progress"];
  if (registry) args.push(`--registry=${registry}`);
  return args;
}

export async function npmInstall({ registry, mode = "inherit", logPath, timeoutMs = 600_000 } = {}) {
  return exec("npm", npmInstallArgs(registry), { mode, logPath, timeoutMs });
}

export async function npmBuild({ mode = "inherit", logPath, timeoutMs = 180_000 } = {}) {
  return exec("npm", ["run", "build"], { mode, logPath, timeoutMs });
}

export function hashPackageJson() {
  try {
    return createHash("sha256").update(readFileSync(PACKAGE_JSON)).digest("hex");
  } catch {
    return "";
  }
}

/* ------------------------------ 更新编排 ------------------------------ */

/**
 * 一次完整的“检查并更新”。永不抛出，返回结构化结果。
 * @param {object} o
 * @param {(msg:string)=>void} [o.log] 日志函数（前台传 console.log；后台传写文件函数）
 * @param {boolean} [o.background] 后台模式：install/build 输出写日志文件
 */
export async function updateOnce({ log = () => {}, background = false } = {}) {
  const stepMode = background ? "log" : "inherit";
  const logPath = background ? AUTOUPDATE_LOG : undefined;
  const t = (m) => {
    try {
      log(`[${nowIso()}] ${m}`);
    } catch {
      /* 忽略 */
    }
  };

  try {
    if (!(await isGitRepo())) {
      t("skip: 非 git 工作目录（可能是 ZIP 解压安装），不自动更新");
      return { skipped: "not-git" };
    }
    const branch = await currentBranch();
    const local = await localHeadSha();
    t(`检查更新 branch=${branch} local=${local.slice(0, 7)}`);

    const remote = await remoteHeadSha(branch, 8_000);
    if (!remote) {
      t("skip: 无法连接 GitHub 获取远端版本（网络受限/超时），继续使用本地版本");
      return { skipped: "unreachable" };
    }
    if (remote === local) {
      t("已是最新");
      return { updated: false };
    }

    t(`发现新版本 ${remote.slice(0, 7)}，开始快进更新`);
    const beforeHash = hashPackageJson();
    const pull = await fastForwardPull(branch, 60_000, stepMode, logPath);
    if (!pull.ok) {
      t(`更新中止: git pull --ff-only 失败（本地改动/冲突/网络中断），保留当前版本。${(pull.stderr || "").trim()}`);
      return { error: "pull-failed", detail: pull.stderr || pull.stdout };
    }

    const afterHash = hashPackageJson();
    if (afterHash && afterHash !== beforeHash) {
      t("依赖清单变化，安装依赖（自动选择最快 npm 源）");
      const registry = await selectRegistry("auto", 4_000);
      const inst = await npmInstall({ registry, mode: stepMode, logPath, timeoutMs: 600_000 });
      if (!inst.ok) {
        t(`依赖安装失败，已保留源码更新但构建可能未完成：${(inst.stderr || "").trim().slice(-500)}`);
        return { error: "install-failed", updated: true };
      }
    } else {
      t("依赖无变化，跳过安装");
    }

    t("构建 dist");
    const build = await npmBuild({ mode: stepMode, logPath, timeoutMs: 180_000 });
    if (!build.ok) {
      t(`构建失败，当前运行版本不受影响，下次启动会重试：${(build.stderr || "").trim().slice(-500)}`);
      return { error: "build-failed", updated: true };
    }

    t(`更新完成 -> ${remote.slice(0, 7)}，重启 AI 客户端后生效`);
    return { updated: true, sha: remote };
  } catch (e) {
    t(`更新异常（已忽略，不影响使用）：${(e && e.message) || String(e)}`);
    return { error: "exception", detail: String((e && e.message) || e) };
  }
}

/** 判断 dist 是否已构建（入口是否存在）。 */
export function isBuilt() {
  try {
    return existsSync(INDEX_JS) && statSync(INDEX_JS).size > 0;
  } catch {
    return false;
  }
}
