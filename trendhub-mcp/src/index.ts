#!/usr/bin/env node
/**
 * TrendHub MCP 入口
 * - 默认 stdio：供 Claude / Cursor / 豆包 / VS Code 等桌面客户端以子进程方式连接。
 * - --http 或 TRENHUB_TRANSPORT=http：HTTP MCP（默认 127.0.0.1:8333/mcp）。
 * - --ui：在 --http 基础上启动本地可视化控制台（http://127.0.0.1:8333/）并自动打开浏览器。
 *   2.0 内容工作台使用宿主 AI 或使用者控制的本地端点；TrendHub 不持有模型凭据。
 *
 * 网络边界：loopback 默认免鉴权；任何非 loopback 监听都必须设置 TRENHUB_HTTP_TOKEN，
 * /mcp 与 /api/* 使用 Authorization: Bearer <token>。插件无模型 Key、无第三方遥测、
 * 不向 TrendHub 中央服务回传使用数据；取数时仅向目标公开数据源发起必要请求。
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { exec } from "node:child_process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { handleApi } from "./web/api.js";
import { handleProfessionalApi } from "./web/professional-api.js";
import { handleCreatorOpsApi } from "./web/creator-ops-api.js";
import { serveStatic } from "./web/static.js";
import { assertHttpNetworkBoundary, isHttpAuthorized } from "./security/http.js";
import { recordApiObservation } from "./observability/local.js";

if (process.argv.includes("--http") || process.argv.includes("--ui")) config.transport = "http";
if (process.argv.includes("--stdio")) config.transport = "stdio";
const OPEN_BROWSER = process.argv.includes("--ui");
const portArg = process.argv.find((a) => a.startsWith("--port="));
if (portArg) config.httpPort = Number(portArg.split("=")[1]) || config.httpPort;

function openInBrowser(url: string): void {
  try {
    if (process.platform === "win32") exec(`start "" "${url}"`, { windowsHide: true });
    else if (process.platform === "darwin") exec(`open "${url}"`);
    else exec(`xdg-open "${url}" >/dev/null 2>&1`);
  } catch {
    /* 自动打开失败时，用户可手动访问控制台 URL */
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

function requireHttpAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (isHttpAuthorized(req, config.httpToken)) return true;
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "WWW-Authenticate": 'Bearer realm="trendhub"',
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify({ error: "unauthorized" }));
  return false;
}

async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.on("close", () => process.exit(0));
  // eslint-disable-next-line no-console
  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running over stdio`);
}

async function runHttp(): Promise<void> {
  assertHttpNetworkBoundary(config.httpHost, config.httpToken);
  const base = `http://${config.httpHost}:${config.httpPort}`;
  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `${base}/`);
      const pathname = url.pathname;

      if (pathname === "/mcp") {
        if (!requireHttpAuth(req, res)) return;
        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "method not allowed (stateless mode accepts POST)" }));
          return;
        }
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on("close", () => {
          transport.close();
          server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res);
        return;
      }

      if (pathname.startsWith("/api/")) {
        if (!requireHttpAuth(req, res)) return;
        const body = await readBody(req);
        const started = Date.now();
        const ops = await handleCreatorOpsApi(pathname, req.method ?? "GET", body);
        const professional = ops ? null : await handleProfessionalApi(pathname, url, req.method ?? "GET", body);
        const r = ops ?? professional ?? await handleApi(pathname, url, req.method ?? "GET", body);
        if (!ops && !professional) recordApiObservation(pathname, Date.now() - started, r.status);
        res.writeHead(r.status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify(r.data, null, 2));
        return;
      }

      const sr = serveStatic(pathname);
      const headers: Record<string, string> = {};
      sr.headers.forEach((value, key) => {
        headers[key] = value;
      });
      res.writeHead(sr.status, headers);
      res.end(Buffer.from(await sr.arrayBuffer()));
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
  });

  httpServer.listen(config.httpPort, config.httpHost, () => {
    // eslint-disable-next-line no-console
    console.error(`[${SERVER_NAME}] v${SERVER_VERSION}`);
    // eslint-disable-next-line no-console
    console.error(`  MCP over HTTP : ${base}/mcp`);
    // eslint-disable-next-line no-console
    console.error(`  本地控制台     : ${base}/`);
    if (config.httpToken) {
      // eslint-disable-next-line no-console
      console.error("  HTTP auth      : Bearer token enabled (/mcp and /api/*)");
    }
    if (OPEN_BROWSER) openInBrowser(`${base}/`);
  });
}

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[trendhub] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[trendhub] uncaughtException:", err);
});

if (config.transport === "http") {
  runHttp().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
} else {
  runStdio().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}
