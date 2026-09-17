#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const REPO = path.join(ROOT, "..");
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, value, dryRun) {
  const text = JSON.stringify(value, null, 2) + "\n";
  if (!dryRun) fs.writeFileSync(file, text);
  return text;
}
function replaceRequired(text, pattern, replacement, label) {
  const next = text.replace(pattern, replacement);
  if (next === text) throw new Error(`PROMOTION FAILED: expected ${label} marker was not found`);
  return next;
}
function semverParts(v) { return v.split(".").map(Number); }
function isGreater(a, b) {
  const A = semverParts(a); const B = semverParts(b);
  for (let i = 0; i < 3; i += 1) { if (A[i] > B[i]) return true; if (A[i] < B[i]) return false; }
  return false;
}
function updateTextFile(file, updater, dryRun) {
  const before = fs.readFileSync(file, "utf8");
  const after = updater(before);
  if (!dryRun) fs.writeFileSync(file, after);
  return { before, after };
}
function ensureTool(manifest, tool) {
  manifest.tools ||= [];
  const existing = manifest.tools.find((x) => x?.name === tool.name);
  if (existing) Object.assign(existing, tool); else manifest.tools.push(tool);
}

export function buildPromotionPlan(version, { dryRun = true } = {}) {
  if (!VERSION_RE.test(version || "")) throw new Error("PROMOTION FAILED: pass a stable semantic version x.y.z");
  const professionalPath = path.join(ROOT, "professional-manifest.json");
  const professional = readJson(professionalPath);
  if (version === "1.4.5") throw new Error("PROMOTION FAILED: v1.4.5 is forbidden; the next intended stable version is v1.5.0");
  if (professional.targetStableVersion && version !== professional.targetStableVersion) throw new Error(`PROMOTION FAILED: target must be ${professional.targetStableVersion}`);
  const base = professional.stableBase;
  if (!VERSION_RE.test(base || "") || !isGreater(version, base)) throw new Error(`PROMOTION FAILED: target ${version} must be greater than stable base ${base}`);
  const expectedTools = Number(professional.expectedToolCount);
  if (expectedTools !== 21) throw new Error(`PROMOTION FAILED: expectedToolCount=${expectedTools}, wanted 21`);

  const pkgPath = path.join(ROOT, "package.json");
  const lockPath = path.join(ROOT, "package-lock.json");
  const manifestPath = path.join(ROOT, "manifest.json");
  const serverMetaPath = path.join(REPO, "server.json");
  const pluginPath = path.join(REPO, "plugin.json");
  const gatewayPath = path.join(ROOT, "scripts", "remote-gateway.mjs");
  const serverTsPath = path.join(ROOT, "src", "server.ts");

  const pkg = readJson(pkgPath); pkg.version = version; pkg.description = `TrendHub MCP — Professional Intelligence v2 release ${version}；21 MCP tools、Evidence-first、BYO-AI、本地优先。`; writeJson(pkgPath, pkg, dryRun);
  const lock = readJson(lockPath); lock.version = version; if (lock.packages?.[""]) lock.packages[""].version = version; writeJson(lockPath, lock, dryRun);

  const manifest = readJson(manifestPath);
  manifest.version = version;
  manifest.description = "专业级全网趋势情报 MCP Skill：21 个 MCP 工具，覆盖实时热点、Source Reliability、Professional Intelligence v2、多年度历史、异常/预测/回测、品牌与信源宇宙、报告和工作区；BYO-AI、零模型 Key、本地优先。";
  manifest.aiInstall ||= {}; manifest.aiInstall.successMarker = `SMOKE OK tools=${expectedTools}`;
  ensureTool(manifest, { name: "professional_intelligence", group: "analysis", summary: "Professional Intelligence v2：多年度证据、异常、6/24/48/72h 预测与回测、受众/创作者代理、媒体证据、品牌实体、告警和高管报告" });
  ensureTool(manifest, { name: "workspace_manage", group: "collaboration", summary: "本地工作区：RBAC、watchlist、saved query、alert rule 与 audit log；不上传中央服务" });
  manifest.professionalIntelligence = { methodologyVersion: "professional-intelligence-v2", expectedToolCount: expectedTools, history: "sqlite-indexed-multi-year-with-json-fallback", forecastHorizonsHours: [6,24,48,72], forecastValidation: "holdout-backtest-with-uncertainty", sourceUniverse: "priority-tiered-cn-apac-global", userSetup: "zero-config-first", responsiveWeb: true, externalConstraints: professional.externalConstraints };
  if (manifest.tools.length !== expectedTools) throw new Error(`PROMOTION FAILED: manifest would declare ${manifest.tools.length} tools, expected ${expectedTools}`);
  writeJson(manifestPath, manifest, dryRun);

  const serverMeta = readJson(serverMetaPath); serverMeta.version = version; serverMeta.description = "Agent-native evidence-first trend intelligence with 21 MCP tools and Professional Intelligence v2."; if (serverMeta.description.length > 100) throw new Error("PROMOTION FAILED: server.json description exceeds registry limit"); writeJson(serverMetaPath, serverMeta, dryRun);
  const plugin = readJson(pluginPath); plugin.version = version; plugin.description = "Evidence-first Professional Intelligence v2 with 21 MCP tools, source reliability, forecasting, brand/entity context, reports and local-first workspaces."; writeJson(pluginPath, plugin, dryRun);

  updateTextFile(gatewayPath, (text) => replaceRequired(text, /const VERSION = "\d+\.\d+\.\d+";/, `const VERSION = "${version}";`, "remote gateway version"), dryRun);
  updateTextFile(serverTsPath, (text) => {
    let next = replaceRequired(text, /export const SERVER_VERSION = "\d+\.\d+\.\d+";/, `export const SERVER_VERSION = "${version}";`, "MCP server version");
    next = next.replace("On the professional development branch, professional_intelligence adds", "Professional Intelligence v2 adds");
    return next;
  }, dryRun);

  professional.releaseStatus = "release-ready"; professional.candidateVersion = version; professional.promotion = { ...professional.promotion, prepared: true, preflight: "npm run release:preflight", rule: "Metadata is promoted; merge/tag/release/deploy/Registry publication still require explicit approval." }; writeJson(professionalPath, professional, dryRun);
  return { ok: true, version, stableBase: base, expectedTools, dryRun, files: ["trendhub-mcp/package.json","trendhub-mcp/package-lock.json","trendhub-mcp/manifest.json","trendhub-mcp/professional-manifest.json","trendhub-mcp/scripts/remote-gateway.mjs","trendhub-mcp/src/server.ts","server.json","plugin.json"] };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const args = process.argv.slice(2); const dryRun = args.includes("--dry-run"); const version = args.find((x) => !x.startsWith("--"));
  const result = buildPromotionPlan(version, { dryRun });
  console.log(`PROFESSIONAL RELEASE PROMOTION ${dryRun ? "DRY-RUN " : ""}OK version=${result.version} tools=${result.expectedTools} files=${result.files.length}`);
}
