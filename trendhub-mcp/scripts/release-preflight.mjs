#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

must(professional.releaseStatus === "release-ready", `professional-manifest releaseStatus=${professional.releaseStatus}`);
must(/^\d+\.\d+\.\d+$/.test(pkg.version), `package version=${pkg.version}`);
must(professional.candidateVersion === pkg.version, "candidateVersion must match package version");
must(pkg.version !== professional.stableBase, "candidate version must differ from stable base");
must(lock.version === pkg.version && lock.packages?.[""]?.version === pkg.version, "package-lock version mismatch");
must(manifest.version === pkg.version, "manifest version mismatch");
must(registry.version === pkg.version, "server.json version mismatch");
must(plugin.version === pkg.version, "plugin.json version mismatch");
must(gateway.includes(`const VERSION = "${pkg.version}"`), "remote gateway version mismatch");
must(serverTs.includes(`export const SERVER_VERSION = "${pkg.version}"`), "MCP server version mismatch");
const expected = Number(professional.expectedToolCount);
must(expected === 21, `expected tool count=${expected}`);
must(manifest.tools?.length === expected, `manifest tools=${manifest.tools?.length}, expected=${expected}`);
must(manifest.aiInstall?.successMarker === `SMOKE OK tools=${expected}`, "AI install success marker mismatch");
for (const tool of professional.professionalTools || []) must(manifest.tools.some((x) => x?.name === tool), `manifest missing ${tool}`);
must(registry.description.length <= 100, "registry description exceeds 100 characters");
must(registry.remotes?.[0]?.url === "https://trendhub-remote-production.up.railway.app/mcp", "registry remote URL mismatch");
console.log(`RELEASE PREFLIGHT OK version=${pkg.version} tools=${expected} status=${professional.releaseStatus}`);
