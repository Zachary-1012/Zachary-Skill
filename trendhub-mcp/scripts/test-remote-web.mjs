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
const viewsA = read("web/views-a.js");
const styles = read("web/styles.css");

if (!gateway.includes('import { serveStatic } from "../dist/src/web/static.js"')) fail("remote gateway must reuse the existing packaged web console");
if (!gateway.includes('url.pathname === "/mcp"')) fail("Remote MCP endpoint was removed");
if (!gateway.includes('transport: { type: "streamable-http"')) fail("MCP discovery must remain Streamable HTTP");
if (!gateway.includes('"/api/platforms"') || !gateway.includes('"/api/trending"') || !gateway.includes('"/api/brief"')) fail("safe public query API allowlist is incomplete");

const allowlistMatch = gateway.match(/const PUBLIC_API_PATHS = new Set\(\[([\s\S]*?)\]\);/);
if (!allowlistMatch) fail("public API allowlist was not found");
if (allowlistMatch[1].includes("/api/snapshot")) fail("write route /api/snapshot must remain private");
if (!gateway.includes('req.method !== "GET"')) fail("public web API must remain GET/query only");

if (!index.includes('name="viewport"')) fail("mobile viewport metadata missing");
if (!styles.includes("@media (max-width: 720px)")) fail("phone responsive breakpoint missing");
if (!styles.includes("overflow-x: auto")) fail("mobile navigation must remain horizontally usable");
if (!app.includes("TRENHUB_IS_REMOTE") || !app.includes("TRENHUB_RUNTIME_MODE")) fail("web console must detect local vs public runtime");
if (!viewsA.includes('health.tools || 19')) fail("dashboard must report the 19-tool contract");

console.log("REMOTE WEB CONTRACT OK mobile=true mcp=true tools=19 writeRoutes=private");
