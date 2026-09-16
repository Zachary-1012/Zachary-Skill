/**
 * TrendHub 安装 / 升级 / 启动包装器共享库（纯 Node ESM，零外部依赖）。
 *
 * 设计原则：
 *  - 跨平台（Windows / macOS / Linux），不依赖 shell 语法（&&、管道等）。
 *  - 安装使用 package-lock.json + npm ci，保证可重复依赖图。
 *  - 自动更新只跟随 GitHub Stable Release，不追 main HEAD。
 *  - 任何更新失败都返回结构化结果，并尽力回滚到更新前版本。
 *  - 后台更新绝不占用 MCP 的 stdio：子进程输出写日志，不污染 JSON-RPC stdout。
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "data", "templates.json"))) return dir;
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
export const PACKAGE_LOCK = join(ROOT, "package-lock.json");

const REGISTRY_OFFICIAL = "https://registry.npmjs.org/";
const REGISTRY_CN = "https://registry.npmmirror.com/";
const RELEASE_API = "https://api.github.com/repos/Zachary-1012/Zachary-Skill/releases/latest";

function nowIso() {
  return new Date().toISOString();
}

export function ensureDir(dir) {
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* 日志目录失败不应影响主流程 */
  }
}

export function appendLog(file, line) {
  try {
    ensureDir(dirname(file));
    appendFileSync(file, `${line}\n`, { encoding: "utf8" });
  } catch {
    /* 日志错误静默 */
  }
}

/**
 * 统一执行外部命令。
 * mode: capture | inherit | ignore | log
 */
export function exec(cmd, args = [], opts = {}) {
  const mode = opts.mode || "capture";
  const cwd = opts.cwd || ROOT;
  const timeoutMs = opts.timeoutMs || 60_000;
  const isWin = process.platform === "win32";
  const useShell = isWin && (cmd === "npm" || cmd === "npm.cmd");
  const realCmd = isWin && cmd === "npm" ? "npm.cmd" : cmd;

  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
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
        try {
          appendFileSync(opts.logPath, text, { encoding: "utf8" });
        } catch {
          /* ignore */
        }
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
        if (isWin) spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      } catch {
        /* ignore */
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

/* ------------------------------ git ------------------------------ */

export async function isGitRepo() {
  const r = await exec("git", ["rev-parse", "--is-inside-work-tree"], { mode: "capture", timeoutMs: 8_000 });
  return r.ok && r.stdout.trim() === "true";
}

export async function currentBranch() {
  const r = await exec("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], { mode: "capture", timeoutMs: 8_000 });
  return r.ok ? r.stdout.trim() : "";
}

export async function localHeadSha() {
  const r = await exec("git", ["rev-parse", "HEAD"], { mode: "capture", timeoutMs: 8_000 });
  return r.ok ? r.stdout.trim() : "";
}

export async function trackedWorktreeClean() {
  const r = await exec("git", ["status", "--porcelain", "--untracked-files=no"], { mode: "capture", timeoutMs: 8_000 });
  return r.ok && r.stdout.trim() === "";
}

async function fetchReleaseTag(tag, mode, logPath) {
  return exec("git", ["fetch", "--force", "--depth", "1", "origin", `refs/tags/${tag}:refs/tags/${tag}`], {
    mode,
    logPath,
    timeoutMs: 90_000,
  });
}

async function checkoutRef(ref, mode, logPath) {
  return exec("git", ["checkout", "--quiet", ref], { mode, logPath, timeoutMs: 30_000 });
}

async function checkoutReleaseTag(tag, mode, logPath) {
  return exec("git", ["checkout", "--quiet", "--detach", `refs/tags/${tag}`], { mode, logPath, timeoutMs: 30_000 });
}

/* ------------------------------ npm ------------------------------ */

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
      fetch(base, { method: "HEAD", signal: AbortSignal.timeout(timeoutMs) })
        .then((res) => ({ url, ok: res.status < 500, ms: Date.now() - started }))
        .catch(() => ({ url, ok: false, ms: Number.POSITIVE_INFINITY })),
    );
}

export async function selectRegistry(prefer = "auto", timeoutMs = 4_000) {
  if (prefer === "cn") return REGISTRY_CN;
  if (prefer === "global") return REGISTRY_OFFICIAL;
  if (prefer && prefer.startsWith("http")) return prefer;
  if (process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY) return null;

  const [official, cn] = await Promise.all([
    pingRegistry(REGISTRY_OFFICIAL, timeoutMs),
    pingRegistry(REGISTRY_CN, timeoutMs),
  ]);
  if (official.ok && cn.ok) return official.ms <= cn.ms ? REGISTRY_OFFICIAL : REGISTRY_CN;
  if (cn.ok) return REGISTRY_CN;
  if (official.ok) return REGISTRY_OFFICIAL;
  return null;
}

export function npmInstallArgs(registry) {
  const args = ["ci", "--no-audit", "--no-fund", "--no-progress"];
  if (registry) args.push(`--registry=${registry}`);
  return args;
}

export async function npmInstall({ registry, mode = "inherit", logPath, timeoutMs = 600_000 } = {}) {
  if (!existsSync(PACKAGE_LOCK)) {
    return {
      code: -1,
      ok: false,
      stdout: "",
      stderr: "package-lock.json is required for deterministic installation",
      durationMs: 0,
      timedOut: false,
    };
  }
  return exec("npm", npmInstallArgs(registry), { mode, logPath, timeoutMs });
}

export async function npmBuild({ mode = "inherit", logPath, timeoutMs = 180_000 } = {}) {
  return exec("npm", ["run", "build"], { mode, logPath, timeoutMs });
}

export function hashDependencyState() {
  try {
    const h = createHash("sha256");
    h.update(readFileSync(PACKAGE_JSON));
    h.update(readFileSync(PACKAGE_LOCK));
    return h.digest("hex");
  } catch {
    return "";
  }
}

export function currentPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/* ------------------------------ release channel ------------------------------ */

function parseStableVersion(version) {
  const m = String(version).trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  return m ? m.slice(1).map(Number) : null;
}

export function compareStableVersions(a, b) {
  const av = parseStableVersion(a);
  const bv = parseStableVersion(b);
  if (!av || !bv) return null;
  for (let i = 0; i < 3; i += 1) {
    if (av[i] > bv[i]) return 1;
    if (av[i] < bv[i]) return -1;
  }
  return 0;
}

export async function latestStableRelease(timeoutMs = 8_000) {
  try {
    const res = await fetch(RELEASE_API, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "TrendHub-MCP-Updater",
        "x-github-api-version": "2022-11-28",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const tag = typeof body?.tag_name === "string" ? body.tag_name.trim() : "";
    if (body?.draft || body?.prerelease || !/^v\d+\.\d+\.\d+$/.test(tag)) return null;
    return {
      tag,
      version: tag.slice(1),
      htmlUrl: typeof body?.html_url === "string" ? body.html_url : "",
      publishedAt: typeof body?.published_at === "string" ? body.published_at : "",
    };
  } catch {
    return null;
  }
}

async function restorePreviousVersion({ branch, sha, dependencyChanged, registry, mode, logPath, t }) {
  const target = branch || sha;
  if (!target) return false;
  t(`开始回滚到更新前版本 ${branch || sha.slice(0, 7)}`);
  const checkout = await checkoutRef(target, mode, logPath);
  if (!checkout.ok) {
    t("回滚失败：无法恢复原 git ref，请手动检查安装目录");
    return false;
  }
  if (dependencyChanged && existsSync(PACKAGE_LOCK)) {
    await npmInstall({ registry, mode, logPath, timeoutMs: 600_000 });
  }
  await npmBuild({ mode, logPath, timeoutMs: 180_000 });
  t("已恢复更新前版本");
  return true;
}

/**
 * 检查并更新到 GitHub 最新 Stable Release。永不追 main HEAD。
 * 失败时尽力恢复更新前 branch/commit；后台模式只写日志。
 */
export async function updateOnce({ log = () => {}, background = false } = {}) {
  const stepMode = background ? "log" : "inherit";
  const logPath = background ? AUTOUPDATE_LOG : undefined;
  const t = (m) => {
    try {
      log(`[${nowIso()}] ${m}`);
    } catch {
      /* ignore */
    }
  };

  try {
    if (!(await isGitRepo())) {
      t("skip: 非 git 工作目录（ZIP 安装不会自动切换 release）");
      return { skipped: "not-git" };
    }
    if (!(await trackedWorktreeClean())) {
      t("skip: 检测到已跟踪文件的本地修改，为保护用户修改不自动更新");
      return { skipped: "dirty-worktree" };
    }

    const release = await latestStableRelease(8_000);
    if (!release) {
      t("skip: 无法读取 GitHub Stable Release（网络受限/尚未发布/超时），继续使用本地版本");
      return { skipped: "unreachable-or-no-release" };
    }

    const currentVersion = currentPackageVersion();
    const cmp = compareStableVersions(release.version, currentVersion);
    if (cmp === null) {
      t(`skip: 无法比较版本 current=${currentVersion} release=${release.version}`);
      return { skipped: "invalid-version" };
    }
    if (cmp <= 0) {
      t(`已在当前或更新版本 current=${currentVersion} stable=${release.version}`);
      return { updated: false, version: currentVersion };
    }

    const originalBranch = await currentBranch();
    const originalSha = await localHeadSha();
    const beforeDeps = hashDependencyState();
    t(`发现 Stable Release ${release.tag}（当前 ${currentVersion}），准备安全更新`);

    const fetchTag = await fetchReleaseTag(release.tag, stepMode, logPath);
    if (!fetchTag.ok) {
      t(`更新中止: 无法获取 release tag ${release.tag}`);
      return { error: "fetch-release-failed", detail: fetchTag.stderr || fetchTag.stdout };
    }

    const checkout = await checkoutReleaseTag(release.tag, stepMode, logPath);
    if (!checkout.ok) {
      t(`更新中止: 无法切换到 ${release.tag}`);
      return { error: "checkout-release-failed", detail: checkout.stderr || checkout.stdout };
    }

    const afterDeps = hashDependencyState();
    const dependencyChanged = !beforeDeps || !afterDeps || beforeDeps !== afterDeps;
    const registry = await selectRegistry("auto", 4_000);

    if (dependencyChanged) {
      t("release 依赖锁发生变化，执行 npm ci");
      const inst = await npmInstall({ registry, mode: stepMode, logPath, timeoutMs: 600_000 });
      if (!inst.ok) {
        t(`依赖安装失败：${(inst.stderr || "").trim().slice(-500)}`);
        await restorePreviousVersion({
          branch: originalBranch,
          sha: originalSha,
          dependencyChanged: true,
          registry,
          mode: stepMode,
          logPath,
          t,
        });
        return { error: "install-failed", rolledBack: true };
      }
    } else {
      t("release 依赖锁未变化，跳过 npm ci");
    }

    t("构建 release dist");
    const build = await npmBuild({ mode: stepMode, logPath, timeoutMs: 180_000 });
    if (!build.ok) {
      t(`release 构建失败：${(build.stderr || "").trim().slice(-500)}`);
      await restorePreviousVersion({
        branch: originalBranch,
        sha: originalSha,
        dependencyChanged,
        registry,
        mode: stepMode,
        logPath,
        t,
      });
      return { error: "build-failed", rolledBack: true };
    }

    t(`更新完成 -> ${release.tag}；重启 AI 客户端后使用新版本`);
    return { updated: true, tag: release.tag, version: release.version };
  } catch (e) {
    t(`更新异常（不影响当前进程）：${(e && e.message) || String(e)}`);
    return { error: "exception", detail: String((e && e.message) || e) };
  }
}

export function isBuilt() {
  try {
    return existsSync(INDEX_JS) && statSync(INDEX_JS).size > 0;
  } catch {
    return false;
  }
}
