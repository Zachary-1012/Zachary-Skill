#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const gateway = readFileSync(join(ROOT, "scripts", "remote-gateway.mjs"), "utf8");
const privacy = readFileSync(join(ROOT, "docs", "privacy.md"), "utf8");
const terms = readFileSync(join(ROOT, "docs", "terms.md"), "utf8");

const must = (condition, message) => {
  if (!condition) throw new Error(`DISTRIBUTION TEST FAILED: ${message}`);
};

must(gateway.includes('process.env.PORT || process.env.TRENHUB_REMOTE_PORT'), "remote gateway must honor hosting PORT");
must(gateway.includes('TRENTHUB_HOST: "127.0.0.1"'), "core must remain loopback-only behind the public gateway");
must(gateway.includes("randomBytes(32)"), "internal bearer token must be generated per process");
must(gateway.includes('TRENTHUB_HTTP_TOKEN: INTERNAL_TOKEN'), "gateway must authenticate to the private core");
must(gateway.includes('TRENTHUB_AUTOUPDATE: "0"'), "hosted deployments must not self-mutate via local auto-update");
must(gateway.includes('url.pathname === "/mcp"'), "public MCP endpoint missing");
must(gateway.includes('url.pathname === "/health"'), "public health endpoint missing");
must(gateway.includes('url.pathname === "/privacy"'), "public privacy endpoint missing");
must(gateway.includes('url.pathname === "/terms"'), "public terms endpoint missing");
must(gateway.includes('url.pathname === "/.well-known/mcp.json"'), "MCP discovery metadata missing");
must(gateway.includes('url.pathname.startsWith("/api/")'), "gateway must explicitly block local /api routes");
must(gateway.includes("MAX_BODY_BYTES"), "request body limit missing");
must(gateway.includes("MAX_CONCURRENCY"), "concurrency guard missing");
must(!gateway.includes("XHS_COOKIE:"), "public gateway must not inject a private Xiaohongshu cookie");
must(privacy.includes("does not require an account"), "privacy notice must state account posture");
must(privacy.includes("third-party cloud infrastructure"), "privacy notice must disclose hosting infrastructure processing");
must(terms.includes("not affiliated with or endorsed"), "terms must disclose third-party platform independence");
must(terms.includes("not factual guarantees"), "terms must bound analytical indicators");

console.log("DISTRIBUTION TEST OK remote-gateway=isolated public-routes=5 privacy=present terms=present");
