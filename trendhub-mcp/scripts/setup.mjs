/**
 * TrendHub 一键安装 / 快速接入脚本（跨平台，纯 Node，零外部依赖）。
 *
 *   node scripts/setup.mjs               # 自动选最快 npm 源：npm ci -> 构建 -> 数秒握手验证
 *   node scripts/setup.mjs --cn          # 强制国内 npmmirror 镜像
 *   node scripts/setup.mjs --global      # 强制官方源 registry.npmjs.org
 *   node scripts/setup.mjs --registry=URL
 *   node scripts/setup.mjs --no-smoke    # 跳过最后的握手验证
 *
 * 安装严格使用 package-lock.json + npm ci，确保公开分发时依赖可重复。
 * 全量 source health 会真实请求第三方平台，不属于安装/发布门禁。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, exec, selectRegistry, npmInstall, npmBuild } from "./lib-trendhub.mjs";

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

console.log("TrendHub 一键安装（锁定依赖、自动选择国内外最快 npm 源）");
console.log(`目录：${ROOT}`);

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
    console.error("\n[setup] MCP 握手验证未通过。可先运行 npm test，再用 npm run source:health 检查外部信源。 ");
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
