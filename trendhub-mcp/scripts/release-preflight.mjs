#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPromotionPlan } from "./promote-professional-release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const REPO = path.join(ROOT, "..");
const read = (p) => fs.readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));
const must = (condition, message) => { if (!condition) throw new Error(`RELEASE PREFLIGHT FAILED: ${message}`); };

const pkg = json(path.join(ROOT, "package.json"));
const lock = json(path.join(ROOT, "package-lock.json"));
const manifest = json(path.join(ROOT, "manifest.json"));
const professional = json(path.join(ROOT, "professional-manifest.json"));
const registry = json(path.join(REPO, "server.json"));
const plugin = json(path.join(REPO, "plugin.json"));
const gateway = read(path.join(ROOT, "scripts", "remote-gateway.mjs"));
const serverTs = read(path.join(ROOT, "src", "server.ts"));
const requiredDocs = ["RELEASE_CANDIDATE.md", "V1_6_0_AGENT_NATIVE_FOUNDATION.md", "V1_7_0_INTELLIGENCE_WORKSPACE.md"];
for (const doc of requiredDocs) must(fs.existsSync(path.join(ROOT, "docs", doc)), `missing release document ${doc}`);

const target = professional.targetStableVersion ?? professional.candidateVersion;
must(target === professional.candidateVersion, "candidate and target versions must match");
must(target !== "1.4.5", "v1.4.5 is forbidden");

// Candidate mode validates the current stable runtime and the complete future
// promotion contract without mutating 1.4.4 metadata. After an authorized
// metadata promotion, the same command automatically switches to full mode.
if (professional.releaseStatus === "release-candidate-ready") {
  must(pkg.version === professional.candidateVersion, "RC package must match candidate version");
  must(professional.candidateVersion === target, "RC candidateVersion must match targetStableVersion");
  must(lock.version === pkg.version && lock.packages?.[""]?.version === pkg.version, "RC package-lock version mismatch");
  must(manifest.version === pkg.version, "RC manifest version mismatch");
  must(registry.version === professional.stableBase, "RC server.json must remain on stable production version");
  must(plugin.version === professional.stableBase, "RC plugin.json must remain on stable production version");
  must(gateway.includes(`const VERSION = "${pkg.version}"`), "RC remote gateway must remain on stable version");
  must(serverTs.includes(`export const SERVER_VERSION = "${pkg.version}"`), "RC MCP server must remain on stable version");
  const expected = Number(professional.expectedToolCount);
  must(expected === 21, `expected tool count=${expected}`);
  must(manifest.agentNative?.namespace === "trendhub-namespace-v1", "v1.6 namespace contract missing");
  must(manifest.agentNative?.evidenceContract === "trendhub-evidence-contract-v1", "v1.6 evidence contract missing");
  must(manifest.agentNative?.skillContract === "trendhub-skill-v2", "v1.6 Skill 2.0 contract missing");
  must(manifest.tools?.length === Number(professional.stableToolCount), `stable manifest tools=${manifest.tools?.length}, expected ${professional.stableToolCount}`);
  must(manifest.aiInstall?.successMarker === `SMOKE OK tools=${professional.stableToolCount}`, "stable AI install success marker mismatch");
  const promotion = buildPromotionPlan(target, { dryRun: true });
  must(expected === 21, "RC expected tool count must remain 21");
  must(registry.description.length <= 100, "registry description exceeds 100 characters");
  must(registry.remotes?.[0]?.url === "https://trendhub-remote-production.up.railway.app/mcp", "registry remote URL mismatch");
  console.log(`RELEASE PREFLIGHT RC OK target=${target} stable=${professional.stableBase} tools=${expected} status=ready-not-published`);
  process.exit(0);
}

must(professional.releaseStatus === "release-ready", `professional-manifest releaseStatus=${professional.releaseStatus}`);
must(/^\d+\.\d+\.\d+$/.test(pkg.version), `package version=${pkg.version}`);
must(professional.candidateVersion === pkg.version, "candidateVersion must match package version");
must(professional.targetStableVersion === pkg.version, "targetStableVersion must match promoted package version");
must(pkg.version !== professional.stableBase, "candidate version must differ from stable base");
must(lock.version === pkg.version && lock.packages?.[""]?.version === pkg.version, "package-lock version mismatch");
must(manifest.version === pkg.version, "manifest version mismatch");
must(registry.version === pkg.version, "server.json version mismatch");
must(plugin.version === pkg.version, "plugin.json version mismatch");
must(gateway.includes(`const VERSION = "${pkg.version}"`), "remote gateway version mismatch");
must(serverTs.includes(`export const SERVER_VERSION = "${pkg.version}"`), "MCP server version mismatch");
const expected = Number(professional.expectedToolCount);
must(expected === 21, `expected tool count=${expected}`);
must(manifest.agentNative?.namespace === "trendhub-namespace-v1", "v1.6 namespace contract missing");
must(manifest.agentNative?.evidenceContract === "trendhub-evidence-contract-v1", "v1.6 evidence contract missing");
must(manifest.agentNative?.skillContract === "trendhub-skill-v2", "v1.6 Skill 2.0 contract missing");
must(manifest.tools?.length === expected, `manifest tools=${manifest.tools?.length}, expected=${expected}`);
must(manifest.professionalIntelligence?.methodologyVersion === "professional-intelligence-v3", "v1.7 Professional Intelligence v3 contract missing");
must(manifest.agentNative?.entityFirstResearch === "released", "v1.7 Entity-first research contract missing");
must(manifest.agentNative?.decisionFirstWeb === "released", "v1.7 Decision-first Web contract missing");
must(fs.existsSync(path.join(ROOT, "web", "experience-v2.css")), "v1.7.1 semantic Experience stylesheet missing");
must(!fs.existsSync(path.join(ROOT, "web", "intelligence-v1.css")), "superseded dashboard-style experience layer must stay retired");
const indexHtml = read(path.join(ROOT, "web", "index.html"));
const appJs = read(path.join(ROOT, "web", "app.js"));
const viewsD = read(path.join(ROOT, "web", "views-d.js"));
must(indexHtml.includes(`experience-v2.css?v=${pkg.version}`), "public shell must load semantic Experience stylesheet at current version");
must(appJs.includes("DOMContentLoaded"), "deep-link route boot must wait for deferred view registration");
must(!/\nroute\(\);\s*$/.test(viewsD), "views-d must not boot routing before later view modules register");
must(manifest.aiInstall?.successMarker === `SMOKE OK tools=${expected}`, "AI install success marker mismatch");
for (const tool of professional.professionalTools || []) must(manifest.tools.some((x) => x?.name === tool), `manifest missing ${tool}`);
must(registry.description.length <= 100, "registry description exceeds 100 characters");
must(registry.remotes?.[0]?.url === "https://trendhub-remote-production.up.railway.app/mcp", "registry remote URL mismatch");
console.log(`RELEASE PREFLIGHT OK version=${pkg.version} tools=${expected} status=${professional.releaseStatus}`);
