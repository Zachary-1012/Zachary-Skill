#!/usr/bin/env node
/**
 * TrendHub public Remote MCP gateway.
 *
 * This wrapper deliberately keeps the core server's secure default unchanged:
 * the MCP core still binds to loopback with a private per-process bearer token.
 * Only /mcp and a small set of public metadata/policy endpoints are exposed.
 * /api/* and the local UI are never proxied.
 */
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PUBLIC_HOST = process.env.TRENHUB_REMOTE_HOST || "0.0.0.0";
const PUBLIC_PORT = Number(process.env.PORT || process.env.TRENHUB_REMOTE_PORT || 8080);
const INTERNAL_PORT = Number(process.env.TRENHUB_INTERNAL_PORT || 18333);
const MAX_BODY_BYTES = Number(process.env.TRENHUB_REMOTE_MAX_BODY_BYTES || 2 * 1024 * 1024);
const MAX_CONCURRENCY = Number(process.env.TRENHUB_REMOTE_MAX_CONCURRENCY || 24);
const REQUEST_TIMEOUT_MS = Number(process.env.TRENHUB_REMOTE_TIMEOUT_MS || 90_000);
const CORE_ENTRY = join(ROOT, "dist", "src", "index.js");
const INTERNAL_TOKEN = randomBytes(32).toString("hex");
const VERSION = "1.4.1";
let activeRequests = 0;
let shuttingDown = false;

const privacyText = `TrendHub Remote Privacy Notice\n\nLast updated: 2026-09-17\n\nTrendHub Remote is a public, read-oriented MCP endpoint for trend intelligence. The application does not require an account and does not intentionally collect analytics, advertising identifiers, model prompts, cookies, usernames, account identifiers, or user IP addresses into TrendHub application storage. Tool arguments are processed in memory only as needed to answer a request. Trend history stored by the service consists of public-source trend evidence and operational source-reliability metadata, not user profiles.\n\nThe hosted service runs on third-party cloud infrastructure. The hosting provider and network intermediaries may process connection metadata such as IP address, timestamps, and request metadata under their own infrastructure policies. TrendHub does not use that infrastructure data for advertising or user profiling.\n\nWhen a tool retrieves a public source, TrendHub makes the outbound request from the hosted service. Source availability, rate limits, and source terms remain controlled by the respective third-party services. The public hosted edition does not use a visitor's private Xiaohongshu cookie.\n\nFor source code, security reporting, and the local zero-central-return edition, see https://github.com/Zachary-1012/Zachary-Skill.`;

const termsText = `TrendHub Remote Terms of Use\n\nLast updated: 2026-09-17\n\nTrendHub provides evidence-oriented access to public trend sources and deterministic trend-analysis helpers. It is not affiliated with or endorsed by the third-party platforms it reads. Source data may be incomplete, delayed, rate-limited, unavailable, or changed by the source platform at any time. TrendHub marks missing/degraded evidence rather than guaranteeing continuous source availability.\n\nTrend lifecycle, confidence, sentiment, and 24h/72h benchmark outputs are analytical indicators, not factual guarantees, investment advice, legal advice, medical advice, or predictions of future outcomes. Users remain responsible for verifying important decisions against primary sources and for complying with applicable law and third-party platform terms.\n\nDo not use the service to access private data, evade access controls, harass people, or perform unlawful activity. The hosted endpoint may apply capacity limits or be changed or withdrawn to protect reliability and security.\n\nThe open-source TrendHub code is distributed under the repository's MIT License. These hosted-service terms govern use of the public endpoint and do not remove rights granted by the open-source license.`;

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(data, null, 2));
}

function text(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.end(body);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, accept, mcp-protocol-version, mcp-session-id",
    "Access-Control-Expose-Headers": "mcp-session-id",
    "Access-Control-Max-Age": "86400",
  };
}

function publicBase(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers.host || "localhost";
  return `${proto}://${host}`;
}

async function readBody(req) {
  const declared = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    const err = new Error("request body too large");
    err.statusCode = 413;
    throw err;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      const err = new Error("request body too large");
      err.statusCode = 413;
      throw err;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function proxyMcp(req, res, body) {
  return new Promise((resolve) => {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.authorization;
    delete headers.connection;
    delete headers["content-length"];
    headers.host = `127.0.0.1:${INTERNAL_PORT}`;
    headers.authorization = `Bearer ${INTERNAL_TOKEN}`;
    headers["content-length"] = String(body.length);

    const upstream = httpRequest(
      {
        host: "127.0.0.1",
        port: INTERNAL_PORT,
        path: "/mcp",
        method: "POST",
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (upstreamRes) => {
        const outHeaders = { ...upstreamRes.headers, ...corsHeaders() };
        delete outHeaders.connection;
        delete outHeaders["keep-alive"];
        res.writeHead(upstreamRes.statusCode || 502, outHeaders);
        upstreamRes.pipe(res);
        upstreamRes.on("end", resolve);
      },
    );
    upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
    upstream.on("error", (err) => {
      if (!res.headersSent) json(res, 502, { error: "upstream_unavailable", detail: err.message }, corsHeaders());
      else res.destroy(err);
      resolve();
    });
    upstream.end(body);
  });
}

function coreProbe() {
  return new Promise((resolve) => {
    const req = httpRequest(
      { host: "127.0.0.1", port: INTERNAL_PORT, path: "/", method: "GET", timeout: 1_500 },
      (res) => {
        res.resume();
        resolve((res.statusCode || 500) < 500);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function waitForCore(child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`TrendHub core exited before readiness (code=${child.exitCode})`);
    if (await coreProbe()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("TrendHub core did not become ready within 30s");
}

const childEnv = {
  ...process.env,
  TRENTHUB_TRANSPORT: "http",
  TRENTHUB_HOST: "127.0.0.1",
  TRENTHUB_PORT: String(INTERNAL_PORT),
  TRENTHUB_HTTP_TOKEN: INTERNAL_TOKEN,
  TRENTHUB_AUTOUPDATE: "0",
};
delete childEnv.PORT;

const core = spawn(process.execPath, [CORE_ENTRY, "--http", `--port=${INTERNAL_PORT}`], {
  cwd: ROOT,
  env: childEnv,
  stdio: ["ignore", "inherit", "inherit"],
});
core.on("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`[trendhub-remote] core exited code=${code} signal=${signal || "none"}`);
    process.exit(code || 1);
  }
});

await waitForCore(core);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", publicBase(req));
    if (url.pathname === "/health") {
      return json(res, 200, { ok: true, name: "trendhub-mcp", version: VERSION, transport: "streamable-http", tools: 19 });
    }
    if (url.pathname === "/privacy") return text(res, 200, privacyText);
    if (url.pathname === "/terms") return text(res, 200, termsText);
    if (url.pathname === "/.well-known/mcp.json") {
      const base = publicBase(req);
      return json(res, 200, {
        name: "io.github.Zachary-1012/trendhub",
        title: "TrendHub",
        version: VERSION,
        description: "Evidence-first trend intelligence across 38 public trend sources with 19 MCP tools.",
        transport: { type: "streamable-http", url: `${base}/mcp` },
        privacy: `${base}/privacy`,
        terms: `${base}/terms`,
        repository: "https://github.com/Zachary-1012/Zachary-Skill",
      });
    }
    if (url.pathname === "/mcp") {
      const cors = corsHeaders();
      if (req.method === "OPTIONS") {
        res.writeHead(204, cors);
        return res.end();
      }
      if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed", allowed: ["POST", "OPTIONS"] }, cors);
      if (activeRequests >= MAX_CONCURRENCY) return json(res, 429, { error: "busy", retryAfterSeconds: 2 }, { ...cors, "Retry-After": "2" });
      activeRequests += 1;
      try {
        const body = await readBody(req);
        await proxyMcp(req, res, body);
      } finally {
        activeRequests -= 1;
      }
      return;
    }
    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "not_exposed_on_public_remote" });
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return text(
        res,
        200,
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrendHub Remote MCP</title><style>body{font:16px system-ui;max-width:760px;margin:64px auto;padding:0 24px;line-height:1.6}code{background:#f4f4f4;padding:2px 6px;border-radius:6px}a{color:inherit}</style><h1>TrendHub Remote MCP</h1><p>Evidence-first professional trend intelligence: 38 public trend sources, 19 MCP tools, Source Reliability, trend lifecycle/velocity/persistence/diffusion/confidence and 24h/72h lead benchmarks.</p><p>MCP endpoint: <code>/mcp</code> · <a href="/health">health</a> · <a href="/privacy">privacy</a> · <a href="/terms">terms</a> · <a href="https://github.com/Zachary-1012/Zachary-Skill">source</a></p><p>No TrendHub account or model API key is required.</p>`,
        "text/html; charset=utf-8",
      );
    }
    return json(res, 404, { error: "not_found" });
  } catch (err) {
    const status = Number(err?.statusCode) || 500;
    return json(res, status, { error: status === 413 ? "request_too_large" : "internal_error" });
  }
});

server.listen(PUBLIC_PORT, PUBLIC_HOST, () => {
  console.error(`[trendhub-remote] v${VERSION} listening on ${PUBLIC_HOST}:${PUBLIC_PORT} -> 127.0.0.1:${INTERNAL_PORT}/mcp`);
  console.error("[trendhub-remote] public routes: /mcp /health /privacy /terms /.well-known/mcp.json");
  console.error("[trendhub-remote] local UI and /api/* are not exposed");
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`[trendhub-remote] shutting down (${signal})`);
  server.close(() => process.exit(0));
  core.kill("SIGTERM");
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
