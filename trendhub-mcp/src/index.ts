#!/usr/bin/env node
/**
 * TrendHub MCP 入口
 * - 默认 stdio：供 Claude / Cursor / 豆包 / VS Code 等桌面客户端以子进程方式连接。
 * - --http 或 TRENTHUB_TRANSPORT=http：本地 HTTP MCP（默认 127.0.0.1:8333/mcp），供以 URL 连接的客户端。
 * - --ui：在 --http 基础上启动“本地可视化控制台”（http://127.0.0.1:8333/）并自动打开浏览器。
 *   控制台只做数据可视化与手动触发，不接任何大模型（分析/成稿算力仍由调用方 AI 承担）。
 * 仅绑定本机回环地址，不暴露公网；插件零大模型 Key、零遥测、零数据回传。
 */
import { createServer, type IncomingMessage } from "node:http";
import { exec } from "node:child_process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { handleApi } from "./web/api.js";
import { serveStatic } from "./web/static.js";

// 命令行参数优先级高于环境变量
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

async function runStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 客户端断开（stdin 关闭）时干净退出，避免连接池定时器导致进程悬挂
  process.stdin.on("close", () => process.exit(0));
  // eslint-disable-next-line no-console
  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running over stdio`);
}

async function runHttp(): Promise<void> {
  const base = `http://${config.httpHost}:${config.httpPort}`;
  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `${base}/`);
      const pathname = url.pathname;

      // 1) MCP 端点（无状态模式：每个 POST 请求独立 server+transport）
      if (pathname === "/mcp") {
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

      // 2) 本地控制台只读 / 触发 JSON API
      if (pathname.startsWith("/api/")) {
        const body = await readBody(req);
        const r = await handleApi(pathname, url, req.method ?? "GET", body);
        res.writeHead(r.status, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(r.data, null, 2));
        return;
      }

      // 3) 本地控制台静态资源（含 SPA fallback）
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
