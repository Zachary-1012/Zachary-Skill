#!/usr/bin/env node
/**
 * TrendHub MCP 入口
 * - TRENTHUB_TRANSPORT=stdio（默认）：供 Claude / Cursor / 豆包 / VS Code 等桌面客户端以子进程方式连接
 * - TRENTHUB_TRANSPORT=http：本地 HTTP（默认 127.0.0.1:8333/mcp），供 ChatGPT 等以 URL 连接的客户端
 * 仅绑定本机回环地址，不直接暴露公网；访问控制由私有仓库分发 + 本机网络边界承担。
 */
import { createServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

// 支持命令行参数 --http / --stdio，优先级高于环境变量
if (process.argv.includes("--http")) config.transport = "http";
if (process.argv.includes("--stdio")) config.transport = "stdio";
const portArg = process.argv.find((a) => a.startsWith("--port="));
if (portArg) config.httpPort = Number(portArg.split("=")[1]) || config.httpPort;

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
  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (url.pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found", use: "/mcp" }));
        return;
      }
      if (req.method === "POST") {
        // 无状态模式：每个请求独立 server+transport，水平扩展友好，契合 2026 无状态 MCP 规范
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
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "method not allowed (stateless mode accepts POST)" }));
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
  });

  httpServer.listen(config.httpPort, config.httpHost, () => {
    // eslint-disable-next-line no-console
    console.error(`[${SERVER_NAME}] v${SERVER_VERSION} MCP over HTTP: http://${config.httpHost}:${config.httpPort}/mcp`);
    console.error(`[${SERVER_NAME}] 在 AI 客户端中把该 URL 填为 MCP server 地址（仅本机可访问）`);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("[trendhub] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[trendhub] uncaughtException:", err);
});

if (config.transport === "http") {
  runHttp().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runStdio().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
