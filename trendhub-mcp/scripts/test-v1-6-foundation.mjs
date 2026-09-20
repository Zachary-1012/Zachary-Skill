#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { namespaceContract, isTrendHubCapabilityId } from "../dist/src/agent-native/namespace.js";
import { skillContract } from "../dist/src/agent-native/skill-contract.js";
import { completeResult, EVIDENCE_CONTRACT_VERSION } from "../dist/src/agent-native/evidence-contract.js";
import { listCapabilities } from "../dist/src/agent-native/capability-registry.js";

const ns = namespaceContract();
assert.equal(ns.schema, "trendhub-namespace-v1");
assert.equal(ns.productVersion, "1.6.1");
assert.equal(ns.toolCompatibility.count, 21);
assert.equal(ns.resourceScheme, "trendhub://");
assert.ok(ns.staticResources.includes("trendhub://contracts/evidence"));
assert.ok(ns.resourceTemplates.includes("trendhub://capability/{capability}"));
assert.equal(isTrendHubCapabilityId("trendhub.intelligence.lifecycle"), true);

const skill = skillContract();
assert.equal(skill.schema, "trendhub-skill-v2");
assert.equal(skill.productVersion, "1.6.1");
assert.equal(skill.compatibilityTools, 21);
assert.equal(skill.progressiveDisclosure, true);

const result = completeResult({
  data: { ok: true },
  capability: "trendhub.test",
  evidence: [{ id: "e1", source: "test", evidenceType: "methodology", observedAt: "2026-09-20T00:00:00.000Z" }],
});
assert.equal(result.contractVersion, EVIDENCE_CONTRACT_VERSION);
for (const key of ["data","evidence","source","timestamp","reliability","confidence","limitations","trace"]) assert.ok(key in result);
assert.equal(result.source.primary, "test");
assert.equal(result.timestamp.observedAtRange.first, "2026-09-20T00:00:00.000Z");

const resourceCapabilities = listCapabilities({ kind: "resource" }).map((x) => x.id);
for (const id of ["trendhub.resources.namespace","trendhub.resources.evidence_contract","trendhub.resources.skill"]) assert.ok(resourceCapabilities.includes(id), id);

const portable = JSON.parse(await readFile(join(new URL("..", import.meta.url).pathname, "..", "skills", "trendhub", "manifest.json"), "utf8"));
assert.equal(portable.productVersion, "1.6.1");
assert.equal(portable.compatibility.toolCount, 21);
console.log("V1.6 FOUNDATION OK namespace=v1 evidence=v1 skill=2.0 tools=21");
