#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const fail = (message) => {
  console.error(`REMOTE WEB CONTRACT FAIL: ${message}`);
  process.exit(1);
};

const gateway = read("scripts/remote-gateway.mjs");
const index = read("web/index.html");
const app = read("web/app.js");
const viewsE = read("web/views-e.js");
const viewsF = read("web/views-f.js");
const viewsB = read("web/views-b.js");
const viewsC = read("web/views-c.js");
const viewsD = read("web/views-d.js");
const styles = read("web/styles.css");
const responsive = read("web/responsive-v2.css");
const experience = read("web/experience-v2.css");
const professional = JSON.parse(read("professional-manifest.json"));
const pkg = JSON.parse(read("package.json"));
const expectedTools = Number(professional.expectedToolCount);
const webVersion = `?v=${pkg.version}`;

if (!gateway.includes('import { serveStatic } from "../dist/src/web/static.js"')) fail("remote gateway must reuse the existing packaged web console");
if (!gateway.includes('url.pathname === "/mcp"')) fail("Remote MCP endpoint was removed");
if (!gateway.includes('transport: { type: "streamable-http"')) fail("MCP discovery must remain Streamable HTTP");
if (!gateway.includes('"/api/platforms"') || !gateway.includes('"/api/trending"') || !gateway.includes('"/api/brief"')) fail("safe public query API allowlist is incomplete");
if (!gateway.includes('"/api/professional"') || !gateway.includes('"/api/professional/report"')) fail("professional read/query APIs must be public-ready");
if (!gateway.includes('"/api/professional/sources"') || !gateway.includes('"/api/professional/entities"')) fail("source universe and entity read APIs must be public-ready");

const allowlistMatch = gateway.match(/const PUBLIC_API_PATHS = new Set\(\[([\s\S]*?)\]\);/);
if (!allowlistMatch) fail("public API allowlist was not found");
if (allowlistMatch[1].includes("/api/snapshot")) fail("write route /api/snapshot must remain private");
if (allowlistMatch[1].includes("/api/workspaces")) fail("workspace mutations must remain private");
if (allowlistMatch[1].includes("/api/observability")) fail("internal process observability must remain private");
if (allowlistMatch[1].includes("/api/ops/")) fail("Creator Ops routes must remain private on the public remote");
if (!gateway.includes('req.method !== "GET"')) fail("public web API must remain GET/query only");
if (!gateway.includes(`const TOOL_COUNT = ${expectedTools}`)) fail(`remote gateway tool count must be ${expectedTools}`);
if (!gateway.includes('releaseState: "RELEASED"') || !gateway.includes("operatingState") || !gateway.includes('truthSemantics: "trendhub-truth-state-v1"')) fail("release/operating/truth-state health semantics missing");
if (!gateway.includes('evidenceContract: "trendhub-evidence-contract-v1"') || !gateway.includes('namespace: "trendhub-namespace-v1"') || !gateway.includes('skillContract: "trendhub-skill-v2"')) fail("v1.6 agent-native health contract missing");
if (!gateway.includes("OPENAI_APPS_CHALLENGE_TOKEN") || !gateway.includes('url.pathname === "/.well-known/openai-apps-challenge"')) fail("OpenAI Plugins Directory domain-verification route missing");
if (!gateway.includes('return res.end(OPENAI_APPS_CHALLENGE_TOKEN)') || !gateway.includes('"Cache-Control": "no-store"')) fail("OpenAI domain challenge must return only the configured token without caching");

if (!index.includes('name="viewport"') || !index.includes("viewport-fit=cover")) fail("mobile viewport/safe-area metadata missing");
if (!index.includes(`href="responsive-v2.css${webVersion}"`) || !index.includes(`src="app.js${webVersion}"`)) fail("public shell assets must be versioned to the current product release");
if (!index.includes('data-view="professional"') || !index.includes('data-view="sources"') || !index.includes(`src="views-e.js${webVersion}"`)) fail("professional/source-universe navigation missing");
if (!index.includes('data-view="ops"') || !index.includes(`src="views-f.js${webVersion}"`)) fail("Creator Ops navigation missing");
if (!styles.includes("@media (max-width: 720px)")) fail("base phone responsive breakpoint missing");
if (!responsive.includes("@media (max-width: 720px)")) fail("professional phone breakpoint missing");
if (!responsive.includes("@media (max-width: 900px)") || !responsive.includes(".app { display: block; }")) fail("defensive compact shell breakpoint missing");
if (!responsive.includes("100dvh") || !responsive.includes("safe-area-inset")) fail("mobile safe-area/dynamic viewport support missing");
if (!responsive.includes("overflow-x: auto") || !responsive.includes("table-wrap")) fail("mobile tables must remain horizontally usable");
if (!index.includes('id="navToggle"') || !app.includes("navToggle")) fail("mobile navigation toggle wiring missing");
if (!index.includes('href="experience-v2.css' + webVersion + '"')) fail("semantic Experience stylesheet missing");
if (!index.includes('id="navigationSheet"') || !index.includes('id="navBackdrop"')) fail("contextual index sheet shell missing");
if (!experience.includes(".topbar-inner,") || !experience.includes(".content {")) fail("header and research surface must share one alignment axis");
if (!experience.includes("Subject Field -> Change Axis") || !experience.includes(".trace-stage")) fail("semantic Field/Axis/Trace composition missing");
if (!app.includes("closeNavigation") || !app.includes('addEventListener("pageshow"')) fail("contextual navigation close/restore handling missing");
if (!app.includes('addEventListener("DOMContentLoaded"') || /\nroute\(\);\s*$/.test(viewsD)) fail("deep-link routing must wait for deferred view registration");
if (!gateway.includes('headers["X-TrendHub-Web-Version"] = VERSION') || !gateway.includes('"no-store, max-age=0"')) fail("public HTML/CSS/JS must never retain an obsolete mobile shell");
if (!responsive.includes("pointer: coarse")) fail("touch target contract missing");
if (!viewsB.includes("实时话题词组图") || !viewsB.includes('qs.set("topic", topic)')) fail("topic radar/filter UX missing");
if (!viewsC.includes("动态趋势曲线")) fail("dynamic trend curve explanation missing");
if (!app.includes("chart-line") || !responsive.includes("chart-draw")) fail("animated trend curve contract missing");
if (!app.includes("TRENHUB_IS_REMOTE") || !app.includes("TRENHUB_RUNTIME_MODE")) fail("web console must detect local vs public runtime");
if (!viewsE.includes("SUBJECT CONTEXT") || !viewsE.includes("EVIDENCE TRACE") || !viewsE.includes("trace-flow") || !viewsE.includes("/api/professional")) fail("professional semantic research view missing");
if (!viewsE.includes("/api/professional/sources") || !viewsE.includes("/api/professional/entities")) fail("source universe UX missing");
if (!viewsE.includes("TRENHUB_IS_REMOTE")) fail("workspace view must distinguish remote from local mode");
if (!viewsF.includes("/api/ops/summary") || !viewsF.includes("TRENHUB_IS_REMOTE")) fail("Creator Ops must have local API and public-boundary UX");
if (!viewsF.includes("不会自动重启") || !viewsF.includes("不暴露")) fail("Creator Ops safety boundary copy missing");

console.log(`REMOTE WEB CONTRACT OK semantic=true aligned=true deep-link=true mobile=true touch=true safe-area=true mcp=true tools=${expectedTools} professional=true sourceUniverse=true creatorOps=local-only writeRoutes=private`);
