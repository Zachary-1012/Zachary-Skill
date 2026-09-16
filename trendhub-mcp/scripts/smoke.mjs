/**
 * 快速接入验证（smoke）：不联网、不抓任何平台，只验证 MCP 服务能启动、
 * 能完成 JSON-RPC 握手并返回完整工具清单。通常数秒内结束。
 *
 * 用法：
 *   node scripts/smoke.mjs                      # 验证 dist/src/index.js（stdio）
 *   node scripts/smoke.mjs scripts/launcher.mjs # 验证启动包装器（同时检查其 stdout 纯净性）
 *
 * 退出码：0 通过；1 失败（stderr 末尾会给出排查线索）。
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, INDEX_JS } from "./lib-trendhub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
void HERE;
const EXPECTED_TOOLS = 19;
const HANDSHAKE_TIMEOUT_MS = 20_000;

const arg = process.argv[2];
const entry = arg ? (isAbsolute(arg) ? arg : resolve(ROOT, arg)) : INDEX_JS;
const entryRel = entry.startsWith(ROOT) ? entry.slice(ROOT.length + 1) : entry;

if (!existsSync(entry)) {
  console.error(`[smoke] 找不到入口文件：${entry}`);
  console.error("[smoke] 请先在该目录运行：node scripts/setup.mjs");
  process.exit(1);
}

const started = Date.now();
const child = spawn(process.execPath, [entry], {
  cwd: ROOT,
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, TRENHUB_AUTOUPDATE: "0" },
});

let stdoutBuf = "";
let stderrBuf = "";
let settled = false;

child.stdout.on("data", (b) => {
  stdoutBuf += b.toString();
  let idx;
  while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
    const line = stdoutBuf.slice(0, idx).trim();
    stdoutBuf = stdoutBuf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      fail(`stdout 出现非 JSON-RPC 内容（会破坏 MCP 通信）：${line.slice(0, 200)}`);
      return;
    }
    if (msg.id === 2) {
      const tools = msg?.result?.tools;
      if (!Array.isArray(tools)) {
        fail(`tools/list 响应缺少 tools 数组：${line.slice(0, 200)}`);
        return;
      }
      if (tools.length !== EXPECTED_TOOLS) {
        const names = tools.map((x) => x.name).join(", ");
        fail(`工具数量不符：期望 ${EXPECTED_TOOLS}，实际 ${tools.length}（${names}）`);
        return;
      }
      succeed(tools.map((x) => x.name));
    }
  }
});

child.stderr.on("data", (b) => {
  stderrBuf += b.toString();
  if (stderrBuf.length > 20_000) stderrBuf = stderrBuf.slice(-20_000);
});

child.on("error", (e) => fail(`启动子进程失败：${e && e.message ? e.message : e}`));

function send(obj) {
  child.stdin.write(`${JSON.stringify(obj)}\n`);
}

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "trendhub-smoke", version: "1.0" },
  },
});
send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

const timer = setTimeout(() => {
  fail(`${HANDSHAKE_TIMEOUT_MS / 1000}s 内未完成 tools/list 握手（服务可能启动过慢或卡住）`);
}, HANDSHAKE_TIMEOUT_MS);
if (typeof timer.unref === "function") timer.unref();

function succeed(names) {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  try {
    child.kill();
  } catch {
    /* 忽略 */
  }
  const ms = Date.now() - started;
  console.log(`SMOKE OK tools=${EXPECTED_TOOLS} entry=${entryRel} in ${ms}ms`);
  console.log(`tools: ${names.join(", ")}`);
  process.exit(0);
}

function fail(reason) {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  try {
    child.kill();
  } catch {
    /* 忽略 */
  }
  console.error(`SMOKE FAIL ${reason}`);
  if (stderrBuf.trim()) {
    console.error("--- stderr 末尾 ---");
    console.error(stderrBuf.trim().slice(-1500));
  }
  console.error("排查：1) 确认已运行 node scripts/setup.mjs；2) Node>=22；3) 重新 npm run build 看报错。");
  process.exit(1);
}
