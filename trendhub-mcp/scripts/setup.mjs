/**
 * TrendHub 一键安装 / 快速接入脚本（跨平台，纯 Node，零外部依赖）。
 *
 *   node scripts/setup.mjs               # 自动选最快 npm 源：装依赖 -> 构建 -> 数秒握手验证
 *   node scripts/setup.mjs --cn          # 强制国内 npmmirror 镜像（国内网络推荐）
 *   node scripts/setup.mjs --global      # 强制官方源 registry.npmjs.org
 *   node scripts/setup.mjs --registry=URL
 *   node scripts/setup.mjs --no-smoke    # 跳过最后的握手验证
 *
 * 设计目标：把“接入速度”做到最快——安装阶段不跑约 2 分钟的全量 selftest，
 * 只做一次不联网、数秒的 MCP 握手（smoke）确认 16 个工具就绪。
 * 全量 selftest（真实抓取各平台）仅用于排障：npm run selftest。
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

const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 18 || (maj === 18 && min < 14)) {
  console.error(`[setup] Node 版本过低：当前 ${process.versions.node}，需要 >= 18.14。请升级 Node 后重试。`);
  process.exit(1);
}

const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const section = (title) => console.log(`\n==> ${title}`);

console.log("TrendHub 一键安装（自动选择国内外最快 npm 源，失败可回退）");
console.log(`目录：${ROOT}`);

// 1) 选择最快 npm 源
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

// 2) 安装依赖 + 构建
section("2/3 安装依赖并构建");
const inst = await npmInstall({ registry, mode: "inherit" });
if (!inst.ok) {
  console.error("\n[setup] 依赖安装失败。可尝试：");
  console.error("  国内网络： node scripts/setup.mjs --cn");
  console.error("  海外网络： node scripts/setup.mjs --global");
  console.error("  或先执行： npm config set registry https://registry.npmmirror.com  后重试");
  process.exit(1);
}

const build = await npmBuild({ mode: "inherit" });
if (!build.ok) {
  console.error("\n[setup] 构建失败，请把上面的 tsc 报错反馈给维护者。当前依赖已安装，可重试 npm run build。");
  process.exit(1);
}

// 3) 快速握手验证（不联网、不取数）
if (runSmoke) {
  section("3/3 快速握手验证（不联网，数秒）");
  const smoke = await exec(process.execPath, [join(HERE, "smoke.mjs")], {
    mode: "inherit",
    timeoutMs: 40_000,
  });
  if (!smoke.ok) {
    console.error("\n[setup] 握手验证未通过，按上面 SMOKE FAIL 的提示排查；也可运行 npm run selftest 做深度体检。");
    process.exit(1);
  }
}

console.log("\n" + "=".repeat(64));
console.log(`安装完成，总耗时 ${elapsed()}。`);
console.log("下一步：");
console.log("  1) 在 AI 客户端的 MCP / Skill 配置里，命令填 node，参数填：");
console.log(`     ${join(ROOT, "scripts", "launcher.mjs")}`);
console.log("     （launcher 启动即用、后台自动更新；不想要自动更新可改用 dist/src/index.js）");
console.log("     各客户端（Claude/Cursor/豆包/ChatBox/移动端 HTTP）详细配置见 docs/setup-clients.md");
console.log("  2) 可视化控制台：npm run ui（浏览器打开 http://127.0.0.1:8333/，零模型 Key）");
console.log("  3) 以后升级：node scripts/upgrade.mjs，或重启客户端由 launcher 后台自动更新。");
console.log("  注：安装无需运行 npm run selftest（约 2 分钟、真实抓全站），它仅用于排障。");
process.exit(0);
