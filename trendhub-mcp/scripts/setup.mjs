/**
 * TrendHub 一键安装 / 快速接入脚本（跨平台，纯 Node，零外部依赖）。
 *
 *   node scripts/setup.mjs               # 默认 public-stable：main clone 会钉到最新 Stable Release
 *   node scripts/setup.mjs --cn          # 强制国内 npmmirror 镜像
 *   node scripts/setup.mjs --global      # 强制官方源 registry.npmjs.org
 *   node scripts/setup.mjs --registry=URL
 *   node scripts/setup.mjs --no-smoke    # 跳过最后的握手验证
 *
 * 开发者若明确需要安装当前未发布 main，可设置 TRENTHUB_INSTALL_CHANNEL=dev。
 * 正式安装严格使用 package-lock.json + npm ci，确保公开分发依赖可重复。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  exec,
  selectRegistry,
  npmInstall,
  npmBuild,
  isGitRepo,
  currentBranch,
  latestStableRelease,
} from "./lib-trendhub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

let prefer = "auto";
let runSmoke = true;
for (const a of args) {
  if (a === "--cn") prefer = "cn";
  else if (a === "--global") prefer = "global";
  else if (a === "--no-smoke") runSmoke = false;
  else if (a.startsWith("--registry=")) prefer = a.slice("--registry=".length);
}

const [maj] = process.versions.node.split(".").map(Number);
if (maj < 22) {
  console.error(`[setup] Node 版本过低：当前 ${process.versions.node}，TrendHub Public Stable 需要 Node >= 22。`);
  console.error("[setup] 推荐使用 Node 24 LTS；Node 22 也受支持。升级后重新执行本命令即可。");
  process.exit(1);
}

const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const section = (title) => console.log(`\n==> ${title}`);

console.log("TrendHub 一键安装（Public Stable + 锁定依赖）");
console.log(`目录：${ROOT}`);

async function pinMainCloneToStableRelease() {
  if ((process.env.TRENTHUB_INSTALL_CHANNEL || "").toLowerCase() === "dev") {
    console.log("安装通道：dev（显式允许当前未发布 ref）");
    return;
  }
  if (!(await isGitRepo())) {
    console.log("安装通道：当前目录不是 git clone，无法自动钉 Stable Release；继续使用本地文件。");
    return;
  }
  const branch = await currentBranch();
  if (branch !== "main") {
    console.log(`安装通道：当前 ref=${branch || "detached"}，不自动改写开发/显式 checkout。`);
    return;
  }

  const release = await latestStableRelease(8_000);
  if (!release) {
    console.log("安装通道：尚无可读取的 Stable Release（首次发布或网络受限），继续当前 main。 ");
    return;
  }

  section(`0/3 钉到 Stable Release ${release.tag}`);
  const fetchTag = await exec(
    "git",
    ["fetch", "--force", "--depth", "1", "origin", `refs/tags/${release.tag}:refs/tags/${release.tag}`],
    { mode: "inherit", timeoutMs: 90_000 },
  );
  if (!fetchTag.ok) {
    console.error(`[setup] 已发现 Stable Release ${release.tag}，但无法获取该 tag。为避免误装未发布 main，本次安装停止。`);
    process.exit(1);
  }

  const head = await exec("git", ["rev-parse", "HEAD"], { mode: "capture", timeoutMs: 8_000 });
  const stable = await exec("git", ["rev-list", "-n", "1", `refs/tags/${release.tag}`], { mode: "capture", timeoutMs: 8_000 });
  if (!head.ok || !stable.ok) {
    console.error("[setup] 无法确认 Stable Release commit，本次安装停止。");
    process.exit(1);
  }

  if (head.stdout.trim() !== stable.stdout.trim()) {
    const checkout = await exec("git", ["checkout", "--quiet", "--detach", `refs/tags/${release.tag}`], {
      mode: "inherit",
      timeoutMs: 30_000,
    });
    if (!checkout.ok) {
      console.error(`[setup] 无法切换到 ${release.tag}，本次安装停止，未继续安装 main。`);
      process.exit(1);
    }
  }
  console.log(`安装通道：Stable Release ${release.tag}`);
}

await pinMainCloneToStableRelease();

section("1/3 选择 npm 源");
const regStart = Date.now();
let registry;
try {
  registry = await selectRegistry(prefer, 4_000);
} catch {
  registry = null;
}
console.log(
  registry
    ? `使用 ${registry}（探测耗时 ${Date.now() - regStart}ms）`
    : "使用系统默认 npm 源（未覆盖你已有的 registry 配置）",
);

section("2/3 按 lockfile 安装依赖并构建");
const inst = await npmInstall({ registry, mode: "inherit" });
if (!inst.ok) {
  console.error("\n[setup] npm ci 失败。TrendHub 不会自动改写 lockfile。可尝试：");
  console.error("  国内网络： node scripts/setup.mjs --cn");
  console.error("  海外网络： node scripts/setup.mjs --global");
  console.error("  确认仓库完整且 trendhub-mcp/package-lock.json 存在");
  process.exit(1);
}

const build = await npmBuild({ mode: "inherit" });
if (!build.ok) {
  console.error("\n[setup] 构建失败，请保留上面的 tsc 输出并反馈维护者。依赖锁不会被修改。");
  process.exit(1);
}

if (runSmoke) {
  section("3/3 快速握手验证（不联网，数秒）");
  const smoke = await exec(process.execPath, [join(HERE, "smoke.mjs")], {
    mode: "inherit",
    timeoutMs: 40_000,
  });
  if (!smoke.ok) {
    console.error("\n[setup] MCP 握手验证未通过。可先运行 npm test，再用 npm run source:health 检查外部信源。");
    process.exit(1);
  }
}

console.log("\n" + "=".repeat(64));
console.log(`安装完成，总耗时 ${elapsed()}。`);
console.log("下一步：");
console.log("  1) AI 客户端 MCP / Skill 配置：command=node，参数为：");
console.log(`     ${join(ROOT, "scripts", "launcher.mjs")}`);
console.log("     launcher 只跟随通过发布门禁的 Stable Release，不追 main 开发提交。");
console.log("  2) 本地控制台：npm run ui（http://127.0.0.1:8333/，零模型 Key）");
console.log("  3) 手动升级：node scripts/upgrade.mjs；自动升级可用 TRENTHUB_AUTOUPDATE=0 关闭。");
console.log("  4) 外部信源体检：npm run source:health（会真实联网，不属于安装/发布门禁）。");
process.exit(0);
