#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { listCapabilities } from "../dist/src/agent-native/capability-registry.js";
import { completeResult } from "../dist/src/agent-native/evidence-contract.js";
import { decideLiveSkill } from "../dist/src/agent-native/live-skill.js";
import { routeIntent } from "../dist/src/agent-native/router.js";
import { metric } from "../dist/src/agent-native/observability.js";
import { transitionTask } from "../dist/src/agent-native/tasks.js";

const root = new URL("..", import.meta.url).pathname;
const skillRoot = join(root, "..", "skills", "trendhub");
const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
assert.match(skill, /Progressive disclosure/);
assert.equal(listCapabilities().some((x) => x.id === "trendhub.history.topic"), true);
assert.equal(listCapabilities().filter((x) => x.kind === "tool").some((x) => x.status !== "compatibility"), false);

const envelope = completeResult({
  data: { ok: true },
  capability: "trendhub.test",
  evidence: [{ id: "e1", source: "test", evidenceType: "methodology", observedAt: new Date().toISOString() }],
});
assert.equal(envelope.resultType, "complete");
assert.equal(envelope.contractVersion, "trendhub-evidence-contract-v1");
for (const key of ["data", "evidence", "source", "timestamp", "reliability", "confidence", "limitations", "trace"]) {
  assert.ok(key in envelope);
}

assert.equal(decideLiveSkill({ sourceReliabilityScore: 40, historySamples: 2, lifecycle: "accelerating" }).forecastAllowed, false);
assert.equal(routeIntent("品牌 campaign 研究").capability, "trendhub.intelligence.professional");
assert.equal(routeIntent("趋势生命周期速度").canonicalTool, "trend_intelligence");
assert.equal(metric("trendhub.request.duration", 12, "ms").unit, "ms");
const task = { taskId: "t1", status: "created", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), progress: 0, resultAvailable: false };
assert.equal(transitionTask(task, "running").status, "running");

const client = new Client({ name: "agent-native-test", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, "dist", "src", "index.js")],
  cwd: root,
  stderr: "pipe",
  env: { ...process.env, TRENTHUB_AUTOUPDATE: "0" },
});
await client.connect(transport);

const tools = await client.listTools();
assert.equal(tools.tools.length, 21, "legacy compatibility facade must remain 21 tools");

const resources = await client.listResources();
for (const uri of ["trendhub://methodology", "trendhub://namespace", "trendhub://contracts/evidence", "trendhub://skill/trendhub"]) {
  assert.ok(resources.resources.some((x) => x.uri === uri), uri);
}

const templates = await client.listResourceTemplates();
for (const template of ["platform/{platform}/history", "capability/{capability}", "source/{source}"]) {
  assert.ok(templates.resourceTemplates.some((x) => x.uriTemplate.includes(template)), template);
}

const methodology = await client.readResource({ uri: "trendhub://methodology" });
assert.match(methodology.contents[0].text, /evidence-first/i);
const evidenceContract = await client.readResource({ uri: "trendhub://contracts/evidence" });
assert.match(evidenceContract.contents[0].text, /trendhub-evidence-contract-v1/);
const namespace = await client.readResource({ uri: "trendhub://namespace" });
assert.match(namespace.contents[0].text, /trendhub-namespace-v1/);
const capability = await client.readResource({ uri: "trendhub://capability/trendhub.intelligence.lifecycle" });
assert.match(capability.contents[0].text, /trend_intelligence/);

await client.close();
console.log(`AGENT NATIVE OK tools=${tools.tools.length} resources=${resources.resources.length} templates=${templates.resourceTemplates.length} local-observability=otel-compatible`);
