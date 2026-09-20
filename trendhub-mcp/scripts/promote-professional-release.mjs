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
  if (text.includes(replacement)) return text;
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

  const pkg = readJson(pkgPath); pkg.version = version; pkg.description = `TrendHub MCP — ${version}；用户任务式趋势研究、渐进结果、按需来源与 21 个稳定 MCP 工具。`; writeJson(pkgPath, pkg, dryRun);
  const lock = readJson(lockPath); lock.version = version; if (lock.packages?.[""]) lock.packages[""].version = version; writeJson(lockPath, lock, dryRun);

  const manifest = readJson(manifestPath);
  manifest.version = version;
  manifest.description = "专业级多平台趋势研究 MCP：21 个稳定工具；用户从研究任务进入，后端生成判断，来源按需展开，复杂能力不暴露为工具目录。";
  manifest.aiInstall ||= {}; manifest.aiInstall.successMarker = `SMOKE OK tools=${expectedTools}`;
  ensureTool(manifest, { name: "professional_intelligence", group: "analysis", summary: "Professional Intelligence v3：品牌/公司/商业体/产品/Campaign 的 Entity-first 主动取证、决策简报、历史趋势/预测/受众/媒体/风险机会" });
  ensureTool(manifest, { name: "workspace_manage", group: "collaboration", summary: "本地工作区：RBAC、watchlist、saved query、alert rule 与 audit log；不上传中央服务" });
  manifest.professionalIntelligence = { ...manifest.professionalIntelligence, methodologyVersion: "professional-intelligence-v3", compatibilityBase: "professional-intelligence-v2", expectedToolCount: expectedTools, history: "sqlite-indexed-multi-year-with-json-fallback", forecastHorizonsHours: [6,24,48,72], forecastValidation: "holdout-backtest-with-uncertainty", sourceUniverse: "priority-tiered-cn-apac-global", userSetup: "zero-config-first", responsiveWeb: true, entityFirstResearch: "query-evidence-acquisition-before-hotlist-interpretation", executiveReport: "trendhub-executive-report-v2-decision-brief", webExperience: "user-task-research-workspace", deepLinkRouting: "deferred-view-registration-safe", primaryComposition: "research-summary-change-support-next", evidenceInteraction: "on-demand-source-drawer", primaryNavigation: ["home","research","discover","settings"], progressiveResearch: "quick-decision-view-then-full-evidence", reviewQuality: "missing-not-zero-driver-noise-filtered-subject-relevant-events", externalConstraints: professional.externalConstraints };
  if (manifest.tools.length !== expectedTools) throw new Error(`PROMOTION FAILED: manifest would declare ${manifest.tools.length} tools, expected ${expectedTools}`);
  writeJson(manifestPath, manifest, dryRun);

  const serverMeta = readJson(serverMetaPath); serverMeta.version = version; serverMeta.description = "Trend research MCP with 21 tools, 51 sources, evidence-first analysis and Xiaohongshu."; if (serverMeta.description.length > 100) throw new Error("PROMOTION FAILED: server.json description exceeds registry limit"); writeJson(serverMetaPath, serverMeta, dryRun);
  const plugin = readJson(pluginPath); plugin.version = version; plugin.description = `TrendHub ${version}: 多平台趋势研究 MCP，21 工具、证据优先、小红书专区与普通人可读的研究结果页。`; writeJson(pluginPath, plugin, dryRun);

  updateTextFile(gatewayPath, (text) => replaceRequired(text, /const VERSION = "\d+\.\d+\.\d+";/, `const VERSION = "${version}";`, "remote gateway version"), dryRun);
  updateTextFile(serverTsPath, (text) => {
    let next = replaceRequired(text, /export const SERVER_VERSION = "\d+\.\d+\.\d+";/, `export const SERVER_VERSION = "${version}";`, "MCP server version");
    next = next.replace("On the professional development branch, professional_intelligence adds", "Professional Intelligence v3 adds");
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
