#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPromotionPlan } from "./promote-professional-release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const REPO = path.join(ROOT, "..");
const professional = JSON.parse(fs.readFileSync(path.join(ROOT, "professional-manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(["release-candidate-ready", "release-ready"].includes(professional.releaseStatus));
assert.equal(professional.stableBase, "1.6.1");
assert.equal(professional.targetStableVersion, "1.6.2");
assert.equal(professional.expectedToolCount, 21);
assert.equal(professional.candidateVersion, "1.6.2");
assert.equal(pkg.version, "1.6.2");
assert.notEqual(professional.targetStableVersion, "1.4.5");
const dry = buildPromotionPlan("1.6.2", { dryRun: true });
assert.equal(dry.ok, true); assert.equal(dry.expectedTools, 21); assert.equal(dry.dryRun, true); assert.equal(dry.files.length, 8);
assert.throws(() => buildPromotionPlan("1.4.5", { dryRun: true }), /1\.4\.5 is forbidden/);
for (const doc of ["RELEASE_CANDIDATE.md", "V1_6_0_AGENT_NATIVE_FOUNDATION.md"]) {
  assert.ok(fs.existsSync(path.join(ROOT, "docs", doc)), `missing release document ${doc}`);
}
const releaseWorkflow = fs.readFileSync(path.join(REPO, ".github", "workflows", "release.yml"), "utf8");
const registryWorkflow = fs.readFileSync(path.join(REPO, ".github", "workflows", "publish-mcp-registry.yml"), "utf8");
const publicInstall = fs.readFileSync(path.join(REPO, ".github", "workflows", "public-install-e2e.yml"), "utf8");
const nodeCi = fs.readFileSync(path.join(REPO, ".github", "workflows", "node.js.yml"), "utf8");
assert.match(releaseWorkflow, /npm run release:preflight/); assert.match(releaseWorkflow, /head_branch == 'main'/);
assert.match(registryWorkflow, /EXPECTED_TOOLS/); assert.doesNotMatch(registryWorkflow, /\[ "\$TOOLS" = "19" \]/);
assert.match(publicInstall, /EXPECTED=/); assert.match(publicInstall, /dynamic MCP tool contract/);
assert.match(nodeCi, /VERSION="\$\(node -p "require\('\.\/package\.json'\)\.version"\)"/); assert.doesNotMatch(nodeCi, /h\.version!==['"]1\.4\.4['"]/);
console.log(`RELEASE CONTRACT TEST OK status=${professional.releaseStatus} promotion=dry-run tools=21 stable-base=${professional.stableBase}`);
