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
const styles = read("web/styles.css");
const responsive = read("web/responsive-v2.css");
const professional = JSON.parse(read("professional-manifest.json"));
const expectedTools = Number(professional.expectedToolCount);

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

if (!index.includes('name="viewport"') || !index.includes("viewport-fit=cover")) fail("mobile viewport/safe-area metadata missing");
if (!index.includes('href="responsive-v2.css"')) fail("responsive v2 stylesheet missing from shell");
if (!index.includes('data-view="professional"') || !index.includes('data-view="sources"') || !index.includes('src="views-e.js"')) fail("professional/source-universe navigation missing");
if (!index.includes('data-view="ops"') || !index.includes('src="views-f.js"')) fail("Creator Ops navigation missing");
if (!styles.includes("@media (max-width: 720px)")) fail("base phone responsive breakpoint missing");
if (!responsive.includes("@media (max-width: 720px)")) fail("professional phone breakpoint missing");
if (!responsive.includes("display: grid !important") || !responsive.includes("flex-direction: initial !important")) fail("mobile shell must override legacy horizontal navigation flex");
if (!responsive.includes("@media (max-width: 900px)") || !responsive.includes(".app { display: block; }")) fail("defensive compact shell breakpoint missing");
if (!responsive.includes("100dvh") || !responsive.includes("safe-area-inset")) fail("mobile safe-area/dynamic viewport support missing");
if (!responsive.includes("overflow-x: auto") || !responsive.includes("table-wrap")) fail("mobile tables must remain horizontally usable");
if (!responsive.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") || !responsive.includes("white-space: normal")) fail("mobile navigation must wrap instead of clipping");
if (!index.includes('id="navToggle"') || !app.includes("navToggle")) fail("mobile navigation toggle wiring missing");
if (!responsive.includes(".nav-toggle") || !responsive.includes(".sidebar.nav-open .nav")) fail("mobile navigation open/closed states missing");
if (!responsive.includes("max-height: 0")) fail("mobile navigation must be collapsed by default");
if (!responsive.includes("pointer: coarse")) fail("touch target contract missing");
if (!viewsB.includes("实时话题词组图") || !viewsB.includes('qs.set("topic", topic)')) fail("topic radar/filter UX missing");
if (!viewsC.includes("动态趋势曲线")) fail("dynamic trend curve explanation missing");
if (!app.includes("chart-line") || !responsive.includes("chart-draw")) fail("animated trend curve contract missing");
if (!app.includes("TRENHUB_IS_REMOTE") || !app.includes("TRENHUB_RUNTIME_MODE")) fail("web console must detect local vs public runtime");
if (!viewsE.includes("Professional Intelligence v2") || !viewsE.includes("/api/professional")) fail("professional dashboard view missing");
if (!viewsE.includes("/api/professional/sources") || !viewsE.includes("/api/professional/entities")) fail("source universe UX missing");
if (!viewsE.includes("TRENHUB_IS_REMOTE")) fail("workspace view must distinguish remote from local mode");
if (!viewsF.includes("/api/ops/summary") || !viewsF.includes("TRENHUB_IS_REMOTE")) fail("Creator Ops must have local API and public-boundary UX");
if (!viewsF.includes("不会自动重启") || !viewsF.includes("不暴露")) fail("Creator Ops safety boundary copy missing");

console.log(`REMOTE WEB CONTRACT OK mobile=true touch=true safe-area=true mcp=true tools=${expectedTools} professional=true sourceUniverse=true creatorOps=local-only writeRoutes=private`);
