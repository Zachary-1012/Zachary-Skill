#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "..");
const REMOTE = "https://trendhub-remote-production.up.railway.app/mcp";
const gateway = readFileSync(join(ROOT, "scripts", "remote-gateway.mjs"), "utf8");
const webApi = readFileSync(join(ROOT, "src", "web", "api.ts"), "utf8");
const packageLicense = readFileSync(join(ROOT, "LICENSE"), "utf8");
const privacy = readFileSync(join(ROOT, "docs", "privacy.md"), "utf8");
const terms = readFileSync(join(ROOT, "docs", "terms.md"), "utf8");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const professional = JSON.parse(readFileSync(join(ROOT, "professional-manifest.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const registry = JSON.parse(readFileSync(join(REPO, "server.json"), "utf8"));
const plugin = JSON.parse(readFileSync(join(REPO, "plugin.json"), "utf8"));
const mcp = JSON.parse(readFileSync(join(REPO, "mcp.json"), "utf8"));
const glama = JSON.parse(readFileSync(join(REPO, "glama.json"), "utf8"));
const skill = readFileSync(join(REPO, "skills", "trendhub", "SKILL.md"), "utf8");
const productLicense = readFileSync(join(REPO, "LICENSE"), "utf8");

const must = (condition, message) => {
  if (!condition) throw new Error(`DISTRIBUTION TEST FAILED: ${message}`);
};

// Static distribution boundaries only. Scheduler timing semantics are exercised by
// test-snapshot-scheduler.mjs; keeping that runtime contract out of this text-inspection
// test avoids duplicate/brittle assertions over implementation formatting.
must(/PUBLIC_PORT\s*=\s*Number\(\s*process\.env\.PORT\s*\|\|\s*process\.env\.TRENHUB_REMOTE_PORT\s*\|\|\s*8080\s*\)/.test(gateway), "remote gateway must honor hosting PORT and TRENHUB_REMOTE_PORT");
must(gateway.includes("TRENTHUB_HOST") && gateway.includes("127.0.0.1"), "core must remain loopback-only behind the public gateway");
must(gateway.includes("randomBytes(32)") && gateway.includes("INTERNAL_TOKEN"), "internal bearer token must be generated per process");
must(gateway.includes("TRENTHUB_HTTP_TOKEN") && gateway.includes("INTERNAL_TOKEN"), "gateway must authenticate to the private core");
must(gateway.includes("TRENTHUB_AUTOUPDATE") && gateway.includes('"0"'), "hosted deployments must not self-mutate via local auto-update");
must(gateway.includes('url.pathname === "/mcp"'), "public MCP endpoint missing");
must(gateway.includes('url.pathname === "/health"'), "public health endpoint missing");
must(gateway.includes('url.pathname === "/privacy"'), "public privacy endpoint missing");
must(gateway.includes('url.pathname === "/terms"'), "public terms endpoint missing");
must(gateway.includes('url.pathname === "/.well-known/mcp.json"'), "MCP discovery metadata missing");
must(gateway.includes('url.pathname.startsWith("/api/")'), "gateway must explicitly block local /api routes");
must(gateway.includes("MAX_BODY_BYTES"), "request body limit missing");
must(gateway.includes("MAX_CONCURRENCY"), "concurrency guard missing");
must(!gateway.includes("XHS_COOKIE:"), "public gateway must not inject a private Xiaohongshu cookie");
must(privacy.includes("No TrendHub account is required"), "privacy notice must state account posture");
must(privacy.includes("third-party cloud infrastructure"), "privacy notice must disclose hosting infrastructure processing");
must(terms.includes("not affiliated with or endorsed"), "terms must disclose third-party platform independence");
must(terms.includes("not factual guarantees"), "terms must bound analytical indicators");
must(terms.includes("TrendHub Free Use License 1.0") && !terms.includes("distributed under the repository's MIT License"), "hosted terms must match the v1.4.3+ license boundary");
must(webApi.includes("live-with-snapshot-fallback") && webApi.includes("snapshotFallback"), "hosted Web snapshot fallback contract missing");

const version = pkg.version;
must(version === professional.candidateVersion, `package version must match RC candidate ${professional.candidateVersion}`);
must(/envBool\(\s*["']TRENTHUB_REMOTE_SNAPSHOT_ENABLED["']/.test(gateway), "remote snapshot scheduler feature flag missing");
must(gateway.includes("snapshotScheduler"), "remote snapshot scheduler health state missing");
must(lock.version === version && lock.packages?.[""]?.version === version, "package-lock version metadata must match package.json");
must(manifest.version === version, "manifest version must match package.json");
must(manifest.tools?.length === 21, "v1.5.0 manifest must declare 21 MCP tools");
must(registry.version === professional.stableBase, "RC must not mutate Official MCP Registry version");
must(plugin.version === professional.stableBase, "RC must not mutate portable stable plugin version");
must(pkg.license === "SEE LICENSE IN LICENSE", "package.json must point to the repository LICENSE");
must(lock.packages?.[""]?.license === pkg.license, "package-lock root license must match package.json");
must(manifest.license === "LicenseRef-TrendHub-Free-Use-1.0", "manifest license boundary mismatch");
must(plugin.license === "LicenseRef-TrendHub-Free-Use-1.0", "plugin license boundary mismatch");
must(productLicense.includes("TrendHub Free Use License 1.0"), "root product license title missing");
must(packageLicense === productLicense, "packaged LICENSE must match repository product LICENSE");
must(productLicense.includes("you may not") && productLicense.includes("modify") && productLicense.includes("distribute"), "root product license restrictions missing");
must(gateway.includes(`const VERSION = "${version}"`), "remote gateway version must match package.json");
must(registry.name === "io.github.Zachary-1012/trendhub", "Official MCP Registry namespace mismatch");
must(registry.$schema === "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json", "Official MCP Registry schema mismatch");
must(typeof registry.description === "string" && registry.description.length <= 100, "Official MCP Registry description must be <= 100 characters");
must(registry.remotes?.length === 1 && registry.remotes[0].type === "streamable-http", "Official MCP Registry must expose one Streamable HTTP remote");
must(registry.remotes[0].url === REMOTE, "Official MCP Registry remote URL mismatch");
must(plugin.$schema === "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "Agent Plugins schema mismatch");
must(plugin.name === "trendhub", "portable plugin name mismatch");
must(mcp.$schema === "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "Agent Plugins MCP schema mismatch");
must(mcp.mcpServers?.trendhub?.type === "streamable-http", "portable MCP transport mismatch");
must(mcp.mcpServers?.trendhub?.url === REMOTE, "portable MCP remote URL mismatch");
must(glama.$schema === "https://glama.ai/mcp/schemas/server.json", "Glama schema mismatch");
must(Array.isArray(glama.maintainers) && glama.maintainers.includes("Zachary-1012"), "Glama maintainer mismatch");
must(skill.includes("name: trendhub") && skill.includes("Missing is not zero"), "portable TrendHub skill contract missing");
must(manifest.runtime?.remote?.url === REMOTE, "canonical manifest remote URL mismatch");
must(manifest.runtime?.remote?.accountRequired === false, "remote must not claim an account requirement");

console.log(`DISTRIBUTION TEST OK version=${version} remote-gateway=isolated registries=official+agent-plugins+cursor+glama remote=${REMOTE}`);
