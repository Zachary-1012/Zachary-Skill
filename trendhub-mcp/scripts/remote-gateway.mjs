#!/usr/bin/env node
/**
 * TrendHub public Remote MCP + responsive web gateway.
 *
 * Security model:
 * - Core runtime remains bound to loopback behind a per-process bearer token.
 * - /mcp stays the public Streamable HTTP MCP endpoint.
 * - The existing zero-dependency TrendHub web console is served at /.
 * - Only an explicit allowlist of read/query /api/* routes is proxied publicly.
 * - Mutating/local-only routes such as /api/snapshot and /api/workspaces are never exposed.
 */
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "../dist/src/web/static.js";
import { createSnapshotScheduler } from "../dist/src/runtime/snapshot-scheduler.js";

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
const VERSION = "1.5.2";
const TOOL_COUNT = 21;

function envBool(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

const SNAPSHOT_ENABLED = envBool("TRENTHUB_REMOTE_SNAPSHOT_ENABLED", false);
const SNAPSHOT_INTERVAL_MIN = Math.max(15, envNumber("TRENHUB_SNAPSHOT_INTERVAL_MIN", 60));
const SNAPSHOT_INITIAL_DELAY_MS = Math.max(1_000, envNumber("TRENHUB_SNAPSHOT_INITIAL_DELAY_MS", 30_000));

const snapshotScheduler = createSnapshotScheduler({
  enabled: SNAPSHOT_ENABLED,
  intervalMs: SNAPSHOT_INTERVAL_MIN * 60_000,
  initialDelayMs: SNAPSHOT_INITIAL_DELAY_MS,
});

let activeRequests = 0;
let shuttingDown = false;

const PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/platforms",
  "/api/categories",
  "/api/trending",
  "/api/overlap",
  "/api/clusters",
  "/api/changes",
  "/api/curve",
  "/api/related",
  "/api/signals",
  "/api/events",
  "/api/topic",
  "/api/templates",
  "/api/template",
  "/api/brief",
  "/api/xhs/status",
  "/api/xhs/topics",
  "/api/professional",
  "/api/professional/report",
  "/api/professional/audience",
  "/api/professional/media",
  "/api/professional/sources",
  "/api/professional/entities",
]);

const privacyText = `TrendHub Remote Privacy Notice\n\nLast updated: 2026-09-17\n\nTrendHub Remote provides a public MCP endpoint and a responsive read/query web console for trend intelligence. The service does not require a TrendHub account and does not intentionally store analytics identifiers, advertising identifiers, model prompts, usernames, or account identifiers. Public web-console queries and MCP tool arguments are processed only as needed to answer the request. Trend history stored by the service consists of public-source trend evidence and operational source-reliability metadata, not user profiles.\n\nThe hosted service runs on third-party cloud infrastructure. The hosting provider and network intermediaries may process connection metadata such as IP address, timestamps, and request metadata under their own infrastructure policies. TrendHub does not use that infrastructure data for advertising or user profiling.\n\nWhen a query retrieves a public source, TrendHub makes the outbound request from the hosted service. Source availability, rate limits, and source terms remain controlled by the respective third-party services. The public hosted edition does not use a visitor's private Xiaohongshu cookie. Local installation remains available for users who prefer local-only operation.\n\nFor source code, security reporting, and the local edition, see https://github.com/Zachary-1012/Zachary-Skill.`;

const termsText = `TrendHub Remote Terms of Use\n\nLast updated: 2026-09-17\n\nTrendHub provides evidence-oriented access to public trend sources and deterministic trend-analysis helpers through MCP and the public web console. It is not affiliated with or endorsed by the third-party platforms it reads. Source data may be incomplete, delayed, rate-limited, unavailable, or changed by the source platform at any time. TrendHub marks missing/degraded evidence rather than guaranteeing continuous source availability.\n\nTrend lifecycle, confidence, sentiment, anomaly, forecast, and 24h/72h benchmark outputs are analytical indicators, not factual guarantees, investment advice, legal advice, medical advice, or predictions of future outcomes. Forecasts are conditional extrapolations of captured evidence and include holdout validation and uncertainty when sufficient history exists. Users remain responsible for verifying important decisions against primary sources and for complying with applicable law and third-party platform terms.\n\nDo not use the service to access private data, evade access controls, harass people, or perform unlawful activity. The hosted endpoint may apply capacity limits or be changed or withdrawn to protect reliability and security.\n\nTrendHub v1.4.3 and later TrendHub-authored code is source-available under the TrendHub Free Use License 1.0. Personal and internal company/business use of unmodified copies is permitted; modification, derivative works, redistribution, republication, sublicensing, resale, and third-party hosted access to the software itself are prohibited unless separately authorized. TrendHub v1.4.2 and earlier retain the rights granted when those releases were published. Third-party components remain under their own licenses.`;

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
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
      { host: "127.0.0.1", port: INTERNAL_PORT, path: "/mcp", method: "POST", headers, timeout: REQUEST_TIMEOUT_MS },
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

function internalJson(path) {
  return new Promise((resolve, reject) => {
    const upstream = httpRequest(
      {
        host: "127.0.0.1",
        port: INTERNAL_PORT,
        path,
        method: "GET",
        headers: { host: `127.0.0.1:${INTERNAL_PORT}`, authorization: `Bearer ${INTERNAL_TOKEN}`, accept: "application/json" },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (upstreamRes) => {
        const chunks = [];
        upstreamRes.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        upstreamRes.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if ((upstreamRes.statusCode || 500) >= 400) return reject(new Error(`internal HTTP ${upstreamRes.statusCode}: ${raw.slice(0, 200)}`));
          try { resolve(JSON.parse(raw)); } catch (err) { reject(err); }
        });
      },
    );
    upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
    upstream.on("error", reject);
    upstream.end();
  });
}

function proxyPublicApi(req, res, targetPath) {
  return new Promise((resolve) => {
    const upstream = httpRequest(
      {
        host: "127.0.0.1",
        port: INTERNAL_PORT,
        path: targetPath,
        method: "GET",
        headers: { host: `127.0.0.1:${INTERNAL_PORT}`, authorization: `Bearer ${INTERNAL_TOKEN}`, accept: req.headers.accept || "application/json" },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (upstreamRes) => {
        const outHeaders = { ...upstreamRes.headers };
        delete outHeaders.connection;
        delete outHeaders["keep-alive"];
        delete outHeaders["set-cookie"];
        outHeaders["cache-control"] = "no-store";
        outHeaders["x-content-type-options"] = "nosniff";
        outHeaders["referrer-policy"] = "no-referrer";
        res.writeHead(upstreamRes.statusCode || 502, outHeaders);
        upstreamRes.pipe(res);
        upstreamRes.on("end", resolve);
      },
    );
    upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
    upstream.on("error", (err) => {
      if (!res.headersSent) json(res, 502, { error: "upstream_unavailable", detail: err.message });
      else res.destroy(err);
      resolve();
    });
    upstream.end();
  });
}

async function servePublicStatic(pathname, res) {
  const sr = serveStatic(pathname);
  const headers = {};
  sr.headers.forEach((value, key) => { headers[key] = value; });
  headers["X-Content-Type-Options"] = "nosniff";
  headers["Referrer-Policy"] = "no-referrer";
  headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
  headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
  headers["X-TrendHub-Web-Version"] = VERSION;
  // The public console is served from one stable Railway URL. Never allow a
  // phone browser to keep an obsolete HTML/CSS/JS shell after a hotfix.
  if (pathname === "/" || pathname === "/index.html" || /\.(?:css|js)$/i.test(pathname)) headers["Cache-Control"] = "no-store, max-age=0";
  res.writeHead(sr.status, headers);
  res.end(Buffer.from(await sr.arrayBuffer()));
}

function coreProbe() {
  return new Promise((resolve) => {
    const req = httpRequest({ host: "127.0.0.1", port: INTERNAL_PORT, path: "/", method: "GET", timeout: 1_500 }, (res) => {
      res.resume();
      resolve((res.statusCode || 500) < 500);
    });
    req.on("timeout", () => { req.destroy(); resolve(false); });
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

const core = spawn(process.execPath, [CORE_ENTRY, "--http", `--port=${INTERNAL_PORT}`], { cwd: ROOT, env: childEnv, stdio: ["ignore", "inherit", "inherit"] });
core.on("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`[trendhub-remote] core exited code=${code} signal=${signal || "none"}`);
    process.exit(code || 1);
  }
});

await waitForCore(core);
snapshotScheduler.start();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", publicBase(req));

    if (url.pathname === "/health") {
      let coreHealth = {};
      try { coreHealth = await internalJson("/api/health"); } catch { coreHealth = {}; }
      return json(res, 200, {
        ok: true,
        name: "trendhub-mcp",
        version: VERSION,
        transport: "streamable-http",
        tools: TOOL_COUNT,
        platforms: Number(coreHealth.platformCount || 38),
        web: true,
        snapshotScheduler: snapshotScheduler.getState(),
      });
    }

    if (url.pathname === "/privacy") return text(res, 200, privacyText);
    if (url.pathname === "/terms") return text(res, 200, termsText);

    if (url.pathname === "/.well-known/mcp.json") {
      const base = publicBase(req);
      return json(res, 200, {
        name: "io.github.Zachary-1012/trendhub",
        title: "TrendHub",
        version: VERSION,
        description: `Evidence-first trend intelligence across 38 public trend sources with ${TOOL_COUNT} MCP tools.`,
        transport: { type: "streamable-http", url: `${base}/mcp` },
        web: `${base}/`,
        privacy: `${base}/privacy`,
        terms: `${base}/terms`,
        repository: "https://github.com/Zachary-1012/Zachary-Skill",
      });
    }

    if (url.pathname === "/mcp") {
      const cors = corsHeaders();
      if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
      if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed", allowed: ["POST", "OPTIONS"] }, cors);
      if (activeRequests >= MAX_CONCURRENCY) return json(res, 429, { error: "busy", retryAfterSeconds: 2 }, { ...cors, "Retry-After": "2" });
      activeRequests += 1;
      try { await proxyMcp(req, res, await readBody(req)); } finally { activeRequests -= 1; }
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      if (req.method !== "GET") return json(res, 405, { error: "public_web_api_is_read_query_only", allowed: ["GET"] });
      if (!PUBLIC_API_PATHS.has(url.pathname)) return json(res, 404, { error: "not_exposed_on_public_remote" });
      if (activeRequests >= MAX_CONCURRENCY) return json(res, 429, { error: "busy", retryAfterSeconds: 2 }, { "Retry-After": "2" });

      if (url.pathname === "/api/health") {
        const internal = await internalJson("/api/health");
        return json(res, 200, {
          ok: true,
          service: "trendhub-mcp",
          version: VERSION,
          platformCount: internal.platformCount,
          categoryCount: internal.categoryCount,
          tools: TOOL_COUNT,
          runtime: "remote",
          mcpEndpoint: `${publicBase(req)}/mcp`,
          time: new Date().toISOString(),
        });
      }

      activeRequests += 1;
      try { await proxyPublicApi(req, res, `${url.pathname}${url.search}`); } finally { activeRequests -= 1; }
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "method_not_allowed", allowed: ["GET", "HEAD"] });
    return servePublicStatic(url.pathname, res);
  } catch (err) {
    const status = Number(err?.statusCode) || 500;
    return json(res, status, {
      error: status === 413 ? "request_too_large" : "internal_error",
      detail: process.env.NODE_ENV === "production" ? undefined : String(err?.message || err),
    });
  }
});

server.listen(PUBLIC_PORT, PUBLIC_HOST, () => {
  console.error(`[trendhub-remote] v${VERSION} listening on ${PUBLIC_HOST}:${PUBLIC_PORT} -> 127.0.0.1:${INTERNAL_PORT}/mcp`);
  console.error("[trendhub-remote] public routes: / /mcp /health /privacy /terms /.well-known/mcp.json + safe GET /api/* allowlist");
  console.error("[trendhub-remote] local-only write routes remain private");
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`[trendhub-remote] shutting down (${signal})`);
  snapshotScheduler.stop();
  server.close(() => process.exit(0));
  core.kill("SIGTERM");
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
