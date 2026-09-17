#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-professional-e2e-"));

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((err) => err ? reject(err) : resolve(port));
    });
  });
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function waitReady(base, child, logs) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`TrendHub exited early (${child.exitCode})\n${logs.join("")}`);
    try {
      const h = await fetchJson(`${base}/api/health`);
      if (h?.ok) return h;
    } catch {
      // retry until deadline
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`TrendHub local HTTP did not become ready\n${logs.join("")}`);
}

const port = await getFreePort();
const base = `http://127.0.0.1:${port}`;
const logs = [];
const child = spawn(process.execPath, ["dist/src/index.js", "--http", `--port=${port}`], {
  cwd: ROOT,
  env: {
    ...process.env,
    TRENHUB_AUTOUPDATE: "0",
    TRENHUB_DATA_DIR: temp,
    TRENHUB_HOST: "127.0.0.1",
    TRENHUB_TRANSPORT: "http",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (x) => logs.push(String(x)));
child.stderr.on("data", (x) => logs.push(String(x)));

try {
  const health = await waitReady(base, child, logs);
  assert.equal(health.version, pkg.version);

  const shell = await (await fetch(`${base}/`)).text();
  assert.match(shell, /responsive-v2\.css/);
  assert.match(shell, /data-view="professional"/);
  assert.match(shell, /data-view="sources"/);

  const responsive = await (await fetch(`${base}/responsive-v2.css`)).text();
  assert.match(responsive, /@media \(max-width: 720px\)/);
  assert.match(responsive, /safe-area-inset/);
  assert.match(responsive, /100dvh/);
  assert.match(responsive, /overflow-x:\s*auto/);
  assert.match(responsive, /pointer:\s*coarse/);

  const sourceMatrix = await fetchJson(`${base}/api/professional/sources?priority=P1`);
  assert.ok(sourceMatrix.counts.total >= 40, "P0/P1 source universe should be broad enough for professional coverage");
  assert.ok(sourceMatrix.counts.zeroConfig > 0, "first run must have zero-config sources");
  assert.ok(sourceMatrix.defaultLivePlatforms.length >= 8, "default professional analysis should have a broad zero-config live set");
  const byId = new Map(sourceMatrix.sources.map((s) => [s.id, s]));
  for (const id of [
    "xiaohongshu", "douyin", "weibo", "bilibili", "zhihu", "xiaoyuzhou", "ximalaya",
    "baidu-index", "vogue-china", "socialbeta", "youtube", "tiktok", "instagram", "x", "reddit",
    "apple-podcasts", "spotify-podcasts", "google-trends", "vogue-business", "business-of-fashion",
    "reuters", "techcrunch", "adage",
  ]) {
    assert.ok(byId.has(id), `priority source missing: ${id}`);
  }

  assert.equal(byId.get("xiaohongshu")?.onboarding?.mode, "optional-local-session");
  assert.equal(byId.get("xiaohongshu")?.onboarding?.blocksBasicUse, false);
  assert.equal(byId.get("douyin")?.onboarding?.mode, "zero-config");
  assert.equal(byId.get("youtube")?.onboarding?.mode, "user-api-key");
  assert.equal(byId.get("instagram")?.onboarding?.mode, "user-oauth");
  assert.equal(byId.get("baidu-index")?.onboarding?.mode, "required-local-session");
  assert.equal(byId.get("wechat-channels")?.onboarding?.mode, "licensed-connector");

  for (const [query, expected] of [["LV", "louis-vuitton"], ["小米", "xiaomi"], ["Tesla", "tesla"], ["YSL", "saint-laurent"]]) {
    const entity = await fetchJson(`${base}/api/professional/entities?q=${encodeURIComponent(query)}`);
    assert.equal(entity.resolved?.id, expected, `entity resolution failed for ${query}`);
  }

  const intelligence = await fetchJson(`${base}/api/professional?keyword=LV&verticals=fashion-luxury&refresh=0`);
  assert.equal(intelligence.methodologyVersion, "professional-intelligence-v2");
  assert.equal(intelligence.entityContext?.entity?.id, "louis-vuitton");
  assert.ok(Array.isArray(intelligence.sourceArchitecture?.selected));
  assert.ok(intelligence.sourceArchitecture.selected.length >= 8);
  assert.equal(intelligence.sourceArchitecture.selected.some((s) => s.blocksBasicUse === true), false,
    "automatic default route must not select sources that require user credentials/session");

  console.log(`PROFESSIONAL E2E OK sources=${sourceMatrix.counts.total} zeroConfig=${sourceMatrix.counts.zeroConfig} defaults=${sourceMatrix.defaultLivePlatforms.length} mobile=true entities=4`);
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 2_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
  fs.rmSync(temp, { recursive: true, force: true });
}
