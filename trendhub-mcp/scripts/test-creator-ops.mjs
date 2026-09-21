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
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trendhub-creator-ops-"));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function request(base, pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  const data = await response.json();
  return { response, data };
}

async function waitForServer(base, child, logs) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}\n${logs.join("")}`);
    try {
      const { response, data } = await request(base, "/api/health");
      if (response.ok && data.ok) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`server did not start\n${logs.join("")}`);
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const logs = [];
const child = spawn(process.execPath, ["dist/src/index.js", "--http", `--port=${port}`], {
  cwd: ROOT,
  env: { ...process.env, TRENTHUB_DATA_DIR: temp, TRENHUB_TRANSPORT: "http", TRENHUB_HOST: "127.0.0.1", TRENHUB_AUTOUPDATE: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (chunk) => logs.push(String(chunk)));
child.stderr.on("data", (chunk) => logs.push(String(chunk)));

try {
  await waitForServer(base, child, logs);
  const shell = await (await fetch(`${base}/`)).text();
  assert.match(shell, /data-view="settings"/);
  assert.doesNotMatch(shell, /data-view="ops"/, "Creator Ops must stay out of primary navigation");
  assert.match(shell, /views-f\.js/, "Creator Ops implementation must remain packaged for advanced/local use");

  const initial = await request(base, "/api/ops/summary");
  assert.equal(initial.response.status, 200);
  assert.equal(initial.data.schema, "trendhub-creator-ops-v1");
  assert.equal(initial.data.scope.mode, "local-only");
  assert.equal(initial.data.costs.actualProviderBilling, "not_connected");
  assert.equal(initial.data.costs.monthTrackedUsd, null, "unconnected billing must not be rendered as zero");

  const invalid = await request(base, "/api/ops/costs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountUsd: -1 }),
  });
  assert.equal(invalid.response.status, 400);

  const cost = await request(base, "/api/ops/costs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountUsd: 12.5, category: "Hosting", note: "monthly platform" }),
  });
  assert.equal(cost.response.status, 201);
  assert.equal(cost.data.cost.amountUsd, 12.5);

  const secret = "super-secret-credential-0123456789-abcdefghijklmnopqrstuvwxyz";
  const feedback = await request(base, "/api/ops/feedback", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "mobile regression", severity: "high", detail: `Authorization: Bearer ${secret}; cookie=${secret}` }),
  });
  assert.equal(feedback.response.status, 201);
  assert.doesNotMatch(JSON.stringify(feedback.data), new RegExp(secret));
  assert.match(JSON.stringify(feedback.data), /\[REDACTED\]/);

  const events = await request(base, "/api/ops/events");
  const eventsText = JSON.stringify(events.data);
  assert.doesNotMatch(eventsText, new RegExp(secret));
  assert.match(eventsText, /\[REDACTED\]/);
  assert.equal(events.data.costs.length, 1);
  assert.equal(events.data.feedback.length, 1);

  const after = await request(base, "/api/ops/summary");
  assert.equal(after.data.costs.monthTrackedUsd, 12.5);
  assert.equal(after.data.costs.tracking, "manual");
  assert.equal(after.data.feedback.openCount, 1);

  const report = await request(base, "/api/ops/report");
  assert.equal(report.data.schema, "trendhub-creator-ops-report-v1");
  assert.match(report.data.markdown, /TrendHub Creator Ops Brief/);
  assert.doesNotMatch(report.data.markdown, new RegExp(secret));

  const unknown = await request(base, "/api/ops/not-a-route");
  assert.equal(unknown.response.status, 404);
  console.log("CREATOR OPS OK local=true redaction=true costs=manual feedback=local-only public=blocked");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 2_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
  fs.rmSync(temp, { recursive: true, force: true });
}
